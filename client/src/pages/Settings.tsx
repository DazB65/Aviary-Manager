import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Check, Settings as SettingsIcon, Star, X, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: speciesList = [], isLoading: loadingSpecies } = trpc.species.list.useQuery();
  const { data: settings, isLoading: loadingSettings } = trpc.settings.get.useQuery();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [breedingYear, setBreedingYear] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  // Populate from loaded settings
  useEffect(() => {
    if (!settings) return;
    try {
      const ids = settings.favouriteSpeciesIds ? JSON.parse(settings.favouriteSpeciesIds) : [];
      setSelectedIds(Array.isArray(ids) ? ids : []);
    } catch { setSelectedIds([]); }
    setDefaultId(settings.defaultSpeciesId ?? null);
    setBreedingYear(settings.breedingYear ? String(settings.breedingYear) : String(new Date().getFullYear()));
    setDirty(false);
  }, [settings]);

  const saveSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Settings saved!");
      setDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleSpecies = (id: number) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setDirty(true);
      return next;
    });
    if (defaultId === id) { setDefaultId(null); setDirty(true); }
  };

  const setDefault = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setDefaultId(id);
    setDirty(true);
  };

  const clearDefault = () => { setDefaultId(null); setDirty(true); };

  const handleSave = () => {
    const yearNum = breedingYear ? parseInt(breedingYear, 10) : null;
    if (breedingYear && (isNaN(yearNum!) || yearNum! < 2000 || yearNum! > 2100)) {
      toast.error("Please enter a valid year between 2000 and 2100");
      return;
    }
    saveSettings.mutate({
      favouriteSpeciesIds: selectedIds,
      defaultSpeciesId: defaultId,
      breedingYear: yearNum,
    });
  };

  // Group species by category
  const grouped = speciesList.reduce((acc, s) => {
    const cat = s.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, typeof speciesList>);

  const sortedCategories = Object.keys(grouped).sort();
  const isLoading = loadingSpecies || loadingSettings;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-0.5">Personalise your Aviary Manager</p>
            </div>
          </div>
          {dirty && (
            <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 shadow-md">
              {saveSettings.isPending ? "Saving..." : "Save changes"}
            </Button>
          )}
        </div>

        {/* ── Breeding Season Year ── */}
        <Card className="border-2 border-teal-200 shadow-card bg-gradient-to-br from-teal-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-600" />
              <CardTitle className="font-display text-lg text-teal-800">Breeding Season Year</CardTitle>
            </div>
            <CardDescription className="text-teal-700/80">
              Set the current breeding season for your whole flock. This year will be pre-filled when you create new breeding pairs and broods, so you don't have to enter it every time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-[160px]">
                <Label className="text-sm font-medium text-teal-800">Current breeding year</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2100"
                  className="mt-1.5 text-lg font-bold text-teal-900 border-teal-300 focus:border-teal-500"
                  value={breedingYear}
                  onChange={e => { setBreedingYear(e.target.value); setDirty(true); }}
                  placeholder={String(new Date().getFullYear())}
                />
              </div>
              <div className="pb-1 text-sm text-teal-700/70">
                <p>New pairs and broods will default to <strong>{breedingYear || new Date().getFullYear()}</strong>.</p>
                <p className="mt-0.5">You can still override the year on individual records.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Favourite Species ── */}
        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <CardTitle className="font-display text-lg">My Species</CardTitle>
            </div>
            <CardDescription>
              Select the species you keep in your Aviary. Only your chosen species will appear in the dropdown when adding a bird.
              You can still access all species by clicking "Show all species" in the bird form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground text-sm py-4 text-center">Loading species...</div>
            ) : (
              <div className="space-y-5">
                {/* Selected summary */}
                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-xs font-semibold text-amber-700 w-full mb-1">
                      {selectedIds.length} species selected
                      {defaultId && (
                        <span className="ml-2 text-amber-600">
                          · Default: {speciesList.find(s => s.id === defaultId)?.commonName}
                        </span>
                      )}
                    </span>
                    {selectedIds.map(id => {
                      const sp = speciesList.find(s => s.id === id);
                      if (!sp) return null;
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className={`gap-1 pr-1 ${defaultId === id ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white"}`}
                        >
                          {defaultId === id && <Star className="h-3 w-3 text-amber-500" />}
                          {sp.commonName}
                          <button onClick={() => toggleSpecies(id)} className="ml-0.5 hover:text-destructive rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Species grid grouped by category */}
                {sortedCategories.map(cat => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {grouped[cat].map(sp => {
                        const isSelected = selectedIds.includes(sp.id);
                        const isDefault = defaultId === sp.id;
                        return (
                          <div
                            key={sp.id}
                            className={`relative rounded-xl border p-3 cursor-pointer transition-all select-none
                              ${isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border bg-white hover:border-primary/40 hover:bg-muted/30"
                              }`}
                            onClick={() => toggleSpecies(sp.id)}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <p className="font-medium text-sm pr-6">{sp.commonName}</p>
                            {sp.scientificName && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{sp.scientificName}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">{sp.incubationDays}d incubation</span>
                              {isSelected && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); isDefault ? clearDefault() : setDefault(sp.id); }}
                                  className={`text-xs px-1.5 py-0.5 rounded-md transition-colors ${
                                    isDefault
                                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                      : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                                  }`}
                                  title={isDefault ? "Remove as default" : "Set as default species"}
                                >
                                  {isDefault ? "★ Default" : "Set default"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save button at bottom too */}
        {dirty && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 shadow-md">
              {saveSettings.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
