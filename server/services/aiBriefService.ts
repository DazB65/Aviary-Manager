import { BirdService } from "./birdService";
import { BroodService } from "./broodService";
import { EventService } from "./eventService";
import { PairService } from "./pairService";
import { StatsService } from "./statsService";

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function birdLabel(bird: any) {
  return bird?.name || bird?.ringId || (bird?.id ? `Bird #${bird.id}` : "Unknown bird");
}

export class AIBriefService {
  static async getDailyBrief(userId: number, today = new Date()) {
    const todayKey = toDateOnly(today)!;
    const soonKey = toDateOnly(addDays(today, 7))!;

    const [stats, birdRows, pairRows, broodRows, eventRows] = await Promise.all([
      StatsService.getDashboardStatsByUser(userId),
      BirdService.getBirdsByUser(userId),
      PairService.getPairsByUser(userId),
      BroodService.getBroodsByUser(userId),
      EventService.getEventsByUser(userId),
    ]);
    const birds = birdRows.filter((bird: any) => bird.userId === undefined || bird.userId === userId);
    const pairs = pairRows.filter((pair: any) => pair.userId === undefined || pair.userId === userId);
    const broods = broodRows.filter((brood: any) => brood.userId === undefined || brood.userId === userId);
    const events = eventRows.filter((event: any) => event.userId === undefined || event.userId === userId);

    const birdMap = new Map(birds.map((bird: any) => [bird.id, bird]));
    const pairLabel = (pairId: number) => {
      const pair = pairs.find((candidate: any) => candidate.id === pairId);
      if (!pair) return `Pair #${pairId}`;
      return `${birdLabel(birdMap.get(pair.maleId))} x ${birdLabel(birdMap.get(pair.femaleId))}`;
    };

    const openEvents = events.filter((event: any) => !event.completed);
    const overdueEvents = openEvents
      .filter((event: any) => toDateOnly(event.eventDate)! < todayKey)
      .slice(0, 10)
      .map((event: any) => ({
        id: event.id,
        title: event.title,
        date: toDateOnly(event.eventDate),
        type: event.eventType,
      }));

    const todayEvents = openEvents
      .filter((event: any) => toDateOnly(event.eventDate) === todayKey)
      .slice(0, 10)
      .map((event: any) => ({
        id: event.id,
        title: event.title,
        type: event.eventType,
      }));

    const activeBroods = broods.filter((brood: any) => brood.status === "incubating");
    const hatchesDue = activeBroods
      .filter((brood: any) => {
        const hatchDate = toDateOnly(brood.expectedHatchDate);
        return hatchDate && hatchDate >= todayKey && hatchDate <= soonKey;
      })
      .slice(0, 10)
      .map((brood: any) => ({
        broodId: brood.id,
        pair: pairLabel(brood.pairId),
        date: toDateOnly(brood.expectedHatchDate),
        eggsLaid: brood.eggsLaid ?? 0,
      }));

    const fertilityChecksDue = activeBroods
      .filter((brood: any) => toDateOnly(brood.fertilityCheckDate) === todayKey)
      .slice(0, 10)
      .map((brood: any) => ({
        broodId: brood.id,
        pair: pairLabel(brood.pairId),
        eggsLaid: brood.eggsLaid ?? 0,
      }));

    const activePairs = pairs.filter((pair: any) => pair.status === "active" || pair.status === "breeding").length;
    const alerts = [
      overdueEvents.length > 0 ? `${overdueEvents.length} overdue event${overdueEvents.length === 1 ? "" : "s"}` : null,
      hatchesDue.length > 0 ? `${hatchesDue.length} hatch${hatchesDue.length === 1 ? "" : "es"} due within 7 days` : null,
      fertilityChecksDue.length > 0 ? `${fertilityChecksDue.length} fertility check${fertilityChecksDue.length === 1 ? "" : "s"} due today` : null,
    ].filter(Boolean);

    return {
      date: todayKey,
      summary: {
        totalBirds: stats.totalBirds,
        activePairs,
        activeBroods: activeBroods.length,
        overdueEvents: overdueEvents.length,
        hatchesDue: hatchesDue.length,
        fertilityChecksDue: fertilityChecksDue.length,
      },
      overdueEvents,
      todayEvents,
      hatchesDue,
      fertilityChecksDue,
      alerts,
    };
  }
}
