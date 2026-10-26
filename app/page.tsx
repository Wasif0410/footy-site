import { Boards, ResultRow } from "@/components/blocks";
import { Rating, SectionHead, Who } from "@/components/ui";
import { matches, playerById, site } from "@/lib/data";
import { fmt } from "@/lib/format";
import { seasonPlayers, seasonTeam } from "@/lib/season";

export default function Home() {
  const s = site();
  const ms = matches();
  const people = playerById();
  const team = seasonTeam(ms, s.matches);
  const rows = seasonPlayers(ms);
  const years = [...new Set(s.matches.map((m) => m.date?.slice(0, 4)).filter(Boolean))];
  const comps = [...new Set(s.matches.map((m) => m.competition).filter(Boolean))];
  const topRated = rows.filter((r) => r.avgRating !== null).sort((a, b) => b.avgRating! - a.avgRating! || b.minutes - a.minutes).slice(0, 6);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "es"}`;

  return (
    <>
      <section className="club-band">
        <div className="wrap page">
          <div>
            <h1>{s.team.name}</h1>
            <p className="sub">{[years.length ? `${years.join("–")} season` : null, comps.join(", ")].filter(Boolean).join(", ")}</p>
          </div>
          <div className="record" aria-label="Season record">
            <div><b>{team.played}</b><span>Played</span></div>
            <div><b>{team.won}</b><span>Won</span></div>
            <div><b>{team.drawn}</b><span>Drawn</span></div>
            <div><b>{team.lost}</b><span>Lost</span></div>
          </div>
        </div>
      </section>

      <main className="wrap page">
        <section className="section">
          <SectionHead title="The team this season"
            note={team.withStats < team.played ? `From the ${plural(team.withStats, "match")} with stats. ${team.played - team.withStats} of ${team.played} played ${team.played - team.withStats === 1 ? "wasn't" : "weren't"} recorded.` : `Across ${plural(team.withStats, "match")}.`} />
          <div className="figures">
            <div><b>{team.possession ?? "–"}<small>%</small></b><span>Possession</span><em>Estimated from ball tracking</em></div>
            <div><b>{fmt(team.passPct)}<small>%</small></b><span>Pass accuracy</span><em>Cut out or out of play counts as failed</em></div>
            <div><b>{team.passes}</b><span>Passes completed</span><em>Every teammate, named or not</em></div>
            <div><b>{team.shots}</b><span>Shots</span><em>{team.shotsOnTarget} on target</em></div>
            <div><b>{team.tackles}</b><span>Tackles won</span><em>Winning the ball back</em></div>
            <div><b>{team.interceptions}</b><span>Interceptions</span><em>Their passes cut out</em></div>
            <div><b>{fmt(team.distanceKm, 1)}<small>km</small></b><span>Distance covered</span><em>The whole squad</em></div>
            <div><b>{team.sprints}</b><span>Sprints</span><em>Bursts held above sprint speed</em></div>
          </div>
          <p className="note">Counted the way the system finds them, with the checks applied. Some of our moments are still waiting for a check.</p>
        </section>

        <div className="cols section">
          <section className="span-7">
            <SectionHead title="Top rated" note="Average match rating this season." more={{ href: "/leaderboards/", label: "Leaderboards" }} />
            <ol className="ranked">
              {topRated.map((r, i) => (
                <li key={r.id}>
                  <span className="pos">{i + 1}</span>
                  <Who player={people.get(r.id)} sub={`${plural(r.matches, "match")}, ${fmt(r.minutes)} min, ${r.goals} G, ${r.assists} A`} />
                  <Rating value={r.avgRating} />
                </li>
              ))}
            </ol>
          </section>
          <section className="span-5">
            <SectionHead title="Results" more={{ href: "/matches/", label: "All matches" }} />
            <ul className="results">{s.matches.slice(0, 6).map((m) => <ResultRow key={m.id} m={m} team={s.team} />)}</ul>
            <p className="form" aria-label="Form, oldest first">
              <span>Form</span>
              {team.form.map((m) => <span key={m.id} className={`outcome ${m.result}`}>{m.result}</span>)}
            </p>
          </section>
        </div>

        <section className="section">
          <SectionHead title="Season leaders" more={{ href: "/leaderboards/", label: "Every leaderboard" }} />
          <Boards rows={rows} people={people} keys={["goals", "assists", "won", "speed", "distance", "passpct"]} />
        </section>
      </main>
    </>
  );
}
