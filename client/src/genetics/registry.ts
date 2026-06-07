import type { AnyGeneticsPack, PhenotypeSplitPack, GeneticsPack } from "./types";
import { gouldianFinchPack } from "./packs/gouldianFinch";
import { zebraFinchPack } from "./packs/zebraFinch";

/**
 * Every genetics pack in the app. Adding a new species pack is just a data file
 * plus one entry here — the form, bird detail page and settings all read from
 * this list rather than referencing packs directly.
 */
export const ALL_GENETICS_PACKS: AnyGeneticsPack[] = [
  gouldianFinchPack,
  zebraFinchPack,
];

export function isPhenotypeSplitPack(pack: AnyGeneticsPack): pack is PhenotypeSplitPack {
  return pack.kind === "phenotype-split";
}

export function isTraitPack(pack: AnyGeneticsPack): pack is GeneticsPack {
  return pack.kind !== "phenotype-split";
}

/** Does this pack apply to the given species commonName? */
export function packMatchesSpecies(pack: AnyGeneticsPack, commonName?: string | null): boolean {
  if (!commonName) return false;
  const pattern = pack.speciesMatch ?? pack.speciesName;
  try {
    return new RegExp(pattern, "i").test(commonName);
  } catch {
    return commonName.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * Resolve the genetics pack to use for a species, given which packs the user has
 * activated. Returns undefined when no active pack matches the species.
 */
export function findActivePackForSpecies(
  commonName: string | null | undefined,
  activePackIds: string[],
): AnyGeneticsPack | undefined {
  return ALL_GENETICS_PACKS.find(
    (pack) => activePackIds.includes(pack.speciesId) && packMatchesSpecies(pack, commonName),
  );
}
