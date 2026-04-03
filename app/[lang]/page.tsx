import { getGroups, getTotal } from "@/lib/data";
import { Treemap } from "@/components/Treemap";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const groups = getGroups();
  return groups.map((g) => ({ lang: g.lang.toLowerCase() }));
}

export default async function LangPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const groups = getGroups();
  const total = getTotal();
  const group = groups.find(
    (g) => g.lang.toLowerCase() === decodeURIComponent(lang).toLowerCase()
  );

  if (!group) notFound();

  return (
    <main className="flex flex-col h-screen bg-[#0c0c0c] text-white overflow-hidden">
      <Treemap
        groups={groups}
        total={total}
        initialLang={group.lang}
      />
    </main>
  );
}
