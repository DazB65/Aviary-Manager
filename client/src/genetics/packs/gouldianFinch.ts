import { InheritanceType, type GeneticsPack } from "../types";

export const gouldianFinchPack: GeneticsPack = {
  speciesId: "gouldian-finch",
  speciesName: "Gouldian Finch",
  traits: [
    {
      traitName: "Head Colour",
      mutations: [
        { id: "red-head", name: "Red Head", inheritanceType: InheritanceType.SEX_LINKED_DOMINANT },
        { id: "black-head", name: "Black Head", inheritanceType: InheritanceType.SEX_LINKED_RECESSIVE },
        { id: "yellow-head", name: "Yellow Head", inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE },
      ],
    },
    {
      traitName: "Body Colour",
      mutations: [
        { id: "green-body", name: "Green", inheritanceType: InheritanceType.AUTOSOMAL_DOMINANT },
        { id: "blue-body", name: "Blue", inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE },
        { id: "pastel-body", name: "Pastel", inheritanceType: InheritanceType.CO_DOMINANT_SEX_LINKED },
        { id: "dilute-body", name: "Dilute", inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE },
        {
          id: "australian-yellow-body",
          name: "Australian Yellow",
          inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE,
        },
        {
          id: "avb-body",
          name: "AVB",
          inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE,
        },
      ],
    },
    {
      traitName: "Breast Colour",
      mutations: [
        {
          id: "purple-breast",
          name: "Purple",
          inheritanceType: InheritanceType.AUTOSOMAL_DOMINANT,
        },
        { id: "white-breast", name: "White", inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE },
        { id: "lilac-breast", name: "Lilac", inheritanceType: InheritanceType.AUTOSOMAL_RECESSIVE },
      ],
    },
  ],
};