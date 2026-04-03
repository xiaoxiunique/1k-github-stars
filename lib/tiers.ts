import type { Repo, Metric } from "./types";
import { getRepoValue } from "./data";

export interface Tier {
  label: string;
  slug: string;
  min: number;
  max: number;
}

// Generate sub-tiers for a given range
// If range is large, split into meaningful sub-ranges
export function generateSubTiers(min: number, max: number): Tier[] {
  const range = max - min;

  // Find good split points
  const tiers: Tier[] = [];

  if (range <= 0) return [];

  // Dynamic splitting based on range size
  let boundaries: number[];

  if (max >= 100000) {
    boundaries = [100000, 50000, 20000, 10000, 5000, 2000, 0].filter(b => b >= min && b < max);
  } else if (range > 5000) {
    // Split into ~4-6 chunks
    const step = Math.ceil(range / 5 / 1000) * 1000; // round to nearest 1k
    boundaries = [];
    for (let b = max; b > min; b -= step) {
      boundaries.push(b);
    }
    if (boundaries[boundaries.length - 1] > min) boundaries.push(min);
  } else if (range > 1000) {
    const step = Math.ceil(range / 4 / 500) * 500;
    boundaries = [];
    for (let b = max; b > min; b -= step) {
      boundaries.push(b);
    }
    if (boundaries[boundaries.length - 1] > min) boundaries.push(min);
  } else {
    // Small range, split into ~3 chunks
    const step = Math.ceil(range / 3 / 100) * 100;
    boundaries = [];
    for (let b = max; b > min; b -= step) {
      boundaries.push(b);
    }
    if (boundaries[boundaries.length - 1] > min) boundaries.push(min);
  }

  boundaries.sort((a, b) => b - a);

  for (let i = 0; i < boundaries.length - 1; i++) {
    const hi = boundaries[i];
    const lo = boundaries[i + 1];
    const label = `★ ${fmtTierNum(lo)}–${fmtTierNum(hi)}`;
    const slug = `${lo}-${hi}`;
    tiers.push({ label, slug, min: lo, max: hi });
  }

  return tiers;
}

function fmtTierNum(n: number): string {
  if (n >= 1000) return (n / 1000) + "k";
  return String(n);
}

// Top-level tiers (used by detail page)
export const TOP_TIERS: Tier[] = [
  { label: "★ 100k+", slug: "100000-Infinity", min: 100000, max: Infinity },
  { label: "★ 50k–100k", slug: "50000-100000", min: 50000, max: 100000 },
  { label: "★ 20k–50k", slug: "20000-50000", min: 20000, max: 50000 },
  { label: "★ 10k–20k", slug: "10000-20000", min: 10000, max: 20000 },
  { label: "★ 5k–10k", slug: "5000-10000", min: 5000, max: 10000 },
  { label: "★ 2k–5k", slug: "2000-5000", min: 2000, max: 5000 },
  { label: "★ 1k–2k", slug: "1000-2000", min: 1000, max: 2000 },
];

export function parseTierSlug(slug: string): { min: number; max: number } | null {
  const parts = slug.split("-");
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const max = parts[1] === "Infinity" ? Infinity : Number(parts[1]);
  if (isNaN(min) || (isNaN(max) && max !== Infinity)) return null;
  return { min, max };
}

export function filterReposByTier(repos: Repo[], min: number, max: number, metric: Metric = "stars"): Repo[] {
  return repos.filter(r => {
    const v = getRepoValue(r, metric);
    return v >= min && v < max;
  }).sort((a, b) => getRepoValue(b, metric) - getRepoValue(a, metric));
}
