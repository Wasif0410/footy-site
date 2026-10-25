import type { Metadata } from "next";
import { ResultRow } from "@/components/blocks";
import { site } from "@/lib/data";

export const metadata: Metadata = { title: "Matches" };

export default function Matches() {
  const s = site();
  const w = s.matches.filter((m) => m.result === "W").length;
  const d = s.matches.filter((m) => m.result === "D").length;
  const l = s.matches.filter((m) => m.result === "L").length;
  const gf = s.matches.reduce((a, m) => a + m.score.us, 0), ga = s.matches.reduce((a, m) => a + m.score.them, 0);
  return (
    <main className="wrap">
      <h1 style={{ fontSize: "2.4rem" }}>Matches</h1>
      <p className="muted" style={{ margin: "0.3rem 0 1.25rem" }}>
        Played {s.matches.length} · won {w}, drew {d}, lost {l} · goals {gf} for, {ga} against
      </p>
      <section className="panel">
        {s.matches.map((m) => <ResultRow key={m.id} m={m} team={s.team} />)}
      </section>
    </main>
  );
}
