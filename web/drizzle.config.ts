import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL;

if (!url) {
  // drizzle-kit reads this file at runtime; fail loudly if env not set.
  throw new Error("DATABASE_URL must be set to run drizzle-kit");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
} satisfies Config;
