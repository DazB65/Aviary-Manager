export const STATUS_STYLES: Record<string, string> = {
  incubating: "bg-amber-50 text-amber-700 border-amber-200",
  hatched: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  abandoned: "bg-gray-50 text-gray-500 border-gray-200",
};

import { Egg, CheckCircle2, XCircle } from "lucide-react";

export const STATUS_ICONS: Record<string, React.ReactNode> = {
  incubating: <Egg className="h-3.5 w-3.5" />,
  hatched: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  abandoned: <XCircle className="h-3.5 w-3.5" />,
};

export type EggOutcome = "unknown" | "fertile" | "infertile" | "cracked" | "hatched" | "died" | "fledged";

export const EGG_OUTCOME_CONFIG: Record<
  EggOutcome,
  { label: string; emoji: string; bg: string; text: string; border: string; ring: string }
> = {
  unknown: { label: "Pending", emoji: "🥚", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", ring: "ring-gray-300" },
  fertile: { label: "Fertile", emoji: "🟢", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", ring: "ring-emerald-400" },
  infertile: { label: "Infertile", emoji: "⚪", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-300", ring: "ring-slate-400" },
  cracked: { label: "Cracked", emoji: "💔", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-300", ring: "ring-orange-400" },
  hatched: { label: "Hatched", emoji: "🐣", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300", ring: "ring-teal-400" },
  fledged: { label: "Fledged", emoji: "🕊️", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-300", ring: "ring-blue-400" },
  died: { label: "Died", emoji: "🖤", bg: "bg-red-50", text: "text-red-600", border: "border-red-200", ring: "ring-red-400" },
};

export const OUTCOME_OPTIONS: EggOutcome[] = ["unknown", "fertile", "infertile", "cracked", "hatched", "fledged", "died"];

