import { getGroups, getTotal } from "@/lib/data";
import { Treemap } from "@/components/Treemap";

export default function Home() {
  const groups = getGroups();
  const total = getTotal();

  return (
    <main className="flex flex-col h-screen bg-[#0c0c0c] text-white overflow-hidden">
      <Treemap groups={groups} total={total} />
    </main>
  );
}
