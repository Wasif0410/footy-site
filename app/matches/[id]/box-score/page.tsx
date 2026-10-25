import type { Metadata } from "next";
import { SortTable, type Column, type Row } from "@/components/sort-table";
import { PlayerLine, Rating } from "@/components/ui";
import { match, playerById } from "@/lib/data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Box score" };

const COLUMNS: Column[] = [
  { key: "player", label: "Player", numeric: false },
  { key: "rating", label: "Rating" },
  { key: "min", label: "Min", title: "Minutes on the pitch" },
  { key: "g", label: "G", title: "Goals" },
  { key: "a", label: "A", title: "Assists" },
  { key: "passes", label: "Passes", title: "Completed / attempted" },
  { key: "pass_pct", label: "Pass %" },
  { key: "fwd", label: "Fwd", title: "Forward passes" },
  { key: "sh", label: "Shots", title: "Shots (on target)" },
  { key: "tkl", label: "Tkl", title: "Tackles won" },
  { key: "int", label: "Int", title: "Interceptions" },
  { key: "lost", label: "Lost", title: "Times we lost the ball" },
  { key: "touch", label: "Touches" },
  { key: "runs", label: "Runs", title: "Runs with the ball (8 m+ forward)" },
  { key: "km", label: "Km", title: "Distance covered" },
  { key: "top", label: "Top km/h", title: "Top speed" },
  { key: "spr", label: "Sprints" },
];

export default async function BoxScore({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  const rows: Row[] = m.players.map((p) => {
    const s = p.stats, r = p.running, who = people.get(p.id);
    return {
      id: p.id,
      cells: {
        player: <PlayerLine player={who} sub={who?.number !== null && who?.number !== undefined ? `#${who.number}` : undefined} />,
        rating: <Rating value={p.rating} />, min: fmt(p.minutes), g: s.goals, a: s.assists,
        passes: `${s.passes}/${s.passes_attempted}`, pass_pct: pct(s.pass_pct), fwd: s.passes_forward,
        sh: `${s.shots} (${s.shots_on_target})`, tkl: s.tackles_won, int: s.interceptions, lost: s.turnovers,
        touch: s.touches, runs: s.carries_forward, km: fmt(r.distance_km, 2), top: fmt(r.top_speed_kmh, 1), spr: r.sprints ?? "–",
      },
      sort: {
        player: who?.name ?? "", rating: p.rating, min: p.minutes, g: s.goals, a: s.assists, passes: s.passes,
        pass_pct: s.passes_attempted ? s.pass_pct : null, fwd: s.passes_forward, sh: s.shots, tkl: s.tackles_won,
        int: s.interceptions, lost: s.turnovers, touch: s.touches, runs: s.carries_forward, km: r.distance_km,
        top: r.top_speed_kmh, spr: r.sprints,
      },
    };
  });
  return (
    <section className="panel">
      <div className="panel-head"><h2>Box score</h2><span className="muted small">Click a column to sort</span></div>
      <SortTable columns={COLUMNS} rows={rows} initial="rating"
        caption="Running is measured from the video while a player is in shot and scaled to their minutes." />
    </section>
  );
}
