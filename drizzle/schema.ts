import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Species table — pre-populated with common aviary birds
export const species = mysqlTable("species", {
  id: int("id").autoincrement().primaryKey(),
  commonName: varchar("commonName", { length: 128 }).notNull(),
  scientificName: varchar("scientificName", { length: 128 }),
  category: varchar("category", { length: 64 }), // e.g. Finch, Parrot, Softbill
  incubationDays: int("incubationDays").notNull().default(14),
  clutchSizeMin: int("clutchSizeMin"),
  clutchSizeMax: int("clutchSizeMax"),
  fledglingDays: int("fledglingDays"),          // days after hatch before chicks leave nest
  sexualMaturityMonths: int("sexualMaturityMonths"), // months before bird is ready to breed
  nestType: varchar("nestType", { length: 64 }),  // e.g. "nest box", "open cup", "colony", "ground"
  sexingMethod: varchar("sexingMethod", { length: 64 }), // e.g. "visual", "DNA", "surgical", "behavioural"
  isCustom: boolean("isCustom").default(false),
  userId: int("userId"), // null = system species, set = user-added
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Species = typeof species.$inferSelect;
export type InsertSpecies = typeof species.$inferInsert;

// Birds table
export const birds = mysqlTable("birds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  speciesId: int("speciesId").notNull(),
  ringId: varchar("ringId", { length: 64 }),
  name: varchar("name", { length: 128 }),
  gender: mysqlEnum("gender", ["male", "female", "unknown"]).default("unknown").notNull(),
  dateOfBirth: date("dateOfBirth"),
  cageNumber: varchar("cageNumber", { length: 64 }),
  colorMutation: varchar("colorMutation", { length: 128 }),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  fatherId: int("fatherId"), // self-referential for pedigree
  motherId: int("motherId"), // self-referential for pedigree
  status: mysqlEnum("status", ["alive", "deceased", "sold", "unknown"]).default("alive").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bird = typeof birds.$inferSelect;
export type InsertBird = typeof birds.$inferInsert;

// Breeding pairs table
export const breedingPairs = mysqlTable("breedingPairs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  maleId: int("maleId").notNull(),
  femaleId: int("femaleId").notNull(),
  pairingDate: date("pairingDate"),
  status: mysqlEnum("status", ["active", "resting", "retired"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BreedingPair = typeof breedingPairs.$inferSelect;
export type InsertBreedingPair = typeof breedingPairs.$inferInsert;

// Broods table — one brood per clutch/nest attempt
export const broods = mysqlTable("broods", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pairId: int("pairId").notNull(),
  season: varchar("season", { length: 16 }), // e.g. "2025"
  eggsLaid: int("eggsLaid").default(0),
  layDate: date("layDate"),
  fertilityCheckDate: date("fertilityCheckDate"), // auto: layDate + 7
  expectedHatchDate: date("expectedHatchDate"),   // auto: layDate + incubationDays
  actualHatchDate: date("actualHatchDate"),
  chicksSurvived: int("chicksSurvived").default(0),
  status: mysqlEnum("status", ["incubating", "hatched", "failed", "abandoned"]).default("incubating").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brood = typeof broods.$inferSelect;
export type InsertBrood = typeof broods.$inferInsert;

// Events / reminders table
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  notes: text("notes"),
  eventDate: date("eventDate").notNull(),
  eventType: mysqlEnum("eventType", ["vet", "banding", "medication", "weaning", "sale", "other"]).default("other").notNull(),
  birdId: int("birdId"),   // optional — link to a specific bird
  pairId: int("pairId"),   // optional — link to a specific pair
  completed: boolean("completed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// Clutch eggs table — individual egg outcomes per brood
export const clutchEggs = mysqlTable("clutchEggs", {
  id: int("id").autoincrement().primaryKey(),
  broodId: int("broodId").notNull(),
  userId: int("userId").notNull(),
  eggNumber: int("eggNumber").notNull(), // 1-based egg position in the clutch
  outcome: mysqlEnum("outcome", ["unknown", "fertile", "infertile", "cracked", "hatched", "died"]).default("unknown").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClutchEgg = typeof clutchEggs.$inferSelect;
export type InsertClutchEgg = typeof clutchEggs.$inferInsert;

// User settings table — stores per-user preferences
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  favouriteSpeciesIds: text("favouriteSpeciesIds"), // JSON array of species IDs
  defaultSpeciesId: int("defaultSpeciesId"),        // single default species for quick-add
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
