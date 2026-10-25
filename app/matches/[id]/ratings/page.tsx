import type { Metadata } from "next";
import { PlayerLine, Rating } from "@/components/ui";
import { match, playerById } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Ratings" };

export default async function Ratings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  return (
    <>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Ratings start at 6.0 and move with what each player did per hour on the pitch: goals and assists count most,
        then winning the ball, good passing and running with it; losing the ball costs points.
      </p>
      <div className="grid cols-2">
        {m.players.map((p) => {
          const sections = [...new Set(p.breakdown.map((b) => b.section))];
          return (
            <section className="panel" key={p.id}>
              <div className="panel-head" style={{ alignItems: "center" }}>
                <PlayerLine player={people.get(p.id)} sub={`${fmt(p.minutes)} min${p.keeper ? " · goalkeeper" : ""}${p.id === m.potm ? " · player of the match" : ""}`} />
                <Rating value={p.rating} large />
              </div>
              {p.rating === null ? (
                <p className="muted small">{p.keeper ? "Keepers aren't rated yet: saves aren't measured." : "Not enough time on camera to rate."}</p>
              ) : (
                <div className="breakdown">
                  {sections.map((sec) => (
                    <div key={sec} style={{ display: "contents" }}>
                      <span className="sec">{sec}</span>
                      {p.breakdown.filter((b) => b.section === sec).map((b) => (
                        <div className="row" key={b.label}>
                          <span>{b.label}</span>
                          <span className="muted" style={{ textAlign: "right" }}>×{fmt(b.count, b.count % 1 ? 1 : 0)}</span>
                          <span className={`pts${b.points < 0 ? " neg" : ""}`}>{b.points > 0 ? "+" : ""}{fmt(b.points, 1)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
