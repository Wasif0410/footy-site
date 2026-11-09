import type { Metadata } from "next";
import { FutCard } from "@/components/fut-card";
import { SectionHead } from "@/components/ui";
import { matches } from "@/lib/data";
import { keeperCard, squadCards } from "@/lib/squad";

export const metadata: Metadata = { title: "Players" };

export default function Players() {
  const ms = matches();
  const all = squadCards(ms);
  const potm = ms[0]?.potm ?? null;                     // player of the latest match gets the special card
  const squad = all.filter(({ p }) => !p.loan);
  const loans = all.filter(({ p }) => p.loan);
  return (
    <main className="wrap page">
      <h1 className="sr-only">Squad</h1>

      <section className="section" id="cards">
        <SectionHead title="All cards" note="Best first. Gold from 75 overall, silver from 65. Keepers show ?? until saves are measured."
          more={{ href: "/about/#cards", label: "How cards are rated" }} />
        <div className="squad fut-grid">
          {squad.map(({ p, card }) => card ? <FutCard key={p.id} card={card} player={p} special={p.id === potm} /> : null)}
          {/* a second card for a player who also plays in goal: unrated, so after everyone who has a rating, and it links to the same page */}
          {squad.map(({ p }) => { const gk = keeperCard(p); return gk ? <FutCard key={`${p.id}-gk`} card={gk} player={p} /> : null; })}
        </div>
      </section>
      {loans.length ? (
        <section className="section" id="loan">
          <SectionHead title="On loan" note="Guests who filled in for a day. Their games count in the match pages, rated like everyone else." />
          <div className="squad fut-grid">
            {loans.map(({ p, card }) => card ? (
              <figure key={p.id} className="loan">
                <FutCard card={card} player={p} special={p.id === potm} />
                <figcaption>{p.loan}</figcaption>
              </figure>
            ) : null)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
