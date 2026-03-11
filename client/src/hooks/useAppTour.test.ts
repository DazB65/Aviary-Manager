// @vitest-environment jsdom
// client/src/hooks/useAppTour.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildSteps, type TourPhase } from "./useAppTour";

function makePhase(
  navElement: string,
  readySelector: string,
  pageStepCount: number
): TourPhase {
  return {
    navStep: {
      element: navElement,
      popover: { title: "Nav title", description: "Click here then Next" },
    },
    readySelector,
    steps: Array.from({ length: pageStepCount }, (_, i) => ({
      element: `#page-step-${i}`,
      popover: { title: `Step ${i}`, description: `Desc ${i}` },
    })),
  };
}

describe("buildSteps", () => {
  it("returns (1 nav + N page) steps per phase", () => {
    const moveNext = vi.fn();
    const phases = [
      makePhase("#tour-nav-settings", "#tour-breeding-year", 2),
      makePhase("#tour-nav-birds", "#tour-add-bird-btn", 2),
    ];
    // 2 phases × (1 nav step + 2 page steps) = 6
    expect(buildSteps(phases, moveNext)).toHaveLength(6);
  });

  it("injects onNextClick only on nav steps, not page steps", () => {
    const moveNext = vi.fn();
    const phases = [makePhase("#nav", "#ready", 2)];
    const result = buildSteps(phases, moveNext);

    // Index 0 = nav step → must have onNextClick
    expect(typeof result[0].onNextClick).toBe("function");

    // Indices 1–2 = page steps → must NOT have onNextClick
    expect(result[1].onNextClick).toBeUndefined();
    expect(result[2].onNextClick).toBeUndefined();
  });

  it("nav step onNextClick returns false (prevents driver.js auto-advance)", () => {
    const moveNext = vi.fn();
    const phases = [makePhase("#nav", "#ready", 1)];
    const result = buildSteps(phases, moveNext);

    // We call onNextClick without a real DOM — whenReady will timeout gracefully.
    // We only care that it returns false.
    const returnVal = result[0].onNextClick!();
    expect(returnVal).toBe(false);
  });

  it("preserves element and popover from navStep", () => {
    const moveNext = vi.fn();
    const phases = [makePhase("#tour-nav-settings", "#tour-breeding-year", 1)];
    const result = buildSteps(phases, moveNext);

    expect(result[0].element).toBe("#tour-nav-settings");
    expect(result[0].popover.title).toBe("Nav title");
  });

  it("preserves element and popover from page steps", () => {
    const moveNext = vi.fn();
    const phases = [makePhase("#nav", "#ready", 2)];
    const result = buildSteps(phases, moveNext);

    expect(result[1].element).toBe("#page-step-0");
    expect(result[2].element).toBe("#page-step-1");
  });

  it("handles a phase with zero page steps", () => {
    const moveNext = vi.fn();
    const phases = [makePhase("#nav", "#ready", 0)];
    // Only the nav step
    expect(buildSteps(phases, moveNext)).toHaveLength(1);
  });
});
