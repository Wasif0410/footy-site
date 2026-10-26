"use client";
// The play-by-play: every moment that counts, labelled by kind (as the app labels them), with
// "key moments" or "everything", a player filter, and a link to watch each one.
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Moment, Player } from "@/lib/data";
import { describe, KEY_KINDS, minute, tone } from "@/lib/format";
import { KindTag } from "./ui";

export function Feed({ moments, players, opponent, matchId }: { moments: Moment[]; players: Player[]; opponent: string; matchId: string }) {
  const [all, setAll] = useState(false);
  const [who, setWho] = useState("");
  const involved = useMemo(() => {
    const ids = new Set<number>();
    moments.forEach((m) => [m.from, m.to].forEach((w) => { if (w?.id) ids.add(w.id); }));
    return players.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [moments, players]);
  const shown = moments.filter((m) => (all || KEY_KINDS.has(m.kind)) && (!who || m.from?.id === Number(who) || m.to?.id === Number(who)));
  return (
    <div>
      <div className="filters">
        <span className="seg" role="group" aria-label="Which moments">
          <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>Key moments</button>
          <button type="button" aria-pressed={all} onClick={() => setAll(true)}>Everything</button>
        </span>
        <select aria-label="Player" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">All players</option>
          {involved.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="muted small">{shown.length} moments</span>
      </div>
      <ol className="feed">
        {shown.map((m, i) => (
          <li key={`${m.t}-${i}`} className={`${tone(m)}${m.kind === "goal" ? " goal" : ""}`}>
            <span className="m">{minute(m.minute)}</span>
            <span className="kind-cell"><KindTag kind={m.kind} /></span>
            <span className="text">{describe(m, opponent)}{m.checked ? <span className="tick">checked</span> : m.claude ? <span className="tick">checked by Claude</span> : null}</span>
            <Link className="watch" href={`/matches/${matchId}/review/?t=${m.t}`}>Watch</Link>
          </li>
        ))}
      </ol>
      {!shown.length ? <p className="muted" style={{ paddingTop: "1rem" }}>Nothing here for that player.</p> : null}
    </div>
  );
}
