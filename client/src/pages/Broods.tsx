import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Egg, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  incubating: "bg-amber-50 text-amber-700 border-amber-200",
  hatched: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  abandoned: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  incubating: <Egg className="h-3.5 w-3.5" />,
  hatched: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  abandoned: <XCircle className="h-3.5 w-3.5" />,
};

type EggOutcome = "unknown" | "fertile" | "infertile" | "cracked" | "hatched" | "died";

const EGG_OUTCOME_CONFIG: Record<EggOutcome, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  unknown:   { label: "Unknown",   emoji: "🥚", bg: "bg-gray-50",     text: "text-gray-500",   border: "border-gray-200" },
  fertile:   { label: "Fertile",   emoji: "🟢", bg: "bg-emerald-50",  text: "text-emerald-700",border: "border-emerald-300" },
  infertile: { label: "Infertile", emoji: "⚪", bg: "bg-slate-50",    text: "text-slate-500",  border: "border-slate-200" },
  cracked:   { label: "Cracked",   emoji: "💔", bg: "bg-orange-50",   text: "text-orange-600", border: "border-orange-200" },
  hatched:   { label: "Hatched",   emoji: "🐣", bg: "bg-teal-50",     text: "text-teal-700",   border: "border-teal-300" },
  died:      { label: "Died",      emoji: "🖤", bg: "bg-red-50",      text: "text-red-600",    border: "border-red-200" },
};

const EGG_OUTCOME_CYCLE: EggOutcome[] = ["unknown", "fertile", "infertile", "cracked", "hatched", "died"];

// ─── Egg outcome grid for a single brood ─────────────────────────────────────
function ClutchEggGrid({ broodId, eggsLaid }: { broodId: number; eggsLaid: number }) {
  const utils = trpc.useUtils();
  const { data: eggs = [], isLoading } = trpc.clutchEggs.byBrood.useQuery({ broodId });
  const upsertEgg = trpc.clutchEggs.upsert.useMutation({
    onSuccess: () => utils.clutchEggs.byBrood.invalidate({ broodId }),
    onError: (e) => toast.error(e.message),
  });

  if (eggsLaid === 0) return (
    <p className="text-xs text-muted-foreground italic">No eggs recorded for this brood.</p>
  );
  if (isLoading) return <div className="flex gap-2">{[...Array(eggsLaid)].map((_, i) => <div key={i} className="w-12 h-14 rounded-lg bg-muted animate-pulse" />)}</div>;

  // Build a map of eggNumber → outcome
  const eggMap: Record<number, EggOutcome> = {};
  for (const e of eggs) eggMap[e.eggNumber] = e.outcome as EggOutcome;

  // Stats
  const fertile = eggs.filter(e => e.outcome === "fertile" || e.outcome === "hatched").length;
  const hatched = eggs.filter(e => e.outcome === "hatched").length;
  const infertile = eggs.filter(e => e.outcome === "infertile").length;
  const unknown = eggs.filter(e => e.outcome === "unknown").length;
  const fertilityRate = eggsLaid > 0 ? Math.round((fertile / eggsLaid) * 100) : 0;
  const hatchRate = fertile > 0 ? Math.round((hatched / fertile) * 100) : 0;

  function cycleOutcome(eggNumber: number) {
    const current = eggMap[eggNumber] ?? "unknown";
    const idx = EGG_OUTCOME_CYCLE.indexOf(current);
    const next = EGG_OUTCOME_CYCLE[(idx + 1) % EGG_OUTCOME_CYCLE.length];
    upsertEgg.mutate({ broodId, eggNumber, outcome: next });
  }

  return (
    <div className="space-y-3">
      {/* Egg cells */}
      <div className="flex flex-wrap gap-2">
        {[...Array(eggsLaid)].map((_, i) => {
          const num = i + 1;
          const outcome = eggMap[num] ?? "unknown";
          const cfg = EGG_OUTCOME_CONFIG[outcome];
          return (
            <button
              key={num}
              onClick={() => cycleOutcome(num)}
              title={`Egg ${num}: ${cfg.label} — click to cycle`}
              className={`w-12 h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 active:scale-95 ${cfg.bg} ${cfg.border}`}
            >
              <span className="text-lg leading-none">{cfg.emoji}</span>
              <span className={`text-[9px] font-semibold leading-none ${cfg.text}`}>#{num}</span>
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {(Object.entries(EGG_OUTCOME_CONFIG) as [EggOutcome, typeof EGG_OUTCOME_CONFIG[EggOutcome]][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">{v.emoji} {v.label}</span>
        ))}
        <span className="text-muted-foreground/50">· click egg to cycle</span>
      </div>
      {/* Summary stats */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
          🟢 {fertile} fertile · {fertilityRate}% fertility rate
        </span>
        <span className="px-2 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
          🐣 {hatched} hatched · {hatchRate}% hatch rate
        </span>
        {infertile > 0 && (
          <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-500 font-medium">
            ⚪ {infertile} infertile
          </span>
        )}
        {unknown > 0 && (
          <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-500 font-medium">
            🥚 {unknown} pending
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Brood card with expandable egg grid ─────────────────────────────────────
function BroodCard({
  brood,
  pairLabel,
  onEdit,
  onDelete,
}: {
  brood: any;
  pairLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hatchCountdown = brood.status === "incubating" ? daysUntil(brood.expectedHatchDate) : null;
  const fertilityCountdown = brood.status === "incubating" ? daysUntil(brood.fertilityCheckDate) : null;

  return (
    <Card className="border border-border shadow-card hover:shadow-elevated transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xl shrink-0">
              🥚
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{pairLabel}</p>
                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${STATUS_STYLES[brood.status]}`}>
                  {STATUS_ICONS[brood.status]} {brood.status}
                </Badge>
                {brood.season && <span className="text-xs text-muted-foreground">{brood.season}</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Eggs laid</p>
                  <p className="text-sm font-semibold">{brood.eggsLaid ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lay date</p>
                  <p className="text-sm">{formatDateStr(brood.layDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fertility check</p>
                  <p className="text-sm">{formatDateStr(brood.fertilityCheckDate)}</p>
                  {fertilityCountdown && <p className="text-xs text-amber-600 font-medium">{fertilityCountdown}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected hatch</p>
                  <p className="text-sm">{formatDateStr(brood.expectedHatchDate)}</p>
                  {hatchCountdown && <p className="text-xs text-teal-600 font-medium">{hatchCountdown}</p>}
                </div>
              </div>
              {brood.status === "hatched" && (
                <p className="text-xs text-emerald-600 mt-1">✓ {brood.chicksSurvived ?? 0} chick{(brood.chicksSurvived ?? 0) !== 1 ? "s" : ""} survived · Hatched {formatDateStr(brood.actualHatchDate)}</p>
              )}
              {brood.notes && <p className="text-xs text-muted-foreground mt-1">{brood.notes}</p>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 items-start">
            <Button
              variant="ghost" size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Eggs
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expandable egg outcome grid */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Individual Egg Outcomes
            </p>
            <ClutchEggGrid broodId={brood.id} eggsLaid={brood.eggsLaid ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type BroodFormData = {
  pairId: string;
  season: string;
  eggsLaid: string;
  layDate: string;
  incubationDays: string;
  actualHatchDate: string;
  chicksSurvived: string;
  status: "incubating" | "hatched" | "failed" | "abandoned";
  notes: string;
};

const defaultForm: BroodFormData = {
  pairId: "",
  season: String(new Date().getFullYear()),
  eggsLaid: "0",
  layDate: "",
  incubationDays: "14",
  actualHatchDate: "",
  chicksSurvived: "0",
  status: "incubating",
  notes: "",
};

function formatDateStr(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : parseISO(String(val));
  return format(d, "dd MMM yyyy");
}

function daysUntil(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : parseISO(String(val));
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today!";
  return `in ${diff}d`;
}

export default function Broods() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BroodFormData>(defaultForm);
  const [filterPairId, setFilterPairId] = useState("all");

  const utils = trpc.useUtils();
  const { data: broods = [], isLoading } = trpc.broods.list.useQuery();
  const { data: pairs = [] } = trpc.pairs.list.useQuery();
  const { data: birds = [] } = trpc.birds.list.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();

  const createBrood = trpc.broods.create.useMutation({
    onSuccess: (newBrood) => {
      utils.broods.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Brood logged!");
      setDialogOpen(false);
      // Sync egg slots after creation
      if (newBrood && Number(form.eggsLaid) > 0) {
        syncEggs.mutate({ broodId: (newBrood as any).id ?? 0, eggsLaid: Number(form.eggsLaid) });
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const updateBrood = trpc.broods.update.useMutation({
    onSuccess: (_, vars) => {
      utils.broods.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Brood updated!");
      setDialogOpen(false);
      if (editingId && vars.eggsLaid !== undefined) {
        syncEggs.mutate({ broodId: editingId, eggsLaid: vars.eggsLaid });
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteBrood = trpc.broods.delete.useMutation({
    onSuccess: () => { utils.broods.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Brood removed."); },
    onError: (e) => toast.error(e.message),
  });
  const syncEggs = trpc.clutchEggs.sync.useMutation();

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));
  const birdMap = Object.fromEntries(birds.map(b => [b.id, b]));

  function pairLabel(pair: typeof pairs[0]) {
    const male = birdMap[pair.maleId];
    const female = birdMap[pair.femaleId];
    const mLabel = male ? (male.name || male.ringId || `#${male.id}`) : "?";
    const fLabel = female ? (female.name || female.ringId || `#${female.id}`) : "?";
    return `${mLabel} ♂ × ${fLabel} ♀`;
  }

  function handlePairChange(pairId: string) {
    setForm(f => {
      const pair = pairs.find(p => String(p.id) === pairId);
      if (pair) {
        const male = birdMap[pair.maleId];
        if (male) {
          const sp = speciesMap[male.speciesId];
          if (sp) return { ...f, pairId, incubationDays: String(sp.incubationDays) };
        }
      }
      return { ...f, pairId };
    });
  }

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (brood: typeof broods[0]) => {
    setEditingId(brood.id);
    setForm({
      pairId: String(brood.pairId),
      season: brood.season ?? String(new Date().getFullYear()),
      eggsLaid: String(brood.eggsLaid ?? 0),
      layDate: brood.layDate ? (brood.layDate instanceof Date ? format(brood.layDate, "yyyy-MM-dd") : String(brood.layDate)) : "",
      incubationDays: "14",
      actualHatchDate: brood.actualHatchDate ? (brood.actualHatchDate instanceof Date ? format(brood.actualHatchDate, "yyyy-MM-dd") : String(brood.actualHatchDate)) : "",
      chicksSurvived: String(brood.chicksSurvived ?? 0),
      status: brood.status,
      notes: brood.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.pairId) { toast.error("Please select a pair"); return; }
    const payload = {
      pairId: Number(form.pairId),
      season: form.season || undefined,
      eggsLaid: Number(form.eggsLaid),
      layDate: form.layDate || undefined,
      incubationDays: Number(form.incubationDays),
      actualHatchDate: form.actualHatchDate || undefined,
      chicksSurvived: Number(form.chicksSurvived),
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateBrood.mutate({ id: editingId, ...payload });
    } else {
      createBrood.mutate(payload);
    }
  };

  const filtered = filterPairId === "all" ? broods : broods.filter(b => String(b.pairId) === filterPairId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Broods & Eggs</h1>
            <p className="text-muted-foreground mt-1">{broods.filter(b => b.status === "incubating").length} clutch{broods.filter(b => b.status === "incubating").length !== 1 ? "es" : ""} currently incubating</p>
          </div>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Log Brood
          </Button>
        </div>

        {/* Filter by pair */}
        <Select value={filterPairId} onValueChange={setFilterPairId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All pairs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pairs</SelectItem>
            {pairs.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{pairLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Egg className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No broods logged yet</p>
            <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Log your first brood</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(brood => {
              const pair = pairs.find(p => p.id === brood.pairId);
              return (
                <BroodCard
                  key={brood.id}
                  brood={brood}
                  pairLabel={pair ? pairLabel(pair) : `Pair #${brood.pairId}`}
                  onEdit={() => openEdit(brood)}
                  onDelete={() => { if (confirm("Delete this brood record?")) deleteBrood.mutate({ id: brood.id }); }}
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingId ? "Edit Brood" : "Log New Brood"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Breeding Pair *</Label>
              <Select value={form.pairId} onValueChange={handlePairChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select pair..." /></SelectTrigger>
                <SelectContent>
                  {pairs.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{pairLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Season / Year</Label>
                <Input className="mt-1" placeholder="2025" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
              </div>
              <div>
                <Label>Eggs Laid</Label>
                <Input type="number" min="0" className="mt-1" value={form.eggsLaid} onChange={e => setForm(f => ({ ...f, eggsLaid: e.target.value }))} />
              </div>
              <div>
                <Label>Lay Date</Label>
                <Input type="date" className="mt-1" value={form.layDate} onChange={e => setForm(f => ({ ...f, layDate: e.target.value }))} />
              </div>
              <div>
                <Label>Incubation Days</Label>
                <Input type="number" min="1" className="mt-1" value={form.incubationDays} onChange={e => setForm(f => ({ ...f, incubationDays: e.target.value }))} />
              </div>
            </div>
            {form.layDate && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700 space-y-1">
                <p>🔍 Fertility check: <strong>{format(new Date(new Date(form.layDate).getTime() + 7 * 86400000), "dd MMM yyyy")}</strong></p>
                <p>🐣 Expected hatch: <strong>{format(new Date(new Date(form.layDate).getTime() + Number(form.incubationDays) * 86400000), "dd MMM yyyy")}</strong></p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as BroodFormData["status"] }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incubating">Incubating</SelectItem>
                  <SelectItem value="hatched">Hatched</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "hatched" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Actual Hatch Date</Label>
                  <Input type="date" className="mt-1" value={form.actualHatchDate} onChange={e => setForm(f => ({ ...f, actualHatchDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Chicks Survived</Label>
                  <Input type="number" min="0" className="mt-1" value={form.chicksSurvived} onChange={e => setForm(f => ({ ...f, chicksSurvived: e.target.value }))} />
                </div>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createBrood.isPending || updateBrood.isPending} className="bg-primary hover:bg-primary/90">
              {editingId ? "Save changes" : "Log brood"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
