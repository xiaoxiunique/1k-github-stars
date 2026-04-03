"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import type { Repo } from "@/lib/types";
import { fmtK } from "@/lib/colors";

export interface TooltipHandle {
  show: (x: number, y: number, repo: Repo, langName: string, langColor: string) => void;
  hide: () => void;
}

export const Tooltip = forwardRef<TooltipHandle>(function Tooltip(_, ref) {
  const elRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show(x, y, repo, langName, langColor) {
      const el = elRef.current;
      if (!el) return;
      const [owner, name] = repo.fullName.split("/");
      const growth =
        repo.growth > 0
          ? `<span class="text-green-400">+${fmtK(repo.growth)}</span>`
          : "—";

      el.innerHTML = `
        <div class="font-bold text-[15px] mb-0.5">${name}</div>
        <div class="text-xs text-neutral-500 mb-1.5">${owner}</div>
        ${repo.description ? `<div class="text-xs text-neutral-400 leading-relaxed mb-2">${repo.description}</div>` : ""}
        <div class="flex gap-3 text-xs">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${langColor}"></span>${langName}</span>
          <span>★ ${fmtK(repo.stars)}</span>
          <span>⑂ ${fmtK(repo.forks)}</span>
          <span>30d: ${growth}</span>
        </div>`;

      el.style.display = "block";
      let tx = x + 16,
        ty = y + 16;
      if (tx + 380 > window.innerWidth) tx = x - 390;
      if (ty + 120 > window.innerHeight) ty = y - 130;
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
