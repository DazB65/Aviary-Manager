import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
    users,
    userSettings,
    birds,
    breedingPairs,
    broods,
    events,
    clutchEggs,
    species,
} from "../../drizzle/schema";

export class UserService {
    static async getUserById(id: number) {
        const db = getDb();
        if (!db) return undefined;
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result.length > 0 ? result[0] : undefined;
    }

    static async getAllUsers() {
        const db = getDb();
        if (!db) return [];
        return db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            plan: users.plan,
            role: users.role,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
        }).from(users).orderBy(desc(users.createdAt));
    }

    static async deleteUser(userId: number) {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        await db.transaction(async (tx) => {
            await tx.delete(clutchEggs).where(eq(clutchEggs.userId, userId));
            await tx.delete(events).where(eq(events.userId, userId));
            await tx.delete(broods).where(eq(broods.userId, userId));
            await tx.delete(breedingPairs).where(eq(breedingPairs.userId, userId));
            await tx.delete(birds).where(eq(birds.userId, userId));
            await tx.delete(species).where(eq(species.userId, userId));
            await tx.delete(userSettings).where(eq(userSettings.userId, userId));
            await tx.delete(users).where(eq(users.id, userId));
        });
    }

    static async setUserPlan(userId: number, plan: "starter" | "pro") {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(users).set({ plan }).where(eq(users.id, userId));
    }

    static async setUserRole(userId: number, role: "user" | "admin") {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(users).set({ role }).where(eq(users.id, userId));
    }
}
