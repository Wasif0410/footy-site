import type { Metadata } from "next";
import Link from "next/link";
import { PlayerOfTheMatch, TopPerformers } from "@/components/blocks";
import { ClipCard, Compare, GoalTimeline, Kpi, TrustLine } from "@/components/ui";
import { match, playerById, site } from "@/lib/data";
import { minute } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = match((await params).id);
  return { title: `${site().team.short} ${m.score.us}–${m.score.them} ${m.opponent}` };
}

export default async function Summary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  const potm = m.players.find((p) => p.id === m.potm);
  const total = (k: keyof (typeof m.players)[number]["stats"]) => m.players.reduce((a, p) => a + (Number(p.stats[k]) || 0), 0);
  const km = m.players.reduce((a, p) => a + (p.running.distance_km || 0), 0);
  const sprints = m.players.reduce((a, p) => a + (p.running.sprints || 0), 0);
  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="split">
        <div className="grid">
          <section className="panel">
            <div className="panel-head"><h2>Goals</h2><span className="muted small">{m.play_minutes} minutes of play</span></div>
            <GoalTimeline goals={m.goals} halves={m.halves} />
            <ul className="feed" style={{ marginTop: "0.75rem" }}>
              {m.goals.map((g, i) => (
                <li key={i} className={g.team === 0 ? "good goal" : "bad"} style={{ gridTemplateColumns: "3rem 1fr" }}>
                  <span className="min">{minute(g.minute)}</span>
                  <span className="text">
                    {g.team === 0 ? <>{g.scorer?.name ?? "Goal"}{g.assist ? <span className="muted"> · assist {g.assist.name}</span> : null}</> : <>Goal for {m.opponent}</>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Team stats</h2><Link href={`/matches/${id}/box-score/`}>Player stats</Link></div>
            <Compare stats={m.team_stats} />
            <p className="note">Our numbers come from events checked by the team. {m.opponent}&apos;s are as our system saw them and
              aren&apos;t checked, so read them as a rough guide.</p>
          </section>
        </div>
        <div className="grid">
          {potm ? <section className="panel"><PlayerOfTheMatch line={potm} player={people.get(potm.id)} /></section> : null}
          <section className="panel">
            <div className="panel-head"><h2>Top rated</h2><Link href={`/matches/${id}/ratings/`}>All ratings</Link></div>
            <TopPerformers m={m} people={people} />
          </section>
        </div>
      </div>

      <div className="kpis">
        <Kpi value={total("passes")} label="Passes completed" />
        <Kpi value={total("tackles_won") + total("interceptions")} label="Balls won" />
        <Kpi value={`${km.toFixed(1)} km`} label="Distance as a team" />
        <Kpi value={sprints} label="Sprints" />
        <Kpi value={m.players.length} label="Players used" />
      </div>

      {m.goals.some((g) => g.clip) ? (
        <section>
          <div className="panel-head section-title"><h2>Goals on video</h2><Link href={`/matches/${id}/highlights/`}>All highlights</Link></div>
          <div className="clips">
            {m.goals.filter((g) => g.clip).slice(0, 3).map((g, i) => (
              <ClipCard key={i} clip={g.clip!} min={g.minute} title={g.team === 0 ? g.scorer?.name ?? "Our goal" : `${m.opponent} score`} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head"><h3>How much of this is checked</h3><Link href="/about/">How it works</Link></div>
        <div className="grid cols-2">
          <TrustLine checked={m.review.goals_checked} total={m.review.goals} what="goals" />
          <TrustLine checked={m.review.checked} total={m.review.events} what="of our moments" />
        </div>
        {m.review.waiting ? <p className="note">{m.review.waiting} moments are still waiting to be checked and aren&apos;t counted yet.</p> : null}
      </section>
    </div>
  );
}
