import type { Metadata } from "next";
import Link from "next/link";
import { SortTable, type Column, type Row } from "@/components/sort-table";
import { Rating, SectionHead, Who } from "@/components/ui";
import { playerById } from "@/lib/data";
import { fmt, pct, signed } from "@/lib/format";
import { seasonPlayers } from "@/lib/season";

export const metadata: Metadata = { title: "Stats" };

const COLUMNS: Column[] = [
  { key: "player", label: "Player", numeric: false },
  { key: "mp", label: "Played", title: "Matches played" },
  { key: "min", label: "Min", title: "Minutes on the pitch" },
  { key: "rating", label: "Average", group: "Rating" },
  { key: "best", label: "Best", group: "Rating" },
  { key: "g", label: "Goals", group: "Attack" },
  { key: "a", label: "Assists", group: "Attack" },
  { key: "sh", label: "Shots", group: "Attack" },
  { key: "pc", label: "Made", title: "Passes completed", group: "Passing" },
  { key: "pp", label: "Accuracy", group: "Passing" },
  { key: "tk", label: "Tackles", title: "Tackles won", group: "Defending" },
  { key: "in", label: "Interceptions", group: "Defending" },
  { key: "to", label: "Touches", group: "On the ball" },
  { key: "lo", label: "Lost it", title: "Passes cut out, tackled or ball out of play", group: "Mistakes" },
  { key: "mk", label: "Points lost", title: "Rating points lost to mistakes", group: "Mistakes" },
  { key: "km", label: "Distance", group: "Running" },
  { key: "ts", label: "Top speed", title: "Fastest speed held for a full second", group: "Running" },
  { key: "sp", label: "Sprints", group: "Running" },
];

export default function Stats() {
  const people = playerById();
  const season = seasonPlayers();
  const rows: Row[] = season.map((r) => ({
    id: r.id,
    cells: {
      player: <Who player={people.get(r.id)} />, mp: r.played, min: fmt(r.playedMin),
      rating: <Rating value={r.avgRating} />, best: fmt(r.bestRating, 1),
      g: r.goals, a: r.assists, sh: `${r.shots} (${r.shotsOnTarget})`, pc: `${r.passes}/${r.passesAttempted}`,
      pp: r.passesAttempted ? pct(r.passPct) : "–", tk: r.tackles, in: r.interceptions, to: r.touches,
      lo: r.turnovers, mk: r.mistakePoints ? signed(r.mistakePoints) : "0",
      km: `${fmt(r.distanceKm, 1)} km`, ts: r.topSpeed ? `${r.topSpeed.toFixed(1)} km/h` : "–", sp: r.sprints,
    },
    sort: {
      player: people.get(r.id)?.name ?? "", mp: r.played, min: r.playedMin, rating: r.avgRating, best: r.bestRating,
      g: r.goals, a: r.assists, sh: r.shots, pc: r.passes, pp: r.passesAttempted ? r.passPct : null, tk: r.tackles,
      in: r.interceptions, to: r.touches, lo: r.turnovers, mk: -r.mistakePoints, km: r.distanceKm, ts: r.topSpeed, sp: r.sprints,
    },
  }));
  return (
    <main className="wrap page">
      <section className="section">
        <h1>Season stats</h1>
        <p className="lede" style={{ marginTop: "0.6rem" }}>
          Every player&apos;s season in one table. For who leads on each measure, see the <Link className="more" href="/leaderboards/">leaderboards</Link>.
        </p>
      </section>
      <section className="section">
        <SectionHead title="Every player" note="Click any heading to sort by it." />
        <SortTable columns={COLUMNS} rows={rows} initial="rating"
          caption="Only moments the system is sure of, or that were checked one by one, are counted. Running is measured while a player is in shot and scaled to their minutes." />
      </section>
    </main>
  );
}
