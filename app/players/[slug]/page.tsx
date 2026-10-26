import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FutCard } from "@/components/fut-card";
import { MomentCard } from "@/components/moment-card";
import { cardFor, teamBaseline } from "@/lib/cards";
import { ClipCard, Pitch, Rating, SectionHead } from "@/components/ui";
import { playerBySlug, playerMatches, players, site } from "@/lib/data";
import { fmt, matchClock, mmss, pct, shortDate, signed, winTag } from "@/lib/format";
import { seasonPlayers } from "@/lib/season";

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
  const season = seasonPlayers();
  const r = season.find((x) => x.id === p.id);
  const card = r ? cardFor(r, p.keeper, teamBaseline(season)) : null;
  const log = playerMatches(p.id);
  const last = log[0];
  const team = site().team.name;
  const clips = log.flatMap(({ match, line }) => line.clips.map((c) => ({ c, match })));
  // the ball back for us: their tackles won and interceptions, the critical ones first
  const wins = log.flatMap(({ match }) => match.timeline.filter((t) => t.still && t.to?.id === p.id).map((w) => ({ w, match })))
    .sort((a, b) => Number(!!b.w.critical) - Number(!!a.w.critical) || a.w.t - b.w.t);
  const lines = last ? last.line.breakdown.filter((b) => b.count) : [];
  return (
    <>
      <section className="profile">
        <div className="wrap page">
          {card ? <FutCard card={card} player={p} link={false} special={log[0]?.match.potm === p.id} />
            : <div className="photo" style={{ backgroundImage: p.photo ? `url(${p.photo})` : undefined }} role="img" aria-label={p.name} />}
          <div>
            <span className="no">{p.number ?? ""}</span>
            <h1>{p.name}</h1>
            <p className="facts">
              {[p.keeper ? "Goalkeeper" : null, `${r?.matches ?? 0} ${r?.matches === 1 ? "match" : "matches"}`, `${fmt(r?.minutes)} minutes`,
                `${r?.goals ?? 0} ${r?.goals === 1 ? "goal" : "goals"}`, `${r?.assists ?? 0} ${r?.assists === 1 ? "assist" : "assists"}`].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="rate"><span>Season rating</span><Rating value={r?.avgRating ?? null} large /></div>
        </div>
      </section>
      <main className="wrap page">
        <section className="section">
          <SectionHead title="Season" />
          <div className="figures">
            <div><b>{r ? r.passes : "–"}<small>/{r?.passesAttempted ?? 0}</small></b><span>Passes completed</span><em>{pct(r?.passPct)} accuracy</em></div>
            <div><b>{r?.ballsWon ?? 0}</b><span>Balls won</span><em>{r?.tackles ?? 0} tackles, {r?.interceptions ?? 0} interceptions</em></div>
            <div><b>{r?.shots ?? 0}</b><span>Shots</span><em>{r?.shotsOnTarget ?? 0} on target</em></div>
            <div><b>{r?.turnovers ?? 0}</b><span>Times lost the ball</span><em>{r?.dispossessed ?? 0} of them tackled</em></div>
            <div><b>{fmt(r?.topSpeed, 1)}<small>km/h</small></b><span>Top speed</span><em>Held for a full second</em></div>
            <div><b>{fmt(r?.distanceKm, 1)}<small>km</small></b><span>Distance covered</span><em>{r?.sprints ?? 0} sprints</em></div>
            <div><b>{r?.touches ?? 0}</b><span>Touches</span><em>{mmss(r?.possessionS ?? 0)} on the ball</em></div>
            <div><b>{r?.carries ?? 0}</b><span>Runs with the ball</span><em>8 m or more forward</em></div>
          </div>
        </section>

        <div className="cols section">
          <section className="span-7">
            <SectionHead title="Match by match" />
            <div className="table-wrap">
              <table>
                <thead><tr><th>Match</th><th>Rating</th><th>Min</th><th>G</th><th>A</th><th>Passes</th><th>Won</th><th>Km</th><th>Top km/h</th></tr></thead>
                <tbody>
                  {log.map(({ match, line }) => (
                    <tr key={match.id}>
                      <td><Link href={`/matches/${match.id}/`} style={{ fontWeight: 650 }}>{shortDate(match.date)} v {match.opponent}, {match.score.us}–{match.score.them}</Link></td>
                      <td><Rating value={line.rating} /></td>
                      <td>{fmt(line.minutes)}</td><td>{line.stats.goals}</td><td>{line.stats.assists}</td>
                      <td>{line.stats.passes}/{line.stats.passes_attempted}</td>
                      <td>{line.stats.tackles_won + line.stats.interceptions}</td>
                      <td>{fmt(line.running.distance_km, 1)}</td>
                      <td>{fmt(line.running.top_speed_kmh, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {last && lines.length ? (
              <div style={{ marginTop: "2.4rem" }}>
                <SectionHead title="What made the last rating" note={`v ${last.match.opponent}, ${shortDate(last.match.date)}. Open a line to watch the moments behind it.`}
                  more={{ href: `/matches/${last.match.id}/ratings/`, label: "Full rating" }} />
                {lines.map((b) => (
                  b.moments.length ? (
                    <details className="line" key={b.key}>
                      <summary>
                        <span>{b.label}</span>
                        <span className="c">{b.key === "distance_km" ? `${b.count.toFixed(1)} km` : fmt(b.count, b.count % 1 ? 1 : 0)}</span>
                        <span className="e">{signed(b.each)}</span>
                        <span className={`p${b.points > 0 ? " pos" : b.points < 0 ? " neg" : ""}`}>{signed(b.points)}</span>
                      </summary>
                      <ol>
                        {b.moments.map((mo, i) => (
                          <li key={i}>
                            <span className="when">{matchClock(mo.t, last.match.periods)}</span>
                            <span>{mo.text}</span>
                            <Link href={`/matches/${last.match.id}/review/?t=${mo.t}`}>Watch</Link>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : (
                    <div className="line" key={b.key}>
                      <div className="row"><span>{b.label}</span><span className="c">{b.key === "distance_km" ? `${b.count.toFixed(1)} km` : fmt(b.count, b.count % 1 ? 1 : 0)}</span>
                        <span className="e">{signed(b.each)}</span><span className={`p${b.points > 0 ? " pos" : b.points < 0 ? " neg" : ""}`}>{signed(b.points)}</span><span /></div>
                    </div>
                  )
                ))}
                <div className="sheet-total"><span>Total</span><span>{signed(last.line.points)}</span></div>
              </div>
            ) : null}
          </section>
          <section className="span-5">
            <SectionHead title="Where they play" note="We attack to the right." />
            {last?.line.heat ? <Pitch size={last.match.pitch} heat={last.line.heat} label={`${p.name}'s heatmap`} />
              : <p className="muted">Not enough time on camera for a heatmap.</p>}
            {last ? (
              <div className="figures" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "1.2rem" }}>
                <div><b>{fmt(last.line.running.top_speed_kmh, 1)}<small>km/h</small></b><span>Top speed</span><em>v {last.match.opponent}</em></div>
                <div><b>{last.line.running.sprints ?? 0}</b><span>Sprints</span><em>v {last.match.opponent}</em></div>
              </div>
            ) : null}
          </section>
        </div>

        {clips.length ? (
          <section className="section">
            <SectionHead title="Highlights" />
            <div className="clips">
              {clips.map(({ c, match }, i) => <ClipCard key={i} clip={c} title={p.name} sub={`${team} v ${match.opponent}`} />)}
            </div>
          </section>
        ) : null}
        {wins.length ? (
          <section className="section">
            <SectionHead title="Winning the ball" note="Tackles won and interceptions. Critical ones were won in our third." />
            <div className="moments-grid">
              {wins.map(({ w, match }, i) => (
                <MomentCard key={i} still={w.still!} t={w.t} minute={w.minute} title={p.name} tag={winTag(w)} critical={!!w.critical}
                  sub={`v ${match.opponent}, ${shortDate(match.date)}`} video={match.video} matchId={match.id} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
