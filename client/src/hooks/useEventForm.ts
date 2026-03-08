import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { toast } from "sonner";

export const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    eventType: z.enum(["vet", "banding", "medication", "weaning", "sale", "supplements", "other"]),
    eventDate: z.string().optional(),
    birdId: z.string().optional(),
    pairId: z.string().optional(),
    notes: z.string().optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly", "custom"]),
    recurrenceCount: z.number().min(2).max(52),
    neverEnding: z.boolean(),
    customInterval: z.number().min(1).max(99),
    customUnit: z.enum(["days", "weeks", "months", "years"]),
});

export type EventFormData = z.infer<typeof eventSchema>;

export const defaultEventForm: EventFormData = {
    title: "",
    eventType: "other",
    eventDate: "",
    birdId: "",
    pairId: "",
    notes: "",
    recurrence: "none",
    recurrenceCount: 2,
    neverEnding: false,
    customInterval: 3,
    customUnit: "months",
};

export function generateDates(
    startDate: string,
    recurrence: EventFormData["recurrence"],
    count: number,
    customInterval = 1,
    customUnit: EventFormData["customUnit"] = "months"
): string[] {
    if (recurrence === "none" || count <= 1) return [startDate];
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
        const d = new Date(startDate + "T12:00:00");
        if (recurrence === "daily") d.setDate(d.getDate() + i);
        else if (recurrence === "weekly") d.setDate(d.getDate() + i * 7);
        else if (recurrence === "monthly") d.setMonth(d.getMonth() + i);
        else if (recurrence === "yearly") d.setFullYear(d.getFullYear() + i);
        else if (recurrence === "custom") {
            if (customUnit === "days") d.setDate(d.getDate() + i * customInterval);
            else if (customUnit === "weeks") d.setDate(d.getDate() + i * 7 * customInterval);
            else if (customUnit === "months") d.setMonth(d.getMonth() + i * customInterval);
            else if (customUnit === "years") d.setFullYear(d.getFullYear() + i * customInterval);
        }
        dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
}

export function useEventForm(event?: any) {
    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        values: event ? {
            title: event.title || "",
            eventType: (event.eventType ?? "other") as EventFormData["eventType"],
            eventDate: event.eventDate
                ? (event.eventDate instanceof Date
                    ? format(event.eventDate, "yyyy-MM-dd")
                    : String(event.eventDate).split("T")[0])
                : "",
            birdId: event.allBirds ? "all" : (event.birdId ? String(event.birdId) : ""),
            pairId: event.pairId ? String(event.pairId) : "",
            notes: event.notes ?? "",
            recurrence: "none",
            recurrenceCount: 2,
            neverEnding: Boolean(event.isIndefinite),
            customInterval: event.recurrenceInterval ?? 3,
            customUnit: (event.recurrenceUnit as any) ?? "months",
        } : defaultEventForm,
        resetOptions: {
            keepDirtyValues: false,
        }
    });

    return form;
}
