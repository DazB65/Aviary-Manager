import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";

export const broodSchema = z.object({
    pairId: z.string().min(1, "Pair is required"),
    season: z.string().optional(),
    eggsLaid: z.string().min(1, "Required"),
    layDate: z.string().optional(),
    incubationDays: z.string().min(1, "Required"),
    actualHatchDate: z.string().optional(),
    chicksSurvived: z.string().min(1, "Required"),
    status: z.enum(["incubating", "hatched", "failed", "abandoned"]),
    notes: z.string().optional(),
});

export type BroodFormData = z.infer<typeof broodSchema>;

export const defaultBroodForm: BroodFormData = {
    pairId: "",
    season: String(new Date().getFullYear()),
    eggsLaid: "0",
    layDate: "",
    incubationDays: "14",
    actualHatchDate: "",
    chicksSurvived: "0",
    status: "incubating",
    notes: "",
};

export function useBroodForm(brood?: any) {
    const form = useForm<BroodFormData>({
        resolver: zodResolver(broodSchema),
        defaultValues: defaultBroodForm,
    });

    useEffect(() => {
        if (brood) {
            form.reset({
                pairId: String(brood.pairId),
                season: brood.season ?? String(new Date().getFullYear()),
                eggsLaid: String(brood.eggsLaid ?? 0),
                layDate: brood.layDate
                    ? (brood.layDate instanceof Date
                        ? format(brood.layDate, "yyyy-MM-dd")
                        : String(brood.layDate).split("T")[0])
                    : "",
                incubationDays: "14",
                actualHatchDate: brood.actualHatchDate
                    ? (brood.actualHatchDate instanceof Date
                        ? format(brood.actualHatchDate, "yyyy-MM-dd")
                        : String(brood.actualHatchDate).split("T")[0])
                    : "",
                chicksSurvived: String(brood.chicksSurvived ?? 0),
                status: brood.status as "incubating" | "hatched" | "failed" | "abandoned",
                notes: brood.notes ?? "",
            });
        } else {
            form.reset(defaultBroodForm);
        }
    }, [brood, form]);

    return form;
}
