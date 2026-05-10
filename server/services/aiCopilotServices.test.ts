import { beforeEach, describe, expect, it, vi } from "vitest";
import { AISearchService } from "./aiSearchService";
import { AIBriefService } from "./aiBriefService";
import { AIBreedingPlannerService } from "./aiBreedingPlannerService";
import { BirdService } from "./birdService";
import { PairService } from "./pairService";
import { BroodService } from "./broodService";
import { EventService } from "./eventService";
import { SpeciesService } from "./speciesService";
import { StatsService } from "./statsService";
import { PedigreeService } from "./pedigreeService";

vi.mock("./birdService", () => ({ BirdService: { getBirdsByUser: vi.fn() } }));
vi.mock("./pairService", () => ({ PairService: { getPairsByUser: vi.fn() } }));
vi.mock("./broodService", () => ({
  BroodService: {
    getBroodsByUser: vi.fn(),
    getEggsByUser: vi.fn(),
  },
}));
vi.mock("./eventService", () => ({ EventService: { getEventsByUser: vi.fn() } }));
vi.mock("./speciesService", () => ({ SpeciesService: { getAllSpecies: vi.fn() } }));
vi.mock("./statsService", () => ({ StatsService: { getDashboardStatsByUser: vi.fn() } }));
vi.mock("./pedigreeService", () => ({ PedigreeService: { calcInbreedingCoefficient: vi.fn() } }));

const USER_ID = 7;
const OTHER_USER_ID = 99;

const birds = [
  { id: 1, userId: USER_ID, speciesId: 1, name: "Blue Hen", ringId: "A1", gender: "female", status: "alive", cageNumber: "4", colorMutation: "blue", notes: "" },
  { id: 2, userId: USER_ID, speciesId: 1, name: "Green Cock", ringId: "A2", gender: "male", status: "alive", cageNumber: "5", colorMutation: "green", notes: "" },
  { id: 3, userId: OTHER_USER_ID, speciesId: 1, name: "Other Blue Hen", ringId: "B1", gender: "female", status: "alive", cageNumber: "4", colorMutation: "blue", notes: "" },
];

const pairs = [
  { id: 10, userId: USER_ID, maleId: 2, femaleId: 1, status: "retired", season: 2026, notes: "blue goal" },
  { id: 11, userId: OTHER_USER_ID, maleId: 2, femaleId: 3, status: "active", season: 2026, notes: "blue goal" },
];

const broods = [
  { id: 20, userId: USER_ID, pairId: 10, status: "incubating", eggsLaid: 4, fertilityCheckDate: "2026-05-10", expectedHatchDate: "2026-05-12", chicksSurvived: 0 },
  { id: 21, userId: OTHER_USER_ID, pairId: 11, status: "incubating", eggsLaid: 5, fertilityCheckDate: "2026-05-10", expectedHatchDate: "2026-05-12", chicksSurvived: 0 },
];

const events = [
  { id: 30, userId: USER_ID, title: "Band chicks", eventDate: "2026-05-09", eventType: "banding", completed: false },
  { id: 31, userId: OTHER_USER_ID, title: "Other overdue", eventDate: "2026-05-09", eventType: "other", completed: false },
];

const species = [
  { id: 1, userId: null, commonName: "Gouldian Finch", scientificName: "Chloebia gouldiae", category: "Finch", incubationDays: 14 },
];

describe("AI copilot services", () => {
  beforeEach(() => {
    vi.mocked(BirdService.getBirdsByUser).mockResolvedValue(birds as any);
    vi.mocked(PairService.getPairsByUser).mockResolvedValue(pairs as any);
    vi.mocked(BroodService.getBroodsByUser).mockResolvedValue(broods as any);
    vi.mocked(BroodService.getEggsByUser).mockResolvedValue([
      { id: 40, userId: USER_ID, broodId: 20, eggNumber: 1, outcome: "fertile", notes: "blue line", ringId: null },
      { id: 41, userId: OTHER_USER_ID, broodId: 21, eggNumber: 1, outcome: "fertile", notes: "blue line", ringId: null },
    ] as any);
    vi.mocked(EventService.getEventsByUser).mockResolvedValue(events as any);
    vi.mocked(SpeciesService.getAllSpecies).mockResolvedValue(species as any);
    vi.mocked(StatsService.getDashboardStatsByUser).mockResolvedValue({ totalBirds: 2 } as any);
    vi.mocked(PedigreeService.calcInbreedingCoefficient).mockResolvedValue(0);
  });

  it("natural-language search only returns records for the requested user", async () => {
    const result = await AISearchService.search(USER_ID, "blue", "all");

    expect(BirdService.getBirdsByUser).toHaveBeenCalledWith(USER_ID);
    expect(result.results.birds.map((bird) => bird.id)).toEqual([1]);
    expect(result.results.pairs.map((pair) => pair.id)).toEqual([10]);
    expect(result.results.eggs.map((egg) => egg.id)).toEqual([40]);
    expect(result.results.events.map((event) => event.id)).not.toContain(31);
  });

  it("daily brief ignores non-owned rows even if a lower service returns them", async () => {
    const brief = await AIBriefService.getDailyBrief(USER_ID, new Date("2026-05-10T12:00:00Z"));

    expect(brief.summary.overdueEvents).toBe(1);
    expect(brief.summary.hatchesDue).toBe(1);
    expect(brief.summary.fertilityChecksDue).toBe(1);
    expect(brief.overdueEvents.map((event) => event.id)).toEqual([30]);
    expect(brief.hatchesDue.map((brood) => brood.broodId)).toEqual([20]);
  });

  it("breeding planner recommends only owned birds", async () => {
    const plan = await AIBreedingPlannerService.recommend(USER_ID, { limit: 10 });

    expect(plan.recommendations).toHaveLength(1);
    expect(plan.recommendations[0].male.id).toBe(2);
    expect(plan.recommendations[0].female.id).toBe(1);
  });
});
