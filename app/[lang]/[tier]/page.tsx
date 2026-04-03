import { getGroups, getTotal } from "@/lib/data";
import { Treemap } from "@/components/Treemap";
import { parseTierSlug, filterReposByTier, generateSubTiers, TOP_TIERS } from "@/lib/tiers";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const groups = getGroups();
  const params: { lang: string; tier: string }[] = [];

  for (const g of groups) {
    for (const t of TOP_TIERS) {
      const repos = filterReposByTier(g.repos, t.min, t.max);
      if (repos.length > 36) {
        params.push({ lang: g.lang.toLowerCase(), tier: t.slug });
        // Also generate sub-tiers one level deep
        const subTiers = generateSubTiers(t.min, t.max === Infinity ? Math.max(...repos.map(r => r.stars)) + 1 : t.max);
        for (const st of subTiers) {
          const subRepos = filterReposByTier(g.repos, st.min, st.max);
          if (subRepos.length > 36) {
            params.push({ lang: g.lang.toLowerCase(), tier: st.slug });
          }
        }
      }
    }
  }

  return params;
}

export default async function TierPage({
  params,
}: {
  params: Promise<{ lang: string; tier: string }>;
}) {
  const { lang, tier: tierSlug } = await params;
  const groups = getGroups();
  const total = getTotal();
  const group = groups.find(
    (g) => g.lang.toLowerCase() === decodeURIComponent(lang).toLowerCase()
  );

  if (!group) notFound();

  const tierRange = parseTierSlug(tierSlug);
  if (!tierRange) notFound();

  const repos = filterReposByTier(group.repos, tierRange.min, tierRange.max);
  if (repos.length === 0) notFound();

  const tierLabel = `★ ${tierRange.min >= 1000 ? tierRange.min / 1000 + "k" : tierRange.min}–${tierRange.max === Infinity ? "∞" : tierRange.max >= 1000 ? tierRange.max / 1000 + "k" : tierRange.max}`;

  const tierGroup = {
    lang: group.lang,
    color: group.color,
    count: repos.length,
    total: repos.reduce((s, r) => s + r.stars, 0),
    repos,
  };

  return (
    <main className="flex flex-col h-screen bg-[#0c0c0c] text-white overflow-hidden">
      <Treemap
        groups={groups}
        total={total}
        initialLang={group.lang}
        initialTier={{
          label: tierLabel,
          repos: tierGroup.repos,
        }}
      />
    </main>
  );
}
