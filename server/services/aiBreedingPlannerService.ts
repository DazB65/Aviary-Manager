import { BirdService } from "./birdService";
import { BroodService } from "./broodService";
import { PairService } from "./pairService";
import { PedigreeService } from "./pedigreeService";
import { SpeciesService } from "./speciesService";

function birdLabel(bird: any) {
  return bird?.name || bird?.ringId || (bird?.id ? `Bird #${bird.id}` : "Unknown bird");
}

export class AIBreedingPlannerService {
  static async start(userId: number) {
    const [birdRows, speciesRows] = await Promise.all([
      BirdService.getBirdsByUser(userId),
      SpeciesService.getAllSpecies(userId),
    ]);
    const birds = birdRows.filter((bird: any) => bird.userId === undefined || bird.userId === userId);
    const species = speciesRows.filter((item: any) => item.userId === undefined || item.userId === null || item.userId === userId);

    const speciesCounts = species
      .map((item: any) => ({
        speciesId: item.id,
        commonName: item.commonName,
        availableMales: birds.filter((bird: any) => bird.speciesId === item.id && bird.gender === "male" && bird.status !== "deceased" && bird.status !== "sold").length,
        availableFemales: birds.filter((bird: any) => bird.speciesId === item.id && bird.gender === "female" && bird.status !== "deceased" && bird.status !== "sold").length,
      }))
      .filter((item) => item.availableMales > 0 || item.availableFemales > 0);

    return {
      goals: [
        "Improve hatch rate",
        "Avoid close related pairings",
        "Plan a colour mutation pairing",
        "Choose the best unpaired birds for this season",
      ],
      speciesCounts,
    };
  }

  static async recommend(userId: number, input: {
    goal?: string;
    speciesId?: number;
    season?: number;
    mutationInterest?: string;
    limit?: number;
  }) {
    const [birdRows, pairRows, broodRows, speciesRows] = await Promise.all([
      BirdService.getBirdsByUser(userId),
      PairService.getPairsByUser(userId),
      BroodService.getBroodsByUser(userId),
      SpeciesService.getAllSpecies(userId),
    ]);
    const birds = birdRows.filter((bird: any) => bird.userId === undefined || bird.userId === userId);
    const pairs = pairRows.filter((pair: any) => pair.userId === undefined || pair.userId === userId);
    const broods = broodRows.filter((brood: any) => brood.userId === undefined || brood.userId === userId);
    const species = speciesRows.filter((item: any) => item.userId === undefined || item.userId === null || item.userId === userId);

    const pairedIds = new Set(
      pairs
        .filter((pair: any) => pair.status === "active" || pair.status === "breeding")
        .flatMap((pair: any) => [pair.maleId, pair.femaleId])
    );

    const living = birds.filter((bird: any) =>
      bird.status !== "deceased" &&
      bird.status !== "sold" &&
      !pairedIds.has(bird.id) &&
      (!input.speciesId || bird.speciesId === input.speciesId)
    );

    const males = living.filter((bird: any) => bird.gender === "male");
    const females = living.filter((bird: any) => bird.gender === "female");
    const recommendations: any[] = [];

    for (const male of males) {
      for (const female of females) {
        if (male.speciesId !== female.speciesId) continue;

        const coefficient = await PedigreeService.calcInbreedingCoefficient(male.id, female.id, userId);
        const priorPair = pairs.find((pair: any) => pair.maleId === male.id && pair.femaleId === female.id);
        const priorBroods = priorPair ? broods.filter((brood: any) => brood.pairId === priorPair.id) : [];
        const eggsLaid = priorBroods.reduce((sum: number, brood: any) => sum + Number(brood.eggsLaid ?? 0), 0);
        const chicksSurvived = priorBroods.reduce((sum: number, brood: any) => sum + Number(brood.chicksSurvived ?? 0), 0);
        const mutationMatch = input.mutationInterest
          ? [male.colorMutation, female.colorMutation, male.genotype, female.genotype]
              .some((value) => String(value ?? "").toLowerCase().includes(input.mutationInterest!.toLowerCase()))
          : false;

        const score = 100
          - Math.min(40, Math.round((coefficient ?? 0) * 100))
          + (mutationMatch ? 10 : 0)
          + (chicksSurvived > 0 ? 8 : 0)
          - (priorBroods.length >= 2 && chicksSurvived === 0 ? 12 : 0);

        recommendations.push({
          male: { id: male.id, label: birdLabel(male), colorMutation: male.colorMutation, cageNumber: male.cageNumber },
          female: { id: female.id, label: birdLabel(female), colorMutation: female.colorMutation, cageNumber: female.cageNumber },
          species: species.find((item: any) => item.id === male.speciesId)?.commonName ?? "Unknown species",
          inbreedingCoefficient: coefficient ?? 0,
          priorClutches: priorBroods.length,
          priorEggsLaid: eggsLaid,
          priorChicksSurvived: chicksSurvived,
          score,
          reasoning: [
            "Both birds are unpaired, living, known male/female, and the same species.",
            coefficient && coefficient > 0 ? `Pedigree risk is ${Math.round(coefficient * 100)}%.` : "No close pedigree risk found in recorded ancestry.",
            mutationMatch ? "This pair matches the requested mutation interest." : null,
          ].filter(Boolean),
        });
      }
    }

    return {
      goal: input.goal ?? "Choose the best breeding candidates",
      season: input.season ?? new Date().getFullYear(),
      recommendations: recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit ?? 8),
    };
  }
}
