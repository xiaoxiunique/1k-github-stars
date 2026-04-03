import type { RepoData, Repo, GroupData, Metric } from "./types";
import rawData from "@/data/repos.json";

const data = rawData as RepoData;

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

export function getRepoValue(repo: Repo, metric: Metric): number {
  if (metric === "stars") return repo.stars;
  if (metric === "forks") return repo.forks;
  if (metric === "growth") return Math.max(repo.growth, 0);
  return repo.stars;
}

export function getGroups(metric: Metric = "stars"): GroupData[] {
  const repos = getAllRepos();
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

export function getGroupByLang(lang: string): GroupData | null {
  const groups = getGroups();
  return groups.find((g) => g.lang.toLowerCase() === lang.toLowerCase()) ?? null;
}

export function getAllLangSlugs(): string[] {
  const groups = getGroups();
  return groups.map((g) => g.lang.toLowerCase());
}
