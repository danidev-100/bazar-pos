import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle/local",
  dialect: "sqlite",
  dbCredentials: {
    url: "sqlite:pos.db",
  },
});
