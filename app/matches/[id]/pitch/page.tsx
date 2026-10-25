import type { Metadata } from "next";
import Link from "next/link";
import { Pitch } from "@/components/ui";
import { match, playerById } from "@/lib/data";

export const metadata: Metadata = { title: "Pitch" };

export default async function PitchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  const placed = m.players.filter((p) => p.avg);
  const shots = m.timeline.filter((t) => (t.kind === "shot") && t.at);
  const wins = m.timeline.filter((t) => (t.kind === "tackle" || t.kind === "pass_intercepted") && t.to?.team === 0 && t.at);
  const losses = m.timeline.filter((t) => (t.kind === "tackle" || t.kind === "pass_intercepted") && t.from?.team === 0 && t.at);
  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid cols-2">
        <section className="panel">
          <div className="panel-head"><h2>Average positions</h2><span className="muted small">We attack →</span></div>
          <Pitch size={m.pitch} label="Each player's average position"
            dots={placed.map((p) => ({ x: p.avg![0], y: p.avg![1], text: String(people.get(p.id)?.number ?? "") }))} />
          <p className="note">Where each player spent their time on average, by shirt number. Both halves are turned so we always attack to the right.</p>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Where we won and lost the ball</h2><span className="muted small">We attack →</span></div>
          <Pitch size={m.pitch} label="Balls won and lost"
            dots={[...wins.map((t) => ({ x: t.at![0], y: t.at![1], tone: "#2f9e5a" })),
              ...losses.map((t) => ({ x: t.at![0], y: t.at![1], tone: "#c8442d" })),
              ...shots.map((t) => ({ x: t.at![0], y: t.at![1], tone: t.from?.team === 0 ? "#8c1d40" : "#3b4452", text: "S" }))]} />
          <p className="pitch-legend">
            <span><b style={{ color: "#2f9e5a" }}>●</b> won ({wins.length})</span>
            <span><b style={{ color: "#c8442d" }}>●</b> lost ({losses.length})</span>
            <span><b>S</b> shots ({shots.length})</span>
          </p>
        </section>
      </div>
      <section>
        <div className="panel-head section-title" style={{ marginTop: "0.5rem" }}><h2>Heatmaps</h2><span className="muted small">Brighter = more time there</span></div>
        <div className="heat-grid">
          {m.players.filter((p) => p.heat).map((p) => {
            const who = people.get(p.id);
            return (
              <figure className="panel" key={p.id}>
                <figcaption>
                  {who ? <Link href={`/players/${who.slug}/`}>{who.name}</Link> : "Player"}
                  <span className="num">#{who?.number ?? "?"}</span>
                </figcaption>
                <Pitch size={m.pitch} heat={p.heat} label={`${who?.name ?? "Player"}'s heatmap`} />
              </figure>
            );
          })}
        </div>
      </section>
    </div>
  );
}
