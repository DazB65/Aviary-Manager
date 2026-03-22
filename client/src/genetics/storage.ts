import { GenotypeState, type BirdGenotype, type GeneticsPack } from "./types";

const ACTIVE_GENETICS_PACKS_KEY = "activeGeneticsPacks";

export function readActiveGeneticsPacks(): string[] {
  try {
    const stored = localStorage.getItem(ACTIVE_GENETICS_PACKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function readBirdGenotype(birdId: number): BirdGenotype {
  try {
    const storedValue = localStorage.getItem(`birdGenetics_${birdId}`);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch {
    return {};
  }
}

export function writeBirdGenotype(birdId: number, genotype: BirdGenotype): void {
  try {
    localStorage.setItem(`birdGenetics_${birdId}`, JSON.stringify(genotype));
  } catch { /* ignore */ }
}

export function formatGeneticsDisplay(
  selections: Record<string, { colour: string; splitTo: string }>,
  pack: GeneticsPack,
): string {
  const parts: string[] = [];
  for (const trait of pack.traits) {
    const sel = selections[trait.traitName];
    if (!sel?.colour) continue;
    const colourMutation = trait.mutations.find(m => m.id === sel.colour);
    if (!colourMutation) continue;
    let part = colourMutation.name;
    if (sel.splitTo) {
      const splitMutation = trait.mutations.find(m => m.id === sel.splitTo);
      if (splitMutation) part += ` split to ${splitMutation.name}`;
    }
    parts.push(part);
  }
  return parts.join(" / ");
}
