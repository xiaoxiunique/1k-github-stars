export interface Repo {
  fullName: string;
  stars: number;
  forks: number;
  langIdx: number;
  description: string;
  growth: number;
}

export interface RepoData {
  langs: string[];
  colors: string[];
  repos: [string, number, number, number, string, number][];
  total: number;
  exported: string;
}

export interface GroupData {
  lang: string;
  color: string;
  count: number;
  total: number;
  repos: Repo[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RepoRect extends Rect {
  idx: number;
  isOthers?: boolean;
  othersCount?: number;
  groupIdx?: number;
}

export interface GroupRect extends Rect {
  lang: string;
  color: string;
  count: number;
  total: number;
  headerH: number;
  allRepos: Repo[];
}

export type Metric = "stars" | "forks" | "growth";
