import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Check, Copy } from "lucide-react";
import type { ContentIdea } from "../../../server/routers";
import DashboardLayout from "@/components/DashboardLayout";

type Category = ContentIdea["category"] | "all";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  milestone: "🏆 Milestones",
  tip: "💡 Tips",
  seasonal: "🌱 Seasonal",
};

const CATEGORY_COLORS: Record<ContentIdea["category"], string> = {
  milestone: "bg-yellow-100 text-yellow-800",
  tip:       "bg-green-100 text-green-800",
  seasonal:  "bg-purple-100 text-purple-800",
};

const POSTED_KEY = "marketing-posted-ideas";

function getPosted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(POSTED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function savePosted(ids: Set<string>) {
  localStorage.setItem(POSTED_KEY, JSON.stringify(Array.from(ids)));
}

export default function Marketing() {
  const { data: ideas = [], isLoading } = trpc.marketing.ideas.useQuery();
  const [filter, setFilter] = useState<Category>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [posted, setPosted] = useState<Set<string>>(getPosted);

  const filtered = filter === "all" ? ideas : ideas.filter(i => i.category === filter);

  function copyCaption(idea: ContentIdea) {
    const text = `${idea.caption}\n\n${idea.hashtags}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idea.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function togglePosted(id: string) {
    setPosted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      savePosted(next);
      return next;
    });
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <img src="/logo-transparent.svg" alt="Aviary Manager" className="h-8 w-8 object-contain" />
            Content Ideas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ready-to-post captions about your aviary for Facebook &amp; Instagram.
            Copy a caption, paste it into{" "}
            <a
              href="https://business.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Meta Business Suite
            </a>
            , then mark it as posted.
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card animate-pulse h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No ideas in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isPosted={posted.has(idea.id)}
              isCopied={copied === idea.id}
              onCopy={() => copyCaption(idea)}
              onTogglePosted={() => togglePosted(idea.id)}
            />
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────
function IdeaCard({
  idea,
  isPosted,
  isCopied,
  onCopy,
  onTogglePosted,
}: {
  idea: ContentIdea;
  isPosted: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onTogglePosted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative rounded-xl border bg-card p-4 flex flex-col gap-3 transition-opacity ${
        isPosted ? "opacity-60" : ""
      }`}
    >
      {/* Posted badge */}
      {isPosted && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          <Check className="h-3 w-3" /> Posted
        </span>
      )}

      {/* Title row */}
      <div className="flex items-start gap-2 pr-16">
        <span className="text-xl leading-none mt-0.5">{idea.emoji}</span>
        <div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[idea.category]}`}
          >
            {idea.category.charAt(0).toUpperCase() + idea.category.slice(1)}
          </span>
          <p className="text-sm font-semibold text-foreground mt-1">{idea.title}</p>
        </div>
      </div>

      {/* Caption preview */}
      <div className="flex-1">
        <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
          {idea.caption}
        </p>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
        <p className="text-xs text-muted-foreground/70 mt-1 font-mono">{idea.hashtags}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t">
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isCopied ? (
            <><Check className="h-3.5 w-3.5" /> Copied!</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> Copy caption</>
          )}
        </button>
        <button
          onClick={onTogglePosted}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isPosted
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {isPosted ? "✓ Done" : "Mark posted"}
        </button>
      </div>
    </div>
  );
}

