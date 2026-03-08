import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useBroods() {
    const utils = trpc.useUtils();

    const { data: broods = [], isLoading: broodsLoading } = trpc.broods.list.useQuery();
    const { data: allEggs = [], isLoading: eggsLoading } = trpc.clutchEggs.list.useQuery();
    const { data: pairs = [], isLoading: pairsLoading } = trpc.pairs.list.useQuery();
    const { data: birds = [], isLoading: birdsLoading } = trpc.birds.list.useQuery();
    const { data: speciesList = [], isLoading: speciesLoading } = trpc.species.list.useQuery();

    const createBrood = trpc.broods.create.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood logged!");
        },
        onError: (e) => toast.error(e.message),
    });

    const updateBrood = trpc.broods.update.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood updated!");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteBrood = trpc.broods.delete.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood removed.");
        },
        onError: (e) => toast.error(e.message),
    });

    const syncEggs = trpc.clutchEggs.sync.useMutation();

    const speciesMap = useMemo(() => Object.fromEntries(speciesList.map((s) => [s.id, s])), [speciesList]);
    const birdMap = useMemo(() => Object.fromEntries(birds.map((b) => [b.id, b])), [birds]);

    function pairLabel(pair: typeof pairs[0] | undefined) {
        if (!pair) return "Unknown";
        const male = birdMap[pair.maleId];
        const female = birdMap[pair.femaleId];
        const mLabel = male ? male.name || male.ringId || `#${male.id}` : "?";
        const fLabel = female ? female.name || female.ringId || `#${female.id}` : "?";
        return `${mLabel} × ${fLabel}`;
    }

    return {
        broods,
        allEggs,
        pairs,
        birds,
        speciesMap,
        birdMap,
        pairLabel,
        isLoading: broodsLoading || pairsLoading || birdsLoading || speciesLoading || eggsLoading,
        createBrood,
        updateBrood,
        deleteBrood,
        syncEggs,
    };
}
