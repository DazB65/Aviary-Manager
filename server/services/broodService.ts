import { eq, and, desc, asc, sql, inArray, or } from "drizzle-orm";
import { getDb } from "../db";
import {
    broods,
    clutchEggs,
    birds,
    breedingPairs,
    type InsertBrood,
} from "../../drizzle/schema";
import { EventService, isFinalBroodStatus } from "./eventService";

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
        if (result && isFinalBroodStatus(data.status)) {
            await EventService.deleteBroodAutoEvents(userId, id);
        }
        return result;
    }

    static async deleteBrood(id: number, userId: number) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        await EventService.deleteBroodAutoEvents(userId, id);
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

        // Ownership check — prevent a crafted broodId from overwriting another user's eggs
        const [ownedBrood] = await db
            .select({ id: broods.id })
            .from(broods)
            .where(and(eq(broods.id, broodId), eq(broods.userId, userId)))
            .limit(1);
        if (!ownedBrood) throw new Error("Brood not found");

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

        // Auto-update chicksSurvived: count eggs that are hatched or fledged
        const survived = allEggs.filter(e => e.outcome === "hatched" || e.outcome === "fledged").length;
        await db
            .update(broods)
            .set({ chicksSurvived: survived, updatedAt: new Date() })
            .where(and(eq(broods.id, broodId), eq(broods.userId, userId)));

        // "hatched" eggs still have live chicks that haven't fledged yet — keep the clutch
        // active (incubating) until every chick either fledges or dies
        const stillPending = allEggs.some(e => e.outcome === "unknown" || e.outcome === "fertile" || e.outcome === "hatched");
        if (stillPending) return;

        const hasSuccess = allEggs.some(e => e.outcome === "fledged");
        const newStatus = hasSuccess ? "hatched" : "failed";

        await db
            .update(broods)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(and(eq(broods.id, broodId), eq(broods.userId, userId), eq(broods.status, "incubating")));
        await EventService.deleteBroodAutoEvents(userId, broodId);
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
            await db.delete(clutchEggs).where(and(inArray(clutchEggs.id, toDelete), eq(clutchEggs.userId, userId)));
        }
    }

    static async getBreedingHistoryByBird(birdId: number, userId: number) {
        const db = getDb();
        if (!db) return [];

        const pairs = await db
            .select()
            .from(breedingPairs)
            .where(and(
                eq(breedingPairs.userId, userId),
                or(eq(breedingPairs.maleId, birdId), eq(breedingPairs.femaleId, birdId))
            ))
            .orderBy(desc(breedingPairs.season));

        if (pairs.length === 0) return [];

        const partnerIds = pairs.map(p => p.maleId === birdId ? p.femaleId : p.maleId);
        const partnerBirds = await db
            .select({ id: birds.id, ringId: birds.ringId, name: birds.name, photoUrl: birds.photoUrl, gender: birds.gender })
            .from(birds)
            .where(and(eq(birds.userId, userId), inArray(birds.id, partnerIds)));
        const partnerMap = Object.fromEntries(partnerBirds.map(b => [b.id, b]));

        const pairIds = pairs.map(p => p.id);
        const allBroods = await db
            .select()
            .from(broods)
            .where(and(eq(broods.userId, userId), inArray(broods.pairId, pairIds)))
            .orderBy(desc(broods.layDate));

        const broodIds = allBroods.map(b => b.id);
        const eggCountsByBrood: Record<number, Record<string, number>> = {};
        if (broodIds.length > 0) {
            const eggRows = await db
                .select({ broodId: clutchEggs.broodId, outcome: clutchEggs.outcome })
                .from(clutchEggs)
                .where(and(eq(clutchEggs.userId, userId), inArray(clutchEggs.broodId, broodIds)));
            for (const row of eggRows) {
                if (!eggCountsByBrood[row.broodId]) eggCountsByBrood[row.broodId] = {};
                eggCountsByBrood[row.broodId][row.outcome] = (eggCountsByBrood[row.broodId][row.outcome] ?? 0) + 1;
            }
        }

        return pairs.map(pair => {
            const partnerId = pair.maleId === birdId ? pair.femaleId : pair.maleId;
            const partner = partnerMap[partnerId];
            const pairBroods = allBroods.filter(b => b.pairId === pair.id);
            return {
                pair: {
                    id: pair.id,
                    season: pair.season,
                    pairingDate: pair.pairingDate,
                    status: pair.status,
                    notes: pair.notes,
                    partnerId,
                    partnerRingId: partner?.ringId ?? null,
                    partnerName: partner?.name ?? null,
                    partnerPhotoUrl: partner?.photoUrl ?? null,
                    partnerGender: partner?.gender ?? "unknown",
                },
                broods: pairBroods.map(b => ({
                    id: b.id,
                    layDate: b.layDate,
                    expectedHatchDate: b.expectedHatchDate,
                    actualHatchDate: b.actualHatchDate,
                    eggsLaid: b.eggsLaid,
                    chicksSurvived: b.chicksSurvived,
                    status: b.status,
                    notes: b.notes,
                    eggCounts: eggCountsByBrood[b.id] ?? {},
                })),
            };
        });
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
