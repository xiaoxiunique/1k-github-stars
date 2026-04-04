import type { Metadata } from "next";
import { Treemap } from "@/components/Treemap";
import { getCuratedGroups, getCuratedTotal, getExportedAt } from "@/lib/data";

export const metadata: Metadata = {
  title: "Awesome & Guides",
  description: "A treemap view dedicated to awesome lists, guides, tutorials, interviews, and other curated repositories.",
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

export default function AwesomePage() {
  const groups = getCuratedGroups();
  const total = getCuratedTotal();
  const exportedAt = getExportedAt();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0c0c0c] text-white">
      <Treemap
        mode="overview"
        groups={groups}
        total={total}
        breadcrumbOverride={[
          { label: "All Languages", href: "/" },
          { label: "Awesome / Guides", color: "#8eea54" },
        ]}
        infoOverride={`${formatExportedAt(exportedAt)} UTC · ${total.toLocaleString()} curated repos`}
      />
    </main>
  );
}
