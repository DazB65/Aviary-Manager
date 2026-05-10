import { useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useBroods() {
    const utils = trpc.useUtils();
    const backfillRan = useRef(false);
    const backfillEvents = trpc.broods.backfillEvents.useMutation({
        onSuccess: () => utils.events.list.invalidate(),
    });

    const { data: broods = [], isLoading: broodsLoading } = trpc.broods.list.useQuery();

    // Backfill events for existing broods created before auto-event syncing was added
    useEffect(() => {
        if (!broodsLoading && !backfillRan.current) {
            backfillRan.current = true;
            backfillEvents.mutate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [broodsLoading]);
    const { data: pairs = [], isLoading: pairsLoading } = trpc.pairs.list.useQuery();
    const { data: birds = [], isLoading: birdsLoading } = trpc.birds.list.useQuery();
    const { data: speciesList = [], isLoading: speciesLoading } = trpc.species.list.useQuery();

    const createBrood = trpc.broods.create.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood logged!");
        },
        onError: (e) => toast.error(e.message),
    });

    const updateBrood = trpc.broods.update.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood updated!");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteBrood = trpc.broods.delete.useMutation({
        onSuccess: () => {
            utils.broods.list.invalidate();
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Brood removed.");
        },
        onError: (e) => toast.error(e.message),
    });

    const syncEggs = trpc.clutchEggs.sync.useMutation();

    const convertToBird = trpc.clutchEggs.convertToBird.useMutation({
        onSuccess: (newBirdId) => {
            utils.birds.list.invalidate();
            toast.success("Egg successfully converted to a Bird!", {
                action: {
                    label: "View Profile",
                    onClick: () => window.location.href = `/birds/${newBirdId}`
                }
            });
        },
        onError: (e) => toast.error(e.message),
    });

    const speciesMap = useMemo(() => Object.fromEntries(speciesList.map((s) => [s.id, s])), [speciesList]);
    const birdMap = useMemo(() => Object.fromEntries(birds.map((b) => [b.id, b])), [birds]);

    function pairLabel(pair: typeof pairs[0] | undefined) {
        if (!pair) return "Unknown";
        const male = birdMap[pair.maleId];
        const female = birdMap[pair.femaleId];
        const mName = male ? male.name || male.ringId || `#${male.id}` : "?";
        const fName = female ? female.name || female.ringId || `#${female.id}` : "?";
        const mLabel = male?.cageNumber ? `${mName} (Cage ${male.cageNumber})` : mName;
        const fLabel = female?.cageNumber ? `${fName} (Cage ${female.cageNumber})` : fName;
        return `${mLabel} × ${fLabel}`;
    }

    return {
        broods,
        pairs,
        birds,
        speciesMap,
        birdMap,
        pairLabel,
        isLoading: broodsLoading || pairsLoading || birdsLoading || speciesLoading,
        createBrood,
        updateBrood,
        deleteBrood,
        syncEggs,
        convertToBird,
    };
}
