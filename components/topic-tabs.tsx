"use client";
// A row of topic buttons with one panel showing at a time (the How it works page). The chosen topic lives in the URL
// hash (#ratings), so a link such as /about/#ultimate-team opens that topic and a click on a button rewrites the hash
// with history.replaceState.
//
// Without JavaScript, and until the page is interactive, every panel is in the HTML and the buttons are plain links
// that jump to their panel. Once hydrated the buttons become real tabs (tablist, tab, tabpanel) and the others hide.
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

export type Topic = { id: string; label: string; content: ReactNode };

// the hash is the one source of truth: every change (a click, a link, back/forward) goes through it
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
};
const hashNow = (): string | null => {
  try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return window.location.hash.slice(1); }
};
const beforeHydration = (): string | null => null;      // null: not interactive yet, show everything

export function TopicTabs({ topics, label }: { topics: Topic[]; label: string }) {
  const hash = useSyncExternalStore(subscribe, hashNow, beforeHydration);
  const ready = hash !== null;
  const active = topics.find((t) => t.id === hash)?.id ?? topics[0].id;
  const listRef = useRef<HTMLDivElement>(null);
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const landed = useRef(false);

  const choose = (id: string) => {
    window.history.replaceState(null, "", `#${id}`);
    listeners.forEach((cb) => cb());
  };

  // opening the page on a topic, or following a link to one from lower down the page, brings the buttons into view
  useEffect(() => {
    if (!ready) return;
    const list = listRef.current;
    if (!list) return;
    if (!landed.current) {
      landed.current = true;
      if (topics.some((t) => t.id === window.location.hash.slice(1))) {
        // the browser jumped to the panel before the other panels hid; start at the buttons, and again once the page has loaded
        // (the browser re-aligns to the #hash when loading ends)
        const top = () => window.scrollTo({ top: 0, behavior: "instant" });
        top();
        if (document.readyState === "complete") requestAnimationFrame(top);
        else window.addEventListener("load", () => requestAnimationFrame(top), { once: true });
      }
      return;
    }
    requestAnimationFrame(() => { if (list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start", behavior: "instant" }); });
  }, [ready, active, topics]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = topics.length - 1;
    const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    const id = topics[to].id;
    choose(id);
    tabs.current.get(id)?.focus();
  };

  return (
    <div className="topic-tabs-wrap">
      {ready ? (
        <div className="topic-tabs" role="tablist" aria-label={label} ref={listRef}>
          {topics.map((t, i) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} className="topic-tab" aria-selected={t.id === active}
              aria-controls={t.id} tabIndex={t.id === active ? 0 : -1} onClick={() => choose(t.id)} onKeyDown={(e) => onKey(e, i)}
              ref={(el) => { if (el) tabs.current.set(t.id, el); else tabs.current.delete(t.id); }}>
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <nav className="topic-tabs" aria-label={label}>
          {topics.map((t) => <a key={t.id} className="topic-tab" href={`#${t.id}`}>{t.label}</a>)}
        </nav>
      )}
      {topics.map((t) => (
        <section key={t.id} id={t.id} className="topic-panel" hidden={ready && t.id !== active}
          role={ready ? "tabpanel" : undefined} aria-labelledby={ready ? `tab-${t.id}` : undefined}>
          {t.content}
        </section>
      ))}
    </div>
  );
}
