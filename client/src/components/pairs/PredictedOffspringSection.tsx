import { useAuth } from "@/_core/hooks/useAuth";
import { calculateOffspringProbabilities } from "@/genetics/engine";
import { gouldianFinchPack } from "@/genetics/packs/gouldianFinch";
import type { BirdGenotype, GeneticsPack, OffspringProbability } from "@/genetics/types";
import { readActiveGeneticsPacks } from "@/genetics/useGeneticsPacks";
import { Dna } from "lucide-react";
import { useMemo } from "react";

type PairBird = { id: number } | undefined;

type TraitPrediction = {
  traitName: string;
  outcomes: Array<{ label: string; probabilityPercentage: number }>;
};

export function groupOffspringProbabilitiesByTrait(
  offspring: OffspringProbability[],
  pack: GeneticsPack
): TraitPrediction[] {
  const totals = new Map<string, Map<string, number>>();

  for (const result of offspring) {
    const [, traitSummary = result.phenotypeDescription] = result.phenotypeDescription.split(" — ");

    for (const traitResult of traitSummary.split("; ")) {
      const [traitName, ...valueParts] = traitResult.split(": ");
      const outcomeLabel = valueParts.join(": ") || "—";
      const traitTotals = totals.get(traitName) ?? new Map<string, number>();

      traitTotals.set(
        outcomeLabel,
        Number(((traitTotals.get(outcomeLabel) ?? 0) + result.probabilityPercentage).toFixed(2))
      );

      totals.set(traitName, traitTotals);
    }
  }

  return pack.traits
    .map((trait) => ({
      traitName: formatTraitName(trait.traitName),
      outcomes: Array.from((totals.get(trait.traitName) ?? new Map<string, number>()).entries())
        .map(([label, probabilityPercentage]) => ({ label, probabilityPercentage }))
        .sort(
          (left, right) =>
            right.probabilityPercentage - left.probabilityPercentage ||
            left.label.localeCompare(right.label)
        ),
    }))
    .filter((trait) => trait.outcomes.length > 0);
}

function formatTraitName(traitName: string): string {
  return traitName.replace(/\s*Colour$/i, "");
}

function formatProbability(probabilityPercentage: number): string {
  return `${probabilityPercentage.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function readStoredBirdGenotype(birdId?: number): BirdGenotype | null {
  if (typeof window === "undefined" || !birdId) return null;

  const storedValue = window.localStorage.getItem(`birdGenetics_${birdId}`);
  if (!storedValue) return null;

  try {
    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" ? (parsedValue as BirdGenotype) : null;
  } catch {
    return null;
  }
}

export function PredictedOffspringSection({ male, female }: { male?: PairBird; female?: PairBird }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const showPredictedOffspring = useMemo(
    () => isAdmin && readActiveGeneticsPacks().includes(gouldianFinchPack.speciesId),
    [isAdmin]
  );

  const maleGenotype = useMemo(() => readStoredBirdGenotype(male?.id), [male?.id]);
  const femaleGenotype = useMemo(() => readStoredBirdGenotype(female?.id), [female?.id]);

  const groupedPredictions = useMemo(() => {
    if (!maleGenotype || !femaleGenotype) return [];

    return groupOffspringProbabilitiesByTrait(
      calculateOffspringProbabilities(maleGenotype, femaleGenotype, gouldianFinchPack),
      gouldianFinchPack
    );
  }, [femaleGenotype, maleGenotype]);

  if (!showPredictedOffspring) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Dna className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-foreground">Predicted Offspring</h3>
      </div>

      {!maleGenotype || !femaleGenotype ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Add genetics data to both birds to see predicted offspring colours
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {groupedPredictions.map((trait) => (
            <div key={trait.traitName} className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {trait.traitName}
              </p>
              <ul className="mt-2 space-y-2">
                {trait.outcomes.map((outcome) => (
                  <li key={`${trait.traitName}-${outcome.label}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{outcome.label}</span>
                    <span className="font-medium text-teal-700">
                      {formatProbability(outcome.probabilityPercentage)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}