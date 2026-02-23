import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

/**
 * Species seed data — includes all 4 new fields:
 *   fledglingDays         — days after hatch before chicks leave the nest
 *   sexualMaturityMonths  — months before the bird is ready to breed
 *   nestType              — "nest box" | "open cup" | "colony" | "ground" | "hollow log"
 *   sexingMethod          — "visual" | "DNA" | "surgical" | "behavioural"
 */
const speciesData = [
  // ── Canaries ──────────────────────────────────────────────────────────────
  { commonName: "Canary", scientificName: "Serinus canaria", category: "Canary",
    incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5,
    fledglingDays: 21, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "behavioural" },
  // ── Finches ───────────────────────────────────────────────────────────────
  { commonName: "Zebra Finch", scientificName: "Taeniopygia guttata", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 3, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Bengalese Finch (Society Finch)", scientificName: "Lonchura striata domestica", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 4, nestType: "nest box", sexingMethod: "behavioural" },
  { commonName: "Society Finch (Bengalese)", scientificName: "Lonchura striata domestica", category: "Finch",
    incubationDays: 16, clutchSizeMin: 4, clutchSizeMax: 7,
    fledglingDays: 21, sexualMaturityMonths: 4, nestType: "nest box", sexingMethod: "behavioural" },
  { commonName: "Gouldian Finch", scientificName: "Erythrura gouldiae", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 8,
    fledglingDays: 21, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Star Finch", scientificName: "Neochmia ruficauda", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Owl Finch", scientificName: "Taeniopygia bichenovii", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Owl Finch (Double Bar)", scientificName: "Taeniopygia bichenovii", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Diamond Firetail", scientificName: "Stagonopleura guttata", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 7,
    fledglingDays: 21, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Long-tailed Finch", scientificName: "Poephila acuticauda", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Plum-headed Finch", scientificName: "Neochmia modesta", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "European Goldfinch", scientificName: "Carduelis carduelis", category: "Finch",
    incubationDays: 13, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 14, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Siskin", scientificName: "Spinus spinus", category: "Finch",
    incubationDays: 13, clutchSizeMin: 3, clutchSizeMax: 5,
    fledglingDays: 15, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Greenfinch", scientificName: "Chloris chloris", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 16, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Bullfinch", scientificName: "Pyrrhula pyrrhula", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 5,
    fledglingDays: 16, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Java Sparrow", scientificName: "Lonchura oryzivora", category: "Finch",
    incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 8,
    fledglingDays: 28, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Cordon Bleu", scientificName: "Uraeginthus bengalus", category: "Finch",
    incubationDays: 12, clutchSizeMin: 3, clutchSizeMax: 6,
    fledglingDays: 21, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  // ── Parakeets ─────────────────────────────────────────────────────────────
  { commonName: "Budgerigar (Budgie)", scientificName: "Melopsittacus undulatus", category: "Parakeet",
    incubationDays: 18, clutchSizeMin: 4, clutchSizeMax: 8,
    fledglingDays: 35, sexualMaturityMonths: 6, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Indian Ringneck Parakeet", scientificName: "Psittacula krameri", category: "Parakeet",
    incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 6,
    fledglingDays: 49, sexualMaturityMonths: 18, nestType: "hollow log", sexingMethod: "visual" },
  { commonName: "Alexandrine Parakeet", scientificName: "Psittacula eupatria", category: "Parakeet",
    incubationDays: 24, clutchSizeMin: 2, clutchSizeMax: 4,
    fledglingDays: 56, sexualMaturityMonths: 24, nestType: "hollow log", sexingMethod: "visual" },
  // ── Cockatiels ────────────────────────────────────────────────────────────
  { commonName: "Cockatiel", scientificName: "Nymphicus hollandicus", category: "Cockatoo",
    incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 7,
    fledglingDays: 35, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "visual" },
  // ── Lovebirds ─────────────────────────────────────────────────────────────
  { commonName: "Lovebird (Peach-faced)", scientificName: "Agapornis roseicollis", category: "Lovebird",
    incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Lovebird (Fischer's)", scientificName: "Agapornis fischeri", category: "Lovebird",
    incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Lovebird (Masked)", scientificName: "Agapornis personatus", category: "Lovebird",
    incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 42, sexualMaturityMonths: 10, nestType: "nest box", sexingMethod: "DNA" },
  // ── Australian Parrots ────────────────────────────────────────────────────
  { commonName: "Turquoisine Parrot", scientificName: "Neophema pulchella", category: "Parrot",
    incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Scarlet-chested Parrot", scientificName: "Neophema splendida", category: "Parrot",
    incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Bourke's Parrot", scientificName: "Neopsephotus bourkii", category: "Parrot",
    incubationDays: 18, clutchSizeMin: 3, clutchSizeMax: 6,
    fledglingDays: 28, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Elegant Parrot", scientificName: "Neophema elegans", category: "Parrot",
    incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6,
    fledglingDays: 30, sexualMaturityMonths: 9, nestType: "nest box", sexingMethod: "visual" },
  { commonName: "Red-rumped Parrot", scientificName: "Psephotus haematonotus", category: "Parrot",
    incubationDays: 20, clutchSizeMin: 4, clutchSizeMax: 7,
    fledglingDays: 30, sexualMaturityMonths: 9, nestType: "hollow log", sexingMethod: "visual" },
  { commonName: "Eastern Rosella", scientificName: "Platycercus eximius", category: "Parrot",
    incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 9,
    fledglingDays: 35, sexualMaturityMonths: 15, nestType: "hollow log", sexingMethod: "DNA" },
  { commonName: "Crimson Rosella", scientificName: "Platycercus elegans", category: "Parrot",
    incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 8,
    fledglingDays: 35, sexualMaturityMonths: 15, nestType: "hollow log", sexingMethod: "DNA" },
  // ── Conures ───────────────────────────────────────────────────────────────
  { commonName: "Sun Conure", scientificName: "Aratinga solstitialis", category: "Parrot",
    incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 5,
    fledglingDays: 56, sexualMaturityMonths: 24, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Green-cheeked Conure", scientificName: "Pyrrhura molinae", category: "Parrot",
    incubationDays: 24, clutchSizeMin: 4, clutchSizeMax: 8,
    fledglingDays: 49, sexualMaturityMonths: 12, nestType: "nest box", sexingMethod: "DNA" },
  { commonName: "Caique (White-bellied)", scientificName: "Pionites leucogaster", category: "Parrot",
    incubationDays: 27, clutchSizeMin: 2, clutchSizeMax: 4,
    fledglingDays: 70, sexualMaturityMonths: 36, nestType: "nest box", sexingMethod: "DNA" },
  // ── Doves ─────────────────────────────────────────────────────────────────
  { commonName: "Diamond Dove", scientificName: "Geopelia cuneata", category: "Dove",
    incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2,
    fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Peaceful Dove", scientificName: "Geopelia striata", category: "Dove",
    incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2,
    fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Ringneck Dove", scientificName: "Streptopelia risoria", category: "Dove",
    incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2,
    fledglingDays: 14, sexualMaturityMonths: 6, nestType: "open cup", sexingMethod: "visual" },
  // ── Softbills ─────────────────────────────────────────────────────────────
  { commonName: "Pekin Robin", scientificName: "Leiothrix lutea", category: "Softbill",
    incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5,
    fledglingDays: 14, sexualMaturityMonths: 9, nestType: "open cup", sexingMethod: "visual" },
  { commonName: "Shama Thrush", scientificName: "Copsychus malabaricus", category: "Softbill",
    incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5,
    fledglingDays: 14, sexualMaturityMonths: 12, nestType: "open cup", sexingMethod: "visual" },
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Seeding species with enhanced data...");
  for (const sp of speciesData) {
    await connection.execute(
      `INSERT INTO species (commonName, scientificName, category, incubationDays, clutchSizeMin, clutchSizeMax, fledglingDays, sexualMaturityMonths, nestType, sexingMethod, isCustom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         incubationDays = VALUES(incubationDays),
         clutchSizeMin = VALUES(clutchSizeMin),
         clutchSizeMax = VALUES(clutchSizeMax),
         fledglingDays = VALUES(fledglingDays),
         sexualMaturityMonths = VALUES(sexualMaturityMonths),
         nestType = VALUES(nestType),
         sexingMethod = VALUES(sexingMethod)`,
      [sp.commonName, sp.scientificName, sp.category, sp.incubationDays,
       sp.clutchSizeMin, sp.clutchSizeMax, sp.fledglingDays ?? null, sp.sexualMaturityMonths ?? null,
       sp.nestType ?? null, sp.sexingMethod ?? null]
    );
  }
  console.log(`✓ Seeded/updated ${speciesData.length} species`);
  await connection.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
