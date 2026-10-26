import type { Metadata } from "next";
import { Feed } from "@/components/feed";
import { SectionHead } from "@/components/ui";
import { match, players } from "@/lib/data";

export const metadata: Metadata = { title: "Play-by-play" };

export default async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Play-by-play" note="Every moment that counts in the stats. Watch any of them on the match video." />
        <Feed moments={m.timeline} players={players()} opponent={m.opponent} matchId={id} />
      </section>
    </div>
  );
}
