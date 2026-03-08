import { and, eq, asc, desc, sql } from "drizzle-orm";
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

    static async updateEvent(id: number, data: Partial<InsertEvent>) {
        const [updated] = await getDb()
            .update(events)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(events.id, id))
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
}
