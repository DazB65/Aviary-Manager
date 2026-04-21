import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { describeVisualPhenotype } from "@/genetics/engine";
import { gouldianFinchPack } from "@/genetics/packs/gouldianFinch";
import { readActiveGeneticsPacks, readBirdGenotype, formatGeneticsDisplay } from "@/genetics/storage";
import { GenotypeState, InheritanceType, type BirdGenotype } from "@/genetics/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bird, Calendar, Tag, Dna, GitBranch, Users, CalendarDays, CheckCircle2, Circle, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { BirdFormModal } from "@/components/birds/BirdFormModal";
import { BirdEventCalendar } from "@/components/birds/BirdEventCalendar";
import { EventFormModal } from "@/components/events/EventFormModal";
import { EGG_OUTCOME_CONFIG } from "@/components/broods/constants";
import { STATUS_STYLES, STATUS_LABELS } from "@/components/pairs/constants";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { GenderIcon } from "@/components/ui/GenderIcon";
import { toast } from "sonner";
import { generateDates, type EventFormData } from "@/hooks/useEventForm";

type PedigreeBird = {
  id: number;
  name: string | null;
  ringId: string | null;
  gender: string;
  colorMutation: string | null;
  photoUrl: string | null;
  speciesId: number;
  fatherId: number | null;
  motherId: number | null;
  genotype?: string | null;
};

type GenotypeOption = { value: GenotypeState; label: string };

const RECESSIVE_TYPES = new Set([
  InheritanceType.AUTOSOMAL_RECESSIVE,
  InheritanceType.SEX_LINKED_RECESSIVE,
]);

const DOUBLE_SPLIT_IDS = ["blue-body", "australian-yellow-body"];

function buildGenotypeFromSelections(
  selections: Record<string, { colour: string; splitTo: string }>,
  pack: typeof gouldianFinchPack,
): BirdGenotype {
  const g: BirdGenotype = {};
  for (const trait of pack.traits) {
    const sel = selections[trait.traitName] ?? { colour: "", splitTo: "" };
    const isDoubleSplit = sel.splitTo === "double-split";
    for (const m of trait.mutations) {
      if (m.id === sel.colour) g[m.id] = GenotypeState.EXPRESSING;
      else if (isDoubleSplit && DOUBLE_SPLIT_IDS.includes(m.id)) g[m.id] = GenotypeState.CARRIER;
      else if (m.id === sel.splitTo) g[m.id] = GenotypeState.CARRIER;
      else g[m.id] = GenotypeState.WILD_TYPE;
    }
  }
  return g;
}

function parseSelectionsFromGenotype(
  genotype: BirdGenotype,
  pack: typeof gouldianFinchPack,
): Record<string, { colour: string; splitTo: string }> {
  const result: Record<string, { colour: string; splitTo: string }> = {};
  for (const trait of pack.traits) {
    let colour = "";
    const carriers: string[] = [];
    for (const m of trait.mutations) {
      const state = genotype[m.id];
      if (state === GenotypeState.EXPRESSING) colour = m.id;
      else if (state === GenotypeState.CARRIER) carriers.push(m.id);
    }
    // Detect double split: carrying both Blue and Australian Yellow
    const isDoubleSplit = DOUBLE_SPLIT_IDS.every(id => carriers.includes(id));
    result[trait.traitName] = { colour, splitTo: isDoubleSplit ? "double-split" : (carriers[0] ?? "") };
  }
  return result;
}


function getInheritanceLabel(inheritanceType: InheritanceType): string {
  switch (inheritanceType) {
    case InheritanceType.AUTOSOMAL_RECESSIVE:
      return "Autosomal recessive";
    case InheritanceType.AUTOSOMAL_DOMINANT:
      return "Autosomal dominant";
    case InheritanceType.SEX_LINKED_RECESSIVE:
      return "Sex-linked recessive";
    case InheritanceType.SEX_LINKED_DOMINANT:
      return "Sex-linked dominant";
    case InheritanceType.CO_DOMINANT_SEX_LINKED:
      return "Co-dominant sex-linked";
    case InheritanceType.INCOMPLETE_DOMINANT:
      return "Incomplete dominant";
  }
}

function getGenotypeOptions(inheritanceType: InheritanceType, sex: string): GenotypeOption[] {
  const isFemale = sex === "female";

  switch (inheritanceType) {
    case InheritanceType.AUTOSOMAL_RECESSIVE:
      return [
        { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
        { value: GenotypeState.CARRIER, label: "Carrier (split)" },
        { value: GenotypeState.EXPRESSING, label: "Expressing" },
      ];
    case InheritanceType.AUTOSOMAL_DOMINANT:
    case InheritanceType.SEX_LINKED_DOMINANT:
      return [
        { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
        { value: GenotypeState.EXPRESSING, label: "Expressing" },
      ];
    case InheritanceType.SEX_LINKED_RECESSIVE:
      return isFemale
        ? [
            { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
            { value: GenotypeState.EXPRESSING, label: "Expressing" },
          ]
        : [
            { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
            { value: GenotypeState.CARRIER, label: "Carrier" },
            { value: GenotypeState.EXPRESSING, label: "Expressing" },
          ];
    case InheritanceType.CO_DOMINANT_SEX_LINKED:
    case InheritanceType.INCOMPLETE_DOMINANT:
      return isFemale
        ? [
            { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
            { value: GenotypeState.SINGLE_FACTOR, label: "Single Factor" },
          ]
        : [
            { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
            { value: GenotypeState.SINGLE_FACTOR, label: "Single Factor" },
            { value: GenotypeState.DOUBLE_FACTOR, label: "Double Factor" },
          ];
  }
}

// ─── Pedigree card component ─────────────────────────────────────────────────
function PedigreeCard({
  bird,
  speciesName,
  size = "md",
}: {
  bird: PedigreeBird | null | undefined;
  speciesName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [, setLocation] = useLocation();
  const sizeClasses = {
    lg: "min-w-48 p-3",
    md: "min-w-36 p-2.5",
    sm: "min-w-28 p-2",
  };
  const textClasses = { lg: "text-sm", md: "text-xs", sm: "text-xs" };
  const imgClasses = { lg: "w-9 h-9", md: "w-7 h-7", sm: "w-6 h-6" };

  if (!bird) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-border text-center text-xs text-muted-foreground ${sizeClasses[size]} flex items-center justify-center`}>
        Unknown
      </div>
    );
  }

  const genderColor = bird.gender === "male" ? "text-blue-500" : bird.gender === "female" ? "text-rose-500" : "text-muted-foreground";

  return (
    <button
      onClick={() => setLocation(`/birds/${bird.id}`)}
      className={`rounded-xl border border-border bg-white shadow-card hover:shadow-elevated hover:border-primary/40 transition-all text-left ${sizeClasses[size]}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {bird.photoUrl ? (
          <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className={`${imgClasses[size]} rounded-lg object-cover shrink-0`} />
        ) : (
          <div className={`${imgClasses[size]} rounded-lg ${bird.gender === "male" ? "bg-blue-50" : bird.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center shrink-0`}>
            <GenderIcon gender={bird.gender} className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
          </div>
        )}
        <div className="min-w-0">
          <p className={`${textClasses[size]} font-semibold truncate leading-tight`}>{bird.name || bird.ringId || `#${bird.id}`}</p>
          {size !== "sm" && <p className="text-xs text-muted-foreground truncate leading-tight">{speciesName ?? "—"}</p>}
        </div>
      </div>
      {size !== "sm" && (() => {
        let genotype: BirdGenotype = {};
        if (bird.genotype) {
          try { genotype = JSON.parse(bird.genotype); } catch { /* fall through */ }
        }
        const traitRows = gouldianFinchPack.traits.flatMap((trait) => {
          const expressing = trait.mutations.find(m => genotype[m.id] === GenotypeState.EXPRESSING);
          const carrier = trait.mutations.find(m => genotype[m.id] === GenotypeState.CARRIER);
          if (!expressing) return [];
          const label = trait.traitName.replace(" Colour", "").toUpperCase();
          return [{ label, value: expressing.name + (carrier ? ` (split to ${carrier.name})` : "") }];
        });
        if (traitRows.length > 0) {
          return (
            <div className="space-y-0.5 mb-0.5">
              {traitRows.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] font-bold tracking-widest text-muted-foreground leading-none">{label}</p>
                  <p className="text-xs text-amber-600 leading-tight">{value}</p>
                </div>
              ))}
            </div>
          );
        }
        // Fall back to parsing colorMutation string (e.g. "Black Head / Green / Purple")
        if (bird.colorMutation) {
          const parts = bird.colorMutation.split(" / ");
          const labels = ["HEAD", "BODY", "BREAST"];
          if (parts.length > 1) {
            return (
              <div className="space-y-0.5 mb-0.5">
                {parts.map((part, i) => (
                  <div key={i}>
                    <p className="text-[9px] font-bold tracking-widest text-muted-foreground leading-none">{labels[i] ?? ""}</p>
                    <p className="text-xs text-amber-600 leading-tight">{part}</p>
                  </div>
                ))}
              </div>
            );
          }
          return <p className="text-xs text-amber-600 truncate">{bird.colorMutation}</p>;
        }
        return null;
      })()}
      <p className={`${textClasses[size]} ${genderColor} font-medium flex items-center gap-1.5`}><GenderIcon gender={bird.gender} className="w-3.5 h-3.5" /> {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "?"}</p>
    </button>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────
function Connector({ count, gap = 8 }: { count: number; gap?: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-3" style={{ gap: `${gap}px` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-5 h-px bg-border" />
      ))}
    </div>
  );
}

// ─── Recursive pedigree column builder ───────────────────────────────────────
function PedigreeColumn({
  birdId,
  pedigreeMap,
  speciesMap,
  generation,
  maxGen,
}: {
  birdId: number | null | undefined;
  pedigreeMap: Record<number, PedigreeBird>;
  speciesMap: Record<number, { commonName: string }>;
  generation: number;
  maxGen: number;
}) {
  const bird = birdId ? pedigreeMap[birdId] : null;
  const size = generation === 0 ? "lg" : generation <= 2 ? "md" : "sm";

  if (generation >= maxGen) {
    return <PedigreeCard bird={bird} speciesName={bird ? speciesMap[bird.speciesId]?.commonName : undefined} size={size} />;
  }

  const fatherId = bird?.fatherId ?? null;
  const motherId = bird?.motherId ?? null;
  const hasFather = fatherId && pedigreeMap[fatherId];
  const hasMother = motherId && pedigreeMap[motherId];
  const hasAnyParent = hasFather || hasMother;

  const gapPx = generation === 0 ? 32 : generation === 1 ? 20 : generation === 2 ? 12 : 8;

  return (
    <div className="flex items-center">
      <PedigreeCard bird={bird} speciesName={bird ? speciesMap[bird.speciesId]?.commonName : undefined} size={size} />
      {hasAnyParent && (
        <>
          <Connector count={2} gap={gapPx} />
          <div className="flex flex-col" style={{ gap: `${gapPx}px` }}>
            <PedigreeColumn birdId={fatherId} pedigreeMap={pedigreeMap} speciesMap={speciesMap} generation={generation + 1} maxGen={maxGen} />
            <PedigreeColumn birdId={motherId} pedigreeMap={pedigreeMap} speciesMap={speciesMap} generation={generation + 1} maxGen={maxGen} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BirdDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const birdId = Number(params.id);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro" || isAdmin;
  const maxGenerations = 4;
  const [activeGeneticsPacks] = useState<string[]>(() => readActiveGeneticsPacks());
  const [birdGenotype, setBirdGenotype] = useState<BirdGenotype>({});
  const [traitSelections, setTraitSelections] = useState<Record<string, { colour: string; splitTo: string }>>({});

  const { data: bird, isLoading } = trpc.birds.get.useQuery({ id: birdId });
  const utils = trpc.useUtils();
  const updateBird = trpc.birds.update.useMutation({ onSuccess: () => { utils.birds.get.invalidate({ id: birdId }); utils.birds.list.invalidate(); } });
  const { data: speciesList = [] } = trpc.species.list.useQuery();
  const { data: birdsList = [] } = trpc.birds.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: pedigreeMap = {} } = trpc.birds.pedigree.useQuery({ id: birdId, generations: maxGenerations });
  const { data: descendants = [] } = trpc.birds.descendants.useQuery({ id: birdId });
  const { data: siblings = [] } = trpc.birds.siblings.useQuery({ id: birdId });
  const { data: allEvents = [] } = trpc.events.list.useQuery();
  const { data: pairsList = [] } = trpc.pairs.list.useQuery();
  const { data: breedingHistory = [] } = trpc.birds.breedingHistory.useQuery({ id: birdId });

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const createEvent = trpc.events.create.useMutation({ onError: (e) => toast.error(e.message) });
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Event updated!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Event removed."); },
    onError: (e) => toast.error(e.message),
  });
  const toggleComplete = trpc.events.toggleComplete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const birdLabel = (b: any) => b?.name || b?.ringId || `#${b?.id}`;
  const pairLabel = (pair: any) => {
    if (!pair) return "Unknown";
    const male = birdsList.find(b => b.id === pair.maleId);
    const female = birdsList.find(b => b.id === pair.femaleId);
    return `${birdLabel(male)} × ${birdLabel(female)}`;
  };

  const openAddEvent = (date?: string) => {
    setEditingEventId(null);
    setEditingEvent({ birdId, eventType: "other", eventDate: date ?? new Date().toISOString().split("T")[0] });
    setEventDialogOpen(true);
  };

  const openEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    setEditingEvent(ev);
    setEventDialogOpen(true);
  };

  const handleEventSubmit = async (form: EventFormData) => {
    if (!form.title.trim()) { toast.error("Please enter a title"); return; }
    const baseDate = form.eventDate || new Date().toISOString().split("T")[0];
    const basePayload = {
      title: form.title.trim(),
      eventType: form.eventType,
      pairId: form.pairId ? Number(form.pairId) : undefined,
      notes: form.notes || undefined,
    };

    if (editingEventId) {
      updateEvent.mutate({
        id: editingEventId,
        ...basePayload,
        eventDate: baseDate,
        birdId: form.birdId && form.birdId !== "all" ? Number(form.birdId) : undefined,
      });
      setEventDialogOpen(false);
      return;
    }

    const recurrenceUnit = form.recurrence === "none" ? undefined
      : form.recurrence === "daily" ? "days"
      : form.recurrence === "weekly" ? "weeks"
      : form.recurrence === "monthly" ? "months"
      : form.recurrence === "yearly" ? "years"
      : form.customUnit;
    const recurrenceInterval = form.recurrence === "none" ? undefined
      : form.recurrence === "custom" ? form.customInterval : 1;
    const occurrences = form.neverEnding ? 2 : form.recurrence === "none" ? 1 : form.recurrenceCount;
    const dates = generateDates(baseDate, form.recurrence, occurrences, form.customInterval, form.customUnit);
    const isAllBirds = form.birdId === "all";
    const specificBirdId = !isAllBirds && form.birdId ? Number(form.birdId) : undefined;
    const seriesId = dates.length > 1 || form.neverEnding ? crypto.randomUUID() : undefined;

    try {
      await Promise.all(dates.map(date => createEvent.mutateAsync({
        ...basePayload,
        eventDate: date,
        birdId: specificBirdId,
        allBirds: isAllBirds,
        seriesId,
        recurrenceUnit,
        recurrenceInterval,
        isIndefinite: form.neverEnding || undefined,
      })));
      toast.success(dates.length === 1 ? "Event added!" : `${dates.length} events added!`);
      utils.events.list.invalidate();
      utils.dashboard.stats.invalidate();
      setEventDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create events");
    }
  };

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));
  const species = bird ? speciesMap[bird.speciesId] : undefined;
  const showGeneticsTab =
    isPro &&
    activeGeneticsPacks.includes(gouldianFinchPack.speciesId) &&
    /gouldian/i.test(species?.commonName ?? "");

  useEffect(() => {
    let g: BirdGenotype = {};
    if (bird?.genotype) {
      try { g = JSON.parse(bird.genotype); } catch { /* ignore */ }
    }
    if (!Object.keys(g).length) g = readBirdGenotype(birdId);
    setBirdGenotype(g);
    setTraitSelections(parseSelectionsFromGenotype(g, gouldianFinchPack));
  }, [birdId, bird?.genotype]);

  const phenotypeSummary = useMemo(
    () => bird && showGeneticsTab ? describeVisualPhenotype(bird.gender, birdGenotype, gouldianFinchPack) : [],
    [bird, birdGenotype, showGeneticsTab]
  );

  // Events relevant to this bird: either linked directly or applies to all birds
  const birdEvents = allEvents.filter(e =>
    e.birdId === birdId || (e as any).allBirds === true
  ).sort((a, b) => {
    // Sort by date descending (most recent first)
    const aDate = a.eventDate ? new Date(String(a.eventDate)).getTime() : 0;
    const bDate = b.eventDate ? new Date(String(b.eventDate)).getTime() : 0;
    return bDate - aDate;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bird) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Bird className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Bird not found.</p>
          <Button variant="outline" onClick={() => setLocation("/birds")} className="mt-4">Back to birds</Button>
        </div>
      </DashboardLayout>
    );
  }

  const dobStr = bird.dateOfBirth
    ? format(typeof bird.dateOfBirth === 'object' && bird.dateOfBirth ? bird.dateOfBirth : new Date(String(bird.dateOfBirth)), "dd MMM yyyy")
    : null;
  const fledgedStr = (bird as any).fledgedDate
    ? format((bird as any).fledgedDate instanceof Date ? (bird as any).fledgedDate : new Date(String((bird as any).fledgedDate)), "dd MMM yyyy")
    : null;

  // Count how many generations of ancestors we actually have
  const genCount = (() => {
    let g = 0;
    let ids = new Set([birdId]);
    for (let i = 0; i < 5; i++) {
      const nextIds = new Set<number>();
      for (const id of Array.from(ids)) {
        const b = pedigreeMap[id];
        if (b?.fatherId && pedigreeMap[b.fatherId]) nextIds.add(b.fatherId);
        if (b?.motherId && pedigreeMap[b.motherId]) nextIds.add(b.motherId);
      }
      if (nextIds.size === 0) break;
      g = i + 1;
      ids = nextIds;
    }
    return g;
  })();

  const pedigreeBird = pedigreeMap[birdId] ?? { ...bird, fatherId: bird.fatherId ?? null, motherId: bird.motherId ?? null };

  const handleGenotypeChange = (mutationId: string, nextState: GenotypeState) => {
    setBirdGenotype((currentGenotype) => {
      const nextGenotype = {
        ...currentGenotype,
        [mutationId]: nextState,
      };

      updateBird.mutate({ id: birdId, genotype: JSON.stringify(nextGenotype) });
      return nextGenotype;
    });
  };

  return (
    <>
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/birds")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Birds
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/pdf/pedigree/${birdId}`;
                a.download = `pedigree-${bird.name || bird.ringId || birdId}.pdf`;
                a.click();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
              Export Pedigree PDF
            </Button>
          </div>
        </div>

        {/* Profile Header */}
        <Card className="border border-border shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Gender accent bar */}
              <div className={`h-1.5 sm:h-auto sm:w-1.5 shrink-0 ${bird.gender === "male" ? "bg-blue-400" : bird.gender === "female" ? "bg-rose-400" : "bg-amber-400"}`} />

              {/* Left: Photo + name + status */}
              <div className="sm:w-52 lg:w-64 shrink-0 p-6 flex flex-col gap-4 sm:border-r border-border">
                <div
                  className={`rounded-2xl overflow-hidden w-full aspect-square ${bird.gender === "male" ? "bg-gradient-to-br from-blue-50 to-blue-100" : bird.gender === "female" ? "bg-gradient-to-br from-pink-50 to-rose-100" : "bg-gradient-to-br from-amber-50 to-orange-100"} flex items-center justify-center ${bird.photoUrl ? "cursor-zoom-in" : ""}`}
                  onClick={() => bird.photoUrl && setLightboxSrc(bird.photoUrl)}
                >
                  {bird.photoUrl ? (
                    <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover" />
                  ) : (
                    <GenderIcon gender={bird.gender} className="w-16 h-16 opacity-25" />
                  )}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold leading-tight">{bird.name || bird.ringId || `Bird #${bird.id}`}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{species?.commonName ?? "Unknown species"}</p>
                </div>
                <Badge
                  className={`w-fit border text-sm px-3 py-1 ${bird.status === "alive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    bird.status === "breeding" ? "bg-pink-50 text-pink-700 border-pink-200" :
                    bird.status === "resting" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    bird.status === "fledged" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                    bird.status === "sold" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-gray-50 text-gray-500 border-gray-200"}`}
                  variant="outline"
                >
                  {{ alive: "Alive", breeding: "🥚 Breeding", resting: "💤 Resting", fledged: "🪶 Fledged", deceased: "Deceased", sold: "Sold", unknown: "Unknown" }[bird.status] ?? bird.status}
                </Badge>
              </div>

              {/* Right: Details */}
              <div className="flex-1 p-6 flex flex-col gap-5 min-w-0">
                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ring ID</p>
                    <p className="text-lg font-bold font-mono">{bird.ringId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="text-lg font-bold flex items-center gap-1.5">
                      <GenderIcon gender={bird.gender} className="w-5 h-5" />
                      {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="text-lg font-bold">{dobStr || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fledged Date</p>
                    <p className="text-lg font-bold">{fledgedStr || "—"}</p>
                  </div>
                </div>

                {/* Colour / Mutation */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Colour / Mutation</p>
                  {showGeneticsTab ? (
                    (() => {
                      const traitRows = gouldianFinchPack.traits.flatMap((trait) => {
                        const sel = traitSelections[trait.traitName] ?? { colour: "", splitTo: "" };
                        const colourMutation = trait.mutations.find(m => m.id === sel.colour);
                        const splitMutation = trait.mutations.find(m => m.id === sel.splitTo);
                        if (!colourMutation) return [];
                        const label = trait.traitName.replace(" Colour", "").toUpperCase();
                        // Strip the trait name from the value (e.g. "Black Head" → "Black", "Green Body" → "Green")
                        const traitWord = trait.traitName.replace(" Colour", "");
                        const cleanValue = colourMutation.name.replace(new RegExp(`\\s*${traitWord}\\s*`, "i"), "").trim() || colourMutation.name;
                        const displayValue = splitMutation
                          ? `${cleanValue} split to ${splitMutation.name.replace(new RegExp(`\\s*${traitWord}\\s*`, "i"), "").trim() || splitMutation.name}`
                          : cleanValue;
                        return [{ label, value: displayValue }];
                      });
                      if (traitRows.length === 0) {
                        return <p className="text-lg font-bold text-amber-600">{bird.colorMutation || "—"}</p>;
                      }
                      return (
                        <div className="flex flex-col gap-2">
                          {traitRows.map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
                              <p className="text-lg font-bold text-amber-600 leading-tight">{value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      // Parse "Black Head / Green / Purple" style strings into labelled rows
                      if (bird.colorMutation) {
                        const parts = bird.colorMutation.split(" / ");
                        const labels = ["HEAD", "BODY", "BREAST"];
                        const trailWords = ["Head", "Body", "Breast"];
                        if (parts.length > 1) {
                          return (
                            <div className="flex flex-col gap-2">
                              {parts.map((part, i) => {
                                const clean = part.replace(new RegExp(`\\s*${trailWords[i]}\\s*$`, "i"), "").trim() || part;
                                return (
                                  <div key={i}>
                                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{labels[i] ?? ""}</p>
                                    <p className="text-lg font-bold text-amber-600 leading-tight">{clean}</p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      return <p className="text-lg font-bold text-amber-600">{bird.colorMutation || "—"}</p>;
                    })()
                  )}
                </div>

                {/* Notes */}
                {bird.notes && (
                  <div className="p-3 bg-muted rounded-xl text-sm text-muted-foreground border border-border">
                    {bird.notes}
                  </div>
                )}

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Pedigree + Descendants */}
        <Tabs id="tour-bird-tabs" defaultValue="pedigree">
          <TabsList className="mb-4 h-11 rounded-xl p-1 gap-0.5">
            <TabsTrigger value="pedigree" className="gap-2 text-sm px-4 rounded-lg h-9">
              <GitBranch className="h-4 w-4" /> Pedigree
              {genCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{genCount} gen</Badge>}
            </TabsTrigger>
            <TabsTrigger value="descendants" className="gap-2 text-sm px-4 rounded-lg h-9">
              <Users className="h-4 w-4" /> Descendants
              {descendants.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{descendants.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="siblings" className="gap-2 text-sm px-4 rounded-lg h-9">
              <Users className="h-4 w-4" /> Siblings
              {siblings.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{siblings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="breeding" className="gap-2 text-sm px-4 rounded-lg h-9">
              <Heart className="h-4 w-4" /> Breeding
              {breedingHistory.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{breedingHistory.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2 text-sm px-4 rounded-lg h-9">
              <CalendarDays className="h-4 w-4" /> Events
              {birdEvents.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{birdEvents.length}</Badge>}
            </TabsTrigger>
            {showGeneticsTab && (
              <TabsTrigger value="genetics" className="gap-2 text-sm px-4 rounded-lg h-9">
                <Dna className="h-4 w-4" /> Genetics
              </TabsTrigger>
            )}
          </TabsList>

          {/* Pedigree Tab */}
          <TabsContent value="pedigree">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <GitBranch className="h-5 w-5 text-primary" />
                  Pedigree — up to 4 Generations
                </CardTitle>
                <p className="text-sm text-muted-foreground">Click any bird to view their profile. Scroll horizontally to see all generations.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-max py-2">
                    <PedigreeColumn
                      birdId={birdId}
                      pedigreeMap={{ ...pedigreeMap, [birdId]: pedigreeBird as PedigreeBird }}
                      speciesMap={speciesMap}
                      generation={0}
                      maxGen={5}
                    />
                  </div>
                </div>
                {genCount === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    No parents recorded. Edit this bird to add parent information.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Descendants Tab */}
          <TabsContent value="descendants">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Users className="h-5 w-5 text-primary" />
                  All Descendants
                </CardTitle>
                <p className="text-sm text-muted-foreground">All birds in your registry that descend from this bird (all generations).</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {descendants.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">No descendants recorded yet.</p>
                    <p className="text-sm mt-1">Add offspring birds and set this bird as their parent to see them here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {descendants.map(d => {
                      const dSpecies = speciesMap[d.speciesId];
                      return (
                        <button
                          key={d.id}
                          onClick={() => setLocation(`/birds/${d.id}`)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-elevated hover:border-primary/40 transition-all text-left"
                        >
                          <div className={`w-12 h-12 rounded-xl ${d.gender === "male" ? "bg-blue-50" : d.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center shrink-0 overflow-hidden`}>
                            {d.photoUrl ? (
                              <img src={d.photoUrl} alt={d.name ?? "Bird"} className="w-full h-full object-cover" />
                            ) : <GenderIcon gender={d.gender} className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold truncate">{d.name || d.ringId || `#${d.id}`}</p>
                            <p className="text-sm text-muted-foreground truncate">{dSpecies?.commonName ?? "—"}</p>
                            {d.colorMutation && <p className="text-sm text-amber-600 truncate">{d.colorMutation}</p>}
                          </div>
                          <span className="ml-auto shrink-0"><GenderIcon gender={d.gender} className="w-5 h-5" /></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Siblings Tab */}
          <TabsContent value="siblings">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Users className="h-5 w-5 text-primary" />
                  Siblings
                </CardTitle>
                <p className="text-sm text-muted-foreground">Birds that share at least one parent with {bird.name || bird.ringId || `#${bird.id}`}.</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {siblings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">No siblings found.</p>
                    <p className="text-sm mt-1">Add parent information to this bird and its relatives to detect siblings automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {siblings.map(s => {
                      const sSpecies = speciesMap[s.speciesId];
                      const isFullSibling = s.siblingType === "full";
                      return (
                        <button
                          key={s.id}
                          onClick={() => setLocation(`/birds/${s.id}`)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-elevated hover:border-primary/40 transition-all text-left"
                        >
                          <div className={`w-12 h-12 rounded-xl ${s.gender === "male" ? "bg-blue-50" : s.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center shrink-0 overflow-hidden`}>
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt={s.name ?? "Bird"} className="w-full h-full object-cover" />
                            ) : <GenderIcon gender={s.gender} className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold truncate">{s.name || s.ringId || `#${s.id}`}</p>
                            <p className="text-sm text-muted-foreground truncate">{sSpecies?.commonName ?? "—"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-base"><GenderIcon gender={s.gender} className="w-5 h-5" /></span>
                            <span className={`text-sm px-2 py-0.5 rounded-full font-semibold ${isFullSibling
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-50 text-blue-600"
                              }`}>
                              {isFullSibling ? "Full" : "Half"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breeding History Tab */}
          <TabsContent value="breeding">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Heart className="h-5 w-5 text-primary" />
                  Breeding History
                </CardTitle>
                <p className="text-sm text-muted-foreground">All clutches this bird has been involved in.</p>
              </CardHeader>
              <CardContent className="p-0">
                {breedingHistory.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold tracking-widest uppercase">No breeding records yet.</p>
                  </div>
                ) : (() => {
                  const allClutches = breedingHistory.flatMap(({ pair, broods: pairBroods }) =>
                    pairBroods.map(brood => ({ brood, pair }))
                  ).sort((a, b) => {
                    if (!a.brood.layDate && !b.brood.layDate) return 0;
                    if (!a.brood.layDate) return 1;
                    if (!b.brood.layDate) return -1;
                    return new Date(String(a.brood.layDate)).getTime() - new Date(String(b.brood.layDate)).getTime();
                  });

                  // Group by year
                  const byYear: Record<string, typeof allClutches> = {};
                  allClutches.forEach(c => {
                    const year = c.brood.layDate
                      ? String(new Date(String(c.brood.layDate)).getFullYear())
                      : "Unknown";
                    if (!byYear[year]) byYear[year] = [];
                    byYear[year].push(c);
                  });

                  // Global clutch index for numbering across years
                  let globalIdx = 0;

                  return (
                    <div>
                      {Object.entries(byYear).map(([year, clutches]) => (
                        <div key={year}>
                          {/* Year heading */}
                          <div className="px-6 py-3 bg-muted/50 border-y border-border">
                            <span className="text-base font-bold tracking-widest uppercase text-muted-foreground">{year}</span>
                          </div>
                          <div className="divide-y divide-border">
                            {clutches.map(({ brood, pair }) => {
                              const clutchNum = ++globalIdx;
                              const partnerLabel = pair.partnerRingId || pair.partnerName || `Bird #${pair.partnerId}`;
                              const outcomes = Object.entries(brood.eggCounts)
                                .filter(([, count]) => count > 0)
                                .map(([outcome, count]) => ({ outcome, count, cfg: EGG_OUTCOME_CONFIG[outcome as keyof typeof EGG_OUTCOME_CONFIG] }))
                                .filter(({ cfg }) => cfg);
                              const s = brood.status;
                              const statusStyle = s === "hatched" ? "bg-teal-50 text-teal-700 border-teal-200" :
                                s === "failed" ? "bg-red-50 text-red-600 border-red-200" :
                                s === "abandoned" ? "bg-gray-50 text-gray-500 border-gray-200" :
                                "bg-amber-50 text-amber-700 border-amber-200";
                              const statusLabel = s === "hatched" ? "🐣 Hatched" : s === "failed" ? "❌ Failed" : s === "abandoned" ? "🚫 Abandoned" : "🥚 Incubating";

                              return (
                                <div key={brood.id} className="overflow-x-auto">
                                  <div className="flex items-center gap-5 px-6 py-5" style={{ minWidth: "max-content" }}>
                                    <span className="text-sm font-bold tracking-widest text-amber-600 uppercase shrink-0 whitespace-nowrap">
                                      Clutch {clutchNum}
                                    </span>

                                    <button
                                      onClick={() => setLocation(`/birds/${pair.partnerId}`)}
                                      className="flex items-center gap-2 hover:underline shrink-0"
                                    >
                                      <div className={`w-7 h-7 rounded-full ${pair.partnerGender === "male" ? "bg-blue-100" : pair.partnerGender === "female" ? "bg-pink-100" : "bg-amber-100"} flex items-center justify-center overflow-hidden`}>
                                        {pair.partnerPhotoUrl
                                          ? <img src={pair.partnerPhotoUrl} alt="" className="w-full h-full object-cover" />
                                          : <GenderIcon gender={pair.partnerGender} className="w-4 h-4" />
                                        }
                                      </div>
                                      <span className="text-sm font-bold tracking-widest uppercase">{partnerLabel}</span>
                                    </button>

                                    <span className="text-sm text-muted-foreground shrink-0">·</span>

                                    <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground shrink-0">
                                      {brood.eggsLaid ?? 0} eggs laid
                                    </span>

                                    <span className="text-sm text-muted-foreground shrink-0">·</span>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {outcomes.map(({ outcome, count, cfg }) => (
                                        <span key={outcome} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold tracking-widest uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                          {cfg.emoji} {count} {cfg.label.toLowerCase()}
                                        </span>
                                      ))}
                                    </div>

                                    <Badge variant="outline" className={`text-sm font-bold tracking-widest uppercase ml-6 shrink-0 px-3 py-1 ${statusStyle}`}>
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-3 pt-5 px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Events
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Events linked to this bird and aviary-wide events.</p>
                  </div>
                  <Button onClick={() => openAddEvent()} className="bg-primary hover:bg-primary/90 shadow-md gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Add Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <BirdEventCalendar
                  events={birdEvents}
                  onAddEvent={openAddEvent}
                  onEditEvent={openEditEvent}
                  onDeleteEvent={(id) => deleteEvent.mutate({ id })}
                  onToggleComplete={(id) => toggleComplete.mutate({ id })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {showGeneticsTab && (
            <TabsContent value="genetics">
              <div className="space-y-4">
                {(() => {
                  const display = formatGeneticsDisplay(traitSelections, gouldianFinchPack);
                  if (!display) return null;
                  return (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 flex items-center gap-3">
                      <Dna className="h-4 w-4 text-teal-600 shrink-0" />
                      <p className="text-sm font-semibold text-teal-900">{display}</p>
                    </div>
                  );
                })()}

                <Card className="border border-border shadow-card">
                  <CardContent className="pt-5">
                    <div className="space-y-4">
                      {gouldianFinchPack.traits.map((trait) => {
                        const sel = traitSelections[trait.traitName] ?? { colour: "", splitTo: "" };
                        const recessiveMutations = trait.mutations.filter(m => RECESSIVE_TYPES.has(m.inheritanceType));
                        const splitOptions = recessiveMutations.filter(m => m.id !== sel.colour);

                        const handleChange = (field: "colour" | "splitTo", value: string) => {
                          const next = {
                            ...traitSelections,
                            [trait.traitName]: {
                              ...sel,
                              [field]: value === "none" ? "" : value,
                              // clear split if same as new colour
                              ...(field === "colour" && value === sel.splitTo ? { splitTo: "" } : {}),
                            }
                          };
                          setTraitSelections(next);
                          const newGenotype = buildGenotypeFromSelections(next, gouldianFinchPack);
                          setBirdGenotype(newGenotype);
                          const display = formatGeneticsDisplay(next, gouldianFinchPack);
                          updateBird.mutate({
                            id: birdId,
                            genotype: JSON.stringify(newGenotype),
                            ...(display ? { colorMutation: display } : {}),
                          });
                        };

                        return (
                          <div key={trait.traitName} className="space-y-2">
                            <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">{trait.traitName}</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Colour</p>
                                <Select value={sel.colour || "none"} onValueChange={(v) => handleChange("colour", v)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select colour…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— Not set —</SelectItem>
                                    {trait.mutations.map(m => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Split to</p>
                                <Select value={sel.splitTo || "none"} onValueChange={(v) => handleChange("splitTo", v)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {splitOptions.map(m => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                    {trait.traitName === "Body Colour" && DOUBLE_SPLIT_IDS.every(id => splitOptions.some(m => m.id === id)) && (
                                      <SelectItem value="double-split">Double Split (Blue + Aus. Yellow)</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>
    </DashboardLayout>

    {/* Edit modal */}
    <BirdFormModal
      open={editOpen}
      onOpenChange={setEditOpen}
      editingId={birdId}
      initialBird={bird}
      userSettings={settings}
      speciesList={speciesList}
      birdsList={birdsList}
      isPro={isPro}
      activeGeneticsPacks={activeGeneticsPacks}
      isSubmitting={updateBird.isPending}
      onSubmit={(data, genotype) => {
        const genotypeStr = Object.keys(genotype).length > 0 ? JSON.stringify(genotype) : undefined;
        updateBird.mutate({
          id: birdId,
          speciesId: Number(data.speciesId),
          ringId: data.ringId || undefined,
          name: data.name || undefined,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth || undefined,
          fledgedDate: data.fledgedDate || undefined,
          cageNumber: data.cageNumber || undefined,
          colorMutation: data.colorMutation || undefined,
          genotype: genotypeStr,
          photoUrl: data.photoUrl || undefined,
          notes: data.notes || undefined,
          fatherId: data.fatherId ? Number(data.fatherId) : undefined,
          motherId: data.motherId ? Number(data.motherId) : undefined,
          status: data.status,
        }, { onSuccess: () => setEditOpen(false) });
      }}
    />

    {/* Event modal */}
    <EventFormModal
      open={eventDialogOpen}
      onOpenChange={setEventDialogOpen}
      editingId={editingEventId}
      initialEvent={editingEvent}
      birds={birdsList}
      pairs={pairsList}
      pairLabel={pairLabel}
      onSubmit={handleEventSubmit}
      isSubmitting={createEvent.isPending || updateEvent.isPending}
    />

    {/* Lightbox */}
    {lightboxSrc && (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        onClick={() => setLightboxSrc(null)}
      >
        <img
          src={lightboxSrc}
          alt="Bird"
          className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
          style={{ maxWidth: "min(90vw, 600px)", maxHeight: "90vh" }}
        />
      </div>
    )}
    </>
  );
}
