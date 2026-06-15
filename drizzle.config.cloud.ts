import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle/cloud",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CLOUD_DATABASE_URL ?? "postgresql://localhost:5432/pos",
  },
});
