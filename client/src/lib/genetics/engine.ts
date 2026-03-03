// ─── Genetics Engine ──────────────────────────────────────────────────────────
// Species-agnostic Punnett square calculator with ZZ/ZW sex awareness.
//
// ZZ/ZW sex determination (used by finches, parrots, and most birds):
//   Males = ZZ  → can be split (heterozygous) for sex-linked recessive traits
//   Females = ZW → cannot be split; they either express or don't
//
// Autosomal recessive: standard Mendelian — both parents must carry allele
// Sex-linked recessive: locus on Z chromosome only

export type InheritanceType = 'autosomal-recessive' | 'sex-linked-recessive';

export interface MutationDef {
  id: string;
  name: string;
  locus: string;           // Unique locus key — mutations at the same locus are allelic
  inheritance: InheritanceType;
  description?: string;
}

export interface BirdGenotype {
  gender: 'male' | 'female';
  visual: string[];   // Mutation IDs visually expressed
  splits: string[];   // Mutation IDs carried but not expressed (males only for sex-linked)
}

export interface OffspringOutcome {
  gender: 'male' | 'female';
  visual: string[];
  splits: string[];
  probability: number; // 0–1 fraction
}

// ─── Autosomal Recessive ──────────────────────────────────────────────────────
// Alleles: N = normal (dominant), m = mutant (recessive)
// Genotypes: NN (normal), Nm (split/carrier), mm (visual mutant)
type AutosomalAllele = 'N' | 'm';

function getAutosomalAlleles(isVisual: boolean, isSplit: boolean): [AutosomalAllele, AutosomalAllele] {
  if (isVisual) return ['m', 'm'];
  if (isSplit)  return ['N', 'm'];
  return ['N', 'N'];
}

function predictAutosomal(
  dadVisual: boolean, dadSplit: boolean,
  momVisual: boolean, momSplit: boolean,
): { visual: number; split: number; normal: number } {
  const dadAlleles = getAutosomalAlleles(dadVisual, dadSplit);
  const momAlleles = getAutosomalAlleles(momVisual, momSplit);

  let visual = 0, split = 0, normal = 0;
  for (const d of dadAlleles) {
    for (const m of momAlleles) {
      const combo = [d, m].sort().join('');
      if (combo === 'mm') visual++;
      else if (combo === 'Nm') split++;
      else normal++;
    }
  }
  const total = 4;
  return { visual: visual / total, split: split / total, normal: normal / total };
}

// ─── Sex-Linked Recessive ─────────────────────────────────────────────────────
// Males (ZZ): Z+Z+ (normal), Z+Zm (split), ZmZm (visual)
// Females (ZW): Z+W (normal), ZmW (visual) — CANNOT be split
type ZAllele = 'Z+' | 'Zm';

function getMaleZAlleles(isVisual: boolean, isSplit: boolean): [ZAllele, ZAllele] {
  if (isVisual) return ['Zm', 'Zm'];
  if (isSplit)  return ['Z+', 'Zm'];
  return ['Z+', 'Z+'];
}

function getFemaleZAllele(isVisual: boolean): ZAllele {
  return isVisual ? 'Zm' : 'Z+';
}

// ─── Main Predictor ───────────────────────────────────────────────────────────
// Combines predictions across all mutations for a given pair.
// Returns a deduplicated list of OffspringOutcome with combined probabilities.
export function predictOffspring(
  male: BirdGenotype,
  female: BirdGenotype,
  mutations: MutationDef[],
): OffspringOutcome[] {
  const genders: Array<'male' | 'female'> = ['male', 'female'];
  const results: OffspringOutcome[] = [];

  for (const gender of genders) {
    const mutationOutcomes: Array<{ id: string; visual: number; split: number; normal: number }> = [];

    for (const mut of mutations) {
      const dadVisual = male.visual.includes(mut.id);
      const dadSplit  = male.splits.includes(mut.id);
      const momVisual = female.visual.includes(mut.id);

      if (mut.inheritance === 'autosomal-recessive') {
        const momSplit = female.splits.includes(mut.id);
        const r = predictAutosomal(dadVisual, dadSplit, momVisual, momSplit);
        mutationOutcomes.push({ id: mut.id, ...r });
      } else {
        const r = predictSexLinked(dadVisual, dadSplit, momVisual);
        if (gender === 'male') {
          mutationOutcomes.push({ id: mut.id, ...r.sons });
        } else {
          mutationOutcomes.push({ id: mut.id, visual: r.daughters.visual, split: 0, normal: r.daughters.normal });
        }
      }
    }

    // Cartesian product across mutations
    type MutState = 'visual' | 'split' | 'normal';
    const combos: Array<{ states: Array<{ id: string; state: MutState }>; prob: number }> = [{ states: [], prob: 1 }];

    for (const mo of mutationOutcomes) {
      const next: typeof combos = [];
      for (const combo of combos) {
        if (mo.visual > 0) next.push({ states: [...combo.states, { id: mo.id, state: 'visual' }], prob: combo.prob * mo.visual });
        if (mo.split > 0)  next.push({ states: [...combo.states, { id: mo.id, state: 'split'  }], prob: combo.prob * mo.split  });
        if (mo.normal > 0) next.push({ states: [...combo.states, { id: mo.id, state: 'normal' }], prob: combo.prob * mo.normal });
      }
      combos.length = 0;
      combos.push(...next);
    }

    for (const combo of combos) {
      if (combo.prob === 0) continue;
      results.push({
        gender,
        visual: combo.states.filter(s => s.state === 'visual').map(s => s.id),
        splits: combo.states.filter(s => s.state === 'split').map(s => s.id),
        probability: combo.prob * 0.5, // 50/50 gender probability
      });
    }
  }

  // Merge identical outcomes
  const merged = new Map<string, OffspringOutcome>();
  for (const o of results) {
    const key = `${o.gender}|${[...o.visual].sort().join(',')}|${[...o.splits].sort().join(',')}`;
    if (merged.has(key)) {
      merged.get(key)!.probability += o.probability;
    } else {
      merged.set(key, { ...o });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.probability - a.probability);
}

// Returns per-sex outcomes: { sons: { visual, split, normal }, daughters: { visual, normal } }
function predictSexLinked(
  dadVisual: boolean, dadSplit: boolean,
  momVisual: boolean,
): {
  sons: { visual: number; split: number; normal: number };
  daughters: { visual: number; normal: number };
} {
  const dadAlleles = getMaleZAlleles(dadVisual, dadSplit);
  const momZ = getFemaleZAllele(momVisual);

  // Sons get one Z from dad + one Z from mom (mom passes her single Z to sons)
  // Daughters get one Z from dad + W from mom (dad's Z determines daughter's phenotype)
  let sonVisual = 0, sonSplit = 0, sonNormal = 0;
  let daughterVisual = 0, daughterNormal = 0;

  for (const dadZ of dadAlleles) {
    // Son: dadZ + momZ
    const sonCombo = [dadZ, momZ].sort().join('');
    if (sonCombo === 'ZmZm') sonVisual++;
    else if (sonCombo === 'Z+Zm') sonSplit++;
    else sonNormal++;

    // Daughter: dadZ + W (only dadZ matters)
    if (dadZ === 'Zm') daughterVisual++;
    else daughterNormal++;
  }

  return {
    sons: { visual: sonVisual / 2, split: sonSplit / 2, normal: sonNormal / 2 },
    daughters: { visual: daughterVisual / 2, normal: daughterNormal / 2 },
  };
}

