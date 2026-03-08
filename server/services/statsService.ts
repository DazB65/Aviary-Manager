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

        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const todayStr = formatDate(today);
        const futureStr = formatDate(in14Days);

        const upcomingHatches = allBroods.filter(b => {
            if (!b.expectedHatchDate) return false;

            // Extract just the YYYY-MM-DD part from the database value
            const d = String(b.expectedHatchDate).split("T")[0];
            return d >= todayStr && d <= futureStr;
        }).length;

        const upcomingEvents = allEvents
            .filter(e => {
                if (!e.eventDate) return false;

                // Extract just the YYYY-MM-DD part from the database value
                const d = String(e.eventDate).split("T")[0];
                return d >= todayStr;
            })
            // Sort chronologically just in case we need to pick the earliest of a series
            .sort((a, b) => {
                const da = String(a.eventDate).split("T")[0];
                const dbStr = String(b.eventDate).split("T")[0];
                return da.localeCompare(dbStr);
            })
            // Filter out multiple instances of the same recurring series so the count matches the list
            .reduce((acc: typeof allEvents, curr) => {
                if (curr.seriesId && acc.some(e => e.seriesId === curr.seriesId)) {
                    return acc;
                }
                acc.push(curr);
                return acc;
            }, []).length;

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
