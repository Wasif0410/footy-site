import type { Metadata } from "next";
import { Feed } from "@/components/feed";
import { match, players } from "@/lib/data";

export const metadata: Metadata = { title: "Play-by-play" };

export default async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  return (
    <section className="panel">
      <div className="panel-head"><h2>Play-by-play</h2><span className="muted small">Every moment that counts in the stats</span></div>
      <Feed moments={m.timeline} players={players()} opponent={m.opponent} />
    </section>
  );
}
