import type { Metadata } from "next";
import { RatingsBoard } from "@/components/ratings-board";
import Link from "next/link";
import { SectionHead } from "@/components/ui";
import { match, players, site } from "@/lib/data";
import { mmss } from "@/lib/format";

export const metadata: Metadata = { title: "Ratings" };

export default async function Ratings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const f = m.rating_formula ?? site().rating_formula;
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Ratings"
          note={f ? (f.compare === "fair7"
            ? `Each game stands alone. Everyone starts from ${f.baseline.toFixed(1)} and is judged on their points against what's expected for the minutes they played: `
              + `the team's own rate for a fair share of ${mmss((f.fair_share_min ?? 0) * 60)}, and ${f.over_share ?? 1.5}× as much for every minute past it. `
              + `Goals count by position (Fantasy Premier League's 6 / 5 / 4), and everyone on the pitch gets +${f.team_goal_for ?? 0.5} when we score and −${Math.abs(f.team_goal_against ?? -0.5)} when they do.`
            : f.compare === "fixed"
            ? `Every action is worth points: good ones add, mistakes take away. Everyone starts from ${f.baseline.toFixed(1)}, and a teammate's goals don't pull anyone down.`
            : `Every action is worth points: good ones add, mistakes take away. Each player's points are compared with what the team's average player makes in the same time, and a player who keeps up the average gets ${f.baseline.toFixed(1)}.`) : undefined}
          more={{ href: "/about/#ratings", label: "How ratings work" }} />
        {m.review.players_checked ? (
          <p className="note" style={{ marginTop: 0, marginBottom: "1rem" }}>
            Claude followed {m.review.players_checked} of our players through every moment the ball came near them.{" "}
            <Link className="more" href="/about/#checks">How these were checked</Link>
          </p>
        ) : m.review.waiting ? (
          <p className="note" style={{ marginTop: 0, marginBottom: "1rem" }}>
            {m.review.waiting} of our moments are still waiting for a check and don&apos;t count in anyone&apos;s rating yet, so these ratings will
            move as they&apos;re checked.
          </p>
        ) : null}
        {f ? <RatingsBoard rows={m.players} people={players()} formula={f} matchId={id} periods={m.periods} potm={m.potm} />
          : <p className="muted">Ratings aren&apos;t available for this match.</p>}
      </section>
    </div>
  );
}
