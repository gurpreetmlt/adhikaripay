import { eq, and } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users, wallets } from "../../db/postgres/schema";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import { HttpError } from "../../utils/httpError";
import type { UserRole } from "@adhikaripay/shared-types";

/** SD / Distributor may activate or deactivate only their direct children. */
const CAN_TOGGLE_CHILD: ReadonlySet<UserRole> = new Set(["master_distributor", "distributor"]);

export interface DownlineUserView {
  id: string;
  uid: string;
  name: string;
  mobile: string;
  role: string;
  kycStatus: string;
  isActive: boolean;
  mainBalance: string;
  createdAt: Date;
}

export interface UplineView {
  id: string;
  name: string;
  mobile: string;
  role: string;
}

export interface NetworkResponse {
  role: UserRole;
  downline: DownlineUserView[];
  upline: UplineView | null;
}

export async function getDownline(actorId: string): Promise<DownlineUserView[]> {
  const rows = await db
    .select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      kycStatus: users.kycStatus,
      isActive: users.isActive,
      mainBalance: wallets.balance,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(wallets, and(eq(wallets.userId, users.id), eq(wallets.walletType, "main")))
    .where(eq(users.parentId, actorId));

  return rows;
}

export interface DownlineTreeNode extends DownlineUserView {
  children: DownlineTreeNode[];
}

export interface NetworkTreeResponse {
  role: UserRole;
  downline: DownlineUserView[];
  tree: DownlineTreeNode[];
  upline: UplineView | null;
}

async function buildTree(parentId: string): Promise<DownlineTreeNode[]> {
  const children = await getDownline(parentId);
  const nodes: DownlineTreeNode[] = [];
  for (const child of children) {
    const grandChildren = await buildTree(child.id);
    nodes.push({ ...child, children: grandChildren });
  }
  return nodes;
}

export async function getNetwork(actorId: string, actorRole: UserRole): Promise<NetworkTreeResponse> {
  const downline = actorRole !== "retailer" ? await getDownline(actorId) : [];
  const tree = actorRole !== "retailer" ? await buildTree(actorId) : [];

  let upline: UplineView | null = null;
  if (actorRole === "retailer" || actorRole === "distributor") {
    const [actor] = await db.select({ parentId: users.parentId }).from(users).where(eq(users.id, actorId)).limit(1);
    if (actor?.parentId) {
      const [parent] = await db
        .select({ id: users.id, name: users.name, mobile: users.mobile, role: users.role })
        .from(users)
        .where(eq(users.id, actor.parentId))
        .limit(1);
      if (parent) upline = parent;
    }
  }

  return { role: actorRole, downline, tree, upline };
}

export async function setDirectChildActive(
  actorId: string,
  actorRole: UserRole,
  childId: string,
  isActive: boolean,
): Promise<{ id: string; uid: string; isActive: boolean }> {
  if (!CAN_TOGGLE_CHILD.has(actorRole)) {
    throw new HttpError(403, "Only Super Distributors and Distributors can change child status", "FORBIDDEN");
  }
  if (childId === actorId) {
    throw new HttpError(403, "You cannot change your own active status", "CANNOT_SELF_DEACTIVATE");
  }

  const [target] = await db.select().from(users).where(eq(users.id, childId)).limit(1);
  if (!target) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  if (target.parentId !== actorId) {
    throw new HttpError(403, "You can only activate or deactivate users you directly onboarded", "NOT_YOUR_DOWNLINE");
  }

  const [row] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, childId))
    .returning({ id: users.id, uid: users.uid, isActive: users.isActive });
  if (!row) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  await insertAuditLog({
    userId: actorId,
    action: isActive ? "users.child_activate" : "users.child_deactivate",
    entityType: "user",
    entityId: childId,
    metadata: { childUid: row.uid },
  });

  return row;
}
