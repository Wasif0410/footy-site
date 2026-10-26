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
    <main className="wrap page">
      <section className="section">
        <h1>Leaderboards</h1>
        <p className="lede" style={{ marginTop: "0.6rem" }}>Who leads the squad on every measure this season.</p>
      </section>
      <section className="section">
        <SectionHead title="The numbers" />
        <Boards rows={rows} people={people} boards={BOARDS} top={5} />
      </section>
    </main>
  );
}
