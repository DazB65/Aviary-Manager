import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { STATUS_STYLES, STATUS_LABELS } from "./constants";
import { PairInbreeding } from "./InbreedingUI";

interface PairCardProps {
    pair: any;
    male?: any;
    female?: any;
    speciesMap: Record<number, any>;
    onNavigateToBroods: (pairId: number) => void;
    onEdit: (pair: any) => void;
    onDelete: (pairId: number) => void;
}

export function PairCard({
    pair,
    male,
    female,
    speciesMap,
    onNavigateToBroods,
    onEdit,
    onDelete,
}: PairCardProps) {
    const pairingDateStr = pair.pairingDate
        ? format(
            pair.pairingDate instanceof Date
                ? pair.pairingDate
                : new Date(String(pair.pairingDate)),
            "dd MMM yyyy"
        )
        : null;

    function birdLabel(bird: any) {
        if (!bird) return "Unknown";
        const sp = speciesMap[bird.speciesId];
        return `${bird.name || bird.ringId || `#${bird.id}`}${sp ? ` (${sp.commonName})` : ""
            }`;
    }

    return (
        <Card className="border border-border shadow-card hover:shadow-elevated transition-all">
            <CardContent className="p-4">
                {/* Cage number — top left */}
                {(male?.cageNumber || female?.cageNumber) && (
                    <div className="mb-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            🏠 Cage {male?.cageNumber || female?.cageNumber}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    {/* Male */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                            {male?.photoUrl ? (
                                <img src={male.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                "♂"
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{birdLabel(male)}</p>
                            <p className="text-sm text-blue-600">Male</p>
                            {male?.colorMutation && (
                                <p className="text-sm text-amber-600 truncate">{male.colorMutation}</p>
                            )}
                        </div>
                    </div>
                    {/* Heart */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <Heart className="h-5 w-5 text-rose-400 fill-rose-400" />
                        {pairingDateStr && (
                            <p className="text-xs text-muted-foreground whitespace-nowrap">{pairingDateStr}</p>
                        )}
                    </div>
                    {/* Female */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                            {female?.photoUrl ? (
                                <img
                                    src={female.photoUrl}
                                    alt=""
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                "♀"
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{birdLabel(female)}</p>
                            <p className="text-sm text-pink-600">Female</p>
                            {female?.colorMutation && (
                                <p className="text-sm text-amber-600 truncate">{female.colorMutation}</p>
                            )}
                        </div>
                    </div>
                    {/* Status & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-sm ${STATUS_STYLES[pair.status]}`}>
                            {STATUS_LABELS[pair.status] ?? pair.status}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onNavigateToBroods(pair.id)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pair)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                                if (confirm("Delete this pair?")) onDelete(pair.id);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                {/* Inbreeding coefficient row */}
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <PairInbreeding maleId={pair.maleId} femaleId={pair.femaleId} />
                    {pair.notes && <p className="text-xs text-muted-foreground">{pair.notes}</p>}
                </div>
            </CardContent>
        </Card>
    );
}
