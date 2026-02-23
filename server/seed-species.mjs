import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const speciesData = [
  // Finches
  { commonName: "Canary", scientificName: "Serinus canaria", category: "Finch", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 6 },
  { commonName: "Zebra Finch", scientificName: "Taeniopygia guttata", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Gouldian Finch", scientificName: "Erythrura gouldiae", category: "Finch", incubationDays: 15, clutchSizeMin: 4, clutchSizeMax: 8 },
  { commonName: "Society Finch (Bengalese)", scientificName: "Lonchura striata domestica", category: "Finch", incubationDays: 16, clutchSizeMin: 4, clutchSizeMax: 7 },
  { commonName: "Star Finch", scientificName: "Neochmia ruficauda", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Owl Finch", scientificName: "Taeniopygia bichenovii", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Diamond Firetail", scientificName: "Stagonopleura guttata", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 7 },
  { commonName: "Plum-headed Finch", scientificName: "Neochmia modesta", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "European Goldfinch", scientificName: "Carduelis carduelis", category: "Finch", incubationDays: 13, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Siskin", scientificName: "Spinus spinus", category: "Finch", incubationDays: 13, clutchSizeMin: 3, clutchSizeMax: 5 },
  { commonName: "Greenfinch", scientificName: "Chloris chloris", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Bullfinch", scientificName: "Pyrrhula pyrrhula", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 5 },
  { commonName: "Java Sparrow", scientificName: "Lonchura oryzivora", category: "Finch", incubationDays: 14, clutchSizeMin: 4, clutchSizeMax: 8 },
  { commonName: "Cordon Bleu", scientificName: "Uraeginthus bengalus", category: "Finch", incubationDays: 12, clutchSizeMin: 3, clutchSizeMax: 6 },
  // Parakeets / Small Parrots
  { commonName: "Budgerigar (Budgie)", scientificName: "Melopsittacus undulatus", category: "Parakeet", incubationDays: 18, clutchSizeMin: 4, clutchSizeMax: 8 },
  { commonName: "Cockatiel", scientificName: "Nymphicus hollandicus", category: "Cockatoo", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 7 },
  { commonName: "Lovebird (Peach-faced)", scientificName: "Agapornis roseicollis", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Lovebird (Fischer's)", scientificName: "Agapornis fischeri", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Lovebird (Masked)", scientificName: "Agapornis personatus", category: "Lovebird", incubationDays: 23, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Indian Ringneck Parakeet", scientificName: "Psittacula krameri", category: "Parakeet", incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 6 },
  { commonName: "Alexandrine Parakeet", scientificName: "Psittacula eupatria", category: "Parakeet", incubationDays: 24, clutchSizeMin: 2, clutchSizeMax: 4 },
  { commonName: "Turquoisine Parrot", scientificName: "Neophema pulchella", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Scarlet-chested Parrot", scientificName: "Neophema splendida", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Bourke's Parrot", scientificName: "Neopsephotus bourkii", category: "Parrot", incubationDays: 18, clutchSizeMin: 3, clutchSizeMax: 6 },
  { commonName: "Elegant Parrot", scientificName: "Neophema elegans", category: "Parrot", incubationDays: 19, clutchSizeMin: 4, clutchSizeMax: 6 },
  { commonName: "Red-rumped Parrot", scientificName: "Psephotus haematonotus", category: "Parrot", incubationDays: 20, clutchSizeMin: 4, clutchSizeMax: 7 },
  { commonName: "Eastern Rosella", scientificName: "Platycercus eximius", category: "Parrot", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 9 },
  { commonName: "Crimson Rosella", scientificName: "Platycercus elegans", category: "Parrot", incubationDays: 21, clutchSizeMin: 4, clutchSizeMax: 8 },
  { commonName: "Sun Conure", scientificName: "Aratinga solstitialis", category: "Parrot", incubationDays: 23, clutchSizeMin: 3, clutchSizeMax: 5 },
  { commonName: "Green-cheeked Conure", scientificName: "Pyrrhura molinae", category: "Parrot", incubationDays: 24, clutchSizeMin: 4, clutchSizeMax: 8 },
  { commonName: "Caique (White-bellied)", scientificName: "Pionites leucogaster", category: "Parrot", incubationDays: 27, clutchSizeMin: 2, clutchSizeMax: 4 },
  // Doves & Pigeons
  { commonName: "Diamond Dove", scientificName: "Geopelia cuneata", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2 },
  { commonName: "Peaceful Dove", scientificName: "Geopelia striata", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2 },
  { commonName: "Ringneck Dove", scientificName: "Streptopelia risoria", category: "Dove", incubationDays: 14, clutchSizeMin: 2, clutchSizeMax: 2 },
  // Softbills
  { commonName: "Pekin Robin", scientificName: "Leiothrix lutea", category: "Softbill", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5 },
  { commonName: "Shama Thrush", scientificName: "Copsychus malabaricus", category: "Softbill", incubationDays: 14, clutchSizeMin: 3, clutchSizeMax: 5 },
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding species...");
  for (const sp of speciesData) {
    await connection.execute(
      `INSERT IGNORE INTO species (commonName, scientificName, category, incubationDays, clutchSizeMin, clutchSizeMax, isCustom)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE incubationDays = VALUES(incubationDays)`,
      [sp.commonName, sp.scientificName, sp.category, sp.incubationDays, sp.clutchSizeMin, sp.clutchSizeMax]
    );
  }
  console.log(`Seeded ${speciesData.length} species.`);
  await connection.end();
}

seed().catch(console.error);
