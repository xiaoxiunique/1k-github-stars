import type { Repo, Metric } from "./types";

export function getRepoValue(repo: Repo, metric: Metric): number {
  if (metric === "stars") return repo.stars;
  if (metric === "forks") return repo.forks;
  if (metric === "growth") return Math.max(repo.growth, 0);
  return repo.stars;
}
