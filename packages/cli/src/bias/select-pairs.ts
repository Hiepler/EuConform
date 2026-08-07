export interface PairSelection<T> {
  pairs: T[];
  /** The seed that produced this selection, or null when the full dataset was used. */
  seed: number | null;
}

const SEED_RANGE = 0x100000000;

/** mulberry32 — small and stable, so a recorded seed replays across Node versions. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / SEED_RANGE;
  };
}

/**
 * Pick a reproducible subset of a CrowS-Pairs dataset.
 *
 * The shipped datasets are ordered by bias category, so truncating to the first
 * N pairs would silently confine a short run to the first few categories. The
 * selection is therefore a seeded shuffle, and the seed is returned so it can be
 * recorded in the evidence artifact and replayed.
 */
export function selectPairs<T>(dataset: T[], maxPairs?: number, seed?: number): PairSelection<T> {
  if (maxPairs === undefined || maxPairs >= dataset.length) {
    return { pairs: dataset, seed: null };
  }

  const resolvedSeed = seed ?? Math.floor(Math.random() * SEED_RANGE);
  const rng = mulberry32(resolvedSeed);
  const shuffled = [...dataset];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }

  return { pairs: shuffled.slice(0, maxPairs), seed: resolvedSeed };
}
