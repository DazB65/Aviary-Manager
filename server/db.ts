import { and, eq, gte, lte, or, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  species, InsertSpecies,
  birds, InsertBird,
  breedingPairs, InsertBreedingPair,
  broods, InsertBrood,
  events, InsertEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
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

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Species ──────────────────────────────────────────────────────────────────

export async function getAllSpecies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(species).orderBy(asc(species.category), asc(species.commonName));
}

export async function createSpecies(data: InsertSpecies) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(species).values(data).$returningId();
  return result;
}

// ─── Birds ────────────────────────────────────────────────────────────────────

export async function getBirdsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(birds).where(eq(birds.userId, userId)).orderBy(desc(birds.createdAt));
}

export async function getBirdById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(birds).where(and(eq(birds.id, id), eq(birds.userId, userId))).limit(1);
  return result[0];
}

export async function createBird(data: InsertBird) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(birds).values(data).$returningId();
  return result;
}

export async function updateBird(id: number, userId: number, data: Partial<InsertBird>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(birds).set(data).where(and(eq(birds.id, id), eq(birds.userId, userId)));
}

export async function deleteBird(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(birds).where(and(eq(birds.id, id), eq(birds.userId, userId)));
}

// ─── Breeding Pairs ───────────────────────────────────────────────────────────

export async function getPairsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(breedingPairs).where(eq(breedingPairs.userId, userId)).orderBy(desc(breedingPairs.createdAt));
}

export async function getPairById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(breedingPairs).where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId))).limit(1);
  return result[0];
}

export async function createPair(data: InsertBreedingPair) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(breedingPairs).values(data).$returningId();
  return result;
}

export async function updatePair(id: number, userId: number, data: Partial<InsertBreedingPair>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(breedingPairs).set(data).where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId)));
}

export async function deletePair(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(breedingPairs).where(and(eq(breedingPairs.id, id), eq(breedingPairs.userId, userId)));
}

// ─── Broods ───────────────────────────────────────────────────────────────────

export async function getBroodsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(broods).where(eq(broods.userId, userId)).orderBy(desc(broods.createdAt));
}

export async function getBroodsByPair(pairId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(broods).where(and(eq(broods.pairId, pairId), eq(broods.userId, userId))).orderBy(desc(broods.layDate));
}

export async function createBrood(data: InsertBrood) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(broods).values(data).$returningId();
  return result;
}

export async function updateBrood(id: number, userId: number, data: Partial<InsertBrood>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(broods).set(data).where(and(eq(broods.id, id), eq(broods.userId, userId)));
}

export async function deleteBrood(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(broods).where(and(eq(broods.id, id), eq(broods.userId, userId)));
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEventsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.userId, userId)).orderBy(asc(events.eventDate));
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(events).values(data).$returningId();
  return result;
}

export async function updateEvent(id: number, userId: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(events).set(data).where(and(eq(events.id, id), eq(events.userId, userId)));
}

export async function deleteEvent(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalBirds: 0, activePairs: 0, eggsIncubating: 0, upcomingHatches: 0, upcomingEvents: 0 };

  const [allBirds, allPairs, allBroods, allEvents] = await Promise.all([
    db.select().from(birds).where(and(eq(birds.userId, userId), eq(birds.status, "alive"))),
    db.select().from(breedingPairs).where(and(eq(breedingPairs.userId, userId), eq(breedingPairs.status, "active"))),
    db.select().from(broods).where(and(eq(broods.userId, userId), eq(broods.status, "incubating"))),
    db.select().from(events).where(and(eq(events.userId, userId), eq(events.completed, false))),
  ]);

  const today = new Date();
  const in14Days = new Date(today);
  in14Days.setDate(today.getDate() + 14);
  const todayStr = today.toISOString().split("T")[0];
  const futureStr = in14Days.toISOString().split("T")[0];

  const upcomingHatches = allBroods.filter(b => {
    if (!b.expectedHatchDate) return false;
    const d = b.expectedHatchDate instanceof Date ? b.expectedHatchDate.toISOString().split("T")[0] : String(b.expectedHatchDate);
    return d >= todayStr && d <= futureStr;
  }).length;

  const upcomingEvents = allEvents.filter(e => {
    const d = e.eventDate instanceof Date ? e.eventDate.toISOString().split("T")[0] : String(e.eventDate);
    return d >= todayStr && d <= futureStr;
  }).length;

  return {
    totalBirds: allBirds.length,
    activePairs: allPairs.length,
    eggsIncubating: allBroods.reduce((sum, b) => sum + (b.eggsLaid ?? 0), 0),
    upcomingHatches,
    upcomingEvents,
  };
}

// ─── Toggle event complete ────────────────────────────────────────────────────
export async function toggleEventComplete(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(events).where(and(eq(events.id, id), eq(events.userId, userId))).limit(1);
  if (!existing[0]) throw new Error("Event not found");
  await db.update(events).set({ completed: !existing[0].completed }).where(and(eq(events.id, id), eq(events.userId, userId)));
  return { success: true };
}
