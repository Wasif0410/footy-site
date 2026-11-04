import type { Metadata } from "next";
import { TvIcon } from "@/components/tv-icon";
import { TvPlayer, type TvChapter } from "@/components/tv-player";
import { SectionHead } from "@/components/ui";
import { playerById } from "@/lib/data";
import { tvWeeks, type TvWeek } from "@/lib/tv";

export const metadata: Metadata = { title: "TV" };

const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "short" });

function Week({ w, first }: { w: TvWeek; first: boolean }) {
  const people = playerById();
  const name = (id: number) => people.get(id)?.name ?? "Seven XI";
  const chapters: TvChapter[] = [...w.top].sort((a, b) => a.t - b.t).map((c) => ({
    t: c.t, rank: c.rank, title: `${name(c.player_id)}, ${c.kind.toLowerCase()}${c.extra ? ` ${c.extra}` : ""}`,
    sub: `${c.minute}' vs ${c.opponent}`,
  }));
  if (w.player_of_week) {
    chapters.push({ t: w.player_of_week.t, title: `${w.player_of_week.award ?? "Player of the match"}: ${name(w.player_of_week.id)}`, sub: w.player_of_week.line });
  }
  const len = w.reel ? `${Math.floor(w.reel.length / 60)}:${String(Math.round(w.reel.length % 60)).padStart(2, "0")}` : "";
  return (
    <section className="section">
      <SectionHead title={w.title} note={`${w.from === w.to ? day(w.from) : `${day(w.from)} to ${day(w.to)}`}. The ${w.top.length} best moments, counting down${len ? `, ${len}` : ""}.`} />
      {w.reel ? <TvPlayer src={w.reel.src} poster={w.reel.poster} chapters={chapters} eager={first} />
        : <p className="muted">The reel is on its way.</p>}
    </section>
  );
}

export default function Tv() {
  const weeks = tvWeeks();
  return (
    <main className="wrap page">
      <section className="section">
        <h1>Seven XI TV</h1>
        <p className="lede" style={{ marginTop: "0.6rem" }}>
          After every match, one short reel of our 10 best moments: goals, shots, tackles and presses that won the ball
          back. Only moments we have checked make the cut.
        </p>
        <div className="tv-hero"><TvIcon size={84} /></div>
      </section>
      {weeks.length ? weeks.map((w, i) => <Week key={w.id} w={w} first={i === 0} />)
        : <section className="section"><p className="muted">No reels yet.</p></section>}
    </main>
  );
}
