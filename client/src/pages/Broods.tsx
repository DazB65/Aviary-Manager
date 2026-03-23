import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Egg } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useBroods } from "@/hooks/useBroods";
import { useBirds } from "@/hooks/useBirds";
import { PairBroodsCard } from "@/components/broods/PairBroodsCard";
import { BroodFormModal } from "@/components/broods/BroodFormModal";
import { BirdFormModal } from "@/components/birds/BirdFormModal";
import type { BroodFormData } from "@/hooks/useBroodForm";
import type { BirdFormData } from "@/hooks/useBirdForm";
import { useAuth } from "@/_core/hooks/useAuth";
import { writeBirdGenotype, readActiveGeneticsPacks } from "@/genetics/storage";
import type { BirdGenotype } from "@/genetics/types";

export default function Broods() {
  const { user } = useAuth();
  const isPro = user?.plan === "pro" || user?.role === "admin";
  const activeGeneticsPacks = readActiveGeneticsPacks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBrood, setEditingBrood] = useState<any>(null);
  const [filterPairId, setFilterPairId] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const utils = trpc.useUtils();

  const [birdModalOpen, setBirdModalOpen] = useState(false);
  const [birdFromEgg, setBirdFromEgg] = useState<any>(null);

  const {
    broods,
    pairs,
    speciesMap,
    birdMap,
    pairLabel,
    isLoading,
    createBrood,
    updateBrood,
    deleteBrood,
    syncEggs,
  } = useBroods();

  // Pull in bird mutation logic
  const {
    createBird,
    userSettings,
    birds,
    speciesList
  } = useBirds();

  const handleConvertToBird = (broodId: number, eggNumber: number, outcomeDate: string | null) => {
    const brood = broods.find((b) => b.id === broodId);
    if (!brood) return;
    const pair = pairs.find((p) => p.id === brood.pairId);
    if (!pair) return;
    const male = birdMap[pair.maleId];

    setBirdFromEgg({
      fromBroodId: broodId,
      fromEggNumber: eggNumber,
      speciesId: male?.speciesId,
      fatherId: pair.maleId,
      motherId: pair.femaleId,
      dateOfBirth: brood.actualHatchDate ? String(brood.actualHatchDate).split("T")[0] : brood.expectedHatchDate ? String(brood.expectedHatchDate).split("T")[0] : undefined,
      fledgedDate: outcomeDate ? String(outcomeDate).split("T")[0] : undefined,
      status: "alive",
      gender: "unknown",
      notes: `Automatically added from Brood #${broodId}, Egg #${eggNumber}`
    });
    setBirdModalOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setEditingBrood(null);
    setDialogOpen(true);
  };

  const openAddForPair = (pairId: number) => {
    setEditingId(null);
    setEditingBrood({ pairId });
    setDialogOpen(true);
  };

  const openEdit = (brood: any) => {
    setEditingId(brood.id);
    setEditingBrood(brood);
    setDialogOpen(true);
  };

  const handleSubmit = (data: BroodFormData) => {
    const payload = {
      pairId: Number(data.pairId),
      season: data.season || undefined,
      eggsLaid: Number(data.eggsLaid),
      layDate: data.layDate || undefined,
      incubationDays: Number(data.incubationDays),
      actualHatchDate: data.actualHatchDate || undefined,
      chicksSurvived: Number(data.chicksSurvived),
      status: data.status,
      notes: data.notes || undefined,
    };

    if (editingId) {
      updateBrood.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            setDialogOpen(false);
            if (data.eggsLaid !== undefined) {
              syncEggs.mutate({ broodId: editingId, eggsLaid: Number(data.eggsLaid) });
            }
          },
        }
      );
    } else {
      createBrood.mutate(payload, {
        onSuccess: (newBrood) => {
          setDialogOpen(false);
          if (newBrood && Number(data.eggsLaid) > 0) {
            syncEggs.mutate({
              broodId: (newBrood as any).id ?? 0,
              eggsLaid: Number(data.eggsLaid),
            });
          }
        },
      });
    }
  };

  const handleBirdSubmit = (data: BirdFormData, genotype: BirdGenotype) => {
    const payload = {
      speciesId: Number(data.speciesId),
      ringId: data.ringId || undefined,
      name: data.name || undefined,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth || undefined,
      fledgedDate: data.fledgedDate || undefined,
      cageNumber: data.cageNumber || undefined,
      colorMutation: data.colorMutation || undefined,
      photoUrl: data.photoUrl || undefined,
      notes: data.notes || undefined,
      status: data.status,
      fatherId: data.fatherId ? Number(data.fatherId) : undefined,
      motherId: data.motherId ? Number(data.motherId) : undefined,
      fromBroodId: birdFromEgg?.fromBroodId,
      fromEggNumber: birdFromEgg?.fromEggNumber,
    };

    createBird.mutate(payload, {
      onSuccess: (created: any) => {
        if (created?.id) writeBirdGenotype(created.id, genotype);
        setBirdModalOpen(false);
        if (birdFromEgg?.fromBroodId) {
          utils.clutchEggs.byBrood.invalidate({ broodId: birdFromEgg.fromBroodId });
        }
      }
    });
  };

  const broodNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    const nums: Record<number, number> = {};
    const sorted = [...broods].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    sorted.forEach((b) => {
      counts[b.pairId] = (counts[b.pairId] || 0) + 1;
      nums[b.id] = counts[b.pairId];
    });
    return nums;
  }, [broods]);

  const COMPLETED_STATUSES = ["hatched", "failed", "abandoned"];
  const statusFiltered = showCompleted
    ? broods.filter((b) => COMPLETED_STATUSES.includes(b.status))
    : broods.filter((b) => b.status === "incubating");
  const filtered = filterPairId === "all" ? statusFiltered : statusFiltered.filter((b) => String(b.pairId) === filterPairId);

  const pairGroups = useMemo(() => {
    const groups: Record<number, typeof broods> = {};
    filtered.forEach(b => {
      if (!groups[b.pairId]) groups[b.pairId] = [];
      groups[b.pairId].push(b);
    });
    // Sort the groups by the most recent clutch creation date (or lay date) descending
    return Object.values(groups).sort((a, b) => {
      const aLatest = Math.max(...a.map(brood => new Date(brood.layDate || brood.createdAt).getTime()));
      const bLatest = Math.max(...b.map(brood => new Date(brood.layDate || brood.createdAt).getTime()));
      return bLatest - aLatest;
    });
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Broods & Eggs</h1>
            <p className="text-muted-foreground mt-1">
              {showCompleted
                ? `${broods.filter((b) => COMPLETED_STATUSES.includes(b.status)).length} completed clutch${broods.filter((b) => COMPLETED_STATUSES.includes(b.status)).length !== 1 ? "es" : ""}`
                : `${broods.filter((b) => b.status === "incubating").length} clutch${broods.filter((b) => b.status === "incubating").length !== 1 ? "es" : ""} currently incubating`
              }
            </p>
          </div>
          <Button id="tour-log-brood-btn" onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Log Brood
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-lg border border-border p-1 gap-1">
            <Button
              size="sm"
              variant={!showCompleted ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setShowCompleted(false)}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={showCompleted ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setShowCompleted(true)}
            >
              Completed
            </Button>
          </div>
          <Select value={filterPairId} onValueChange={setFilterPairId}>
            <SelectTrigger id="tour-broods-filter" className="w-64">
              <SelectValue placeholder="All pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pairs</SelectItem>
              {pairs.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {pairLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pairGroups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Egg className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{showCompleted ? "No completed clutches yet" : "No active clutches"}</p>
            {!showCompleted && (
              <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Log your first brood
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {pairGroups.map((group) => {
              const pairId = group[0].pairId;
              const pair = pairs.find((p) => p.id === pairId);
              const male = pair ? birdMap[pair.maleId] : undefined;
              const female = pair ? birdMap[pair.femaleId] : undefined;
              return (
                <PairBroodsCard
                  key={pairId}
                  pairId={pairId}
                  broods={group}
                  broodNumbers={broodNumbers}
                  pairLabel={pair ? pairLabel(pair) : `Pair #${pairId}`}
                  male={male}
                  female={female}
                  onEdit={openEdit}
                  onDelete={(id) => {
                    if (confirm("Delete this clutch record?")) {
                      deleteBrood.mutate({ id });
                    }
                  }}
                  onAddClutch={() => openAddForPair(pairId)}
                  onConvertToBird={handleConvertToBird}
                />
              );
            })}
          </div>
        )}
      </div>

      <BroodFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        initialBrood={editingBrood}
        pairs={pairs}
        pairLabel={pairLabel}
        speciesMap={speciesMap}
        birdMap={birdMap}
        onSubmit={handleSubmit}
        isSubmitting={createBrood.isPending || updateBrood.isPending}
      />

      <BirdFormModal
        open={birdModalOpen}
        onOpenChange={setBirdModalOpen}
        editingId={null} // We are always creating a new bird here
        initialBird={birdFromEgg}
        userSettings={userSettings}
        speciesList={speciesList}
        birdsList={birds}
        onSubmit={handleBirdSubmit}
        isSubmitting={createBird.isPending}
        isPro={isPro}
        activeGeneticsPacks={activeGeneticsPacks}
      />
    </DashboardLayout>
  );
}
