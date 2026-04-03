import type { RepoData, Repo, GroupData, Metric } from "./types";
import { getRepoValue } from "./metrics";
import rawData from "@/data/repos.json";

const data = rawData as RepoData;
export const DAILY_TRENDING_MIN_REPO_AGE_DAYS = 7;
export const DAILY_TRENDING_MIN_BASELINE_STARS = 2500;
const repoMetaIndex = new Map(
  data.repos
    .filter((row) => row[6] || row[7])
    .map((row) => [
      row[0],
      {
        createdAt: row[6],
        updatedAt: row[7],
      },
    ])
);

export function getAllRepos(): Repo[] {
  return data.repos.map((r) => ({
    fullName: r[0],
    stars: r[1],
    forks: r[2],
    langIdx: r[3],
    description: r[4],
    growth: r[5],
  }));
}

export function getLangs(): string[] {
  return data.langs;
}

export function getColors(): string[] {
  return data.colors;
}

export function getTotal(): number {
  return data.total;
}

export function getExportedAt(): string {
  return data.exported;
}

export function getRepoSnapshotMeta(fullName: string) {
  return repoMetaIndex.get(fullName) ?? null;
}

function groupRepos(repos: Repo[], metric: Metric = "stars"): GroupData[] {
  const langs = getLangs();
  const colors = getColors();
  const groups = new Map<string, { repos: Repo[]; total: number }>();

  for (const repo of repos) {
    const v = getRepoValue(repo, metric);
    if (v <= 0) continue;
    const lang = langs[repo.langIdx] || "Other";
    if (!groups.has(lang)) groups.set(lang, { repos: [], total: 0 });
    const g = groups.get(lang)!;
    g.repos.push(repo);
    g.total += v;
  }

  return [...groups.entries()]
    .map(([lang, g]) => {
      const langIdx = langs.indexOf(lang);
      return {
        lang,
        color: langIdx >= 0 ? colors[langIdx] : "#888",
        count: g.repos.length,
        total: g.total,
        repos: g.repos.sort(
          (a, b) => getRepoValue(b, metric) - getRepoValue(a, metric)
        ),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function getGroups(metric: Metric = "stars"): GroupData[] {
  return groupRepos(getAllRepos(), metric);
}

export function getDailyTrendingData() {
  const exportedAtMs = new Date(data.exported).getTime();
  const eligibleRepos: Repo[] = [];
  let positiveGrowthRepoCount = 0;

  for (const row of data.repos) {
    const growth = row[5] ?? 0;
    const baselineStars = row[1] - growth;
    const createdAt = row[6];
    const createdAtMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;

    if (baselineStars < DAILY_TRENDING_MIN_BASELINE_STARS) continue;
    if (!Number.isFinite(createdAtMs)) continue;
    if (exportedAtMs - createdAtMs < DAILY_TRENDING_MIN_REPO_AGE_DAYS * 24 * 60 * 60 * 1000) continue;

    if (growth > 0) {
      positiveGrowthRepoCount += 1;
    }

    eligibleRepos.push({
      fullName: row[0],
      stars: row[1],
      forks: row[2],
      langIdx: row[3],
      description: row[4],
      growth,
    });
  }

  return {
    groups: groupRepos(eligibleRepos),
    eligibleRepoCount: eligibleRepos.length,
    positiveGrowthRepoCount,
  };
}

export function getGroupByLang(lang: string): GroupData | null {
  const groups = getGroups();
  return groups.find((g) => g.lang.toLowerCase() === lang.toLowerCase()) ?? null;
}

export function getAllLangSlugs(): string[] {
  const groups = getGroups();
  return groups.map((g) => g.lang.toLowerCase());
}
