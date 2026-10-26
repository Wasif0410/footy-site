"use client";
// Running, as the app's Movement tab shows it: distance, pace, top speed and sprints for everyone,
// and beside the table the picked player's heatmap. On a phone the heatmap slides up over the page.
import { useEffect, useMemo, useState } from "react";
import type { MatchPlayer, Player } from "@/lib/data";
import { fmt, mmss } from "@/lib/format";
import { Bar, Pitch, Shirt } from "./ui";

type Key = "distance" | "pace" | "top" | "sprints" | "tracked";

export function MovementBoard({ rows, people, pitch }: { rows: MatchPlayer[]; people: Player[]; pitch: [number, number] }) {
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const withMaps = rows.filter((r) => r.heat);
  const [selected, setSelected] = useState<number | undefined>(
    [...withMaps].sort((a, b) => b.running.distance_km - a.running.distance_km)[0]?.id);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "distance", dir: -1 });

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const value: Record<Key, (r: MatchPlayer) => number> = {
    distance: (r) => r.running.distance_km || -Infinity, pace: (r) => r.running.pace_m_min ?? -Infinity,
    top: (r) => r.running.top_speed_kmh ?? -Infinity, sprints: (r) => r.running.sprints ?? -Infinity,
    tracked: (r) => r.running.tracked_s,
  };
  const sorted = [...rows].sort((a, b) => (value[sort.key](a) - value[sort.key](b)) * sort.dir);
  const maxKm = Math.max(0.1, ...rows.map((r) => r.running.distance_km || 0));
  const head = (key: Key, label: string, title?: string) => (
    <th scope="col" title={title} aria-sort={sort.key === key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
      <button type="button" onClick={() => setSort(sort.key === key ? { key, dir: (sort.dir * -1) as 1 | -1 } : { key, dir: -1 })}>{label}</button>
    </th>
  );
  const pick = (id: number) => { setSelected(id); setOpen(true); };
  const r = rows.find((x) => x.id === selected);
  const p = r ? byId.get(r.id) : undefined;
  const maxCell = r?.heat ? Math.max(...r.heat.flat()) : 0;

  return (
    <div className="board-split">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left" }}>Player</th>
              {head("distance", "Distance", "Pace while tracked, times time on the pitch")}
              {head("pace", "Pace", "Metres a minute while tracked")}
              {head("top", "Top speed", "Fastest speed held for a full second")}
              {head("sprints", "Sprints")}
              {head("tracked", "Tracked", "Time the camera had them named")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((x) => {
              const who = byId.get(x.id), run = x.running;
              return (
                <tr key={x.id} className={x.heat ? "pick" : undefined} tabIndex={x.heat ? 0 : undefined} aria-selected={x.id === selected}
                  onClick={x.heat ? () => pick(x.id) : undefined}
                  onKeyDown={x.heat ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(x.id); } } : undefined}>
                  <td style={{ textAlign: "left" }}><span className="who"><Shirt number={who?.number} size="sm" /><span className="name">{who?.name ?? "?"}</span></span></td>
                  <td>
                    {run.distance_km ? (
                      <span className="rate-cell"><Bar value={run.distance_km} max={maxKm} tone="up" /><b>{run.distance_km.toFixed(2)} km</b></span>
                    ) : <span className="muted">–</span>}
                  </td>
                  <td>{run.pace_m_min ? `${Math.round(run.pace_m_min)} m/min` : "–"}</td>
                  <td>{run.top_speed_kmh ? `${run.top_speed_kmh.toFixed(1)} km/h` : "–"}</td>
                  <td>{run.sprints ?? "–"}</td>
                  <td className="muted">{mmss(run.tracked_s)} of {mmss(x.minutes * 60)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="note">
          Players are measured while the camera has them named, so distance is their pace while tracked times their time on the pitch
          (warm-up and half-time left out). Top speed is the fastest held for a full second. Pick a player to see where they played.
        </p>
      </div>
      {open ? <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" /> : null}
      <aside className={`side${open ? " open" : ""}`} aria-label="Where they played">
        <button type="button" className="close linkish" onClick={() => setOpen(false)}>Close</button>
        {r && r.heat ? (
          <div className="side-body" key={r.id}>
            <div className="side-head">
              <Shirt number={p?.number} size="lg" />
              <div><h3>{p?.name ?? "Player"}</h3><p>Where they played, we attack to the right</p></div>
              <span />
            </div>
            <div style={{ marginTop: "1rem" }}><Pitch size={pitch} heat={r.heat} label={`${p?.name ?? "Player"}'s heatmap`} /></div>
            <div className="heat-ramp"><span>Less time</span><span className="r" /><span>More (up to {mmss(maxCell)} in one area)</span></div>
            <div className="figures" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "1.2rem" }}>
              <div><b>{fmt(r.running.distance_km, 2)}<small>km</small></b><span>Distance</span></div>
              <div><b>{fmt(r.running.top_speed_kmh, 1)}<small>km/h</small></b><span>Top speed</span></div>
              <div><b>{r.running.sprints ?? "–"}</b><span>Sprints</span></div>
              <div><b>{r.running.pace_m_min ? Math.round(r.running.pace_m_min) : "–"}<small>m/min</small></b><span>Pace</span></div>
            </div>
          </div>
        ) : <p className="muted">Pick a player to see where they played.</p>}
      </aside>
    </div>
  );
}
