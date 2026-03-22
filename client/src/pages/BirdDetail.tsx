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
import { readActiveGeneticsPacks, readBirdGenotype, writeBirdGenotype } from "@/genetics/storage";
import { GenotypeState, InheritanceType, type BirdGenotype } from "@/genetics/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bird, Calendar, Tag, Dna, GitBranch, Users, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { GenderIcon } from "@/components/ui/GenderIcon";
import { useState } from "react";

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
};

type GenotypeOption = {
  value: GenotypeState;
  label: string;
};

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
      {bird.colorMutation && size !== "sm" && <p className="text-xs text-amber-600 truncate">{bird.colorMutation}</p>}
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro" || isAdmin;
  const maxGenerations = 4;
  const [activeGeneticsPacks] = useState<string[]>(() => readActiveGeneticsPacks());
  const [birdGenotype, setBirdGenotype] = useState<BirdGenotype>(() => readBirdGenotype(birdId));

  const { data: bird, isLoading } = trpc.birds.get.useQuery({ id: birdId });
  const { data: speciesList = [] } = trpc.species.list.useQuery();
  const { data: pedigreeMap = {} } = trpc.birds.pedigree.useQuery({ id: birdId, generations: maxGenerations });
  const { data: descendants = [] } = trpc.birds.descendants.useQuery({ id: birdId });
  const { data: siblings = [] } = trpc.birds.siblings.useQuery({ id: birdId });
  const { data: allEvents = [] } = trpc.events.list.useQuery();

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));
  const species = bird ? speciesMap[bird.speciesId] : undefined;
  const showGeneticsTab =
    isPro &&
    activeGeneticsPacks.includes(gouldianFinchPack.speciesId) &&
    /gouldian/i.test(species?.commonName ?? "");

  useEffect(() => {
    setBirdGenotype(readBirdGenotype(birdId));
  }, [birdId]);

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

      writeBirdGenotype(birdId, nextGenotype);
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

        {/* Profile Header */}
        <Card className="border border-border shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-24" />
          <CardContent className="px-6 pb-6">
            <div className="flex items-end gap-5 -mt-10">
              <div
                className={`w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden ${bird.gender === "male" ? "bg-blue-50" : bird.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center text-3xl ${bird.photoUrl ? "cursor-zoom-in" : ""}`}
                onClick={() => bird.photoUrl && setLightboxSrc(bird.photoUrl)}
              >
                {bird.photoUrl ? (
                  <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover" />
                ) : (
                  <GenderIcon gender={bird.gender} className="w-10 h-10" />
                )}
              </div>
              <div className="pb-1 flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold">{bird.name || bird.ringId || `Bird #${bird.id}`}</h1>
                <p className="text-muted-foreground">{species?.commonName ?? "Unknown species"}</p>
              </div>
              <Badge className={`mb-1 border ${bird.status === "alive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                bird.status === "breeding" ? "bg-pink-50 text-pink-700 border-pink-200" :
                  bird.status === "resting" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    bird.status === "fledged" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                      bird.status === "sold" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-gray-50 text-gray-500 border-gray-200"
                }`} variant="outline">
                {{ alive: "Alive", breeding: "🥚 Breeding", resting: "💤 Resting", fledged: "🪶 Fledged", deceased: "Deceased", sold: "Sold", unknown: "Unknown" }[bird.status] ?? bird.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ring ID</p>
                  <p className="font-medium font-mono">{bird.ringId || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bird className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <GenderIcon gender={bird.gender} className="w-4 h-4" />
                    {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{dobStr || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fledged Date</p>
                  <p className="font-medium">{fledgedStr || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Dna className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Colour / Mutation</p>
                  <p className="font-medium text-amber-600">{bird.colorMutation || "—"}</p>
                </div>
              </div>
            </div>

            {bird.notes && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {bird.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Pedigree + Descendants */}
        <Tabs id="tour-bird-tabs" defaultValue="pedigree">
          <TabsList className="mb-4">
            <TabsTrigger value="pedigree" className="gap-2">
              <GitBranch className="h-4 w-4" /> Pedigree
              {genCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{genCount} gen</Badge>}
            </TabsTrigger>
            <TabsTrigger value="descendants" className="gap-2">
              <Users className="h-4 w-4" /> Descendants
              {descendants.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{descendants.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="siblings" className="gap-2">
              <Users className="h-4 w-4" /> Siblings
              {siblings.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{siblings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Events
              {birdEvents.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{birdEvents.length}</Badge>}
            </TabsTrigger>
            {showGeneticsTab && (
              <TabsTrigger value="genetics" className="gap-2">
                <Dna className="h-4 w-4" /> Genetics
              </TabsTrigger>
            )}
          </TabsList>

          {/* Pedigree Tab */}
          <TabsContent value="pedigree">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Pedigree — up to 4 Generations
                </CardTitle>
                <p className="text-xs text-muted-foreground">Click any bird to view their profile. Scroll horizontally to see all generations.</p>
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  All Descendants
                </CardTitle>
                <p className="text-xs text-muted-foreground">All birds in your registry that descend from this bird (all generations).</p>
              </CardHeader>
              <CardContent>
                {descendants.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No descendants recorded yet.</p>
                    <p className="text-xs mt-1">Add offspring birds and set this bird as their parent to see them here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {descendants.map(d => {
                      const dSpecies = speciesMap[d.speciesId];
                      return (
                        <button
                          key={d.id}
                          onClick={() => setLocation(`/birds/${d.id}`)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:shadow-elevated hover:border-primary/40 transition-all text-left"
                        >
                          <div className={`w-10 h-10 rounded-xl ${d.gender === "male" ? "bg-blue-50" : d.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center shrink-0 overflow-hidden`}>
                            {d.photoUrl ? (
                              <img src={d.photoUrl} alt={d.name ?? "Bird"} className="w-full h-full object-cover" />
                            ) : <GenderIcon gender={d.gender} className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.name || d.ringId || `#${d.id}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{dSpecies?.commonName ?? "—"}</p>
                            {d.colorMutation && <p className="text-xs text-amber-600 truncate">{d.colorMutation}</p>}
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  Siblings
                </CardTitle>
                <p className="text-xs text-muted-foreground">Birds that share at least one parent with {bird.name || bird.ringId || `#${bird.id}`}.</p>
              </CardHeader>
              <CardContent>
                {siblings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No siblings found.</p>
                    <p className="text-xs mt-1">Add parent information to this bird and its relatives to detect siblings automatically.</p>
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
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:shadow-elevated hover:border-primary/40 transition-all text-left"
                        >
                          <div className={`w-10 h-10 rounded-xl ${s.gender === "male" ? "bg-blue-50" : s.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center shrink-0 overflow-hidden`}>
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt={s.name ?? "Bird"} className="w-full h-full object-cover" />
                            ) : <GenderIcon gender={s.gender} className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{s.name || s.ringId || `#${s.id}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{sSpecies?.commonName ?? "—"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-base"><GenderIcon gender={s.gender} className="w-5 h-5" /></span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isFullSibling
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

          {/* Events Tab */}
          <TabsContent value="events">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Events
                </CardTitle>
                <p className="text-xs text-muted-foreground">Events linked to this bird and aviary-wide events.</p>
              </CardHeader>
              <CardContent>
                {birdEvents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No events recorded for this bird.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {birdEvents.map(ev => (
                      <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-white transition-all ${ev.completed ? "opacity-60" : ""}`}>
                        <span className="shrink-0">
                          {ev.completed
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            : <Circle className="h-5 w-5 text-muted-foreground" />
                          }
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${ev.completed ? "line-through text-muted-foreground" : ""}`}>{ev.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(ev as any).allBirds ? "🐦 All birds · " : ""}
                            {ev.eventDate ? format(typeof ev.eventDate === 'object' && ev.eventDate ? ev.eventDate : new Date(String(ev.eventDate)), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{ev.eventType}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {showGeneticsTab && (
            <TabsContent value="genetics">
              <div className="space-y-4">
                <Card className="border border-teal-200 shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Dna className="h-4 w-4 text-teal-600" />
                      Visual Phenotype
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Selections are auto-saved in this browser for this bird profile.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {phenotypeSummary.map((summary) => {
                        const [traitName, ...valueParts] = summary.split(": ");
                        return (
                          <div key={traitName} className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{traitName}</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{valueParts.join(": ") || "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {gouldianFinchPack.traits.map((trait) => (
                  <Card key={trait.traitName} className="border border-border shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">{trait.traitName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {trait.mutations.map((mutation) => {
                          const selectedState = birdGenotype[mutation.id] ?? GenotypeState.WILD_TYPE;
                          const genotypeOptions = getGenotypeOptions(mutation.inheritanceType, bird.gender);

                          return (
                            <div key={mutation.id} className="rounded-xl border border-border bg-white p-4">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">{mutation.name}</p>
                                  <p className="text-xs text-muted-foreground">{mutation.id}</p>
                                </div>
                                <Badge variant="outline" className="text-[11px] whitespace-nowrap">
                                  {getInheritanceLabel(mutation.inheritanceType)}
                                </Badge>
                              </div>

                              <Select
                                value={selectedState}
                                onValueChange={(value) => handleGenotypeChange(mutation.id, value as GenotypeState)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select genotype state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {genotypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>
    </DashboardLayout>

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
