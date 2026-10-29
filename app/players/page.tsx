import type { Metadata } from "next";
import { FutCard } from "@/components/fut-card";
import { SectionHead } from "@/components/ui";
import { ATTR_NOTES, cardFor, teamBaseline, type Attr } from "@/lib/cards";
import { matches, players } from "@/lib/data";
import { seasonPlayers } from "@/lib/season";

export const metadata: Metadata = { title: "Players" };

export default function Players() {
  const ms = matches();
  const rows = seasonPlayers(ms);
  const avg = teamBaseline(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const potm = ms[0]?.potm ?? null;                     // player of the latest match gets the special card
  const all = players().map((p) => ({ p, card: byId.has(p.id) ? cardFor(byId.get(p.id)!, p.keeper, avg) : null }))
    .sort((a, b) => (b.card?.ovr ?? -1) - (a.card?.ovr ?? -1) || a.p.name.localeCompare(b.p.name));
  const squad = all.filter(({ p }) => !p.loan);
  const loans = all.filter(({ p }) => p.loan);
  return (
    <main className="wrap page">
      <section className="section">
        <h1>Squad</h1>
        <p className="lede" style={{ marginTop: "0.6rem" }}>
          Every player&apos;s card, rated from what the video measured this season. Open a card for their season, every rating with the
          moments behind it, and their heatmap.
        </p>
      </section>
      <section className="section">
        <SectionHead title="Player cards" note="Best first. Gold from 75 overall, silver from 65. Keepers show ?? until saves are measured." />
        <div className="squad fut-grid">
          {squad.map(({ p, card }) => card ? <FutCard key={p.id} card={card} player={p} special={p.id === potm} /> : null)}
        </div>
      </section>
      {loans.length ? (
        <section className="section">
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
      <section className="section">
        <SectionHead title="How the cards are rated"
          note="Each attribute ranks a player against the squad on a few measures, each a rate per minute on camera: the best in the squad gets about 90, the least about 45. A short spell counts for less, so a cameo has to show something to rate well. The overall is half their average match rating and half their attributes weighted for their position: a centre-back's leans on defending and physical, a midfielder's on passing, a winger's on pace and dribbling, a striker's on shooting. Players seen only briefly are pulled a little toward 55." />
        <ul className="card-notes">
          {(Object.keys(ATTR_NOTES) as Attr[]).map((k) => <li key={k}><b>{k}</b>{ATTR_NOTES[k].replace(/^[A-Za-z]+: /, "")}</li>)}
        </ul>
      </section>
    </main>
  );
}
