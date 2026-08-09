import { join } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

try {
  process.loadEnvFile(join(process.cwd(), ".env"));
} catch {
  try {
    process.loadEnvFile(join(process.cwd(), "../../.env"));
  } catch {
    try {
      process.loadEnvFile();
    } catch {
      // Ignore if .env is not present
    }
  }
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Disable strict TLS unauthorized rejection for cloud pooled Postgres (Supabase/AWS)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const isLocalhost = process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (!isLocalhost || process.env.DATABASE_URL.includes("ssl")) ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema/index";
