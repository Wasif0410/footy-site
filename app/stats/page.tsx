import type { Metadata } from "next";
import { Leaders } from "@/components/blocks";
import { SortTable, type Column, type Row } from "@/components/sort-table";
import { PlayerLine, Rating } from "@/components/ui";
import { playerById, season } from "@/lib/data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Stats" };

const COLUMNS: Column[] = [
  { key: "player", label: "Player", numeric: false },
  { key: "mp", label: "MP", title: "Matches played" },
  { key: "min", label: "Min" },
  { key: "rating", label: "Avg rating" },
  { key: "best", label: "Best" },
  { key: "g", label: "G" },
  { key: "a", label: "A" },
  { key: "passes", label: "Passes" },
  { key: "pass_pct", label: "Pass %" },
  { key: "sh", label: "Shots" },
  { key: "tkl", label: "Tkl", title: "Tackles won" },
  { key: "int", label: "Int", title: "Interceptions" },
  { key: "lost", label: "Lost", title: "Times lost the ball" },
  { key: "km", label: "Km" },
];

export default function Stats() {
  const people = playerById();
  const rows: Row[] = season().map((r) => ({
    id: r.player_id,
    cells: {
      player: <PlayerLine player={people.get(r.player_id)} sub={r.number !== null ? `#${r.number}` : undefined} />,
      mp: r.matches, min: fmt(r.minutes), rating: <Rating value={r.avg_rating} />, best: fmt(r.best_rating, 1),
      g: r.goals, a: r.assists, passes: `${r.passes}/${r.passes_attempted}`, pass_pct: pct(r.pass_pct),
      sh: `${r.shots} (${r.shots_on_target})`, tkl: r.tackles_won, int: r.interceptions, lost: r.turnovers,
      km: fmt(r.distance_km, 1),
    },
    sort: {
      player: r.name, mp: r.matches, min: r.minutes, rating: r.avg_rating, best: r.best_rating, g: r.goals, a: r.assists,
      passes: r.passes, pass_pct: r.passes_attempted ? r.pass_pct : null, sh: r.shots, tkl: r.tackles_won,
      int: r.interceptions, lost: r.turnovers, km: r.distance_km,
    },
  }));
  return (
    <main className="wrap">
      <h1 style={{ fontSize: "2.4rem", marginBottom: "1.25rem" }}>Season stats</h1>
      <Leaders rows={season()} people={people} top={5} />
      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head"><h2>Every player</h2><span className="muted small">Click a column to sort</span></div>
        <SortTable columns={COLUMNS} rows={rows} initial="rating" caption="Only moments checked by the team or that the system is sure of count." />
      </section>
    </main>
  );
}
