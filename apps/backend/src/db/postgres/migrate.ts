import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pgPool } from "./index";

async function main() {
  await migrate(db, { migrationsFolder: "./src/db/postgres/migrations" });
  await pgPool.end();
  console.log("Postgres migrations applied.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
