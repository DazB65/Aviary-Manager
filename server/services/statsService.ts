import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { birds, breedingPairs, broods, events } from "../../drizzle/schema";

export class StatsService {
    static async getDashboardStatsByUser(userId: number) {
        const db = getDb();
        if (!db) return { totalBirds: 0, activePairs: 0, eggsIncubating: 0, upcomingHatches: 0, upcomingEvents: 0 };

        const [allBirds, allPairs, allBroods, allEvents] = await Promise.all([
            db.select().from(birds).where(and(eq(birds.userId, userId), inArray(birds.status, ["alive", "breeding", "resting"]))),
            db.select().from(breedingPairs).where(and(eq(breedingPairs.userId, userId), eq(breedingPairs.status, "active"))),
            db.select().from(broods).where(and(eq(broods.userId, userId), eq(broods.status, "incubating"))),
            db.select().from(events).where(and(eq(events.userId, userId), eq(events.completed, false))),
        ]);

        const today = new Date();
        const in14Days = new Date(today);
        in14Days.setDate(today.getDate() + 14);
        const todayStr = today.toISOString().split("T")[0];
        const futureStr = in14Days.toISOString().split("T")[0];

        const upcomingHatches = allBroods.filter(b => {
            if (!b.expectedHatchDate) return false;
            const d = String(b.expectedHatchDate).includes("T") ? String(b.expectedHatchDate).split("T")[0] : String(b.expectedHatchDate);
            return d >= todayStr && d <= futureStr;
        }).length;

        const upcomingEvents = allEvents.filter(e => {
            const d = String(e.eventDate).includes("T") ? String(e.eventDate).split("T")[0] : String(e.eventDate);
            return d >= todayStr && d <= futureStr;
        }).length;

        return {
            totalBirds: allBirds.length,
            totalMales: allBirds.filter(b => b.gender === "male").length,
            totalFemales: allBirds.filter(b => b.gender === "female").length,
            activePairs: allPairs.length,
            eggsIncubating: allBroods.reduce((sum, b) => sum + (b.eggsLaid ?? 0), 0),
            upcomingHatches,
            upcomingEvents,
        };
    }

    static async getSeasonStats(userId: number, year: number) {
        const db = getDb();
        if (!db) return { pairs: 0, broods: 0, incubating: 0, totalEggs: 0, hatched: 0, hatchRate: 0 };

        const yearStr = String(year);
        const [seasonPairs, seasonBroods] = await Promise.all([
            db.select().from(breedingPairs).where(and(eq(breedingPairs.userId, userId), eq(breedingPairs.season, year))),
            db.select().from(broods).where(and(eq(broods.userId, userId), eq(broods.season, yearStr))),
        ]);

        const pairs = seasonPairs.length;
        const broodsCount = seasonBroods.length;
        const incubating = seasonBroods.filter(b => b.status === "incubating").length;
        const totalEggs = seasonBroods.reduce((sum, b) => sum + (b.eggsLaid ?? 0), 0);
        const hatched = seasonBroods.reduce((sum, b) => sum + (b.chicksSurvived ?? 0), 0);
        const hatchRate = totalEggs > 0 ? Math.round((hatched / totalEggs) * 100) : 0;

        return { pairs, broods: broodsCount, incubating, totalEggs, hatched, hatchRate };
    }
}
