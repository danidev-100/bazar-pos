import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// Read SYNC_DATABASE_URL from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/SYNC_DATABASE_URL=(.+)/);
  return match ? match[1].trim() : undefined;
}

export default defineConfig({
  schema: "./db/cloud-schema.ts",
  out: "./drizzle/cloud",
  dialect: "postgresql",
  dbCredentials: {
    url: loadEnv() ?? "postgresql://localhost:5432/pos",
  },
});
