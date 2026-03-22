export enum InheritanceType {
  AUTOSOMAL_RECESSIVE = "AUTOSOMAL_RECESSIVE",
  AUTOSOMAL_DOMINANT = "AUTOSOMAL_DOMINANT",
  SEX_LINKED_RECESSIVE = "SEX_LINKED_RECESSIVE",
  SEX_LINKED_DOMINANT = "SEX_LINKED_DOMINANT",
  CO_DOMINANT_SEX_LINKED = "CO_DOMINANT_SEX_LINKED",
  INCOMPLETE_DOMINANT = "INCOMPLETE_DOMINANT",
}

export enum GenotypeState {
  WILD_TYPE = "WILD_TYPE",
  CARRIER = "CARRIER",
  EXPRESSING = "EXPRESSING",
  SINGLE_FACTOR = "SINGLE_FACTOR",
  DOUBLE_FACTOR = "DOUBLE_FACTOR",
}

export type Mutation = {
  id: string;
  name: string;
  inheritanceType: InheritanceType;
};

export type GeneticsTrait = {
  traitName: string;
  mutations: Mutation[];
};

export type GeneticsPack = {
  speciesId: string;
  speciesName: string;
  traits: GeneticsTrait[];
};

export type BirdGenotype = Partial<Record<string, GenotypeState>>;

export type OffspringProbability = {
  phenotypeDescription: string;
  probabilityPercentage: number;
};