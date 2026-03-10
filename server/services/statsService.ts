import { eq, and, inArray, gte, lte, count, sum, sql, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import { birds, breedingPairs, broods, events } from "../../drizzle/schema";

export class StatsService {
    static async getDashboardStatsByUser(userId: number) {
        const db = getDb();
        if (!db) return { totalBirds: 0, totalMales: 0, totalFemales: 0, activePairs: 0, eggsIncubating: 0, upcomingHatches: 0, upcomingEvents: 0 };

        const today = new Date();
        const in14Days = new Date(today);
        in14Days.setDate(today.getDate() + 14);

        const pad = (n: number) => String(n).padStart(2, "0");
        const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const todayStr = fmtDate(today);
        const futureStr = fmtDate(in14Days);

        // Run all aggregation queries in parallel — no full-table fetches
        const [
            birdCounts,
            activePairsResult,
            eggsIncubatingResult,
            upcomingHatchesResult,
            upcomingEventsRaw,
        ] = await Promise.all([
            // Bird counts grouped by gender (active statuses only)
            db
                .select({ gender: birds.gender, count: count() })
                .from(birds)
                .where(and(eq(birds.userId, userId), inArray(birds.status, ["alive", "breeding", "resting"])))
                .groupBy(birds.gender),

            // Active pairs count
            db
                .select({ count: count() })
                .from(breedingPairs)
                .where(and(eq(breedingPairs.userId, userId), eq(breedingPairs.status, "active"))),

            // Sum of eggs across all incubating broods
            db
                .select({ total: sum(broods.eggsLaid) })
                .from(broods)
                .where(and(eq(broods.userId, userId), eq(broods.status, "incubating"))),

            // Incubating broods with a hatch date in the next 14 days
            db
                .select({ count: count() })
                .from(broods)
                .where(and(
                    eq(broods.userId, userId),
                    eq(broods.status, "incubating"),
                    isNotNull(broods.expectedHatchDate),
                    gte(broods.expectedHatchDate, todayStr),
                    lte(broods.expectedHatchDate, futureStr),
                )),

            // Upcoming incomplete events — fetch only id, eventDate, seriesId to deduplicate series
            db
                .select({ id: events.id, eventDate: events.eventDate, seriesId: events.seriesId })
                .from(events)
                .where(and(
                    eq(events.userId, userId),
                    eq(events.completed, false),
                    gte(events.eventDate, todayStr),
                ))
                .orderBy(events.eventDate, events.id),
        ]);

        // Tally bird counts by gender
        let totalBirds = 0, totalMales = 0, totalFemales = 0;
        for (const row of birdCounts) {
            const n = Number(row.count);
            totalBirds += n;
            if (row.gender === "male") totalMales = n;
            else if (row.gender === "female") totalFemales = n;
        }

        // Deduplicate recurring series — only count the earliest event per series
        const seenSeries = new Set<string>();
        let upcomingEvents = 0;
        for (const e of upcomingEventsRaw) {
            if (e.seriesId) {
                if (seenSeries.has(e.seriesId)) continue;
                seenSeries.add(e.seriesId);
            }
            upcomingEvents++;
        }

        return {
            totalBirds,
            totalMales,
            totalFemales,
            activePairs: Number(activePairsResult[0]?.count ?? 0),
            eggsIncubating: Number(eggsIncubatingResult[0]?.total ?? 0),
            upcomingHatches: Number(upcomingHatchesResult[0]?.count ?? 0),
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
