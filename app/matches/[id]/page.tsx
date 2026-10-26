import type { Metadata } from "next";
import Link from "next/link";
import { Bar, Compare, GoalTimeline, Pitch, Rating, SectionHead, Who } from "@/components/ui";
import { match, playerById, site } from "@/lib/data";
import { fmt, minute } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = match((await params).id);
  return { title: `${site().team.name} ${m.score.us}–${m.score.them} ${m.opponent}` };
}

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const s = site();
  const people = playerById();
  const watch = (t: number) => `/matches/${id}/review/?t=${t}`;
  const potm = m.players.find((p) => p.id === m.potm);
  const potmPlayer = potm ? people.get(potm.id) : undefined;
  const rated = m.players.filter((p) => p.rating !== null).slice(0, 5);
  const won = m.timeline.filter((t) => (t.kind === "tackle" || t.kind === "pass_intercepted") && t.to?.team === 0 && t.at);
  const lost = m.timeline.filter((t) => (t.kind === "tackle" || t.kind === "pass_intercepted") && t.from?.team === 0 && t.at);
  const shots = m.timeline.filter((t) => t.kind === "shot" && t.at);
  const km = m.players.reduce((a, p) => a + (p.running.distance_km || 0), 0);
  const sprints = m.players.reduce((a, p) => a + (p.running.sprints || 0), 0);
  const fastest = [...m.players].filter((p) => p.running.top_speed_kmh).sort((a, b) => b.running.top_speed_kmh! - a.running.top_speed_kmh!)[0];

  return (
    <div className="page">
      <div className="cols section">
        <section className="span-7">
          <SectionHead title="Goals" note={`${m.play_minutes} minutes of play over two halves. Final score ${m.score.us}–${m.score.them}.`} />
          <GoalTimeline goals={m.goals} halves={m.halves} />
          <ol className="goal-list" style={{ marginTop: "1rem" }}>
            {m.goals.map((g, i) => (
              <li key={i} className={g.team === 0 ? "us" : "them"}>
                <span className="m">{minute(g.minute)}</span>
                <span>
                  {g.team === 0
                    ? <><span className="who-scored">{g.scorer?.name ?? "Unknown scorer"}</span>{g.assist ? <span className="muted">, assisted by {g.assist.name}</span> : null}</>
                    : <>Goal for {m.opponent}</>}
                </span>
                <Link href={watch(g.t)}>Watch</Link>
              </li>
            ))}
            {([["us", s.team.name], ["them", m.opponent]] as const).map(([side, name]) => m.goals_missing[side] ? (
              <li key={side} className={side === "us" ? "us" : "them"}>
                <span className="m">–</span>
                <span>{m.goals_missing[side]} more {m.goals_missing[side] === 1 ? "goal" : "goals"} for {name}: unable to find on the video</span>
                <span />
              </li>
            ) : null)}
          </ol>
        </section>
        <section className="span-5">
          <SectionHead title="Team stats" />
          <Compare stats={m.team_stats} us={s.team.name} them={m.opponent} />
          <p className="note">Both teams are counted the same way, as the system found them. Our checks are applied to ours; {m.opponent}&apos;s
            aren&apos;t checked. A pass counts as failed if it&apos;s cut out or goes out of play. Possession is estimated from ball tracking.</p>
        </section>
      </div>

      <div className="cols section">
        <section className="span-7">
          <SectionHead title="Best performers" more={{ href: `/matches/${id}/ratings/`, label: "All ratings" }} />
          <ol className="ranked">
            {rated.map((p, i) => (
              <li key={p.id}>
                <span className="pos">{i + 1}</span>
                <Who player={people.get(p.id)} sub={`${fmt(p.minutes)} min, ${p.stats.goals} G, ${p.stats.assists} A, ${p.stats.tackles_won + p.stats.interceptions} won`} />
                <Rating value={p.rating} />
              </li>
            ))}
          </ol>
        </section>
        {potm && potmPlayer ? (
          <section className="span-5">
            <SectionHead title="Player of the match" />
            <Link href={`/players/${potmPlayer.slug}/`} className="potm">
              <div className="photo" style={{ backgroundImage: potmPlayer.photo ? `url(${potmPlayer.photo})` : undefined }}>
                <span className="no">{potmPlayer.number ?? ""}</span>
              </div>
              <div className="txt">
                <strong>{potmPlayer.name}</strong>
                <Rating value={potm.rating} large />
                <span className="muted small">
                  {[potm.stats.goals ? `${potm.stats.goals} goal${potm.stats.goals > 1 ? "s" : ""}` : null,
                    potm.stats.assists ? `${potm.stats.assists} assist${potm.stats.assists > 1 ? "s" : ""}` : null,
                    `${potm.stats.tackles_won + potm.stats.interceptions} balls won`,
                    `${potm.stats.passes} of ${potm.stats.passes_attempted} passes`,
                    `${fmt(potm.running.distance_km, 1)} km`].filter(Boolean).join(", ")}
                </span>
              </div>
            </Link>
          </section>
        ) : null}
      </div>

      <div className="cols section">
        <section className="span-7">
          <SectionHead title="Where we won and lost the ball" note="We attack to the right in both halves." />
          <Pitch size={m.pitch} label="Where we won and lost the ball, and the shots"
            dots={[...won.map((t) => ({ x: t.at![0], y: t.at![1], fill: "var(--up)" })),
              ...lost.map((t) => ({ x: t.at![0], y: t.at![1], fill: "var(--down)" })),
              ...shots.map((t) => ({ x: t.at![0], y: t.at![1], fill: t.from?.team === 0 ? "var(--club)" : "#2a2c31", text: "S", r: 1.45 }))]} />
          <p className="pitch-legend">
            <span><i style={{ background: "var(--up)" }} />Won it ({won.length})</span>
            <span><i style={{ background: "var(--down)" }} />Lost it ({lost.length})</span>
            <span><i style={{ background: "var(--club)" }} />Our shots ({shots.filter((t) => t.from?.team === 0).length})</span>
            <span><i style={{ background: "#2a2c31" }} />Their shots ({shots.filter((t) => t.from?.team === 1).length})</span>
          </p>
        </section>
        <section className="span-5">
          <SectionHead title="Running" more={{ href: `/matches/${id}/movement/`, label: "Movement" }} />
          <div className="figures" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div><b>{km.toFixed(1)}<small>km</small></b><span>Covered as a team</span></div>
            <div><b>{sprints}</b><span>Sprints</span></div>
            <div><b>{fastest ? fastest.running.top_speed_kmh!.toFixed(1) : "–"}<small>km/h</small></b><span>Top speed</span>
              <em>{fastest ? people.get(fastest.id)?.name : ""}</em></div>
            <div><b>{m.players.length}</b><span>Players used</span></div>
          </div>
          <div style={{ height: "2.2rem" }} />
          <SectionHead title="Checked one by one" />
          <div className="trust"><span>Goals, by hand</span><b>{m.review.goals_checked} of {m.review.goals}</b>
            <Bar value={m.review.goals_checked} max={m.review.goals} tone="up" /></div>
          <div className="trust"><span>Our moments, by hand</span><b>{m.review.checked} of {m.review.events}</b>
            <Bar value={m.review.checked} max={m.review.events} /></div>
          {m.review.claude ? <div className="trust"><span>Our moments, by Claude from the video</span>
            <b>{m.review.claude} of {m.review.events}</b><Bar value={m.review.claude} max={m.review.events} /></div> : null}
          {m.review.waiting ? <p className="note">{m.review.waiting} moments are still waiting for a check and aren&apos;t counted yet.</p> : null}
        </section>
      </div>
    </div>
  );
}
