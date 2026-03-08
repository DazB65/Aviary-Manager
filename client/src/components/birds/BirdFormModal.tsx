import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useRef, useCallback, useState } from "react";
import { Controller } from "react-hook-form";
import { useBirdForm, type BirdFormData } from "@/hooks/useBirdForm";
import { GenderIcon } from "@/components/ui/GenderIcon";

interface BirdFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialBird?: any;
    userSettings?: any;
    speciesList: any[];
    birdsList: any[];
    onSubmit: (data: BirdFormData) => void;
    isSubmitting: boolean;
    onUploadPhoto: (file: File) => Promise<string>;
}

export function BirdFormModal({
    open,
    onOpenChange,
    editingId,
    initialBird,
    userSettings,
    speciesList,
    birdsList,
    onSubmit,
    isSubmitting,
    onUploadPhoto,
}: BirdFormModalProps) {
    const form = useBirdForm(initialBird, userSettings);
    const fileRef = useRef<HTMLInputElement>(null);
    const [showAllSpecies, setShowAllSpecies] = useState(!!editingId); // Always true when editing
    const [uploading, setUploading] = useState(false);

    // Derive favorite species IDs safely
    const favIds: number[] = (() => {
        try {
            return userSettings?.favouriteSpeciesIds ? JSON.parse(userSettings.favouriteSpeciesIds) : [];
        } catch {
            return [];
        }
    })();

    const displayList = (favIds.length > 0 && !showAllSpecies)
        ? speciesList.filter(s => favIds.includes(s.id))
        : speciesList;

    const groupedSpecies = displayList.reduce((acc, s) => {
        const cat = s.category ?? "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {} as Record<string, typeof speciesList>);

    const maleBirds = birdsList.filter(b => b.gender === "male");
    const femaleBirds = birdsList.filter(b => b.gender === "female");

    const handlePhotoUpload = useCallback(async (file: File) => {
        setUploading(true);
        try {
            const url = await onUploadPhoto(file);
            form.setValue("photoUrl", url, { shouldValidate: true });
        } catch {
            // toast is presumably shown inside onUploadPhoto or its wrapper
        } finally {
            setUploading(false);
        }
    }, [form, onUploadPhoto]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Keying by editingId or 'new' forces a proper full reset 
          when switching from editing one item to adding another */}
            <DialogContent key={editingId ?? "new"} className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {editingId ? "Edit Bird" : "Add New Bird"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Photo */}
                    <div className="flex items-center gap-4">
                        <div
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                            onClick={() => fileRef.current?.click()}
                        >
                            {form.watch("photoUrl") ? (
                                <img
                                    src={form.watch("photoUrl")}
                                    alt="Bird"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="gap-2"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                {uploading ? "Uploading..." : "Upload photo"}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 5MB</p>
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handlePhotoUpload(f);
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <div className="flex items-center justify-between">
                                <Label>Species *</Label>
                                {favIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllSpecies((v) => !v)}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        {showAllSpecies ? "Show my species only" : "Show all species"}
                                    </button>
                                )}
                            </div>
                            <Controller
                                control={form.control}
                                name="speciesId"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger
                                            className={`mt-1 ${form.formState.errors.speciesId ? "border-destructive" : ""}`}
                                        >
                                            <SelectValue
                                                placeholder={
                                                    favIds.length > 0 && !showAllSpecies
                                                        ? "Select from my species..."
                                                        : "Select species..."
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {Object.entries(groupedSpecies)
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([cat, items]) => (
                                                    <div key={cat}>
                                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                            {cat}
                                                        </div>
                                                        {(items as any[]).map((s) => (
                                                            <SelectItem key={s.id} value={String(s.id)}>
                                                                {s.commonName}
                                                                {s.scientificName && (
                                                                    <span className="text-muted-foreground ml-1 italic text-xs">
                                                                        ({s.scientificName})
                                                                    </span>
                                                                )}
                                                            </SelectItem>
                                                        ))}
                                                    </div>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.speciesId && (
                                <p className="text-xs text-destructive mt-1">
                                    {form.formState.errors.speciesId.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Ring / Band ID</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. AU2025-001"
                                {...form.register("ringId")}
                            />
                        </div>
                        <div>
                            <Label>Cage Number</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. A1, Cage 3"
                                {...form.register("cageNumber")}
                            />
                        </div>
                        <div>
                            <Label>Gender</Label>
                            <Controller
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unknown"><div className="flex items-center gap-1.5"><GenderIcon gender="unknown" className="w-4 h-4" /> Unknown</div></SelectItem>
                                            <SelectItem value="male"><div className="flex items-center gap-1.5"><GenderIcon gender="male" className="w-4 h-4" /> Male</div></SelectItem>
                                            <SelectItem value="female"><div className="flex items-center gap-1.5"><GenderIcon gender="female" className="w-4 h-4" /> Female</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label>Date of Birth</Label>
                            <Input type="date" className="mt-1" {...form.register("dateOfBirth")} />
                        </div>
                        <div>
                            <Label>Fledged Date</Label>
                            <Input type="date" className="mt-1" {...form.register("fledgedDate")} />
                        </div>

                        <div className="col-span-2">
                            <Label>Colour / Mutation</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. Lutino, Pied, Cinnamon"
                                {...form.register("colorMutation")}
                            />
                        </div>

                        <div>
                            <Label>Father (Bird ID)</Label>
                            <Controller
                                control={form.control}
                                name="fatherId"
                                render={({ field }) => (
                                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {maleBirds
                                                .filter((b) => b.id !== editingId)
                                                .map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.name || b.ringId || `#${b.id}`}
                                                        {b.status === "deceased" || b.status === "sold"
                                                            ? ` (${b.status})`
                                                            : ""}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label>Mother (Bird ID)</Label>
                            <Controller
                                control={form.control}
                                name="motherId"
                                render={({ field }) => (
                                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {femaleBirds
                                                .filter((b) => b.id !== editingId)
                                                .map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.name || b.ringId || `#${b.id}`}
                                                        {b.status === "deceased" || b.status === "sold"
                                                            ? ` (${b.status})`
                                                            : ""}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div>
                            <Label>Status</Label>
                            <Controller
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="alive">Alive</SelectItem>
                                            <SelectItem value="breeding">🥚 Breeding</SelectItem>
                                            <SelectItem value="resting">💤 Resting</SelectItem>
                                            <SelectItem value="fledged">🪶 Fledged</SelectItem>
                                            <SelectItem value="deceased">Deceased</SelectItem>
                                            <SelectItem value="sold">Sold</SelectItem>
                                            <SelectItem value="unknown">Unknown</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                                className="mt-1"
                                placeholder="Any additional notes..."
                                {...form.register("notes")}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {editingId ? "Save changes" : "Add bird"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
