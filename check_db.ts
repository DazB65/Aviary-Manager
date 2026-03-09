import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
    const db = getDb();
    if (!db) return;
    const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'clutchEggs';
    `);
    console.log(result);
    process.exit(0);
}

main().catch(console.error);
