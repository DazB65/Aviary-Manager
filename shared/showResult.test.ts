import { describe, expect, it } from "vitest";
import { parseShowResult, isWinningResult, summariseShowResults } from "./showResult";

describe("parseShowResult", () => {
  it("treats 1st place and word ordinals as wins", () => {
    expect(parseShowResult("1st").isWin).toBe(true);
    expect(parseShowResult("1st Place").isWin).toBe(true);
    expect(parseShowResult("First").isWin).toBe(true);
    expect(parseShowResult("1").isWin).toBe(true);
  });

  it("treats top honours as wins", () => {
    expect(isWinningResult("Champion")).toBe(true);
    expect(isWinningResult("Best in Show")).toBe(true);
    expect(isWinningResult("BIS")).toBe(true);
    expect(isWinningResult("Best of Breed")).toBe(true);
  });

  it("does not count lower placings or reserve as wins", () => {
    expect(isWinningResult("2nd")).toBe(false);
    expect(isWinningResult("3rd place")).toBe(false);
    expect(isWinningResult("Reserve Champion")).toBe(false);
  });

  it("does not count unrecognised text as a win", () => {
    expect(isWinningResult("attended")).toBe(false);
    expect(isWinningResult("")).toBe(false);
    expect(isWinningResult(null)).toBe(false);
  });

  it("ranks honours above numeric placings", () => {
    expect(parseShowResult("Champion").rank).toBeLessThan(parseShowResult("1st").rank);
    expect(parseShowResult("1st").rank).toBeLessThan(parseShowResult("2nd").rank);
  });
});

describe("summariseShowResults", () => {
  it("counts wins and picks the best-ranked verbatim result", () => {
    const summary = summariseShowResults([
      { result: "2nd" },
      { result: "1st" },
      { result: "Champion" },
      { result: "attended" },
      { result: null },
    ]);
    expect(summary.totalShows).toBe(5);
    expect(summary.wins).toBe(2); // 1st + Champion
    expect(summary.bestResult).toBe("Champion");
  });

  it("returns no best result when nothing parses", () => {
    const summary = summariseShowResults([{ result: "showed up" }, { result: "" }]);
    expect(summary.totalShows).toBe(2);
    expect(summary.wins).toBe(0);
    expect(summary.bestResult).toBeNull();
  });
});
