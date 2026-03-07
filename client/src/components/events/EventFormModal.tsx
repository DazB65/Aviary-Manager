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
import { Controller } from "react-hook-form";
import { useEventForm, type EventFormData } from "@/hooks/useEventForm";

interface EventFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialEvent?: any;
    birds: any[];
    pairs: any[];
    pairLabel: (pair: any) => string;
    onSubmit: (data: EventFormData) => void;
    isSubmitting: boolean;
}

export function EventFormModal({
    open,
    onOpenChange,
    editingId,
    initialEvent,
    birds,
    pairs,
    pairLabel,
    onSubmit,
    isSubmitting,
}: EventFormModalProps) {
    const form = useEventForm(initialEvent);

    const recurrence = form.watch("recurrence");
    const neverEnding = form.watch("neverEnding");
    const eventType = form.watch("eventType");
    const recurrenceCount = form.watch("recurrenceCount");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {editingId ? "Edit Event" : "Add Event / Reminder"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label>Title *</Label>
                        <Input
                            className={`mt-1 ${form.formState.errors.title ? "border-red-500" : ""}`}
                            placeholder="e.g. Vet check for Sunny"
                            {...form.register("title")}
                        />
                        {form.formState.errors.title && (
                            <p className="text-xs text-red-600 mt-1">{form.formState.errors.title.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Event Type</Label>
                            <Controller
                                control={form.control}
                                name="eventType"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vet">🏥 Vet visit</SelectItem>
                                            <SelectItem value="banding">🔖 Banding</SelectItem>
                                            <SelectItem value="weaning">🐣 Weaning</SelectItem>
                                            <SelectItem value="sale">💰 Sale</SelectItem>
                                            <SelectItem value="medication">💊 Medication</SelectItem>
                                            <SelectItem value="supplements">🌿 Supplements</SelectItem>
                                            <SelectItem value="other">📌 Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                className="mt-1"
                                {...form.register("eventDate")}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Linked Bird (optional)</Label>
                        <Controller
                            control={form.control}
                            name="birdId"
                            render={({ field }) => (
                                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="all">
                                            🐦 All birds ({birds.filter((b) => b.status === "alive" || b.status === "breeding" || b.status === "resting").length})
                                        </SelectItem>
                                        {birds
                                            .filter((b) => b.status === "alive" || b.status === "breeding" || b.status === "resting")
                                            .map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name || b.ringId || `#${b.id}`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div>
                        <Label>Linked Pair (optional)</Label>
                        <Controller
                            control={form.control}
                            name="pairId"
                            render={({ field }) => (
                                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {pairs.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {pairLabel(p)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {!editingId && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Repeat</Label>
                                <Controller
                                    control={form.control}
                                    name="recurrence"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Does not repeat</SelectItem>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                                <SelectItem value="custom">Custom…</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {recurrence !== "none" && recurrence !== "custom" && (
                                <div>
                                    <Label>Occurrences</Label>
                                    {neverEnding ? (
                                        <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                                            ♾ Never ending
                                        </div>
                                    ) : (
                                        <Input
                                            type="number"
                                            min={2}
                                            max={52}
                                            className="mt-1"
                                            {...form.register("recurrenceCount", { valueAsNumber: true })}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {!editingId && recurrence !== "none" && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded"
                                {...form.register("neverEnding")}
                            />
                            <span className="text-sm text-muted-foreground">♾ Never ending</span>
                        </label>
                    )}

                    {!editingId && recurrence === "custom" && (
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label>Every</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    className="mt-1"
                                    {...form.register("customInterval", { valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <Label>Unit</Label>
                                <Controller
                                    control={form.control}
                                    name="customUnit"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="days">Days</SelectItem>
                                                <SelectItem value="weeks">Weeks</SelectItem>
                                                <SelectItem value="months">Months</SelectItem>
                                                <SelectItem value="years">Years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>Occurrences</Label>
                                {neverEnding ? (
                                    <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                                        ♾ Never ending
                                    </div>
                                ) : (
                                    <Input
                                        type="number"
                                        min={2}
                                        max={52}
                                        className="mt-1"
                                        {...form.register("recurrenceCount", { valueAsNumber: true })}
                                    />
                                )}
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
                            {editingId ? "Save changes" : "Add event"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
