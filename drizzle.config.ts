import { defineConfig } from "drizzle-kit";

// DATABASE_URL is required for migrate/push but not for generate (schema → SQL diff only)
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
