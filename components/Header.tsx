"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Metric } from "@/lib/types";

export interface HeaderBreadcrumbItem {
  label: string;
  href?: string;
  color?: string;
}

interface HeaderProps {
  breadcrumb?: HeaderBreadcrumbItem[];
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  search: string;
  onSearchChange: (v: string) => void;
  info: string;
  metrics?: { key: Metric; label: string }[];
}

const DEFAULT_METRICS: { key: Metric; label: string }[] = [
  { key: "stars", label: "Stars" },
  { key: "growth", label: "30d Growth" },
  { key: "forks", label: "Forks" },
];

const GLOBAL_TABS = [
  { href: "/", label: "Projects" },
  { href: "/daily-trading", label: "Daily" },
  { href: "/awesome", label: "Awesome" },
];

const SOURCE_REPO_URL = "https://github.com/xiaoxiunique/1k-github-stars";

export function Header({
  breadcrumb,
  metric,
  onMetricChange,
  search,
  onSearchChange,
  info,
  metrics = DEFAULT_METRICS,
}: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-3 px-5 py-2.5 bg-[#151515] border-b border-[#252525] shrink-0 z-10">
      <h1 className="text-[15px] font-bold whitespace-nowrap">
        GitHub <span className="text-[#61dafb]">Treemap</span>
      </h1>

      <div className="flex gap-1">
        {GLOBAL_TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1 rounded text-xs border transition-all ${
                active
                  ? "bg-[#61dafb] text-black border-[#61dafb]"
                  : "border-[#252525] text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <a
        href={SOURCE_REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1 rounded text-xs border border-[#252525] text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 transition-all"
      >
        GitHub
      </a>

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

      {metrics.length > 0 && (
        <div className="flex gap-1 ml-3">
          {metrics.map((m) => (
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
      )}

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
