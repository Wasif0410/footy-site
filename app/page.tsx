import Link from "next/link";
import { Boards, ResultRow } from "@/components/blocks";
import { Crest } from "@/components/crest";
import { FutCard } from "@/components/fut-card";
import { TileCycle } from "@/components/tile-cycle";
import { Rating, SectionHead, Who } from "@/components/ui";
import type { Match, MatchPlayer, Player } from "@/lib/data";
import { matches, playerById, site } from "@/lib/data";
import { fmt, minute } from "@/lib/format";
import { seasonPlayers, seasonTeam } from "@/lib/season";
import { squadCards, type CardedPlayer } from "@/lib/squad";
import { tvWeeks } from "@/lib/tv";

const RECENT = 3;                           // matches the Latest match and Team of the match tiles cycle through

const day = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "Date to be confirmed");
const outcome = (m: Match) => (m.score.us > m.score.them ? "WIN" : m.score.us < m.score.them ? "LOSS" : "DRAW");

// our scorers as a broadcast lists them: "Aryan 10', Al Ghoul 17'"
function scorers(m: Match): string {
  const by = new Map<string, number[]>();
  m.goals.filter((g) => g.team === 0).forEach((g) => {
    const n = g.scorer?.name ?? "Unknown scorer";
    by.set(n, [...(by.get(n) ?? []), g.minute]);
  });
  return [...by].map(([n, mins]) => `${n} ${mins.map(minute).join(", ")}`).join(", ");
}

const byRating = (m: Match) => m.players.filter((p) => p.rating !== null && !p.keeper).sort((a, b) => b.rating! - a.rating!);

function Card({ line, cards, people, special = false, className }: {
  line: MatchPlayer | undefined; cards: Map<number, CardedPlayer>; people: Map<number, Player>; special?: boolean; className?: string;
}) {
  const c = line ? cards.get(line.id) : undefined;
  const p = line ? people.get(line.id) : undefined;
  if (!c?.card || !p) return null;
  const card = <FutCard card={c.card} player={p} special={special} link={false} />;
  return className ? <div className={className} aria-hidden="true">{card}</div> : card;
}

export default function Home() {
  const s = site();
  const ms = matches();                     // newest first
  const people = playerById();
  const team = seasonTeam(ms, s.matches);
  const rows = seasonPlayers(ms);
  const cards = new Map(squadCards(ms).map((c) => [c.p.id, c]));
  const recent = ms.slice(0, RECENT);
  const latest = ms[0];
  const form = recent.map((m) => m.result).join("/");
  const tv = tvWeeks()[0];
  const tvTop = tv?.top.find((t) => t.rank === 1);
  const tvLen = tv?.reel ? `${Math.floor(tv.reel.length / 60)}:${String(Math.round(tv.reel.length % 60)).padStart(2, "0")}` : null;
  const ourGoals = latest ? latest.goals.filter((g) => g.team === 0 && g.clip) : [];
  const hlArt = ourGoals.length ? ourGoals[ourGoals.length - 1].clip!.poster : latest?.goals.find((g) => g.clip)?.clip?.poster;
  const topRated = rows.filter((r) => r.avgRating !== null).sort((a, b) => b.avgRating! - a.avgRating! || b.minutes - a.minutes).slice(0, 6);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "es"}`;

  return (
    <main className="wrap page">
      <h1 className="sr-only">{s.team.name}</h1>

      {latest ? (
        <div className="hub">
          <article className="tile t-match lead">
            <h2 className="tile-title">Latest match</h2>
            <TileCycle group="Recent matches" labels={recent.map((m) => `${m.opponent}, ${day(m.date)}`)}>
              {recent.map((m) => {
                const ranked = byRating(m);
                const potm = m.players.find((p) => p.id === m.potm) ?? ranked[0];
                const second = ranked.find((p) => p.id !== potm?.id);
                const line = scorers(m);
                return (
                  <div key={m.id}>
                    <Link className="tile-link" href={`/matches/${m.id}/`}
                      aria-label={`${s.team.name} ${m.score.us}–${m.score.them} ${m.opponent}, ${day(m.date)}: open the match centre`} />
                    <div className="tile-body lm">
                      <div className="lm-row">
                        <Crest className="crest" />
                        <div className="lm-score">{m.score.us}–{m.score.them}<small>FULL TIME · {outcome(m)}</small></div>
                      </div>
                      <div>
                        <div className="lm-opp">v {m.opponent}</div>
                        <div className="lm-when">{[day(m.date), m.venue].filter(Boolean).join(", ")}</div>
                      </div>
                      <div>
                        <div className="lm-label">Season record</div>
                        <div className="lm-form"><span className="up" aria-label={`${team.won} won`}>{team.won}</span>
                          <span className="dn" aria-label={`${team.lost} lost`}>{team.lost}</span><span>Last {recent.length}: {form}</span></div>
                      </div>
                      {line ? <div className="lm-goals">{line}</div> : null}
                    </div>
                    <Card line={second} cards={cards} people={people} className="mini" />
                    <Card line={potm} cards={cards} people={people} special />
                    {potm?.rating != null ? <span className="pill"><Rating value={potm.rating} />Match rating</span> : null}
                  </div>
                );
              })}
            </TileCycle>
          </article>

          <article className="tile t-tv">
            <h2 className="tile-title">Seven XI TV</h2>
            <Link className="tile-link" href="/tv/" aria-label="Seven XI TV: watch the latest reel" />
            {tv?.reel ? <div className="tile-art" style={{ backgroundImage: `url(${tv.reel.poster})` }} /> : null}
            {tv?.reel ? <span className="play-mark" aria-hidden="true" /> : null}
            <div className="tile-body tv-body">
              <div className="tv-title">{tv ? `Top ${tv.top.length} moments from ${tv.title}` : "Highlight reels after every match"}</div>
              {tv ? (
                <div className="tv-meta">
                  {tvLen ? <span className="clock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{tvLen}</span> : null}
                  <span>{tv.top.length} MOMENTS</span>
                </div>
              ) : null}
              <div className="tv-cta">Watch the reel</div>
              {tvTop ? <div className="tv-desc">{`${people.get(tvTop.player_id)?.name ?? "Seven XI"}'s ${tvTop.kind.toLowerCase()}${tvTop.extra ? `, ${tvTop.extra},` : ""} is number one. Jump straight to any moment.`}</div> : null}
            </div>
          </article>

          <article className="tile t-hl">
            <h2 className="tile-title">Highlights</h2>
            <Link className="tile-link" href={`/matches/${latest.id}/highlights/`} aria-label={`Highlights from ${latest.opponent}, ${day(latest.date)}`} />
            {hlArt ? <div className="tile-art" style={{ backgroundImage: `url(${hlArt})` }} /> : null}
            <p className="tile-body">Every goal and the best shots from {day(latest.date)} v {latest.opponent}, each a click away.</p>
          </article>

          <article className="tile t-team">
            <h2 className="tile-title">Team of the match</h2>
            <TileCycle group="Team of the match, by match" labels={recent.map((m) => `${m.opponent}, ${day(m.date)}`)}>
              {recent.map((m) => {
                const [a, b, c] = byRating(m);
                return (
                  <div key={m.id}>
                    <Link className="tile-link" href={`/matches/${m.id}/ratings/`} aria-label={`Ratings for ${m.opponent}, ${day(m.date)}`} />
                    <p className="tile-body">Best ratings v {m.opponent}, {day(m.date)}: {[a, b, c].filter(Boolean).map((p) => `${people.get(p!.id)?.name ?? "?"} ${p!.rating!.toFixed(1)}`).join(", ")}.</p>
                    <Card line={b} cards={cards} people={people} className="mini l" />
                    <Card line={c} cards={cards} people={people} className="mini r" />
                    <Card line={a} cards={cards} people={people} special={a?.id === m.potm} className="mini c" />
                  </div>
                );
              })}
            </TileCycle>
          </article>
        </div>
      ) : null}

      <div className="home-panels">
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
                  <Who player={people.get(r.id)} sub={`${plural(r.played, "match")}, ${fmt(r.playedMin)} min, ${r.goals} G, ${r.assists} A`} />
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
      </div>
    </main>
  );
}
