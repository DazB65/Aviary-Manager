import { and, eq, asc, desc, sql, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { events, birds, breedingPairs, type InsertEvent } from "../../drizzle/schema";

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
        // Preserve bird-specific and all-birds events — those are deliberate health/history records.
        // Only delete pure reminders (no birdId, no pairId, allBirds = false).
        // Preserve bird-specific events, allBirds records, and auto-generated brood events (pairId set).
        await getDb().delete(events).where(
            and(eq(events.userId, userId), isNull(events.birdId), isNull(events.pairId), eq(events.allBirds, false))
        );
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
            .where(and(eq(events.id, id), eq(events.userId, userId)))
            .returning();

        return updated;
    }

    static async syncBroodEvents(userId: number, pairId: number | null, broodId: number, fertilityDate?: string, hatchDate?: string) {
        const db = getDb();
        if (!db) return;

        const fSeries = `brood-${broodId}-fertility`;
        const hSeries = `brood-${broodId}-hatch`;

        // Build descriptive title: "Event - MaleName x FemaleName - Cage"
        let pairLabel = `Pair #${pairId}`;
        let cageLabel = "";
        if (pairId) {
            const [pair] = await db.select().from(breedingPairs).where(and(eq(breedingPairs.id, pairId), eq(breedingPairs.userId, userId))).limit(1);
            if (pair) {
                const [[male], [female]] = await Promise.all([
                    db.select().from(birds).where(and(eq(birds.id, pair.maleId), eq(birds.userId, userId))).limit(1),
                    db.select().from(birds).where(and(eq(birds.id, pair.femaleId), eq(birds.userId, userId))).limit(1),
                ]);
                const maleName = male?.name || male?.ringId || `Bird #${pair.maleId}`;
                const femaleName = female?.name || female?.ringId || `Bird #${pair.femaleId}`;
                pairLabel = `${maleName} x ${femaleName}`;
                const cage = male?.cageNumber || female?.cageNumber;
                if (cage) cageLabel = ` - ${cage}`;
            }
        }

        const titleSuffix = ` - ${pairLabel}${cageLabel}`;

        const existingAutoEvents = await db
            .select({ seriesId: events.seriesId, completed: events.completed })
            .from(events)
            .where(and(eq(events.userId, userId), inArray(events.seriesId, [fSeries, hSeries])));

        const completedBySeries = new Map<string, boolean>();
        for (const ev of existingAutoEvents) {
            if (ev.seriesId) completedBySeries.set(ev.seriesId, ev.completed ?? false);
        }

        // Clear previous auto-events for this specific brood, then recreate with completion state preserved.
        await db.delete(events).where(and(eq(events.userId, userId), inArray(events.seriesId, [fSeries, hSeries])));

        if (fertilityDate) {
            await db.insert(events).values({
                userId,
                title: `Fertility Check${titleSuffix}`,
                notes: `Auto-generated fertility check for ${pairLabel}.`,
                eventDate: fertilityDate,
                eventType: "other",
                pairId,
                seriesId: fSeries,
                completed: completedBySeries.get(fSeries) ?? false,
            });
        }

        if (hatchDate) {
            await db.insert(events).values({
                userId,
                title: `Expected Hatch${titleSuffix}`,
                notes: `Auto-generated expected hatch for ${pairLabel}.`,
                eventDate: hatchDate,
                eventType: "other",
                pairId,
                seriesId: hSeries,
                completed: completedBySeries.get(hSeries) ?? false,
            });
        }
    }
}
