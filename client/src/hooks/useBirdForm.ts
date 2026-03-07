import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";

export const birdSchema = z.object({
    speciesId: z.string().min(1, "Species is required"),
    ringId: z.string().optional(),
    name: z.string().optional(),
    gender: z.enum(["male", "female", "unknown"]),
    dateOfBirth: z.string().optional(),
    fledgedDate: z.string().optional(),
    cageNumber: z.string().optional(),
    colorMutation: z.string().optional(),
    photoUrl: z.string().optional(),
    notes: z.string().optional(),
    fatherId: z.string().optional(),
    motherId: z.string().optional(),
    status: z.enum(["alive", "breeding", "resting", "deceased", "sold", "unknown"]),
});

export type BirdFormData = z.infer<typeof birdSchema>;

export const defaultBirdForm: BirdFormData = {
    speciesId: "",
    ringId: "",
    name: "",
    gender: "unknown",
    dateOfBirth: "",
    fledgedDate: "",
    cageNumber: "",
    colorMutation: "",
    photoUrl: "",
    notes: "",
    fatherId: "",
    motherId: "",
    status: "alive",
};

export function useBirdForm(bird?: any, userSettings?: any) {
    const form = useForm<BirdFormData>({
        resolver: zodResolver(birdSchema),
        defaultValues: defaultBirdForm,
    });

    useEffect(() => {
        if (bird) {
            form.reset({
                speciesId: String(bird.speciesId),
                ringId: bird.ringId ?? "",
                name: bird.name ?? "",
                gender: bird.gender as any,
                dateOfBirth: bird.dateOfBirth ? (bird.dateOfBirth instanceof Date ? format(bird.dateOfBirth, "yyyy-MM-dd") : String(bird.dateOfBirth)) : "",
                fledgedDate: (bird as any).fledgedDate ? ((bird as any).fledgedDate instanceof Date ? format((bird as any).fledgedDate, "yyyy-MM-dd") : String((bird as any).fledgedDate)) : "",
                cageNumber: (bird as any).cageNumber ?? "",
                colorMutation: bird.colorMutation ?? "",
                photoUrl: bird.photoUrl ?? "",
                notes: bird.notes ?? "",
                fatherId: bird.fatherId ? String(bird.fatherId) : "",
                motherId: bird.motherId ? String(bird.motherId) : "",
                status: bird.status as any,
            });
        } else {
            const favIds = (() => { try { return userSettings?.favouriteSpeciesIds ? JSON.parse(userSettings.favouriteSpeciesIds) : []; } catch { return []; } })();
            const defaultSpeciesId = userSettings?.defaultSpeciesId;
            form.reset({
                ...defaultBirdForm,
                speciesId: defaultSpeciesId ? String(defaultSpeciesId) : (favIds.length === 1 ? String(favIds[0]) : ""),
            });
        }
    }, [bird, userSettings, form]);

    return form;
}
