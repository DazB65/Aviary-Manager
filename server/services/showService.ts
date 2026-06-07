import { and, eq, desc, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import { shows, type InsertShow } from "../../drizzle/schema";
import { summariseShowResults, type ShowResultSummary } from "../../shared/showResult";

export class ShowService {
    static async getShowsByUser(userId: number) {
        return await getDb()
            .select()
            .from(shows)
            .where(eq(shows.userId, userId))
            .orderBy(desc(shows.showDate), desc(shows.id));
    }

    static async getShowsByBird(birdId: number, userId: number) {
        return await getDb()
            .select()
            .from(shows)
            .where(and(eq(shows.birdId, birdId), eq(shows.userId, userId)))
            .orderBy(desc(shows.showDate), desc(shows.id));
    }

    static async createShow(data: InsertShow) {
        const [created] = await getDb().insert(shows).values(data).returning();
        return created;
    }

    static async updateShow(id: number, userId: number, data: Partial<InsertShow>) {
        const [updated] = await getDb()
            .update(shows)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(shows.id, id), eq(shows.userId, userId)))
            .returning();
        return updated;
    }

    static async deleteShow(id: number, userId: number) {
        await getDb().delete(shows).where(and(eq(shows.id, id), eq(shows.userId, userId)));
    }

    /** Aggregate show stats across the whole flock (total shows, wins, best result). */
    static async getShowStatsByUser(userId: number): Promise<ShowResultSummary> {
        const rows = await getDb()
            .select({ result: shows.result })
            .from(shows)
            .where(eq(shows.userId, userId));
        return summariseShowResults(rows);
    }

    /** Aggregate show stats for a single calendar year. */
    static async getSeasonShowStats(userId: number, year: number): Promise<ShowResultSummary> {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        const rows = await getDb()
            .select({ result: shows.result })
            .from(shows)
            .where(and(
                eq(shows.userId, userId),
                gte(shows.showDate, yearStart),
                lte(shows.showDate, yearEnd),
            ));
        return summariseShowResults(rows);
    }
}
