import { and, eq, ne, gte, lte, or, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import postgres from "postgres";

// works whether the server is run via tsx (dev) or as a compiled bundle (prod).
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, "..", "drizzle");

import * as schema from "../drizzle/schema";
import { species, type InsertSpecies } from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// ─── DB Connection ────────────────────────────────────────────────────────────
// In a serverless or frequently-reloaded environment, track connection
let dbInstance: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  queryClient = postgres(process.env.DATABASE_URL!);
  dbInstance = drizzle(queryClient, { schema });
  return dbInstance;
}

// Optional generic close function if needed dynamically
export async function closeDb() {
  if (queryClient) {
    await queryClient.end();
    dbInstance = null;
    queryClient = null;
  }
}

export async function runMigrations() {
  console.log("[DB] Running migrations...");
  const db = getDb();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("[DB] Migrations complete.");
}
