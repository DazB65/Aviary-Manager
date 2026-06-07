import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dna } from "lucide-react";
import { formatPhenotypeSplitDisplay } from "@/genetics/phenotypeSplit";
import type { PhenotypeSplitPack, PhenotypeSplitSelection, SimpleColour } from "@/genetics/types";

interface Props {
  pack: PhenotypeSplitPack;
  value: PhenotypeSplitSelection;
  onChange: (next: PhenotypeSplitSelection) => void;
  className?: string;
  /** Larger controls for the bird detail page (default is the compact form size). */
  size?: "sm" | "md";
}

/**
 * Genetics card for phenotype-split packs (e.g. Zebra Finch): up to N visible
 * phenotype dropdowns, up to N split dropdowns, a live preview, and a notes area.
 * Shared by the Add/Edit bird form and the bird detail page.
 */
export function PhenotypeSplitGeneticsCard({ pack, value, onChange, className, size = "sm" }: Props) {
  const triggerClass = size === "sm" ? "h-8 text-xs" : "";
  const itemClass = size === "sm" ? "text-xs" : "";

  // Build the option list for a slot, hiding colours already chosen in other slots.
  const optionsFor = (all: SimpleColour[], selected: string[], slotIndex: number) =>
    all.filter((c) => !selected.some((id, i) => id === c.id && i !== slotIndex));

  const setSlot = (
    field: "phenotypes" | "splits",
    slotIndex: number,
    id: string,
  ) => {
    const current = [...value[field]];
    if (id === "none" || id === "") {
      current.splice(slotIndex, 1);
    } else {
      current[slotIndex] = id;
    }
    // De-duplicate while preserving order.
    const deduped = current.filter((v, i) => v && current.indexOf(v) === i);
    onChange({ ...value, [field]: deduped });
  };

  const renderSlots = (
    field: "phenotypes" | "splits",
    all: SimpleColour[],
    max: number,
    labelPrefix: string,
  ) => {
    const selected = value[field];
    // Show every filled slot plus one trailing empty slot, capped at max.
    const slotCount = Math.min(max, selected.length + 1);
    return Array.from({ length: slotCount }).map((_, i) => {
      const currentId = selected[i] ?? "";
      const options = optionsFor(all, selected, i);
      return (
        <div key={`${field}-${i}`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {labelPrefix} {i + 1}
          </p>
          <Select
            value={currentId || "none"}
            onValueChange={(v) => setSlot(field, i, v)}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="— Not set —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className={itemClass}>— Not set —</SelectItem>
              {options.map((c) => (
                <SelectItem key={c.id} value={c.id} className={itemClass}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    });
  };

  const preview = formatPhenotypeSplitDisplay(value, pack);

  return (
    <div className={`rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <Dna className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-semibold text-teal-800">Genetics</span>
      </div>

      {/* Phenotype */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">Phenotype (visible colour)</p>
        <div className="grid grid-cols-3 gap-3">
          {renderSlots("phenotypes", pack.phenotypes, pack.maxPhenotypes, "Phenotype")}
        </div>
      </div>

      {/* Splits */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">Split to</p>
        <div className="grid grid-cols-3 gap-3">
          {renderSlots("splits", pack.splits, pack.maxSplits, "Split")}
        </div>
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-lg bg-teal-100/80 border border-teal-200 px-3 py-2">
          <p className="text-xs font-semibold text-teal-800">{preview}</p>
        </div>
      )}

      {/* Genetics notes */}
      <div className="space-y-1">
        <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">Genetics notes</p>
        <Textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Any genetics notes for this bird…"
          rows={2}
          className="bg-white/70"
        />
      </div>
    </div>
  );
}
