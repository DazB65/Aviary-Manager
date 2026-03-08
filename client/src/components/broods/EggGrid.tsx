import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EGG_OUTCOME_CONFIG, OUTCOME_OPTIONS, type EggOutcome } from "./constants";

export function EggCell({
    num,
    outcome,
    outcomeDate,
    isPending,
    onSelect,
}: {
    num: number;
    outcome: EggOutcome;
    outcomeDate?: string | null;
    isPending: boolean;
    onSelect: (o: EggOutcome, date?: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const cfg = EGG_OUTCOME_CONFIG[outcome];
    const needsDate = ["hatched", "fledged", "died"].includes(outcome);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                disabled={isPending}
                title={`Egg ${num}: ${cfg.label} — click to change`}
                className={`
          w-14 h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1
          transition-all hover:scale-105 active:scale-95 select-none
          ${cfg.bg} ${cfg.border}
          ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}
          ${open ? `ring-2 ${cfg.ring} ring-offset-1` : ""}
        `}
            >
                <span className="text-xl leading-none">{cfg.emoji}</span>
                <span className={`text-[9px] font-bold leading-none ${cfg.text}`}>#{num}</span>
                <span className={`text-[8px] leading-none ${cfg.text} opacity-80`}>{cfg.label}</span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-border rounded-xl shadow-elevated p-2 min-w-[140px]">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1.5 flex justify-between items-center">
                            <span>Egg #{num}</span>
                            <button onClick={() => setOpen(false)} className="text-[10px] hover:text-foreground">✕</button>
                        </p>
                        <div className="space-y-0.5">
                            {OUTCOME_OPTIONS.map((opt) => {
                                const c = EGG_OUTCOME_CONFIG[opt];
                                const isSelected = opt === outcome;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            const optNeedsDate = ["hatched", "fledged", "died"].includes(opt);
                                            onSelect(opt, optNeedsDate ? (outcomeDate || new Date().toISOString().split("T")[0]) : null);
                                            if (!optNeedsDate) setOpen(false);
                                        }}
                                        className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors
                      ${isSelected
                                                ? `${c.bg} ${c.text} font-semibold border ${c.border}`
                                                : "hover:bg-muted text-foreground"
                                            }
                    `}
                                    >
                                        <span className="text-sm">{c.emoji}</span>
                                        <span>{c.label}</span>
                                        {isSelected && <span className="ml-auto text-[10px]">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        {needsDate && (
                            <div className="mt-2 pt-2 border-t border-border">
                                <label className="text-[10px] text-muted-foreground block mb-1">Outcome Date</label>
                                <input
                                    type="date"
                                    value={outcomeDate || ""}
                                    onChange={(e) => onSelect(outcome, e.target.value)}
                                    className="w-full text-xs p-1.5 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export function ClutchEggGrid({ broodId, eggsLaid }: { broodId: number; eggsLaid: number }) {
    const utils = trpc.useUtils();
    const { data: eggs = [], isLoading } = trpc.clutchEggs.byBrood.useQuery({ broodId });

    const [localOutcomes, setLocalOutcomes] = useState<Record<number, EggOutcome>>({});
    const [localOutcomeDates, setLocalOutcomeDates] = useState<Record<number, string | null>>({});
    const [pendingEggs, setPendingEggs] = useState<Set<number>>(new Set());

    const upsertEgg = trpc.clutchEggs.upsert.useMutation({
        onMutate: ({ eggNumber, outcome, outcomeDate }) => {
            setLocalOutcomes((prev) => ({ ...prev, [eggNumber]: outcome as EggOutcome }));
            setLocalOutcomeDates((prev) => ({ ...prev, [eggNumber]: outcomeDate ?? null }));
            setPendingEggs((prev) => new Set(prev).add(eggNumber));
        },
        onSuccess: (_data, { eggNumber }) => {
            setPendingEggs((prev) => {
                const s = new Set(prev);
                s.delete(eggNumber);
                return s;
            });
            utils.clutchEggs.byBrood.invalidate({ broodId });
        },
        onError: (e, { eggNumber }) => {
            setPendingEggs((prev) => {
                const s = new Set(prev);
                s.delete(eggNumber);
                return s;
            });
            setLocalOutcomes((prev) => {
                const copy = { ...prev };
                delete copy[eggNumber];
                return copy;
            });
            setLocalOutcomeDates((prev) => {
                const copy = { ...prev };
                delete copy[eggNumber];
                return copy;
            });
            toast.error(`Failed to save egg #${eggNumber}: ${e.message}`);
        },
    });

    if (eggsLaid === 0)
        return (
            <p className="text-xs text-muted-foreground italic">
                No eggs recorded. Edit the brood to set the number of eggs laid.
            </p>
        );

    if (isLoading)
        return (
            <div className="flex flex-wrap gap-2">
                {[...Array(eggsLaid)].map((_, i) => (
                    <div key={i} className="w-14 h-16 rounded-xl bg-muted animate-pulse" />
                ))}
            </div>
        );

    const serverMap: Record<number, EggOutcome> = {};
    const serverDateMap: Record<number, string | null> = {};
    for (const e of eggs) {
        serverMap[e.eggNumber] = e.outcome as EggOutcome;
        serverDateMap[e.eggNumber] = e.outcomeDate ? String(e.outcomeDate).split("T")[0] : null;
    }

    function getOutcome(num: number): EggOutcome {
        if (num in localOutcomes) return localOutcomes[num];
        return serverMap[num] ?? "unknown";
    }

    function getOutcomeDate(num: number): string | null {
        if (num in localOutcomeDates) return localOutcomeDates[num];
        return serverDateMap[num] ?? null;
    }

    function handleSelect(eggNumber: number, outcome: EggOutcome, outcomeDate?: string | null) {
        upsertEgg.mutate({ broodId, eggNumber, outcome, outcomeDate: outcomeDate ?? undefined });
    }

    const allOutcomes = [...Array(eggsLaid)].map((_, i) => getOutcome(i + 1));
    const fertile = allOutcomes.filter((o) => o === "fertile" || o === "hatched" || o === "fledged").length;
    const hatched = allOutcomes.filter((o) => o === "hatched").length;
    const fledged = allOutcomes.filter((o) => o === "fledged").length;
    const infertile = allOutcomes.filter((o) => o === "infertile").length;
    const cracked = allOutcomes.filter((o) => o === "cracked").length;
    const died = allOutcomes.filter((o) => o === "died").length;
    const pending = allOutcomes.filter((o) => o === "unknown").length;
    const fertilityRate = eggsLaid > 0 ? Math.round((fertile / eggsLaid) * 100) : 0;
    const hatchRate = fertile > 0 ? Math.round(((hatched + fledged) / fertile) * 100) : 0;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Tap each egg to set its outcome. Changes save instantly.
            </p>

            <div className="flex flex-wrap gap-2">
                {[...Array(eggsLaid)].map((_, i) => {
                    const num = i + 1;
                    return (
                        <EggCell
                            key={num}
                            num={num}
                            outcome={getOutcome(num)}
                            outcomeDate={getOutcomeDate(num)}
                            isPending={pendingEggs.has(num)}
                            onSelect={(o, d) => handleSelect(num, o, d)}
                        />
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                {fertile > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                        🟢 {fertile} fertile · {fertilityRate}% fertility
                    </span>
                )}
                {hatched > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium border border-teal-200">
                        🐣 {hatched} hatched · {hatchRate}% hatch rate
                    </span>
                )}
                {fledged > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                        🕊️ {fledged} fledged
                    </span>
                )}
                {infertile > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                        ⚪ {infertile} infertile
                    </span>
                )}
                {cracked > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-medium border border-orange-200">
                        💔 {cracked} cracked
                    </span>
                )}
                {died > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium border border-red-200">
                        🖤 {died} died
                    </span>
                )}
                {pending > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 font-medium border border-gray-200">
                        🥚 {pending} pending
                    </span>
                )}
            </div>
        </div>
    );
}
