"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { squarify } from "@/lib/squarify";
import { lighten, darken, contrastText, fmtK } from "@/lib/colors";
import { getRepoValue } from "@/lib/data";
import { Header } from "./Header";
import { Panel, type PanelHandle } from "./Panel";
import { Tooltip, type TooltipHandle } from "./Tooltip";
import type { Repo, GroupData, Metric, RepoRect, GroupRect, Rect } from "@/lib/types";

type SquarifyRect = {
  rect?: Rect;
};

type GroupLayoutItem = SquarifyRect & {
  val: number;
  group: GroupData;
};

type TierGroup = {
  label: string;
  repos: Repo[];
  total: number;
};

type TierLayoutItem = SquarifyRect & {
  val: number;
  group: TierGroup;
};

type RepoLayoutItem = SquarifyRect & {
  val: number;
  repo: Repo | null;
  origIdx: number;
};

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface TierFocus {
  label: string;
  repos: Repo[];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 1.35;
const ENTRY_SETTLE_ZOOM = 1.08;
const WHEEL_ZOOM_SENSITIVITY = 0.0014;
const SEMANTIC_WHEEL_THRESHOLD = 220;
const DOUBLE_CLICK_ZOOM_FACTOR = 1.22;
const DRAG_THRESHOLD = 4;
const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

// Dynamic tier computation based on data range
function computeDynamicTiers(
  minVal: number,
  maxVal: number,
  repos: Repo[],
  getVal: (r: Repo) => number
): { label: string; min: number; max: number }[] {
  // Standard boundaries to try
  const BOUNDARIES = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 0];
  const relevant = BOUNDARIES.filter(b => b >= minVal && b <= maxVal + 1);

  // Ensure we include minVal and maxVal+1
  if (!relevant.includes(maxVal + 1) && maxVal + 1 > (relevant[0] || 0)) relevant.unshift(maxVal + 1);
  if (relevant[relevant.length - 1] > minVal) relevant.push(minVal);

  // Dedupe and sort descending
  const bounds = [...new Set(relevant)].sort((a, b) => b - a);

  if (bounds.length < 2) {
    // Can't split meaningfully, force equal-count split
    return forceEqualSplit(repos, getVal, 5);
  }

  const tiers: { label: string; min: number; max: number }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const max = bounds[i];
    const min = bounds[i + 1];
    const count = repos.filter(r => { const v = getVal(r); return v >= min && v < max; }).length;
    if (count > 0) {
      tiers.push({ label: `★ ${fmtK(min)}–${fmtK(max)}`, min, max });
    }
  }

  return tiers.length >= 2 ? tiers : forceEqualSplit(repos, getVal, 5);
}

function forceEqualSplit(
  repos: Repo[],
  getVal: (r: Repo) => number,
  chunks: number
): { label: string; min: number; max: number }[] {
  const sorted = [...repos].sort((a, b) => getVal(b) - getVal(a));
  const chunkSize = Math.ceil(sorted.length / chunks);
  const tiers: { label: string; min: number; max: number }[] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    const hi = getVal(chunk[0]);
    const lo = getVal(chunk[chunk.length - 1]);
    tiers.push({ label: `★ ${fmtK(lo)}–${fmtK(hi)}`, min: lo, max: hi + 1 });
  }
  return tiers;
}

interface TreemapProps {
  groups: GroupData[];
  total: number;
  initialLang?: string;
  initialTier?: TierFocus;
}

export function Treemap({ groups, total, initialLang, initialTier }: TreemapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<PanelHandle>(null);
  const tooltipRef = useRef<TooltipHandle>(null);

  const [metric, setMetric] = useState<Metric>("stars");
  const [search, setSearch] = useState("");
  const [hasVisibleData, setHasVisibleData] = useState(true);
  const [visibleLanguageCount, setVisibleLanguageCount] = useState(groups.length);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [isPanning, setIsPanning] = useState(false);
  const [focusLang, setFocusLang] = useState<string | null>(initialLang ?? null);
  const [focusTier, setFocusTier] = useState<TierFocus | null>(initialTier ?? null);

  const rectsRef = useRef<RepoRect[]>([]);
  const groupRectsRef = useRef<GroupRect[]>([]);
  const hoveredIdxRef = useRef(-1);
  const hoveredGroupRef = useRef(-1);
  const allReposRef = useRef<Repo[]>([]); // for detail panel
  const cameraRef = useRef<Camera>(DEFAULT_CAMERA);
  const viewportRef = useRef({ width: 0, height: 0 });
  const layoutBoundsRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const suppressClickRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const animationResolveRef = useRef<(() => void) | null>(null);
  const semanticTransitionRef = useRef(false);
  const semanticWheelRef = useRef<{
    direction: "in" | "out" | null;
    amount: number;
  }>({
    direction: null,
    amount: 0,
  });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const getVal = useCallback(
    (r: Repo) => getRepoValue(r, metric),
    [metric]
  );

  const viewLevel = focusLang ? (focusTier ? "tier" : "language") : "global";
  const activeGroup =
    focusLang
      ? groups.find((group) => group.lang.toLowerCase() === focusLang.toLowerCase()) ?? null
      : null;
  const activeTierGroup =
    activeGroup && focusTier
      ? {
          lang: focusTier.label,
          color: activeGroup.color,
          count: focusTier.repos.length,
          total: focusTier.repos.reduce((sum, repo) => sum + getVal(repo), 0),
          repos: focusTier.repos,
        }
      : null;

  useEffect(() => {
    setFocusLang(initialLang ?? null);
    setFocusTier(initialTier ?? null);
    cameraRef.current = DEFAULT_CAMERA;
    setCamera(DEFAULT_CAMERA);
  }, [initialLang, initialTier]);

  const resetHoverState = useCallback(() => {
    hoveredIdxRef.current = -1;
    hoveredGroupRef.current = -1;
    tooltipRef.current?.hide();
    panelRef.current?.hide();
  }, []);

  const clearSemanticWheelIntent = useCallback(() => {
    semanticWheelRef.current = {
      direction: null,
      amount: 0,
    };
  }, []);

  const clampCamera = useCallback((next: Camera): Camera => {
    const { width, height } = viewportRef.current;
    const bounds = layoutBoundsRef.current;

    if (!width || !height || !bounds.w || !bounds.h) return next;

    const bleedX = Math.max(width * 0.35, 96);
    const bleedY = Math.max(height * 0.35, 96);
    const minX = width - (bounds.x + bounds.w) * next.zoom - bleedX;
    const maxX = -bounds.x * next.zoom + bleedX;
    const minY = height - (bounds.y + bounds.h) * next.zoom - bleedY;
    const maxY = -bounds.y * next.zoom + bleedY;

    return {
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)),
    };
  }, []);

  const commitCamera = useCallback((next: Camera, options?: { clamp?: boolean }) => {
    const resolved = options?.clamp === false ? next : clampCamera(next);
    cameraRef.current = resolved;
    setCamera((prev) =>
      prev.x === resolved.x && prev.y === resolved.y && prev.zoom === resolved.zoom
        ? prev
        : resolved
    );
  }, [clampCamera]);

  const stopCameraAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (animationResolveRef.current) {
      const resolve = animationResolveRef.current;
      animationResolveRef.current = null;
      resolve();
    }
  }, []);

  const animateCameraTo = useCallback((target: Camera, duration = 240) => {
    stopCameraAnimation();

    return new Promise<void>((resolve) => {
      animationResolveRef.current = resolve;

      const finish = () => {
        if (animationResolveRef.current) {
          const done = animationResolveRef.current;
          animationResolveRef.current = null;
          done();
        }
      };

      const start = cameraRef.current;
      const end = clampCamera(target);

      if (
        start.x === end.x &&
        start.y === end.y &&
        start.zoom === end.zoom
      ) {
        commitCamera(end, { clamp: false });
        finish();
        return;
      }

      const startedAt = performance.now();
      const easeInOutCubic = (t: number) =>
        t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = easeInOutCubic(progress);

        commitCamera(
          {
            x: start.x + (end.x - start.x) * eased,
            y: start.y + (end.y - start.y) * eased,
            zoom: start.zoom + (end.zoom - start.zoom) * eased,
          },
          { clamp: false }
        );

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(tick);
        } else {
          animationRef.current = null;
          finish();
        }
      };

      animationRef.current = requestAnimationFrame(tick);
    });
  }, [clampCamera, commitCamera, stopCameraAnimation]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number, cam = cameraRef.current) => {
    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    };
  }, []);

  const zoomAtPoint = useCallback((sx: number, sy: number, nextZoom: number, duration = 0) => {
    const current = cameraRef.current;
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const anchor = screenToWorld(sx, sy, current);
    const target = {
      zoom: clampedZoom,
      x: sx - anchor.x * clampedZoom,
      y: sy - anchor.y * clampedZoom,
    };

    if (duration > 0) {
      animateCameraTo(target, duration);
      return;
    }

    commitCamera(target);
  }, [animateCameraTo, commitCamera, screenToWorld]);

  const waitForNextPaint = useCallback(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }, []);

  const getCenteredCamera = useCallback((zoom = ENTRY_SETTLE_ZOOM): Camera => {
    const { width, height } = viewportRef.current;
    return {
      zoom,
      x: (width - width * zoom) / 2,
      y: (height - height * zoom) / 2,
    };
  }, []);

  const getCameraForRect = useCallback((rect: Rect, maxZoom = MAX_ZOOM): Camera | null => {
    const { width, height } = viewportRef.current;
    if (!width || !height || !rect.w || !rect.h) return null;

    const padding = Math.min(96, Math.max(36, Math.min(width, height) * 0.08));
    const zoom = Math.min(
      maxZoom,
      Math.max(
        MIN_ZOOM,
        Math.min((width - padding * 2) / rect.w, (height - padding * 2) / rect.h)
      )
    );

    return {
      zoom,
      x: width / 2 - (rect.x + rect.w / 2) * zoom,
      y: height / 2 - (rect.y + rect.h / 2) * zoom,
    };
  }, []);

  const focusRect = useCallback((rect: Rect, maxZoom = MAX_ZOOM) => {
    const target = getCameraForRect(rect, maxZoom);
    if (!target) return Promise.resolve();
    return animateCameraTo(target);
  }, [animateCameraTo, getCameraForRect]);

  // ── Compute layout ──
  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const query = search.toLowerCase();
    layoutBoundsRef.current = { x: 0, y: 0, w: W, h: H };

    if (viewLevel === "global") {
      // Filter groups by search
      const filtered = groups
        .map((g) => {
          const repos = query
            ? g.repos.filter((r) => r.fullName.toLowerCase().includes(query))
            : g.repos;
          const filteredTotal = repos.reduce((s, r) => s + getVal(r), 0);
          return { ...g, repos, total: filteredTotal, count: repos.length };
        })
        .filter((g) => g.total > 0)
        .sort((a, b) => b.total - a.total);

      setHasVisibleData(filtered.length > 0);
      setVisibleLanguageCount(filtered.length);

      const gItems: GroupLayoutItem[] = filtered.map((g) => ({
        val: g.total,
        group: g,
      }));
      squarify(gItems, 0, 0, W, H);

      const newGroupRects: GroupRect[] = [];
      const newRects: RepoRect[] = [];

      for (const gi of gItems) {
        if (!gi.rect) continue;
        const g = gi.group;
        const GAP = 1.5;
        const HEADER_H = Math.min(22, Math.max(14, gi.rect.h * 0.06));

        newGroupRects.push({
          ...gi.rect,
          lang: g.lang,
          color: g.color,
          count: g.count,
          total: g.total,
          headerH: HEADER_H,
          allRepos: g.repos,
        });

        const ix = gi.rect.x + GAP;
        const iy = gi.rect.y + HEADER_H + GAP;
        const iw = gi.rect.w - GAP * 2;
        const ih = gi.rect.h - HEADER_H - GAP * 2;

        if (iw > 5 && ih > 5) {
          const TOP_N = Math.min(6, g.repos.length);
          const SMALL_MAX = 30;
          const totalShow = Math.min(g.repos.length, TOP_N + SMALL_MAX);
          const shown: RepoLayoutItem[] = g.repos.slice(0, totalShow).map((r, idx) => ({
            val: getVal(r),
            repo: r,
            origIdx: idx,
          }));

          if (g.repos.length > totalShow) {
            const shownTotal = shown.reduce((s, it) => s + it.val, 0);
            shown.push({
              val: shownTotal * 0.15,
              repo: null,
              origIdx: -1,
            });
          }

          squarify(shown, ix, iy, iw, ih);
          for (let si = 0; si < shown.length; si++) {
            const it = shown[si];
            if (!it.rect) continue;
            const isOthers = it.origIdx === -1;
            newRects.push({
              ...it.rect,
              idx: isOthers ? -1 : it.origIdx,
              groupIdx: newGroupRects.length - 1,
              isOthers,
              othersCount: isOthers ? g.repos.length - totalShow : 0,
            });
          }
        }
      }
      groupRectsRef.current = newGroupRects;
      rectsRef.current = newRects;
      return;
    }

    if (viewLevel === "language" && activeGroup) {
      const repos = query
        ? activeGroup.repos.filter((r) =>
            r.fullName.toLowerCase().includes(query)
          )
        : activeGroup.repos;
      const sorted = [...repos].sort((a, b) => getVal(b) - getVal(a));
      allReposRef.current = sorted;
      setHasVisibleData(sorted.some((repo) => getVal(repo) > 0));

      if (sorted.length === 0) {
        rectsRef.current = [];
        groupRectsRef.current = [];
        return;
      }

      const maxVal = getVal(sorted[0]);
      const minVal = getVal(sorted[sorted.length - 1]);
      const tiers = computeDynamicTiers(minVal, maxVal, sorted, getVal);

      const tierGroups: TierGroup[] = [];
      for (const tier of tiers) {
        const tierRepos = sorted.filter((r) => {
          const v = getVal(r);
          return v >= tier.min && v < tier.max;
        });
        if (tierRepos.length > 0) {
          tierGroups.push({
            label: tier.label,
            repos: tierRepos,
            total: tierRepos.reduce((s, r) => s + getVal(r), 0),
          });
        }
      }

      // Keep the semantic drill-down stable even for smaller languages.
      if (tierGroups.length <= 1 && sorted.length > 1) {
        const targetGroups = Math.min(5, sorted.length);
        const chunkSize = Math.ceil(sorted.length / targetGroups);
        tierGroups.length = 0;

        for (let i = 0; i < sorted.length; i += chunkSize) {
          const chunk = sorted.slice(i, i + chunkSize);
          const hi = getVal(chunk[0]);
          const lo = getVal(chunk[chunk.length - 1]);
          tierGroups.push({
            label: `★ ${fmtK(lo)}–${fmtK(hi)}`,
            repos: chunk,
            total: chunk.reduce((s, r) => s + getVal(r), 0),
          });
        }
      }

      if (tierGroups.length === 0) {
        rectsRef.current = [];
        groupRectsRef.current = [];
        setHasVisibleData(false);
        return;
      }

      const gItems: TierLayoutItem[] = tierGroups.map((g) => ({ val: g.total, group: g }));
      squarify(gItems, 0, 0, W, H);

      const newGroupRects: GroupRect[] = [];
      const newRects: RepoRect[] = [];

      for (const gi of gItems) {
        if (!gi.rect) continue;
        const g = gi.group;
        const color = activeGroup.color;
        const GAP = 1.5;
        const HEADER_H = Math.min(22, Math.max(14, gi.rect.h * 0.06));

        newGroupRects.push({
          ...gi.rect,
          lang: g.label,
          color,
          count: g.repos.length,
          total: g.total,
          headerH: HEADER_H,
          allRepos: g.repos,
        });

        const ix = gi.rect.x + GAP;
        const iy = gi.rect.y + HEADER_H + GAP;
        const iw = gi.rect.w - GAP * 2;
        const ih = gi.rect.h - HEADER_H - GAP * 2;

        if (iw > 5 && ih > 5) {
          const TOP_N = Math.min(6, g.repos.length);
          const SMALL_MAX = 30;
          const totalShow = Math.min(g.repos.length, TOP_N + SMALL_MAX);
          const shown: RepoLayoutItem[] = g.repos.slice(0, totalShow).map((r, idx) => ({
            val: getVal(r),
            repo: r,
            origIdx: idx,
          }));

          if (g.repos.length > totalShow) {
            const shownTotal = shown.reduce((s, it) => s + it.val, 0);
            shown.push({
              val: shownTotal * 0.15,
              repo: null,
              origIdx: -1,
            });
          }

          squarify(shown, ix, iy, iw, ih);
          for (let si = 0; si < shown.length; si++) {
            const it = shown[si];
            if (!it.rect) continue;
            const isOthers = it.origIdx === -1;
            newRects.push({
              ...it.rect,
              idx: isOthers ? -1 : it.origIdx,
              groupIdx: newGroupRects.length - 1,
              isOthers,
              othersCount: isOthers ? g.repos.length - totalShow : 0,
            });
          }
        }
      }

      rectsRef.current = newRects;
      groupRectsRef.current = newGroupRects;
      allReposRef.current = sorted;
      return;
    }

    if (viewLevel === "tier" && activeGroup && activeTierGroup) {
      const repos = query
        ? activeTierGroup.repos.filter((r) =>
            r.fullName.toLowerCase().includes(query)
          )
        : activeTierGroup.repos;
      const sorted = repos
        .filter((repo) => getVal(repo) > 0)
        .sort((a, b) => getVal(b) - getVal(a));

      allReposRef.current = sorted;
      setHasVisibleData(sorted.length > 0);

      if (sorted.length === 0) {
        rectsRef.current = [];
        groupRectsRef.current = [];
        return;
      }

      const HEADER_H = 26;
      const GAP = 1.5;
      const totalValue = sorted.reduce((sum, repo) => sum + getVal(repo), 0);
      const groupRect: GroupRect = {
        x: 0,
        y: 0,
        w: W,
        h: H,
        lang: activeTierGroup.lang,
        color: activeGroup.color,
        count: sorted.length,
        total: totalValue,
        headerH: HEADER_H,
        allRepos: sorted,
      };

      const items: RepoLayoutItem[] = sorted.map((repo, idx) => ({
        val: getVal(repo),
        repo,
        origIdx: idx,
      }));
      squarify(items, GAP, HEADER_H + GAP, W - GAP * 2, H - HEADER_H - GAP * 2);

      rectsRef.current = items
        .filter((item) => item.rect)
        .map((item) => ({
          ...item.rect!,
          idx: item.origIdx,
          groupIdx: 0,
        }));
      groupRectsRef.current = [groupRect];
      return;
    }

    rectsRef.current = [];
    groupRectsRef.current = [];
    setHasVisibleData(false);
  }, [activeGroup, activeTierGroup, getVal, groups, search, viewLevel]);

  // ── Render ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const rects = rectsRef.current;
    const gRects = groupRectsRef.current;
    const hovIdx = hoveredIdxRef.current;
    const hovG = hoveredGroupRef.current;
    const cam = cameraRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, W, H);

    const coarseGrid = 160 * cam.zoom;
    const fineGrid = 40 * cam.zoom;

    if (fineGrid >= 22) {
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      const startX = ((cam.x % fineGrid) + fineGrid) % fineGrid;
      const startY = ((cam.y % fineGrid) + fineGrid) % fineGrid;
      for (let x = startX; x < W; x += fineGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = startY; y < H; y += fineGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(97,218,251,0.04)";
    ctx.lineWidth = 1;
    const coarseStartX = ((cam.x % coarseGrid) + coarseGrid) % coarseGrid;
    const coarseStartY = ((cam.y % coarseGrid) + coarseGrid) % coarseGrid;
    for (let x = coarseStartX; x < W; x += coarseGrid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = coarseStartY; y < H; y += coarseGrid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    if (viewLevel === "global") {
      // Group backgrounds
      for (let gi = 0; gi < gRects.length; gi++) {
        const g = gRects[gi];
        const isHov = gi === hovG;
        const GAP = 1.5;
        ctx.fillStyle = darken(g.color, 0.25);
        ctx.fillRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.h - GAP * 2);
        ctx.strokeStyle = isHov ? g.color : "rgba(255,255,255,0.05)";
        ctx.lineWidth = isHov ? 2.5 : 1;
        ctx.strokeRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.h - GAP * 2);
      }

      // Repo cells
      for (const r of rects) {
        if (r.isOthers || r.idx < 0) {
          const gi = gRects[r.groupIdx!];
          const color = gi?.color || "#888";
          ctx.fillStyle = darken(color, 0.4);
          ctx.fillRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          if (r.w > 40 && r.h > 14) {
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = `400 ${Math.min(11, Math.max(8, r.h * 0.35))}px system-ui`;
            ctx.textBaseline = "middle";
            ctx.fillText(`+${(r.othersCount || 0).toLocaleString()} more`, r.x + 4, r.y + r.h / 2);
          }
          continue;
        }

        const gi = gRects[r.groupIdx!];
        const group = gi;
        const repo = group?.allRepos[r.idx];
        if (!repo) continue;
        const color = group?.color || "#888";
        const isHov = r.idx === hovIdx && r.groupIdx === hovG;

        ctx.fillStyle = isHov ? lighten(color, 0.35) : color;
        ctx.fillRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        if (isHov) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }

        if (r.w > 32 && r.h > 14) {
          const name = repo.fullName.split("/")[1] || repo.fullName;
          const fs = Math.min(20, Math.max(7, Math.min(r.w / (name.length * 0.52), r.h * 0.42)));
          ctx.fillStyle = contrastText(color);
          ctx.font = `700 ${fs}px system-ui`;
          ctx.textBaseline = "middle";
          ctx.save();
          ctx.beginPath();
          ctx.rect(r.x + 2, r.y + 1, r.w - 4, r.h - 2);
          ctx.clip();
          if (r.h > 28 && fs >= 9) {
            ctx.fillText(name, r.x + 4, r.y + r.h * 0.36);
            ctx.font = `400 ${Math.max(7, fs * 0.6)}px system-ui`;
            ctx.globalAlpha = 0.55;
            ctx.fillText(`★ ${fmtK(repo.stars)}`, r.x + 4, r.y + r.h * 0.64);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillText(name, r.x + 3, r.y + r.h / 2);
          }
          ctx.restore();
        }
      }

      // Group headers
      for (let gi = 0; gi < gRects.length; gi++) {
        const g = gRects[gi];
        if (g.w < 50 || g.h < 20) continue;
        const GAP = 1.5;
        const isHov = gi === hovG;
        ctx.fillStyle = darken(g.color, 0.5);
        ctx.fillRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.headerH);
        const fs = Math.min(12, Math.max(8, g.headerH * 0.7));
        ctx.font = `700 ${fs}px system-ui`;
        ctx.fillStyle = isHov ? lighten(g.color, 0.3) : g.color;
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.beginPath();
        ctx.rect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.headerH);
        ctx.clip();
        ctx.fillText(
          `${g.lang}  ${fmtK(g.total)}★  ${g.count.toLocaleString()}`,
          g.x + 6,
          g.y + GAP + g.headerH / 2
        );
        ctx.restore();
      }
    } else {
      // Detail view — same rendering as overview (tier groups + repo cells)
      // Group backgrounds
      for (let gi = 0; gi < gRects.length; gi++) {
        const g = gRects[gi];
        const isHov = gi === hovG;
        const GAP = 1.5;
        // Vary brightness per tier for visual depth
        const tierDarken = 0.2 + gi * 0.03;
        ctx.fillStyle = darken(g.color, tierDarken);
        ctx.fillRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.h - GAP * 2);
        ctx.strokeStyle = isHov ? g.color : "rgba(255,255,255,0.05)";
        ctx.lineWidth = isHov ? 2.5 : 1;
        ctx.strokeRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.h - GAP * 2);
      }

      // Repo cells
      for (const r of rects) {
        if (r.isOthers || r.idx < 0) {
          const gi = gRects[r.groupIdx!];
          const color = gi?.color || "#888";
          ctx.fillStyle = darken(color, 0.4);
          ctx.fillRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          if (r.w > 40 && r.h > 14) {
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = `400 ${Math.min(11, Math.max(8, r.h * 0.35))}px system-ui`;
            ctx.textBaseline = "middle";
            ctx.fillText(`+${(r.othersCount || 0).toLocaleString()} more`, r.x + 4, r.y + r.h / 2);
          }
          continue;
        }

        const gi = gRects[r.groupIdx!];
        const repo = gi?.allRepos[r.idx];
        if (!repo) continue;
        const color = gi?.color || "#888";
        const isHov = r.idx === hovIdx && r.groupIdx === hovG;

        ctx.fillStyle = isHov ? lighten(color, 0.35) : color;
        ctx.fillRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        if (isHov) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }

        if (r.w > 32 && r.h > 14) {
          const name = repo.fullName.split("/")[1] || repo.fullName;
          const fs = Math.min(20, Math.max(7, Math.min(r.w / (name.length * 0.52), r.h * 0.42)));
          ctx.fillStyle = contrastText(color);
          ctx.font = `700 ${fs}px system-ui`;
          ctx.textBaseline = "middle";
          ctx.save();
          ctx.beginPath();
          ctx.rect(r.x + 2, r.y + 1, r.w - 4, r.h - 2);
          ctx.clip();
          if (r.h > 28 && fs >= 9) {
            ctx.fillText(name, r.x + 4, r.y + r.h * 0.36);
            ctx.font = `400 ${Math.max(7, fs * 0.6)}px system-ui`;
            ctx.globalAlpha = 0.55;
            ctx.fillText(`★ ${fmtK(repo.stars)}`, r.x + 4, r.y + r.h * 0.64);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillText(name, r.x + 3, r.y + r.h / 2);
          }
          ctx.restore();
        }
      }

      // Group headers (tier labels)
      for (let gi = 0; gi < gRects.length; gi++) {
        const g = gRects[gi];
        if (g.w < 50 || g.h < 20) continue;
        const GAP = 1.5;
        const isHov = gi === hovG;
        ctx.fillStyle = darken(g.color, 0.5);
        ctx.fillRect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.headerH);
        const fs = Math.min(12, Math.max(8, g.headerH * 0.7));
        ctx.font = `700 ${fs}px system-ui`;
        ctx.fillStyle = isHov ? lighten(g.color, 0.3) : g.color;
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.beginPath();
        ctx.rect(g.x + GAP, g.y + GAP, g.w - GAP * 2, g.headerH);
        ctx.clip();
        ctx.fillText(
          `${g.lang}  ${g.count.toLocaleString()} repos`,
          g.x + 6,
          g.y + GAP + g.headerH / 2
        );
        ctx.restore();
      }
    }

    ctx.restore();

    const vignette = ctx.createLinearGradient(0, 0, 0, H);
    vignette.addColorStop(0, "rgba(0,0,0,0.18)");
    vignette.addColorStop(0.14, "rgba(0,0,0,0)");
    vignette.addColorStop(0.86, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.24)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }, [viewLevel]);

  // ── Resize ──
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = devicePixelRatio || 1;
    viewportRef.current = {
      width: wrap.clientWidth,
      height: wrap.clientHeight,
    };
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + "px";
    canvas.style.height = wrap.clientHeight + "px";
    computeLayout();
    commitCamera(cameraRef.current);
    render();
  }, [commitCamera, computeLayout, render]);

  useEffect(() => {
    resize();
    const handler = () => resize();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resize]);

  useEffect(() => {
    computeLayout();
    commitCamera(cameraRef.current);
    render();
  }, [commitCamera, computeLayout, render]);

  useEffect(() => {
    cameraRef.current = camera;
    render();
  }, [camera, render]);

  useEffect(() => {
    const onWindowMouseMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.active) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        drag.moved = true;
      }

      if (!drag.moved) return;

      commitCamera({
        x: drag.originX + dx,
        y: drag.originY + dy,
        zoom: cameraRef.current.zoom,
      });
    };

    const onWindowMouseUp = () => {
      if (!dragRef.current.active) return;
      suppressClickRef.current = dragRef.current.moved;
      dragRef.current.active = false;
      setIsPanning(false);
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [commitCamera]);

  useEffect(() => {
    return () => stopCameraAnimation();
  }, [stopCameraAnimation]);

  // ── Hit tests ──
  const hitRepo = (mx: number, my: number) => {
    const rects = rectsRef.current;
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (r.isOthers) continue;
      if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i;
    }
    return -1;
  };
  const hitOthers = (mx: number, my: number) => {
    const rects = rectsRef.current;
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (!r.isOthers) continue;
      if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i;
    }
    return -1;
  };
  const hitGroup = (mx: number, my: number) => {
    const g = groupRectsRef.current;
    for (let i = g.length - 1; i >= 0; i--) {
      if (mx >= g[i].x && mx < g[i].x + g[i].w && my >= g[i].y && my < g[i].y + g[i].h) return i;
    }
    return -1;
  };
  const hitHeader = (mx: number, my: number) => {
    const g = groupRectsRef.current;
    for (let i = 0; i < g.length; i++) {
      if (mx >= g[i].x && mx < g[i].x + g[i].w && my >= g[i].y && my < g[i].y + g[i].headerH + 2) return i;
    }
    return -1;
  };

  const getSemanticGroupIndex = useCallback((mx: number, my: number) => {
    const repoHit = hitRepo(mx, my);
    if (repoHit >= 0) return rectsRef.current[repoHit].groupIdx ?? -1;

    const othersHit = hitOthers(mx, my);
    if (othersHit >= 0) return rectsRef.current[othersHit].groupIdx ?? -1;

    const headerHit = hitHeader(mx, my);
    if (headerHit >= 0) return headerHit;

    return hitGroup(mx, my);
  }, []);

  const enterNextSemanticLevel = useCallback(async (mx: number, my: number) => {
    if (semanticTransitionRef.current) return false;

    const groupIndex = getSemanticGroupIndex(mx, my);
    if (groupIndex < 0) return false;

    const group = groupRectsRef.current[groupIndex];
    if (!group) return false;

    semanticTransitionRef.current = true;
    clearSemanticWheelIntent();
    resetHoverState();

    try {
      const focusedCamera = getCameraForRect(group, MAX_ZOOM);
      if (focusedCamera) {
        await animateCameraTo(focusedCamera, 240);
      }

      if (viewLevel === "global") {
        setFocusLang(group.lang);
        setFocusTier(null);
      } else if (viewLevel === "language") {
        setFocusTier({
          label: group.lang,
          repos: group.allRepos,
        });
      } else {
        return false;
      }

      await waitForNextPaint();
      commitCamera(getCenteredCamera(), { clamp: false });
      await waitForNextPaint();
      await animateCameraTo(DEFAULT_CAMERA, 220);
      return true;
    } finally {
      semanticTransitionRef.current = false;
    }
  }, [
    animateCameraTo,
    clearSemanticWheelIntent,
    commitCamera,
    getCameraForRect,
    getCenteredCamera,
    getSemanticGroupIndex,
    resetHoverState,
    viewLevel,
    waitForNextPaint,
  ]);

  const exitFocusLevel = useCallback(async () => {
    if (semanticTransitionRef.current) return false;

    const previousLang = focusLang;
    const previousTier = focusTier;
    if (!previousLang && !previousTier) return false;

    semanticTransitionRef.current = true;
    clearSemanticWheelIntent();
    resetHoverState();

    try {
      if (previousTier) {
        setFocusTier(null);
        await waitForNextPaint();

        const parentTierRect =
          groupRectsRef.current.find((group) => group.lang === previousTier.label) ?? null;
        const focusedCamera = parentTierRect ? getCameraForRect(parentTierRect, MAX_ZOOM) : null;

        if (focusedCamera) {
          commitCamera(focusedCamera, { clamp: false });
          await waitForNextPaint();
        }

        await animateCameraTo(DEFAULT_CAMERA, 220);
        return true;
      }

      if (previousLang) {
        setFocusLang(null);
        setFocusTier(null);
        await waitForNextPaint();

        const parentLangRect =
          groupRectsRef.current.find(
            (group) => group.lang.toLowerCase() === previousLang.toLowerCase()
          ) ?? null;
        const focusedCamera = parentLangRect ? getCameraForRect(parentLangRect, MAX_ZOOM) : null;

        if (focusedCamera) {
          commitCamera(focusedCamera, { clamp: false });
          await waitForNextPaint();
        }

        await animateCameraTo(DEFAULT_CAMERA, 240);
        return true;
      }

      return false;
    } finally {
      semanticTransitionRef.current = false;
    }
  }, [
    animateCameraTo,
    clearSemanticWheelIntent,
    commitCamera,
    focusLang,
    focusTier,
    getCameraForRect,
    resetHoverState,
    waitForNextPaint,
  ]);

  const shouldTriggerSemanticStep = useCallback((
    direction: "in" | "out",
    deltaAmount: number
  ) => {
    if (semanticWheelRef.current.direction !== direction) {
      semanticWheelRef.current.direction = direction;
      semanticWheelRef.current.amount = 0;
    }

    semanticWheelRef.current.amount += deltaAmount;
    return semanticWheelRef.current.amount >= SEMANTIC_WHEEL_THRESHOLD;
  }, []);

  const handleMetricChange = useCallback((nextMetric: Metric) => {
    setMetric(nextMetric);
    setFocusTier(null);
    clearSemanticWheelIntent();
    cameraRef.current = DEFAULT_CAMERA;
    setCamera(DEFAULT_CAMERA);
    resetHoverState();
  }, [clearSemanticWheelIntent, resetHoverState]);

  // ── Mouse events ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (semanticTransitionRef.current) return;
    stopCameraAnimation();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: cameraRef.current.x,
      originY: cameraRef.current.y,
      moved: false,
    };
    hoveredIdxRef.current = -1;
    hoveredGroupRef.current = -1;
    tooltipRef.current?.hide();
    panelRef.current?.hide();
    setIsPanning(true);
    render();
  }, [render, stopCameraAnimation]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (semanticTransitionRef.current) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    const world = screenToWorld(point.x, point.y);
    const currentZoom = cameraRef.current.zoom;
    const zoomFactor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
    const nextZoom = currentZoom * zoomFactor;
    const absDelta = Math.min(Math.abs(e.deltaY), SEMANTIC_WHEEL_THRESHOLD);

    if (e.deltaY < 0) {
      if (currentZoom < MAX_ZOOM - 0.01) {
        clearSemanticWheelIntent();
        zoomAtPoint(point.x, point.y, nextZoom);
        return;
      }

      if (shouldTriggerSemanticStep("in", absDelta)) {
        clearSemanticWheelIntent();
        void enterNextSemanticLevel(world.x, world.y);
      }
      return;
    }

    if (currentZoom > MIN_ZOOM + 0.01) {
      clearSemanticWheelIntent();
      zoomAtPoint(point.x, point.y, nextZoom);
      return;
    }

    if (shouldTriggerSemanticStep("out", absDelta)) {
      clearSemanticWheelIntent();
      void exitFocusLevel();
    }
  }, [
    clearSemanticWheelIntent,
    enterNextSemanticLevel,
    exitFocusLevel,
    getCanvasPoint,
    screenToWorld,
    shouldTriggerSemanticStep,
    zoomAtPoint,
  ]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (semanticTransitionRef.current) return;
      if (dragRef.current.active) return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (!point) return;
      const { x: mx, y: my } = screenToWorld(point.x, point.y);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const gRects = groupRectsRef.current;
      const semanticCursor = viewLevel === "tier" ? "default" : "zoom-in";

      let needRender = false;

      const repoHit = hitRepo(mx, my);
      if (repoHit >= 0) {
        const r = rectsRef.current[repoHit];
        const gi = gRects[r.groupIdx ?? 0];
        const repo = gi?.allRepos[r.idx];
        if (hoveredIdxRef.current !== r.idx || hoveredGroupRef.current !== (r.groupIdx ?? 0)) {
          hoveredIdxRef.current = r.idx;
          hoveredGroupRef.current = r.groupIdx ?? 0;
          needRender = true;
        }
        if (repo) {
          tooltipRef.current?.show(
            e.clientX,
            e.clientY,
            repo,
            activeGroup?.lang ?? gi.lang,
            activeGroup?.color ?? gi.color
          );
        }
        panelRef.current?.hide();
        canvas.style.cursor = viewLevel === "tier" ? "pointer" : semanticCursor;
      } else {
        if (hoveredIdxRef.current !== -1) { hoveredIdxRef.current = -1; needRender = true; }
        tooltipRef.current?.hide();
        const oHit = hitOthers(mx, my);
        if (oHit >= 0) {
          const r = rectsRef.current[oHit];
          const gi = gRects[r.groupIdx!];
          if (hoveredGroupRef.current !== r.groupIdx!) { hoveredGroupRef.current = r.groupIdx!; needRender = true; }
          const TOP_N = 6, SMALL_MAX = 30;
          const skipCount = Math.min(gi.allRepos.length, TOP_N + SMALL_MAX);
          const hidden = gi.allRepos.slice(skipCount);
          panelRef.current?.show(e.clientX, e.clientY, {
            title: `${gi.lang} — more repos`,
            subtitle: `${hidden.length.toLocaleString()} repos not shown`,
            color: gi.color,
            repos: hidden,
            startRank: skipCount + 1,
          });
          canvas.style.cursor = semanticCursor;
        } else {
          const semanticGroup = getSemanticGroupIndex(mx, my);
          if (hoveredGroupRef.current !== semanticGroup) { hoveredGroupRef.current = semanticGroup; needRender = true; }
          panelRef.current?.hide();
          canvas.style.cursor = semanticGroup >= 0 ? semanticCursor : "default";
        }
      }

      if (needRender) render();
    },
    [activeGroup, getCanvasPoint, getSemanticGroupIndex, render, screenToWorld, viewLevel]
  );

  const onMouseLeave = useCallback(() => {
    if (semanticTransitionRef.current) return;
    if (dragRef.current.active) return;
    hoveredIdxRef.current = -1;
    hoveredGroupRef.current = -1;
    tooltipRef.current?.hide();
    panelRef.current?.hide();
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
    render();
  }, [render]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (semanticTransitionRef.current) return;
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }

      const point = getCanvasPoint(e.clientX, e.clientY);
      if (!point) return;
      const { x: mx, y: my } = screenToWorld(point.x, point.y);

      if (viewLevel === "tier") {
        const hit = hitRepo(mx, my);
        if (hit >= 0) {
          const r = rectsRef.current[hit];
          const gi = groupRectsRef.current[r.groupIdx ?? 0];
          const repo = gi?.allRepos[r.idx];
          if (repo) window.open(`https://github.com/${repo.fullName}`, "_blank");
        }
        return;
      }

      void enterNextSemanticLevel(mx, my);
    },
    [enterNextSemanticLevel, getCanvasPoint, screenToWorld, viewLevel]
  );

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if (semanticTransitionRef.current) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    const { x: mx, y: my } = screenToWorld(point.x, point.y);

    const semanticGroup = getSemanticGroupIndex(mx, my);
    if (viewLevel !== "tier" && semanticGroup >= 0) {
      void enterNextSemanticLevel(mx, my);
      return;
    }

    const repoHit = hitRepo(mx, my);
    if (repoHit >= 0) {
      focusRect(rectsRef.current[repoHit], MAX_ZOOM);
      return;
    }

    const othersHit = hitOthers(mx, my);
    if (othersHit >= 0) {
      focusRect(rectsRef.current[othersHit], MAX_ZOOM);
      return;
    }

    if (semanticGroup >= 0) {
      void focusRect(groupRectsRef.current[semanticGroup], MAX_ZOOM);
      return;
    }

    zoomAtPoint(point.x, point.y, cameraRef.current.zoom * DOUBLE_CLICK_ZOOM_FACTOR, 180);
  }, [enterNextSemanticLevel, focusRect, getCanvasPoint, getSemanticGroupIndex, screenToWorld, viewLevel, zoomAtPoint]);

  const breadcrumb =
    viewLevel === "global"
      ? [{ label: "All Languages" }]
      : viewLevel === "language" && activeGroup
        ? [
            { label: "All Languages", href: "/" },
            { label: activeGroup.lang, color: activeGroup.color },
          ]
        : activeGroup && activeTierGroup
          ? [
              { label: "All Languages", href: "/" },
              { label: activeGroup.lang, href: `/${encodeURIComponent(activeGroup.lang.toLowerCase())}`, color: activeGroup.color },
              { label: activeTierGroup.lang },
            ]
          : [{ label: "All Languages" }];

  const info =
    viewLevel === "global"
      ? `${total.toLocaleString()} repos · ${visibleLanguageCount} languages`
      : viewLevel === "language" && activeGroup
        ? `${activeGroup.repos.length.toLocaleString()} ${activeGroup.lang} repos`
        : activeTierGroup
          ? `${activeTierGroup.count.toLocaleString()} repos · ${activeTierGroup.lang}`
          : `${total.toLocaleString()} repos`;

  const emptyMessage = search
    ? `No repositories match "${search}"`
    : metric === "growth"
      ? "No positive 30d growth data in the current dataset"
      : "No repositories available for this view";
  const hasCustomCamera =
    Math.abs(camera.x) > 1 || Math.abs(camera.y) > 1 || Math.abs(camera.zoom - 1) > 0.01;

  return (
    <>
      <Header
        breadcrumb={breadcrumb}
        metric={metric}
        onMetricChange={handleMetricChange}
        search={search}
        onSearchChange={setSearch}
        info={info}
      />
      <div ref={wrapRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          className="block w-full h-full touch-none"
          style={{ cursor: isPanning ? "grabbing" : undefined }}
        />
        {!hasVisibleData && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
            <div className="max-w-md rounded-2xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md">
              <div className="text-base font-semibold text-white">{emptyMessage}</div>
              <div className="mt-1 text-sm text-neutral-400">
                {metric === "growth"
                  ? "Try Stars or Forks, or refresh the dataset with real 30d growth values."
                  : "Try a different metric or search keyword."}
              </div>
            </div>
          </div>
        )}
        <div className="absolute left-5 bottom-5 pointer-events-none">
          <div className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/75">Atlas Mode</div>
            <div className="mt-2 text-sm text-white/90">
              Scroll in to drill down, scroll out to step back, drag to pan.
            </div>
          </div>
        </div>
        <div className="absolute right-5 bottom-5 flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/80 shadow-xl backdrop-blur-xl">
            Zoom {Math.round(camera.zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => animateCameraTo(DEFAULT_CAMERA)}
            disabled={!hasCustomCamera}
            className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-xl transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset View
          </button>
        </div>
      </div>
      <Panel ref={panelRef} />
      <Tooltip ref={tooltipRef} />
    </>
  );
}
