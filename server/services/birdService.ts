import { eq, and, asc, or, ilike, count, ne, inArray, desc, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import {
    birds,
    breedingPairs,
    broods,
    events,
    clutchEggs,
    type InsertBird,
} from "../../drizzle/schema";

export class BirdService {
    static async getBirdsByUser(userId: number) {
        return getDb().select().from(birds).where(eq(birds.userId, userId)).orderBy(asc(birds.name));
    }

    static async countBirds(userId: number): Promise<number> {
        const [row] = await getDb()
            .select({ n: count() })
            .from(birds)
            .where(eq(birds.userId, userId));
        return Number(row?.n ?? 0);
    }

    static async getBirdById(id: number, userId: number) {
        const results = await getDb()
            .select()
            .from(birds)
            .where(and(eq(birds.id, id), eq(birds.userId, userId)))
            .limit(1);
        return results[0] ?? undefined;
    }

    static async searchBirds(userId: number, q: string) {
        return getDb()
            .select()
            .from(birds)
            .where(and(eq(birds.userId, userId), or(ilike(birds.name, `%${q}%`), ilike(birds.ringId, `%${q}%`))))
            .limit(10);
    }

    static async createBird(data: InsertBird & { fromBroodId?: number, fromEggNumber?: number }) {
        const { fromBroodId, fromEggNumber, ...insertData } = data;
        return await getDb().transaction(async (tx) => {
            const [result] = await tx.insert(birds).values(insertData).returning();
            if (fromBroodId && fromEggNumber && insertData.userId) {
                await tx.update(clutchEggs)
                    .set({ birdId: result.id, updatedAt: new Date() })
                    .where(
                        and(
                            eq(clutchEggs.broodId, fromBroodId),
                            eq(clutchEggs.eggNumber, fromEggNumber),
                            eq(clutchEggs.userId, insertData.userId)
                        )
                    );
            }
            return result;
        });
    }

    static async updateBird(id: number, userId: number, data: Partial<InsertBird>) {
        const [result] = await getDb()
            .update(birds)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(birds.id, id), eq(birds.userId, userId)))
            .returning();
        return result;
    }

    static async deleteBird(id: number, userId: number) {
        await getDb().transaction(async (tx) => {
            // Nullify this bird as a parent from any offspring
            await tx.update(birds).set({ fatherId: null }).where(and(eq(birds.fatherId, id), eq(birds.userId, userId)));
            await tx.update(birds).set({ motherId: null }).where(and(eq(birds.motherId, id), eq(birds.userId, userId)));

            // Delete events tied directly to this bird
            await tx.delete(events).where(and(eq(events.birdId, id), eq(events.userId, userId)));

            // Find any breeding pairs involving this bird
            const associatedPairs = await tx
                .select({ id: breedingPairs.id })
                .from(breedingPairs)
                .where(and(or(eq(breedingPairs.maleId, id), eq(breedingPairs.femaleId, id)), eq(breedingPairs.userId, userId)));

            if (associatedPairs.length > 0) {
                const pairIds = associatedPairs.map((p) => p.id);

                // Delete events tied to these pairs
                await tx.delete(events).where(and(inArray(events.pairId, pairIds), eq(events.userId, userId)));

                // Find broods tied to these pairs
                const associatedBroods = await tx
                    .select({ id: broods.id })
                    .from(broods)
                    .where(and(inArray(broods.pairId, pairIds), eq(broods.userId, userId)));

                if (associatedBroods.length > 0) {
                    const broodIds = associatedBroods.map((b) => b.id);
                    // Delete eggs for these broods
                    await tx.delete(clutchEggs).where(and(inArray(clutchEggs.broodId, broodIds), eq(clutchEggs.userId, userId)));
                    // Delete the broods themselves
                    await tx.delete(broods).where(and(inArray(broods.id, broodIds), eq(broods.userId, userId)));
                }

                // Delete the pairs themselves
                await tx.delete(breedingPairs).where(and(inArray(breedingPairs.id, pairIds), eq(breedingPairs.userId, userId)));
            }

            // Unlink from any eggs
            await tx.update(clutchEggs).set({ birdId: null }).where(and(eq(clutchEggs.birdId, id), eq(clutchEggs.userId, userId)));

            // Finally, delete the bird
            await tx.delete(birds).where(and(eq(birds.id, id), eq(birds.userId, userId)));
        });
    }

    /**
     * Backfill: parse colorMutation text into genotype JSON for birds missing genotype data.
     * Runs once on startup — only updates birds that have colorMutation but no genotype.
     */
    static async backfillGenotypes() {
        const db = getDb();
        const birdsToFix = await db.select({ id: birds.id, colorMutation: birds.colorMutation })
            .from(birds)
            .where(and(isNotNull(birds.colorMutation), isNull(birds.genotype)));

        if (birdsToFix.length === 0) return;

        let updated = 0;
        for (const bird of birdsToFix) {
            const genotype = parseColorMutationToGenotype(bird.colorMutation!);
            if (Object.keys(genotype).length > 0) {
                await db.update(birds).set({ genotype: JSON.stringify(genotype) }).where(eq(birds.id, bird.id));
                updated++;
            }
        }
        if (updated > 0) console.log(`[backfill] Populated genotype for ${updated} birds from colorMutation text`);
    }

    static async getBirdsPaginated(
        userId: number,
        page: number,
        limit: number,
        status?: string,
        gender?: string,
        speciesId?: number
    ) {
        const offset = (page - 1) * limit;

        const conditions = [eq(birds.userId, userId)];
        if (status) conditions.push(eq(birds.status, status as any));
        if (gender) conditions.push(eq(birds.gender, gender as any));
        if (speciesId) conditions.push(eq(birds.speciesId, speciesId));

        const baseQuery = getDb().select().from(birds).where(and(...conditions));

        const totalResult = await getDb()
            .select({ count: count() })
            .from(birds)
            .where(and(...conditions));
        const totalCount = Number(totalResult[0]?.count || 0);

        const data = await baseQuery.orderBy(desc(birds.createdAt)).limit(limit).offset(offset);

        return {
            data,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
        };
    }
}

// ── colorMutation → genotype parser ──────────────────────────────────────────

const EXPRESSING = "EXPRESSING";
const CARRIER = "CARRIER";
const WILD_TYPE = "WILD_TYPE";

const HEAD_COLOURS: Record<string, string> = {
    "black head": "black-head",
    "yellow head": "yellow-head",
    // "red head" is the default — set others to WILD_TYPE
};

const BODY_COLOURS: Record<string, string> = {
    "blue": "blue-body",
    "pastel": "pastel-body",
    "dilute": "dilute-body",
    "australian yellow": "australian-yellow-body",
    "avb": "avb-body",
    // "green" is the default
};

const BREAST_COLOURS: Record<string, string> = {
    "white": "white-breast",
    "lilac": "lilac-breast",
    // "purple" is the default
};

/**
 * Format is always: "Head / Body / Breast" — positional parsing.
 * Examples:
 *   "Black Head / Green (split to Blue) / White"
 *   "Black Head / Australian Yellow / White"
 *   "Black Head / Green (Double Split) / Purple"
 *   "Red Head / AVB / Lilac"
 */
function parseColorMutationToGenotype(colorMutation: string): Record<string, string> {
    const g: Record<string, string> = {};
    const parts = colorMutation.split("/").map(s => s.trim());

    // Trait definitions: [colourMap, allMutationIds] in order: head, body, breast
    const traits: [Record<string, string>, string[]][] = [
        [HEAD_COLOURS, ["black-head", "yellow-head"]],
        [BODY_COLOURS, ["blue-body", "pastel-body", "dilute-body", "australian-yellow-body", "avb-body"]],
        [BREAST_COLOURS, ["white-breast", "lilac-breast"]],
    ];

    for (let i = 0; i < Math.min(parts.length, traits.length); i++) {
        const lower = parts[i].toLowerCase();
        const [colourMap, allIds] = traits[i];

        // Set all mutations in this category to WILD_TYPE first
        for (const id of allIds) g[id] = WILD_TYPE;

        // Parse the main colour (text before any parentheses or "split to")
        const mainMatch = lower.replace(/\(.*?\)/g, "").replace(/split to.*/, "").trim();

        // Find which mutation is expressing
        for (const [name, id] of Object.entries(colourMap)) {
            if (mainMatch.includes(name)) {
                g[id] = EXPRESSING;
                break;
            }
        }

        // Parse split info
        if (lower.includes("double split")) {
            g["blue-body"] = CARRIER;
            g["australian-yellow-body"] = CARRIER;
        } else {
            // Check for "split to X" patterns (with or without parens)
            const splitMatch = lower.match(/split\s+to\s+(.+?)(?:\)|$)/);
            if (splitMatch) {
                const splitText = splitMatch[1].trim();
                // Check body colours for splits (most common)
                for (const [name, id] of Object.entries(BODY_COLOURS)) {
                    if (splitText.includes(name)) g[id] = CARRIER;
                }
                // Check breast colours for splits
                for (const [name, id] of Object.entries(BREAST_COLOURS)) {
                    if (splitText.includes(name)) g[id] = CARRIER;
                }
            }
        }
    }

    return g;
}
