// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  ACTIVE_GENETICS_PACKS_STORAGE_KEY,
  readActiveGeneticsPacks,
  writeActiveGeneticsPacks,
} from "@/genetics/useGeneticsPacks";

describe("genetics pack storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(readActiveGeneticsPacks()).toEqual([]);
  });

  it("writes unique species IDs to localStorage as JSON", () => {
    writeActiveGeneticsPacks(["gouldian-finch", "gouldian-finch", "zebra-finch"]);

    expect(localStorage.getItem(ACTIVE_GENETICS_PACKS_STORAGE_KEY)).toBe(
      JSON.stringify(["gouldian-finch", "zebra-finch"])
    );
  });

  it("ignores malformed or non-string stored values", () => {
    localStorage.setItem(
      ACTIVE_GENETICS_PACKS_STORAGE_KEY,
      JSON.stringify(["gouldian-finch", 123, null])
    );
    expect(readActiveGeneticsPacks()).toEqual(["gouldian-finch"]);

    localStorage.setItem(ACTIVE_GENETICS_PACKS_STORAGE_KEY, "not-json");
    expect(readActiveGeneticsPacks()).toEqual([]);
  });
});