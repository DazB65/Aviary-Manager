import {
  type BirdGenotype,
  type GeneticsPack,
  type GeneticsTrait,
  GenotypeState,
  type Mutation,
  type OffspringProbability,
  InheritanceType,
} from "./types";

type OffspringSex = "male" | "female";
type ProbabilityOutcome<T> = { value: T; probability: number };
type CombinedOutcome = { descriptions: string[]; probability: number };

export function describeVisualPhenotype(
  sex: OffspringSex | "unknown",
  genotype: BirdGenotype,
  pack: GeneticsPack
): string[] {
  const normalizedSex: OffspringSex = sex === "female" ? "female" : "male";

  return pack.traits.map((trait) => {
    const [defaultMutation, ...variableMutations] = trait.mutations;
    const expressedMutations = variableMutations
      .map((mutation) =>
        describeMutationPhenotype(
          normalizedSex,
          genotype[mutation.id] ?? GenotypeState.WILD_TYPE,
          mutation
        )
      )
      .filter((value): value is string => Boolean(value));

    return `${trait.traitName}: ${
      expressedMutations.length > 0 ? expressedMutations.join(" + ") : defaultMutation.name
    }`;
  });
}

export function calculateOffspringProbabilities(
  maleGenotype: BirdGenotype,
  femaleGenotype: BirdGenotype,
  pack: GeneticsPack
): OffspringProbability[] {
  const totals = new Map<string, number>();

  for (const sex of ["male", "female"] as const) {
    let combined: CombinedOutcome[] = [{ descriptions: [], probability: 0.5 }];

    for (const trait of pack.traits) {
      const traitOutcomes = calculateTraitOutcomes(sex, maleGenotype, femaleGenotype, trait);
      if (traitOutcomes.length === 0) continue; // no genotype data for this trait
      combined = combined.flatMap((base) =>
        traitOutcomes.map((traitOutcome) => ({
          descriptions: [...base.descriptions, traitOutcome.value],
          probability: base.probability * traitOutcome.probability,
        }))
      );
    }

    for (const outcome of combined) {
      const label = `${capitalize(sex)} — ${outcome.descriptions.join("; ")}`;
      totals.set(label, (totals.get(label) ?? 0) + outcome.probability);
    }
  }

  return Array.from(totals.entries())
    .map(([phenotypeDescription, probability]) => ({
      phenotypeDescription,
      probabilityPercentage: Number((probability * 100).toFixed(2)),
    }))
    .sort((left, right) => right.probabilityPercentage - left.probabilityPercentage);
}

function calculateTraitOutcomes(
  sex: OffspringSex,
  maleGenotype: BirdGenotype,
  femaleGenotype: BirdGenotype,
  trait: GeneticsTrait
): ProbabilityOutcome<string>[] {
  const [defaultMutation, ...variableMutations] = trait.mutations;

  // If neither parent has data for any mutation in this trait, skip it
  const hasData = variableMutations.some(
    (m) =>
      (maleGenotype[m.id] ?? GenotypeState.WILD_TYPE) !== GenotypeState.WILD_TYPE ||
      (femaleGenotype[m.id] ?? GenotypeState.WILD_TYPE) !== GenotypeState.WILD_TYPE
  );
  if (!hasData) return [];

  let combined: ProbabilityOutcome<string[]>[] = [{ value: [], probability: 1 }];

  for (const mutation of variableMutations) {
    const mutationOutcomes = calculateMutationOutcomes(sex, maleGenotype, femaleGenotype, mutation);
    combined = combined.flatMap((base) =>
      mutationOutcomes.map((mutationOutcome) => ({
        value: mutationOutcome.value ? [...base.value, mutationOutcome.value] : base.value,
        probability: base.probability * mutationOutcome.probability,
      }))
    );
  }

  return collapseOutcomes(
    combined.map((outcome) => ({
      value: `${trait.traitName}: ${outcome.value.length > 0 ? outcome.value.join(" + ") : defaultMutation.name}`,
      probability: outcome.probability,
    }))
  );
}

function calculateMutationOutcomes(
  sex: OffspringSex,
  maleGenotype: BirdGenotype,
  femaleGenotype: BirdGenotype,
  mutation: Mutation
): ProbabilityOutcome<string | null>[] {
  const maleState = maleGenotype[mutation.id] ?? GenotypeState.WILD_TYPE;
  const femaleState = femaleGenotype[mutation.id] ?? GenotypeState.WILD_TYPE;

  if (
    mutation.inheritanceType === InheritanceType.AUTOSOMAL_RECESSIVE ||
    mutation.inheritanceType === InheritanceType.AUTOSOMAL_DOMINANT ||
    mutation.inheritanceType === InheritanceType.INCOMPLETE_DOMINANT
  ) {
    return collapseOutcomes(
      getAutosomalGametes(maleState, mutation.inheritanceType).flatMap((fatherGamete) =>
        getAutosomalGametes(femaleState, mutation.inheritanceType).map((motherGamete) => ({
          value: renderAutosomalMutation(mutation, fatherGamete.value + motherGamete.value),
          probability: fatherGamete.probability * motherGamete.probability,
        }))
      )
    );
  }

  return collapseOutcomes(
    getMaleSexLinkedGametes(maleState, mutation.inheritanceType).flatMap((fatherGamete) => {
      const mutantCopies =
        sex === "male"
          ? fatherGamete.value + getFemaleSexLinkedAllele(femaleState, mutation.inheritanceType)
          : fatherGamete.value;

      return {
        value: renderSexLinkedMutation(mutation, sex, mutantCopies),
        probability: fatherGamete.probability,
      };
    })
  );
}

function getAutosomalGametes(
  state: GenotypeState,
  inheritanceType: InheritanceType
): ProbabilityOutcome<number>[] {
  switch (state) {
    case GenotypeState.WILD_TYPE:
      return [{ value: 0, probability: 1 }];
    case GenotypeState.CARRIER:
    case GenotypeState.SINGLE_FACTOR:
      return [
        { value: 0, probability: 0.5 },
        { value: 1, probability: 0.5 },
      ];
    case GenotypeState.EXPRESSING:
      return inheritanceType === InheritanceType.AUTOSOMAL_RECESSIVE
        ? [{ value: 1, probability: 1 }]
        : [
            { value: 0, probability: 0.5 },
            { value: 1, probability: 0.5 },
          ];
    case GenotypeState.DOUBLE_FACTOR:
      return [{ value: 1, probability: 1 }];
  }
}

function getAutosomalMutantCopies(
  state: GenotypeState,
  inheritanceType: InheritanceType
): number {
  switch (state) {
    case GenotypeState.WILD_TYPE:
      return 0;
    case GenotypeState.CARRIER:
    case GenotypeState.SINGLE_FACTOR:
      return 1;
    case GenotypeState.EXPRESSING:
      return inheritanceType === InheritanceType.AUTOSOMAL_RECESSIVE ? 2 : 1;
    case GenotypeState.DOUBLE_FACTOR:
      return 2;
  }
}

function getMaleSexLinkedGametes(
  state: GenotypeState,
  inheritanceType: InheritanceType
): ProbabilityOutcome<number>[] {
  switch (state) {
    case GenotypeState.WILD_TYPE:
      return [{ value: 0, probability: 1 }];
    case GenotypeState.CARRIER:
    case GenotypeState.SINGLE_FACTOR:
      return [
        { value: 0, probability: 0.5 },
        { value: 1, probability: 0.5 },
      ];
    case GenotypeState.EXPRESSING:
      return inheritanceType === InheritanceType.SEX_LINKED_RECESSIVE
        ? [{ value: 1, probability: 1 }]
        : [
            { value: 0, probability: 0.5 },
            { value: 1, probability: 0.5 },
          ];
    case GenotypeState.DOUBLE_FACTOR:
      return [{ value: 1, probability: 1 }];
  }
}

function getFemaleSexLinkedAllele(state: GenotypeState, inheritanceType: InheritanceType): number {
  if (state === GenotypeState.WILD_TYPE) {
    return 0;
  }

  if (state === GenotypeState.CARRIER && inheritanceType === InheritanceType.SEX_LINKED_RECESSIVE) {
    return 0;
  }

  return 1;
}

function getSexLinkedMutantCopies(
  sex: OffspringSex,
  state: GenotypeState,
  inheritanceType: InheritanceType
): number {
  if (sex === "female") {
    return getFemaleSexLinkedAllele(state, inheritanceType);
  }

  switch (state) {
    case GenotypeState.WILD_TYPE:
      return 0;
    case GenotypeState.CARRIER:
    case GenotypeState.SINGLE_FACTOR:
      return 1;
    case GenotypeState.EXPRESSING:
      return inheritanceType === InheritanceType.SEX_LINKED_RECESSIVE ? 2 : 1;
    case GenotypeState.DOUBLE_FACTOR:
      return 2;
  }
}

function describeMutationPhenotype(
  sex: OffspringSex,
  state: GenotypeState,
  mutation: Mutation
): string | null {
  if (
    mutation.inheritanceType === InheritanceType.AUTOSOMAL_RECESSIVE ||
    mutation.inheritanceType === InheritanceType.AUTOSOMAL_DOMINANT ||
    mutation.inheritanceType === InheritanceType.INCOMPLETE_DOMINANT
  ) {
    return renderAutosomalMutation(
      mutation,
      getAutosomalMutantCopies(state, mutation.inheritanceType)
    );
  }

  return renderSexLinkedMutation(
    mutation,
    sex,
    getSexLinkedMutantCopies(sex, state, mutation.inheritanceType)
  );
}

function renderAutosomalMutation(mutation: Mutation, mutantCopies: number): string | null {
  switch (mutation.inheritanceType) {
    case InheritanceType.AUTOSOMAL_RECESSIVE:
      return mutantCopies === 2 ? mutation.name : null;
    case InheritanceType.AUTOSOMAL_DOMINANT:
      return mutantCopies >= 1 ? mutation.name : null;
    case InheritanceType.INCOMPLETE_DOMINANT:
      if (mutantCopies === 2) return `${mutation.name} (DF)`;
      if (mutantCopies === 1) return `${mutation.name} (SF)`;
      return null;
    default:
      return null;
  }
}

function renderSexLinkedMutation(
  mutation: Mutation,
  sex: OffspringSex,
  mutantCopies: number
): string | null {
  switch (mutation.inheritanceType) {
    case InheritanceType.SEX_LINKED_RECESSIVE:
      if (sex === "male") return mutantCopies === 2 ? mutation.name : null;
      return mutantCopies === 1 ? mutation.name : null;
    case InheritanceType.SEX_LINKED_DOMINANT:
      return mutantCopies >= 1 ? mutation.name : null;
    case InheritanceType.CO_DOMINANT_SEX_LINKED:
      if (sex === "male") {
        if (mutantCopies === 2) return `${mutation.name} (DF)`;
        if (mutantCopies === 1) return `${mutation.name} (SF)`;
        return null;
      }

      return mutantCopies === 1 ? `${mutation.name} (SF)` : null;
    default:
      return null;
  }
}

function collapseOutcomes<T>(outcomes: ProbabilityOutcome<T>[]): ProbabilityOutcome<T>[] {
  const totals = new Map<T, number>();

  for (const outcome of outcomes) {
    totals.set(outcome.value, (totals.get(outcome.value) ?? 0) + outcome.probability);
  }

  return Array.from(totals.entries()).map(([value, probability]) => ({ value, probability }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}