import type { Metadata } from "next";
import { SortTable, type Column, type Row } from "@/components/sort-table";
import { Rating, SectionHead, Who } from "@/components/ui";
import { match, playerById } from "@/lib/data";
import { fmt, mmss, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Player stats" };

const COLUMNS: Column[] = [
  { key: "player", label: "Player", numeric: false },
  { key: "min", label: "Min", title: "Minutes on the pitch" },
  { key: "rating", label: "Rating" },
  { key: "g", label: "Goals", group: "Attack" },
  { key: "a", label: "Assists", group: "Attack" },
  { key: "sh", label: "Shots", group: "Attack" },
  { key: "sot", label: "On target", group: "Attack" },
  { key: "pc", label: "Made", title: "Passes completed", group: "Passing" },
  { key: "pa", label: "Tried", title: "Passes attempted", group: "Passing" },
  { key: "pp", label: "Accuracy", group: "Passing" },
  { key: "pf", label: "Forward", title: "Passes played forward", group: "Passing" },
  { key: "rc", label: "Received", title: "Passes received", group: "Passing" },
  { key: "tk", label: "Tackles", title: "Tackles won", group: "Defending" },
  { key: "in", label: "Interceptions", group: "Defending" },
  { key: "to", label: "Touches", group: "On the ball" },
  { key: "ps", label: "Time", title: "Time on the ball", group: "On the ball" },
  { key: "ru", label: "Runs", title: "Runs with the ball, 8 m or more forward", group: "On the ball" },
  { key: "lo", label: "Lost it", title: "Passes cut out, tackled or ball out of play", group: "Mistakes" },
  { key: "dp", label: "Tackled", title: "Times tackled and lost the ball", group: "Mistakes" },
  { key: "wt", label: "Waiting", title: "Moments still waiting for a check: not counted in these numbers yet", group: "Not counted yet" },
];

export default async function PlayerStats({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  const rows: Row[] = m.players.map((p) => {
    const s = p.stats, who = people.get(p.id);
    return {
      id: p.id,
      cells: {
        player: <Who player={who} />, min: fmt(p.minutes), rating: <Rating value={p.rating} />,
        g: s.goals, a: s.assists, sh: s.shots, sot: s.shots_on_target,
        pc: s.passes, pa: s.passes_attempted, pp: s.passes_attempted ? pct(s.pass_pct) : "–", pf: s.passes_forward, rc: s.receptions,
        tk: s.tackles_won, in: s.interceptions, to: s.touches, ps: mmss(s.possession_s), ru: s.carries_forward,
        lo: s.turnovers, dp: s.dispossessed, wt: p.waiting || <span className="muted">0</span>,
      },
      sort: {
        player: who?.name ?? "", min: p.minutes, rating: p.rating, g: s.goals, a: s.assists, sh: s.shots, sot: s.shots_on_target,
        pc: s.passes, pa: s.passes_attempted, pp: s.passes_attempted ? s.pass_pct : null, pf: s.passes_forward, rc: s.receptions,
        tk: s.tackles_won, in: s.interceptions, to: s.touches, ps: s.possession_s, ru: s.carries_forward,
        lo: s.turnovers, dp: s.dispossessed, wt: p.waiting,
      },
    };
  });
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Player stats" note="Everything each player did in this match, grouped by what it is. Click any heading to sort by it. Running is on the Movement tab." />
        <SortTable columns={COLUMNS} rows={rows} initial="rating"
          caption="Only moments the system is sure of, or that were checked one by one, are counted. A goal counts as a shot on target." />
      </section>
    </div>
  );
}
