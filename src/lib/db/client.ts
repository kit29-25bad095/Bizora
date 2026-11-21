import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Returns a configured Drizzle ORM client.
 * In production or serverless environments, uses Neon HTTP/WebSocket connection.
 */
export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://bizora_app:bizora_secure_pass@localhost:5432/bizora_db";

  // Use neon HTTP driver for serverless / stateless edge operations
  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
