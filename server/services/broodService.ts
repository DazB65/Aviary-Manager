import { eq, and, desc, asc } from "drizzle-orm";
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

    static async getEggsByBrood(broodId: number, userId: number): Promise<ClutchEgg[]> {
        const db = getDb();
        if (!db) return [];
        return db
            .select()
            .from(clutchEggs)
            .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)))
            .orderBy(asc(clutchEggs.eggNumber));
    }

    static async getEggsByUser(userId: number): Promise<ClutchEgg[]> {
        const db = getDb();
        if (!db) return [];
        return db
            .select()
            .from(clutchEggs)
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

        await db
            .insert(clutchEggs)
            .values({
                broodId,
                userId,
                eggNumber,
                outcome,
                notes: safeNotes
            })
            .onConflictDoUpdate({
                target: [clutchEggs.broodId, clutchEggs.eggNumber],
                set: {
                    outcome,
                    notes: safeNotes
                },
            });
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

        for (let i = 1; i <= eggsLaid; i++) {
            if (!existingNums.has(i)) {
                await db.insert(clutchEggs).values({ broodId, userId, eggNumber: i, outcome: "unknown" });
            }
        }

        for (const egg of existing) {
            if (egg.eggNumber > eggsLaid) {
                await db.delete(clutchEggs).where(eq(clutchEggs.id, egg.id));
            }
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

            return newBird.id;
        });
    }
}
