"use client";

import Link from "next/link";
import type { Metric } from "@/lib/types";

interface HeaderProps {
  breadcrumb?: { label: string; href?: string; color?: string }[];
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  search: string;
  onSearchChange: (v: string) => void;
  info: string;
}

const METRICS: { key: Metric; label: string }[] = [
  { key: "stars", label: "Stars" },
  { key: "growth", label: "30d Growth" },
  { key: "forks", label: "Forks" },
];

export function Header({
  breadcrumb,
  metric,
  onMetricChange,
  search,
  onSearchChange,
  info,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-5 py-2.5 bg-[#151515] border-b border-[#252525] shrink-0 z-10">
      <h1 className="text-[15px] font-bold whitespace-nowrap">
        GitHub <span className="text-[#61dafb]">Treemap</span>
      </h1>

      <nav className="flex items-center gap-1 text-sm text-neutral-500">
        {breadcrumb?.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-40 mx-0.5">›</span>}
            {b.href ? (
              <Link href={b.href} className="text-[#61dafb] hover:underline">
                {b.label}
              </Link>
            ) : (
              <span style={b.color ? { color: b.color, fontWeight: 600 } : undefined}>
                {b.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex gap-1 ml-3">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => onMetricChange(m.key)}
            className={`px-3 py-1 rounded text-xs border transition-all cursor-pointer ${
              metric === m.key
                ? "bg-white text-black border-white"
                : "border-[#252525] text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        className="ml-auto px-2.5 py-1 rounded text-xs border border-[#252525] bg-[#0c0c0c] text-neutral-200 outline-none w-44 focus:border-neutral-600"
      />

      <span className="text-xs text-neutral-500 whitespace-nowrap">{info}</span>
    </header>
  );
}
