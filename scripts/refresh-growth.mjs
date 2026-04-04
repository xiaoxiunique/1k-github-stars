#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const DATA_PATH = resolve(process.cwd(), "data/repos.json");
const SNAPSHOT_DIR = resolve(process.cwd(), "data/snapshots");
const PROGRESS_PATH = resolve(SNAPSHOT_DIR, "refresh-growth-progress.json");
const META_INDEX_PATH = resolve(process.cwd(), "public/repo-meta.json");
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const BATCH_SIZE = Number.parseInt(process.env.GH_BATCH_SIZE ?? "100", 10);
const CONCURRENCY = Number.parseInt(process.env.GH_CONCURRENCY ?? "1", 10);
const MAX_RETRIES = Number.parseInt(process.env.GH_MAX_RETRIES ?? "4", 10);
const REQUEST_SPACING_MS = Number.parseInt(process.env.GH_REQUEST_SPACING_MS ?? "300", 10);

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonAtomically(path, value) {
  const next = JSON.stringify(value);
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, next);
  renameSync(tempPath, path);
}

function saveSnapshotIfNeeded(rawJson, exportedAt) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshotName = exportedAt.replaceAll(":", "-");
  const snapshotPath = resolve(SNAPSHOT_DIR, `${snapshotName}.json`);
  if (!existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, rawJson);
  }
  return snapshotPath;
}

function buildRepoMetaIndex(rows) {
  const index = {};

  for (const row of rows) {
    if (!row[6] && !row[7]) continue;
    index[row[0]] = [row[6] ?? null, row[7] ?? null];
  }

  return index;
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function escapeGraphqlString(value) {
  return JSON.stringify(value);
}

function buildQuery(batch) {
  const lines = ["query BatchRepoStats {"];
  batch.forEach((repo, index) => {
    const [owner, name] = repo.fullName.split("/");
    lines.push(
      `  r${index}: repository(owner: ${escapeGraphqlString(owner)}, name: ${escapeGraphqlString(name)}) {`,
      "    nameWithOwner",
      "    stargazerCount",
      "    forkCount",
      "    createdAt",
      "    updatedAt",
      "    pushedAt",
      "  }",
    );
  });
  lines.push("  rateLimit { cost remaining resetAt }", "}");
  return lines.join("\n");
}

async function requestBatch(token, batch, batchIndex, totalBatches) {
  const query = buildQuery(batch);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Authorization": `bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "github-treemap-refresh-growth",
        },
        body: JSON.stringify({ query }),
      });

      const payload = await response.json().catch(() => ({}));

      const errors = Array.isArray(payload.errors) ? payload.errors : [];
      const onlyMissingRepoErrors =
        errors.length > 0 &&
        errors.every(
          (error) =>
            error?.type === "NOT_FOUND" &&
            Array.isArray(error.path) &&
            typeof error.path[0] === "string" &&
            /^r\d+$/.test(error.path[0])
        );

      if (response.ok && (!payload.errors || onlyMissingRepoErrors)) {
        const { rateLimit } = payload.data;
        if (batchIndex % 25 === 0 || batchIndex === totalBatches) {
          console.log(
            `[${batchIndex}/${totalBatches}] remaining=${rateLimit.remaining} cost=${rateLimit.cost} resetAt=${rateLimit.resetAt}`,
          );
        }
        if (onlyMissingRepoErrors) {
          console.warn(
            `batch ${batchIndex}/${totalBatches} resolved with ${errors.length} missing repos`
          );
        }
        return payload.data;
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const isSecondaryLimit =
        response.status === 403 &&
        typeof payload.message === "string" &&
        payload.message.toLowerCase().includes("secondary rate limit");
      const retryAfterMs = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10) * 1000
        : isSecondaryLimit
          ? 60000 * attempt
          : attempt * 2000;
      const errorMessage = JSON.stringify(payload.errors ?? payload);
      console.warn(
        `batch ${batchIndex}/${totalBatches} attempt ${attempt}/${MAX_RETRIES} failed: status=${response.status} ${errorMessage}`,
      );

      if (attempt === MAX_RETRIES) {
        throw new Error(`batch ${batchIndex} failed after ${MAX_RETRIES} attempts`);
      }

      await sleep(retryAfterMs);
    } catch (error) {
      const retryAfterMs = 5000 * attempt;
      console.warn(
        `batch ${batchIndex}/${totalBatches} attempt ${attempt}/${MAX_RETRIES} network error: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(retryAfterMs);
    }
  }

  throw new Error(`batch ${batchIndex} failed unexpectedly`);
}

async function main() {
  const rawJson = readFileSync(DATA_PATH, "utf8");
  const currentData = JSON.parse(rawJson);
  const token = getToken();
  let baselineData;
  let baselineSnapshotPath;
  let nextRepos;
  let startedAt;
  let completedBatches;

  mkdirSync(SNAPSHOT_DIR, { recursive: true });

  if (existsSync(PROGRESS_PATH)) {
    const progress = readJson(PROGRESS_PATH);
    baselineSnapshotPath = progress.baselineSnapshotPath;

    if (!baselineSnapshotPath || !existsSync(baselineSnapshotPath)) {
      throw new Error(
        `progress file exists but baseline snapshot is missing: ${baselineSnapshotPath ?? "unknown"}`
      );
    }

    baselineData = readJson(baselineSnapshotPath);
    nextRepos = progress.nextRepos;
    startedAt = progress.startedAt ?? new Date().toISOString();
    completedBatches = new Set(progress.completedBatches ?? []);

    if (!Array.isArray(nextRepos) || nextRepos.length !== baselineData.repos.length) {
      throw new Error("progress file is invalid: nextRepos length mismatch");
    }

    console.log(
      `resuming from ${completedBatches.size} completed batches using ${baselineSnapshotPath}`
    );
  } else {
    baselineSnapshotPath = saveSnapshotIfNeeded(rawJson, currentData.exported);
    baselineData = currentData;
    nextRepos = baselineData.repos.map((row) => [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5] ?? 0,
      row[6] ?? "",
      row[7] ?? "",
    ]);
    startedAt = new Date().toISOString();
    completedBatches = new Set();
  }

  const repos = baselineData.repos.map((row, rowIndex) => ({
    rowIndex,
    fullName: row[0],
    stars: row[1],
    forks: row[2],
    langIdx: row[3],
    description: row[4],
    growth: row[5] ?? 0,
    createdAt: row[6] ?? "",
    updatedAt: row[7] ?? "",
  }));

  const batches = chunk(repos, BATCH_SIZE);
  const missingRepos = new Set();
  let progressDirty = false;
  let nextBatchIndex = 0;

  function persistProgress(force = false) {
    if (!force && !progressDirty) return;

    writeJsonAtomically(PROGRESS_PATH, {
      version: 1,
      startedAt,
      baselineExported: baselineData.exported,
      baselineSnapshotPath,
      totalBatches: batches.length,
      completedBatches: [...completedBatches].sort((a, b) => a - b),
      nextRepos,
      updatedAt: new Date().toISOString(),
    });

    progressDirty = false;
  }

  function getNextPendingBatchIndex() {
    while (nextBatchIndex < batches.length) {
      const currentIndex = nextBatchIndex;
      nextBatchIndex += 1;
      if (!completedBatches.has(currentIndex)) {
        return currentIndex;
      }
    }
    return -1;
  }

  persistProgress(true);

  async function worker() {
    while (true) {
      const currentIndex = getNextPendingBatchIndex();
      if (currentIndex < 0) {
        return;
      }

      const batch = batches[currentIndex];
      const data = await requestBatch(token, batch, currentIndex + 1, batches.length);

      batch.forEach((repo, index) => {
        const result = data[`r${index}`];
        if (result) {
          missingRepos.delete(repo.fullName);
          nextRepos[repo.rowIndex] = [
            repo.fullName,
            result.stargazerCount,
            result.forkCount,
            repo.langIdx,
            repo.description,
            Math.max(result.stargazerCount - repo.stars, 0),
            result.createdAt,
            result.pushedAt ?? result.updatedAt,
          ];
          return;
        }

        missingRepos.add(repo.fullName);
        nextRepos[repo.rowIndex] = [
          repo.fullName,
          repo.stars,
          repo.forks,
          repo.langIdx,
          repo.description,
          0,
          repo.createdAt,
          repo.updatedAt,
        ];
      });

      completedBatches.add(currentIndex);
      progressDirty = true;
      persistProgress(true);

      if (REQUEST_SPACING_MS > 0) {
        await sleep(REQUEST_SPACING_MS);
      }
    }
  }

  try {
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, batches.length) },
      () => worker()
    );
    await Promise.all(workers);
  } catch (error) {
    persistProgress(true);
    throw error;
  }

  let updatedCount = 0;
  let nonZeroGrowthCount = 0;

  baselineData.repos.forEach((row, index) => {
    const nextRow = nextRepos[index];
    if (nextRow[1] !== row[1] || nextRow[2] !== row[2]) {
      updatedCount += 1;
    }
    if ((nextRow[5] ?? 0) > 0) {
      nonZeroGrowthCount += 1;
    }
  });

  const nextData = {
    ...baselineData,
    repos: nextRepos,
    exported: new Date().toISOString(),
  };

  writeJsonAtomically(DATA_PATH, nextData);
  writeJsonAtomically(META_INDEX_PATH, buildRepoMetaIndex(nextRepos));
  rmSync(PROGRESS_PATH, { force: true });

  const topMovers = [...nextRepos]
    .filter((row) => row[5] > 0)
    .sort((a, b) => b[5] - a[5])
    .slice(0, 10)
    .map((row) => `${row[0]}:+${row[5]}`);

  console.log(
    JSON.stringify(
      {
        repos: nextRepos.length,
        durationMinutes: Number(
          ((Date.now() - new Date(startedAt).getTime()) / 60000).toFixed(2)
        ),
        updatedCount,
        nonZeroGrowthCount,
        missingCount: missingRepos.size,
        exported: nextData.exported,
        topMovers,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
