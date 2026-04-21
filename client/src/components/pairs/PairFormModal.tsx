import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays } from "lucide-react";
import { usePairForm, type PairFormData } from "@/hooks/usePairForm";
import { Controller } from "react-hook-form";
import { InbreedingCheck } from "./InbreedingUI";

interface PairFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialPair?: any;
    settingsBreedingYear: string;
    maleBirds: any[];
    femaleBirds: any[];
    speciesMap: Record<number, any>;
    birdMap: Record<number, any>;
    onSubmit: (data: PairFormData) => void;
    isSubmitting: boolean;
}

export function PairFormModal({
    open,
    onOpenChange,
    editingId,
    initialPair,
    settingsBreedingYear,
    maleBirds,
    femaleBirds,
    speciesMap,
    birdMap,
    onSubmit,
    isSubmitting,
}: PairFormModalProps) {
    const form = usePairForm(initialPair, settingsBreedingYear, birdMap);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent key={editingId ?? "new"} className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {editingId ? "Edit Pair" : "Create Breeding Pair"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Season Year */}
                    <div className="rounded-xl bg-teal-50 border border-teal-200 p-3">
                        <Label className="text-teal-800 font-semibold flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" /> Breeding Season Year
                        </Label>
                        <Input
                            type="number"
                            min="2000"
                            max="2100"
                            className="mt-1.5 font-bold text-teal-900 border-teal-300 bg-white"
                            placeholder={settingsBreedingYear}
                            {...form.register("season")}
                        />
                        {form.formState.errors.season && (
                            <p className="text-xs text-red-600 mt-1">{form.formState.errors.season.message}</p>
                        )}
                        <p className="text-xs text-teal-600 mt-1">
                            The same two birds can be paired again in a different year.
                        </p>
                    </div>

                    <div>
                        <Label>Male Bird *</Label>
                        <Controller
                            control={form.control}
                            name="maleId"
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className={`mt-1 ${form.formState.errors.maleId ? "border-red-500" : ""}`}>
                                        <SelectValue placeholder="Select male..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {maleBirds.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name || `#${b.id}`}
                                                {b.ringId ? ` · Ring ${b.ringId}` : ""}
                                                {" — "}{speciesMap[b.speciesId]?.commonName ?? "Unknown"}
                                                {b.cageNumber ? ` · Cage ${b.cageNumber}` : ""}
                                                {b.status !== "alive" ? ` (${b.status})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.maleId && (
                            <p className="text-xs text-red-600 mt-1">{form.formState.errors.maleId.message}</p>
                        )}
                    </div>

                    <div>
                        <Label>Female Bird *</Label>
                        <Controller
                            control={form.control}
                            name="femaleId"
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className={`mt-1 ${form.formState.errors.femaleId ? "border-red-500" : ""}`}>
                                        <SelectValue placeholder="Select female..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {femaleBirds.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name || `#${b.id}`}
                                                {b.ringId ? ` · Ring ${b.ringId}` : ""}
                                                {" — "}{speciesMap[b.speciesId]?.commonName ?? "Unknown"}
                                                {b.cageNumber ? ` · Cage ${b.cageNumber}` : ""}
                                                {b.status !== "alive" ? ` (${b.status})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.femaleId && (
                            <p className="text-xs text-red-600 mt-1">{form.formState.errors.femaleId.message}</p>
                        )}
                    </div>

                    {/* Live inbreeding check */}
                    <InbreedingCheck maleId={form.watch("maleId")} femaleId={form.watch("femaleId")} />

                    <div>
                        <Label>Cage Number</Label>
                        <Input
                            className="mt-1"
                            placeholder="e.g. 1, A3, Breeding-1"
                            {...form.register("cageNumber")}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Sets the cage for both birds in this pair.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Pairing Date</Label>
                            <Input type="date" className="mt-1" {...form.register("pairingDate")} />
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
                                            <SelectItem value="active">🥚 Active</SelectItem>
                                            <SelectItem value="breeding">🐣 Breeding</SelectItem>
                                            <SelectItem value="resting">💤 Resting</SelectItem>
                                            <SelectItem value="retired">🏁 Retired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            className="mt-1"
                            placeholder="Optional notes..."
                            {...form.register("notes")}
                            rows={2}
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                            {editingId ? "Save changes" : "Create pair"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
