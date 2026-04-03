import { execFileSync } from "node:child_process";
import { NextResponse } from "next/server";
import { getRepoSnapshotMeta } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RepoMeta = {
  createdAt?: string;
  updatedAt?: string;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

const responseCache = new Map<string, RepoMeta & { cachedAt: number }>();
const pendingRequests = new Map<string, Promise<RepoMeta | null>>();

let githubToken: string | null | undefined;

function normalizeMeta(meta: RepoMeta | null | undefined): RepoMeta | null {
  if (!meta) return null;

  const createdAt = meta.createdAt?.trim() || undefined;
  const updatedAt = meta.updatedAt?.trim() || undefined;

  if (!createdAt && !updatedAt) return null;
  return { createdAt, updatedAt };
}

function readCache(fullName: string) {
  const cached = responseCache.get(fullName);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    responseCache.delete(fullName);
    return null;
  }
  return {
    createdAt: cached.createdAt,
    updatedAt: cached.updatedAt,
  };
}

function writeCache(fullName: string, meta: RepoMeta) {
  responseCache.set(fullName, {
    ...meta,
    cachedAt: Date.now(),
  });
}

function getGithubToken() {
  if (githubToken !== undefined) return githubToken;

  const envToken = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (envToken) {
    githubToken = envToken;
    return githubToken;
  }

  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    githubToken = token || null;
  } catch {
    githubToken = null;
  }

  return githubToken;
}

async function fetchGithubMeta(fullName: string) {
  const [owner, repo] = fullName.split("/");
  const token = getGithubToken();
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "github-treemap-hover-meta",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    created_at?: string;
    updated_at?: string;
    pushed_at?: string;
  };

  return normalizeMeta({
    createdAt: payload.created_at,
    updatedAt: payload.pushed_at ?? payload.updated_at,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fullName = url.searchParams.get("fullName")?.trim();

  if (!fullName || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) {
    return NextResponse.json(
      {
        error: "Invalid fullName",
      },
      { status: 400, headers: CACHE_HEADERS }
    );
  }

  const cached = readCache(fullName);
  if (cached) {
    return NextResponse.json(cached, { headers: CACHE_HEADERS });
  }

  const snapshotMeta = normalizeMeta(getRepoSnapshotMeta(fullName));
  if (snapshotMeta) {
    writeCache(fullName, snapshotMeta);
    return NextResponse.json(snapshotMeta, { headers: CACHE_HEADERS });
  }

  let pending = pendingRequests.get(fullName);
  if (!pending) {
    pending = fetchGithubMeta(fullName).finally(() => {
      pendingRequests.delete(fullName);
    });
    pendingRequests.set(fullName, pending);
  }

  const meta = await pending;
  if (!meta) {
    return NextResponse.json(
      {
        createdAt: null,
        updatedAt: null,
      },
      { headers: CACHE_HEADERS }
    );
  }

  writeCache(fullName, meta);
  return NextResponse.json(meta, { headers: CACHE_HEADERS });
}
