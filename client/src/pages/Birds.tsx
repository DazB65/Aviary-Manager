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
import { Bird, Plus, Search, Trash2, Pencil, Eye, Upload } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";

const GENDER_LABELS: Record<string, string> = { male: "♂ Male", female: "♀ Female", unknown: "Unknown" };
const STATUS_COLORS: Record<string, string> = {
  alive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  deceased: "bg-gray-50 text-gray-500 border-gray-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
  unknown: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

type BirdFormData = {
  speciesId: string;
  ringId: string;
  name: string;
  gender: "male" | "female" | "unknown";
  dateOfBirth: string;
  colorMutation: string;
  photoUrl: string;
  notes: string;
  fatherId: string;
  motherId: string;
  status: "alive" | "deceased" | "sold" | "unknown";
};

const defaultForm: BirdFormData = {
  speciesId: "",
  ringId: "",
  name: "",
  gender: "unknown",
  dateOfBirth: "",
  colorMutation: "",
  photoUrl: "",
  notes: "",
  fatherId: "",
  motherId: "",
  status: "alive",
};

export default function Birds() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BirdFormData>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: birds = [], isLoading } = trpc.birds.list.useQuery();
  const { data: speciesList = [] } = trpc.species.list.useQuery();

  const createBird = trpc.birds.create.useMutation({
    onSuccess: () => { utils.birds.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Bird added!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateBird = trpc.birds.update.useMutation({
    onSuccess: () => { utils.birds.list.invalidate(); toast.success("Bird updated!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteBird = trpc.birds.delete.useMutation({
    onSuccess: () => { utils.birds.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Bird removed."); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhoto = trpc.birds.uploadPhoto.useMutation({
    onError: (e) => toast.error("Upload failed: " + e.message),
  });

  const handlePhotoUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataBase64 = (ev.target?.result as string).split(",")[1];
        const result = await uploadPhoto.mutateAsync({ filename: file.name, contentType: file.type, dataBase64 });
        setForm(f => ({ ...f, photoUrl: result.url }));
        toast.success("Photo uploaded!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }, [uploadPhoto]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (bird: typeof birds[0]) => {
    setEditingId(bird.id);
    setForm({
      speciesId: String(bird.speciesId),
      ringId: bird.ringId ?? "",
      name: bird.name ?? "",
      gender: bird.gender,
      dateOfBirth: bird.dateOfBirth ? (bird.dateOfBirth instanceof Date ? format(bird.dateOfBirth, "yyyy-MM-dd") : String(bird.dateOfBirth)) : "",
      colorMutation: bird.colorMutation ?? "",
      photoUrl: bird.photoUrl ?? "",
      notes: bird.notes ?? "",
      fatherId: bird.fatherId ? String(bird.fatherId) : "",
      motherId: bird.motherId ? String(bird.motherId) : "",
      status: bird.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.speciesId) { toast.error("Please select a species"); return; }
    const payload = {
      speciesId: Number(form.speciesId),
      ringId: form.ringId || undefined,
      name: form.name || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      colorMutation: form.colorMutation || undefined,
      photoUrl: form.photoUrl || undefined,
      notes: form.notes || undefined,
      fatherId: form.fatherId ? Number(form.fatherId) : undefined,
      motherId: form.motherId ? Number(form.motherId) : undefined,
      status: form.status,
    };
    if (editingId) {
      updateBird.mutate({ id: editingId, ...payload });
    } else {
      createBird.mutate(payload);
    }
  };

  const filtered = birds.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || (b.name ?? "").toLowerCase().includes(q) || (b.ringId ?? "").toLowerCase().includes(q) || (b.colorMutation ?? "").toLowerCase().includes(q);
    const matchSpecies = speciesFilter === "all" || String(b.speciesId) === speciesFilter;
    const matchGender = genderFilter === "all" || b.gender === genderFilter;
    return matchSearch && matchSpecies && matchGender;
  });

  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s]));
  const maleBirds = birds.filter(b => b.gender === "male" && b.status === "alive");
  const femaleBirds = birds.filter(b => b.gender === "female" && b.status === "alive");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Birds</h1>
            <p className="text-muted-foreground mt-1">{birds.length} bird{birds.length !== 1 ? "s" : ""} in your registry</p>
          </div>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Add Bird
          </Button>
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
              <SelectItem value="male">♂ Male</SelectItem>
              <SelectItem value="female">♀ Female</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bird Grid */}
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(bird => {
              const sp = speciesMap[bird.speciesId];
              return (
                <Card key={bird.id} className="group border border-border shadow-card hover:shadow-elevated transition-all duration-200 overflow-hidden">
                  <div className="relative">
                    {bird.photoUrl ? (
                      <img src={bird.photoUrl} alt={bird.name ?? "Bird"} className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-4xl">
                        {bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "🐦"}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setLocation(`/birds/${bird.id}`)} className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm">
                        <Eye className="h-3.5 w-3.5 text-foreground" />
                      </button>
                      <button onClick={() => openEdit(bird)} className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm">
                        <Pencil className="h-3.5 w-3.5 text-foreground" />
                      </button>
                      <button onClick={() => { if (confirm("Delete this bird?")) deleteBird.mutate({ id: bird.id }); }} className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                    <Badge className={`absolute bottom-2 left-2 text-xs border ${STATUS_COLORS[bird.status]}`} variant="outline">
                      {bird.status}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm truncate">{bird.name || bird.ringId || `Bird #${bird.id}`}</p>
                    <p className="text-xs text-muted-foreground truncate">{sp?.commonName ?? "Unknown species"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{GENDER_LABELS[bird.gender]}</span>
                      {bird.ringId && <span className="text-xs font-mono text-muted-foreground">{bird.ringId}</span>}
                    </div>
                    {bird.colorMutation && <p className="text-xs text-amber-600 truncate mt-0.5">{bird.colorMutation}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingId ? "Edit Bird" : "Add New Bird"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}>
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Bird" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading..." : "Upload photo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 5MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Species *</Label>
                <Select value={form.speciesId} onValueChange={v => setForm(f => ({ ...f, speciesId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select species..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(
                      speciesList.reduce((acc, s) => {
                        const cat = s.category ?? "Other";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(s);
                        return acc;
                      }, {} as Record<string, typeof speciesList>)
                    ).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</div>
                        {items.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.commonName}
                            {s.scientificName && <span className="text-muted-foreground ml-1 italic text-xs">({s.scientificName})</span>}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ring / Band ID</Label>
                <Input className="mt-1" placeholder="e.g. AU2025-001" value={form.ringId} onChange={e => setForm(f => ({ ...f, ringId: e.target.value }))} />
              </div>
              <div>
                <Label>Name (optional)</Label>
                <Input className="mt-1" placeholder="e.g. Sunny" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as BirdFormData["gender"] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">♂ Male</SelectItem>
                    <SelectItem value="female">♀ Female</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" className="mt-1" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>

              <div className="col-span-2">
                <Label>Colour / Mutation</Label>
                <Input className="mt-1" placeholder="e.g. Lutino, Pied, Cinnamon" value={form.colorMutation} onChange={e => setForm(f => ({ ...f, colorMutation: e.target.value }))} />
              </div>

              <div>
                <Label>Father (Bird ID)</Label>
                <Select value={form.fatherId || "none"} onValueChange={v => setForm(f => ({ ...f, fatherId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {maleBirds.filter(b => b.id !== editingId).map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name || b.ringId || `#${b.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mother (Bird ID)</Label>
                <Select value={form.motherId || "none"} onValueChange={v => setForm(f => ({ ...f, motherId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {femaleBirds.filter(b => b.id !== editingId).map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name || b.ringId || `#${b.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as BirdFormData["status"] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alive">Alive</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea className="mt-1" placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createBird.isPending || updateBird.isPending} className="bg-primary hover:bg-primary/90">
              {editingId ? "Save changes" : "Add bird"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
