import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type SortCol = "name" | "species" | "gender" | "ringId" | "cage" | "mutation" | "dob" | "status";

export function useBirds() {
    const utils = trpc.useUtils();
    const { data: birds = [], isLoading } = trpc.birds.list.useQuery();
    const { data: speciesList = [], isLoading: isSpeciesLoading } = trpc.species.list.useQuery();
    const { data: userSettings, isLoading: isSettingsLoading } = trpc.settings.get.useQuery();

    const [search, setSearch] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("all");
    const [genderFilter, setGenderFilter] = useState("all");
    const [showInactive, setShowInactive] = useState(false);

    const [sortCol, setSortCol] = useState<SortCol | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    function toggleSort(col: SortCol) {
        if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
        else { setSortCol(col); setSortDir("asc"); }
    }

    const createBird = trpc.birds.create.useMutation({
        onSuccess: () => { utils.birds.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Bird added!"); },
        onError: (e) => toast.error(e.message),
    });
    const updateBird = trpc.birds.update.useMutation({
        onSuccess: () => { utils.birds.list.invalidate(); toast.success("Bird updated!"); },
        onError: (e) => toast.error(e.message),
    });
    const deleteBird = trpc.birds.delete.useMutation({
        onSuccess: () => { utils.birds.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Bird removed."); },
        onError: (e) => toast.error(e.message),
    });
    const inactiveStatuses = ["deceased", "sold"];

    const speciesMap = useMemo(() => Object.fromEntries(speciesList.map(s => [s.id, s])), [speciesList]);

    const { filtered, sorted, inactiveBirdsCount } = useMemo(() => {
        const inactiveCount = birds.filter(b => inactiveStatuses.includes(b.status)).length;

        const f = birds.filter(b => {
            const q = search.toLowerCase();
            const matchSearch = !q || (b.name ?? "").toLowerCase().includes(q) || (b.ringId ?? "").toLowerCase().includes(q) || (b.colorMutation ?? "").toLowerCase().includes(q);
            const matchSpecies = speciesFilter === "all" || String(b.speciesId) === speciesFilter;
            const matchGender = genderFilter === "all" || b.gender === genderFilter;
            const matchActive = showInactive || !inactiveStatuses.includes(b.status);
            return matchSearch && matchSpecies && matchGender && matchActive;
        });

        const s = [...f].sort((a, b) => {
            if (!sortCol) return 0;
            const sp = (id: number) => speciesMap[id]?.commonName ?? "";
            let aVal = "";
            let bVal = "";
            if (sortCol === "name") { aVal = a.name || a.ringId || ""; bVal = b.name || b.ringId || ""; }
            else if (sortCol === "species") { aVal = sp(a.speciesId); bVal = sp(b.speciesId); }
            else if (sortCol === "gender") { aVal = a.gender; bVal = b.gender; }
            else if (sortCol === "ringId") { aVal = a.ringId ?? ""; bVal = b.ringId ?? ""; }
            else if (sortCol === "cage") { aVal = (a as any).cageNumber ?? ""; bVal = (b as any).cageNumber ?? ""; }
            else if (sortCol === "mutation") { aVal = a.colorMutation ?? ""; bVal = b.colorMutation ?? ""; }
            else if (sortCol === "dob") { aVal = String(a.dateOfBirth ?? ""); bVal = String(b.dateOfBirth ?? ""); }
            else if (sortCol === "status") { aVal = a.status; bVal = b.status; }
            const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" });
            return sortDir === "asc" ? cmp : -cmp;
        });

        return { filtered: f, sorted: s, inactiveBirdsCount: inactiveCount };
    }, [birds, search, speciesFilter, genderFilter, showInactive, sortCol, sortDir, speciesMap]);

    return {
        birds,
        speciesList,
        userSettings,
        speciesMap,
        isLoading: isLoading || isSpeciesLoading || isSettingsLoading,

        search, setSearch,
        speciesFilter, setSpeciesFilter,
        genderFilter, setGenderFilter,
        showInactive, setShowInactive,
        sortCol, sortDir, toggleSort,

        inactiveStatuses,
        inactiveBirdsCount,
        filtered,
        sorted,

        createBird,
        updateBird,
        deleteBird,
    };
}
