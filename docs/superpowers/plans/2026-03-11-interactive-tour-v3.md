# Interactive Tour v3 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the app tour from a generic nav overview into a 16-step workflow tour that navigates page-by-page (Settings → Birds → Pairs → Broods → Events) and highlights real UI elements.

**Architecture:** Extract a `TOUR_PHASES` data array and a `buildSteps()` function that auto-injects `onNextClick` navigation handlers. `startTour()` assembles intro + phase steps + outro using a `let driverObj` closure ref so callbacks always point at the live instance.

**Tech Stack:** TypeScript, driver.js v1.x, Vitest, wouter (routing — not used directly; user clicks sidebar nav items)

**Spec:** `docs/superpowers/specs/2026-03-11-interactive-tour-v3-design.md`

---

## File Map

| Action | Path | What changes |
|--------|------|-------------|
| Modify | `vitest.config.ts` | Expand `include` to cover `client/src/hooks/**/*.test.ts` |
| Create | `client/src/hooks/useAppTour.test.ts` | Unit tests for `buildSteps()` |
| Modify | `client/src/hooks/useAppTour.ts` | All tour logic — add type, `buildSteps`, `TOUR_PHASES`, update `startTour`, bump `TOUR_KEY` |

No other files change. All existing exports (`startTour`, `maybeStartTour`, `hasTourBeenCompleted`, `hasTourBeenSkipped`) remain intact.

---

## Chunk 1: `buildSteps()` utility — test first, then implement

### Task 1: Expand vitest config to include client hook tests

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Open `vitest.config.ts` and add the client hooks pattern to `include`**

Replace the `include` array:

```ts
include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
```

With:

```ts
include: [
  "server/**/*.test.ts",
  "server/**/*.spec.ts",
  "client/src/hooks/**/*.test.ts",
],
```

Leave everything else (root, resolve aliases, environment) unchanged.

- [ ] **Step 2: Verify the config is valid**

```bash
pnpm test --reporter=verbose 2>&1 | head -20
```

Expected: existing server tests still pass, no config errors.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: expand vitest include to cover client hook tests"
```

---

### Task 2: Write failing tests for `buildSteps()`

**Files:**
- Create: `client/src/hooks/useAppTour.test.ts`

- [ ] **Step 1: Create the test file**

The test calls `onNextClick()` which internally calls `requestAnimationFrame` (via `whenReady`). This API is only available in jsdom, not node. The `// @vitest-environment jsdom` pragma at the top of the file tells Vitest to use jsdom for this file only, without changing the global config.

```ts
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
```

- [ ] **Step 2: Run the tests — verify they FAIL**

```bash
pnpm test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|Error" | head -20
```

Expected: `FAIL` with something like `SyntaxError: The requested module ... does not provide an export named 'buildSteps'`

- [ ] **Step 3: Commit the failing test**

```bash
git add client/src/hooks/useAppTour.test.ts
git commit -m "test(tour): add failing tests for buildSteps utility"
```

---

### Task 3: Implement `TourPhase` type and `buildSteps()` — make tests pass

**Files:**
- Modify: `client/src/hooks/useAppTour.ts`

- [ ] **Step 1: Add `TourPhase` type and `buildSteps()` export at module scope**

Insert at **module level** — between the closing `}` of `whenReady` and the `export function useAppTour()` declaration. Do NOT place this code inside `useAppTour()`. It must be top-level so the test file can import `buildSteps` and `TourPhase` as named exports.

```ts
// ── Types ─────────────────────────────────────────────────────────────────

type StepDef = {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right" | "over";
    align?: "start" | "center" | "end";
  };
};

export type TourPhase = {
  /** Step that points at the sidebar nav item */
  navStep: StepDef & { element: string };
  /** CSS selector to wait for once the user has navigated to the target page */
  readySelector: string;
  /** Steps shown on the target page after navigation */
  steps: StepDef[];
};

// ── buildSteps ────────────────────────────────────────────────────────────

/**
 * Assembles a flat driver.js steps array from a TOUR_PHASES config.
 * Each phase emits:
 *   1. A nav step (points at the sidebar item) with an auto-injected
 *      onNextClick that waits for `readySelector` before advancing.
 *   2. The phase's page-level steps, unchanged.
 */
export function buildSteps(
  phases: TourPhase[],
  moveNext: () => void
): Array<StepDef & { onNextClick?: () => false | void }> {
  const result: Array<StepDef & { onNextClick?: () => false | void }> = [];

  for (const phase of phases) {
    result.push({
      ...phase.navStep,
      onNextClick: () => {
        whenReady(phase.readySelector, moveNext);
        return false;
      },
    });

    for (const step of phase.steps) {
      result.push(step);
    }
  }

  return result;
}
```

- [ ] **Step 2: Run the tests — verify they all PASS**

```bash
pnpm test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×" | head -30
```

Expected: all 6 `buildSteps` tests pass. Existing server tests still pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useAppTour.ts
git commit -m "feat(tour): add TourPhase type and buildSteps utility"
```

---

## Chunk 2: `TOUR_PHASES` data and `startTour()` refactor

### Task 4: Add `TOUR_PHASES` constant

**Files:**
- Modify: `client/src/hooks/useAppTour.ts`

- [ ] **Step 1: Insert `TOUR_PHASES` directly before `export function useAppTour()`**

```ts
// ── Tour phase data ───────────────────────────────────────────────────────

const TOUR_PHASES: TourPhase[] = [
  // ── Phase 1: Settings ──────────────────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-settings",
      popover: {
        title: "⚙️ Step 1 of 4: Settings",
        description:
          "Let's do a quick setup first. Click <strong>Settings</strong> in the sidebar, then press <strong>Next →</strong>",
        side: "right",
        align: "start",
      },
    },
    readySelector: "#tour-breeding-year",
    steps: [
      {
        element: "#tour-breeding-year",
        popover: {
          title: "📅 Set your breeding year",
          description:
            "Set this once and it pre-fills across pairs, broods, and your dashboard summary — no need to re-enter each season.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-species-selector",
        popover: {
          title: "🐦 Pin your favourite species",
          description:
            "Tick the species you keep and they float to the top of every dropdown — no more scrolling through a long list.",
          side: "top",
          align: "start",
        },
      },
    ],
  },

  // ── Phase 2: My Birds ──────────────────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-birds",
      popover: {
        title: "🐦 Step 2 of 4: My Birds",
        description:
          "Time to add your flock. Click <strong>My Birds</strong> in the sidebar, then press <strong>Next →</strong>",
        side: "right",
        align: "start",
      },
    },
    readySelector: "#tour-add-bird-btn",
    steps: [
      {
        element: "#tour-add-bird-btn",
        popover: {
          title: "➕ Register a bird",
          description:
            "Click here to add a bird — ring ID, species, gender, cage, colour mutation, photo, and full pedigree all live in one place.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-birds-filters",
        popover: {
          title: "🔍 Find any bird instantly",
          description:
            "Filter by species, gender, or cage number — or search by name and ring ID. Works across your entire flock in real time.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },

  // ── Phase 3: Breeding Pairs ────────────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-pairs",
      popover: {
        title: "❤️ Step 3 of 4: Breeding Pairs",
        description:
          "Ready to set up your pairings? Click <strong>Breeding Pairs</strong> in the sidebar, then press <strong>Next →</strong>",
        side: "right",
        align: "start",
      },
    },
    readySelector: "#tour-add-pair-btn",
    steps: [
      {
        element: "#tour-add-pair-btn",
        popover: {
          title: "➕ Create a pairing",
          description:
            "Select a male and female and the app automatically checks for inbreeding — warning you about sibling pairings before you confirm.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },

  // ── Phase 4: Broods & Eggs ─────────────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-broods",
      popover: {
        title: "🥚 Broods & Eggs",
        description:
          "When your pair lays a clutch, log it here. Click <strong>Broods & Eggs</strong> in the sidebar, then press <strong>Next →</strong>",
        side: "right",
        align: "start",
      },
    },
    readySelector: "#tour-log-brood-btn",
    steps: [
      {
        element: "#tour-log-brood-btn",
        popover: {
          title: "➕ Log a clutch",
          description:
            "Enter the lay date and the app calculates the fertility check date and expected hatch date automatically — with per-egg outcome tracking.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },

  // ── Phase 5: Events & Reminders ───────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-events",
      popover: {
        title: "📅 Step 4 of 4: Events & Reminders",
        description:
          "Never miss a vet visit or banding day. Click <strong>Events & Reminders</strong> in the sidebar, then press <strong>Next →</strong>",
        side: "right",
        align: "start",
      },
    },
    readySelector: "#tour-add-event-btn",
    steps: [
      {
        element: "#tour-add-event-btn",
        popover: {
          title: "➕ Schedule a reminder",
          description:
            "Vet visits, banding days, medication rounds, weaning dates — recurring reminders auto-advance when you mark them done.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },
];
```

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
pnpm test --reporter=verbose 2>&1 | grep -E "FAIL|PASS" | head -10
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useAppTour.ts
git commit -m "feat(tour): add TOUR_PHASES data for all 5 workflow pages"
```

---

### Task 5: Update `TOUR_KEY` and refactor `startTour()`

**Files:**
- Modify: `client/src/hooks/useAppTour.ts`

- [ ] **Step 1: Bump the tour keys at the top of the file**

Replace:
```ts
const TOUR_KEY = "app-tour-v2";
const TOUR_SKIPPED_KEY = "app-tour-v2-skipped";
```

With:
```ts
const TOUR_KEY = "app-tour-v3";
const TOUR_SKIPPED_KEY = "app-tour-v3-skipped";
```

- [ ] **Step 2: Replace the entire `startTour()` function body**

Replace the existing `startTour` implementation (everything inside `function startTour() { ... }`) with:

```ts
function startTour() {
  // driverObj is declared here so the buildSteps closures can reference it
  // via the moveNext callback after it has been assigned below.
  let driverObj: ReturnType<typeof driver>;

  const introSteps = [
    // ── 1. Welcome ──────────────────────────────────────────────────────
    {
      popover: {
        title: "👋 Welcome to Aviary Manager!",
        description:
          "Your complete bird-breeding companion. Let's take a 2-minute tour of your first setup — so you can hit the ground running. Press <kbd>Esc</kbd> at any time to skip.",
        side: "over",
        align: "center",
      },
    },
    // ── 2. Dashboard stats ───────────────────────────────────────────────
    {
      element: "#tour-dashboard-stats",
      popover: {
        title: "📊 Your flock at a glance",
        description:
          "These four cards update live — total birds, active pairs, eggs incubating, and upcoming events. This is your home base every time you open the app.",
        side: "bottom",
        align: "center",
      },
    },
  ];

  const outroSteps = [
    // ── AI assistant ─────────────────────────────────────────────────────
    {
      element: "#tour-ai-fab",
      popover: {
        title: "🤖 AI Assistant — always here",
        description:
          "Tap this any time to chat with your Aviary AI. It has live access to your data — ask about flock stats, upcoming events, or get breeding advice.",
        side: "left",
        align: "center",
      },
    },
    // ── Done ─────────────────────────────────────────────────────────────
    {
      popover: {
        title: "You're all set! 🎉",
        description:
          "You now know the core workflow. Your next step: head to <strong>Settings</strong> to pin your species and set the year, then go to <strong>My Birds</strong> to add your first bird. You can replay this tour any time from the Help page.",
        side: "over",
        align: "center",
      },
    },
  ];

  const allSteps = [
    ...introSteps,
    ...buildSteps(TOUR_PHASES, () => driverObj.moveNext()),
    ...outroSteps,
  ];

  driverObj = driver({
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    animate: true,
    overlayColor: "rgba(0,0,0,0.55)",
    smoothScroll: true,
    allowClose: true,
    doneBtnText: "Start exploring 🚀",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    steps: allSteps,

    onDestroyed() {
      localStorage.setItem(TOUR_KEY, "completed");
      localStorage.removeItem(TOUR_SKIPPED_KEY);
    },

    onCloseClick() {
      if (localStorage.getItem(TOUR_KEY) !== "completed") {
        localStorage.setItem(TOUR_SKIPPED_KEY, "true");
      }
    },
  });

  driverObj.drive();
}
```

- [ ] **Step 3: Run tests — verify all still pass**

```bash
pnpm test --reporter=verbose 2>&1 | grep -E "FAIL|PASS" | head -10
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useAppTour.ts
git commit -m "feat(tour): refactor startTour to phase-config architecture (v3)"
```

---

### Task 6: Manual verification in the browser

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Open `http://localhost:5000` (or whichever port the app uses).

- [ ] **Step 2: Reset tour state so the tour auto-starts**

In the browser DevTools console:

```js
localStorage.removeItem("app-tour-v3");
localStorage.removeItem("app-tour-v3-skipped");
location.reload();
```

Expected: the tour launches automatically after reload.

- [ ] **Step 3: Walk through the full tour — verify each checkpoint**

| Step | Expected |
|------|----------|
| 1 | Welcome popover appears centred |
| 2 | Dashboard stats grid (`#tour-dashboard-stats`) is highlighted |
| 3 | Settings nav item highlighted; description says "Click Settings… then Next →" |
| — | Click **Settings** nav item in sidebar (page navigates to `/settings`) |
| — | Click **Next →** |
| 4 | Breeding year card (`#tour-breeding-year`) highlighted on Settings page |
| 5 | Species selector card (`#tour-species-selector`) highlighted |
| 6 | Birds nav item highlighted; description says "Click My Birds… then Next →" |
| — | Click **My Birds**, then **Next →** |
| 7 | Add Bird button (`#tour-add-bird-btn`) highlighted |
| 8 | Filter bar (`#tour-birds-filters`) highlighted |
| 9 | Pairs nav item highlighted |
| — | Click **Breeding Pairs**, then **Next →** |
| 10 | Add Pair button (`#tour-add-pair-btn`) highlighted |
| 11 | Broods nav item highlighted |
| — | Click **Broods & Eggs**, then **Next →** |
| 12 | Log Brood button (`#tour-log-brood-btn`) highlighted |
| 13 | Events nav item highlighted |
| — | Click **Events & Reminders**, then **Next →** |
| 14 | Add Event button (`#tour-add-event-btn`) highlighted |
| 15 | AI FAB (`#tour-ai-fab`) highlighted |
| 16 | Done popover appears centred |

- [ ] **Step 4: Verify completion state is persisted**

After completing the tour, in DevTools console:

```js
localStorage.getItem("app-tour-v3") // should be "completed"
```

Reload — tour should NOT auto-start again.

- [ ] **Step 5: Verify replay from Help page works**

Navigate to Help → click "Take the tour" button — tour should start from step 1.

- [ ] **Step 6: Verify skip (Esc) behaviour**

Reset state again, reload, press Esc during the tour:

```js
localStorage.getItem("app-tour-v3-skipped") // should be "true"
localStorage.getItem("app-tour-v3")          // should be null
```

Reload — tour should NOT auto-start (skipped state respected).

- [ ] **Step 7: Final commit**

```bash
git add client/src/hooks/useAppTour.ts
git commit -m "feat(tour): interactive tour v3 — workflow-driven, page-by-page"
```
