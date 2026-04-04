import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Heart, Plus, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { usePairs } from "@/hooks/usePairs";
import type { PairFormData } from "@/hooks/usePairForm";
import { PairCard } from "@/components/pairs/PairCard";
import { PairFormModal } from "@/components/pairs/PairFormModal";

export default function Pairs() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPair, setEditingPair] = useState<any>(null);
  const [showRetired, setShowRetired] = useState(false);

  const {
    pairs,
    pairsByYear,
    maleBirds,
    femaleBirds,
    birdMap,
    speciesMap,
    settings,
    isLoading,
    createPair,
    updatePair,
    deletePair,
  } = usePairs(editingId);

  const settingsBreedingYear = settings?.breedingYear
    ? String(settings.breedingYear)
    : String(new Date().getFullYear());

  const openAdd = () => {
    setEditingId(null);
    setEditingPair(null);
    setDialogOpen(true);
  };

  const openEdit = (pair: any) => {
    setEditingId(pair.id);
    setEditingPair(pair);
    setDialogOpen(true);
  };

  const handleSubmit = (data: PairFormData) => {
    const seasonNum = data.season ? parseInt(data.season, 10) : undefined;
    const payload = {
      maleId: Number(data.maleId),
      femaleId: Number(data.femaleId),
      season: seasonNum,
      pairingDate: data.pairingDate || undefined,
      status: data.status,
      cageNumber: data.cageNumber ?? undefined,
      notes: data.notes || undefined,
    };
    if (editingId) {
      updatePair.mutate({ id: editingId, ...payload }, {
        onSuccess: () => setDialogOpen(false)
      });
    } else {
      createPair.mutate(payload, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };

  const navigateToBroods = (pairId: number) => {
    setLocation(`/broods?pairId=${pairId}`);
  };

  const handleDelete = (pairId: number) => {
    deletePair.mutate({ id: pairId });
  };

  const handleStatusChange = (pairId: number, status: "active" | "breeding" | "resting" | "retired") => {
    updatePair.mutate({ id: pairId, status });
  };

  const filteredPairsByYear = useMemo(() =>
    pairsByYear
      .map(([year, yearPairs]) => [
        year,
        yearPairs.filter((p) => showRetired ? p.status === "retired" : p.status !== "retired"),
      ] as [string, typeof yearPairs])
      .filter(([, yearPairs]) => yearPairs.length > 0),
    [pairsByYear, showRetired]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Breeding Pairs</h1>
            <p className="text-muted-foreground mt-1">
              {showRetired
                ? `${pairs.filter((p) => p.status === "retired").length} retired pair${pairs.filter((p) => p.status === "retired").length !== 1 ? "s" : ""}`
                : `${pairs.filter((p) => p.status !== "retired").length} active pair${pairs.filter((p) => p.status !== "retired").length !== 1 ? "s" : ""}`
              }
              {settingsBreedingYear && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                  <CalendarDays className="h-3 w-3" /> Season {settingsBreedingYear}
                </span>
              )}
            </p>
          </div>
          <Button id="tour-add-pair-btn" onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Add Pair
          </Button>
        </div>

        <div className="flex items-center rounded-lg border border-border p-1 gap-1 w-fit">
          <Button
            size="sm"
            variant={!showRetired ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setShowRetired(false)}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={showRetired ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setShowRetired(true)}
          >
            Retired
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredPairsByYear.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{showRetired ? "No retired pairs" : "No active pairs"}</p>
            {!showRetired && (
              <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />Create your first pair
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPairsByYear.map(([year, yearPairs]) => (
              <div key={year}>
                {/* Year heading */}
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-teal-700 uppercase tracking-wide">
                    {year === "No year" ? "Unassigned season" : `${year} Season`}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({yearPairs.length} pair{yearPairs.length !== 1 ? "s" : ""})
                  </span>
                  <div className="flex-1 h-px bg-teal-100" />
                </div>
                <div className="space-y-3">
                  {yearPairs.map((pair) => (
                    <PairCard
                      key={pair.id}
                      pair={pair}
                      male={birdMap[pair.maleId]}
                      female={birdMap[pair.femaleId]}
                      speciesMap={speciesMap}
                      onNavigateToBroods={navigateToBroods}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PairFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        initialPair={editingPair}
        settingsBreedingYear={settingsBreedingYear}
        maleBirds={maleBirds}
        femaleBirds={femaleBirds}
        speciesMap={speciesMap}
        birdMap={birdMap}
        onSubmit={handleSubmit}
        isSubmitting={createPair.isPending || updatePair.isPending}
      />
    </DashboardLayout>
  );
}
