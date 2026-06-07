import {
  GenotypeState,
  type BirdGenotype,
  type PhenotypeSplitPack,
  type PhenotypeSplitSelection,
} from "./types";

/** Reserved genotype key holding the free-text genetics notes for a bird. */
export const NOTES_KEY = "__notes";

const EMPTY: PhenotypeSplitSelection = { phenotypes: [], splits: [], notes: "" };

/** Look up a colour's display name within a pack's phenotype/split lists. */
function nameOf(pack: PhenotypeSplitPack, id: string): string | undefined {
  return (
    pack.phenotypes.find((c) => c.id === id)?.name ??
    pack.splits.find((c) => c.id === id)?.name
  );
}

/**
 * Serialise a selection into the bird's genotype JSON map:
 * phenotypes → EXPRESSING, splits → CARRIER, plus the notes string under NOTES_KEY.
 */
export function buildGenotypeFromPhenotypeSplit(
  selection: PhenotypeSplitSelection,
  pack: PhenotypeSplitPack,
): BirdGenotype {
  const genotype: Record<string, GenotypeState | string> = {};
  for (const id of selection.phenotypes) {
    if (id && pack.phenotypes.some((c) => c.id === id)) genotype[id] = GenotypeState.EXPRESSING;
  }
  for (const id of selection.splits) {
    if (id && !genotype[id] && pack.splits.some((c) => c.id === id)) {
      genotype[id] = GenotypeState.CARRIER;
    }
  }
  const notes = selection.notes?.trim();
  if (notes) genotype[NOTES_KEY] = notes;
  return genotype as BirdGenotype;
}

/** Parse a stored genotype map back into a phenotype-split selection. */
export function parsePhenotypeSplitFromGenotype(
  genotype: BirdGenotype | null | undefined,
  pack: PhenotypeSplitPack,
): PhenotypeSplitSelection {
  if (!genotype) return { ...EMPTY };
  const raw = genotype as Record<string, unknown>;

  const phenotypes = pack.phenotypes
    .filter((c) => raw[c.id] === GenotypeState.EXPRESSING)
    .map((c) => c.id)
    .slice(0, pack.maxPhenotypes);

  const splits = pack.splits
    .filter((c) => raw[c.id] === GenotypeState.CARRIER)
    .map((c) => c.id)
    .slice(0, pack.maxSplits);

  const notes = typeof raw[NOTES_KEY] === "string" ? (raw[NOTES_KEY] as string) : "";

  return { phenotypes, splits, notes };
}

/**
 * Human-readable display string, e.g. "Grey / Pied split Fawn / White".
 * Stored on the bird's colorMutation field.
 */
export function formatPhenotypeSplitDisplay(
  selection: PhenotypeSplitSelection,
  pack: PhenotypeSplitPack,
): string {
  const phenotypeNames = selection.phenotypes
    .map((id) => nameOf(pack, id))
    .filter((n): n is string => Boolean(n));
  const splitNames = selection.splits
    .map((id) => nameOf(pack, id))
    .filter((n): n is string => Boolean(n));

  let display = phenotypeNames.join(" / ");
  if (splitNames.length > 0) {
    display += `${display ? " " : ""}split ${splitNames.join(" / ")}`;
  }
  return display;
}
