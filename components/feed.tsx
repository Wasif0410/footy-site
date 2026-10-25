"use client";
// The play-by-play, newest-first or in order, with "key moments" / "everything" and a player filter.
import { useMemo, useState } from "react";
import type { Moment, Player } from "@/lib/data";
import { describe, KEY_KINDS, minute, tone } from "@/lib/format";
import { KindIcon } from "./ui";

export function Feed({ moments, players, opponent }: { moments: Moment[]; players: Player[]; opponent: string }) {
  const [all, setAll] = useState(false);
  const [who, setWho] = useState<string>("");
  const involved = useMemo(() => {
    const ids = new Set<number>();
    moments.forEach((m) => [m.from, m.to].forEach((w) => { if (w?.id) ids.add(w.id); }));
    return players.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [moments, players]);
  const shown = moments.filter((m) => (all || KEY_KINDS.has(m.kind))
    && (!who || m.from?.id === Number(who) || m.to?.id === Number(who)));
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
          <li key={i} className={`${tone(m)}${m.kind === "goal" ? " goal" : ""}`}>
            <span className="min">{minute(m.minute)}</span>
            <span className="icon"><KindIcon kind={m.kind} /></span>
            <span>
              <span className="text">{describe(m, opponent)}</span>
              {m.checked ? <span className="meta"> · checked</span> : null}
            </span>
            {m.clip ? <a className="small" href={m.clip.src} target="_blank" rel="noreferrer">Watch</a> : <span />}
          </li>
        ))}
      </ol>
      {!shown.length ? <p className="muted">Nothing here for that player.</p> : null}
    </div>
  );
}
