import { eq, and, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import {
    broods,
    clutchEggs,
    birds,
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
        const safeDate = outcomeDate?.trim() ? outcomeDate : null;
        const safeNotes = notes?.trim() ? notes : null;

        await db
            .insert(clutchEggs)
            .values({
                broodId,
                userId,
                eggNumber,
                outcome,
                notes: safeNotes,
                outcomeDate: safeDate
            })
            .onConflictDoUpdate({
                target: [clutchEggs.broodId, clutchEggs.eggNumber],
                set: {
                    outcome,
                    notes: safeNotes,
                    outcomeDate: safeDate
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
}
