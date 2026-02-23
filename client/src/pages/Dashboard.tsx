import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bird, CalendarDays, Egg, Heart, TrendingUp, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

function formatDateLabel(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "—";
  const d = typeof dateVal === "string" ? parseISO(dateVal) : dateVal;
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "dd MMM yyyy");
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-elevated transition-all duration-200 border-0 overflow-hidden ${onClick ? "hover:-translate-y-0.5" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`${gradient} p-5 flex items-center justify-between`}>
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
            <p className="text-white text-3xl font-bold">{value}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: broods } = trpc.broods.list.useQuery();
  const { data: events } = trpc.events.list.useQuery();
  const { data: birds } = trpc.birds.list.useQuery();

  const upcomingBroods = (broods ?? [])
    .filter(b => b.status === "incubating" && b.expectedHatchDate)
    .sort((a, b) => {
      const da = a.expectedHatchDate instanceof Date ? a.expectedHatchDate : new Date(String(a.expectedHatchDate));
      const db2 = b.expectedHatchDate instanceof Date ? b.expectedHatchDate : new Date(String(b.expectedHatchDate));
      return da.getTime() - db2.getTime();
    })
    .slice(0, 5);

  const upcomingEvents = (events ?? [])
    .filter(e => !e.completed)
    .slice(0, 5);

  const recentBirds = (birds ?? []).slice(0, 4);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back — here's your aviary at a glance.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Bird}
            label="Total Birds"
            value={statsLoading ? "—" : (stats?.totalBirds ?? 0)}
            gradient="bg-gradient-to-br from-amber-400 to-orange-500"
            onClick={() => setLocation("/birds")}
          />
          <StatCard
            icon={Heart}
            label="Active Pairs"
            value={statsLoading ? "—" : (stats?.activePairs ?? 0)}
            gradient="bg-gradient-to-br from-rose-400 to-pink-500"
            onClick={() => setLocation("/pairs")}
          />
          <StatCard
            icon={Egg}
            label="Eggs Incubating"
            value={statsLoading ? "—" : (stats?.eggsIncubating ?? 0)}
            gradient="bg-gradient-to-br from-teal-400 to-cyan-500"
            onClick={() => setLocation("/broods")}
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming Events"
            value={statsLoading ? "—" : (stats?.upcomingEvents ?? 0)}
            gradient="bg-gradient-to-br from-violet-400 to-purple-500"
            onClick={() => setLocation("/events")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Hatches */}
          <Card className="border border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Egg className="h-4 w-4 text-teal-500" />
                Upcoming Hatches
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/broods")} className="text-xs text-muted-foreground hover:text-foreground">
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingBroods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Egg className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No eggs currently incubating
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBroods.map(b => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">Pair #{b.pairId}</p>
                        <p className="text-xs text-muted-foreground">{b.eggsLaid} egg{b.eggsLaid !== 1 ? "s" : ""} · Laid {formatDateLabel(b.layDate)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">
                          Hatch {formatDateLabel(b.expectedHatchDate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-500" />
                Upcoming Events
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/events")} className="text-xs text-muted-foreground hover:text-foreground">
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No upcoming events
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{e.eventType}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-violet-200 text-violet-700 bg-violet-50">
                        {formatDateLabel(e.eventDate)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Birds */}
        <Card className="border border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bird className="h-4 w-4 text-amber-500" />
              Recent Birds
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/birds")} className="text-xs text-muted-foreground hover:text-foreground">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBirds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Bird className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No birds added yet.{" "}
                <button onClick={() => setLocation("/birds")} className="text-primary underline">Add your first bird</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentBirds.map(bird => (
                  <button
                    key={bird.id}
                    onClick={() => setLocation(`/birds/${bird.id}`)}
                    className="text-left rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-2 text-lg">
                      {bird.photoUrl ? (
                        <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "🐦"
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{bird.name || bird.ringId || `Bird #${bird.id}`}</p>
                    <p className="text-xs text-muted-foreground truncate">{bird.colorMutation || "—"}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
