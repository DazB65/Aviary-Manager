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
    type InsertUser,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

export class UserService {
    static async upsertUser(user: InsertUser): Promise<void> {
        if (!user.openId) throw new Error("User openId is required for upsert");
        const db = getDb();
        if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

        const values: InsertUser = { openId: user.openId };
        const updateSet: Record<string, unknown> = {};
        const textFields = ["name", "email", "loginMethod"] as const;
        type TextField = (typeof textFields)[number];
        const assignNullable = (field: TextField) => {
            const value = user[field];
            if (value === undefined) return;
            const normalized = value ?? null;
            values[field] = normalized;
            updateSet[field] = normalized;
        };
        textFields.forEach(assignNullable);
        if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
        if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
        else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
        if (!values.lastSignedIn) values.lastSignedIn = new Date();
        if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

        await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
    }

    static async getUserByOpenId(openId: string) {
        const db = getDb();
        if (!db) return undefined;
        const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        return result.length > 0 ? result[0] : undefined;
    }

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
            await tx.delete(userSettings).where(eq(userSettings.userId, userId));
            await tx.delete(users).where(eq(users.id, userId));
        });
    }

    static async setUserPlan(userId: number, plan: "free" | "pro") {
        const db = getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(users).set({ plan }).where(eq(users.id, userId));
    }
}
