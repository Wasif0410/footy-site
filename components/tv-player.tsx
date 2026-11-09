"use client";
// The week's reel in a broadcast frame, a "Now showing" bar under it naming the moment on screen, and the moments
// beside it as the game lists things: a rank box, the moment, its time. A click jumps the reel to that moment, and the
// moment playing is the selected (yellow) row.
import { useEffect, useRef, useState } from "react";

export type TvChapter = { t: number; rank?: number; title: string; sub: string };

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function TvPlayer({ src, poster, chapters, eager }: { src: string; poster: string; chapters: TvChapter[]; eager: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(-1);
  const at = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    void v.play().catch(() => {});
  };
  // the first reel loads its start in the background, except on a phone: it is a 14 MB file, so there it waits for a press of play
  useEffect(() => {
    if (eager && ref.current && !window.matchMedia("(max-width: 640px)").matches) ref.current.preload = "metadata";
  }, [eager]);
  const current = chapters.reduce((k, c, i) => (now >= c.t - 0.3 ? i : k), -1);
  const cur = current >= 0 ? chapters[current] : null;
  const ranked = chapters.filter((c) => c.rank).length;
  return (
    <div className="tv-show">
      <div className="tv-frame">
        <div className="tv-reel">
          <video ref={ref} src={src} poster={poster} controls playsInline preload="none"
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
        </div>
        <p className="tv-now">
          <span className="tv-now-lab">{cur ? "Now showing" : "Press play"}</span>
          {cur ? (
            <>
              <span className="tv-now-t">{cur.rank ? <b>#{cur.rank}</b> : <b>★</b>}{cur.title}</span>
              <span className="tv-now-sub">{cur.sub}</span>
            </>
          ) : (
            <span className="tv-now-t">The top {ranked}, counting down to number one</span>
          )}
        </p>
      </div>
      <div className="tv-list">
        <h3 className="tv-list-h">In this reel<span>{chapters.length}</span></h3>
        <ol className="tv-chapters" aria-label="Moments in this reel">
          {chapters.map((c, i) => (
            <li key={i}>
              <button type="button" onClick={() => at(c.t)} aria-current={i === current ? "true" : undefined}
                aria-label={`${c.rank ? `Number ${c.rank}: ` : ""}${c.title}, ${c.sub}. Jump to ${clock(c.t)}`}>
                <span className={`r${c.rank === 1 ? " top" : ""}${c.rank ? "" : " star"}`} aria-hidden="true">{c.rank ?? "★"}</span>
                <span className="w" aria-hidden="true"><span className="t">{c.title}</span><span className="s">{c.sub}</span></span>
                <span className="at" aria-hidden="true">{clock(c.t)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
