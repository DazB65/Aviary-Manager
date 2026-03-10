import { getDb } from "./server/db";
import { broods } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Connecting and fetching...");
    const db = getDb();
    if (!db) {
        console.log("No DB connection.");
        process.exit(1);
    }
    const incubating = await db.select().from(broods).where(eq(broods.status, "incubating"));
    console.log("Incubating Broods:", JSON.stringify(incubating, null, 2));
    process.exit(0);
}

main().catch(console.error);
