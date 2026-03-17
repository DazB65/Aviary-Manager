import { useCallback, useState } from "react";

export const ACTIVE_GENETICS_PACKS_STORAGE_KEY = "activeGeneticsPacks";

export function readActiveGeneticsPacks(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(ACTIVE_GENETICS_PACKS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function writeActiveGeneticsPacks(packIds: string[]): void {
  if (typeof window === "undefined") return;

  const normalized = Array.from(
    new Set(packIds.filter((value): value is string => typeof value === "string"))
  );

  window.localStorage.setItem(
    ACTIVE_GENETICS_PACKS_STORAGE_KEY,
    JSON.stringify(normalized)
  );
}

export function useGeneticsPacks() {
  const [activePackIds, setActivePackIds] = useState<string[]>(() => readActiveGeneticsPacks());

  const setPackActive = useCallback((speciesId: string, isActive: boolean) => {
    setActivePackIds((currentPackIds) => {
      const nextPackIds = isActive
        ? Array.from(new Set([...currentPackIds, speciesId]))
        : currentPackIds.filter((packId) => packId !== speciesId);

      writeActiveGeneticsPacks(nextPackIds);
      return nextPackIds;
    });
  }, []);

  const isPackActive = useCallback(
    (speciesId: string) => activePackIds.includes(speciesId),
    [activePackIds]
  );

  return {
    activePackIds,
    isPackActive,
    setPackActive,
  };
}