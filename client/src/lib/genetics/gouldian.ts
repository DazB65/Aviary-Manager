import type { MutationDef, BirdGenotype, OffspringOutcome } from './engine';

// ─── Gouldian Finch Genetics Module ──────────────────────────────────────────
// Based on http://www.gouldianfinches.eu/en/genetics-forecast/ (the reference "bible")
// Supporting references: finchstuff.com/gouldianmutations
//
// HEAD:
//   head_red    = sex-linked recessive (Z chromosome). Males: ZrZr=red, ZrZ+=split/black, Z+Z+=black
//                 Females: ZrW=red, Z+W=black. Females CANNOT be split.
//   head_yellow = autosomal recessive. yy=yellow, Yy=split, YY=black
//   Note: yellow is epistatic to red (yellow bird cannot display red, even if carrying it)
//
// BREAST:
//   breast_lilac = autosomal recessive. ll=lilac, Ll=split-lilac, LL=purple
//   breast_white = autosomal recessive, epistatic to lilac. ww=white, Ww=split-white
//
// BODY:
//   australian_yellow = autosomal recessive. ayay=Australian Yellow, Ayay=split, AyAy=green
//                       Birds CAN be "Green split to Australian Yellow" (hidden carrier).
//   body_blue         = autosomal recessive. bb=blue, Bb=split-blue, BB=green

export const GOULDIAN_MUTATIONS: MutationDef[] = [
  { id: 'head_red',          name: 'Red Head',              locus: 'head_red',          inheritance: 'sex-linked-recessive', description: 'Red head. Sex-linked recessive — males can be split, females cannot.' },
  { id: 'head_yellow',       name: 'Yellow Head',           locus: 'head_yellow',       inheritance: 'autosomal-recessive',  description: 'Yellow/orange head. Autosomal recessive. Epistatic over red head.' },
  { id: 'breast_lilac',      name: 'Lilac Breast',          locus: 'breast_lilac',      inheritance: 'autosomal-recessive',  description: 'Lilac breast. Autosomal recessive. Masked by white breast.' },
  { id: 'breast_white',      name: 'White Breast',          locus: 'breast_white',      inheritance: 'autosomal-recessive',  description: 'White breast. Autosomal recessive. Epistatic over lilac.' },
  { id: 'australian_yellow', name: 'Australian Yellow Body', locus: 'australian_yellow', inheritance: 'autosomal-recessive',  description: 'Australian Yellow body. Autosomal recessive. Both parents must carry or display. Birds can be "Green split to Australian Yellow".' },
  { id: 'body_blue',         name: 'Blue Body',             locus: 'body_blue',         inheritance: 'autosomal-recessive',  description: 'Blue body. Autosomal recessive. Birds can be split carriers.' },
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
// Australian Yellow is autosomal recessive — birds CAN be split/hidden carriers.
export const BODY_OPTIONS: TraitOption[] = [
  { value: 'green',               label: 'Green body',                                   visual: [],                    splits: [],                                    singleFactor: [] },
  { value: 'green_split_ay',      label: 'Green body / split Australian Yellow',          visual: [],                    splits: ['australian_yellow'],                  singleFactor: [] },
  { value: 'green_split_blue',    label: 'Green body / split Blue',                       visual: [],                    splits: ['body_blue'],                          singleFactor: [] },
  { value: 'green_split_ay_blue', label: 'Green body / split Australian Yellow & Blue',   visual: [],                    splits: ['australian_yellow', 'body_blue'],     singleFactor: [] },
  { value: 'australian_yellow',   label: 'Australian Yellow body',                        visual: ['australian_yellow'], splits: [],                                    singleFactor: [] },
  { value: 'ay_split_blue',       label: 'Australian Yellow body / split Blue',           visual: ['australian_yellow'], splits: ['body_blue'],                          singleFactor: [] },
  { value: 'blue',                label: 'Blue body',                                     visual: ['body_blue'],         splits: [],                                    singleFactor: [] },
  { value: 'blue_split_ay',       label: 'Blue body / split Australian Yellow',           visual: ['body_blue'],         splits: ['australian_yellow'],                  singleFactor: [] },
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
  const bodyIds = ['australian_yellow', 'body_blue'];

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

  // BODY — Australian Yellow (autosomal recessive) × Blue (autosomal recessive)
  const isAY       = v.includes('australian_yellow');
  const isBlue     = v.includes('body_blue');
  const splitAY    = sp.includes('australian_yellow');
  const splitBlue  = sp.includes('body_blue');
  let body: string;
  if (isAY && isBlue) {
    body = 'Australian Yellow body / Blue body';
  } else if (isAY) {
    body = splitBlue ? 'Australian Yellow body / split Blue' : 'Australian Yellow body';
  } else if (isBlue) {
    body = splitAY ? 'Blue body / split Australian Yellow' : 'Blue body';
  } else {
    if (splitAY && splitBlue) body = 'Green body / split Australian Yellow & Blue';
    else if (splitAY)         body = 'Green body / split Australian Yellow';
    else if (splitBlue)       body = 'Green body / split Blue';
    else                      body = 'Green body';
  }

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


