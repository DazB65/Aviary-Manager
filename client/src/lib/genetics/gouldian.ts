import type { MutationDef, BirdGenotype, OffspringOutcome } from './engine';

// ─── Gouldian Finch Genetics Module ──────────────────────────────────────────
// Based on http://www.gouldianfinches.eu/en/genetics-forecast/ (the reference "bible")
//
// HEAD:
//   head_red  = sex-linked recessive (Z chromosome). Males: ZrZr=red, ZrZ+=split/black, Z+Z+=black
//               Females: ZrW=red, Z+W=black. Females CANNOT be split.
//   head_yellow = autosomal recessive. yy=yellow, Yy=split, YY=black
//   Note: yellow is epistatic to red (yellow bird cannot display red, even if carrying it)
//
// BREAST:
//   breast_lilac = autosomal recessive. ll=lilac, Ll=split-lilac, LL=purple
//   breast_white = autosomal recessive, epistatic to lilac. ww=white, Ww=split-white
//
// BODY:
//   body_dilute = incompletely dominant. DD=green, Dd=Yellow SF, dd=Yellow DF
//   body_blue   = autosomal recessive. bb=blue, Bb=split-blue, BB=green

export const GOULDIAN_MUTATIONS: MutationDef[] = [
  { id: 'head_red',     name: 'Red Head',         locus: 'head_red',     inheritance: 'sex-linked-recessive',  description: 'Red head. Sex-linked recessive — males can be split, females cannot.' },
  { id: 'head_yellow',  name: 'Yellow Head',       locus: 'head_yellow',  inheritance: 'autosomal-recessive',   description: 'Yellow/orange head. Autosomal recessive. Epistatic over red head.' },
  { id: 'breast_lilac', name: 'Lilac Breast',      locus: 'breast_lilac', inheritance: 'autosomal-recessive',   description: 'Lilac breast. Autosomal recessive. Masked by white breast.' },
  { id: 'breast_white', name: 'White Breast',      locus: 'breast_white', inheritance: 'autosomal-recessive',   description: 'White breast. Autosomal recessive. Epistatic over lilac.' },
  { id: 'body_dilute',  name: 'Yellow Body (Dilute)', locus: 'body_dilute', inheritance: 'incompletely-dominant', description: 'Yellow body. Incompletely dominant: one copy=Yellow SF, two copies=Yellow DF.' },
  { id: 'body_blue',    name: 'Blue Body',          locus: 'body_blue',    inheritance: 'autosomal-recessive',   description: 'Blue body. Autosomal recessive. Interacts with dilute to produce Pastel Blue and Silver.' },
];

// ─── Trait Dropdown Options ───────────────────────────────────────────────────
// Each option maps a phenotype label to the genotype arrays stored in the database.

export interface TraitOption {
  value: string;
  label: string;
  visual: string[];       // mutation IDs in visualMutations
  splits: string[];       // mutation IDs in splitFor
  singleFactor: string[]; // mutation IDs in singleFactor
}

// HEAD OPTIONS — males (can be split for red; yellow is epistatic over red)
export const HEAD_OPTIONS_MALE: TraitOption[] = [
  { value: 'black',               label: 'Black headed',                       visual: [],            splits: [],                        singleFactor: [] },
  { value: 'black_split_red',     label: 'Black headed / split Red',            visual: [],            splits: ['head_red'],               singleFactor: [] },
  { value: 'black_split_yellow',  label: 'Black headed / split Yellow',         visual: [],            splits: ['head_yellow'],            singleFactor: [] },
  { value: 'black_split_both',    label: 'Black headed / split Red & Yellow',   visual: [],            splits: ['head_red', 'head_yellow'], singleFactor: [] },
  { value: 'red',                 label: 'Red headed',                          visual: ['head_red'],  splits: [],                        singleFactor: [] },
  { value: 'red_split_yellow',    label: 'Red headed / split Yellow',           visual: ['head_red'],  splits: ['head_yellow'],            singleFactor: [] },
  { value: 'yellow',              label: 'Yellow headed',                       visual: ['head_yellow'], splits: [],                      singleFactor: [] },
  { value: 'yellow_carries_red',  label: 'Yellow headed (carries Red)',         visual: ['head_yellow'], splits: ['head_red'],             singleFactor: [] },
];

// HEAD OPTIONS — females (cannot be split for red since ZW; can carry yellow)
export const HEAD_OPTIONS_FEMALE: TraitOption[] = [
  { value: 'black',               label: 'Black headed',                        visual: [],             splits: [],             singleFactor: [] },
  { value: 'black_split_yellow',  label: 'Black headed / split Yellow',         visual: [],             splits: ['head_yellow'], singleFactor: [] },
  { value: 'red',                 label: 'Red headed',                          visual: ['head_red'],   splits: [],             singleFactor: [] },
  { value: 'red_split_yellow',    label: 'Red headed / split Yellow',           visual: ['head_red'],   splits: ['head_yellow'], singleFactor: [] },
  { value: 'yellow',              label: 'Yellow headed',                       visual: ['head_yellow'], splits: [],            singleFactor: [] },
];

// BREAST OPTIONS — same for both genders
export const BREAST_OPTIONS: TraitOption[] = [
  { value: 'purple',              label: 'Purple breast',                       visual: [],                         splits: [],                          singleFactor: [] },
  { value: 'purple_split_lilac',  label: 'Purple breast / split Lilac',         visual: [],                         splits: ['breast_lilac'],             singleFactor: [] },
  { value: 'purple_split_white',  label: 'Purple breast / split White',         visual: [],                         splits: ['breast_white'],             singleFactor: [] },
  { value: 'lilac',               label: 'Lilac breast',                        visual: ['breast_lilac'],            splits: [],                          singleFactor: [] },
  { value: 'lilac_split_white',   label: 'Lilac breast / split White',          visual: ['breast_lilac'],            splits: ['breast_white'],             singleFactor: [] },
  { value: 'white',               label: 'White breast',                        visual: ['breast_white'],            splits: [],                          singleFactor: [] },
];

// BODY OPTIONS — same for both genders
export const BODY_OPTIONS: TraitOption[] = [
  { value: 'green',               label: 'Green body',                          visual: [],               splits: [],             singleFactor: [] },
  { value: 'green_split_blue',    label: 'Green body / split Blue',             visual: [],               splits: ['body_blue'],  singleFactor: [] },
  { value: 'yellow_sf',           label: 'Yellow body SF',                      visual: [],               splits: [],             singleFactor: ['body_dilute'] },
  { value: 'yellow_sf_split_blue',label: 'Yellow body SF / split Blue',         visual: [],               splits: ['body_blue'],  singleFactor: ['body_dilute'] },
  { value: 'yellow_df',           label: 'Yellow body DF',                      visual: ['body_dilute'],  splits: [],             singleFactor: [] },
  { value: 'yellow_df_split_blue',label: 'Yellow body DF / split Blue',         visual: ['body_dilute'],  splits: ['body_blue'],  singleFactor: [] },
  { value: 'blue',                label: 'Blue body',                           visual: ['body_blue'],    splits: [],             singleFactor: [] },
  { value: 'pastel_blue_sf',      label: 'Pastel Blue SF',                      visual: ['body_blue'],    splits: [],             singleFactor: ['body_dilute'] },
  { value: 'silver_df',           label: 'Silver DF',                           visual: ['body_dilute', 'body_blue'], splits: [], singleFactor: [] },
];


// ─── Genotype ↔ Trait Converters ─────────────────────────────────────────────

/**
 * Given the three genotype arrays for a bird, find the matching TraitOption
 * for each trait group. Returns the value strings for head, breast, and body.
 */
export function genotypeToTraits(
  gender: 'male' | 'female',
  visual: string[],
  splits: string[],
  singleFactor: string[],
): { head: string; breast: string; body: string } {
  function match(options: TraitOption[]): string {
    for (const opt of options) {
      const vMatch = opt.visual.every(id => visual.includes(id)) && opt.visual.length === opt.visual.filter(id => visual.includes(id)).length;
      const sMatch = opt.splits.every(id => splits.includes(id)) && opt.splits.length === opt.splits.filter(id => splits.includes(id)).length;
      const sfMatch = opt.singleFactor.every(id => singleFactor.includes(id)) && opt.singleFactor.length === opt.singleFactor.filter(id => singleFactor.includes(id)).length;
      // All ids in visual/splits/sf that belong to this trait group must match exactly
      const traitIds = new Set([...opt.visual, ...opt.splits, ...opt.singleFactor]);
      const storedV = visual.filter(id => traitIds.has(id) || opt.visual.includes(id));
      const storedS = splits.filter(id => traitIds.has(id) || opt.splits.includes(id));
      const storedSF = singleFactor.filter(id => traitIds.has(id) || opt.singleFactor.includes(id));
      if (
        JSON.stringify(storedV.sort()) === JSON.stringify([...opt.visual].sort()) &&
        JSON.stringify(storedS.sort()) === JSON.stringify([...opt.splits].sort()) &&
        JSON.stringify(storedSF.sort()) === JSON.stringify([...opt.singleFactor].sort())
      ) return opt.value;
    }
    return options[0].value; // default to first option (wild type)
  }

  const headIds = ['head_red', 'head_yellow'];
  const breastIds = ['breast_lilac', 'breast_white'];
  const bodyIds = ['body_dilute', 'body_blue'];

  function matchGroup(ids: string[], options: TraitOption[]): string {
    const gVisual = visual.filter(id => ids.includes(id));
    const gSplits = splits.filter(id => ids.includes(id));
    const gSF = singleFactor.filter(id => ids.includes(id));
    for (const opt of options) {
      if (
        JSON.stringify([...gVisual].sort()) === JSON.stringify([...opt.visual].sort()) &&
        JSON.stringify([...gSplits].sort()) === JSON.stringify([...opt.splits].sort()) &&
        JSON.stringify([...gSF].sort()) === JSON.stringify([...opt.singleFactor].sort())
      ) return opt.value;
    }
    return options[0].value;
  }

  const headOptions = gender === 'male' ? HEAD_OPTIONS_MALE : HEAD_OPTIONS_FEMALE;
  return {
    head:   matchGroup(headIds, headOptions),
    breast: matchGroup(breastIds, BREAST_OPTIONS),
    body:   matchGroup(bodyIds, BODY_OPTIONS),
  };
}

/**
 * Given trait value strings (from dropdowns), merge all three into the three
 * genotype arrays needed for BirdGenotype.
 */
export function traitsToGenotype(
  headValue: string,
  breastValue: string,
  bodyValue: string,
  gender: 'male' | 'female',
): { visual: string[]; splits: string[]; singleFactor: string[] } {
  const headOptions = gender === 'male' ? HEAD_OPTIONS_MALE : HEAD_OPTIONS_FEMALE;
  const head   = headOptions.find(o => o.value === headValue)   ?? headOptions[0];
  const breast = BREAST_OPTIONS.find(o => o.value === breastValue) ?? BREAST_OPTIONS[0];
  const body   = BODY_OPTIONS.find(o => o.value === bodyValue)   ?? BODY_OPTIONS[0];

  return {
    visual:       [...head.visual,       ...breast.visual,       ...body.visual],
    splits:       [...head.splits,       ...breast.splits,       ...body.splits],
    singleFactor: [...head.singleFactor, ...breast.singleFactor, ...body.singleFactor],
  };
}

// ─── Outcome Description ──────────────────────────────────────────────────────

/**
 * Produce a human-readable phenotype description for an offspring outcome.
 * Mirrors the gouldianfinches.eu calculator's output format.
 */
export function describeGouldianOutcome(outcome: OffspringOutcome): string {
  const v = outcome.visual;
  const sf = outcome.singleFactor;
  const sp = outcome.splits;

  // HEAD
  let head: string;
  if (v.includes('head_yellow')) {
    // Yellow is epistatic — yellow bird may still genetically carry red (for males)
    const carriesRed = sp.includes('head_red');
    head = carriesRed ? 'Yellow headed (carries Red)' : 'Yellow headed';
  } else if (v.includes('head_red')) {
    const splitYellow = sp.includes('head_yellow');
    head = splitYellow ? 'Red headed / split Yellow' : 'Red headed';
  } else {
    const splitRed    = sp.includes('head_red');
    const splitYellow = sp.includes('head_yellow');
    if (splitRed && splitYellow) head = 'Black headed / split Red & Yellow';
    else if (splitRed)           head = 'Black headed / split Red';
    else if (splitYellow)        head = 'Black headed / split Yellow';
    else                         head = 'Black headed';
  }

  // BREAST
  let breast: string;
  if (v.includes('breast_white')) {
    breast = 'White breast';
  } else if (v.includes('breast_lilac')) {
    breast = sp.includes('breast_white') ? 'Lilac breast / split White' : 'Lilac breast';
  } else {
    const splitLilac = sp.includes('breast_lilac');
    const splitWhite = sp.includes('breast_white');
    if (splitLilac && splitWhite) breast = 'Purple breast / split Lilac & White';
    else if (splitLilac)          breast = 'Purple breast / split Lilac';
    else if (splitWhite)          breast = 'Purple breast / split White';
    else                          breast = 'Purple breast';
  }

  // BODY — dilute (IC) × blue interaction
  const isBlue     = v.includes('body_blue');
  const isDiluteDf = v.includes('body_dilute');
  const isDiluteSf = sf.includes('body_dilute');
  const splitBlue  = sp.includes('body_blue');
  let body: string;
  if (isDiluteDf && isBlue)       body = 'Silver DF';
  else if (isDiluteSf && isBlue)  body = 'Pastel Blue SF';
  else if (isBlue)                body = splitBlue ? 'Blue body' : 'Blue body';
  else if (isDiluteDf)            body = splitBlue ? 'Yellow DF / split Blue' : 'Yellow DF';
  else if (isDiluteSf)            body = splitBlue ? 'Yellow SF / split Blue'  : 'Yellow SF';
  else                            body = splitBlue ? 'Green body / split Blue'  : 'Green body';

  return `${head} · ${breast} · ${body}`;
}

// ─── Species Registry ─────────────────────────────────────────────────────────

const SPECIES_REGISTRY: Record<string, MutationDef[]> = {
  'gouldian finch':   GOULDIAN_MUTATIONS,
  'erythrura gouldiae': GOULDIAN_MUTATIONS,
};

/** Returns the mutation list for a given species, or null if no module exists. */
export function getMutationsForSpecies(speciesName: string): MutationDef[] | null {
  return SPECIES_REGISTRY[speciesName.trim().toLowerCase()] ?? null;
}

/** Returns true if a genetics module exists for the given species. */
export function hasGeneticsModule(speciesName: string): boolean {
  return getMutationsForSpecies(speciesName) !== null;
}


