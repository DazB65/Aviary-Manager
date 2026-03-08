import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userSettings, type InsertUserSettings } from "../../drizzle/schema";

export class SettingsService {
    static async getUserSettings(userId: number) {
        const db = getDb();
        if (!db) return null;
        const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        return rows[0] ?? null;
    }

    static async updateUserSettings(userId: number, data: { favouriteSpeciesIds?: number[]; defaultSpeciesId?: number | null; breedingYear?: number | null }) {
        const db = getDb();
        if (!db) return;
        const favouriteSpeciesIds = data.favouriteSpeciesIds !== undefined
            ? JSON.stringify(data.favouriteSpeciesIds)
            : undefined;
        const values: Record<string, unknown> = { userId };
        const updateSet: Record<string, unknown> = {};

        if (favouriteSpeciesIds !== undefined) {
            values.favouriteSpeciesIds = favouriteSpeciesIds;
            updateSet.favouriteSpeciesIds = favouriteSpeciesIds;
        }
        if (data.defaultSpeciesId !== undefined) {
            values.defaultSpeciesId = data.defaultSpeciesId;
            updateSet.defaultSpeciesId = data.defaultSpeciesId;
        }
        if (data.breedingYear !== undefined) {
            values.breedingYear = data.breedingYear;
            updateSet.breedingYear = data.breedingYear;
        }

        await db.insert(userSettings).values(values as any).onConflictDoUpdate({ target: userSettings.userId, set: updateSet });
    }
}
