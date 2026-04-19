import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function usePairs(editingId?: number | null) {
    const utils = trpc.useUtils();

    const { data: pairs = [], isLoading: pairsLoading } = trpc.pairs.list.useQuery();
    const { data: birds = [], isLoading: birdsLoading } = trpc.birds.list.useQuery();
    const { data: speciesList = [], isLoading: speciesLoading } = trpc.species.list.useQuery();
    const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();

    const createPair = trpc.pairs.create.useMutation({
        onSuccess: () => {
            utils.pairs.list.invalidate();
            utils.dashboard.stats.invalidate();
            utils.birds.list.invalidate();
            toast.success("Pair created!");
        },
        onError: (e) => toast.error(e.message),
    });

    const updatePair = trpc.pairs.update.useMutation({
        onSuccess: () => {
            utils.pairs.list.invalidate();
            utils.dashboard.stats.invalidate();
            utils.birds.list.invalidate();
            toast.success("Pair updated!");
        },
        onError: (e) => toast.error(e.message),
    });

    const deletePair = trpc.pairs.delete.useMutation({
        onSuccess: () => {
            utils.pairs.list.invalidate();
            utils.dashboard.stats.invalidate();
            utils.birds.list.invalidate();
            toast.success("Pair removed.");
        },
        onError: (e) => toast.error(e.message),
    });

    const speciesMap = useMemo(() => Object.fromEntries(speciesList.map(s => [s.id, s])), [speciesList]);
    const birdMap = useMemo(() => Object.fromEntries(birds.map(b => [b.id, b])), [birds]);

    const livingStatuses = ["alive", "breeding", "resting"] as const;

    const pairedBirdIds = useMemo(() => {
        const ids = new Set<number>();
        for (const p of pairs) {
            if (p.status !== "retired" && p.id !== editingId) {
                ids.add(p.maleId);
                ids.add(p.femaleId);
            }
        }
        return ids;
    }, [pairs, editingId]);

    const maleBirds = useMemo(() => birds.filter(b =>
        b.gender === "male" &&
        (livingStatuses as readonly string[]).includes(b.status) &&
        !pairedBirdIds.has(b.id)
    ), [birds, pairedBirdIds]);

    const femaleBirds = useMemo(() => birds.filter(b =>
        b.gender === "female" &&
        (livingStatuses as readonly string[]).includes(b.status) &&
        !pairedBirdIds.has(b.id)
    ), [birds, pairedBirdIds]);

    const pairsByYear = useMemo(() => {
        const grouped: Record<string, typeof pairs> = {};
        for (const pair of pairs) {
            const key = pair.season ? String(pair.season) : "No year";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(pair);
        }

        for (const key in grouped) {
            grouped[key].sort((a, b) => {
                const maleA = birdMap[a.maleId];
                const femaleA = birdMap[a.femaleId];
                const cageA = maleA?.cageNumber || femaleA?.cageNumber || "";

                const maleB = birdMap[b.maleId];
                const femaleB = birdMap[b.femaleId];
                const cageB = maleB?.cageNumber || femaleB?.cageNumber || "";

                return cageA.localeCompare(cageB, undefined, { numeric: true });
            });
        }

        return Object.entries(grouped).sort(([a], [b]) => {
            if (a === "No year") return 1;
            if (b === "No year") return -1;
            return Number(b) - Number(a);
        });
    }, [pairs, birdMap]);

    return {
        pairs,
        pairsByYear,
        birds,
        maleBirds,
        femaleBirds,
        birdMap,
        speciesMap,
        settings,
        isLoading: pairsLoading || birdsLoading || speciesLoading || settingsLoading,
        createPair,
        updatePair,
        deletePair,
    };
}
