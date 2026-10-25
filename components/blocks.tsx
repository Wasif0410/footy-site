// Larger sections shared by several pages: the scoreboard, a result row, player of the match,
// season leaders.
import Link from "next/link";
import type { Match, MatchPlayer, Player, SeasonRow, Site } from "@/lib/data";
import { fmt, longDate, minute, shortDate } from "@/lib/format";
import { BallIcon, Crest, PlayerLine, Rating } from "./ui";

export function Scoreboard({ m, team, children }: { m: Match; team: Site["team"]; children?: React.ReactNode }) {
  const ours = m.goals.filter((g) => g.team === 0);
  const theirs = m.goals.filter((g) => g.team === 1);
  const won = m.score.us > m.score.them, lost = m.score.us < m.score.them;
  // scorers grouped like a broadcast: "Aryan 10', 15'"
  const byScorer = new Map<string, number[]>();
  ours.forEach((g) => { const n = g.scorer?.name ?? "Own goal / unknown"; byScorer.set(n, [...(byScorer.get(n) ?? []), g.minute]); });
  return (
    <section className="scoreboard">
      <div className="wrap">
        <p className="sb-meta">{[m.competition, longDate(m.date), m.venue].filter(Boolean).join("  ·  ")}</p>
        <div className="sb-main">
          <div className="sb-team"><Crest name={team.short} side="us" size={3} />{team.name}</div>
          <div>
            <div className="sb-score" aria-label={`${team.name} ${m.score.us}, ${m.opponent} ${m.score.them}`}>
              <span className={won ? "win" : lost ? "lose" : ""}>{m.score.us}</span>
              <span className="dash">–</span>
              <span className={lost ? "win" : won ? "lose" : ""}>{m.score.them}</span>
            </div>
            <span className="sb-status">FULL TIME</span>
          </div>
          <div className="sb-team right">{m.opponent}<Crest name={m.opponent} side="them" size={3} /></div>
        </div>
        <div className="sb-scorers">
          <ul>
            {[...byScorer].map(([n, mins]) => (
              <li key={n}><BallIcon className="ball" />{n} {mins.map(minute).join(", ")}</li>
            ))}
          </ul>
          <span />
          <ul className="right">
            {theirs.length ? <li>{theirs.map((g) => minute(g.minute)).join(", ")}<BallIcon className="ball" /></li> : null}
          </ul>
        </div>
      </div>
      {children}
    </section>
  );
}

export function ResultRow({ m, team }: { m: Pick<Match, "id" | "date" | "opponent" | "competition" | "score" | "result">; team: Site["team"] }) {
  return (
    <Link className="result-row" href={`/matches/${m.id}/`}>
      <span className="muted small">{shortDate(m.date)}</span>
      <span>
        <span className="opp" style={{ fontWeight: 650 }}>{team.short} vs {m.opponent}</span>
        <span className="muted small comp" style={{ display: "block" }}>{m.competition}</span>
      </span>
      <span className="score">{m.score.us}–{m.score.them}</span>
      <span className={`pill ${m.result}`} aria-label={{ W: "Win", L: "Loss", D: "Draw" }[m.result]}>{m.result}</span>
    </Link>
  );
}

export function PlayerOfTheMatch({ line, player }: { line: MatchPlayer; player: Player | undefined }) {
  const s = line.stats;
  const facts = [
    s.goals ? `${s.goals} goal${s.goals > 1 ? "s" : ""}` : null,
    s.assists ? `${s.assists} assist${s.assists > 1 ? "s" : ""}` : null,
    s.tackles_won + s.interceptions ? `${s.tackles_won + s.interceptions} balls won` : null,
    s.passes_attempted ? `${s.passes}/${s.passes_attempted} passes` : null,
    line.running.distance_km ? `${fmt(line.running.distance_km, 1)} km` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="spotlight">
      <div className="photo" style={{ backgroundImage: player?.photo ? `url(${player.photo})` : undefined }} role="img" aria-label={player?.name ?? ""} />
      <div>
        <p className="kicker">Player of the match</p>
        <h3>{player ? <Link href={`/players/${player.slug}/`} style={{ textDecoration: "none" }}>{player.name}</Link> : "–"}</h3>
        <Rating value={line.rating} large />
        <div className="chips">{facts.map((f) => <span className="chip" key={f}>{f}</span>)}</div>
      </div>
    </div>
  );
}

export function TopPerformers({ m, people }: { m: Match; people: Map<number, Player> }) {
  return (
    <ol className="feed" style={{ listStyle: "none" }}>
      {m.players.filter((p) => p.rating !== null).slice(0, 5).map((p, i) => (
        <li key={p.id} style={{ gridTemplateColumns: "1.4rem 1fr auto", alignItems: "center" }}>
          <span className="num">{i + 1}</span>
          <PlayerLine player={people.get(p.id)} sub={`${fmt(p.minutes)} min · ${p.stats.goals} G · ${p.stats.assists} A`} />
          <Rating value={p.rating} />
        </li>
      ))}
    </ol>
  );
}

type Leader = { title: string; value: (r: SeasonRow) => number | null; show: (v: number) => string; min?: (r: SeasonRow) => boolean };

export const LEADERS: Leader[] = [
  { title: "Average rating", value: (r) => r.avg_rating, show: (v) => v.toFixed(1) },
  { title: "Goals", value: (r) => r.goals, show: (v) => String(v) },
  { title: "Assists", value: (r) => r.assists, show: (v) => String(v) },
  { title: "Balls won", value: (r) => r.tackles_won + r.interceptions, show: (v) => String(v) },
  { title: "Distance covered", value: (r) => r.distance_km, show: (v) => `${v.toFixed(1)} km` },
  { title: "Pass accuracy", value: (r) => r.pass_pct, show: (v) => `${Math.round(v)}%`, min: (r) => r.passes_attempted >= 5 },
];

export function Leaders({ rows, people, top = 3 }: { rows: SeasonRow[]; people: Map<number, Player>; top?: number }) {
  return (
    <div className="leaders">
      {LEADERS.map((l) => {
        const list = rows.filter((r) => (l.min ? l.min(r) : true) && (l.value(r) ?? 0) > 0)
          .sort((a, b) => (l.value(b) ?? 0) - (l.value(a) ?? 0)).slice(0, top);
        return (
          <section className="panel leader" key={l.title}>
            <div className="panel-head"><h3>{l.title}</h3></div>
            {list.length ? (
              <ol>
                {list.map((r) => (
                  <li key={r.player_id}>
                    <PlayerLine player={people.get(r.player_id)} sub={r.number !== null ? `#${r.number}` : undefined} />
                    <span className="val">{l.show(l.value(r) ?? 0)}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="muted small">Nobody yet.</p>}
          </section>
        );
      })}
    </div>
  );
}
