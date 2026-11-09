"use client";
// A home tile that cycles through a few slides (the last matches, say), like the game's menu tiles. The current
// dot fills like a timer and the slide moves on when it's full (CSS drives the timing, so it pauses with the fill
// while you point at the tile or tab into it). The dots pick a slide. Still for anyone who asks for reduced motion
// (no fill animation runs, so nothing moves on by itself).
import { Children, useState } from "react";

export function TileCycle({ children, labels, group, interval = 7000 }: {
  children: React.ReactNode; labels: string[]; group: string; interval?: number;
}) {
  const slides = Children.toArray(children);
  const [at, setAt] = useState(0);
  const n = slides.length;

  return (
    <div className="cycle" style={{ ["--cycle" as string]: `${interval}ms` } as React.CSSProperties}>
      {slides.map((s, k) => <div key={k} className="slide" hidden={k !== at}>{s}</div>)}
      {n > 1 ? (
        <div className="dots" role="group" aria-label={group}
          onAnimationEnd={(e) => { if (e.animationName === "dot-fill") setAt((k) => (k + 1) % n); }}>
          {slides.map((_, k) => (
            <button key={k} type="button" aria-label={labels[k] ?? `Slide ${k + 1}`} aria-current={k === at ? "true" : undefined}
              onClick={() => setAt(k)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
