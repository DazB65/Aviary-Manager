import { and, eq, ne, gte, lte, or, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  species, InsertSpecies,
  birds, InsertBird,
  breedingPairs, InsertBreedingPair,
  broods, InsertBrood,
  events, InsertEvent,
  clutchEggs, ClutchEgg,
  userSettings,
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

// ─── Pedigree: fetch up to 5 generations of ancestors ────────────────────────
export type PedigreeBird = {
  id: number;
  name: string | null;
  ringId: string | null;
  gender: string;
  colorMutation: string | null;
  photoUrl: string | null;
  speciesId: number;
  fatherId: number | null;
  motherId: number | null;
};

export async function getPedigree(birdId: number, userId: number, maxGenerations = 5): Promise<Record<number, PedigreeBird>> {
  const db = await getDb();
  if (!db) return {};

  const result: Record<number, PedigreeBird> = {};
  const toFetch = new Set<number>([birdId]);
  const fetched = new Set<number>();

  for (let gen = 0; gen < maxGenerations && toFetch.size > 0; gen++) {
    const ids = Array.from(toFetch);
    toFetch.clear();

    const rows = await db
      .select({
        id: birds.id,
        name: birds.name,
        ringId: birds.ringId,
        gender: birds.gender,
        colorMutation: birds.colorMutation,
        photoUrl: birds.photoUrl,
        speciesId: birds.speciesId,
        fatherId: birds.fatherId,
        motherId: birds.motherId,
      })
      .from(birds)
      .where(and(eq(birds.userId, userId)));

    // Filter in JS since drizzle inArray needs non-empty array
    const filtered = rows.filter(r => ids.includes(r.id));

    for (const row of filtered) {
      if (!fetched.has(row.id)) {
        result[row.id] = row;
        fetched.add(row.id);
        if (row.fatherId && !fetched.has(row.fatherId)) toFetch.add(row.fatherId);
        if (row.motherId && !fetched.has(row.motherId)) toFetch.add(row.motherId);
      }
    }
  }

  return result;
}

// ─── Inbreeding coefficient (Wright's path coefficient method) ────────────────
// Returns a value 0–1 (0 = no inbreeding, 1 = fully inbred)
export async function calcInbreedingCoefficient(maleId: number, femaleId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Fetch all birds for this user to build a local ancestry map
  const allBirds = await db
    .select({ id: birds.id, fatherId: birds.fatherId, motherId: birds.motherId })
    .from(birds)
    .where(eq(birds.userId, userId));

  const birdMap = new Map(allBirds.map(b => [b.id, b]));

  // Get all ancestors of a bird up to maxDepth, returning Map<ancestorId, Set<paths>>
  function getAncestors(id: number, maxDepth = 10): Map<number, number[]> {
    const ancestors = new Map<number, number[]>(); // ancestorId -> list of generation depths
    const queue: Array<{ id: number; depth: number }> = [{ id, depth: 0 }];
    while (queue.length > 0) {
      const { id: current, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      const bird = birdMap.get(current);
      if (!bird) continue;
      if (bird.fatherId) {
        const existing = ancestors.get(bird.fatherId) ?? [];
        existing.push(depth + 1);
        ancestors.set(bird.fatherId, existing);
        queue.push({ id: bird.fatherId, depth: depth + 1 });
      }
      if (bird.motherId) {
        const existing = ancestors.get(bird.motherId) ?? [];
        existing.push(depth + 1);
        ancestors.set(bird.motherId, existing);
        queue.push({ id: bird.motherId, depth: depth + 1 });
      }
    }
    return ancestors;
  }

  const maleAncestors = getAncestors(maleId);
  const femaleAncestors = getAncestors(femaleId);

  // Find common ancestors
  let F = 0;
  for (const [ancestorId, malePaths] of Array.from(maleAncestors.entries())) {
    if (femaleAncestors.has(ancestorId)) {
      const femalePaths = femaleAncestors.get(ancestorId)!;
      // Wright's formula: F = sum over common ancestors of (0.5^(n1+n2+1))
      for (const n1 of malePaths) {
        for (const n2 of femalePaths) {
          F += Math.pow(0.5, n1 + n2 + 1);
        }
      }
    }
  }

  return Math.min(Math.round(F * 10000) / 10000, 1); // cap at 1, 4 decimal places
}

// ─── Descendants: all offspring of a bird ────────────────────────────────────
export async function getDescendants(birdId: number, userId: number): Promise<PedigreeBird[]> {
  const db = await getDb();
  if (!db) return [];

  const allBirds = await db
    .select({
      id: birds.id,
      name: birds.name,
      ringId: birds.ringId,
      gender: birds.gender,
      colorMutation: birds.colorMutation,
      photoUrl: birds.photoUrl,
      speciesId: birds.speciesId,
      fatherId: birds.fatherId,
      motherId: birds.motherId,
    })
    .from(birds)
    .where(eq(birds.userId, userId));

  const result: PedigreeBird[] = [];
  const visited = new Set<number>();
  const queue = [birdId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = allBirds.filter(b => b.fatherId === current || b.motherId === current);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        result.push(child);
        queue.push(child.id);
      }
    }
  }

  return result;
}

// ─── Sibling detection ────────────────────────────────────────────────────────
/**
 * Returns all birds that share at least one parent with the given bird.
 * Distinguishes full siblings (same father AND mother) from half siblings.
 */
export async function getSiblings(birdId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get the bird's own parents
  const [target] = await db.select().from(birds).where(and(eq(birds.id, birdId), eq(birds.userId, userId))).limit(1);
  if (!target) return [];

  const { fatherId, motherId } = target;
  if (!fatherId && !motherId) return []; // no known parents → no siblings

  // Fetch all user's birds except the target itself
  const allBirds = await db.select().from(birds).where(and(eq(birds.userId, userId), ne(birds.id, birdId)));

  const siblings: Array<typeof allBirds[0] & { siblingType: "full" | "half" }> = [];

  for (const b of allBirds) {
    const sharedFather = fatherId && b.fatherId && fatherId === b.fatherId;
    const sharedMother = motherId && b.motherId && motherId === b.motherId;

    if (sharedFather && sharedMother) {
      siblings.push({ ...b, siblingType: "full" });
    } else if (sharedFather || sharedMother) {
      siblings.push({ ...b, siblingType: "half" });
    }
  }

  return siblings;
}

// ─── Clutch egg outcome helpers ───────────────────────────────────────────────

export async function getEggsByBrood(broodId: number, userId: number): Promise<ClutchEgg[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clutchEggs)
    .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)))
    .orderBy(asc(clutchEggs.eggNumber));
}

export async function upsertClutchEgg(
  broodId: number,
  userId: number,
  eggNumber: number,
  outcome: ClutchEgg["outcome"],
  notes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(clutchEggs)
    .values({ broodId, userId, eggNumber, outcome, notes: notes ?? null })
    .onDuplicateKeyUpdate({ set: { outcome, notes: notes ?? null } });
}

export async function deleteEggsByBrood(broodId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(clutchEggs).where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)));
}

export async function syncClutchEggs(broodId: number, userId: number, eggsLaid: number): Promise<void> {
  // Ensure exactly eggsLaid egg rows exist for this brood (add missing, remove extras)
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(clutchEggs)
    .where(and(eq(clutchEggs.broodId, broodId), eq(clutchEggs.userId, userId)));
  const existingNums = new Set(existing.map(e => e.eggNumber));
  // Add missing egg slots
  for (let i = 1; i <= eggsLaid; i++) {
    if (!existingNums.has(i)) {
      await db.insert(clutchEggs).values({ broodId, userId, eggNumber: i, outcome: "unknown" });
    }
  }
  // Remove egg slots beyond eggsLaid
  for (const egg of existing) {
    if (egg.eggNumber > eggsLaid) {
      await db.delete(clutchEggs).where(eq(clutchEggs.id, egg.id));
    }
  }
}

// ─── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUserSettings(userId: number, data: { favouriteSpeciesIds?: number[]; defaultSpeciesId?: number | null }) {
  const db = await getDb();
  if (!db) return;
  const favouriteSpeciesIds = data.favouriteSpeciesIds !== undefined
    ? JSON.stringify(data.favouriteSpeciesIds)
    : undefined;
  const values: Record<string, unknown> = { userId };
  const updateSet: Record<string, unknown> = {};
  if (favouriteSpeciesIds !== undefined) { values.favouriteSpeciesIds = favouriteSpeciesIds; updateSet.favouriteSpeciesIds = favouriteSpeciesIds; }
  if (data.defaultSpeciesId !== undefined) { values.defaultSpeciesId = data.defaultSpeciesId; updateSet.defaultSpeciesId = data.defaultSpeciesId; }
  await db.insert(userSettings).values(values as any).onDuplicateKeyUpdate({ set: updateSet });
}
