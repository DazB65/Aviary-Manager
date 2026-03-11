import { asc, or, isNull, eq } from "drizzle-orm";
import { getDb } from "../db";
import { species, type InsertSpecies } from "../../drizzle/schema";

export class SpeciesService {
    /**
     * Returns all system species (userId IS NULL) plus any custom species
     * created by the given user. Pass userId=null to get system species only.
     */
    static async getAllSpecies(userId?: number) {
        const db = getDb();
        const condition = userId !== undefined
            ? or(isNull(species.userId), eq(species.userId, userId))
            : isNull(species.userId);
        return db.select().from(species).where(condition).orderBy(asc(species.commonName));
    }

    static async createSpecies(data: InsertSpecies) {
        const [newSpecies] = await getDb()
            .insert(species)
            .values(data)
            .returning();
        return newSpecies;
    }
}
