"use client";
// Background music: a random track (from the owner's FIFA 15 favourites) on every page load (never the one from the previous visit), the
// next one random when a track ends, a speaker button in the header to mute it, and a FIFA-style "Now playing"
// banner. Lives in the root layout so the music carries on across client-side page changes.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MUSIC_MUTE_KEY, MUSIC_VOLUME, TRACKS, type Track } from "@/lib/music";
import { sfx } from "@/lib/sfx";
import "./music-player.css";

const VOLUME = MUSIC_VOLUME;
const LAST_KEY = "music-last";
const MUTE_KEY = MUSIC_MUTE_KEY;
const TOAST_MS = 4200;
// On a phone nothing plays, and no MP3 (4 to 8 MB) is fetched, until the visitor presses the speaker button: a touch to scroll is not a
// request for sound, and it would cost them mobile data. Everywhere else the music starts as before.
const PHONE = "(max-width: 640px)";
// Browsers only allow sound after the visitor does something; any of these counts on one device or another.
const GESTURES = ["pointerdown", "keydown", "touchstart", "pointerup", "touchend", "click"] as const;

// One audio element for the whole page, and one track choice per page load (these survive React remounts).
let audioEl: HTMLAudioElement | null = null;
let bootTrack: Track | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "none";      // nothing is downloaded until a track is about to play
    audioEl.loop = false;
  }
  return audioEl;
}

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private window or blocked storage: carry on */ }
}

function pickTrack(not: string | null): Track | null {
  const pool = TRACKS.filter((t) => t.src !== not);
  const from = pool.length ? pool : TRACKS;
  return from.length ? from[Math.floor(Math.random() * from.length)] : null;
}

type Toast = { id: number; title: string; artist: string };

export function MusicPlayer() {
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastTop, setToastTop] = useState(112);

  const mutedRef = useRef(false);
  const phoneRef = useRef(false);
  const current = useRef<Track | null>(null);
  const loaded = useRef<string | null>(null);        // the src currently set on the element
  const toasted = useRef<string | null>(null);       // the track the banner was last shown for
  const armed = useRef(false);
  const pending = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const fadeTimer = useRef<number | undefined>(undefined);
  const errors = useRef(0);
  const gestureHandler = useRef<() => void>(() => {});

  const fadeIn = useCallback(() => {
    const audio = getAudio();
    window.clearInterval(fadeTimer.current);
    audio.volume = 0;
    let v = 0;
    fadeTimer.current = window.setInterval(() => {
      v += VOLUME / 24;
      if (v >= VOLUME) { audio.volume = VOLUME; window.clearInterval(fadeTimer.current); } else audio.volume = v;
    }, 45);
  }, []);

  const tryPlay = useCallback(async (): Promise<boolean> => {
    const audio = getAudio();
    const track = current.current;
    if (!track || mutedRef.current) return false;
    if (loaded.current !== track.src) { audio.src = track.src; loaded.current = track.src; }
    try {
      audio.volume = 0;
      await audio.play();
      fadeIn();
      return true;
    } catch {
      return false;
    }
  }, [fadeIn]);

  const disarm = useCallback(() => {
    if (!armed.current) return;
    armed.current = false;
    for (const e of GESTURES) window.removeEventListener(e, gestureHandler.current, true);
  }, []);

  const arm = useCallback(() => {
    if (armed.current) return;
    armed.current = true;
    for (const e of GESTURES) window.addEventListener(e, gestureHandler.current, { capture: true, passive: true });
  }, []);

  const nextTrack = useCallback(() => {
    const next = pickTrack(current.current?.src ?? null);
    if (!next) return;
    current.current = next;
    write(LAST_KEY, next.src);
    void tryPlay().then((ok) => { if (!ok) arm(); });
  }, [tryPlay, arm]);

  useEffect(() => {
    setMounted(true);
    if (!TRACKS.length) return;
    const audio = getAudio();
    phoneRef.current = window.matchMedia(PHONE).matches;
    const isMuted = phoneRef.current || read(MUTE_KEY) === "1";
    mutedRef.current = isMuted;
    setMuted(isMuted);
    sfx.setMuted(isMuted);          // the interface sounds follow the speaker button

    if (!bootTrack) {
      bootTrack = pickTrack(read(LAST_KEY));
      if (bootTrack) write(LAST_KEY, bootTrack.src);
    }
    current.current = bootTrack;

    // the first gesture anywhere starts the music (and stays armed until a play actually succeeds)
    gestureHandler.current = () => {
      if (mutedRef.current) { disarm(); return; }
      if (pending.current || !audio.paused) return;
      pending.current = true;
      void tryPlay().then((ok) => { pending.current = false; if (ok) disarm(); });
    };

    const onPlaying = () => {
      setPlaying(true);
      errors.current = 0;
      const t = current.current;
      if (t && toasted.current !== t.src) {
        toasted.current = t.src;
        const hd = document.querySelector(".site-head");
        setToastTop(Math.max(8, Math.round((hd?.getBoundingClientRect().bottom ?? 104) + 8)));
        setToast({ id: Date.now(), title: t.title, artist: t.artist });
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
      }
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => nextTrack();
    const onError = () => {
      setPlaying(false);
      if (errors.current++ < 2) window.setTimeout(nextTrack, 600);
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    if (!isMuted) void tryPlay().then((ok) => { if (!ok) arm(); });     // allowed if the visitor has been here before

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      disarm();
      audio.pause();
      window.clearTimeout(toastTimer.current);
      window.clearInterval(fadeTimer.current);
    };
  }, [tryPlay, arm, disarm, nextTrack]);

  const toggle = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    // the button clicks for itself (data-sfx="none" below): before muting, after unmuting, so the press is heard either way
    if (next) { sfx.play("click"); sfx.setMuted(true); } else { sfx.setMuted(false); sfx.play("click"); }
    if (!phoneRef.current) write(MUTE_KEY, next ? "1" : "0");
    if (next) {
      disarm();
      window.clearInterval(fadeTimer.current);
      getAudio().pause();
    } else {
      void tryPlay().then((ok) => { if (!ok) arm(); });
    }
  };

  if (!TRACKS.length) return null;
  const label = muted ? "Play music" : "Mute music";
  return (
    <>
      <button type="button" className={`mp-btn${playing && !muted ? " is-playing" : ""}`} onClick={toggle}
        aria-label={label} aria-pressed={muted} title={label} data-sfx="none">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path className="mp-cone" d="M3 9.5h3.6L11.5 5v14l-4.9-4.5H3z" />
          {muted ? (
            <path className="mp-x" d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
          ) : (
            <>
              <path className="mp-wave mp-w1" d="M15 9.2a4 4 0 0 1 0 5.6" />
              <path className="mp-wave mp-w2" d="M17.6 6.6a7.6 7.6 0 0 1 0 10.8" />
            </>
          )}
        </svg>
      </button>
      {mounted
        ? createPortal(
            <div className="mp-toast-wrap" role="status" aria-live="polite" style={{ top: toastTop }}>
              {toast ? (
                <div className="mp-toast" key={toast.id} style={{ animationDuration: `${TOAST_MS}ms` }}>
                  <span className="mp-toast-tab" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
                      <path d="M9 17.5V5.5l10-2v12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                      <ellipse cx="6.8" cy="17.6" rx="3" ry="2.4" fill="currentColor" />
                      <ellipse cx="16.8" cy="15.6" rx="3" ry="2.4" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="mp-toast-body">
                    <small>Now playing</small>
                    <strong>{toast.title}</strong>
                    <em>{toast.artist}</em>
                  </span>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
