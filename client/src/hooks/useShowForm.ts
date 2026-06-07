import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

export const showSchema = z.object({
    showDate: z.string().min(1, "Date is required"),
    venue: z.string().optional(),
    species: z.string().optional(),
    showGroup: z.string().optional(),
    result: z.string().optional(),
    notes: z.string().optional(),
});

export type ShowFormData = z.infer<typeof showSchema>;

export const defaultShowForm: ShowFormData = {
    showDate: new Date().toISOString().split("T")[0],
    venue: "",
    species: "",
    showGroup: "",
    result: "",
    notes: "",
};

export function useShowForm(show?: any, fallbackSpecies?: string) {
    return useForm<ShowFormData>({
        resolver: zodResolver(showSchema),
        values: show
            ? {
                showDate: show.showDate
                    ? (show.showDate instanceof Date
                        ? format(show.showDate, "yyyy-MM-dd")
                        : String(show.showDate).split("T")[0])
                    : new Date().toISOString().split("T")[0],
                venue: show.venue ?? "",
                species: show.species ?? fallbackSpecies ?? "",
                showGroup: show.showGroup ?? "",
                result: show.result ?? "",
                notes: show.notes ?? "",
            }
            : { ...defaultShowForm, species: fallbackSpecies ?? "" },
        resetOptions: { keepDirtyValues: false },
    });
}
