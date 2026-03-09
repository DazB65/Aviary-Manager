import { getDb } from "./server/db";
import { StatsService } from "./server/services/statsService";

async function test() {
    const db = getDb();
    if (!db) { console.log("No db"); return; }

    // Hardcoded for user 1 (adjust if needed)
    const stats = await StatsService.getDashboardStatsByUser(1);
    console.log("Calculated Stats:");
    console.dir(stats, { depth: null });
}
test().catch(console.error).finally(() => process.exit(0));
