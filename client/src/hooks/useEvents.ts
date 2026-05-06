import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";

export function formatDateLabel(val: Date | string | null | undefined): string {
    if (!val) return "—";
    const d = val instanceof Date ? val : parseISO(String(val));
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "dd MMM yyyy");
}

export function useEvents() {
    const utils = trpc.useUtils();

    const { data: events = [], isLoading: eventsLoading } = trpc.events.list.useQuery();
    const { data: birds = [], isLoading: birdsLoading } = trpc.birds.list.useQuery();
    const { data: pairs = [], isLoading: pairsLoading } = trpc.pairs.list.useQuery();

    const createEvent = trpc.events.create.useMutation({
        onError: (e) => toast.error(e.message),
    });

    const updateEvent = trpc.events.update.useMutation({
        onSuccess: () => {
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Event updated!");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteEvent = trpc.events.delete.useMutation({
        onSuccess: () => {
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("Event removed.");
        },
        onError: (e) => toast.error(e.message),
    });

    const toggleComplete = trpc.events.toggleComplete.useMutation({
        onSuccess: () => {
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteAllEvents = trpc.events.deleteAll.useMutation({
        onSuccess: () => {
            utils.events.list.invalidate();
            utils.dashboard.stats.invalidate();
            toast.success("All events cleared.");
        },
        onError: (e) => toast.error(e.message),
    });

    const birdMap = useMemo(() => Object.fromEntries(birds.map((b) => [b.id, b])), [birds]);

    function pairLabel(pair: typeof pairs[0] | undefined) {
        if (!pair) return "Unknown";
        const male = birdMap[pair.maleId];
        const female = birdMap[pair.femaleId];
        const mLabel = male ? male.name || male.ringId || `#${male.id}` : "?";
        const fLabel = female ? female.name || female.ringId || `#${female.id}` : "?";
        return `${mLabel} × ${fLabel}`;
    }

    // The main Events page is an action list: completed items remain in bird history.
    const filtered = useMemo(() => {
        return events.filter((e) => !e.completed);
    }, [events]);

    // Hide future recurrences until the current occurrence is completed.
    const displayEvents = useMemo(() => {
        const earliestBySeries = new Map<string, typeof events[0]>();
        const nonSeries: typeof events[0][] = [];

        for (const ev of filtered) {
            const sid = (ev as any).seriesId as string | null | undefined;
            if (!sid) {
                nonSeries.push(ev);
            } else {
                const existing = earliestBySeries.get(sid);
                if (!existing || new Date(String(ev.eventDate)) < new Date(String(existing.eventDate))) {
                    earliestBySeries.set(sid, ev);
                }
            }
        }
        return [...nonSeries, ...Array.from(earliestBySeries.values())];
    }, [filtered]);

    // Group by date
    const grouped = useMemo(() => {
        return displayEvents.reduce((acc, ev) => {
            const key = ev.eventDate ? formatDateLabel(ev.eventDate) : "No date";
            if (!acc[key]) acc[key] = [];
            acc[key].push(ev);
            return acc;
        }, {} as Record<string, typeof events>);
    }, [displayEvents]);

    const sortedKeys = useMemo(() => {
        return Object.keys(grouped).sort((a, b) => {
            if (a === "Today") return -1;
            if (b === "Today") return 1;
            if (a === "Tomorrow") return -1;
            if (b === "Tomorrow") return 1;
            if (a === "No date") return 1;
            if (b === "No date") return -1;
            return new Date(a).getTime() - new Date(b).getTime();
        });
    }, [grouped]);

    return {
        events,
        birds,
        pairs,
        birdMap,
        pairLabel,
        isLoading: eventsLoading || birdsLoading || pairsLoading,
        displayEvents,
        grouped,
        sortedKeys,
        createEvent,
        updateEvent,
        deleteEvent,
        toggleComplete,
        deleteAllEvents,
        utils
    };
}
