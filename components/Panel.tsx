"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import type { Repo } from "@/lib/types";
import { fmtK } from "@/lib/colors";

interface PanelProps {
  title: string;
  subtitle: string;
  color: string;
  repos: Repo[];
  startRank: number;
}

export interface PanelHandle {
  show: (x: number, y: number, props: PanelProps) => void;
  hide: () => void;
}

export const Panel = forwardRef<PanelHandle>(function Panel(_, ref) {
  const elRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show(x: number, y: number, props: PanelProps) {
      const el = elRef.current;
      if (!el) return;

      el.querySelector<HTMLDivElement>(".p-dot")!.style.background = props.color;
      el.querySelector<HTMLDivElement>(".p-title")!.textContent = props.title;
      el.querySelector<HTMLDivElement>(".p-meta")!.textContent = props.subtitle;

      const list = el.querySelector<HTMLDivElement>(".p-list")!;
      list.innerHTML = props.repos
        .slice(0, 30)
        .map((repo, i) => {
          const [owner, name] = repo.fullName.split("/");
          const growth = repo.growth > 0 ? `+${fmtK(repo.growth)}` : "—";
          const gc = repo.growth > 0 ? "text-green-400" : "text-neutral-600";
          return `<a href="https://github.com/${repo.fullName}" target="_blank"
            class="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/5 cursor-pointer text-sm">
            <span class="text-xs text-neutral-600 w-5 text-right shrink-0">${props.startRank + i}</span>
            <span class="font-semibold truncate flex-1">${name}</span>
            <span class="text-xs text-neutral-500 truncate max-w-20 shrink-0">${owner}</span>
            <span class="text-xs text-neutral-500 w-14 text-right shrink-0">★ ${fmtK(repo.stars)}</span>
            <span class="text-xs w-14 text-right shrink-0 ${gc}">${growth}</span>
          </a>`;
        })
        .join("");

      el.style.display = "block";
      let px = x + 20,
        py = y - 100;
      if (px + 380 > window.innerWidth) px = x - 400;
      if (py < 10) py = 10;
      const h = el.offsetHeight;
      if (py + h > window.innerHeight - 10) py = window.innerHeight - h - 10;
      el.style.left = px + "px";
      el.style.top = py + "px";
    },
    hide() {
      if (elRef.current) elRef.current.style.display = "none";
    },
  }));

  return (
    <div
      ref={elRef}
      className="fixed z-50 hidden w-[380px] max-h-[70vh] bg-[rgba(12,12,12,0.96)] border border-white/10 rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="p-dot w-3 h-3 rounded-sm shrink-0" />
        <div className="p-title font-bold text-sm" />
        <div className="p-meta text-xs text-neutral-500 ml-auto" />
      </div>
      <div className="p-list overflow-y-auto max-h-[calc(70vh-50px)]" />
      <div className="text-xs text-neutral-600 text-center py-2 border-t border-white/5">
        Click repo to open GitHub
      </div>
    </div>
  );
});
