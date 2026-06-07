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

export type TraitComposite = {
  /** Mutation names that, when expressed together, form this composite */
  components: string[];
  /** Display name when expressing (e.g. "AVB") */
  name: string;
  /** Display name when carrying (e.g. "Double Split") */
  carrierName?: string;
};

export type GeneticsTrait = {
  traitName: string;
  mutations: Mutation[];
  /** Named combinations of mutations (e.g. Blue + Australian Yellow = AVB) */
  composites?: TraitComposite[];
};

/**
 * Trait-based pack (e.g. Gouldian Finch): each trait has a Colour + optional
 * Split, and supports offspring prediction via the genetics engine.
 */
export type GeneticsPack = {
  /** Discriminator. Trait packs may omit it; defaults to "trait". */
  kind?: "trait";
  speciesId: string;
  speciesName: string;
  /** Case-insensitive regex (source string) matching a species' commonName. */
  speciesMatch?: string;
  /** Short description shown on the Settings toggle card. */
  description?: string;
  traits: GeneticsTrait[];
};

export type BirdGenotype = Partial<Record<string, GenotypeState>>;

/** A single named colour/mutation option for a phenotype-split pack. */
export type SimpleColour = {
  id: string;
  name: string;
};

/**
 * Phenotype + split pack (e.g. Zebra Finch): the bird shows up to N visible
 * phenotype colours and may carry up to N splits, plus a free-text notes area.
 * No offspring prediction.
 */
export type PhenotypeSplitPack = {
  kind: "phenotype-split";
  speciesId: string;
  speciesName: string;
  /** Case-insensitive regex (source string) matching a species' commonName. */
  speciesMatch: string;
  /** Short description shown on the Settings toggle card. */
  description?: string;
  /** Visible-colour options the bird can express. */
  phenotypes: SimpleColour[];
  /** Recessive options the bird can be split (carrier) to. */
  splits: SimpleColour[];
  /** Max phenotype dropdowns shown (default 3). */
  maxPhenotypes: number;
  /** Max split dropdowns shown (default 3). */
  maxSplits: number;
};

/** Any registered genetics pack, regardless of kind. */
export type AnyGeneticsPack = GeneticsPack | PhenotypeSplitPack;

/** Per-bird selection state for a phenotype-split pack. */
export type PhenotypeSplitSelection = {
  phenotypes: string[];
  splits: string[];
  notes: string;
};

export type OffspringProbability = {
  phenotypeDescription: string;
  probabilityPercentage: number;
};