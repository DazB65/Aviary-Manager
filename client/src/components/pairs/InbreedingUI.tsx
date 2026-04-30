import { Dna, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function InbreedingBadge({ coefficient }: { coefficient: number | undefined | null }) {
    if (coefficient === undefined || coefficient === null) return null;
    const pct = Math.round(coefficient * 1000) / 10;

    if (coefficient === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Dna className="h-3.5 w-3.5" /> F = 0% — No inbreeding
            </span>
        );
    }
    if (coefficient < 0.0625) {
        return (
            <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                <Dna className="h-3.5 w-3.5" /> F = {pct}% — Low
            </span>
        );
    }
    if (coefficient < 0.125) {
        return (
            <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                <AlertTriangle className="h-3.5 w-3.5" /> F = {pct}% — Moderate
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="h-3.5 w-3.5" /> F = {pct}% — High inbreeding
        </span>
    );
}

export function InbreedingCheck({ maleId, femaleId }: { maleId: string; femaleId: string }) {
    const enabled = Boolean(maleId && femaleId && maleId !== femaleId);
    const { data: coefficient, isLoading: coefLoading } = trpc.pairs.inbreeding.useQuery(
        { maleId: Number(maleId), femaleId: Number(femaleId) },
        { enabled }
    );
    const { data: siblingType, isLoading: sibLoading } = trpc.pairs.siblingCheck.useQuery(
        { maleId: Number(maleId), femaleId: Number(femaleId) },
        { enabled }
    );

    if (!enabled) return null;
    if (coefLoading || sibLoading) {
        return (
            <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                <Dna className="h-3 w-3" /> Checking genetics…
            </p>
        );
    }

    const pct = coefficient !== undefined ? Math.round(coefficient * 1000) / 10 : 0;
    const isHigh = (coefficient ?? 0) >= 0.125;
    const isMod = (coefficient ?? 0) >= 0.0625 && (coefficient ?? 0) < 0.125;

    // Safe pairing — compact single-line badge
    if (!isHigh && !isMod && !siblingType) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                <Dna className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">F = {pct}% — No inbreeding detected</span>
            </div>
        );
    }

    // Warning — keep prominent box display
    return (
        <div className="space-y-2">
            {siblingType && (
                <div className="rounded-lg p-3 text-sm border bg-red-50 border-red-200 text-red-800">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {siblingType === "full" ? "Full siblings detected!" : "Half siblings detected!"}
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                        {siblingType === "full"
                            ? "These birds share both the same father and mother. Pairing full siblings significantly increases the risk of genetic defects."
                            : "These birds share one common parent (half siblings). This increases inbreeding risk — proceed with caution."}
                    </p>
                </div>
            )}
            <div
                className={`rounded-lg p-3 text-sm border ${isHigh
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-orange-50 border-orange-200 text-orange-800"
                    }`}
            >
                <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Inbreeding coefficient (F) = {pct}%
                </div>
                <p className="text-xs mt-1 opacity-80">
                    {isHigh
                        ? "High inbreeding detected. This pairing shares significant common ancestry and may increase the risk of genetic defects."
                        : "Moderate inbreeding detected. Consider the cumulative effect over multiple generations."}
                </p>
            </div>
        </div>
    );
}

export function PairInbreeding({ maleId, femaleId }: { maleId: number; femaleId: number }) {
    const { data: coefficient } = trpc.pairs.inbreeding.useQuery({ maleId, femaleId });
    return <InbreedingBadge coefficient={coefficient} />;
}
