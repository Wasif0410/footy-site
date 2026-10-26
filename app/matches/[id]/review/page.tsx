import type { Metadata } from "next";
import { Suspense } from "react";
import { Review } from "@/components/review";
import { SectionHead } from "@/components/ui";
import { match, players } from "@/lib/data";

export const metadata: Metadata = { title: "Watch" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Watch the match"
          note="As our system sees it: every player boxed and named (green when the team named them, amber for a best guess), the ball in orange, and each moment as it happens." />
        {m.screens.length ? (
          <Suspense fallback={<p className="muted">Loading the match…</p>}>
            <Review screens={m.screens} moments={m.timeline} players={players()} lineup={m.lineup} periods={m.periods}
              frame={m.frame} video={m.video} pitch={m.pitch} opponent={m.opponent} />
          </Suspense>
        ) : <p className="muted">The video for this match isn&apos;t ready yet.</p>}
      </section>
    </div>
  );
}
