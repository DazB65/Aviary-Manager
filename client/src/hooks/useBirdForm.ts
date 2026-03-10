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
    status: z.enum(["alive", "breeding", "resting", "fledged", "deceased", "sold", "unknown"]),
    fromBroodId: z.number().optional(),
    fromEggNumber: z.number().optional(),
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
    fromBroodId: undefined,
    fromEggNumber: undefined,
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
                dateOfBirth: bird.dateOfBirth ? String(bird.dateOfBirth).split("T")[0] : "",
                fledgedDate: (bird as any).fledgedDate ? String((bird as any).fledgedDate).split("T")[0] : "",
                cageNumber: (bird as any).cageNumber ?? "",
                colorMutation: bird.colorMutation ?? "",
                photoUrl: bird.photoUrl ?? "",
                notes: bird.notes ?? "",
                fatherId: bird.fatherId ? String(bird.fatherId) : "",
                motherId: bird.motherId ? String(bird.motherId) : "",
                status: bird.status as any,
                fromBroodId: bird.fromBroodId,
                fromEggNumber: bird.fromEggNumber,
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
