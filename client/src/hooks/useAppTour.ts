import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "app-tour-completed";

export function useAppTour() {
  function startTour() {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.5)",
      smoothScroll: true,
      allowClose: true,
      doneBtnText: "Let's go! 🎉",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      steps: [
        {
          popover: {
            title: "👋 Welcome to Aviary Manager!",
            description:
              "Let us show you around in just 30 seconds. You can press Escape at any time to skip.",
            side: "over",
            align: "center",
          },
        },
        {
          element: "#tour-nav-dashboard",
          popover: {
            title: "🏠 Dashboard",
            description:
              "Your home base — see a snapshot of your flock at a glance: bird counts, active pairs, eggs incubating, and upcoming events.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-birds",
          popover: {
            title: "🐦 My Birds",
            description:
              "Add, edit and manage every bird in your collection. Track species, gender, ring ID, cage, colour mutations, photos and pedigree.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-pairs",
          popover: {
            title: "❤️ Breeding Pairs",
            description:
              "Set up and monitor breeding pairs. The app tracks compatibility and season history so you know which birds have bred together.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-broods",
          popover: {
            title: "🥚 Broods & Eggs",
            description:
              "Log clutches, track individual egg outcomes, and see expected hatch dates automatically calculated from lay date and species incubation period.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-events",
          popover: {
            title: "📅 Events & Reminders",
            description:
              "Schedule vet visits, banding, medication rounds, and any other reminders. Upcoming events surface straight to your dashboard.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-cages",
          popover: {
            title: "🏠 Cages",
            description:
              "See which birds are in each cage at a glance. Assign cage numbers to birds from the My Birds page.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-statistics",
          popover: {
            title: "📊 Statistics",
            description:
              "Dive into breeding season stats — hatch rates, clutch sizes, success rates by pair — so you can make informed decisions each season.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-nav-settings",
          popover: {
            title: "⚙️ Settings",
            description:
              "Set your favourite species for quick-add, adjust your breeding year, and personalise the app to your aviary.",
            side: "right",
            align: "start",
          },
        },
        {
          popover: {
            title: "You're all set! 🎉",
            description:
              "That's everything. Start by adding your first bird — click <strong>My Birds</strong> in the sidebar. Enjoy managing your aviary!",
            side: "over",
            align: "center",
          },
        },
      ],
      onDestroyed() {
        localStorage.setItem(TOUR_KEY, "true");
      },
    });

    driverObj.drive();
  }

  function maybeStartTour() {
    if (localStorage.getItem(TOUR_KEY) === "true") return;
    // Small delay so the sidebar/layout renders first
    setTimeout(startTour, 800);
  }

  return { startTour, maybeStartTour };
}

