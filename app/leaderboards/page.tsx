import type { Metadata } from "next";
import { Boards } from "@/components/blocks";
import { SectionHead } from "@/components/ui";
import { matches, playerById } from "@/lib/data";
import { BOARDS, seasonPlayers } from "@/lib/season";

export const metadata: Metadata = { title: "Leaderboards" };

export default function Leaderboards() {
  const people = playerById();
  const rows = seasonPlayers(matches());
  return (
    <main className="wrap page titleless">
      <h1 className="sr-only">Leaderboards</h1>
      <section className="section">
        <SectionHead title="The numbers" />
        <Boards rows={rows} people={people} boards={BOARDS} top={5} />
      </section>
    </main>
  );
}
