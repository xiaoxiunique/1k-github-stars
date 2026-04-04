import type { Metadata } from "next";
import { Treemap } from "@/components/Treemap";
import {
  DAILY_TRENDING_MIN_BASELINE_STARS,
  DAILY_TRENDING_MIN_REPO_AGE_DAYS,
  getDailyTrendingData,
  getExportedAt,
} from "@/lib/data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Daily Trending",
  description: "A treemap view of repo momentum ranked by daily star growth, excluding very new or low-baseline projects.",
  alternates: {
    canonical: "/daily-trading",
  },
  openGraph: {
    title: `Daily Trending · ${SITE_NAME}`,
    description:
      "A treemap view of repo momentum ranked by daily star growth, excluding very new or low-baseline projects.",
    url: `${SITE_URL}/daily-trading`,
  },
  twitter: {
    title: `Daily Trending · ${SITE_NAME}`,
    description:
      "A treemap view of repo momentum ranked by daily star growth, excluding very new or low-baseline projects.",
  },
};

function formatExportedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatBaseThreshold(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return Number.isInteger(compact) ? `${compact}k` : `${compact.toFixed(1)}k`;
  }
  return String(value);
}

export default function DailyTradingPage() {
  const { groups, eligibleRepoCount, positiveGrowthRepoCount } = getDailyTrendingData();
  const exportedAt = getExportedAt();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0c0c0c] text-white">
      <Treemap
        mode="overview"
        groups={groups}
        total={positiveGrowthRepoCount}
        initialMetric="growth"
        availableMetrics={[]}
        fallbackMetric="stars"
        breadcrumbOverride={[
          { label: "All Languages", href: "/" },
          { label: "Daily Trending", color: "#61dafb" },
        ]}
        infoOverride={`${formatExportedAt(exportedAt)} UTC · ${positiveGrowthRepoCount.toLocaleString()} growing repos · ${eligibleRepoCount.toLocaleString()} eligible · ${DAILY_TRENDING_MIN_REPO_AGE_DAYS}d+ old · ${formatBaseThreshold(DAILY_TRENDING_MIN_BASELINE_STARS)}+ base`}
        fallbackNotice={{
          title: "No eligible growth rows in the current dataset",
          detail:
            `This view only includes repos that are at least ${DAILY_TRENDING_MIN_REPO_AGE_DAYS} days old and had at least ${formatBaseThreshold(DAILY_TRENDING_MIN_BASELINE_STARS)} stars before the current growth window. It falls back to stars for the same eligible pool.`,
        }}
      />
    </main>
  );
}
