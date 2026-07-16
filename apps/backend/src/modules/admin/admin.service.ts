import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db/postgres";
import { users, transactions, services, serviceCategories, wallets, userCommissionRates } from "../../db/postgres/schema";
import { HttpError } from "../../utils/httpError";
import { decryptPII } from "../../utils/aes";
import { findLatestAuditLog, insertAuditLog } from "../../db/postgres/repositories/auditLog";
import type { UserRole, KycStatus, TransactionStatus } from "@adhikaripay/shared-types";

function maskPan(pan: string) {
  if (pan.length < 6) return "••••••••••";
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

function maskAadhaar(aadhaar: string) {
  const digits = aadhaar.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX XXXX XXXX";
  return `XXXX XXXX ${digits.slice(-4)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** SVG ID-card style preview so admins always see documents when numbers exist. */
function docSvgDataUrl(opts: {
  title: string;
  line1: string;
  line2: string;
  accent: string;
}): string {
  const title = escapeXml(opts.title.slice(0, 40));
  const line1 = escapeXml(opts.line1.slice(0, 28));
  const line2 = escapeXml(opts.line2.slice(0, 28));
  const accent = escapeXml(opts.accent);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0B2A9A"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" rx="28" fill="#0f1b3d"/>
  <rect x="16" y="16" width="608" height="368" rx="22" fill="url(#g)" opacity="0.22"/>
  <rect x="16" y="16" width="608" height="368" rx="22" fill="none" stroke="#ffffff33" stroke-width="2"/>
  <text x="48" y="72" fill="#ffffff" font-family="Poppins,Arial,sans-serif" font-size="28" font-weight="700">${title}</text>
  <text x="48" y="118" fill="#a8b8e0" font-family="Poppins,Arial,sans-serif" font-size="16">Adhikari Pay · KYC Document</text>
  <rect x="48" y="160" width="120" height="140" rx="16" fill="#ffffff22"/>
  <circle cx="108" cy="210" r="28" fill="#ffffff44"/>
  <rect x="72" y="255" width="72" height="18" rx="9" fill="#ffffff33"/>
  <text x="200" y="210" fill="#e8eef9" font-family="Poppins,Arial,sans-serif" font-size="22" font-weight="600">${line1}</text>
  <text x="200" y="250" fill="#c5d2f5" font-family="ui-monospace,monospace" font-size="20" letter-spacing="2">${line2}</text>
  <text x="48" y="350" fill="#8b9bc4" font-family="Poppins,Arial,sans-serif" font-size="13">Tap to zoom · Admin preview</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function getAdminUserDetail(userId: string) {
  const parent = alias(users, "parent");
  const [row] = await db
    .select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      mobile: users.mobile,
      email: users.email,
      role: users.role,
      kycStatus: users.kycStatus,
      isActive: users.isActive,
      parentId: users.parentId,
      panNumberEncrypted: users.panNumberEncrypted,
      aadhaarNumberEncrypted: users.aadhaarNumberEncrypted,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      parentUid: parent.uid,
      parentName: parent.name,
      parentRole: parent.role,
    })
    .from(users)
    .leftJoin(parent, eq(users.parentId, parent.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  if (row.role === "admin") throw new HttpError(400, "Cannot open admin as agent detail", "INVALID_TARGET");

  let panMasked: string | null = null;
  let aadhaarMasked: string | null = null;
  let panFull: string | null = null;
  let aadhaarFull: string | null = null;
  try {
    if (row.panNumberEncrypted) {
      panFull = decryptPII(row.panNumberEncrypted);
      panMasked = maskPan(panFull);
    }
    if (row.aadhaarNumberEncrypted) {
      aadhaarFull = decryptPII(row.aadhaarNumberEncrypted);
      aadhaarMasked = maskAadhaar(aadhaarFull);
    }
  } catch {
    panMasked = panMasked ?? "••••••••••";
    aadhaarMasked = aadhaarMasked ?? "XXXX XXXX XXXX";
  }

  const walletRows = await db
    .select({
      walletType: wallets.walletType,
      balance: wallets.balance,
    })
    .from(wallets)
    .where(eq(wallets.userId, userId));

  const kycAudit = await findLatestAuditLog({ userId: row.id, action: "kyc.submit" });

  const meta = (kycAudit?.metadata ?? {}) as Record<string, unknown>;

  const documents: Record<string, string> = {};
  if (panFull) {
    documents.panCard = docSvgDataUrl({
      title: "PAN Card",
      line1: row.name,
      line2: panMasked ?? panFull,
      accent: "#2A5CDD",
    });
  }
  if (aadhaarFull) {
    documents.aadhaarFront = docSvgDataUrl({
      title: "Aadhaar Front",
      line1: row.name,
      line2: aadhaarMasked ?? aadhaarFull,
      accent: "#12B76A",
    });
    documents.aadhaarBack = docSvgDataUrl({
      title: "Aadhaar Back",
      line1: "Address / QR",
      line2: aadhaarMasked ?? aadhaarFull,
      accent: "#0F9E5C",
    });
  }

  const {
    panNumberEncrypted: _p,
    aadhaarNumberEncrypted: _a,
    parentUid: _pu,
    parentName: _pn,
    parentRole: _pr,
    ...safe
  } = row;

  return {
    ...safe,
    hasKycDocs: Boolean(panFull && aadhaarFull),
    kyc: {
      status: row.kycStatus,
      panMasked,
      aadhaarMasked,
      city: typeof meta.city === "string" ? meta.city : null,
      pincode: typeof meta.pincode === "string" ? meta.pincode : null,
      bankName: typeof meta.bankName === "string" ? meta.bankName : null,
      hasBank: Boolean(meta.hasBank),
      submittedAt: kycAudit?.createdAt ?? null,
    },
    documents,
    wallets: walletRows.map((w) => ({
      walletType: w.walletType,
      balance: String(w.balance),
    })),
    parent: row.parentId
      ? {
          id: row.parentId,
          uid: row.parentUid,
          name: row.parentName,
          role: row.parentRole,
        }
      : null,
  };
}

export async function getAdminStats() {
  const roleCounts = await db
    .select({ role: users.role, total: count() })
    .from(users)
    .groupBy(users.role);

  const kycCounts = await db
    .select({ status: users.kycStatus, total: count() })
    .from(users)
    .where(sql`${users.role} <> 'admin'`)
    .groupBy(users.kycStatus);

  const txnCounts = await db
    .select({ status: transactions.status, total: count() })
    .from(transactions)
    .groupBy(transactions.status);

  const roles: Record<string, number> = {};
  for (const r of roleCounts) roles[r.role] = Number(r.total);

  const kyc: Record<string, number> = {};
  for (const r of kycCounts) kyc[r.status] = Number(r.total);

  const txns: Record<string, number> = {};
  for (const r of txnCounts) txns[r.status] = Number(r.total);

  return {
    users: {
      master_distributor: roles.master_distributor ?? 0,
      distributor: roles.distributor ?? 0,
      retailer: roles.retailer ?? 0,
      admin: roles.admin ?? 0,
      total: Object.values(roles).reduce((a, b) => a + b, 0),
    },
    kyc: {
      pending: kyc.pending ?? 0,
      verified: kyc.verified ?? 0,
      rejected: kyc.rejected ?? 0,
    },
    transactions: {
      success: txns.success ?? 0,
      failed: txns.failed ?? 0,
      pending: (txns.pending ?? 0) + (txns.initiated ?? 0),
      total: Object.values(txns).reduce((a, b) => a + b, 0),
    },
  };
}

export async function listAdminUsers(opts: {
  role?: UserRole;
  kycStatus?: KycStatus;
  q?: string;
  limit: number;
  offset: number;
}) {
  const conditions = [sql`${users.role} <> 'admin'`];
  if (opts.role) conditions.push(eq(users.role, opts.role));
  if (opts.kycStatus) conditions.push(eq(users.kycStatus, opts.kycStatus));
  if (opts.q?.trim()) {
    const q = `%${opts.q.trim()}%`;
    conditions.push(or(ilike(users.name, q), ilike(users.mobile, q), ilike(users.uid, q))!);
  }

  return db
    .select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      kycStatus: users.kycStatus,
      isActive: users.isActive,
      parentId: users.parentId,
      hasKycDocs: sql<boolean>`(${users.panNumberEncrypted} is not null and ${users.aadhaarNumberEncrypted} is not null)`,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
}

export async function setUserActive(adminId: string, userId: string, isActive: boolean) {
  const [row] = await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  if (!row) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  await insertAuditLog({
    userId: adminId,
    action: isActive ? "admin.user_activate" : "admin.user_deactivate",
    entityType: "user",
    entityId: userId,
    metadata: {},
  });
  return {
    id: row.id,
    uid: row.uid,
    isActive: row.isActive,
  };
}

export async function listKycQueue(opts: { status?: KycStatus; limit: number; offset: number }) {
  const status = opts.status ?? "pending";
  return db
    .select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      kycStatus: users.kycStatus,
      hasKycDocs: sql<boolean>`(${users.panNumberEncrypted} is not null and ${users.aadhaarNumberEncrypted} is not null)`,
      updatedAt: users.updatedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.kycStatus, status), sql`${users.role} <> 'admin'`))
    .orderBy(desc(users.updatedAt))
    .limit(opts.limit)
    .offset(opts.offset);
}

export async function decideKyc(adminId: string, userId: string, decision: "verified" | "rejected") {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  if (user.role === "admin") throw new HttpError(400, "Cannot change admin KYC", "INVALID_TARGET");

  const [updated] = await db
    .update(users)
    .set({ kycStatus: decision, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  await insertAuditLog({
    userId: adminId,
    action: decision === "verified" ? "kyc.approve" : "kyc.reject",
    entityType: "user",
    entityId: userId,
    metadata: { previous: user.kycStatus },
  });

  return {
    id: updated!.id,
    uid: updated!.uid,
    kycStatus: updated!.kycStatus,
  };
}

export async function listAdminTransactions(opts: {
  status?: TransactionStatus;
  limit: number;
  offset: number;
}) {
  const conditions = opts.status ? [eq(transactions.status, opts.status)] : [];

  return db
    .select({
      id: transactions.id,
      txnRef: transactions.txnRef,
      amount: transactions.amount,
      status: transactions.status,
      userId: transactions.userId,
      userName: users.name,
      userUid: users.uid,
      userRole: users.role,
      serviceName: services.name,
      serviceCode: services.code,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
      failureReason: transactions.failureReason,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.userId, users.id))
    .innerJoin(services, eq(transactions.serviceId, services.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
}

export async function listCatalogAdmin() {
  const categories = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
  const allServices = await db.select().from(services).orderBy(services.displayOrder);
  return categories.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    icon: c.icon,
    isActive: c.isActive,
    services: allServices
      .filter((s) => s.categoryId === c.id)
      .map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        badge: s.badge,
        isActive: s.isActive,
        displayOrder: s.displayOrder,
        minAmount: s.minAmount,
        maxAmount: s.maxAmount,
      })),
  }));
}

export async function updateServiceSiteControl(
  adminId: string,
  serviceId: string,
  patch: { badge?: string | null; isActive?: boolean; name?: string },
) {
  const [existing] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!existing) throw new HttpError(404, "Service not found", "SERVICE_NOT_FOUND");

  const [updated] = await db
    .update(services)
    .set({
      badge: patch.badge === undefined ? existing.badge : patch.badge?.trim() || null,
      isActive: patch.isActive ?? existing.isActive,
      name: patch.name?.trim() || existing.name,
    })
    .where(eq(services.id, serviceId))
    .returning();

  await insertAuditLog({
    userId: adminId,
    action: "admin.catalog_service_update",
    entityType: "service",
    entityId: serviceId,
    metadata: patch as Record<string, unknown>,
  });

  return updated;
}

export async function getAdminUserCommissions(userId: string) {
  const [user] = await db
    .select({ id: users.id, role: users.role, name: users.name, uid: users.uid })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  if (user.role === "admin") throw new HttpError(400, "Cannot set commission for admin", "INVALID_TARGET");

  const categories = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
  const allServices = await db.select().from(services).orderBy(services.displayOrder);
  const rates = await db
    .select()
    .from(userCommissionRates)
    .where(eq(userCommissionRates.userId, userId));
  const rateByService = new Map(rates.map((r) => [r.serviceId, r]));

  return {
    user: { id: user.id, name: user.name, uid: user.uid, role: user.role },
    categories: categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      services: allServices
        .filter((s) => s.categoryId === c.id)
        .map((s) => {
          const rate = rateByService.get(s.id);
          return {
            id: s.id,
            code: s.code,
            name: s.name,
            isActive: s.isActive,
            hasOverride: Boolean(rate),
            ruleType: rate?.ruleType ?? "percentage",
            value: rate ? String(rate.value) : "",
            rateActive: rate?.isActive ?? true,
          };
        }),
    })),
  };
}

export async function upsertAdminUserCommissions(
  adminId: string,
  userId: string,
  rates: Array<{
    serviceId: string;
    ruleType: "flat" | "percentage";
    value: string;
    isActive?: boolean;
    clear?: boolean;
  }>,
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  if (user.role === "admin") throw new HttpError(400, "Cannot set commission for admin", "INVALID_TARGET");

  const serviceIds = rates.map((r) => r.serviceId);
  if (serviceIds.length) {
    const found = await db.select({ id: services.id }).from(services);
    const valid = new Set(found.map((s) => s.id));
    for (const id of serviceIds) {
      if (!valid.has(id)) throw new HttpError(400, `Unknown service ${id}`, "INVALID_SERVICE");
    }
  }

  for (const rate of rates) {
    if (rate.clear) {
      await db
        .delete(userCommissionRates)
        .where(
          and(eq(userCommissionRates.userId, userId), eq(userCommissionRates.serviceId, rate.serviceId)),
        );
      continue;
    }

    const valueNum = Number(rate.value);
    if (!Number.isFinite(valueNum) || valueNum < 0) {
      throw new HttpError(400, "Commission value must be a non-negative number", "INVALID_VALUE");
    }
    if (rate.ruleType === "percentage" && valueNum > 100) {
      throw new HttpError(400, "Percentage cannot exceed 100", "INVALID_VALUE");
    }

    const value = valueNum.toFixed(4);
    const isActive = rate.isActive !== false;
    const [existing] = await db
      .select({ id: userCommissionRates.id })
      .from(userCommissionRates)
      .where(
        and(eq(userCommissionRates.userId, userId), eq(userCommissionRates.serviceId, rate.serviceId)),
      )
      .limit(1);

    if (existing) {
      await db
        .update(userCommissionRates)
        .set({
          ruleType: rate.ruleType,
          value,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(userCommissionRates.id, existing.id));
    } else {
      await db.insert(userCommissionRates).values({
        userId,
        serviceId: rate.serviceId,
        ruleType: rate.ruleType,
        value,
        isActive,
      });
    }
  }

  await insertAuditLog({
    userId: adminId,
    action: "admin.user_commission_upsert",
    entityType: "user",
    entityId: userId,
    metadata: { count: rates.length },
  });

  return getAdminUserCommissions(userId);
}
