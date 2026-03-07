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
import { format } from "date-fns";
import { useBroodForm, type BroodFormData } from "@/hooks/useBroodForm";
import { Controller } from "react-hook-form";

interface BroodFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialBrood?: any;
    pairs: any[];
    pairLabel: (pair: any) => string;
    speciesMap: Record<number, any>;
    birdMap: Record<number, any>;
    onSubmit: (data: BroodFormData) => void;
    isSubmitting: boolean;
}

export function BroodFormModal({
    open,
    onOpenChange,
    editingId,
    initialBrood,
    pairs,
    pairLabel,
    speciesMap,
    birdMap,
    onSubmit,
    isSubmitting,
}: BroodFormModalProps) {
    const form = useBroodForm(initialBrood);

    function handlePairChange(pairId: string) {
        form.setValue("pairId", pairId);
        if (pairId) {
            const pair = pairs.find((p) => String(p.id) === pairId);
            if (pair) {
                const male = birdMap[pair.maleId];
                if (male) {
                    const sp = speciesMap[male.speciesId];
                    if (sp && sp.incubationDays) {
                        form.setValue("incubationDays", String(sp.incubationDays));
                    }
                }
            }
        }
    }

    const layDate = form.watch("layDate");
    const incubationDays = form.watch("incubationDays");
    const status = form.watch("status");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {editingId ? "Edit Brood" : "Log New Brood"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label>Breeding Pair *</Label>
                        <Controller
                            control={form.control}
                            name="pairId"
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={handlePairChange}>
                                    <SelectTrigger
                                        className={`mt-1 ${form.formState.errors.pairId ? "border-red-500" : ""}`}
                                    >
                                        <SelectValue placeholder="Select pair..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pairs.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {pairLabel(p)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.pairId && (
                            <p className="text-xs text-red-600 mt-1">{form.formState.errors.pairId.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Season / Year</Label>
                            <Input
                                className="mt-1"
                                placeholder="2025"
                                {...form.register("season")}
                            />
                        </div>
                        <div>
                            <Label>Eggs Laid</Label>
                            <Input
                                type="number"
                                min="0"
                                className="mt-1"
                                {...form.register("eggsLaid")}
                            />
                        </div>
                        <div>
                            <Label>Lay Date</Label>
                            <Input type="date" className="mt-1" {...form.register("layDate")} />
                        </div>
                        <div>
                            <Label>Incubation Days</Label>
                            <Input
                                type="number"
                                min="1"
                                className="mt-1"
                                {...form.register("incubationDays")}
                            />
                        </div>
                    </div>

                    {layDate && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700 space-y-1">
                            <p>
                                🔍 Fertility check:{" "}
                                <strong>
                                    {format(
                                        new Date(new Date(layDate).getTime() + 7 * 86400000),
                                        "dd MMM yyyy"
                                    )}
                                </strong>
                            </p>
                            <p>
                                🐣 Expected hatch:{" "}
                                <strong>
                                    {format(
                                        new Date(
                                            new Date(layDate).getTime() +
                                            Number(incubationDays) * 86400000
                                        ),
                                        "dd MMM yyyy"
                                    )}
                                </strong>
                            </p>
                        </div>
                    )}

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
                                        <SelectItem value="incubating">Incubating</SelectItem>
                                        <SelectItem value="hatched">Hatched</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="abandoned">Abandoned</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {status === "hatched" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Actual Hatch Date</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    {...form.register("actualHatchDate")}
                                />
                            </div>
                            <div>
                                <Label>Chicks Survived</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    className="mt-1"
                                    {...form.register("chicksSurvived")}
                                />
                            </div>
                        </div>
                    )}

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
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {editingId ? "Save changes" : "Log brood"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
