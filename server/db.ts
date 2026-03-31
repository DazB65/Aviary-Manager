import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

// works whether the server is run via tsx (dev) or as a compiled bundle (prod).
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, "..", "drizzle");

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
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    // Run enum additions directly outside any transaction to ensure they apply.
    // ALTER TYPE ... ADD VALUE cannot be reliably used inside a transaction on all PG versions.
    const client = postgres(process.env.DATABASE_URL!);
    try {
      await client`ALTER TYPE "public"."egg_outcome" ADD VALUE IF NOT EXISTS 'missing'`;
      await client`ALTER TYPE "public"."egg_outcome" ADD VALUE IF NOT EXISTS 'abandoned'`;
      console.log("[DB] Enum patch applied.");

      // Data fix: broods that were prematurely marked 'hatched' while chicks are still
      // alive but unfledged should revert to 'incubating' so they appear in Active.
      await client`
        UPDATE broods
        SET status = 'incubating', updated_at = NOW()
        WHERE status = 'hatched'
          AND id IN (
            SELECT DISTINCT brood_id FROM clutch_eggs WHERE outcome = 'hatched'
          )
      `;
      console.log("[DB] Brood status backfill applied.");
    } finally {
      await client.end();
    }

    console.log("[DB] Migrations complete.");
  } catch (err) {
    console.error("[DB] Migration failed:", err);
    throw err;
  }
}
