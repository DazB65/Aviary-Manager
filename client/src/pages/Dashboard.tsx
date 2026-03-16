import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bird, CalendarDays, CheckCircle2, ChevronRight, Circle, Egg, Heart, TrendingUp, X, Activity } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from "date-fns";
import { GenderIcon } from "@/components/ui/GenderIcon";

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
        <div className={`${gradient} p-5 flex items-center justify-between min-h-[116px]`}>
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
              <div className="flex items-end gap-3 mt-1">
                <p className="text-white text-3xl font-bold leading-none">{value}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: broods } = trpc.broods.list.useQuery();
  const { data: events } = trpc.events.list.useQuery();
  const { data: birds } = trpc.birds.list.useQuery();
  const { data: pairs } = trpc.pairs.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  const breedingYear = settings?.breedingYear ?? new Date().getFullYear();
  const { data: seasonStats } = trpc.dashboard.seasonStats.useQuery({ year: breedingYear });

  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(() =>
    localStorage.getItem("getting-started-dismissed") === "true"
  );

  const favouriteSpeciesIds: number[] = (() => {
    try { return JSON.parse(settings?.favouriteSpeciesIds ?? "[]"); } catch { return []; }
  })();

  const onboardingTasks = [
    { label: "Set your favourite species", done: favouriteSpeciesIds.length > 0, action: () => setLocation("/settings") },
    { label: "Add your first bird", done: (birds?.length ?? 0) > 0, action: () => setLocation("/birds") },
    { label: "Create a breeding pair", done: (pairs?.length ?? 0) > 0, action: () => setLocation("/pairs") },
    { label: "Assign a cage number", done: (birds ?? []).some(b => b.cageNumber), action: () => setLocation("/cages") },
    { label: "Explore your statistics", done: (broods?.length ?? 0) > 0, action: () => setLocation("/statistics") },
  ];
  const allOnboardingDone = onboardingTasks.every(t => t.done);
  const showGettingStarted = !gettingStartedDismissed && !allOnboardingDone;

  function dismissGettingStarted() {
    localStorage.setItem("getting-started-dismissed", "true");
    setGettingStartedDismissed(true);
  }

  const upcomingBroods = (broods ?? [])
    .filter(b => b.status === "incubating")
    .sort((a, b) => {
      if (!a.expectedHatchDate && !b.expectedHatchDate) return 0;
      if (!a.expectedHatchDate) return 1; // push unknown to bottom
      if (!b.expectedHatchDate) return -1;

      const da = new Date(String(a.expectedHatchDate));
      const db2 = new Date(String(b.expectedHatchDate));
      return da.getTime() - db2.getTime();
    })
    .slice(0, 30);

  const upcomingEvents = (events ?? [])
    .filter(e => {
      if (e.completed || !e.eventDate) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const eventDate = new Date(e.eventDate);
      eventDate.setHours(0, 0, 0, 0);

      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .reduce((acc: any[], curr: any) => {
      // If it's part of a series and we already have an event from that series, skip it.
      if (curr.seriesId && acc.some(e => e.seriesId === curr.seriesId)) {
        return acc;
      }
      acc.push(curr);
      return acc;
    }, [])
    .slice(0, 5);

  const birdMap = Object.fromEntries((birds ?? []).map(b => [b.id, b]));

  function getPairLabel(pairId: number) {
    const pair = pairs?.find(p => p.id === pairId);
    if (!pair) return `Pair #${pairId}`;
    const male = birdMap[pair.maleId];
    const female = birdMap[pair.femaleId];
    const mName = male?.name || male?.ringId || `#${pair.maleId}`;
    const fName = female?.name || female?.ringId || `#${pair.femaleId}`;
    const cageInfo = male?.cageNumber || female?.cageNumber ? ` (Cage ${male?.cageNumber || female?.cageNumber})` : "";
    return `${mName} × ${fName}${cageInfo}`;
  }

  type ActivityItem = {
    id: string;
    emoji: string;
    label: string;
    sublabel?: string;
    timestamp: Date;
    onClick: () => void;
  };

  const recentActivity: ActivityItem[] = [
    ...(birds ?? []).map(b => ({
      id: `bird-${b.id}`,
      emoji: "🐦",
      label: `Bird added: ${b.name || b.ringId || `#${b.id}`}`,
      sublabel: b.colorMutation || undefined,
      timestamp: new Date(b.createdAt),
      onClick: () => setLocation(`/birds/${b.id}`),
    })),
    ...(pairs ?? []).map(p => ({
      id: `pair-${p.id}`,
      emoji: "🔗",
      label: `Pair created: ${getPairLabel(p.id)}`,
      timestamp: new Date(p.createdAt),
      onClick: () => setLocation("/pairs"),
    })),
    ...(broods ?? []).map(b => ({
      id: `brood-${b.id}`,
      emoji: "🥚",
      label: `Clutch logged for ${getPairLabel(b.pairId)}`,
      sublabel: b.eggsLaid ? `${b.eggsLaid} egg${b.eggsLaid !== 1 ? "s" : ""}` : undefined,
      timestamp: new Date(b.createdAt),
      onClick: () => setLocation("/broods"),
    })),
    ...(events ?? []).map(e => ({
      id: `event-${e.id}`,
      emoji: "📅",
      label: `Event scheduled: ${e.title}`,
      sublabel: e.eventType,
      timestamp: new Date(e.createdAt),
      onClick: () => setLocation("/events"),
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-muted-foreground">Welcome back, {user?.name?.split(" ")[0] || "there"} — here's your aviary at a glance.</p>
            <Badge
              className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 cursor-pointer text-xs"
              onClick={() => setLocation("/settings")}
            >
              🐦 {breedingYear} Season
            </Badge>
          </div>
        </div>

        {/* Getting Started */}
        {showGettingStarted && (
          <Card id="tour-getting-started" className="border border-orange-200 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-orange-50 rounded-t-lg">
              <CardTitle className="text-base font-semibold text-orange-800">🚀 Getting Started</CardTitle>
              <Button variant="ghost" size="sm" onClick={dismissGettingStarted} className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm text-muted-foreground mb-3">Complete these steps to set up your aviary:</p>
              <div className="space-y-2">
                {onboardingTasks.map(task => (
                  <button
                    key={task.label}
                    onClick={task.action}
                    className="flex items-center gap-3 w-full text-left text-sm hover:text-primary transition-colors"
                  >
                    {task.done
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <span className={task.done ? "line-through text-muted-foreground" : ""}>{task.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div id="tour-dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer hover:shadow-elevated transition-all duration-200 border-0 overflow-hidden hover:-translate-y-0.5`}
            onClick={() => setLocation("/birds")}
          >
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-5 flex items-center justify-between min-h-[116px]">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">Total Birds</p>
                    <div className="flex items-end gap-3 mt-1">
                      <p className="text-white text-3xl font-bold leading-none">{statsLoading ? "—" : (stats?.totalBirds ?? 0)}</p>
                      {!statsLoading && stats && (
                        <div className="flex gap-2 text-white/90 text-xs font-medium tracking-wide pb-0.5">
                          <span className="flex items-center gap-1"><GenderIcon gender="male" className="w-3 h-3" /> {stats.totalMales}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><GenderIcon gender="female" className="w-3 h-3" /> {stats.totalFemales}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-xl p-3 shrink-0">
                  <Bird className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <StatCard
            icon={Heart}
            label="Breeding Pairs"
            value={statsLoading ? "—" : (stats?.activePairs ?? 0)}
            gradient="bg-gradient-to-br from-orange-500 to-red-400"
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
            gradient="bg-gradient-to-br from-cyan-400 to-teal-500"
            onClick={() => setLocation("/events")}
          />
        </div>

        {/* Season Summary */}
        <Card className="border border-teal-200 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-500" />
              🌱 {breedingYear} Season Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { label: "Pairs", value: seasonStats?.pairs ?? 0 },
                { label: "Broods", value: seasonStats?.broods ?? 0 },
                { label: "Incubating", value: seasonStats?.incubating ?? 0 },
                { label: "Total Eggs", value: seasonStats?.totalEggs ?? 0 },
                { label: "Hatched", value: seasonStats?.hatched ?? 0 },
                { label: "Hatch Rate", value: `${seasonStats?.hatchRate ?? 0}%` },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {upcomingBroods.map(b => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{getPairLabel(b.pairId)}</p>
                        <p className="text-xs text-muted-foreground">{b.eggsLaid} egg{b.eggsLaid !== 1 ? "s" : ""} {b.layDate ? `· Laid ${formatDateLabel(b.layDate)}` : "· No lay date"}</p>
                      </div>
                      <div className="text-right">
                        {b.expectedHatchDate ? (
                          <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">
                            Hatch {formatDateLabel(b.expectedHatchDate)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-slate-50">
                            Unknown Hatch
                          </Badge>
                        )}
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

        {/* Recent Activity */}
        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No activity yet — start by adding birds or pairs.
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.map(item => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.label}</p>
                        {item.sublabel && <p className="text-xs text-muted-foreground capitalize truncate">{item.sublabel}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
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
