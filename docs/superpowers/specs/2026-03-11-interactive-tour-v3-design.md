# Interactive Tour v3 — Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Scope:** `client/src/hooks/useAppTour.ts` (only file that changes)

---

## Problem

The current tour (v2) is generic — it points only to sidebar nav items and the AI FAB button. Phase 2 added anchor IDs to key page-level UI elements but the tour never uses them. Users finish the tour without seeing any actual controls.

## Goal

A single tour that walks new users through the core first-time workflow, navigating page-by-page and highlighting real UI elements in context.

---

## Architecture

### Three additions to `useAppTour.ts`

**1. `TourPhase` type**

```ts
type TourPhase = {
  navStep: {
    element: string;
    popover: { title: string; description: string; side?: string; align?: string };
  };
  readySelector: string; // CSS selector to wait for after navigation
  steps: StepDef[];      // Steps shown once on the target page
};
```

**2. `TOUR_PHASES` constant**

Plain data array — one object per workflow page. No logic, just copy and selectors. Covers: Settings, Birds, Pairs, Broods, Events.

**3. `buildSteps(phases, moveNext)` function**

Walks the phases array:
- Emits each `navStep` with an auto-injected `onNextClick` that calls `whenReady(phase.readySelector, moveNext)` and returns `false` to prevent driver.js auto-advancing
- Emits the phase's `steps[]` unchanged

Intro steps (Welcome, Dashboard stats) and outro (AI FAB, Done) are passed in separately and sit outside the phases loop.

### `driverObj` closure pattern

```ts
let driverObj: ReturnType<typeof driver>;
const steps = [
  ...introSteps,
  ...buildSteps(TOUR_PHASES, () => driverObj.moveNext()),
  ...outroSteps,
];
driverObj = driver({ steps, ...config });
driverObj.drive();
```

`driverObj` is assigned before `drive()` is called, so all `onNextClick` closures reference the correct instance.

### Navigation handling

All nav steps (steps 3, 6, 9, 11, 13) use the same auto-injected pattern:

```ts
onNextClick: () => {
  whenReady(phase.readySelector, () => driverObj.moveNext());
  return false; // prevents driver.js auto-advancing
}
```

User flow:
1. Tour highlights the sidebar nav item
2. User clicks it → page navigates → driver.js overlay survives (it's on `document.body`, outside React)
3. User clicks Next → `whenReady` polls until target element is in DOM → calls `moveNext()`

The existing `whenReady` utility (3s timeout, rAF polling) handles both instant and slow renders.

---

## Full Step Flow (16 steps)

### Intro — Dashboard

| # | Anchor | Title |
|---|--------|-------|
| 1 | *(center overlay)* | 👋 Welcome to Aviary Manager! |
| 2 | `#tour-dashboard-stats` | 📊 Your flock at a glance |

### Phase 1 — Settings

| # | Anchor | Title |
|---|--------|-------|
| 3 | `#tour-nav-settings` | ⚙️ Step 1 of 4: Settings *(nav step)* |
| 4 | `#tour-breeding-year` | 📅 Set your breeding year |
| 5 | `#tour-species-selector` | 🐦 Pin your favourite species |

### Phase 2 — My Birds

| # | Anchor | Title |
|---|--------|-------|
| 6 | `#tour-nav-birds` | 🐦 Step 2 of 4: My Birds *(nav step)* |
| 7 | `#tour-add-bird-btn` | ➕ Register a bird |
| 8 | `#tour-birds-filters` | 🔍 Find any bird instantly |

### Phase 3 — Breeding Pairs

| # | Anchor | Title |
|---|--------|-------|
| 9 | `#tour-nav-pairs` | ❤️ Step 3 of 4: Breeding Pairs *(nav step)* |
| 10 | `#tour-add-pair-btn` | ➕ Create a pairing |

### Phase 4 — Broods & Eggs

| # | Anchor | Title |
|---|--------|-------|
| 11 | `#tour-nav-broods` | 🥚 Broods & Eggs *(nav step)* |
| 12 | `#tour-log-brood-btn` | ➕ Log a clutch |

### Phase 5 — Events & Reminders

| # | Anchor | Title |
|---|--------|-------|
| 13 | `#tour-nav-events` | 📅 Step 4 of 4: Events *(nav step)* |
| 14 | `#tour-add-event-btn` | ➕ Schedule a reminder |

### Outro

| # | Anchor | Title |
|---|--------|-------|
| 15 | `#tour-ai-fab` | 🤖 AI Assistant |
| 16 | *(center overlay)* | You're all set! 🎉 |

**Note:** `#tour-getting-started` (onboarding checklist card) is intentionally excluded — it is conditionally rendered and would make the step count unreliable.

---

## State Management

```ts
const TOUR_KEY = "app-tour-v3";
const TOUR_SKIPPED_KEY = "app-tour-v3-skipped";
```

Bumping the key means users who completed v2 are offered v3 on next login. The existing `onDestroyed` / `onCloseClick` / `maybeStartTour` / `hasTourBeenCompleted` / `hasTourBeenSkipped` functions are **untouched**.

---

## What Does Not Change

- `whenReady` utility function
- `maybeStartTour`, `hasTourBeenCompleted`, `hasTourBeenSkipped` exports
- driver.js config (progress text, overlay colour, button labels, animation)
- How the tour is triggered (DashboardLayout on first load, Help page replay button)
- All other source files
