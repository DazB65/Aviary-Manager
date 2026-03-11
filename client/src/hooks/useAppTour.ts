import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Bump this key whenever the tour content changes significantly so existing
// users who completed the old tour are offered the new one automatically.
const TOUR_KEY = "app-tour-v2";
// Separate key so we can distinguish "user deliberately skipped" vs "completed"
const TOUR_SKIPPED_KEY = "app-tour-v2-skipped";

/**
 * Waits until a CSS selector resolves to a DOM element, then calls `cb`.
 * Falls back to calling `cb` immediately after `maxWaitMs` if it never appears.
 * This replaces the fragile fixed `setTimeout` delay.
 */
function whenReady(selector: string, cb: () => void, maxWaitMs = 3000) {
  const start = Date.now();
  function check() {
    if (document.querySelector(selector)) {
      cb();
    } else if (Date.now() - start < maxWaitMs) {
      requestAnimationFrame(check);
    } else {
      // Element never appeared — start anyway so the tour isn't silently skipped
      cb();
    }
  }
  requestAnimationFrame(check);
}

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

// ── Tour phase data ───────────────────────────────────────────────────────

const TOUR_PHASES: TourPhase[] = [
  // ── Phase 1: Settings ──────────────────────────────────────────────────
  {
    navStep: {
      element: "#tour-nav-settings",
      popover: {
        title: "⚙️ Step 1 of 5: Settings",
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
        title: "🐦 Step 2 of 5: My Birds",
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
        title: "❤️ Step 3 of 5: Breeding Pairs",
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
        title: "🥚 Step 4 of 5: Broods & Eggs",
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
        title: "📅 Step 5 of 5: Events & Reminders",
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

export function useAppTour() {
  function startTour() {
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      animate: true,
      overlayColor: "rgba(0,0,0,0.55)",
      smoothScroll: true,
      allowClose: true,
      doneBtnText: "Start exploring 🚀",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      steps: [
        // ── 1. Welcome ────────────────────────────────────────────────────────
        {
          popover: {
            title: "👋 Welcome to Aviary Manager!",
            description:
              "Your complete bird-breeding companion. Let's take a 60-second tour so you know exactly where everything lives. Press <kbd>Esc</kbd> at any time to skip.",
            side: "over",
            align: "center",
          },
        },

        // ── 2. Dashboard ──────────────────────────────────────────────────────
        {
          element: "#tour-nav-dashboard",
          popover: {
            title: "🏠 Dashboard — your flock at a glance",
            description:
              "Every time you open the app you'll land here. Live counts of your birds, active pairs, eggs incubating, and upcoming events are always one click away.",
            side: "right",
            align: "start",
          },
        },

        // ── 3. My Birds ───────────────────────────────────────────────────────
        {
          element: "#tour-nav-birds",
          popover: {
            title: "🐦 My Birds — your full registry",
            description:
              "Add every bird you own and track their species, ring ID, gender, cage, colour mutation, photo, and full pedigree. You can filter, sort, and search across your entire flock instantly.",
            side: "right",
            align: "start",
          },
        },

        // ── 4. Breeding Pairs ─────────────────────────────────────────────────
        {
          element: "#tour-nav-pairs",
          popover: {
            title: "❤️ Breeding Pairs — manage your pairings",
            description:
              "Pair a male and female for a season. The app automatically checks for inbreeding, warns you about sibling pairings, and tracks every season's history so you can rotate pairs confidently.",
            side: "right",
            align: "start",
          },
        },

        // ── 5. Broods & Eggs ──────────────────────────────────────────────────
        {
          element: "#tour-nav-broods",
          popover: {
            title: "🥚 Broods & Eggs — clutch by clutch",
            description:
              "Log each clutch under a pair. Enter the lay date and the app calculates the fertility check date and expected hatch date automatically. Track the outcome of every individual egg and convert fledglings straight into your bird registry.",
            side: "right",
            align: "start",
          },
        },

        // ── 6. Events & Reminders ─────────────────────────────────────────────
        {
          element: "#tour-nav-events",
          popover: {
            title: "📅 Events & Reminders — never miss a thing",
            description:
              "Schedule vet visits, banding days, medication rounds, weaning dates, and more. Recurring reminders auto-advance when you mark them done. Overdue and upcoming events bubble straight up to your Dashboard.",
            side: "right",
            align: "start",
          },
        },

        // ── 7. Cages ─────────────────────────────────────────────────────────
        {
          element: "#tour-nav-cages",
          popover: {
            title: "🔲 Cages — see who's where",
            description:
              "A bird's-eye view of your aviary layout. All active birds are grouped by their cage number so you can spot overcrowding or empty cages at a glance. Assign cage numbers from the My Birds page.",
            side: "right",
            align: "start",
          },
        },

        // ── 8. Statistics ─────────────────────────────────────────────────────
        {
          element: "#tour-nav-statistics",
          popover: {
            title: "📊 Statistics — understand your results",
            description:
              "Season-by-season hatch rates, species breakdown, cage occupancy, and egg outcome summaries. Use these to identify your most productive pairs and make better decisions every breeding season.",
            side: "right",
            align: "start",
          },
        },

        // ── 9. Settings ───────────────────────────────────────────────────────
        {
          element: "#tour-nav-settings",
          popover: {
            title: "⚙️ Settings — make it yours",
            description:
              "Pin the species you keep so they appear first in every dropdown. Set the current breeding year once and it pre-fills across pairs, broods, and your dashboard summary automatically.",
            side: "right",
            align: "start",
          },
        },

        // ── 10. AI Assistant ──────────────────────────────────────────────────
        {
          element: "#tour-ai-fab",
          popover: {
            title: "🤖 AI Assistant — your aviary expert",
            description:
              "Tap this button any time to chat with your AI Aviary Assistant. Ask about your flock stats, search for specific birds, check upcoming events, or get advice on breeding — it has live access to your data.",
            side: "left",
            align: "center",
          },
        },

        // ── 11. Done ──────────────────────────────────────────────────────────
        {
          popover: {
            title: "You're all set! 🎉",
            description:
              "That's the full tour. Your next step: go to <strong>Settings</strong> to pin your species, then head to <strong>My Birds</strong> to add your first bird. You can replay this tour any time from the bottom of the sidebar.",
            side: "over",
            align: "center",
          },
        },
      ],

      onDestroyed() {
        // Mark as fully completed (not just skipped)
        localStorage.setItem(TOUR_KEY, "completed");
        localStorage.removeItem(TOUR_SKIPPED_KEY);
      },

      onCloseClick() {
        // User hit the X — record as skipped so we can show a subtle reminder
        if (localStorage.getItem(TOUR_KEY) !== "completed") {
          localStorage.setItem(TOUR_SKIPPED_KEY, "true");
        }
      },
    });

    driverObj.drive();
  }

  function maybeStartTour() {
    // Don't auto-start if the user has already completed or explicitly skipped it
    if (
      localStorage.getItem(TOUR_KEY) === "completed" ||
      localStorage.getItem(TOUR_SKIPPED_KEY) === "true"
    ) return;

    // Wait until the first nav element is in the DOM before firing,
    // instead of using a fixed setTimeout delay.
    whenReady("#tour-nav-dashboard", startTour);
  }

  function hasTourBeenCompleted() {
    return localStorage.getItem(TOUR_KEY) === "completed";
  }

  function hasTourBeenSkipped() {
    return localStorage.getItem(TOUR_SKIPPED_KEY) === "true";
  }

  return { startTour, maybeStartTour, hasTourBeenCompleted, hasTourBeenSkipped };
}

