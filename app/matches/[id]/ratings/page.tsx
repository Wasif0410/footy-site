import type { Metadata } from "next";
import { RatingsBoard } from "@/components/ratings-board";
import { SectionHead } from "@/components/ui";
import { match, players, site } from "@/lib/data";

export const metadata: Metadata = { title: "Ratings" };

export default async function Ratings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const f = site().rating_formula;
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Ratings"
          note={f ? `Every action is worth points: good ones add, mistakes take away. Each player's points are compared with what the team's average player makes in the same time, and a player who keeps up the average gets ${f.baseline.toFixed(1)}.` : undefined}
          more={{ href: "/about/", label: "How ratings work" }} />
        {m.review.waiting ? (
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
