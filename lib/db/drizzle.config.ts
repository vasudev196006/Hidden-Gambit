import { defineConfig } from "drizzle-kit";
import path from "path";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  try {
    process.loadEnvFile(path.join(process.cwd(), "../../.env"));
  } catch {
    try {
      process.loadEnvFile();
    } catch {
      // Ignore
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false },
  },
});
