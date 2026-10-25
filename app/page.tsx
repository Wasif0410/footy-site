import Link from "next/link";
import { Leaders, PlayerOfTheMatch, ResultRow, Scoreboard, TopPerformers } from "@/components/blocks";
import { ClipCard, Compare, GoalTimeline } from "@/components/ui";
import { match, playerById, season, site } from "@/lib/data";

export default function Home() {
  const s = site();
  const people = playerById();
  const latest = s.matches[0] ? match(s.matches[0].id) : null;
  if (!latest) {
    return <main className="wrap"><h1>No matches yet</h1><p className="muted">Seed the site from Footy Analyzer to see results here.</p></main>;
  }
  const potm = latest.players.find((p) => p.id === latest.potm);
  const ourGoals = latest.goals.filter((g) => g.team === 0 && g.clip);
  return (
    <>
      <Scoreboard m={latest} team={s.team}>
        <div className="wrap" style={{ paddingBottom: "1rem", textAlign: "center" }}>
          <Link href={`/matches/${latest.id}/`} className="chip" style={{ textDecoration: "none", background: "var(--club)", color: "var(--kit)", borderColor: "var(--club)" }}>
            Open the match centre
          </Link>
        </div>
      </Scoreboard>
      <main className="wrap">
        <div className="split">
          <div className="grid">
            {potm ? <section className="panel"><PlayerOfTheMatch line={potm} player={people.get(potm.id)} /></section> : null}
            <section className="panel">
              <div className="panel-head"><h2>How the match went</h2><Link href={`/matches/${latest.id}/`}>Full summary</Link></div>
              <GoalTimeline goals={latest.goals} halves={latest.halves} />
              <div style={{ marginTop: "1.25rem" }}><Compare stats={latest.team_stats.slice(0, 4)} /></div>
            </section>
          </div>
          <div className="grid">
            <section className="panel">
              <div className="panel-head"><h2>Top rated</h2><Link href={`/matches/${latest.id}/ratings/`}>All ratings</Link></div>
              <TopPerformers m={latest} people={people} />
            </section>
            <section className="panel">
              <div className="panel-head"><h2>Results</h2><Link href="/matches/">All matches</Link></div>
              {s.matches.slice(0, 5).map((m) => <ResultRow key={m.id} m={m} team={s.team} />)}
            </section>
          </div>
        </div>

        {ourGoals.length ? (
          <>
            <div className="panel-head section-title"><h2>Our goals</h2><Link href={`/matches/${latest.id}/highlights/`}>All highlights</Link></div>
            <div className="clips">
              {ourGoals.map((g, i) => (
                <ClipCard key={i} clip={g.clip!} min={g.minute} title={g.scorer?.name ?? "Goal"}
                  sub={g.assist ? `assist ${g.assist.name}` : undefined} />
              ))}
            </div>
          </>
        ) : null}

        <div className="panel-head section-title"><h2>Season leaders</h2><Link href="/stats/">All stats</Link></div>
        <Leaders rows={season()} people={people} />
      </main>
    </>
  );
}
