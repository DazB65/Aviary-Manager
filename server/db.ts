import { and, eq, ne, gte, lte, or, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import postgres from "postgres";
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

// Resolve the drizzle migrations folder relative to this source file so it
// works whether the server is run via tsx (dev) or as a compiled bundle (prod).
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, "..", "drizzle");

const SPECIES_SEED = [
  { commonName: "Canary", scientificName: "Serinus canaria", category: "Canary", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5, fledglingDays: 21, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "behavioural" },
  { commonName: "Zebra Finch", scientificName: "Taeniopygia guttata", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 3, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Bengalese Finch (Society Finch)", scientificName: "Lonchura striata domestica", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 4, nestType: "nest box", sexingMethod: "behavioural" },
  { commonName: "Society Finch (Bengalese)", scientificName: "Lonchura striata domestica", category: "Finch", incubationDays: 16, clutchSizeMin: 4, clutchSizeMax: 7, fledglingDays: 21, sexualMaturityMonths: 4, nestType: "nest box", sexingMethod: "behavioural" },
  { commonName: "Gouldian Finch", scientificName: "Erythrura gouldiae", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 8, fledglingDays: 21, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Star Finch", scientificName: "Neochmia ruficauda", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Owl Finch", scientificName: "Taeniopygia bichenovii", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Diamond Firetail", scientificName: "Stagonopleura guttata", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 7, fledglingDays: 21, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Long-tailed Finch", scientificName: "Poephila acuticauda", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Plum-headed Finch", scientificName: "Neochmia modesta", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "European Goldfinch", scientificName: "Carduelis carduelis", category: "Finch", incubationDays: 13, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 14, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Siskin", scientificName: "Spinus spinus", category: "Finch", incubationDays: 13, clutchSizeMin: 3, clutchSizeMax: 5, fledglingDays: 15, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Greenfinch", scientificName: "Chloris chloris", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 16, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Bullfinch", scientificName: "Pyrrhula pyrrhula", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 5, fledglingDays: 16, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Java Sparrow", scientificName: "Lonchura oryzivora", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 8, fledglingDays: 28, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Cordon Bleu", scientificName: "Uraeginthus bengalus", category: "Finch", incubationDays: 12, clutchSizeMin: 3, clutchSizeMax: 6, fledglingDays: 21, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Budgerigar (Budgie)", scientificName: "Melopsittacus undulatus", category: "Parakeet", incubationDays: 18, clutchSizeMin: 4, clutchSizeMax: 8, fledglingDays: 35, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Indian Ringneck Parakeet", scientificName: "Psittacula krameri", category: "Parakeet", incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 6, fledglingDays: 49, sexualMaturityMonths: 18, nestType: "hollow log", sexingMethod: "visual" },
  { commonName: "Alexandrine Parakeet", scientificName: "Psittacula eupatria", category: "Parakeet", incubationDays: 24, clutchSizeMin: 2, clutchSizeMax: 4, fledglingDays: 56, sexualMaturityMonths: 24, nestType: "hollow log", sexingMethod: "visual" },
  { commonName: "Cockatiel", scientificName: "Nymphicus hollandicus", category: "Cockatoo", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 7, fledglingDays: 35, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Lovebird (Peach-faced)", scientificName: "Agapornis roseicollis", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Lovebird (Fischer's)", scientificName: "Agapornis fischeri", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Lovebird (Masked)", scientificName: "Agapornis personatus", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Turquoisine Parrot", scientificName: "Neophema pulchella", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Scarlet-chested Parrot", scientificName: "Neophema splendida", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Bourke's Parrot", scientificName: "Neopsephotus bourkii", category: "Parrot", incubationDays: 18, clutchSizeMin: 3, clutchSizeMax: 6, fledglingDays: 28, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Elegant Parrot", scientificName: "Neophema elegans", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6, fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Red-rumped Parrot", scientificName: "Psephotus haematonotus", category: "Parrot", incubationDays: 20, clutchSizeMin: 4, clutchSizeMax: 7, fledglingDays: 30, sexualMaturityMonths: 9, nestType: "hollow log", sexingMethod: "visual" },
  { commonName: "Eastern Rosella", scientificName: "Platycercus eximius", category: "Parrot", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 9, fledglingDays: 35, sexualMaturityMonths: 15, nestType: "hollow log", sexingMethod: "DNA" },
  { commonName: "Crimson Rosella", scientificName: "Platycercus elegans", category: "Parrot", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 8, fledglingDays: 35, sexualMaturityMonths: 15, nestType: "hollow log", sexingMethod: "DNA" },
  { commonName: "Sun Conure", scientificName: "Aratinga solstitialis", category: "Parrot", incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 5, fledglingDays: 56, sexualMaturityMonths: 24, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Green-cheeked Conure", scientificName: "Pyrrhura molinae", category: "Parrot", incubationDays: 24, clutchSizeMin: 4, clutchSizeMax: 8, fledglingDays: 49, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Caique (White-bellied)", scientificName: "Pionites leucogaster", category: "Parrot", incubationDays: 27, clutchSizeMin: 2, clutchSizeMax: 4, fledglingDays: 70, sexualMaturityMonths: 36, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Diamond Dove", scientificName: "Geopelia cuneata", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2, fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Peaceful Dove", scientificName: "Geopelia striata", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2, fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Ringneck Dove", scientificName: "Streptopelia risoria", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2, fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Pekin Robin", scientificName: "Leiothrix lutea", category: "Softbill", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5, fledglingDays: 14, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Shama Thrush", scientificName: "Copsychus malabaricus", category: "Softbill", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5, fledglingDays: 14, sexualMaturityMonths: 12, nestType: "open cup", sexingMethod: "visual" },
] satisfies Omit<InsertSpecies, "isCustom" | "userId">[];

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Establish the main connection pool first — this must succeed or we return null.
      const poolClient = postgres(process.env.DATABASE_URL);
      _db = drizzle(poolClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      return _db;
    }

    // Apply pending migrations in a separate connection so a migration failure
    // (e.g. column already exists, journal mismatch) is non-fatal and the app
    // still serves data against the existing schema.
    try {
      const migrateClient = postgres(process.env.DATABASE_URL, { max: 1 });
      const migrateDb = drizzle(migrateClient);
      await migrate(migrateDb, { migrationsFolder: MIGRATIONS_FOLDER });
      await migrateClient.end();
      console.log("[Database] Migrations applied successfully");
    } catch (migError) {
      console.warn("[Database] Migration warning (non-fatal, schema may already be up to date):", migError);
    }

    // Idempotent schema patches — ensure columns/enum values added by recent migrations
    // actually exist. These run in autocommit mode (outside a transaction) which is
    // required for ALTER TYPE ADD VALUE in PostgreSQL.
    try {
      await _db.execute(sql`ALTER TABLE birds ADD COLUMN IF NOT EXISTS "fledgedDate" date`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (fledgedDate):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TYPE bird_status ADD VALUE IF NOT EXISTS 'breeding'`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (breeding status):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TYPE bird_status ADD VALUE IF NOT EXISTS 'resting'`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (resting status):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "allBirds" boolean DEFAULT false`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (allBirds):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'supplements'`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (supplements event type):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "seriesId" varchar(64)`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (seriesId):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "recurrenceUnit" varchar(16)`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (recurrenceUnit):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "recurrenceInterval" integer`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (recurrenceInterval):", patchError);
    }
    try {
      await _db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "isIndefinite" boolean DEFAULT false`);
    } catch (patchError) {
      console.warn("[Database] Schema patch (isIndefinite):", patchError);
    }

    // Seed species if the table is empty (first deploy / fresh DB).
    try {
      const existing = await _db.select({ id: species.id }).from(species).limit(1);
      if (existing.length === 0) {
        await _db.insert(species).values(
          SPECIES_SEED.map(s => ({ ...s, isCustom: false, userId: null }))
        );
        console.log(`[Database] Seeded ${SPECIES_SEED.length} species`);
      }
    } catch (seedError) {
      console.warn("[Database] Species seeding warning (non-fatal):", seedError);
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

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
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
  const [result] = await db.insert(species).values(data).returning({ id: species.id });
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
  const [result] = await db.insert(birds).values(data).returning({ id: birds.id });
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
  const [result] = await db.insert(breedingPairs).values(data).returning({ id: breedingPairs.id });
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
  const [result] = await db.insert(broods).values(data).returning({ id: broods.id });
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
  const [result] = await db.insert(events).values(data).returning({ id: events.id });
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

export async function deleteAllEvents(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(events).where(eq(events.userId, userId));
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getSeasonStats(userId: number, year: number) {
  const db = await getDb();
  if (!db) return { pairs: 0, broods: 0, incubating: 0, totalEggs: 0, hatched: 0, hatchRate: 0 };

  const yearStr = String(year);
  const [seasonPairs, seasonBroods] = await Promise.all([
    db.select().from(breedingPairs).where(and(eq(breedingPairs.userId, userId), eq(breedingPairs.season, year))),
    db.select().from(broods).where(and(eq(broods.userId, userId), eq(broods.season, yearStr))),
  ]);

  const pairs = seasonPairs.length;
  const broodsCount = seasonBroods.length;
  const incubating = seasonBroods.filter(b => b.status === "incubating").length;
  const totalEggs = seasonBroods.reduce((sum, b) => sum + (b.eggsLaid ?? 0), 0);
  const hatched = seasonBroods.reduce((sum, b) => sum + (b.chicksSurvived ?? 0), 0);
  const hatchRate = totalEggs > 0 ? Math.round((hatched / totalEggs) * 100) : 0;

  return { pairs, broods: broodsCount, incubating, totalEggs, hatched, hatchRate };
}

export async function getAllUsers() {
  const db = await getDb();
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

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Delete all user data in dependency order
  await db.delete(clutchEggs).where(eq(clutchEggs.userId, userId));
  await db.delete(events).where(eq(events.userId, userId));
  await db.delete(broods).where(eq(broods.userId, userId));
  await db.delete(breedingPairs).where(eq(breedingPairs.userId, userId));
  await db.delete(birds).where(eq(birds.userId, userId));
  await db.delete(userSettings).where(eq(userSettings.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function setUserPlan(userId: number, plan: "free" | "pro") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalBirds: 0, activePairs: 0, eggsIncubating: 0, upcomingHatches: 0, upcomingEvents: 0 };

  const [allBirds, allPairs, allBroods, allEvents] = await Promise.all([
    db.select().from(birds).where(and(eq(birds.userId, userId), inArray(birds.status, ["alive", "breeding", "resting"]))),
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
  const nowCompleted = !existing[0].completed;
  await db.update(events).set({ completed: nowCompleted }).where(and(eq(events.id, id), eq(events.userId, userId)));

  // Auto-extend never-ending series: when an event is completed, create the next occurrence
  const ev = existing[0] as any;
  if (nowCompleted && ev.isIndefinite && ev.seriesId && ev.recurrenceUnit && ev.recurrenceInterval) {
    // Find the latest event in this series to calculate the next date from
    const seriesEvents = await db.select().from(events)
      .where(and(eq((events as any).seriesId, ev.seriesId), eq(events.userId, userId)))
      .orderBy(desc(events.eventDate));
    if (seriesEvents.length > 0) {
      const latest = seriesEvents[0] as any;
      const latestDate = new Date(String(latest.eventDate) + "T12:00:00");
      const nextDate = new Date(latestDate);
      const interval: number = ev.recurrenceInterval ?? 1;
      const unit: string = ev.recurrenceUnit;
      if (unit === "days")   nextDate.setDate(nextDate.getDate() + interval);
      else if (unit === "weeks")  nextDate.setDate(nextDate.getDate() + 7 * interval);
      else if (unit === "months") nextDate.setMonth(nextDate.getMonth() + interval);
      else if (unit === "years")  nextDate.setFullYear(nextDate.getFullYear() + interval);
      const nextDateStr = nextDate.toISOString().split("T")[0];
      await db.insert(events).values({
        userId: ev.userId,
        title: ev.title,
        notes: ev.notes,
        eventDate: nextDateStr,
        eventType: ev.eventType,
        birdId: ev.birdId,
        pairId: ev.pairId,
        allBirds: ev.allBirds ?? false,
        seriesId: ev.seriesId,
        recurrenceUnit: ev.recurrenceUnit,
        recurrenceInterval: ev.recurrenceInterval,
        isIndefinite: true,
        completed: false,
      } as any);
    }
  }

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
    .onConflictDoUpdate({ target: [clutchEggs.broodId, clutchEggs.eggNumber], set: { outcome, notes: notes ?? null } });
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

export async function upsertUserSettings(userId: number, data: { favouriteSpeciesIds?: number[]; defaultSpeciesId?: number | null; breedingYear?: number | null }) {
  const db = await getDb();
  if (!db) return;
  const favouriteSpeciesIds = data.favouriteSpeciesIds !== undefined
    ? JSON.stringify(data.favouriteSpeciesIds)
    : undefined;
  const values: Record<string, unknown> = { userId };
  const updateSet: Record<string, unknown> = {};
  if (favouriteSpeciesIds !== undefined) { values.favouriteSpeciesIds = favouriteSpeciesIds; updateSet.favouriteSpeciesIds = favouriteSpeciesIds; }
  if (data.defaultSpeciesId !== undefined) { values.defaultSpeciesId = data.defaultSpeciesId; updateSet.defaultSpeciesId = data.defaultSpeciesId; }
  if (data.breedingYear !== undefined) { values.breedingYear = data.breedingYear; updateSet.breedingYear = data.breedingYear; }
  await db.insert(userSettings).values(values as any).onConflictDoUpdate({ target: userSettings.userId, set: updateSet });
}
