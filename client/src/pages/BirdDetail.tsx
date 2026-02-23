import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bird, Calendar, Tag, Dna, GitBranch, Users } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";

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

  const genderIcon = bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "🐦";
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
          <div className={`${imgClasses[size]} rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0 ${textClasses[size]}`}>
            {genderIcon}
          </div>
        )}
        <div className="min-w-0">
          <p className={`${textClasses[size]} font-semibold truncate leading-tight`}>{bird.name || bird.ringId || `#${bird.id}`}</p>
          {size !== "sm" && <p className="text-xs text-muted-foreground truncate leading-tight">{speciesName ?? "—"}</p>}
        </div>
      </div>
      {bird.colorMutation && size !== "sm" && <p className="text-xs text-amber-600 truncate">{bird.colorMutation}</p>}
      <p className={`${textClasses[size]} ${genderColor} font-medium`}>{genderIcon} {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "?"}</p>
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

  const { data: bird, isLoading } = trpc.birds.get.useQuery({ id: birdId });
  const { data: speciesList = [] } = trpc.species.list.useQuery();
  const { data: pedigreeMap = {} } = trpc.birds.pedigree.useQuery({ id: birdId, generations: 5 });
  const { data: descendants = [] } = trpc.birds.descendants.useQuery({ id: birdId });

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));

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

  const species = speciesMap[bird.speciesId];
  const dobStr = bird.dateOfBirth
    ? format(bird.dateOfBirth instanceof Date ? bird.dateOfBirth : new Date(String(bird.dateOfBirth)), "dd MMM yyyy")
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/birds")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Birds
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="border border-border shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-24" />
          <CardContent className="px-6 pb-6">
            <div className="flex items-end gap-5 -mt-10">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-amber-50 flex items-center justify-center text-3xl">
                {bird.photoUrl ? (
                  <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover" />
                ) : (
                  bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "🐦"
                )}
              </div>
              <div className="pb-1 flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold">{bird.name || bird.ringId || `Bird #${bird.id}`}</h1>
                <p className="text-muted-foreground">{species?.commonName ?? "Unknown species"}</p>
              </div>
              <Badge className={`mb-1 ${bird.status === "alive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500"}`} variant="outline">
                {bird.status}
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
                  <p className="font-medium">{bird.gender === "male" ? "♂ Male" : bird.gender === "female" ? "♀ Female" : "Unknown"}</p>
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
        <Tabs defaultValue="pedigree">
          <TabsList className="mb-4">
            <TabsTrigger value="pedigree" className="gap-2">
              <GitBranch className="h-4 w-4" /> Pedigree
              {genCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{genCount} gen</Badge>}
            </TabsTrigger>
            <TabsTrigger value="descendants" className="gap-2">
              <Users className="h-4 w-4" /> Descendants
              {descendants.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{descendants.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Pedigree Tab */}
          <TabsContent value="pedigree">
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Pedigree — up to 5 Generations
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
                      const genderIcon = d.gender === "male" ? "♂" : d.gender === "female" ? "♀" : "🐦";
                      const genderColor = d.gender === "male" ? "text-blue-500" : d.gender === "female" ? "text-rose-500" : "text-muted-foreground";
                      return (
                        <button
                          key={d.id}
                          onClick={() => setLocation(`/birds/${d.id}`)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:shadow-elevated hover:border-primary/40 transition-all text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                            {d.photoUrl ? (
                              <img src={d.photoUrl} alt={d.name ?? "Bird"} className="w-full h-full object-cover" />
                            ) : genderIcon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.name || d.ringId || `#${d.id}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{dSpecies?.commonName ?? "—"}</p>
                            {d.colorMutation && <p className="text-xs text-amber-600 truncate">{d.colorMutation}</p>}
                          </div>
                          <span className={`ml-auto text-base shrink-0 ${genderColor}`}>{genderIcon}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
