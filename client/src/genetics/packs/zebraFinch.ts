import type { PhenotypeSplitPack, SimpleColour } from "../types";

/** Build a SimpleColour from a display name (id = kebab-cased name). */
const colour = (name: string): SimpleColour => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
});

// Recognised phenotype (visible) mutations — select up to 3.
const PHENOTYPES = [
  "Grey",
  "Slate",
  "Dilute Blue",
  "Silver",
  "Fawn",
  "Beige",
  "Dark Cream",
  "Cream",
  "White",
  "Marked White",
  "Cream Back",
  "Chestnut Flanked",
  "Blackface",
  "Blackbodied",
  "Blackfront",
  "Charcoal",
  "QLD Isabel",
  "Alumina",
  "Grizzle",
  "Pied",
  "Yellowbill",
  "Red",
  "Frosted",
].map(colour);

// Splits — dominant mutations are excluded (no split exists). Select up to 3.
const SPLITS = [
  "Slate",
  "Fawn",
  "Beige",
  "White",
  "Marked White",
  "Cream Back",
  "Chestnut Flanked",
  "Blackfront",
  "Charcoal",
  "QLD Isabel",
  "Alumina",
  "Grizzle",
  "Pied",
  "Yellowbill",
  "Red",
  "Frosted",
].map(colour);

export const zebraFinchPack: PhenotypeSplitPack = {
  kind: "phenotype-split",
  speciesId: "zebra-finch",
  speciesName: "Zebra Finch",
  speciesMatch: "zebra",
  description: "Record up to 3 visible phenotype colours and up to 3 splits for Zebra Finches",
  phenotypes: PHENOTYPES,
  splits: SPLITS,
  maxPhenotypes: 3,
  maxSplits: 3,
};
