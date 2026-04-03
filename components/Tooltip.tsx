"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import type { Repo } from "@/lib/types";
import { fmtK } from "@/lib/colors";

export interface TooltipHandle {
  show: (
    x: number,
    y: number,
    repo: Repo,
    langName: string,
    langColor: string,
    options?: { metaLoading?: boolean }
  ) => void;
  hide: () => void;
}

function formatDate(value?: string, loading = false) {
  if (!value) return loading ? "Loading..." : "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return loading ? "Loading..." : "—";
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const Tooltip = forwardRef<TooltipHandle>(function Tooltip(_, ref) {
  const elRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show(x, y, repo, langName, langColor, options) {
      const el = elRef.current;
      if (!el) return;
      const [owner, name] = repo.fullName.split("/");
      const growth =
        repo.growth > 0
          ? `<span class="text-green-400">+${fmtK(repo.growth)}</span>`
          : "—";
      const createdAt = formatDate(repo.createdAt, options?.metaLoading);
      const updatedAt = formatDate(repo.updatedAt, options?.metaLoading);
      const safeName = escapeHtml(name);
      const safeOwner = escapeHtml(owner);
      const safeLangName = escapeHtml(langName);
      const safeDescription = repo.description ? escapeHtml(repo.description) : "";
      const safeCreatedAt = escapeHtml(createdAt);
      const safeUpdatedAt = escapeHtml(updatedAt);

      el.innerHTML = `
        <div class="font-bold text-[15px] mb-0.5">${safeName}</div>
        <div class="text-xs text-neutral-500 mb-1.5">${safeOwner}</div>
        ${safeDescription ? `<div class="text-xs text-neutral-400 leading-relaxed mb-2">${safeDescription}</div>` : ""}
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${langColor}"></span>${safeLangName}</span>
          <span>★ ${fmtK(repo.stars)}</span>
          <span>⑂ ${fmtK(repo.forks)}</span>
          <span>Growth: ${growth}</span>
        </div>
        <div class="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-neutral-400">
          <span class="text-neutral-500">Created</span>
          <span>${safeCreatedAt}</span>
          <span class="text-neutral-500">Updated</span>
          <span>${safeUpdatedAt}</span>
        </div>`;

      el.style.display = "block";
      let tx = x + 16,
        ty = y + 16;
      if (tx + 380 > window.innerWidth) tx = x - 390;
      const height = el.offsetHeight || 180;
      if (ty + height > window.innerHeight) ty = y - height - 16;
      el.style.left = tx + "px";
      el.style.top = ty + "px";
    },
    hide() {
      if (elRef.current) elRef.current.style.display = "none";
    },
  }));

  return (
    <div
      ref={elRef}
      className="fixed z-50 hidden pointer-events-none max-w-[380px] bg-[rgba(10,10,10,0.92)] border border-white/10 rounded-xl px-4 py-3 backdrop-blur-2xl shadow-2xl"
    />
  );
});
