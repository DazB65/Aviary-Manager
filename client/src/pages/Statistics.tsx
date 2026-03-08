import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart2, Bird, Egg, TrendingUp } from "lucide-react";
import { GenderIcon } from "@/components/ui/GenderIcon";

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: React.ReactNode }) {
  return (
    <div className="text-center p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Statistics() {
  const { data: birds } = trpc.birds.list.useQuery();
  const { data: pairs } = trpc.pairs.list.useQuery();
  const { data: broods } = trpc.broods.list.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();

  const speciesById = Object.fromEntries(speciesList.map(s => [s.id, s]));

  const aliveBirds = (birds ?? []).filter(b => !["deceased", "sold"].includes(b.status));
  const maleCount = aliveBirds.filter(b => b.gender === "male").length;
  const femaleCount = aliveBirds.filter(b => b.gender === "female").length;

  const activePairs = (pairs ?? []).filter(p => p.status === "active");

  const allBroods = broods ?? [];
  const totalEggs = allBroods.reduce((sum, b) => sum + (b.eggsLaid ?? 0), 0);
  const totalHatched = allBroods.reduce((sum, b) => sum + (b.chicksSurvived ?? 0), 0);
  const overallHatchRate = totalEggs > 0 ? Math.round((totalHatched / totalEggs) * 100) : 0;

  // Group broods by season
  const seasonMap = new Map<string, typeof allBroods>();
  allBroods.forEach(b => {
    const season = b.season ?? "Unknown";
    if (!seasonMap.has(season)) seasonMap.set(season, []);
    seasonMap.get(season)!.push(b);
  });
  const seasons = Array.from(seasonMap.entries()).sort(([a], [b]) => b.localeCompare(a));

  // Species breakdown
  const speciesCountMap = new Map<number, number>();
  aliveBirds.forEach(b => {
    speciesCountMap.set(b.speciesId, (speciesCountMap.get(b.speciesId) ?? 0) + 1);
  });
  const topSpecies = Array.from(speciesCountMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, count]) => ({ name: speciesById[id]?.commonName ?? `Species #${id}`, count }));

  // Cage breakdown
  const cageMap = new Map<string, number>();
  aliveBirds.forEach(b => {
    if (b.cageNumber) cageMap.set(b.cageNumber, (cageMap.get(b.cageNumber) ?? 0) + 1);
  });
  const topCages = Array.from(cageMap.entries()).sort(([, a], [, b]) => b - a).slice(0, 6);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart2 className="h-7 w-7 text-primary" />
            Statistics
          </h1>
          <p className="text-muted-foreground mt-1">An overview of your aviary performance.</p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBlock label="Live Birds" value={aliveBirds.length} sub={<span className="flex items-center justify-center gap-1.5">{maleCount} <GenderIcon gender="male" className="w-3.5 h-3.5" /> · {femaleCount} <GenderIcon gender="female" className="w-3.5 h-3.5" /></span>} />
          <StatBlock label="Active Pairs" value={activePairs.length} />
          <StatBlock label="Total Broods" value={allBroods.length} />
          <StatBlock label="Hatch Rate" value={`${overallHatchRate}%`} sub={`${totalHatched} / ${totalEggs} eggs`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Season breakdown */}
          <Card className="border border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                Season Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seasons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No breeding data yet.</p>
              ) : (
                <div className="space-y-3">
                  {seasons.map(([season, sbroods]) => {
                    const eggs = sbroods.reduce((s, b) => s + (b.eggsLaid ?? 0), 0);
                    const hatched = sbroods.reduce((s, b) => s + (b.chicksSurvived ?? 0), 0);
                    const rate = eggs > 0 ? Math.round((hatched / eggs) * 100) : 0;
                    return (
                      <div key={season} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{season} Season</p>
                          <p className="text-xs text-muted-foreground">{sbroods.length} brood{sbroods.length !== 1 ? "s" : ""} · {eggs} eggs</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{hatched} hatched</p>
                          <p className="text-xs text-muted-foreground">{rate}% hatch rate</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cage occupancy */}
          <Card className="border border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bird className="h-4 w-4 text-amber-500" />
                Cage Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No cage assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {topCages.map(([cage, count]) => (
                    <div key={cage} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-20 shrink-0">Cage {cage}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.round((count / aliveBirds.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  ))}
                  {aliveBirds.filter(b => !b.cageNumber).length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-20 shrink-0 text-muted-foreground">Unassigned</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-muted-foreground/40 h-2 rounded-full"
                          style={{ width: `${Math.round((aliveBirds.filter(b => !b.cageNumber).length / aliveBirds.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{aliveBirds.filter(b => !b.cageNumber).length}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Species breakdown */}
        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bird className="h-4 w-4 text-primary" />
              Species Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSpecies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No birds added yet.</p>
            ) : (
              <div className="space-y-2">
                {topSpecies.map(({ name, count }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-40 shrink-0 truncate">{name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.round((count / aliveBirds.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Egg outcomes */}
        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Egg className="h-4 w-4 text-teal-500" />
              Egg Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBlock label="Eggs Laid" value={totalEggs} />
              <StatBlock label="Hatched" value={totalHatched} />
              <StatBlock label="Unhatched" value={totalEggs - totalHatched} />
              <StatBlock label="Hatch Rate" value={`${overallHatchRate}%`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

