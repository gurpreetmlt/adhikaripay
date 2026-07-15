import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users, transactions, commissionLedger, userHierarchy } from "../../db/postgres/schema";
import type { UserRole } from "@adhikaripay/shared-types";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const yesterdayStart = () => {
  const d = todayStart();
  d.setDate(d.getDate() - 1);
  return d;
};

export async function getDashboardStats(userId: string, role: UserRole) {
  switch (role) {
    case "retailer":
      return getRetailerStats(userId);
    case "distributor":
      return getDistributorStats(userId);
    case "master_distributor":
      return getSuperDistributorStats(userId);
    default:
      return {};
  }
}

async function getRetailerStats(userId: string) {
  const today = todayStart();

  const [todaySummary] = await db
    .select({
      count: count(),
      volume: sql<string>`coalesce(sum(${transactions.amount}), '0')`,
      successCount: sql<number>`count(*) filter (where ${transactions.status} = 'success')`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.createdAt, today)));

  const totalTxns = todaySummary?.count ?? 0;
  const successCount = Number(todaySummary?.successCount ?? 0);
  const successRate = totalTxns > 0 ? Math.round((successCount / totalTxns) * 1000) / 10 : 0;

  const [commission] = await db
    .select({ total: sql<string>`coalesce(sum(${commissionLedger.amount}), '0')` })
    .from(commissionLedger)
    .where(and(eq(commissionLedger.beneficiaryUserId, userId), gte(commissionLedger.createdAt, today)));

  return {
    role: "retailer" as const,
    today: {
      txnCount: totalTxns,
      volume: todaySummary?.volume ?? "0",
      successRate,
      commissionEarned: commission?.total ?? "0",
    },
  };
}

async function getDistributorStats(userId: string) {
  const today = todayStart();

  // Get all retailers under this distributor
  const retailers = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.parentId, userId), eq(users.role, "retailer")));

  const retailerIds = retailers.map((r) => r.id);
  const activeToday = retailers.filter((r) => r.isActive).length;
  const inactive = retailers.length - activeToday;

  let todayVolume = "0";
  let todayCommission = "0";
  interface TopRetailer { id: string; name: string; volume: string }
  let topRetailers: TopRetailer[] = [];

  if (retailerIds.length > 0) {
    const [vol] = await db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(and(inArray(transactions.userId, retailerIds), gte(transactions.createdAt, today)));
    todayVolume = vol?.total ?? "0";

    const [comm] = await db
      .select({ total: sql<string>`coalesce(sum(${commissionLedger.amount}), '0')` })
      .from(commissionLedger)
      .where(and(eq(commissionLedger.beneficiaryUserId, userId), gte(commissionLedger.createdAt, today)));
    todayCommission = comm?.total ?? "0";

    const topRows = await db
      .select({
        userId: transactions.userId,
        volume: sql<string>`coalesce(sum(${transactions.amount}), '0')`,
      })
      .from(transactions)
      .where(and(inArray(transactions.userId, retailerIds), gte(transactions.createdAt, today)))
      .groupBy(transactions.userId)
      .orderBy(sql`sum(${transactions.amount}) desc`)
      .limit(5);

    if (topRows.length > 0) {
      const topIds = topRows.map((r) => r.userId);
      const names = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, topIds));
      const nameMap = Object.fromEntries(names.map((n) => [n.id, n.name]));
      topRetailers = topRows.map((r) => ({
        id: r.userId,
        name: nameMap[r.userId] ?? "Unknown",
        volume: r.volume,
      }));
    }
  }

  return {
    role: "distributor" as const,
    retailers: { total: retailers.length, active: activeToday, inactive },
    today: { volume: todayVolume, commission: todayCommission },
    topRetailers,
  };
}

async function getSuperDistributorStats(userId: string) {
  const today = todayStart();
  const yesterday = yesterdayStart();

  // Distributors directly under this SD
  const distributors = await db
    .select({ id: users.id, name: users.name, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.parentId, userId), eq(users.role, "distributor")));

  const distIds = distributors.map((d) => d.id);

  const allDescendants = await db
    .select({ descendantId: userHierarchy.descendantId })
    .from(userHierarchy)
    .where(and(eq(userHierarchy.ancestorId, userId), gte(userHierarchy.depth, 1)));

  const descendantIds = allDescendants.map((d) => d.descendantId);
  const retailerRows = descendantIds.length > 0
    ? await db.select({ id: users.id, isActive: users.isActive }).from(users)
        .where(and(inArray(users.id, descendantIds), eq(users.role, "retailer")))
    : [];

  let todayVolume = "0";
  let yesterdayVolume = "0";
  let todayCommission = "0";

  if (descendantIds.length > 0) {
    const [tvol] = await db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(and(inArray(transactions.userId, descendantIds), gte(transactions.createdAt, today)));
    todayVolume = tvol?.total ?? "0";

    const [yvol] = await db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(
        and(
          inArray(transactions.userId, descendantIds),
          gte(transactions.createdAt, yesterday),
          sql`${transactions.createdAt} < ${today}`,
        ),
      );
    yesterdayVolume = yvol?.total ?? "0";
  }

  const [comm] = await db
    .select({ total: sql<string>`coalesce(sum(${commissionLedger.amount}), '0')` })
    .from(commissionLedger)
    .where(and(eq(commissionLedger.beneficiaryUserId, userId), gte(commissionLedger.createdAt, today)));
  todayCommission = comm?.total ?? "0";

  // Distributor performance (volume per distributor today)
  interface DistPerf { id: string; name: string; retailerCount: number; volume: string }
  let distPerformance: DistPerf[] = [];
  if (distIds.length > 0) {
    const distRetailers = await db
      .select({ parentId: users.parentId, cnt: count() })
      .from(users)
      .where(and(inArray(users.parentId, distIds), eq(users.role, "retailer")))
      .groupBy(users.parentId);

    const retailerCountMap = Object.fromEntries(
      distRetailers.map((r) => [r.parentId ?? "", Number(r.cnt)]),
    );

    distPerformance = distributors.map((d) => ({
      id: d.id,
      name: d.name,
      retailerCount: retailerCountMap[d.id] ?? 0,
      volume: "0",
    }));
  }

  return {
    role: "master_distributor" as const,
    network: {
      distributors: distributors.length,
      retailers: retailerRows.length,
      activeRetailers: retailerRows.filter((r) => r.isActive).length,
    },
    revenue: {
      todayVolume,
      yesterdayVolume,
      todayCommission,
    },
    distributorPerformance: distPerformance,
  };
}
