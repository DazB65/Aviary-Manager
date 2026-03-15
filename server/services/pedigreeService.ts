import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../db";
import { birds } from "../../drizzle/schema";

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

export class PedigreeService {
    static async getPedigree(birdId: number, userId: number, maxGenerations = 4): Promise<Record<number, PedigreeBird>> {
        const db = getDb();
        if (!db) return {};

        // Fetch all birds for this user once, then walk the tree entirely in memory.
        // This replaces the previous approach that issued one full-table query per
        // generation (up to 4 round-trips, each discarding most rows).
        const allRows = await db
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

        const birdMap = new Map(allRows.map(r => [r.id, r]));

        const result: Record<number, PedigreeBird> = {};
        const toVisit = new Set<number>([birdId]);
        const visited = new Set<number>();

        for (let gen = 0; gen < maxGenerations && toVisit.size > 0; gen++) {
            const ids = Array.from(toVisit);
            toVisit.clear();

            for (const id of ids) {
                if (visited.has(id)) continue;
                const row = birdMap.get(id);
                if (!row) continue;
                result[id] = row;
                visited.add(id);
                if (row.fatherId && !visited.has(row.fatherId)) toVisit.add(row.fatherId);
                if (row.motherId && !visited.has(row.motherId)) toVisit.add(row.motherId);
            }
        }

        return result;
    }

    static async calcInbreedingCoefficient(maleId: number, femaleId: number, userId: number): Promise<number> {
        const db = getDb();
        if (!db) return 0;

        const allBirds = await db
            .select({ id: birds.id, fatherId: birds.fatherId, motherId: birds.motherId })
            .from(birds)
            .where(eq(birds.userId, userId));

        const birdMap = new Map(allBirds.map(b => [b.id, b]));

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

        let F = 0;
        for (const [ancestorId, malePaths] of Array.from(maleAncestors.entries())) {
            if (femaleAncestors.has(ancestorId)) {
                const femalePaths = femaleAncestors.get(ancestorId)!;
                for (const n1 of malePaths) {
                    for (const n2 of femalePaths) {
                        F += Math.pow(0.5, n1 + n2 + 1);
                    }
                }
            }
        }

        return Math.min(Math.round(F * 10000) / 10000, 1);
    }

    static async getDescendants(birdId: number, userId: number): Promise<PedigreeBird[]> {
        const db = getDb();
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

    static async getSiblings(birdId: number, userId: number) {
        const db = getDb();
        if (!db) return [];

        const [target] = await db.select().from(birds).where(and(eq(birds.id, birdId), eq(birds.userId, userId))).limit(1);
        if (!target) return [];

        const { fatherId, motherId } = target;
        if (!fatherId && !motherId) return [];

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
}
