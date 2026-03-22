import { GenotypeState, type BirdGenotype } from "./types";

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
