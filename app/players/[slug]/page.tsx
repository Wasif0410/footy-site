import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipCard, Kpi, Pitch, Rating } from "@/components/ui";
import { playerBySlug, playerMatches, players, season } from "@/lib/data";
import { fmt, pct, shortDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return players().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: playerBySlug((await params).slug)?.name ?? "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = playerBySlug((await params).slug);
  if (!p) notFound();
  const r = season().find((x) => x.player_id === p.id);
  const log = playerMatches(p.id);
  const last = log[0];
  const clips = log.flatMap(({ match, line }) => line.clips.map((c) => ({ c, match })));
  const balls = r ? r.tackles_won + r.interceptions : 0;
  return (
    <>
      <section className="profile">
        <div className="wrap">
          <div className="photo" style={{ backgroundImage: p.photo ? `url(${p.photo})` : undefined }} role="img" aria-label={p.name} />
          <div>
            <span className="shirt">{p.number ?? ""}</span>
            <h1>{p.name}</h1>
            <div className="facts">
              {p.keeper ? <span>Goalkeeper</span> : null}
              <span><strong>{r?.matches ?? 0}</strong>{r?.matches === 1 ? "match" : "matches"}</span>
              <span><strong>{fmt(r?.minutes)}</strong>minutes</span>
              <span><strong>{r?.goals ?? 0}</strong>goals</span>
              <span><strong>{r?.assists ?? 0}</strong>assists</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="muted small" style={{ display: "block", color: "var(--on-ink-2)", marginBottom: "0.3rem" }}>Season rating</span>
            <Rating value={r?.avg_rating ?? null} large />
          </div>
        </div>
      </section>
      <main className="wrap">
        <div className="kpis">
          <Kpi value={r ? `${r.passes}/${r.passes_attempted}` : "–"} label="Passes completed" />
          <Kpi value={pct(r?.pass_pct)} label="Pass accuracy" />
          <Kpi value={balls} label="Balls won" />
          <Kpi value={r?.turnovers ?? 0} label="Times lost the ball" />
          <Kpi value={r ? `${r.shots} (${r.shots_on_target})` : "–"} label="Shots (on target)" />
          <Kpi value={r?.distance_km ? `${r.distance_km.toFixed(1)} km` : "–"} label="Distance covered" />
        </div>

        <div className="split" style={{ marginTop: "1rem" }}>
          <section className="panel">
            <div className="panel-head"><h2>Match log</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Match</th><th>Rating</th><th>Min</th><th>G</th><th>A</th><th>Passes</th><th>Won</th><th>Km</th></tr></thead>
                <tbody>
                  {log.map(({ match, line }) => (
                    <tr key={match.id}>
                      <td><Link href={`/matches/${match.id}/`}>{shortDate(match.date)} vs {match.opponent} {match.score.us}–{match.score.them}</Link></td>
                      <td><Rating value={line.rating} /></td>
                      <td>{fmt(line.minutes)}</td><td>{line.stats.goals}</td><td>{line.stats.assists}</td>
                      <td>{line.stats.passes}/{line.stats.passes_attempted}</td>
                      <td>{line.stats.tackles_won + line.stats.interceptions}</td>
                      <td>{fmt(line.running.distance_km, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {last && last.line.breakdown.length ? (
              <>
                <h3 style={{ margin: "1.25rem 0 0.5rem" }}>What made the last rating</h3>
                <div className="breakdown">
                  {last.line.breakdown.map((b) => (
                    <div className="row" key={b.label}>
                      <span>{b.label}</span>
                      <span className="muted" style={{ textAlign: "right" }}>×{fmt(b.count, b.count % 1 ? 1 : 0)}</span>
                      <span className={`pts${b.points < 0 ? " neg" : ""}`}>{b.points > 0 ? "+" : ""}{fmt(b.points, 1)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Where they play</h2><span className="muted small">We attack →</span></div>
            {last?.line.heat ? <Pitch size={last.match.pitch} heat={last.line.heat} label={`${p.name}'s heatmap`} />
              : <p className="muted">Not enough time on camera for a heatmap.</p>}
            {last ? <p className="note">From {shortDate(last.match.date)} vs {last.match.opponent}. Top speed {fmt(last.line.running.top_speed_kmh, 1)} km/h, {last.line.running.sprints ?? 0} sprints.</p> : null}
          </section>
        </div>

        {clips.length ? (
          <>
            <h2 className="section-title">Highlights</h2>
            <div className="clips">
              {clips.map(({ c, match }, i) => <ClipCard key={i} clip={c} title={p.name} sub={`vs ${match.opponent}`} />)}
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
