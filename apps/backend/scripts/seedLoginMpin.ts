import "dotenv/config";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import { users } from "../src/db/postgres/schema";
import { hashPassword } from "../src/utils/password";

/** Keep in sync with DEFAULT_AGENT_LOGIN_MPIN in auth.service.ts */
const DEFAULT_MPIN = "1234";

/** Dev demo mobiles (LOGIN.md) — always reset to default MPIN. */
const SEED_MOBILES = ["9111111111", "9222222222", "9333333333"] as const;

/**
 * Sets login MPIN `1234` for seed agents; fills other agents only when MPIN is missing.
 * Run: npm run seed:mpin -w @adhikaripay/backend
 */
async function main() {
  const loginMpinHash = await hashPassword(DEFAULT_MPIN);

  const seeded = await db
    .update(users)
    .set({ loginMpinHash, updatedAt: new Date() })
    .where(inArray(users.mobile, [...SEED_MOBILES]))
    .returning({ mobile: users.mobile, role: users.role });

  const filled = await db
    .update(users)
    .set({ loginMpinHash, updatedAt: new Date() })
    .where(
      and(
        isNull(users.loginMpinHash),
        or(
          eq(users.role, "master_distributor"),
          eq(users.role, "distributor"),
          eq(users.role, "retailer"),
        ),
      ),
    )
    .returning({ mobile: users.mobile, role: users.role });

  console.log(`Default login MPIN: ${DEFAULT_MPIN}`);
  console.log(
    `Seed mobiles:`,
    seeded.map((r) => `${r.mobile} (${r.role})`).join(", ") || "(none found)",
  );
  console.log(
    `Filled missing MPIN:`,
    filled.map((r) => `${r.mobile} (${r.role})`).join(", ") || "(none)",
  );
  await pgPool.end();
}

main().catch((err) => {
  console.error("Seeding login MPIN failed:", err);
  process.exit(1);
});
