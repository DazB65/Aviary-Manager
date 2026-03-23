import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
    broods,
    clutchEggs,
    birds,
    breedingPairs,
    type InsertBrood,
} from "../../drizzle/schema";

type ClutchEgg = typeof clutchEggs.$inferSelect;

export class BroodService {
    static async getBroodsByUser(userId: number) {
        const db = getDb();
        if (!db) return [];
        return db.select().from(broods).where(eq(broods.userId, userId)).orderBy(desc(broods.createdAt));
    }

    static async getBroodsByPair(pairId: number, userId: number) {
        const db = getDb();
        if (!db) return [];
        return db.select().from(broods).where(and(eq(broods.pairId, pairId), eq(broods.userId, userId))).orderBy(desc(broods.layDate));
    }

    static async createBrood(data: InsertBrood) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(broods).values(data).returning({ id: broods.id });
        return result;
    }

    static async updateBrood(id: number, userId: number, data: Partial<InsertBrood>) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db
            .update(broods)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(broods.id, id), eq(broods.userId, userId)))
            .returning({ id: broods.id });
        return result;
    }

    static async deleteBrood(id: number, userId: number) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        // Transaction refactored implementation:
        await db.transaction(async (tx) => {
            await tx.delete(clutchEggs).where(and(eq(clutchEggs.broodId, id), eq(clutchEggs.userId, userId)));
            await tx.delete(broods).where(and(eq(broods.id, id), eq(broods.userId, userId)));
        });
    }

    static async getEggsByBrood(broodId: number, userId: number) {
        const db = getDb();
        if (!db) return [];
        return db
            .select({
                id: clutchEggs.id,
                broodId: clutchEggs.broodId,
                userId: clutchEggs.userId,
                eggNumber: clutchEggs.eggNumber,
                outcome: clutchEggs.outcome,
                outcomeDate: clutchEggs.outcomeDate,
                notes: clutchEggs.notes,
                birdId: clutchEggs.birdId,
                updatedAt: clutchEggs.updatedAt,
                ringId: birds.ringId,
            })
            .from(clutchEggs)
            .leftJoin(birds, eq(clutchEggs.birdId, birds.id))
            .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)))
            .orderBy(asc(clutchEggs.eggNumber));
    }

    static async getEggsByUser(userId: number) {
        const db = getDb();
        if (!db) return [];
        return db
            .select({
                id: clutchEggs.id,
                broodId: clutchEggs.broodId,
                userId: clutchEggs.userId,
                eggNumber: clutchEggs.eggNumber,
                outcome: clutchEggs.outcome,
                outcomeDate: clutchEggs.outcomeDate,
                notes: clutchEggs.notes,
                birdId: clutchEggs.birdId,
                updatedAt: clutchEggs.updatedAt,
                ringId: birds.ringId,
            })
            .from(clutchEggs)
            .leftJoin(birds, eq(clutchEggs.birdId, birds.id))
            .where(eq(clutchEggs.userId, userId))
            .orderBy(asc(clutchEggs.eggNumber));
    }

    static async upsertClutchEgg(
        broodId: number,
        userId: number,
        eggNumber: number,
        outcome: ClutchEgg["outcome"],
        notes?: string,
        outcomeDate?: string
    ): Promise<void> {
        const db = getDb();
        if (!db) return;

        // If the date is an empty string (""), default to null so Drizzle sends it properly to Postgres
        const safeNotes = notes?.trim() ? notes : null;
        const safeDate = outcomeDate?.trim() ? outcomeDate : null;

        // Check whether this egg already has a linked bird (created via convertToBird).
        // If it does, always preserve the birdId regardless of outcome change —
        // clearing it would silently orphan the bird record.
        const existing = await db
            .select({ birdId: clutchEggs.birdId })
            .from(clutchEggs)
            .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.eggNumber, eggNumber), eq(clutchEggs.userId, userId)))
            .limit(1);
        const existingBirdId = existing[0]?.birdId ?? null;

        await db
            .insert(clutchEggs)
            .values({
                broodId,
                userId,
                eggNumber,
                outcome,
                outcomeDate: safeDate,
                notes: safeNotes
            })
            .onConflictDoUpdate({
                target: [clutchEggs.broodId, clutchEggs.eggNumber],
                set: {
                    outcome,
                    outcomeDate: safeDate,
                    notes: safeNotes,
                    // Preserve an existing bird link; only clear if no bird has been linked yet
                    birdId: existingBirdId ? sql`${clutchEggs.birdId}` : null,
                },
            });

        // Auto-transition brood status when all eggs are resolved
        const [currentBrood] = await db
            .select({ status: broods.status })
            .from(broods)
            .where(and(eq(broods.id, broodId), eq(broods.userId, userId)))
            .limit(1);
        if (!currentBrood || currentBrood.status !== "incubating") return;

        const allEggs = await db
            .select({ outcome: clutchEggs.outcome })
            .from(clutchEggs)
            .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)));
        if (allEggs.length === 0) return;

        const stillPending = allEggs.some(e => e.outcome === "unknown" || e.outcome === "fertile");
        if (stillPending) return;

        const hasSuccess = allEggs.some(e => e.outcome === "hatched" || e.outcome === "fledged");
        const newStatus = hasSuccess ? "hatched" : "failed";

        await db
            .update(broods)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(and(eq(broods.id, broodId), eq(broods.userId, userId), eq(broods.status, "incubating")));
    }

    static async deleteEggsByBrood(broodId: number, userId: number): Promise<void> {
        const db = getDb();
        if (!db) return;
        await db.delete(clutchEggs).where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)));
    }

    static async syncClutchEggs(broodId: number, userId: number, eggsLaid: number): Promise<void> {
        const db = getDb();
        if (!db) return;
        const existing = await db
            .select()
            .from(clutchEggs)
            .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)));
        const existingNums = new Set(existing.map((e) => e.eggNumber));

        // Batch-insert all missing eggs in a single query instead of one INSERT per egg
        const toInsert: { broodId: number; userId: number; eggNumber: number; outcome: "unknown" }[] = [];
        for (let i = 1; i <= eggsLaid; i++) {
            if (!existingNums.has(i)) {
                toInsert.push({ broodId, userId, eggNumber: i, outcome: "unknown" });
            }
        }
        if (toInsert.length > 0) {
            await db.insert(clutchEggs).values(toInsert);
        }

        // Delete eggs whose number now exceeds eggsLaid
        const toDelete = existing.filter(egg => egg.eggNumber > eggsLaid).map(egg => egg.id);
        if (toDelete.length > 0) {
            await db.delete(clutchEggs).where(inArray(clutchEggs.id, toDelete));
        }
    }

    static async convertToBird(broodId: number, userId: number, eggNumber: number): Promise<number> {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");

        return await db.transaction(async (tx) => {
            // 1. Fetch Brood
            const [brood] = await tx.select().from(broods).where(and(eq(broods.id, broodId), eq(broods.userId, userId)));
            if (!brood) throw new Error("Brood not found");

            // 2. Fetch Pair
            const [pair] = await tx.select().from(breedingPairs).where(and(eq(breedingPairs.id, brood.pairId), eq(breedingPairs.userId, userId)));
            if (!pair) throw new Error("Pair not found");

            // 3. Fetch Male parent to get speciesId
            const [male] = await tx.select().from(birds).where(and(eq(birds.id, pair.maleId), eq(birds.userId, userId)));
            if (!male) throw new Error("Male parent not found");

            // 4. Fetch the specific Egg
            const [egg] = await tx.select().from(clutchEggs).where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.eggNumber, eggNumber), eq(clutchEggs.userId, userId)));
            if (!egg || egg.outcome !== "fledged") throw new Error("Egg is not fledged");

            // 5. Insert new Bird
            const [newBird] = await tx.insert(birds).values({
                userId,
                speciesId: male.speciesId, // adopt parents' species
                status: "alive",
                gender: "unknown",
                fatherId: pair.maleId,
                motherId: pair.femaleId,
                dateOfBirth: brood.actualHatchDate,
                fledgedDate: egg.outcomeDate,
                notes: `Automatically added from Brood #${broodId}, Egg #${eggNumber}`
            }).returning({ id: birds.id });

            // 6. Link the newly created bird to the egg
            await tx.update(clutchEggs)
                .set({ birdId: newBird.id, updatedAt: new Date() })
                .where(eq(clutchEggs.id, egg.id));

            return newBird.id;
        });
    }
}
