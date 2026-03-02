import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const planEnum        = pgEnum("plan",        ["free", "pro"]);
export const roleEnum        = pgEnum("role",        ["user", "admin"]);
export const genderEnum      = pgEnum("gender",      ["male", "female", "unknown"]);
export const birdStatusEnum  = pgEnum("bird_status", ["alive", "breeding", "resting", "deceased", "sold", "unknown"]);
export const pairStatusEnum  = pgEnum("pair_status", ["active", "resting", "retired"]);
export const broodStatusEnum = pgEnum("brood_status",["incubating", "hatched", "failed", "abandoned"]);
export const eventTypeEnum   = pgEnum("event_type",  ["vet", "banding", "medication", "weaning", "sale", "supplements", "other"]);
export const eggOutcomeEnum  = pgEnum("egg_outcome", ["unknown", "fertile", "infertile", "cracked", "hatched", "died"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),          // legacy OAuth (kept for existing users)
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  verifyToken: varchar("verifyToken", { length: 128 }),
  verifyTokenExpiry: timestamp("verifyTokenExpiry"),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  passwordChangedAt: timestamp("passwordChangedAt"),
  // Subscription / plan
  plan: planEnum("plan").default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  planExpiresAt: timestamp("planExpiresAt"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Species table — pre-populated with common aviary birds
export const species = pgTable("species", {
  id: serial("id").primaryKey(),
  commonName: varchar("commonName", { length: 128 }).notNull(),
  scientificName: varchar("scientificName", { length: 128 }),
  category: varchar("category", { length: 64 }), // e.g. Finch, Parrot, Softbill
  incubationDays: integer("incubationDays").notNull().default(14),
  clutchSizeMin: integer("clutchSizeMin"),
  clutchSizeMax: integer("clutchSizeMax"),
  fledglingDays: integer("fledglingDays"),          // days after hatch before chicks leave nest
  sexualMaturityMonths: integer("sexualMaturityMonths"), // months before bird is ready to breed
  nestType: varchar("nestType", { length: 64 }),  // e.g. "nest box", "open cup", "colony", "ground"
  sexingMethod: varchar("sexingMethod", { length: 64 }), // e.g. "visual", "DNA", "surgical", "behavioural"
  isCustom: boolean("isCustom").default(false),
  userId: integer("userId"), // null = system species, set = user-added
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Species = typeof species.$inferSelect;
export type InsertSpecies = typeof species.$inferInsert;

// Birds table
export const birds = pgTable("birds", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  speciesId: integer("speciesId").notNull(),
  ringId: varchar("ringId", { length: 64 }),
  name: varchar("name", { length: 128 }),
  gender: genderEnum("gender").default("unknown").notNull(),
  dateOfBirth: date("dateOfBirth"),
  fledgedDate: date("fledgedDate"),
  cageNumber: varchar("cageNumber", { length: 64 }),
  colorMutation: varchar("colorMutation", { length: 128 }),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  fatherId: integer("fatherId"), // self-referential for pedigree
  motherId: integer("motherId"), // self-referential for pedigree
  status: birdStatusEnum("status").default("alive").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Bird = typeof birds.$inferSelect;
export type InsertBird = typeof birds.$inferInsert;

// Breeding pairs table
export const breedingPairs = pgTable("breedingPairs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  maleId: integer("maleId").notNull(),
  femaleId: integer("femaleId").notNull(),
  season: integer("season"),                           // breeding year/season e.g. 2025
  pairingDate: date("pairingDate"),
  status: pairStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Same pair can be created in different years; prevent duplicates within the same year
  pairSeasonUnique: uniqueIndex("breedingPairs_userId_male_female_season_unique").on(table.userId, table.maleId, table.femaleId, table.season),
}));

export type BreedingPair = typeof breedingPairs.$inferSelect;
export type InsertBreedingPair = typeof breedingPairs.$inferInsert;

// Broods table — one brood per clutch/nest attempt
export const broods = pgTable("broods", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  pairId: integer("pairId").notNull(),
  season: varchar("season", { length: 16 }), // e.g. "2025"
  eggsLaid: integer("eggsLaid").default(0),
  layDate: date("layDate"),
  fertilityCheckDate: date("fertilityCheckDate"), // auto: layDate + 7
  expectedHatchDate: date("expectedHatchDate"),   // auto: layDate + incubationDays
  actualHatchDate: date("actualHatchDate"),
  chicksSurvived: integer("chicksSurvived").default(0),
  status: broodStatusEnum("status").default("incubating").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Brood = typeof broods.$inferSelect;
export type InsertBrood = typeof broods.$inferInsert;

// Events / reminders table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  notes: text("notes"),
  eventDate: date("eventDate").notNull(),
  eventType: eventTypeEnum("eventType").default("other").notNull(),
  birdId: integer("birdId"),   // optional — link to a specific bird
  pairId: integer("pairId"),   // optional — link to a specific pair
  allBirds: boolean("allBirds").default(false),  // true = applies to all birds in the aviary
  seriesId: varchar("seriesId", { length: 64 }),  // groups recurring events; only earliest incomplete is shown
  recurrenceUnit: varchar("recurrenceUnit", { length: 16 }),   // "days"|"weeks"|"months"|"years"
  recurrenceInterval: integer("recurrenceInterval"),            // e.g. 3 for "every 3 months"
  isIndefinite: boolean("isIndefinite").default(false),         // never-ending series — auto-extends on complete
  completed: boolean("completed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// Clutch eggs table — individual egg outcomes per brood
export const clutchEggs = pgTable("clutchEggs", {
  id: serial("id").primaryKey(),
  broodId: integer("broodId").notNull(),
  userId: integer("userId").notNull(),
  eggNumber: integer("eggNumber").notNull(), // 1-based egg position in the clutch
  outcome: eggOutcomeEnum("outcome").default("unknown").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  broodEggUnique: uniqueIndex("clutchEggs_broodId_eggNumber_unique").on(table.broodId, table.eggNumber),
}));

export type ClutchEgg = typeof clutchEggs.$inferSelect;
export type InsertClutchEgg = typeof clutchEggs.$inferInsert;

// User settings table — stores per-user preferences
export const userSettings = pgTable("userSettings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  favouriteSpeciesIds: text("favouriteSpeciesIds"), // JSON array of species IDs
  defaultSpeciesId: integer("defaultSpeciesId"),        // single default species for quick-add
  breedingYear: integer("breedingYear"),                // global flock breeding season year
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
