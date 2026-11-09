import type { Metadata } from "next";
import { ResultRow } from "@/components/blocks";
import { SectionHead } from "@/components/ui";
import { site } from "@/lib/data";

export const metadata: Metadata = { title: "Matches" };

export default function Matches() {
  const s = site();
  const count = (r: string) => s.matches.filter((m) => m.result === r).length;
  const noStats = s.matches.filter((m) => !m.stats).length;
  return (
    <main className="wrap page titleless">
      <h1 className="sr-only">Matches</h1>
      <section className="section">
        <SectionHead title="Results" note={`Played ${s.matches.length}: won ${count("W")}, drew ${count("D")}, lost ${count("L")}.${noStats ? ` ${noStats === 1 ? "One match wasn't" : `${noStats} matches weren't`} recorded, so there are no stats for ${noStats === 1 ? "it" : "them"}.` : ""}`} />
        <ul className="results">{s.matches.map((m) => <ResultRow key={m.id} m={m} team={s.team} />)}</ul>
      </section>
    </main>
  );
}
