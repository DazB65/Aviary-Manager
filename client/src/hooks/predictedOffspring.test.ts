import { describe, expect, it } from "vitest";
import { calculateOffspringProbabilities } from "@/genetics/engine";
import { gouldianFinchPack } from "@/genetics/packs/gouldianFinch";
import { GenotypeState } from "@/genetics/types";
import { groupOffspringProbabilitiesByTrait } from "@/components/pairs/PredictedOffspringSection";

describe("groupOffspringProbabilitiesByTrait", () => {
  it("groups offspring probabilities by trait while combining male and female outcomes", () => {
    const grouped = groupOffspringProbabilitiesByTrait(
      calculateOffspringProbabilities(
        { "black-head": GenotypeState.CARRIER },
        {},
        gouldianFinchPack
      ),
      gouldianFinchPack
    );

    expect(grouped).toEqual(
      expect.arrayContaining([
        {
          traitName: "Head",
          outcomes: [
            { label: "Red head", probabilityPercentage: 75 },
            { label: "Black head", probabilityPercentage: 25 },
          ],
        },
      ])
    );
  });
});