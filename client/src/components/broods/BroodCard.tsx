import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Trash2, Plus } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { STATUS_STYLES, STATUS_ICONS } from "./constants";
import { ClutchEggGrid } from "./EggGrid";

function formatDateStr(val: Date | string | null | undefined): string {
    if (!val) return "—";
    const d = val instanceof Date ? val : parseISO(String(val));
    return format(d, "dd MMM yyyy");
}

function daysUntil(val: Date | string | null | undefined): string | null {
    if (!val) return null;
    const d = val instanceof Date ? val : parseISO(String(val));
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "Today!";
    return `in ${diff}d`;
}

interface BroodCardProps {
    brood: any;
    pairLabel: string;
    male?: any;
    female?: any;
    onEdit: () => void;
    onDelete: () => void;
    onConvertToBird?: (broodId: number, eggNumber: number, outcomeDate: string | null) => void;
    broodNumber?: number;
    onAddClutch?: () => void;
}

export function BroodCard({ brood, pairLabel, male, female, onEdit, onDelete, onConvertToBird, broodNumber, onAddClutch }: BroodCardProps) {
    const [expanded, setExpanded] = useState(false);
    const hatchCountdown = brood.status === "incubating" ? daysUntil(brood.expectedHatchDate) : null;
    const fertilityCountdown = brood.status === "incubating" ? daysUntil(brood.fertilityCheckDate) : null;

    return (
        <Card className="border border-border shadow-card hover:shadow-elevated transition-all">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xl shrink-0">
                            🥚
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold">
                                    {male || female ? (
                                        <>
                                            <span className="text-blue-600">{male ? male.name || male.ringId || `#${male.id}` : "?"}</span>
                                            {" × "}
                                            <span className="text-rose-500">{female ? female.name || female.ringId || `#${female.id}` : "?"}</span>
                                        </>
                                    ) : pairLabel}
                                    {broodNumber ? <span className="ml-2 text-xs font-normal text-muted-foreground">(Brood #{broodNumber})</span> : null}
                                </p>
                                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${STATUS_STYLES[brood.status]}`}>
                                    {STATUS_ICONS[brood.status]} {brood.status}
                                </Badge>
                                {brood.season && <span className="text-xs text-muted-foreground">{brood.season}</span>}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Eggs laid</p>
                                    <p className="text-sm font-semibold">{brood.eggsLaid ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Lay date</p>
                                    <p className="text-sm">{formatDateStr(brood.layDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Fertility check</p>
                                    <p className="text-sm">{formatDateStr(brood.fertilityCheckDate)}</p>
                                    {fertilityCountdown && <p className="text-xs text-amber-600 font-medium">{fertilityCountdown}</p>}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Expected hatch</p>
                                    <p className="text-sm">{formatDateStr(brood.expectedHatchDate)}</p>
                                    {hatchCountdown && <p className="text-xs text-teal-600 font-medium">{hatchCountdown}</p>}
                                </div>
                            </div>
                            {brood.status === "hatched" && (
                                <p className="text-xs text-emerald-600 mt-1">
                                    ✓ {brood.chicksSurvived ?? 0} chick{(brood.chicksSurvived ?? 0) !== 1 ? "s" : ""} survived · Hatched {formatDateStr(brood.actualHatchDate)}
                                </p>
                            )}
                            {brood.notes && <p className="text-xs text-muted-foreground mt-1">{brood.notes}</p>}
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0 items-start">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1 text-xs transition-colors ${expanded ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setExpanded((e) => !e)}
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            Eggs {brood.eggsLaid > 0 && <span className="ml-0.5 opacity-60">({brood.eggsLaid})</span>}
                        </Button>
                        {onAddClutch && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onAddClutch} title="Log another clutch for this pair">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit brood">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {expanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Individual Egg Outcomes
                        </p>
                        <ClutchEggGrid
                            broodId={brood.id}
                            eggsLaid={brood.eggsLaid ?? 0}
                            onConvertToBird={
                                onConvertToBird
                                    ? (eggNum, date) => onConvertToBird(brood.id, eggNum, date)
                                    : undefined
                            }
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
