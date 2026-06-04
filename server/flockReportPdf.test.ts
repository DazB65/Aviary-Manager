import { describe, expect, it } from "vitest";
import { generateFlockReportPdf, type FlockReportData } from "./flockReportPdf";
import type { SeasonStats } from "./seasonReportPdf";

const seasonStats: SeasonStats = {
  pairs: 10, broods: 11, incubating: 6, totalEggs: 54, eggsRemaining: 6, eggsResolved: 48,
  hatched: 0, fledged: 3, infertile: 29, died: 4, cracked: 1, missing: 2, abandoned: 9,
  losses: 45, hatchRate: 6,
};

const base: FlockReportData = {
  meta: { year: 2026, aviaryName: "Darren's Gouldian Aviary", preparedFor: "darren@example.com" },
  summary: { totalBirds: 84, totalMales: 45, totalFemales: 36, activePairs: 10, eggsIncubating: 6, upcomingHatches: 3, upcomingEvents: 5 },
  composition: {
    males: 45, females: 36, unknown: 3, totalSpecies: 7,
    topSpecies: [
      { name: "Gouldian Finch", count: 38 },
      { name: "Zebra Finch", count: 16 },
    ],
  },
  seasonStats,
};

const empty: FlockReportData = {
  meta: { year: 2025 },
  summary: { totalBirds: 0, totalMales: 0, totalFemales: 0, activePairs: 0, eggsIncubating: 0, upcomingHatches: 0, upcomingEvents: 0 },
  composition: { males: 0, females: 0, unknown: 0, totalSpecies: 0, topSpecies: [] },
  seasonStats: { pairs: 0, broods: 0, incubating: 0, totalEggs: 0, hatched: 0, fledged: 0, infertile: 0, died: 0, cracked: 0, missing: 0, losses: 0, hatchRate: 0 },
};

function countPages(buf: Buffer): number {
  return (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
}
const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

describe("generateFlockReportPdf", () => {
  it("produces a valid 3-page PDF from full data", async () => {
    const buf = await generateFlockReportPdf(base);
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(2000);
    expect(countPages(buf)).toBe(3);
  });

  it("renders gracefully for a brand-new, empty account", async () => {
    const buf = await generateFlockReportPdf(empty);
    expect(isPdf(buf)).toBe(true);
    expect(countPages(buf)).toBe(3);
  });
});
