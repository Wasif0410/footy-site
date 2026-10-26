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
    <main className="wrap page">
      <section className="section">
        <h1>Matches</h1>
        <p className="lede" style={{ marginTop: "0.6rem" }}>
          Played {s.matches.length}: won {count("W")}, drew {count("D")}, lost {count("L")}. Open a match for the full match centre:
          video, ratings, player stats and movement.{noStats ? ` ${noStats === 1 ? "One match wasn't" : `${noStats} matches weren't`} recorded, so there are no stats for ${noStats === 1 ? "it" : "them"}.` : ""}
        </p>
      </section>
      <section className="section">
        <SectionHead title="Results" />
        <ul className="results">{s.matches.map((m) => <ResultRow key={m.id} m={m} team={s.team} />)}</ul>
      </section>
    </main>
  );
}
