"use client";
// The game's title screen: the crest and the club's name over the stadium, and "Press any button" ("Tap to start" on a
// touch screen) pulsing underneath. Browsers only let a page play sound after the visitor does something, so this is
// what lets the music start the moment someone enters: their press is that something. Shown once per visit (a tab's
// session) and never to a visitor who has muted the music. START_SCRIPT runs in <head> before the page paints and
// marks <html data-intro="1">, so the screen is up from the first frame; without JavaScript it never shows.
import { useEffect, useRef, useState } from "react";
import { Crest } from "@/components/crest";
import { MUSIC_MUTE_KEY } from "@/lib/music";
import "./start-screen.css";

const SEEN_KEY = "intro-seen";
const LEAVE_MS = 450;
// keys that are not a "press" on their own
const NOT_A_PRESS = ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Fn"];

export const START_SCRIPT =
  `try{if(!sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})&&localStorage.getItem(${JSON.stringify(MUSIC_MUTE_KEY)})!=="1")` +
  `document.documentElement.setAttribute("data-intro","1")}catch(e){}`;

export function StartScreen({ first, rest }: { first: string; rest: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const enterRef = useRef<() => void>(() => {});
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-intro") !== "1") return;
    // the page behind can't be reached until the visitor enters
    const page = [...document.querySelectorAll<HTMLElement>("body > header, body > main, body > footer")];
    page.forEach((el) => el.setAttribute("inert", ""));
    button.current?.focus({ preventScroll: true });

    let done = false;
    let timer: number | undefined;
    // The music player listens for the same press on the window (before it reaches this screen) and starts the music
    // inside it, which is what the browser requires; this screen then fades away.
    const enter = () => {
      if (done) return;
      done = true;
      try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked: it shows again next load */ }
      page.forEach((el) => el.removeAttribute("inert"));
      setLeaving(true);
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      timer = window.setTimeout(() => { root.removeAttribute("data-intro"); setLeaving(false); }, still ? 0 : LEAVE_MS);
    };
    enterRef.current = enter;
    const onKey = (e: KeyboardEvent) => { if (!NOT_A_PRESS.includes(e.key)) enter(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      page.forEach((el) => el.removeAttribute("inert"));
    };
  }, []);

  return (
    <div className={`start${leaving ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label={`${first} ${rest}`.trim()}>
      {/* the press: a click or tap anywhere (the whole screen is this button), or any key */}
      <button ref={button} type="button" className="start-btn" data-sfx="confirm" onClick={() => enterRef.current()}
        aria-label="Enter the site and start the music">
        <span className="start-mark" aria-hidden="true">
          <Crest className="start-crest" />
          <span className="start-name">{first}{rest ? <> <b>{rest}</b></> : null}</span>
          <span className="start-sub">Match centre</span>
        </span>
        <span className="start-press" aria-hidden="true">
          <span className="start-key">Press any button</span>
          <span className="start-tap">Tap to start</span>
        </span>
        <span className="start-note" aria-hidden="true">Music plays when you enter. The speaker at the top mutes it.</span>
      </button>
    </div>
  );
}
