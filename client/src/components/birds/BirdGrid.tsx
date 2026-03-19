import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, GENDER_LABELS } from "./constants";
import { useLocation } from "wouter";
import { GenderIcon } from "@/components/ui/GenderIcon";

interface BirdGridProps {
    birds: any[];
    speciesMap: Record<number, any>;
    inactiveStatuses: string[];
    onEdit: (bird: any) => void;
    onDelete: (id: number) => void;
}

export function BirdGrid({ birds, speciesMap, inactiveStatuses, onEdit, onDelete }: BirdGridProps) {
    const [, setLocation] = useLocation();

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {birds.map((bird) => {
                const sp = speciesMap[bird.speciesId];
                return (
                    <Card
                        key={bird.id}
                        className={`group border border-border shadow-card hover:shadow-elevated transition-all duration-200 overflow-hidden ${inactiveStatuses.includes(bird.status) ? "opacity-60" : ""
                            }`}
                    >
                        <div className="relative">
                            {bird.photoUrl ? (
                                <img
                                    src={bird.photoUrl}
                                    alt={bird.name ?? "Bird"}
                                    className="w-full h-36 object-cover"
                                />
                            ) : (
                                <div
                                    className={`w-full h-36 ${bird.gender === "male"
                                        ? "bg-blue-50"
                                        : bird.gender === "female"
                                            ? "bg-pink-50"
                                            : "bg-amber-50"
                                        } flex items-center justify-center text-4xl`}
                                >
                                    <GenderIcon gender={bird.gender} className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setLocation(`/birds/${bird.id}`)}
                                    className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm"
                                    title="View"
                                >
                                    <Eye className="h-3.5 w-3.5 text-foreground" />
                                </button>
                                <button
                                    onClick={() => onEdit(bird)}
                                    className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm"
                                    title="Edit"
                                >
                                    <Pencil className="h-3.5 w-3.5 text-foreground" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm("Delete this bird?")) onDelete(bird.id);
                                    }}
                                    className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                            </div>
                            <Badge
                                className={`absolute bottom-2 left-2 text-xs border ${STATUS_COLORS[bird.status]
                                    }`}
                                variant="outline"
                            >
                                {STATUS_LABELS[bird.status] ?? bird.status}
                            </Badge>
                        </div>
                        <CardContent className="p-3">
                            <p className="font-semibold text-sm truncate">
                                {bird.name || bird.ringId || `Bird #${bird.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {sp?.commonName ?? "Unknown species"}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                    {GENDER_LABELS[bird.gender] || bird.gender}
                                </span>
                                {bird.ringId && bird.name && (
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {bird.ringId}
                                    </span>
                                )}
                            </div>
                            {bird.cageNumber && (
                                <p className="text-xs text-teal-600 font-medium truncate mt-0.5">
                                    Cage {bird.cageNumber}
                                </p>
                            )}
                            {bird.colorMutation && (
                                <p className="text-xs text-amber-600 truncate mt-0.5">
                                    {bird.colorMutation}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div >
    );
}
