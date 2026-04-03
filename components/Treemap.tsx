"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  mode: "overview" | "detail";
  groups?: GroupData[];
  detailGroup?: GroupData;
  total: number;
  tierLabel?: string;
  tierSlug?: string;
}

export function Treemap({ mode, groups, detailGroup, total, tierLabel, tierSlug }: TreemapProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<PanelHandle>(null);
  const tooltipRef = useRef<TooltipHandle>(null);

  const [metric, setMetric] = useState<Metric>("stars");
  const [search, setSearch] = useState("");
  const [hasVisibleData, setHasVisibleData] = useState(true);

  const rectsRef = useRef<RepoRect[]>([]);
  const groupRectsRef = useRef<GroupRect[]>([]);
  const hoveredIdxRef = useRef(-1);
  const hoveredGroupRef = useRef(-1);
  const allReposRef = useRef<Repo[]>([]); // for detail panel

  const getVal = useCallback(
    (r: Repo) => getRepoValue(r, metric),
    [metric]
  );

  // ── Compute layout ──
  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const query = search.toLowerCase();

    if (mode === "overview" && groups) {
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
    } else if (mode === "detail" && detailGroup) {
      const repos = query
        ? detailGroup.repos.filter((r) =>
            r.fullName.toLowerCase().includes(query)
          )
        : detailGroup.repos;
      const sorted = [...repos].sort((a, b) => getVal(b) - getVal(a));
      allReposRef.current = sorted;
      setHasVisibleData(sorted.some((repo) => getVal(repo) > 0));

      // If few enough repos, show flat (no grouping needed)
      const MAX_FLAT = 36;
      if (sorted.length <= MAX_FLAT) {
        // Flat layout — all repos as individual cells
        const shown: RepoLayoutItem[] = sorted.map((r, idx) => ({ val: getVal(r), repo: r, origIdx: idx }));
        squarify(shown, 0, 0, W, H);
        const newRects: RepoRect[] = [];
        for (const it of shown) {
          if (it.rect) newRects.push({ ...it.rect, idx: it.origIdx });
        }
        rectsRef.current = newRects;
        groupRectsRef.current = [];
      } else {
        // Dynamic tier grouping based on actual data range
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
            tierGroups.push({ label: tier.label, repos: tierRepos, total: tierRepos.reduce((s, r) => s + getVal(r), 0) });
          }
        }

        // If only 1 tier resulted (all repos in same range), bump up granularity
        if (tierGroups.length <= 1 && sorted.length > MAX_FLAT) {
          // Force split into ~5 equal-count groups
          const chunkSize = Math.ceil(sorted.length / 5);
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

      // Layout tier groups like overview groups
      const gItems: TierLayoutItem[] = tierGroups.map((g) => ({ val: g.total, group: g }));
      squarify(gItems, 0, 0, W, H);

      const newGroupRects: GroupRect[] = [];
      const newRects: RepoRect[] = [];

      for (const gi of gItems) {
        if (!gi.rect) continue;
        const g = gi.group;
        const color = detailGroup.color;
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
      } // end else (grouped layout)
      allReposRef.current = sorted;
    }
  }, [mode, groups, detailGroup, metric, search, getVal]);

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

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, W, H);

    if (mode === "overview") {
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
  }, [mode, detailGroup]);

  // ── Resize ──
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + "px";
    canvas.style.height = wrap.clientHeight + "px";
    computeLayout();
    render();
  }, [computeLayout, render]);

  useEffect(() => {
    resize();
    const handler = () => resize();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resize]);

  useEffect(() => {
    computeLayout();
    render();
  }, [computeLayout, render]);

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

  // ── Mouse events ──
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const gRects = groupRectsRef.current;

      let needRender = false;

      if (mode === "detail") {
        // Detail view uses same group-based layout now
        const repoHit = hitRepo(mx, my);
        if (repoHit >= 0) {
          const r = rectsRef.current[repoHit];
          const gi = gRects[r.groupIdx!];
          const repo = gi?.allRepos[r.idx];
          if (hoveredIdxRef.current !== r.idx || hoveredGroupRef.current !== r.groupIdx!) {
            hoveredIdxRef.current = r.idx;
            hoveredGroupRef.current = r.groupIdx!;
            needRender = true;
          }
          if (repo) tooltipRef.current?.show(e.clientX, e.clientY, repo, detailGroup!.lang, detailGroup!.color);
          panelRef.current?.hide();
          canvas.style.cursor = "pointer";
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
            canvas.style.cursor = "pointer";
          } else {
            if (hoveredGroupRef.current !== -1) { hoveredGroupRef.current = -1; needRender = true; }
            panelRef.current?.hide();
            canvas.style.cursor = "default";
          }
        }
      } else {
        const hdrHit = hitHeader(mx, my);
        const repoHit = hdrHit < 0 ? hitRepo(mx, my) : -1;

        if (repoHit >= 0) {
          const r = rectsRef.current[repoHit];
          const gi = gRects[r.groupIdx!];
          const repo = gi?.allRepos[r.idx];
          if (hoveredIdxRef.current !== r.idx || hoveredGroupRef.current !== r.groupIdx!) {
            hoveredIdxRef.current = r.idx;
            hoveredGroupRef.current = r.groupIdx!;
            needRender = true;
          }
          if (repo) tooltipRef.current?.show(e.clientX, e.clientY, repo, gi.lang, gi.color);
          panelRef.current?.hide();
          canvas.style.cursor = "pointer";
        } else if (hdrHit >= 0) {
          if (hoveredIdxRef.current !== -1) { hoveredIdxRef.current = -1; needRender = true; }
          if (hoveredGroupRef.current !== hdrHit) { hoveredGroupRef.current = hdrHit; needRender = true; }
          tooltipRef.current?.hide();
          panelRef.current?.hide();
          canvas.style.cursor = "pointer";
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
            canvas.style.cursor = "pointer";
          } else {
            if (hoveredGroupRef.current !== -1) { hoveredGroupRef.current = -1; needRender = true; }
            panelRef.current?.hide();
            canvas.style.cursor = "default";
          }
        }
      }

      if (needRender) render();
    },
    [mode, detailGroup, render]
  );

  const onMouseLeave = useCallback(() => {
    hoveredIdxRef.current = -1;
    hoveredGroupRef.current = -1;
    tooltipRef.current?.hide();
    panelRef.current?.hide();
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
    render();
  }, [render]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mode === "detail") {
        // Header click → navigate to sub-tier
        const hdrHit = hitHeader(mx, my);
        if (hdrHit >= 0) {
          const g = groupRectsRef.current[hdrHit];
          // g.lang is the tier label like "★ 5k–10k", extract slug from allRepos range
          if (g.allRepos.length > 36) {
            const maxVal = Math.max(...g.allRepos.map(r => r.stars));
            const minVal = Math.min(...g.allRepos.map(r => r.stars));
            const slug = `${minVal}-${maxVal + 1}`;
            router.push(`/${encodeURIComponent(detailGroup!.lang.toLowerCase())}/${slug}`);
          }
          return;
        }
        // Repo click → open GitHub
        const hit = hitRepo(mx, my);
        if (hit >= 0) {
          const r = rectsRef.current[hit];
          const gi = groupRectsRef.current[r.groupIdx!];
          const repo = gi?.allRepos[r.idx];
          if (repo) window.open(`https://github.com/${repo.fullName}`, "_blank");
          return;
        }
        // "More" click → navigate to sub-tier
        const oHit = hitOthers(mx, my);
        if (oHit >= 0) {
          const r = rectsRef.current[oHit];
          const gi = groupRectsRef.current[r.groupIdx!];
          if (gi.allRepos.length > 36) {
            const maxVal = Math.max(...gi.allRepos.map(r => r.stars));
            const minVal = Math.min(...gi.allRepos.map(r => r.stars));
            const slug = `${minVal}-${maxVal + 1}`;
            router.push(`/${encodeURIComponent(detailGroup!.lang.toLowerCase())}/${slug}`);
          }
        }
      } else {
        const hdrHit = hitHeader(mx, my);
        if (hdrHit >= 0) {
          const g = groupRectsRef.current[hdrHit];
          router.push(`/${encodeURIComponent(g.lang.toLowerCase())}`);
          return;
        }
        const repoHit = hitRepo(mx, my);
        if (repoHit >= 0) {
          const r = rectsRef.current[repoHit];
          const gi = groupRectsRef.current[r.groupIdx!];
          const repo = gi?.allRepos[r.idx];
          if (repo) window.open(`https://github.com/${repo.fullName}`, "_blank");
          return;
        }
        const gh = hitGroup(mx, my);
        if (gh >= 0) {
          const g = groupRectsRef.current[gh];
          router.push(`/${encodeURIComponent(g.lang.toLowerCase())}`);
        }
      }
    },
    [mode, router]
  );

  const breadcrumb =
    mode === "overview"
      ? [{ label: "All Languages" }]
      : tierLabel
        ? [
            { label: "All Languages", href: "/" },
            { label: detailGroup!.lang, href: `/${encodeURIComponent(detailGroup!.lang.toLowerCase())}`, color: detailGroup!.color },
            { label: tierLabel },
          ]
        : [
            { label: "All Languages", href: "/" },
            { label: detailGroup!.lang, color: detailGroup!.color },
          ];

  const info =
    mode === "overview"
      ? `${total.toLocaleString()} repos · ${groupRectsRef.current.length || groups?.length || 0} languages`
      : `${detailGroup!.repos.length.toLocaleString()} ${detailGroup!.lang} repos`;

  const emptyMessage = search
    ? `No repositories match "${search}"`
    : metric === "growth"
      ? "No positive 30d growth data in the current dataset"
      : "No repositories available for this view";

  return (
    <>
      <Header
        breadcrumb={breadcrumb}
        metric={metric}
        onMetricChange={setMetric}
        search={search}
        onSearchChange={setSearch}
        info={info}
      />
      <div ref={wrapRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
          className="block w-full h-full"
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
      </div>
      <Panel ref={panelRef} />
      <Tooltip ref={tooltipRef} />
    </>
  );
}
