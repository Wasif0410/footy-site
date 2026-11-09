"use client";
// Long explanatory text, folded into a <details> on a phone (640px and under) and left exactly as it is everywhere else.
// The server and the first client render are always the plain children, so wide screens get the same markup as before;
// on a phone the fold appears as soon as the page is interactive. `keep` leaves the first few children in view.
import { Children, useSyncExternalStore, type ReactNode } from "react";

const QUERY = "(max-width: 640px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const phone = () => window.matchMedia(QUERY).matches;
const wide = () => false;

export function PhoneFold({ summary, keep = 0, children }: { summary: string; keep?: number; children: ReactNode }) {
  const small = useSyncExternalStore(subscribe, phone, wide);
  if (!small) return <>{children}</>;
  const all = Children.toArray(children);
  return (
    <>
      {all.slice(0, keep)}
      <details className="fold">
        <summary>{summary}</summary>
        <div className="fold-body">{all.slice(keep)}</div>
      </details>
    </>
  );
}
