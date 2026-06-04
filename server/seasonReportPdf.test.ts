import { describe, expect, it } from "vitest";
import { generateSeasonScorecardPdf, type SeasonStats } from "./seasonReportPdf";

const fullStats: SeasonStats = {
  pairs: 6, broods: 11, incubating: 4,
  totalEggs: 48, eggsRemaining: 4, eggsResolved: 44,
  hatched: 9, fledged: 22, infertile: 6, died: 4,
  cracked: 2, missing: 1, abandoned: 0, losses: 13, hatchRate: 65,
};

const emptyStats: SeasonStats = {
  pairs: 0, broods: 0, incubating: 0, totalEggs: 0,
  hatched: 0, fledged: 0, infertile: 0, died: 0,
  cracked: 0, missing: 0, losses: 0, hatchRate: 0,
};

/** PDFKit emits page objects uncompressed in the xref, so this is reliable. */
function countPages(buf: Buffer): number {
  return (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
}

function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("generateSeasonScorecardPdf", () => {
  it("produces a valid single-page PDF from full season data", async () => {
    const buf = await generateSeasonScorecardPdf(fullStats, {
      year: 2026,
      aviaryName: "Darren's Gouldian Aviary",
      preparedFor: "darren@example.com",
      generatedAt: new Date("2026-06-04T10:00:00Z"),
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(countPages(buf)).toBe(1);
  });

  it("renders gracefully with an empty (zero-egg) season", async () => {
    const buf = await generateSeasonScorecardPdf(emptyStats, { year: 2025 });
    expect(isPdf(buf)).toBe(true);
    expect(countPages(buf)).toBe(1);
  });

  it("renders with only an email (no aviary name) and with neither", async () => {
    const emailOnly = await generateSeasonScorecardPdf(fullStats, {
      year: 2026, preparedFor: "darren@example.com",
    });
    const neither = await generateSeasonScorecardPdf(fullStats, { year: 2026 });
    expect(isPdf(emailOnly)).toBe(true);
    expect(isPdf(neither)).toBe(true);
    expect(countPages(emailOnly)).toBe(1);
    expect(countPages(neither)).toBe(1);
  });
});
