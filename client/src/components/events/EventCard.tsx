import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { EVENT_TYPE_STYLES } from "./constants";

export interface EventCardProps {
    ev: any;
    linkedBird?: any;
    linkedPair?: any;
    pairLabel: (pair: any) => string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleComplete: () => void;
}

export function EventCard({
    ev,
    linkedBird,
    linkedPair,
    pairLabel,
    onEdit,
    onDelete,
    onToggleComplete,
}: EventCardProps) {
    const typeInfo = EVENT_TYPE_STYLES[ev.eventType] ?? EVENT_TYPE_STYLES.other;

    return (
        <Card
            className={`border shadow-card transition-all ${ev.completed ? "opacity-60" : "hover:shadow-elevated"
                }`}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <button
                        onClick={onToggleComplete}
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
                    >
                        {ev.completed ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                            <Circle className="h-6 w-6" />
                        )}
                    </button>

                    <span className="text-2xl shrink-0 leading-none mt-0.5">
                        {typeInfo.emoji}
                    </span>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p
                                className={`text-base font-semibold ${ev.completed ? "line-through text-muted-foreground" : ""
                                    }`}
                            >
                                {ev.title}
                            </p>
                            <Badge variant="outline" className={`text-sm ${typeInfo.color}`}>
                                {ev.eventType}
                            </Badge>
                        </div>

                        {ev.allBirds && (
                            <p className="text-sm text-muted-foreground mt-1">🐦 All birds</p>
                        )}

                        {!ev.allBirds && (linkedBird || linkedPair) && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {linkedBird
                                    ? <Link href={`/birds/${linkedBird.id}`} className="hover:text-foreground transition-colors">🐦 {linkedBird.name || linkedBird.ringId || `#${linkedBird.id}`}</Link>
                                    : ""}
                                {linkedPair ? `💑 ${pairLabel(linkedPair)}` : ""}
                            </p>
                        )}

                        {ev.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{ev.notes}</p>
                        )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onEdit}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
