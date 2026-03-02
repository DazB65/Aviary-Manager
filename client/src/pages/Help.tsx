import DashboardLayout from "@/components/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { useAppTour } from "@/hooks/useAppTour";

type Article = { title: string; summary: string; content: string };
type Section = { id: string; emoji: string; title: string; articles: Article[] };

const SECTIONS: Section[] = [
  {
    id: "getting-started", emoji: "🚀", title: "Getting Started",
    articles: [
      {
        title: "Welcome to Aviary Manager",
        summary: "Aviary Manager helps you track your birds, breeding pairs, clutches, and health events — all in one place.",
        content: "Use the sidebar to navigate between sections. Start by adding your first bird under My Birds, then create a Breeding Pair, and log your first brood under Broods & Eggs. The Dashboard gives you a snapshot of your whole aviary at a glance.",
      },
      {
        title: "Managing Breeding Seasons",
        summary: "Aviary Manager is season-aware. Set a breeding year in Settings so every brood and pair belongs to the right season.",
        content: "Go to Settings and update the Breeding Season year. The Dashboard header shows your current season. You can view season-specific statistics in the Statistics page by selecting the year.",
      },
    ],
  },
  {
    id: "my-birds", emoji: "🐦", title: "My Birds",
    articles: [
      {
        title: "Adding and Editing Birds",
        summary: "Each bird in your registry has its own profile with species, gender, ring ID, cage number, colour mutation, photo and more.",
        content: "Click the + Add Bird button on the My Birds page. Fill in the species (required), gender, ring ID, date of birth, cage number, colour mutation and status. You can also assign a father and mother to build the pedigree tree. To edit a bird, hover over its card and click the pencil icon.",
      },
      {
        title: "Viewing the Pedigree Tree",
        summary: "The bird detail page shows a 3-generation pedigree tree: parents, grandparents, and great-grandparents.",
        content: "Click any bird card or list row to open its detail page. The Pedigree tab shows the full ancestor tree. Parents are set when adding or editing a bird using the Father and Mother dropdowns — all birds in your registry are available as parents, including deceased and sold ones.",
      },
      {
        title: "Bird Statuses",
        summary: "Birds can be marked as Alive, Breeding, Resting, Deceased, Sold, or Unknown. Deceased and sold birds remain in the app for pedigree purposes.",
        content: "Change a bird's status from the edit dialog. Deceased and sold birds are hidden from the main list by default — click 'Show inactive (N)' in the filter bar to reveal them. They remain selectable as parents so your pedigree records stay accurate.",
      },
    ],
  },
  {
    id: "breeding-pairs", emoji: "❤️", title: "Breeding Pairs",
    articles: [
      {
        title: "Creating a Breeding Pair",
        summary: "A breeding pair links a specific male and female for a specific season. The same two birds can be paired again in a different year.",
        content: "Click + New Pair on the Breeding Pairs page. Select the male and female bird, set the season year and pairing date, and choose the status (🥚 Active, 💤 Resting, or 🏁 Retired). Once paired, the birds' statuses update automatically.",
      },
      {
        title: "Inbreeding Warnings",
        summary: "Aviary Manager automatically calculates the inbreeding coefficient (F) for any proposed pairing and warns you before you save.",
        content: "When creating or editing a pair, the inbreeding coefficient appears as soon as both birds are selected. A green badge means no shared ancestors. Yellow is a mild warning; red means close inbreeding. The coefficient is based on all ancestor records in your registry.",
      },
    ],
  },
  {
    id: "broods", emoji: "🥚", title: "Broods & Eggs",
    articles: [
      {
        title: "Logging a Brood",
        summary: "A brood records a single clutch from a breeding pair. The app auto-calculates the expected hatch date from the lay date and species incubation period.",
        content: "Go to Broods & Eggs and click + New Brood. Select the breeding pair, enter the number of eggs and lay date. The expected hatch date is calculated automatically based on the species' incubation period. Set the brood status to Incubating, Hatched, or Failed.",
      },
      {
        title: "Tracking Egg Outcomes",
        summary: "Track individual eggs in a clutch — each one can be marked fertile, infertile, hatched, cracked, or died.",
        content: "Open a brood to see individual egg records. Update each egg's outcome as it develops. Outcomes: Fertile, Infertile, Hatched, Cracked, Died in Shell. The fertility rate and hatch rate for the clutch are calculated automatically from these outcomes.",
      },
      {
        title: "Registering Chicks as Birds",
        summary: "Once chicks hatch, register them as birds in your registry. Their parents, species and hatch date are pre-filled.",
        content: "On the brood detail page, click Register Chick next to a hatched egg. A new bird form opens with the species, hatch date (as date of birth), and both parents already filled in. Add the ring ID, gender and any other details, then save to add them to your registry.",
      },
    ],
  },
  {
    id: "events", emoji: "📅", title: "Events & Reminders",
    articles: [
      {
        title: "Adding Events and Reminders",
        summary: "Track vet visits, banding, medication rounds, and any custom reminder with a specific due date.",
        content: "Click + Add Event on the Events & Reminders page. Give it a title, set the due date, and optionally link it to a bird or pair. When the due date approaches, it surfaces on your Dashboard under Upcoming Events.",
      },
      {
        title: "Auto-Created Brood Events",
        summary: "When you log a brood, Aviary Manager automatically creates an expected hatch reminder so you never miss a hatch date.",
        content: "These events appear in Events & Reminders automatically when a brood is created. You can edit or delete them just like any other event. They link directly back to the brood so you can navigate to it in one click.",
      },
    ],
  },
  {
    id: "cages", emoji: "🏠", title: "Cages",
    articles: [
      {
        title: "Understanding the Cages Page",
        summary: "The Cages page gives you a live view of every cage in your aviary: which birds are in it and whether a pair is actively breeding.",
        content: "Cages are grouped by cage number. Each cage shows the birds assigned to it and their current status. Only active birds (Alive, Breeding, Resting) appear in cages — deceased and sold birds are excluded automatically.",
      },
      {
        title: "Assigning Cage Numbers",
        summary: "Cage numbers are assigned directly on birds. Once set, the Cages page builds itself automatically — there's no separate cage setup.",
        content: "Edit a bird and enter a value in the Cage Number field. Cage numbers can be anything — A1, Nest 3, Big Flight Cage. The same value on multiple birds groups them together on the Cages page.",
      },
    ],
  },
  {
    id: "statistics", emoji: "📊", title: "Statistics",
    articles: [
      {
        title: "Understanding Your Statistics",
        summary: "The Statistics page is your seasonal egg and chick report: hatch totals, fertility rates, clutch sizes, and success rates by pair.",
        content: "Filter by breeding year at the top of the page to view a specific season. The summary cards show total eggs, total hatched, fertility rate and hatch rate. Below, each pair's performance is broken down individually so you can identify your strongest pairs.",
      },
      {
        title: "Hatch Rate and Fertility Rate Explained",
        summary: "Hatch rate and fertility rate are the two most important breeding metrics. Understanding the difference helps you diagnose problems.",
        content: "Fertility rate = fertile eggs ÷ total eggs. This shows whether eggs are being fertilised. Hatch rate = hatched eggs ÷ fertile eggs. This shows whether fertile eggs are developing successfully. A low fertility rate suggests a pairing or health issue. A low hatch rate suggests incubation or development problems.",
      },
    ],
  },
  {
    id: "settings", emoji: "⚙️", title: "Settings",
    articles: [
      {
        title: "Breeding Seasons",
        summary: "Set your current breeding season year in Settings. This year is used across the app for broods, statistics and the dashboard season badge.",
        content: "Go to Settings and update the Breeding Season Year. This is a global setting — it affects the season shown on your dashboard and which year new broods are grouped under in Statistics. You can change it at any time as you move between seasons.",
      },
      {
        title: "My Species",
        summary: "Select the species you keep in your aviary. Your chosen species appear first in all dropdowns to speed up data entry.",
        content: "In Settings, click the species you keep to highlight them as favourites. When adding a bird or pair, the species dropdown shows your favourites first. You can still access all species by clicking 'Show all species'.",
      },
    ],
  },
];



export default function Help() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { startTour } = useAppTour();

  const q = search.toLowerCase();
  const filtered = SECTIONS
    .filter(s => activeCategory === "all" || s.id === activeCategory)
    .map(s => ({
      ...s,
      articles: s.articles.filter(a =>
        !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
      ),
    }))
    .filter(s => s.articles.length > 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="text-4xl">🗒️</div>
          <h1 className="font-display text-3xl font-bold text-foreground">Help Centre</h1>
          <p className="text-muted-foreground">Everything you need to get the most out of Aviary Manager. Search for a topic or browse by section.</p>
          <button
            onClick={startTour}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400 text-teal-700 text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            👁 Watch guided tour
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeCategory === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All topics
          </button>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveCategory(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeCategory === s.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>

        {/* Sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No articles found for "<strong>{search}</strong>"</p>
          </div>
        ) : (
          filtered.map(section => (
            <div key={section.id}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>{section.emoji}</span> {section.title}
                <span className="text-xs font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{section.articles.length}</span>
              </h2>
              <Accordion type="multiple" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.articles.map(article => (
                  <AccordionItem
                    key={article.title}
                    value={article.title}
                    className="border border-border rounded-xl px-4 bg-white shadow-sm"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                      {article.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                      <p className="font-medium text-foreground">{article.summary}</p>
                      <p>{article.content}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
