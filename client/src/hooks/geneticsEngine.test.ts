import { describe, expect, it } from "vitest";
import { calculateOffspringProbabilities, describeVisualPhenotype } from "../genetics/engine";
import { gouldianFinchPack } from "../genetics/packs/gouldianFinch";
import { GenotypeState, InheritanceType, type GeneticsPack } from "../genetics/types";

function sumProbability(results: ReturnType<typeof calculateOffspringProbabilities>, ...needles: string[]): number {
  return results
    .filter((result) => needles.every((needle) => result.phenotypeDescription.includes(needle)))
    .reduce((total, result) => total + result.probabilityPercentage, 0);
}

describe("calculateOffspringProbabilities", () => {
  it("handles autosomal recessive carrier pairings", () => {
    const results = calculateOffspringProbabilities(
      { "blue-body": GenotypeState.CARRIER },
      { "blue-body": GenotypeState.CARRIER },
      gouldianFinchPack
    );

    expect(sumProbability(results, "Body Colour: Blue")).toBeCloseTo(25, 5);
  });

  it("handles sex-linked recessive outcomes where only daughters express from a split male x wild hen", () => {
    const results = calculateOffspringProbabilities(
      { "black-head": GenotypeState.CARRIER },
      {},
      gouldianFinchPack
    );

    expect(sumProbability(results, "Female —", "Head Colour: Black head")).toBeCloseTo(25, 5);
    expect(sumProbability(results, "Male —", "Head Colour: Black head")).toBeCloseTo(0, 5);
  });

  it("handles sex-linked dominant inheritance with one expressing parent copy", () => {
    const dominantPack: GeneticsPack = {
      speciesId: "test-pack",
      speciesName: "Test Pack",
      traits: [
        {
          traitName: "Head Colour",
          mutations: [
            { id: "normal-head", name: "Normal", inheritanceType: InheritanceType.SEX_LINKED_DOMINANT },
            { id: "ruby-head", name: "Ruby", inheritanceType: InheritanceType.SEX_LINKED_DOMINANT },
          ],
        },
      ],
    };

    const results = calculateOffspringProbabilities(
      { "ruby-head": GenotypeState.EXPRESSING },
      {},
      dominantPack
    );

    expect(sumProbability(results, "Head Colour: Ruby")).toBeCloseTo(50, 5);
  });

  it("handles co-dominant sex-linked pastel with SF/DF outcomes", () => {
    const results = calculateOffspringProbabilities(
      { "pastel-body": GenotypeState.DOUBLE_FACTOR },
      { "pastel-body": GenotypeState.SINGLE_FACTOR },
      gouldianFinchPack
    );

    expect(sumProbability(results, "Male —", "Body Colour: Pastel (DF)")).toBeCloseTo(50, 5);
    expect(sumProbability(results, "Female —", "Body Colour: Pastel (SF)")).toBeCloseTo(50, 5);
  });
});

describe("describeVisualPhenotype", () => {
  it("uses default pack phenotypes when no mutations are selected", () => {
    expect(describeVisualPhenotype("male", {}, gouldianFinchPack)).toEqual([
      "Head Colour: Red head",
      "Body Colour: Green",
      "Breast Colour: Purple/Normal",
    ]);
  });

  it("respects bird sex for sex-linked recessive visuals", () => {
    expect(
      describeVisualPhenotype(
        "male",
        { "black-head": GenotypeState.CARRIER },
        gouldianFinchPack
      )[0]
    ).toBe("Head Colour: Red head");

    expect(
      describeVisualPhenotype(
        "female",
        { "black-head": GenotypeState.EXPRESSING },
        gouldianFinchPack
      )[0]
    ).toBe("Head Colour: Black head");
  });

  it("renders pastel SF and DF phenotypes correctly", () => {
    expect(
      describeVisualPhenotype(
        "male",
        { "pastel-body": GenotypeState.DOUBLE_FACTOR },
        gouldianFinchPack
      )[1]
    ).toBe("Body Colour: Pastel (DF)");

    expect(
      describeVisualPhenotype(
        "female",
        { "pastel-body": GenotypeState.SINGLE_FACTOR },
        gouldianFinchPack
      )[1]
    ).toBe("Body Colour: Pastel (SF)");
  });
});