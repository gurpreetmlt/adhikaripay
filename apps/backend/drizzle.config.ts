import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/postgres/schema/index.ts",
  out: "./src/db/postgres/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://adhikaripay:adhikaripay@localhost:5432/adhikaripay",
  },
  strict: true,
  verbose: true,
});
