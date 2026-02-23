import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bird, Calendar, Tag, Dna } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";

type BirdNode = {
  id: number;
  name: string | null;
  ringId: string | null;
  gender: string;
  colorMutation: string | null;
  photoUrl: string | null;
  speciesId: number;
};

function PedigreeCard({ bird, speciesName, level }: { bird: BirdNode | null | undefined; speciesName?: string; level: number }) {
  const [, setLocation] = useLocation();
  if (!bird) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-border p-3 text-center text-xs text-muted-foreground ${level === 0 ? "min-w-44" : "min-w-36"}`}>
        Unknown
      </div>
    );
  }
  return (
    <button
      onClick={() => setLocation(`/birds/${bird.id}`)}
      className={`rounded-xl border border-border bg-white shadow-card hover:shadow-elevated hover:border-primary/40 transition-all p-3 text-left ${level === 0 ? "min-w-44" : "min-w-36"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {bird.photoUrl ? (
          <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-sm">
            {bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "🐦"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{bird.name || bird.ringId || `#${bird.id}`}</p>
          <p className="text-xs text-muted-foreground truncate">{speciesName ?? "—"}</p>
        </div>
      </div>
      {bird.colorMutation && <p className="text-xs text-amber-600 truncate">{bird.colorMutation}</p>}
      <p className="text-xs text-muted-foreground">{bird.gender === "male" ? "♂ Male" : bird.gender === "female" ? "♀ Female" : "Unknown"}</p>
    </button>
  );
}

export default function BirdDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const birdId = Number(params.id);

  const { data: bird, isLoading } = trpc.birds.get.useQuery({ id: birdId });
  const { data: allBirds = [] } = trpc.birds.list.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));
  const birdMap = Object.fromEntries(allBirds.map(b => [b.id, b]));

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
  const father = bird.fatherId ? birdMap[bird.fatherId] : null;
  const mother = bird.motherId ? birdMap[bird.motherId] : null;
  const patGrandfather = father?.fatherId ? birdMap[father.fatherId] : null;
  const patGrandmother = father?.motherId ? birdMap[father.motherId] : null;
  const matGrandfather = mother?.fatherId ? birdMap[mother.fatherId] : null;
  const matGrandmother = mother?.motherId ? birdMap[mother.motherId] : null;

  const dobStr = bird.dateOfBirth
    ? format(bird.dateOfBirth instanceof Date ? bird.dateOfBirth : new Date(String(bird.dateOfBirth)), "dd MMM yyyy")
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
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

        {/* Pedigree Tree */}
        <Card className="border border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Dna className="h-4 w-4 text-primary" />
              Pedigree — 3 Generations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-0 min-w-max">
                {/* Subject */}
                <div className="flex flex-col items-center">
                  <PedigreeCard bird={bird as BirdNode} speciesName={species?.commonName} level={0} />
                </div>

                {/* Connector */}
                <div className="flex flex-col items-center justify-center h-full px-4">
                  <div className="flex flex-col gap-12">
                    <div className="w-8 h-px bg-border" />
                    <div className="w-8 h-px bg-border" />
                  </div>
                </div>

                {/* Parents */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-0">
                    <PedigreeCard bird={father as BirdNode | null} speciesName={father ? speciesMap[father.speciesId]?.commonName : undefined} level={1} />
                    {/* Connector to grandparents */}
                    <div className="flex flex-col items-center justify-center px-4">
                      <div className="flex flex-col gap-6">
                        <div className="w-6 h-px bg-border" />
                        <div className="w-6 h-px bg-border" />
                      </div>
                    </div>
                    {/* Paternal grandparents */}
                    <div className="flex flex-col gap-3">
                      <PedigreeCard bird={patGrandfather as BirdNode | null} speciesName={patGrandfather ? speciesMap[patGrandfather.speciesId]?.commonName : undefined} level={2} />
                      <PedigreeCard bird={patGrandmother as BirdNode | null} speciesName={patGrandmother ? speciesMap[patGrandmother.speciesId]?.commonName : undefined} level={2} />
                    </div>
                  </div>

                  <div className="flex items-center gap-0">
                    <PedigreeCard bird={mother as BirdNode | null} speciesName={mother ? speciesMap[mother.speciesId]?.commonName : undefined} level={1} />
                    {/* Connector to grandparents */}
                    <div className="flex flex-col items-center justify-center px-4">
                      <div className="flex flex-col gap-6">
                        <div className="w-6 h-px bg-border" />
                        <div className="w-6 h-px bg-border" />
                      </div>
                    </div>
                    {/* Maternal grandparents */}
                    <div className="flex flex-col gap-3">
                      <PedigreeCard bird={matGrandfather as BirdNode | null} speciesName={matGrandfather ? speciesMap[matGrandfather.speciesId]?.commonName : undefined} level={2} />
                      <PedigreeCard bird={matGrandmother as BirdNode | null} speciesName={matGrandmother ? speciesMap[matGrandmother.speciesId]?.commonName : undefined} level={2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!father && !mother && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                No parents recorded. Edit this bird to add parent information.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
