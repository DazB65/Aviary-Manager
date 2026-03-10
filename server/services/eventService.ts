import { and, eq, asc, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { events, type InsertEvent } from "../../drizzle/schema";

export class EventService {
    static async getEventsByUser(userId: number) {
        return await getDb()
            .select()
            .from(events)
            .where(eq(events.userId, userId))
            .orderBy(asc(events.eventDate), asc(events.id));
    }

    static async createEvent(data: InsertEvent) {
        const [newEv] = await getDb()
            .insert(events)
            .values(data)
            .returning();
        return newEv;
    }

    static async updateEvent(id: number, userId: number, data: Partial<InsertEvent>) {
        const [updated] = await getDb()
            .update(events)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(events.id, id), eq(events.userId, userId)))
            .returning();
        return updated;
    }

    static async deleteEvent(id: number, userId: number) {
        await getDb().delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
    }

    static async deleteAllEventsForUser(userId: number) {
        await getDb().delete(events).where(eq(events.userId, userId));
    }

    static async toggleEventComplete(id: number, userId: number) {
        const [ev] = await getDb()
            .select()
            .from(events)
            .where(and(eq(events.id, id), eq(events.userId, userId)));

        if (!ev) throw new Error("Event not found");

        const [updated] = await getDb()
            .update(events)
            .set({ completed: !ev.completed, updatedAt: new Date() })
            .where(eq(events.id, id))
            .returning();

        return updated;
    }

    static async syncBroodEvents(userId: number, pairId: number, broodId: number, fertilityDate?: string, hatchDate?: string) {
        const db = getDb();
        if (!db) return;

        const fSeries = `brood-${broodId}-fertility`;
        const hSeries = `brood-${broodId}-hatch`;

        // Clear previous auto-events for this specific brood
        await db.delete(events).where(and(eq(events.userId, userId), inArray(events.seriesId, [fSeries, hSeries])));

        // Insert new ones if dates exist
        if (fertilityDate) {
            await db.insert(events).values({
                userId,
                title: `Fertility Check - Brood #${broodId}`,
                notes: `Auto-generated fertility check for pair #${pairId}, brood #${broodId}.`,
                eventDate: fertilityDate,
                eventType: "other",
                pairId,
                seriesId: fSeries,
            });
        }

        if (hatchDate) {
            await db.insert(events).values({
                userId,
                title: `Expected Hatch - Brood #${broodId}`,
                notes: `Auto-generated expected hatch for pair #${pairId}, brood #${broodId}.`,
                eventDate: hatchDate,
                eventType: "other",
                pairId,
                seriesId: hSeries,
            });
        }
    }
}
