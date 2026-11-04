"use client";
// The week's reel, with its moments listed underneath: a click jumps the reel to that moment.
import { useRef, useState } from "react";

export type TvChapter = { t: number; rank?: number; title: string; sub: string };

export function TvPlayer({ src, poster, chapters, eager }: { src: string; poster: string; chapters: TvChapter[]; eager: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(-1);
  const at = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    void v.play().catch(() => {});
  };
  const current = chapters.reduce((k, c, i) => (now >= c.t - 0.3 ? i : k), -1);
  return (
    <div className="tv-show">
      <div className="tv-reel">
        <video ref={ref} src={src} poster={poster} controls playsInline preload={eager ? "metadata" : "none"}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
      </div>
      <ol className="tv-chapters" aria-label="In this reel">
        {chapters.map((c, i) => (
          <li key={i}>
            <button type="button" onClick={() => at(c.t)} aria-current={i === current ? "true" : undefined}>
              <span className="r">{c.rank ? `#${c.rank}` : "★"}</span>
              <span className="w"><span className="t">{c.title}</span><span className="muted small">{c.sub}</span></span>
              <span className="at muted small">{Math.floor(c.t / 60)}:{String(Math.floor(c.t % 60)).padStart(2, "0")}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
