import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bird, Plus, Search, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { useBirds } from "@/hooks/useBirds";
import type { BirdFormData } from "@/hooks/useBirdForm";
import { BirdGrid } from "@/components/birds/BirdGrid";
import { BirdList } from "@/components/birds/BirdList";
import { BirdFormModal } from "@/components/birds/BirdFormModal";
import { GenderIcon } from "@/components/ui/GenderIcon";

export default function Birds() {
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try { return (localStorage.getItem("birds-view-mode") as "grid" | "list") || "grid"; } catch { return "grid"; }
  });
  function toggleView(mode: "grid" | "list") {
    setViewMode(mode);
    try { localStorage.setItem("birds-view-mode", mode); } catch { }
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBird, setEditingBird] = useState<any>(null);

  const {
    birds,
    speciesList,
    userSettings,
    speciesMap,
    isLoading,
    search, setSearch,
    speciesFilter, setSpeciesFilter,
    genderFilter, setGenderFilter,
    showInactive, setShowInactive,
    sortCol, sortDir, toggleSort,
    inactiveStatuses,
    inactiveBirdsCount,
    filtered,
    sorted,

    createBird,
    updateBird,
    deleteBird,
    uploadPhoto,
  } = useBirds();

  const openAdd = () => {
    setEditingId(null);
    setEditingBird(null);
    setDialogOpen(true);
  };

  const openEdit = (bird: any) => {
    setEditingId(bird.id);
    setEditingBird(bird);
    setDialogOpen(true);
  };

  const handleSubmit = (data: BirdFormData) => {
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
      fatherId: data.fatherId ? Number(data.fatherId) : undefined,
      motherId: data.motherId ? Number(data.motherId) : undefined,
      status: data.status,
    };
    if (editingId) {
      updateBird.mutate({ id: editingId, ...payload }, {
        onSuccess: () => setDialogOpen(false)
      });
    } else {
      createBird.mutate(payload, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };

  const handleUploadPhoto = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const dataBase64 = (ev.target?.result as string).split(",")[1];
          const result = await uploadPhoto.mutateAsync({ filename: file.name, contentType: file.type, dataBase64 });
          resolve(result.url);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (id: number) => {
    deleteBird.mutate({ id });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Birds</h1>
            <p className="text-muted-foreground mt-1">{birds.length} bird{birds.length !== 1 ? "s" : ""} in your registry</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleView("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleView("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
              <Plus className="h-4 w-4" /> Add Bird
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ring ID, mutation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {speciesList.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.commonName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="male"><div className="flex items-center gap-1.5"><GenderIcon gender="male" className="w-4 h-4" /> Male</div></SelectItem>
              <SelectItem value="female"><div className="flex items-center gap-1.5"><GenderIcon gender="female" className="w-4 h-4" /> Female</div></SelectItem>
              <SelectItem value="unknown"><div className="flex items-center gap-1.5"><GenderIcon gender="unknown" className="w-4 h-4" /> Unknown</div></SelectItem>
            </SelectContent>
          </Select>
          {inactiveBirdsCount > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap ${showInactive ? "bg-muted border-border text-foreground" : "border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border"}`}
            >
              {showInactive ? "Hide" : "Show"} inactive ({inactiveBirdsCount})
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bird className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No birds match your search" : "No birds yet"}</p>
            {!search && <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Add your first bird</Button>}
          </div>
        ) : viewMode === "grid" ? (
          <BirdGrid
            birds={sorted}
            speciesMap={speciesMap}
            inactiveStatuses={inactiveStatuses}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ) : (
          <BirdList
            birds={sorted}
            speciesMap={speciesMap}
            inactiveStatuses={inactiveStatuses}
            sortCol={sortCol}
            sortDir={sortDir}
            onSortToggle={toggleSort}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <BirdFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        initialBird={editingBird}
        userSettings={userSettings}
        speciesList={speciesList}
        birdsList={birds}
        onSubmit={handleSubmit}
        isSubmitting={createBird.isPending || updateBird.isPending}
        onUploadPhoto={handleUploadPhoto}
      />
    </DashboardLayout>
  );
}
