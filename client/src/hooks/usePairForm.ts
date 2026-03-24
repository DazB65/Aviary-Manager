import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";

export const pairSchema = z.object({
    maleId: z.string().min(1, "Male bird is required"),
    femaleId: z.string().min(1, "Female bird is required"),
    season: z.string().optional(),
    pairingDate: z.string().optional(),
    status: z.enum(["active", "breeding", "resting", "retired"]),
    notes: z.string().optional(),
});

export type PairFormData = z.infer<typeof pairSchema>;

export const defaultPairForm: PairFormData = {
    maleId: "",
    femaleId: "",
    season: String(new Date().getFullYear()),
    pairingDate: "",
    status: "active",
    notes: "",
};

export function usePairForm(pair?: any, settingsBreedingYear?: string) {
    const form = useForm<PairFormData>({
        resolver: zodResolver(pairSchema),
        defaultValues: {
            ...defaultPairForm,
            season: settingsBreedingYear || String(new Date().getFullYear()),
        },
    });

    useEffect(() => {
        if (pair) {
            form.reset({
                maleId: String(pair.maleId),
                femaleId: String(pair.femaleId),
                season: pair.season ? String(pair.season) : "",
                pairingDate: pair.pairingDate
                    ? (pair.pairingDate instanceof Date
                        ? format(pair.pairingDate, "yyyy-MM-dd")
                        : String(pair.pairingDate).split('T')[0])
                    : "",
                status: pair.status as "active" | "breeding" | "resting" | "retired",
                notes: pair.notes ?? "",
            });
        } else {
            form.reset({
                ...defaultPairForm,
                season: settingsBreedingYear || String(new Date().getFullYear()),
            });
        }
    }, [pair, settingsBreedingYear, form]);

    return form;
}
