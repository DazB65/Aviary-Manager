import { BirdService } from "./birdService";
import { BroodService } from "./broodService";
import { EventService } from "./eventService";
import { PairService } from "./pairService";
import { SpeciesService } from "./speciesService";

type SearchScope = "all" | "birds" | "pairs" | "broods" | "eggs" | "events" | "species";

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function tokens(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function includesAll(haystack: string, needles: string[]) {
  return needles.length === 0 || needles.every((needle) => haystack.includes(needle));
}

function birdLabel(bird: any) {
  return bird?.name || bird?.ringId || (bird?.id ? `Bird #${bird.id}` : "Unknown bird");
}

function owned<T extends { userId?: number | null }>(rows: T[], userId: number): T[] {
  return rows.filter((row) => row.userId === undefined || row.userId === null || row.userId === userId);
}

export class AISearchService {
  static async search(userId: number, query: string, scope: SearchScope = "all") {
    const terms = tokens(query).slice(0, 12);
    const [birdRows, pairRows, broodRows, eggRows, eventRows, speciesRows] = await Promise.all([
      BirdService.getBirdsByUser(userId),
      PairService.getPairsByUser(userId),
      BroodService.getBroodsByUser(userId),
      BroodService.getEggsByUser(userId),
      EventService.getEventsByUser(userId),
      SpeciesService.getAllSpecies(userId),
    ]);
    const birds = owned(birdRows, userId);
    const pairs = owned(pairRows, userId);
    const broods = owned(broodRows, userId);
    const eggs = owned(eggRows, userId);
    const events = owned(eventRows, userId);
    const species = speciesRows.filter((item: any) => item.userId === undefined || item.userId === null || item.userId === userId);

    const birdMap = new Map(birds.map((bird: any) => [bird.id, bird]));
    const pairLabel = (pair: any) => `${birdLabel(birdMap.get(pair.maleId))} x ${birdLabel(birdMap.get(pair.femaleId))}`;
    const match = (fields: unknown[]) => includesAll(fields.map(normalize).join(" "), terms);
    const wants = (name: SearchScope) => scope === "all" || scope === name;

    const results = {
      birds: wants("birds")
        ? birds
            .filter((bird: any) => match([
              bird.name,
              bird.ringId,
              bird.gender,
              bird.status,
              bird.cageNumber,
              bird.colorMutation,
              bird.notes,
              species.find((item: any) => item.id === bird.speciesId)?.commonName,
            ]))
            .slice(0, 12)
            .map((bird: any) => ({
              id: bird.id,
              label: birdLabel(bird),
              gender: bird.gender,
              status: bird.status,
              cageNumber: bird.cageNumber,
              colorMutation: bird.colorMutation,
            }))
        : [],
      pairs: wants("pairs")
        ? pairs
            .filter((pair: any) => match([pairLabel(pair), pair.status, pair.season, pair.notes]))
            .slice(0, 12)
            .map((pair: any) => ({
              id: pair.id,
              label: pairLabel(pair),
              status: pair.status,
              season: pair.season,
            }))
        : [],
      broods: wants("broods")
        ? broods
            .filter((brood: any) => match([brood.status, brood.season, brood.notes, brood.layDate, brood.expectedHatchDate]))
            .slice(0, 12)
            .map((brood: any) => ({
              id: brood.id,
              pairId: brood.pairId,
              status: brood.status,
              eggsLaid: brood.eggsLaid ?? 0,
              expectedHatchDate: brood.expectedHatchDate,
            }))
        : [],
      eggs: wants("eggs")
        ? eggs
            .filter((egg: any) => match([egg.outcome, egg.notes, egg.eggNumber, egg.ringId]))
            .slice(0, 12)
            .map((egg: any) => ({
              id: egg.id,
              broodId: egg.broodId,
              eggNumber: egg.eggNumber,
              outcome: egg.outcome,
              ringId: egg.ringId,
            }))
        : [],
      events: wants("events")
        ? events
            .filter((event: any) => match([event.title, event.notes, event.eventType, event.eventDate, event.completed ? "completed" : "open"]))
            .slice(0, 12)
            .map((event: any) => ({
              id: event.id,
              title: event.title,
              date: event.eventDate,
              type: event.eventType,
              completed: event.completed ?? false,
            }))
        : [],
      species: wants("species")
        ? species
            .filter((item: any) => match([item.commonName, item.scientificName, item.category, item.nestType, item.sexingMethod]))
            .slice(0, 12)
            .map((item: any) => ({
              id: item.id,
              commonName: item.commonName,
              scientificName: item.scientificName,
              category: item.category,
              incubationDays: item.incubationDays,
            }))
        : [],
    };

    const counts = Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.length]));
    const total = Object.values(counts).reduce((sum, value) => sum + Number(value), 0);

    return {
      query,
      scope,
      counts,
      total,
      results,
      explanation: total === 0
        ? "No matching aviary records were found."
        : `Found ${total} matching record${total === 1 ? "" : "s"} across your aviary.`,
    };
  }
}
