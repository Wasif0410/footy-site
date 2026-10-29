"use client";
// The match's ratings as the app's Ratings tab shows them: everyone ranked, and beside the table the
// picked player's points sheet. Every line opens to the moments behind it, each with a link to watch
// it; then how the points become the rating. On a phone the sheet slides up over the page.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Formula, MatchPlayer, Player, RatingLine } from "@/lib/data";
import { fmt, matchClock, mmss, signed } from "@/lib/format";
import { Bar, Rating, Shirt } from "./ui";

type Key = "rating" | "played" | "points" | "mistakes" | "per_hour";

const mistakes = (p: MatchPlayer) => {
  const bad = p.breakdown.filter((b) => b.each < 0);
  return { n: bad.reduce((a, b) => a + b.count, 0), pts: bad.reduce((a, b) => a + b.points, 0) };
};

const countText = (b: RatingLine) => (b.key === "distance_km" ? `${b.count.toFixed(1)} km` : fmt(b.count, b.count % 1 ? 1 : 0));

export function RatingsBoard({ rows, people, formula, matchId, periods, potm }: {
  rows: MatchPlayer[]; people: Player[]; formula: Formula; matchId: string; periods: [number, number][]; potm: number | null;
}) {
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const rated = rows.filter((r) => r.rating !== null);
  const top = Math.max(formula.baseline + 1, ...rated.map((r) => r.rating!));
  // ties on the rating go to whoever was further above the team's average (as the table sorts them)
  const order = (r: MatchPlayer) => r.rating! + (r.above ?? 0) / 1000;
  const rank = new Map([...rated].sort((a, b) => order(b) - order(a)).map((r, i) => [r.id, i + 1]));
  const [selected, setSelected] = useState<number>((rated[0] ?? rows[0])?.id);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "rating", dir: -1 });

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const value: Record<Key, (r: MatchPlayer) => number> = {
    rating: (r) => (r.rating === null ? -Infinity : r.rating + (r.above ?? 0) / 1000),
    played: (r) => r.minutes, points: (r) => r.points ?? -Infinity, mistakes: (r) => mistakes(r).pts,
    per_hour: (r) => r.per_hour ?? -Infinity,
  };
  const sorted = [...rows].sort((a, b) => (value[sort.key](a) - value[sort.key](b)) * sort.dir);
  const head = (key: Key, label: string, title?: string) => (
    <th scope="col" title={title} aria-sort={sort.key === key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
      <button type="button" onClick={() => setSort(sort.key === key ? { key, dir: (sort.dir * -1) as 1 | -1 } : { key, dir: key === "mistakes" ? 1 : -1 })}>
        {label}
      </button>
    </th>
  );
  const pick = (id: number) => { setSelected(id); setOpen(true); };
  const r = rows.find((x) => x.id === selected) ?? rows[0];

  return (
    <div className="board-split">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: "2rem" }}>#</th>
              <th scope="col" style={{ textAlign: "left" }}>Player</th>
              {head("played", "Played")}
              {head("points", "Points", "Points from every action, before comparing with the team")}
              {head("mistakes", "Mistakes", "Passes cut out, tackled, ball out of play: the points they cost")}
              {head("per_hour", "Per hour", "Points per hour named on camera")}
              {head("rating", "Rating")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((x) => {
              const p = byId.get(x.id), mk = mistakes(x);
              return (
                <tr key={x.id} className="pick" tabIndex={0} aria-selected={x.id === selected}
                  onClick={() => pick(x.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(x.id); } }}>
                  <td className="muted">{rank.get(x.id) ?? ""}</td>
                  <td style={{ textAlign: "left" }}>
                    <span className="who"><Shirt number={p?.number} size="sm" />
                      <span><span className="name">{p?.name ?? "?"}</span>
                        {x.id === potm ? <span className="sub">Player of the match</span> : x.keeper ? <span className="sub">Goalkeeper</span> : null}</span>
                    </span>
                  </td>
                  <td>{mmss(x.minutes * 60)}</td>
                  <td>{signed(x.points)}</td>
                  <td>{mk.n ? <><b style={{ color: "var(--down)" }}>{signed(mk.pts)}</b> <span className="muted small">({mk.n})</span></> : <span className="muted">0</span>}</td>
                  <td>{fmt(x.per_hour, 1)}</td>
                  <td>
                    {x.rating !== null ? (
                      <span className="rate-cell"><Bar value={x.rating} max={top} /><Rating value={x.rating} />
                        {x.band ? <span className="band" title="How far the rating could move as its events are checked">±{x.band.toFixed(1)}</span> : null}</span>
                    ) : <span className="muted small">{x.keeper ? "Keeper" : "Too short"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="note">Pick a player to see how their rating adds up. Keepers aren&apos;t rated: the points are for outfield play.</p>
      </div>
      {open ? <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" /> : null}
      <aside className={`side${open ? " open" : ""}`} aria-label="How the rating adds up">
        <button type="button" className="close linkish" onClick={() => setOpen(false)}>Close</button>
        {r ? <Sheet key={r.id} r={r} player={byId.get(r.id)} formula={formula} matchId={matchId} periods={periods} /> : null}
      </aside>
    </div>
  );
}

function Sheet({ r, player, formula: f, matchId, periods }: {
  r: MatchPlayer; player: Player | undefined; formula: Formula; matchId: string; periods: [number, number][];
}) {
  const name = player?.name ?? "This player";
  const named = r.seen_min && r.minutes ? r.seen_min / r.minutes : null;
  const note = r.keeper
    ? "Keepers aren't rated yet: these points are for outfield play. Their counts are still listed."
    : r.rating === null
      ? (r.minutes < f.min_minutes ? `Only ${mmss(r.minutes * 60)} on the pitch. Players need ${f.min_minutes} minutes to be rated.`
        : `Named on camera for only ${mmss((r.judged_min ?? 0) * 60)}: too little seen to rate.`)
      : named !== null && named < 0.5
        ? `The camera had ${name} named for ${mmss((r.seen_min ?? 0) * 60)} of ${mmss(r.minutes * 60)}. The rating is judged on that time only, so the rest counts neither for nor against them.`
        : null;
  const sections = f.sections.length ? f.sections : [...new Set(r.breakdown.map((b) => b.section))];
  return (
    <div className="side-body">
      <div className="side-head">
        <Shirt number={player?.number} size="lg" />
        <div>
          <h3>{name}</h3>
          <p>{mmss(r.minutes * 60)} on the pitch{r.seen_min ? `, named on camera ${mmss(r.seen_min * 60)}` : ""}</p>
        </div>
        <span className="side-rate"><Rating value={r.rating} large />
          {r.rating !== null && r.band ? <span className="band">±{r.band.toFixed(1)}</span> : null}</span>
      </div>
      {note ? <p className="side-note">{note}</p> : null}
      {r.waiting ? <p className="side-note">{r.waiting} of {name}&apos;s moments are still waiting for a check and don&apos;t count yet.</p> : null}
      <h4>How the points add up</h4>
      <p className="muted small">Open a line to see every moment behind it and watch it.</p>
      <div role="table" aria-label={`${name}'s points`}>
        {sections.map((sec) => {
          const lines = r.breakdown.filter((b) => b.section === sec);
          if (!lines.length) return null;
          const total = lines.reduce((a, b) => a + b.points, 0);
          return (
            <div key={sec}>
              <div className={`sheet-sec${sec === "Mistakes" ? " bad" : ""}`}><span>{sec}</span><span>{signed(total)}</span></div>
              {lines.map((b) => {
                const cells = (
                  <>
                    <span className={b.count ? undefined : "zero"}>{b.label}{r.estimated.includes(b.key) ? <span className="muted small"> (team pace)</span> : null}</span>
                    <span className={`c${b.count ? "" : " zero"}`}>{countText(b)}
                      {b.count && b.sure != null && b.sure < 1 ? <span className="sure">{Math.round(b.sure * 100)}% sure</span> : null}</span>
                    <span className="e">{signed(b.each)}</span>
                    <span className={`p${b.points > 0 ? " pos" : b.points < 0 ? " neg" : " zero"}`}>{b.count ? signed(b.points) : "0"}</span>
                  </>
                );
                if (!b.count || !b.moments.length) return <div className="line" key={b.key}><div className="row">{cells}<span /></div></div>;
                return (
                  <details className="line" key={b.key}>
                    <summary>{cells}</summary>
                    <ol>
                      {b.moments.map((m, i) => (
                        <li key={i}>
                          <span className="when">{matchClock(m.t, periods)}</span>
                          <span>{m.text}</span>
                          <Link href={`/matches/${matchId}/review/?t=${m.t}`}>Watch</Link>
                        </li>
                      ))}
                    </ol>
                  </details>
                );
              })}
            </div>
          );
        })}
        <div className="sheet-total"><span>Total</span><span>{signed(r.points)}</span></div>
      </div>
      {r.rating !== null && r.expected !== null && r.above !== null ? (
        <>
          <h4>From points to rating</h4>
          <ol className="sum-list">
            <li>
              <span>{f.judge_on === "named"
                ? `Points in ${mmss((r.judged_min ?? 0) * 60)} named on camera (of ${mmss(r.minutes * 60)} played)`
                : `Points in ${mmss(r.minutes * 60)} on the pitch`}</span>
              <b>{signed(r.points)}</b>
            </li>
            {f.compare === "fixed" ? null : (
              <>
                <li><span>What the team&apos;s average player makes in that time ({f.team_per_hour.toFixed(1)} an hour)</span><b>{signed(r.expected)}</b></li>
                <li><span>Above the average</span><b>{signed(r.above)}</b></li>
              </>
            )}
            <li className="result">
              <span>{f.baseline.toFixed(1)} + {f.spread} × curve({signed(r.above)} ÷ {f.scale})</span>
              <b>{r.rating.toFixed(1)}</b>
            </li>
          </ol>
          <p className="muted small" style={{ marginTop: "0.6rem" }}>
            The curve flattens near the top, so ratings stay between {(f.baseline - f.spread).toFixed(1)} and {(f.baseline + f.spread).toFixed(1)}.
          </p>
        </>
      ) : null}
    </div>
  );
}
