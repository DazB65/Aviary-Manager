import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ALL_GENETICS_PACKS, packMatchesSpecies } from "./registry";
import type { AnyGeneticsPack } from "./types";

export const ACTIVE_GENETICS_PACKS_STORAGE_KEY = "activeGeneticsPacks";
// Packs we've already auto-activated once for a kept species. Tracking this lets
// a user manually toggle a pack off without it being re-activated on next load.
export const AUTO_ACTIVATED_GENETICS_PACKS_STORAGE_KEY = "autoActivatedGeneticsPacks";

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]): void {
  if (typeof window === "undefined") return;
  const normalized = Array.from(new Set(values.filter((v): v is string => typeof v === "string")));
  window.localStorage.setItem(key, JSON.stringify(normalized));
}

export function readActiveGeneticsPacks(): string[] {
  return readStringArray(ACTIVE_GENETICS_PACKS_STORAGE_KEY);
}

export function writeActiveGeneticsPacks(packIds: string[]): void {
  writeStringArray(ACTIVE_GENETICS_PACKS_STORAGE_KEY, packIds);
}

/**
 * Reconcile the active genetics packs against the species the user keeps
 * ("My Species"). A pack for a kept species auto-activates the first time that
 * species appears; removing the species turns its pack off and resets the
 * auto-activation flag so re-adding it re-activates. Manual toggles in between
 * are respected (a kept species' pack is never force-reactivated once handled).
 *
 * @returns the reconciled list of active pack ids.
 */
export function reconcileGeneticsPacksWithSpecies(keptCommonNames: string[]): string[] {
  const active = new Set(readActiveGeneticsPacks());
  const autoActivated = new Set(readStringArray(AUTO_ACTIVATED_GENETICS_PACKS_STORAGE_KEY));

  for (const pack of ALL_GENETICS_PACKS) {
    const kept = keptCommonNames.some((name) => packMatchesSpecies(pack, name));
    if (kept) {
      // Auto-activate once per kept species; respect a later manual toggle-off.
      if (!autoActivated.has(pack.speciesId)) {
        active.add(pack.speciesId);
        autoActivated.add(pack.speciesId);
      }
    } else {
      // Species no longer kept — withdraw the pack and reset its flag.
      active.delete(pack.speciesId);
      autoActivated.delete(pack.speciesId);
    }
  }

  const activeIds = Array.from(active);
  writeActiveGeneticsPacks(activeIds);
  writeStringArray(AUTO_ACTIVATED_GENETICS_PACKS_STORAGE_KEY, Array.from(autoActivated));
  return activeIds;
}

/**
 * Genetics-pack state, linked to the user's "My Species" list. Auto-activates
 * packs for kept species, and exposes the packs available to the user
 * (i.e. those matching a kept species) plus manual on/off control.
 */
export function useGeneticsPacks() {
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();
  const [activePackIds, setActivePackIds] = useState<string[]>(() => readActiveGeneticsPacks());

  // Common names of the species the user keeps ("My Species").
  const keptCommonNames = useMemo<string[]>(() => {
    let ids: number[] = [];
    try {
      ids = settings?.favouriteSpeciesIds ? JSON.parse(settings.favouriteSpeciesIds) : [];
    } catch {
      ids = [];
    }
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => speciesList.find((s: any) => Number(s.id) === Number(id))?.commonName)
      .filter((name: unknown): name is string => typeof name === "string" && name.length > 0);
  }, [settings?.favouriteSpeciesIds, speciesList]);

  // Reconcile auto-activation whenever the kept species change. Wait for both
  // settings and the species catalogue so we don't wrongly withdraw everything.
  useEffect(() => {
    if (!settings || speciesList.length === 0) return;
    setActivePackIds(reconcileGeneticsPacksWithSpecies(keptCommonNames));
  }, [keptCommonNames, settings, speciesList.length]);

  const setPackActive = useCallback((speciesId: string, isActive: boolean) => {
    setActivePackIds((current) => {
      const next = isActive
        ? Array.from(new Set([...current, speciesId]))
        : current.filter((id) => id !== speciesId);
      writeActiveGeneticsPacks(next);
      return next;
    });
  }, []);

  const isPackActive = useCallback(
    (speciesId: string) => activePackIds.includes(speciesId),
    [activePackIds],
  );

  // Packs the user has access to: those matching a kept species.
  const availablePacks = useMemo<AnyGeneticsPack[]>(
    () => ALL_GENETICS_PACKS.filter((pack) => keptCommonNames.some((name) => packMatchesSpecies(pack, name))),
    [keptCommonNames],
  );

  return {
    activePackIds,
    isPackActive,
    setPackActive,
    availablePacks,
  };
}
