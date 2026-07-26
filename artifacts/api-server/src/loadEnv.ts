import { join } from "path";

try {
  process.loadEnvFile(join(process.cwd(), "../../.env"));
} catch {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if .env is not found
  }
}
