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
import { Textarea } from "@/components/ui/textarea";
import { useShowForm, type ShowFormData } from "@/hooks/useShowForm";

interface ShowFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: number | null;
    initialShow?: any;
    /** Pre-fills the species field for new records (the bird's species). */
    fallbackSpecies?: string;
    onSubmit: (data: ShowFormData) => void;
    isSubmitting: boolean;
}

export function ShowFormModal({
    open,
    onOpenChange,
    editingId,
    initialShow,
    fallbackSpecies,
    onSubmit,
    isSubmitting,
}: ShowFormModalProps) {
    const form = useShowForm(initialShow, fallbackSpecies);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {editingId ? "Edit Show" : "Add Show Result"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Date *</Label>
                            <Input
                                type="date"
                                className={`mt-1 ${form.formState.errors.showDate ? "border-red-500" : ""}`}
                                {...form.register("showDate")}
                            />
                            {form.formState.errors.showDate && (
                                <p className="text-xs text-red-600 mt-1">{form.formState.errors.showDate.message}</p>
                            )}
                        </div>
                        <div>
                            <Label>Result</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. 1st, Champion, BIS"
                                {...form.register("result")}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Venue</Label>
                        <Input
                            className="mt-1"
                            placeholder="e.g. National Finch Show"
                            {...form.register("venue")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Species / Class</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. Gouldian Finch"
                                {...form.register("species")}
                            />
                        </div>
                        <div>
                            <Label>Group</Label>
                            <Input
                                className="mt-1"
                                placeholder="e.g. Open, Novice"
                                {...form.register("showGroup")}
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
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {editingId ? "Save changes" : "Add show"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
