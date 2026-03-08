import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
    breedingPairs,
    birds,
    broods,
    events,
    clutchEggs,
    type InsertBreedingPair,
} from "../../drizzle/schema";

export class PairService {
    static async getPairsByUser(userId: number) {
        const db = getDb();
        if (!db) return [];
        return db
            .select()
            .from(breedingPairs)
            .where(eq(breedingPairs.userId, userId))
            .orderBy(desc(breedingPairs.createdAt));
    }

    static async getPairById(id: number, userId: number) {
        const db = getDb();
        if (!db) return undefined;
        const result = await db
            .select()
            .from(breedingPairs)
            .where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId)))
            .limit(1);
        return result[0];
    }

    static async createPair(data: InsertBreedingPair) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db
            .insert(breedingPairs)
            .values(data)
            .returning({ id: breedingPairs.id });
        return result;
    }

    static async updatePair(id: number, userId: number, data: Partial<InsertBreedingPair>) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        // Maintain consistent return of updated data vs no return
        await db
            .update(breedingPairs)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId)));
    }

    static async deletePair(id: number, userId: number) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        // Wrap carefully with a transaction as per requested
        await db.transaction(async (tx) => {
            // Unlink properties from birds which were born to this pair's broods
            const pairBroods = await tx
                .select({ id: broods.id })
                .from(broods)
                .where(and(eq(broods.pairId, id), eq(broods.userId, userId)));

            if (pairBroods.length > 0) {
                const broodIds = pairBroods.map((b) => b.id);
                // delete eggs
                await tx.delete(clutchEggs).where(and(inArray(clutchEggs.broodId, broodIds), eq(clutchEggs.userId, userId)));
                // delete broods
                await tx.delete(broods).where(and(inArray(broods.id, broodIds), eq(broods.userId, userId)));
            }

            // delete events linked specifically to this pair
            await tx.delete(events).where(and(eq(events.pairId, id), eq(events.userId, userId)));

            // Delete the pair itself
            await tx.delete(breedingPairs).where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId)));
        });
    }
}
