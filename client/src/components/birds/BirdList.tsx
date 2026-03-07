import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, GENDER_LABELS } from "./constants";
import { useLocation } from "wouter";
import { format } from "date-fns";
import type { SortCol } from "@/hooks/useBirds";

interface BirdListProps {
    birds: any[];
    speciesMap: Record<number, any>;
    inactiveStatuses: string[];
    sortCol: SortCol | null;
    sortDir: "asc" | "desc";
    onSortToggle: (col: SortCol) => void;
    onEdit: (bird: any) => void;
    onDelete: (id: number) => void;
}

const tableHeaders: { id: SortCol; label: string; className: string }[] = [
    { id: "name", label: "Bird", className: "" },
    { id: "species", label: "Species", className: "hidden sm:table-cell" },
    { id: "gender", label: "Gender", className: "" },
    { id: "ringId", label: "Ring ID", className: "hidden md:table-cell" },
    { id: "cage", label: "Cage", className: "hidden lg:table-cell" },
    { id: "mutation", label: "Colour / Mutation", className: "hidden lg:table-cell" },
    { id: "dob", label: "DOB", className: "hidden md:table-cell" },
    { id: "status", label: "Status", className: "" },
];

export function BirdList({
    birds,
    speciesMap,
    inactiveStatuses,
    sortCol,
    sortDir,
    onSortToggle,
    onEdit,
    onDelete,
}: BirdListProps) {
    const [, setLocation] = useLocation();

    return (
        <div className="rounded-xl border border-border overflow-hidden shadow-card">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {tableHeaders.map((col) => {
                            const active = sortCol === col.id;
                            const Icon = active
                                ? sortDir === "asc"
                                    ? ChevronUp
                                    : ChevronDown
                                : ChevronsUpDown;
                            return (
                                <th
                                    key={col.id}
                                    onClick={() => onSortToggle(col.id)}
                                    className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                        } ${col.className}`}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <Icon className="h-3 w-3 shrink-0" />
                                    </span>
                                </th>
                            );
                        })}
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {birds.map((bird) => {
                        const sp = speciesMap[bird.speciesId];
                        const dobStr = bird.dateOfBirth
                            ? format(
                                bird.dateOfBirth instanceof Date
                                    ? bird.dateOfBirth
                                    : new Date(String(bird.dateOfBirth)),
                                "dd MMM yyyy"
                            )
                            : "—";
                        return (
                            <tr
                                key={bird.id}
                                className={`hover:bg-muted/30 transition-colors group ${inactiveStatuses.includes(bird.status)
                                        ? "bg-muted/20 opacity-60"
                                        : "bg-white"
                                    }`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-lg overflow-hidden ${bird.gender === "male"
                                                    ? "bg-blue-50"
                                                    : bird.gender === "female"
                                                        ? "bg-pink-50"
                                                        : "bg-amber-50"
                                                } flex items-center justify-center text-lg shrink-0`}
                                        >
                                            {bird.photoUrl ? (
                                                <img
                                                    src={bird.photoUrl}
                                                    alt={bird.name ?? "Bird"}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : bird.gender === "male" ? (
                                                "♂"
                                            ) : bird.gender === "female" ? (
                                                "♀"
                                            ) : (
                                                "🐦"
                                            )}
                                        </div>
                                        <span className="font-semibold truncate max-w-32">
                                            {bird.name || bird.ringId || `#${bird.id}`}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                    {sp?.commonName ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={
                                            bird.gender === "male"
                                                ? "text-blue-600"
                                                : bird.gender === "female"
                                                    ? "text-rose-500"
                                                    : "text-muted-foreground"
                                        }
                                    >
                                        {GENDER_LABELS[bird.gender] || bird.gender}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">
                                    {bird.ringId || "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-teal-600 font-medium hidden lg:table-cell">
                                    {bird.cageNumber || "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-amber-600 hidden lg:table-cell">
                                    {bird.colorMutation || "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                                    {dobStr}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge
                                        className={`text-xs border ${STATUS_COLORS[bird.status]}`}
                                        variant="outline"
                                    >
                                        {STATUS_LABELS[bird.status] ?? bird.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setLocation(`/birds/${bird.id}`)}
                                            className="p-1.5 rounded-lg hover:bg-muted"
                                            title="View"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(bird)}
                                            className="p-1.5 rounded-lg hover:bg-muted"
                                            title="Edit"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm("Delete this bird?")) onDelete(bird.id);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-muted text-destructive"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
