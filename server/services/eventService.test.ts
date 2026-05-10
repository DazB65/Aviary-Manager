import { describe, expect, it } from "vitest";

describe("brood auto-event helpers", () => {
  it("treats hatched, failed, and abandoned broods as final", async () => {
    process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
    const { isFinalBroodStatus } = await import("./eventService");

    expect(isFinalBroodStatus("hatched")).toBe(true);
    expect(isFinalBroodStatus("failed")).toBe(true);
    expect(isFinalBroodStatus("abandoned")).toBe(true);
    expect(isFinalBroodStatus("incubating")).toBe(false);
    expect(isFinalBroodStatus(undefined)).toBe(false);
  });

  it("uses stable series IDs for brood fertility and hatch reminders", async () => {
    process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
    const { getBroodAutoEventSeriesIds } = await import("./eventService");

    expect(getBroodAutoEventSeriesIds(42)).toEqual(["brood-42-fertility", "brood-42-hatch"]);
  });
});
