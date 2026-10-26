// Larger pieces shared by several pages: the match header, a result row, leader boards.
import Link from "next/link";
import type { Match, MatchSummary, Player, Site } from "@/lib/data";
import { longDate, minute, shortDate } from "@/lib/format";
import type { Board, SeasonPlayer } from "@/lib/season";
import { BOARDS, leaders } from "@/lib/season";
import { Shirt } from "./ui";

const unfound = (n: number) => (n ? `${n} unable to find` : null);

export function MatchHead({ m, team }: { m: Match; team: Site["team"] }) {
  const won = m.score.us > m.score.them, lost = m.score.us < m.score.them;
  // scorers grouped as a broadcast lists them: "Aryan 10', 15'"
  const byScorer = new Map<string, number[]>();
  m.goals.filter((g) => g.team === 0).forEach((g) => {
    const n = g.scorer?.name ?? "Unknown scorer";
    byScorer.set(n, [...(byScorer.get(n) ?? []), g.minute]);
  });
  const ours = [...[...byScorer].map(([n, mins]) => `${n} ${mins.map(minute).join(", ")}`), unfound(m.goals_missing.us)].filter(Boolean);
  const theirs = [m.goals.filter((g) => g.team === 1).map((g) => minute(g.minute)).join(", "), unfound(m.goals_missing.them)].filter(Boolean);
  return (
    <section className="match-head">
      <div className="wrap">
        <p className="meta">{[m.competition, longDate(m.date), m.venue].filter(Boolean).join(", ")}</p>
        <div className="scoreline">
          <span className="team">{team.name}</span>
          <span className="score" aria-label={`${team.name} ${m.score.us}, ${m.opponent} ${m.score.them}`}>
            <span className={lost ? "lose" : ""}>{m.score.us}</span>
            <span className="sep">–</span>
            <span className={won ? "lose" : ""}>{m.score.them}</span>
          </span>
          <span className="team them">{m.opponent}</span>
        </div>
        <p className="ft">FULL TIME</p>
        <div className="scorers">
          <span>{ours.join("; ")}</span>
          <span className="them">{theirs.join("; ")}</span>
        </div>
      </div>
    </section>
  );
}

export function ResultRow({ m, team }: { m: MatchSummary; team: Site["team"] }) {
  const inner = (
    <>
      <span className="date">{m.date ? shortDate(m.date) : m.stats ? "Date TBC" : "–"}</span>
      <span className="vs">{team.name} v {m.opponent}<small>{[m.competition, m.venue].filter(Boolean).join(", ")}</small></span>
      {m.stats ? <span className="score">{m.score ? `${m.score.us}–${m.score.them}` : "–"}</span>
        : <span className="nostat">{m.score ? `${m.score.us}–${m.score.them}, ` : ""}Not recorded</span>}
      <span className={`outcome ${m.result}`} aria-label={{ W: "Win", L: "Loss", D: "Draw" }[m.result]}>{m.result}</span>
    </>
  );
  return <li>{m.stats ? <Link className="result" href={`/matches/${m.id}/`}>{inner}</Link> : <div className="result nostats">{inner}</div>}</li>;
}

// A player's face (their photo from the video), or their shirt when there's no photo.
export function Face({ player, size = "sm" }: { player: Player | undefined; size?: "sm" | "lg" }) {
  if (!player?.photo) return <span className={`face ${size} none`}><Shirt number={player?.number} size={size === "lg" ? "lg" : "sm"} /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`face ${size}`} src={player.photo} alt="" loading="lazy" />;
}

// Leader boards, one box each: the leader up top with their photo, then the chasing pack.
export function Boards({ rows, people, boards = BOARDS, keys, top = 3 }: {
  rows: SeasonPlayer[]; people: Map<number, Player>; boards?: Board[]; keys?: string[]; top?: number;
}) {
  const list = keys ? keys.map((k) => boards.find((b) => b.key === k)).filter((b): b is Board => !!b) : boards;
  return (
    <div className="boards">
      {list.map((b) => {
        const best = leaders(b, rows, top);
        const first = best[0], lead = first ? people.get(first.p.id) : undefined;
        return (
          <section className="board" key={b.key}>
            <header>
              <h3>{b.title}</h3>
              {b.note ? <p className="bnote">{b.note}</p> : null}
            </header>
            {first && lead ? (
              <Link className="leader" href={`/players/${lead.slug}/`}>
                <Face player={lead} size="lg" />
                <span className="who-lead">
                  <span className="no">{lead.number ?? ""}</span>
                  <strong>{lead.name}</strong>
                </span>
                <span className="big">{b.show(first.v)}</span>
              </Link>
            ) : <p className="empty">Nobody yet.</p>}
            {best.length > 1 ? (
              <ol start={2}>
                {best.slice(1).map(({ p, v }, i) => {
                  const pl = people.get(p.id);
                  return (
                    <li key={p.id}>
                      <span className="pos">{i + 2}</span>
                      {pl ? (
                        <Link className="row-who" href={`/players/${pl.slug}/`}><Face player={pl} /><span className="name">{pl.name}</span></Link>
                      ) : <span className="row-who">?</span>}
                      <span className="v">{b.show(v)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
