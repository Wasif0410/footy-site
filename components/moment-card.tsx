"use client";
// One of our ball-winning moments: its picture, and on a click the moment itself, played straight
// from the match video (a few seconds either side), without leaving the page.
import Link from "next/link";
import { useState } from "react";
import type { Video } from "@/lib/data";

export function MomentCard({ still, t, minute, title, sub, tag, critical, video, matchId }: {
  still: string; t: number; minute: number; title: string; sub?: string; tag: string; critical: boolean;
  video: Video; matchId: string;
}) {
  const [playing, setPlaying] = useState(false);
  const offset = video.offset ?? 0;
  const start = Math.max(0, Math.floor(t - 4 - offset)), end = Math.ceil(t + 3 - offset);
  const watch = `/matches/${matchId}/review/?t=${t}`;
  return (
    <figure className="mcard" style={{ margin: 0 }}>
      <div className="frame">
        {playing && video.youtube ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${video.youtube}?start=${start}&end=${end}&autoplay=1&mute=1&rel=0&playsinline=1`}
            title={`${title}, ${minute}'`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still} alt="" loading="lazy" />
            {video.youtube ? (
              <button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${title}, ${minute}'`}><span /></button>
            ) : (
              <Link href={watch} aria-label={`Watch: ${title}, ${minute}'`} style={{ position: "absolute", inset: 0 }} />
            )}
          </>
        )}
      </div>
      <figcaption className="cap">
        <span className="top"><span className="m">{minute}&apos;</span><span className={`tag${critical ? " critical" : ""}`}>{tag}</span></span>
        <span className="t">{title}</span>
        <span className="muted small">{sub}</span>
        <Link href={watch}>Watch it in the full match</Link>
      </figcaption>
    </figure>
  );
}
