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
import { Dna, Upload } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Controller } from "react-hook-form";
import { useBirdForm, type BirdFormData } from "@/hooks/useBirdForm";
import { GenderIcon } from "@/components/ui/GenderIcon";
import { gouldianFinchPack } from "@/genetics/packs/gouldianFinch";
import { GenotypeState, InheritanceType, type BirdGenotype } from "@/genetics/types";
import { readBirdGenotype } from "@/genetics/storage";

function getGenotypeOptions(inheritanceType: InheritanceType, gender: string) {
    switch (inheritanceType) {
        case InheritanceType.AUTOSOMAL_RECESSIVE:
        case InheritanceType.SEX_LINKED_RECESSIVE:
            return [
                { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                { value: GenotypeState.CARRIER, label: "Carrier (split)" },
                { value: GenotypeState.EXPRESSING, label: "Expressing" },
            ];
        case InheritanceType.AUTOSOMAL_DOMINANT:
        case InheritanceType.SEX_LINKED_DOMINANT:
            return [
                { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                { value: GenotypeState.EXPRESSING, label: "Expressing" },
            ];
        case InheritanceType.CO_DOMINANT_SEX_LINKED:
            return gender === "male"
                ? [
                    { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                    { value: GenotypeState.EXPRESSING, label: "Expressing" },
                    { value: GenotypeState.CARRIER, label: "Carrier" },
                ]
                : [
                    { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                    { value: GenotypeState.EXPRESSING, label: "Expressing" },
                ];
        case InheritanceType.INCOMPLETE_DOMINANT:
            return gender === "male"
                ? [
                    { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                    { value: GenotypeState.SINGLE_FACTOR, label: "Single Factor" },
                    { value: GenotypeState.DOUBLE_FACTOR, label: "Double Factor" },
                ]
                : [
                    { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                    { value: GenotypeState.SINGLE_FACTOR, label: "Single Factor" },
                ];
        default:
            return [
                { value: GenotypeState.WILD_TYPE, label: "Wild Type" },
                { value: GenotypeState.EXPRESSING, label: "Expressing" },
            ];
    }
}

const CROP_VIEW = 280; // px visible in the crop UI
const CROP_OUT = 400;  // px of the output image

interface BirdFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialBird?: any;
    userSettings?: any;
    speciesList: any[];
    birdsList: any[];
    onSubmit: (data: BirdFormData, genotype: BirdGenotype) => void;
    isSubmitting: boolean;
    isPro?: boolean;
    activeGeneticsPacks?: string[];
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
    isPro = false,
    activeGeneticsPacks = [],
}: BirdFormModalProps) {
    const form = useBirdForm(initialBird, userSettings);
    const fileRef = useRef<HTMLInputElement>(null);
    const [showAllSpecies, setShowAllSpecies] = useState(!!editingId);
    const [genotype, setGenotype] = useState<BirdGenotype>(() =>
        editingId ? readBirdGenotype(editingId) : {}
    );

    // Reset genotype when dialog opens/closes or editing target changes
    useEffect(() => {
        setGenotype(editingId ? readBirdGenotype(editingId) : {});
    }, [editingId, open]);

    // ── Crop state ────────────────────────────────────────────────────────────
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [cropScale, setCropScale] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const origSizeRef = useRef({ w: 1, h: 1 });
    const cropScaleRef = useRef(1);
    const cropOffsetRef = useRef({ x: 0, y: 0 });
    const cropContainerRef = useRef<HTMLDivElement>(null);
    const cropDragging = useRef(false);
    const cropLast = useRef({ x: 0, y: 0 });
    const touchLast = useRef({ x: 0, y: 0 });

    // Keep refs in sync so event handlers avoid stale closures
    useEffect(() => { cropScaleRef.current = cropScale; }, [cropScale]);
    useEffect(() => { cropOffsetRef.current = cropOffset; }, [cropOffset]);

    // When the image is smaller than the crop area, centre it and lock it there.
    // When larger, constrain so the image always covers the area.
    function clampOff(ox: number, oy: number, s: number) {
        const { w, h } = origSizeRef.current;
        const iw = w * s;
        const ih = h * s;
        const clampAxis = (val: number, imgDim: number) =>
            imgDim < CROP_VIEW
                ? (CROP_VIEW - imgDim) / 2          // centre + lock
                : Math.min(0, Math.max(CROP_VIEW - imgDim, val)); // cover clamp
        return { x: clampAxis(ox, iw), y: clampAxis(oy, ih) };
    }

    function initCrop(src: string) {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            origSizeRef.current = { w, h };
            // Start at "fit" so the whole bird is visible immediately
            const s = Math.min(CROP_VIEW / w, CROP_VIEW / h);
            const off = { x: (CROP_VIEW - w * s) / 2, y: (CROP_VIEW - h * s) / 2 };
            cropScaleRef.current = s;
            cropOffsetRef.current = off;
            setCropScale(s);
            setCropOffset(off);
            setCropSrc(src);
        };
        img.src = src;
    }

    // Document-level mouse drag + wheel (passive:false) — attached when crop UI is open.
    // Attaching move/up to the document means fast drags outside the container still work.
    useEffect(() => {
        if (!cropSrc) return;

        const applyMove = (dx: number, dy: number) => {
            const off = clampOff(
                cropOffsetRef.current.x + dx,
                cropOffsetRef.current.y + dy,
                cropScaleRef.current,
            );
            cropOffsetRef.current = off;
            setCropOffset(off);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!cropDragging.current) return;
            applyMove(e.clientX - cropLast.current.x, e.clientY - cropLast.current.y);
            cropLast.current = { x: e.clientX, y: e.clientY };
        };
        const onMouseUp = () => { cropDragging.current = false; };

        const onTouchMoveDoc = (e: TouchEvent) => {
            if (!cropDragging.current) return;
            applyMove(
                e.touches[0].clientX - touchLast.current.x,
                e.touches[0].clientY - touchLast.current.y,
            );
            touchLast.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        const onTouchEnd = () => { cropDragging.current = false; };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.92;
            const { w, h } = origSizeRef.current;
            const fitS = Math.min(CROP_VIEW / w, CROP_VIEW / h);
            const minS = fitS * 0.3; // allow zooming out to 30% of fit
            const next = Math.max(minS, Math.min(fitS * 4, cropScaleRef.current * factor));
            const off = clampOff(cropOffsetRef.current.x, cropOffsetRef.current.y, next);
            cropScaleRef.current = next;
            cropOffsetRef.current = off;
            setCropScale(next);
            setCropOffset(off);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("touchmove", onTouchMoveDoc, { passive: false });
        document.addEventListener("touchend", onTouchEnd);
        cropContainerRef.current?.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMoveDoc);
            document.removeEventListener("touchend", onTouchEnd);
            cropContainerRef.current?.removeEventListener("wheel", onWheel);
        };
    }, [cropSrc]);

    function adjustZoom(factor: number) {
        const { w, h } = origSizeRef.current;
        const fitS = Math.min(CROP_VIEW / w, CROP_VIEW / h);
        const minS = fitS * 0.3; // allow zooming out to 30% of fit
        const next = Math.max(minS, Math.min(fitS * 4, cropScaleRef.current * factor));
        const off = clampOff(cropOffsetRef.current.x, cropOffsetRef.current.y, next);
        cropScaleRef.current = next;
        cropOffsetRef.current = off;
        setCropScale(next);
        setCropOffset(off);
    }

    function onCropDown(e: React.MouseEvent) {
        cropDragging.current = true;
        cropLast.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    }
    function onTouchStart(e: React.TouchEvent) {
        cropDragging.current = true;
        touchLast.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function confirmCrop() {
        if (!cropSrc) return;
        const canvas = document.createElement("canvas");
        canvas.width = CROP_OUT;
        canvas.height = CROP_OUT;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        img.onload = () => {
            const s = cropScaleRef.current;
            const { x: ox, y: oy } = cropOffsetRef.current;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, CROP_OUT, CROP_OUT);
            ctx.drawImage(img, -ox / s, -oy / s, CROP_VIEW / s, CROP_VIEW / s, 0, 0, CROP_OUT, CROP_OUT);
            form.setValue("photoUrl", canvas.toDataURL("image/jpeg", 0.85), { shouldValidate: true });
            setCropSrc(null);
        };
        img.src = cropSrc;
    }

    // ── Species helpers ───────────────────────────────────────────────────────
    const favIds: number[] = (() => {
        try {
            return userSettings?.favouriteSpeciesIds ? JSON.parse(userSettings.favouriteSpeciesIds) : [];
        } catch { return []; }
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

    const fitScale = Math.min(CROP_VIEW / Math.max(origSizeRef.current.w, 1), CROP_VIEW / Math.max(origSizeRef.current.h, 1));
    const zoomPct = Math.round(cropScale / fitScale * 100);

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    if (cropSrc) { setCropSrc(null); return; } // cancel crop, keep form open
                    onOpenChange(false);
                }
            }}
        >
            <DialogContent
                key={editingId ?? "new"}
                className={`max-w-2xl ${cropSrc ? "overflow-hidden" : "max-h-[92vh] overflow-y-auto"}`}
            >
                {cropSrc ? (
                    // ── Crop / reposition UI ──────────────────────────────────
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-display text-xl">Reposition Photo</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground text-center -mt-1">
                            Drag to reposition · Scroll or use buttons to zoom
                        </p>
                        <div
                            ref={cropContainerRef}
                            className="relative mx-auto overflow-hidden rounded-xl cursor-grab active:cursor-grabbing select-none bg-muted border border-border"
                            style={{ width: CROP_VIEW, height: CROP_VIEW }}
                            onMouseDown={onCropDown}
                            onTouchStart={onTouchStart}
                        >
                            <img
                                src={cropSrc}
                                style={{
                                    position: "absolute",
                                    left: cropOffset.x,
                                    top: cropOffset.y,
                                    width: origSizeRef.current.w * cropScale,
                                    height: origSizeRef.current.h * cropScale,
                                    pointerEvents: "none",
                                    userSelect: "none",
                                }}
                                draggable={false}
                                alt=""
                            />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <Button type="button" variant="outline" size="sm" className="w-8 h-8 p-0 text-base" onClick={() => adjustZoom(0.9)}>−</Button>
                            <span className="text-xs text-muted-foreground w-12 text-center">{zoomPct}%</span>
                            <Button type="button" variant="outline" size="sm" className="w-8 h-8 p-0 text-base" onClick={() => adjustZoom(1.1)}>+</Button>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCropSrc(null)}>Cancel</Button>
                            <Button type="button" onClick={confirmCrop} className="bg-primary hover:bg-primary/90">
                                Use this photo
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    // ── Normal form ───────────────────────────────────────────
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-display text-xl">
                                {editingId ? "Edit Bird" : "Add New Bird"}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={form.handleSubmit((data) => onSubmit(data, genotype))} className="space-y-4 py-2">
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
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileRef.current?.click()}
                                            className="gap-2"
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                            {form.watch("photoUrl") ? "Change photo" : "Upload photo"}
                                        </Button>
                                        {form.watch("photoUrl") && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => form.setValue("photoUrl", "")}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 5MB</p>
                                </div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        e.target.value = "";
                                        const reader = new FileReader();
                                        reader.onload = (ev) => initCrop(ev.target?.result as string);
                                        reader.readAsDataURL(f);
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

                                {/* Genetics section — only for Gouldian Finch + Pro users with pack active */}
                                {(() => {
                                    const selectedSpeciesId = form.watch("speciesId");
                                    const selectedSpecies = speciesList.find(s => String(s.id) === selectedSpeciesId);
                                    const isGouldian = /gouldian/i.test(selectedSpecies?.commonName ?? "");
                                    const showGenetics = isPro && activeGeneticsPacks.includes(gouldianFinchPack.speciesId) && isGouldian;
                                    const gender = form.watch("gender");
                                    if (!showGenetics) return null;
                                    return (
                                        <div className="col-span-2 rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Dna className="h-4 w-4 text-teal-600" />
                                                <span className="text-sm font-semibold text-teal-800">Genetics</span>
                                            </div>
                                            {gouldianFinchPack.traits.map((trait) => (
                                                <div key={trait.traitName}>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{trait.traitName}</p>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        {trait.mutations.map((mutation) => {
                                                            const options = getGenotypeOptions(mutation.inheritanceType, gender);
                                                            const value = genotype[mutation.id] ?? GenotypeState.WILD_TYPE;
                                                            return (
                                                                <div key={mutation.id}>
                                                                    <p className="text-xs text-foreground mb-1">{mutation.name}</p>
                                                                    <Select
                                                                        value={value}
                                                                        onValueChange={(v) =>
                                                                            setGenotype((prev) => ({ ...prev, [mutation.id]: v as GenotypeState }))
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {options.map((opt) => (
                                                                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                                    {opt.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

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
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
