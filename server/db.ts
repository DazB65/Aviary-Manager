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
  try {
    const db = getDb();

    // SAFETY CATCH: Force the exact missing enum value and column if Railway DB caching swallowed the drizzle migration file.
    console.log("[DB] Executing fallback DDL brute-force...");
    try {
      await db.execute(sql`ALTER TYPE egg_outcome ADD VALUE IF NOT EXISTS 'fledged';`);
    } catch (enumErr) {
      console.log("[DB] Enum brute-force note:", enumErr);
    }
    await db.execute(sql`ALTER TABLE "clutchEggs" ADD COLUMN IF NOT EXISTS "outcomeDate" date;`);
    await db.execute(sql`ALTER TABLE "clutchEggs" ADD COLUMN IF NOT EXISTS "birdId" integer;`);

    // LOG CURRENT REALITY: Ask PostgreSQL exactly what columns exist
    const schemaCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clutchEggs';
    `);
    console.log("[DB] EXACT schema for clutchEggs on Railway:", schemaCheck.map(r => r.column_name));

    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("[DB] Migrations complete.");
  } catch (err) {
    console.error("[DB] Migration failed (this may be harmless if brute force succeeded):", err);
  }
}
