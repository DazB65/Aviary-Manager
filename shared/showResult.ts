// Single source of truth for turning a free-text show result (e.g. "1st",
// "Champion", "Best in Show") into a comparable rank + win flag. Shared by the
// Statistics page and the Flock Report so "wins" and "best result" stay
// consistent everywhere. Unrecognised results are kept verbatim for display but
// never counted as a win — they just don't inflate the rollups.

export type ParsedShowResult = {
  /** Lower = better. Infinity for unrecognised / no result. */
  rank: number;
  /** True for top placings (1st, Champion, Best in Show, Best of Breed). */
  isWin: boolean;
};

const NO_RESULT: ParsedShowResult = { rank: Number.POSITIVE_INFINITY, isWin: false };

// Honour placings outrank numeric ones. Lower rank value = better result.
// "Reserve" is checked first so "Reserve Champion" ranks as a reserve (not a win)
// rather than matching the plain "champion" honour below it.
const HONOUR_RANKS: { rank: number; isWin: boolean; test: RegExp }[] = [
  { rank: 3, isWin: false, test: /\breserve\b/ },
  { rank: 0, isWin: true, test: /\b(best in show|bis)\b/ },
  { rank: 1, isWin: true, test: /\bchampion\b/ },
  { rank: 2, isWin: true, test: /\b(best of breed|bob)\b/ },
];

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};

/**
 * Parse a free-text show result into a comparable rank. A win is a 1st place or
 * any top honour (Champion / Best in Show / Best of Breed). Numeric placings are
 * ranked after honours so "Champion" always beats a bare "1st".
 */
export function parseShowResult(result: string | null | undefined): ParsedShowResult {
  if (!result) return NO_RESULT;
  const text = result.toLowerCase();

  for (const honour of HONOUR_RANKS) {
    if (honour.test.test(text)) return { rank: honour.rank, isWin: honour.isWin };
  }

  // Numeric placings: "1st", "2nd", "3rd place", "1", etc.
  const numeric = text.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\b/);
  if (numeric) {
    const place = parseInt(numeric[1], 10);
    if (place >= 1) return { rank: 100 + place, isWin: place === 1 };
  }

  // Word ordinals: "first", "second", …
  for (const [word, place] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      return { rank: 100 + place, isWin: place === 1 };
    }
  }

  return NO_RESULT;
}

export function isWinningResult(result: string | null | undefined): boolean {
  return parseShowResult(result).isWin;
}

/** Summary of a set of show results for stats / report rollups. */
export type ShowResultSummary = {
  totalShows: number;
  wins: number;
  /** The verbatim text of the best-ranked result, or null if none parsed. */
  bestResult: string | null;
};

export function summariseShowResults(
  shows: { result?: string | null }[],
): ShowResultSummary {
  let wins = 0;
  let bestRank = Number.POSITIVE_INFINITY;
  let bestResult: string | null = null;

  for (const show of shows) {
    const parsed = parseShowResult(show.result);
    if (parsed.isWin) wins++;
    if (parsed.rank < bestRank && show.result?.trim()) {
      bestRank = parsed.rank;
      bestResult = show.result.trim();
    }
  }

  return { totalShows: shows.length, wins, bestResult };
}
