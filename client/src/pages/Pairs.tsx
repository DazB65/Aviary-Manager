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
import { Heart, Plus, Trash2, Pencil, ChevronRight, AlertTriangle, Dna, CalendarDays } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resting: "bg-amber-50 text-amber-700 border-amber-200",
  retired: "bg-gray-50 text-gray-500 border-gray-200",
};

type PairFormData = {
  maleId: string;
  femaleId: string;
  season: string;
  pairingDate: string;
  status: "active" | "resting" | "retired";
  notes: string;
};

const defaultForm: PairFormData = {
  maleId: "",
  femaleId: "",
  season: String(new Date().getFullYear()),
  pairingDate: "",
  status: "active",
  notes: "",
};

// ─── Inbreeding badge ─────────────────────────────────────────────────────────
function InbreedingBadge({ coefficient }: { coefficient: number | undefined | null }) {
  if (coefficient === undefined || coefficient === null) return null;
  const pct = Math.round(coefficient * 1000) / 10;

  if (coefficient === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Dna className="h-3 w-3" /> F = 0% — No inbreeding
      </span>
    );
  }
  if (coefficient < 0.0625) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
        <Dna className="h-3 w-3" /> F = {pct}% — Low
      </span>
    );
  }
  if (coefficient < 0.125) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
        <AlertTriangle className="h-3 w-3" /> F = {pct}% — Moderate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      <AlertTriangle className="h-3 w-3" /> F = {pct}% — High inbreeding
    </span>
  );
}

// ─── Live inbreeding check inside dialog ─────────────────────────────────────
function InbreedingCheck({ maleId, femaleId }: { maleId: string; femaleId: string }) {
  const enabled = Boolean(maleId && femaleId && maleId !== femaleId);
  const { data: coefficient, isLoading: coefLoading } = trpc.pairs.inbreeding.useQuery(
    { maleId: Number(maleId), femaleId: Number(femaleId) },
    { enabled }
  );
  const { data: siblingType, isLoading: sibLoading } = trpc.pairs.siblingCheck.useQuery(
    { maleId: Number(maleId), femaleId: Number(femaleId) },
    { enabled }
  );

  if (!enabled) return null;
  if (coefLoading || sibLoading) {
    return <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1"><Dna className="h-3 w-3" /> Checking genetics…</p>;
  }

  const pct = coefficient !== undefined ? Math.round(coefficient * 1000) / 10 : 0;
  const isHigh = (coefficient ?? 0) >= 0.125;
  const isMod = (coefficient ?? 0) >= 0.0625 && (coefficient ?? 0) < 0.125;

  return (
    <div className="space-y-2">
      {siblingType && (
        <div className="rounded-lg p-3 text-sm border bg-red-50 border-red-200 text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {siblingType === "full" ? "Full siblings detected!" : "Half siblings detected!"}
          </div>
          <p className="text-xs mt-1 opacity-80">
            {siblingType === "full"
              ? "These birds share both the same father and mother. Pairing full siblings significantly increases the risk of genetic defects."
              : "These birds share one common parent (half siblings). This increases inbreeding risk — proceed with caution."}
          </p>
        </div>
      )}
      <div className={`rounded-lg p-3 text-sm border ${isHigh ? "bg-red-50 border-red-200 text-red-800" : isMod ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
        <div className="flex items-center gap-2 font-medium">
          {isHigh || isMod ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Dna className="h-4 w-4 shrink-0" />}
          Inbreeding coefficient (F) = {pct}%
        </div>
        <p className="text-xs mt-1 opacity-80">
          {coefficient === 0
            ? "No shared ancestors found — this pairing is genetically unrelated."
            : isHigh
            ? "High inbreeding detected. This pairing shares significant common ancestry and may increase the risk of genetic defects."
            : isMod
            ? "Moderate inbreeding detected. Consider the cumulative effect over multiple generations."
            : "Low inbreeding. This pairing is generally acceptable but monitor over generations."}
        </p>
      </div>
    </div>
  );
}

// ─── Per-pair inbreeding display on card ─────────────────────────────────────
function PairInbreeding({ maleId, femaleId }: { maleId: number; femaleId: number }) {
  const { data: coefficient } = trpc.pairs.inbreeding.useQuery({ maleId, femaleId });
  return <InbreedingBadge coefficient={coefficient} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Pairs() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PairFormData>(defaultForm);
  const utils = trpc.useUtils();

  const { data: pairs = [], isLoading } = trpc.pairs.list.useQuery();
  const { data: birds = [] } = trpc.birds.list.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  // When settings load, update the default season year in the form template
  const settingsBreedingYear = settings?.breedingYear
    ? String(settings.breedingYear)
    : String(new Date().getFullYear());

  const createPair = trpc.pairs.create.useMutation({
    onSuccess: () => { utils.pairs.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pair created!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updatePair = trpc.pairs.update.useMutation({
    onSuccess: () => { utils.pairs.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pair updated!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deletePair = trpc.pairs.delete.useMutation({
    onSuccess: () => { utils.pairs.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pair removed."); },
    onError: (e) => toast.error(e.message),
  });

  const speciesMap = useMemo(() => Object.fromEntries(speciesList.map(s => [s.id, s])), [speciesList]);
  const birdMap = useMemo(() => Object.fromEntries(birds.map(b => [b.id, b])), [birds]);
  const maleBirds = birds.filter(b => b.gender === "male" && b.status === "alive");
  const femaleBirds = birds.filter(b => b.gender === "female" && b.status === "alive");

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...defaultForm, season: settingsBreedingYear });
    setDialogOpen(true);
  };
  const openEdit = (pair: typeof pairs[0]) => {
    setEditingId(pair.id);
    setForm({
      maleId: String(pair.maleId),
      femaleId: String(pair.femaleId),
      season: pair.season ? String(pair.season) : "",
      pairingDate: pair.pairingDate ? (pair.pairingDate instanceof Date ? format(pair.pairingDate, "yyyy-MM-dd") : String(pair.pairingDate)) : "",
      status: pair.status,
      notes: pair.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.maleId || !form.femaleId) { toast.error("Please select both birds"); return; }
    if (form.maleId === form.femaleId) { toast.error("Male and female must be different birds"); return; }
    const seasonNum = form.season ? parseInt(form.season, 10) : undefined;
    if (form.season && (isNaN(seasonNum!) || seasonNum! < 2000 || seasonNum! > 2100)) {
      toast.error("Please enter a valid year between 2000 and 2100");
      return;
    }
    const payload = {
      maleId: Number(form.maleId),
      femaleId: Number(form.femaleId),
      season: seasonNum,
      pairingDate: form.pairingDate || undefined,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updatePair.mutate({ id: editingId, ...payload });
    } else {
      createPair.mutate(payload);
    }
  };

  function birdLabel(bird: typeof birds[0] | undefined) {
    if (!bird) return "Unknown";
    const sp = speciesMap[bird.speciesId];
    return `${bird.name || bird.ringId || `#${bird.id}`}${sp ? ` (${sp.commonName})` : ""}`;
  }

  // Group pairs by season year for display
  const pairsByYear = useMemo(() => {
    const grouped: Record<string, typeof pairs> = {};
    for (const pair of pairs) {
      const key = pair.season ? String(pair.season) : "No year";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(pair);
    }
    // Sort years descending (most recent first), "No year" at end
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === "No year") return 1;
      if (b === "No year") return -1;
      return Number(b) - Number(a);
    });
  }, [pairs]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Breeding Pairs</h1>
            <p className="text-muted-foreground mt-1">
              {pairs.length} pair{pairs.length !== 1 ? "s" : ""} registered
              {settingsBreedingYear && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                  <CalendarDays className="h-3 w-3" /> Season {settingsBreedingYear}
                </span>
              )}
            </p>
          </div>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Add Pair
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : pairs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No breeding pairs yet</p>
            <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Create your first pair</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {pairsByYear.map(([year, yearPairs]) => (
              <div key={year}>
                {/* Year heading */}
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-teal-700 uppercase tracking-wide">
                    {year === "No year" ? "Unassigned season" : `${year} Season`}
                  </h2>
                  <span className="text-xs text-muted-foreground">({yearPairs.length} pair{yearPairs.length !== 1 ? "s" : ""})</span>
                  <div className="flex-1 h-px bg-teal-100" />
                </div>
                <div className="space-y-3">
                  {yearPairs.map(pair => {
                    const male = birdMap[pair.maleId];
                    const female = birdMap[pair.femaleId];
                    const pairingDateStr = pair.pairingDate
                      ? format(pair.pairingDate instanceof Date ? pair.pairingDate : new Date(String(pair.pairingDate)), "dd MMM yyyy")
                      : null;
                    return (
                      <Card key={pair.id} className="border border-border shadow-card hover:shadow-elevated transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Male */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                {male?.photoUrl ? <img src={male.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : "♂"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{birdLabel(male)}</p>
                                <p className="text-xs text-blue-600">Male</p>
                              </div>
                            </div>
                            {/* Heart */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <Heart className="h-5 w-5 text-rose-400 fill-rose-400" />
                              {pairingDateStr && <p className="text-xs text-muted-foreground whitespace-nowrap">{pairingDateStr}</p>}
                            </div>
                            {/* Female */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                {female?.photoUrl ? <img src={female.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : "♀"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{birdLabel(female)}</p>
                                <p className="text-xs text-pink-600">Female</p>
                              </div>
                            </div>
                            {/* Status & Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={`text-xs ${STATUS_STYLES[pair.status]}`}>
                                {pair.status}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/broods?pairId=${pair.id}`)}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pair)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this pair?")) deletePair.mutate({ id: pair.id }); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {/* Inbreeding coefficient row */}
                          <div className="mt-2 flex items-center gap-3 flex-wrap">
                            <PairInbreeding maleId={pair.maleId} femaleId={pair.femaleId} />
                            {pair.notes && <p className="text-xs text-muted-foreground">{pair.notes}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingId ? "Edit Pair" : "Create Breeding Pair"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Season Year — prominent at top */}
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-3">
              <Label className="text-teal-800 font-semibold flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Breeding Season Year
              </Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                className="mt-1.5 font-bold text-teal-900 border-teal-300 bg-white"
                value={form.season}
                onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                placeholder={settingsBreedingYear}
              />
              <p className="text-xs text-teal-600 mt-1">
                The same two birds can be paired again in a different year.
              </p>
            </div>

            <div>
              <Label>Male Bird *</Label>
              <Select value={form.maleId} onValueChange={v => setForm(f => ({ ...f, maleId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select male..." /></SelectTrigger>
                <SelectContent>
                  {maleBirds.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name || b.ringId || `#${b.id}`} — {speciesMap[b.speciesId]?.commonName ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Female Bird *</Label>
              <Select value={form.femaleId} onValueChange={v => setForm(f => ({ ...f, femaleId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select female..." /></SelectTrigger>
                <SelectContent>
                  {femaleBirds.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name || b.ringId || `#${b.id}`} — {speciesMap[b.speciesId]?.commonName ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live inbreeding check — appears as soon as both birds are selected */}
            <InbreedingCheck maleId={form.maleId} femaleId={form.femaleId} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pairing Date</Label>
                <Input type="date" className="mt-1" value={form.pairingDate} onChange={e => setForm(f => ({ ...f, pairingDate: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PairFormData["status"] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resting">Resting</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createPair.isPending || updatePair.isPending} className="bg-primary hover:bg-primary/90">
              {editingId ? "Save changes" : "Create pair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
