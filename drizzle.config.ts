import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://bizora_app:bizora_secure_pass@localhost:5432/bizora_db",
  },
  strict: true,
  verbose: true,
});
