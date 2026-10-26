import type { Metadata } from "next";
import { MovementBoard } from "@/components/movement-board";
import { Pitch, SectionHead } from "@/components/ui";
import { match, playerById, players } from "@/lib/data";

export const metadata: Metadata = { title: "Movement" };

export default async function Movement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const people = playerById();
  const placed = m.players.filter((p) => p.avg);
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Movement" note="How far, how fast and where each player ran." />
        <MovementBoard rows={m.players} people={players()} pitch={m.pitch} />
      </section>
      <section className="section">
        <SectionHead title="Average positions" note="Where each player spent their time on average, by shirt number. We attack to the right in both halves." />
        <div style={{ maxWidth: "52rem" }}>
          <Pitch size={m.pitch} label="Each player's average position"
            dots={placed.map((p) => ({ x: p.avg![0], y: p.avg![1], text: String(people.get(p.id)?.number ?? ""), fill: "#fff", ring: "var(--club)", r: 1.5 }))} />
        </div>
      </section>
    </div>
  );
}
