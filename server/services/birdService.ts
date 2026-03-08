import { eq, and, asc, or, ilike, count, ne, inArray, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
    birds,
    breedingPairs,
    broods,
    events,
    clutchEggs,
    type InsertBird,
} from "../../drizzle/schema";

export class BirdService {
    static async getBirdsByUser(userId: number) {
        return getDb().select().from(birds).where(eq(birds.userId, userId)).orderBy(asc(birds.name));
    }

    static async getBirdById(id: number, userId: number) {
        const results = await getDb()
            .select()
            .from(birds)
            .where(and(eq(birds.id, id), eq(birds.userId, userId)))
            .limit(1);
        return results[0] ?? undefined;
    }

    static async searchBirds(userId: number, q: string) {
        return getDb()
            .select()
            .from(birds)
            .where(and(eq(birds.userId, userId), or(ilike(birds.name, `%${q}%`), ilike(birds.ringId, `%${q}%`))))
            .limit(10);
    }

    static async createBird(data: InsertBird) {
        const [result] = await getDb().insert(birds).values(data).returning();
        return result;
    }

    static async updateBird(id: number, userId: number, data: Partial<InsertBird>) {
        const [result] = await getDb()
            .update(birds)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(birds.id, id), eq(birds.userId, userId)))
            .returning();
        return result;
    }

    static async deleteBird(id: number, userId: number) {
        await getDb().transaction(async (tx) => {
            // Nullify this bird as a parent from any offspring
            await tx.update(birds).set({ fatherId: null }).where(and(eq(birds.fatherId, id), eq(birds.userId, userId)));
            await tx.update(birds).set({ motherId: null }).where(and(eq(birds.motherId, id), eq(birds.userId, userId)));

            // Delete events tied directly to this bird
            await tx.delete(events).where(and(eq(events.birdId, id), eq(events.userId, userId)));

            // Find any breeding pairs involving this bird
            const associatedPairs = await tx
                .select({ id: breedingPairs.id })
                .from(breedingPairs)
                .where(and(or(eq(breedingPairs.maleId, id), eq(breedingPairs.femaleId, id)), eq(breedingPairs.userId, userId)));

            if (associatedPairs.length > 0) {
                const pairIds = associatedPairs.map((p) => p.id);

                // Delete events tied to these pairs
                await tx.delete(events).where(and(inArray(events.pairId, pairIds), eq(events.userId, userId)));

                // Find broods tied to these pairs
                const associatedBroods = await tx
                    .select({ id: broods.id })
                    .from(broods)
                    .where(and(inArray(broods.pairId, pairIds), eq(broods.userId, userId)));

                if (associatedBroods.length > 0) {
                    const broodIds = associatedBroods.map((b) => b.id);
                    // Delete eggs for these broods
                    await tx.delete(clutchEggs).where(and(inArray(clutchEggs.broodId, broodIds), eq(clutchEggs.userId, userId)));
                    // Delete the broods themselves
                    await tx.delete(broods).where(and(inArray(broods.id, broodIds), eq(broods.userId, userId)));
                }

                // Delete the pairs themselves
                await tx.delete(breedingPairs).where(and(inArray(breedingPairs.id, pairIds), eq(breedingPairs.userId, userId)));
            }

            // Finally, delete the bird
            await tx.delete(birds).where(and(eq(birds.id, id), eq(birds.userId, userId)));
        });
    }

    static async getBirdsPaginated(
        userId: number,
        page: number,
        limit: number,
        status?: string,
        gender?: string,
        speciesId?: number
    ) {
        const offset = (page - 1) * limit;

        const conditions = [eq(birds.userId, userId)];
        if (status) conditions.push(eq(birds.status, status as any));
        if (gender) conditions.push(eq(birds.gender, gender as any));
        if (speciesId) conditions.push(eq(birds.speciesId, speciesId));

        const baseQuery = getDb().select().from(birds).where(and(...conditions));

        const totalResult = await getDb()
            .select({ count: count() })
            .from(birds)
            .where(and(...conditions));
        const totalCount = Number(totalResult[0]?.count || 0);

        const data = await baseQuery.orderBy(desc(birds.createdAt)).limit(limit).offset(offset);

        return {
            data,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
        };
    }
}
