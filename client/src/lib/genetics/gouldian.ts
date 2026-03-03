import type { MutationDef } from './engine';

// ─── Gouldian Finch Genetics Module ──────────────────────────────────────────
// Based on established Gouldian finch genetics (ZZ/ZW sex determination).
//
// Head colour loci:
//   Black head = wild type (most common, not listed as a mutation)
//   Red head   = sex-linked recessive (on Z chromosome)
//   Yellow head = autosomal recessive
//
// Body colour loci:
//   Green body = wild type
//   Blue body  = autosomal recessive (removes yellow pigment)
//   Yellow/Dilute body = autosomal recessive (dilute pigmentation)
//
// Breast colour loci:
//   Purple breast = wild type
//   White breast  = autosomal recessive

export const GOULDIAN_MUTATIONS: MutationDef[] = [
  {
    id: 'red_head',
    name: 'Red Head',
    locus: 'head_sl',
    inheritance: 'sex-linked-recessive',
    description: 'Red head colouration. Wild type is Black head. Sex-linked recessive — males can be split, females cannot.',
  },
  {
    id: 'yellow_head',
    name: 'Yellow/Orange Head',
    locus: 'head_ar',
    inheritance: 'autosomal-recessive',
    description: 'Yellow or orange head colouration. Wild type is Black head. Both parents must carry the gene.',
  },
  {
    id: 'blue_body',
    name: 'Blue Body',
    locus: 'body_colour',
    inheritance: 'autosomal-recessive',
    description: 'Blue body/back colouration. Wild type is Green. Removes yellow pigment producing a blue-green appearance.',
  },
  {
    id: 'yellow_body',
    name: 'Yellow Body (Dilute)',
    locus: 'dilute',
    inheritance: 'autosomal-recessive',
    description: 'Yellow dilute body colouration. Dilutes overall pigmentation. Both parents must carry the gene.',
  },
  {
    id: 'white_breast',
    name: 'White Breast',
    locus: 'breast_colour',
    inheritance: 'autosomal-recessive',
    description: 'White breast colouration. Wild type is Purple breast. Both parents must carry the gene.',
  },
];

// ─── Species Registry ─────────────────────────────────────────────────────────
// Map from species common name (lowercase) to mutation list.
// Add new species here as modules are built.

const SPECIES_REGISTRY: Record<string, MutationDef[]> = {
  'gouldian finch': GOULDIAN_MUTATIONS,
  'erythrura gouldiae': GOULDIAN_MUTATIONS, // match by scientific name too
};

/**
 * Returns the mutation list for a given species name, or null if no module exists.
 * Matches on common name or scientific name, case-insensitive.
 */
export function getMutationsForSpecies(speciesName: string): MutationDef[] | null {
  const key = speciesName.trim().toLowerCase();
  return SPECIES_REGISTRY[key] ?? null;
}

/**
 * Returns true if a genetics module exists for the given species.
 */
export function hasGeneticsModule(speciesName: string): boolean {
  return getMutationsForSpecies(speciesName) !== null;
}

