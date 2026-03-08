import { asc } from "drizzle-orm";
import { getDb } from "../db";
import { species, type InsertSpecies } from "../../drizzle/schema";

export class SpeciesService {
    static async getAllSpecies() {
        return await getDb().select().from(species).orderBy(asc(species.commonName));
    }

    static async createSpecies(data: InsertSpecies) {
        const [newSpecies] = await getDb()
            .insert(species)
            .values(data)
            .returning();
        return newSpecies;
    }
}
