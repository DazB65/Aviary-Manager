import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bird, Home } from "lucide-react";
import { useLocation } from "wouter";
import { GenderIcon } from "@/components/ui/GenderIcon";

export default function Cages() {
  const [, setLocation] = useLocation();
  const { data: birds, isLoading } = trpc.birds.list.useQuery();

  const aliveBirds = (birds ?? []).filter(b => ["alive", "breeding", "resting"].includes(b.status));

  // Group birds by cage number
  const cageMap = new Map<string, typeof aliveBirds>();
  const unassigned: typeof aliveBirds = [];

  aliveBirds.forEach(bird => {
    if (bird.cageNumber) {
      const key = bird.cageNumber;
      if (!cageMap.has(key)) cageMap.set(key, []);
      cageMap.get(key)!.push(bird);
    } else {
      unassigned.push(bird);
    }
  });

  const sortedCages = Array.from(cageMap.entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Home className="h-7 w-7 text-primary" />
            Cages
          </h1>
          <p className="text-muted-foreground mt-1">Your birds organised by cage number.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : sortedCages.length === 0 && unassigned.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Bird className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No birds yet.</p>
              <Button className="mt-4" onClick={() => setLocation("/birds")}>Add your first bird</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedCages.map(([cageNumber, cageBirds]) => (
              <Card key={cageNumber} className="border border-border shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      🏠 Cage {cageNumber}
                    </span>
                    <Badge variant="secondary" className="text-xs">{cageBirds.length} bird{cageBirds.length !== 1 ? "s" : ""}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cageBirds.map(bird => (
                      <button
                        key={bird.id}
                        onClick={() => setLocation(`/birds/${bird.id}`)}
                        className="text-left rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <div className={`w-10 h-10 rounded-lg ${bird.gender === "male" ? "bg-blue-50" : bird.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center mb-2 text-lg overflow-hidden`}>
                          {bird.photoUrl
                            ? <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover rounded-lg" />
                            : <GenderIcon gender={bird.gender} className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-semibold truncate">{bird.name || bird.ringId || `Bird #${bird.id}`}</p>
                        <p className={`text-sm ${bird.gender === "male" ? "text-blue-600" : bird.gender === "female" ? "text-pink-600" : "text-muted-foreground"}`}>
                          {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "Unknown"}
                        </p>
                        {bird.colorMutation
                          ? <p className="text-sm text-amber-600 truncate">{bird.colorMutation}</p>
                          : <p className="text-sm text-muted-foreground">—</p>}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {unassigned.length > 0 && (
              <Card className="border border-dashed border-border shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                    <Bird className="h-4 w-4" />
                    No cage assigned
                    <Badge variant="outline" className="text-xs">{unassigned.length} bird{unassigned.length !== 1 ? "s" : ""}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {unassigned.map(bird => (
                      <button
                        key={bird.id}
                        onClick={() => setLocation(`/birds/${bird.id}`)}
                        className="text-left rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <div className={`w-10 h-10 rounded-lg ${bird.gender === "male" ? "bg-blue-50" : bird.gender === "female" ? "bg-pink-50" : "bg-amber-50"} flex items-center justify-center mb-2 text-lg overflow-hidden`}>
                          {bird.photoUrl
                            ? <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover rounded-lg" />
                            : <GenderIcon gender={bird.gender} className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-semibold truncate">{bird.name || bird.ringId || `Bird #${bird.id}`}</p>
                        <p className={`text-sm ${bird.gender === "male" ? "text-blue-600" : bird.gender === "female" ? "text-pink-600" : "text-muted-foreground"}`}>
                          {bird.gender === "male" ? "Male" : bird.gender === "female" ? "Female" : "Unknown"}
                        </p>
                        {bird.colorMutation
                          ? <p className="text-sm text-amber-600 truncate">{bird.colorMutation}</p>
                          : <p className="text-sm text-muted-foreground">—</p>}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

