import type { Metadata } from "next";
import Link from "next/link";
import { UltimateTeam } from "@/components/ultimate-team";
import { chemistryPairs } from "@/lib/chemistry";
import { matches } from "@/lib/data";
import { squadCards, utPlayers } from "@/lib/squad";
import type { UtPlayer } from "@/lib/ut";
import "./ut.css";

export const metadata: Metadata = { title: "Ultimate Team" };

export default function UltimateTeamPage() {
  const ms = matches();
  const players: UtPlayer[] = utPlayers(squadCards(ms));   // a player with a goalkeeper card too (Arav) has two cards here
  const pairs = chemistryPairs(ms);
  return (
    <main className="wrap page">
      {/* no visible title: the squad screen is the page, as in the game (the heading stays for screen readers) */}
      <h1 className="sr-only">Ultimate Team</h1>

      <UltimateTeam players={players} pairs={pairs} potm={ms[0]?.potm ?? null} />

      <p style={{ marginTop: "1.25rem" }}><Link className="more" href="/about/#ultimate-team">How Ultimate Team works</Link></p>
    </main>
  );
}
