"use client";
// The match on video with what our system sees drawn over it, as the app's Review tab shows it:
// every player boxed and named, the ball and its trail, the moment that's happening, a live pitch
// and everyone's playing time so far. The screen for each stretch of play is fetched as you reach it.
//
// The video comes from (in order): an unlisted YouTube upload, any hosted MP4, or (only when the
// site runs on this computer) the local Footy Analyzer server. With none, the page still plays the
// pitch, the moments and the playing time on its own clock.
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Moment, Player, Screen, Video } from "@/lib/data";
import { describe, matchClock, minute, mmss, playBefore, tone } from "@/lib/format";
import { KindTag, Shirt } from "./ui";

type Packed = {
  start: number; end: number; fps: number;
  boxes: { f: number[]; k: number[]; x1: number[]; y1: number[]; x2: number[]; y2: number[]; tm: number[];
    mx: (number | null)[]; my: (number | null)[] };
  ball: { f: number[]; px: (number | null)[]; py: (number | null)[]; mx: (number | null)[]; my: (number | null)[] };
  ids: Record<string, [number, string]>;
};
type Indexed = Packed & { frames: number[]; rows: Map<number, number[]>; ballRow: Map<number, number>; ballFrames: number[] };

function indexed(p: Packed): Indexed {
  const rows = new Map<number, number[]>();
  p.boxes.f.forEach((f, i) => { const r = rows.get(f); if (r) r.push(i); else rows.set(f, [i]); });
  const ballRow = new Map<number, number>();
  p.ball.f.forEach((f, i) => { if (p.ball.px[i] !== null) ballRow.set(f, i); });
  return { ...p, rows, frames: [...rows.keys()].sort((a, b) => a - b), ballRow, ballFrames: [...ballRow.keys()].sort((a, b) => a - b) };
}

// the last sampled frame at or before f
function before(frames: number[], f: number): number {
  let lo = 0, hi = frames.length - 1, out = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (frames[mid] <= f) { out = mid; lo = mid + 1; } else hi = mid - 1; }
  return out;
}

type Box = { k: number; x1: number; y1: number; x2: number; y2: number; tm: number; mx: number | null; my: number | null };

// Boxes at a moment, moved smoothly between the sampled frames.
function boxesAt(s: Indexed, t: number): Box[] {
  const f = t * s.fps, i = before(s.frames, f);
  if (i < 0) return [];
  const f0 = s.frames[i], f1 = s.frames[i + 1];
  const B = s.boxes;
  const row = (j: number): Box => ({ k: B.k[j], x1: B.x1[j], y1: B.y1[j], x2: B.x2[j], y2: B.y2[j], tm: B.tm[j], mx: B.mx[j], my: B.my[j] });
  const now = (s.rows.get(f0) ?? []).map(row);
  if (f1 === undefined || f1 - f0 > 10) return f - f0 > 6 ? [] : now;
  const next = new Map((s.rows.get(f1) ?? []).map((j) => [B.k[j], row(j)]));
  const w = (f - f0) / (f1 - f0);
  const mix = (a: number, b: number) => a + (b - a) * w;
  return now.flatMap((a) => {
    const b = next.get(a.k);
    if (!b) return w < 0.5 ? [a] : [];
    return [{ ...a, x1: mix(a.x1, b.x1), y1: mix(a.y1, b.y1), x2: mix(a.x2, b.x2), y2: mix(a.y2, b.y2),
      mx: a.mx !== null && b.mx !== null ? mix(a.mx, b.mx) : a.mx, my: a.my !== null && b.my !== null ? mix(a.my, b.my) : a.my }];
  });
}

function ballAt(s: Indexed, t: number): { now: [number, number] | null; trail: [number, number][]; pitch: [number, number] | null } {
  const f = t * s.fps, i = before(s.ballFrames, f);
  const trail: [number, number][] = [];
  for (let j = Math.max(0, i - 8); j <= i; j++) {
    const fr = s.ballFrames[j];
    if (f - fr > s.fps) continue;
    const r = s.ballRow.get(fr)!;
    trail.push([s.ball.px[r]!, s.ball.py[r]!]);
  }
  if (i < 0 || f - s.ballFrames[i] > 6) return { now: null, trail, pitch: null };
  const r = s.ballRow.get(s.ballFrames[i])!;
  const pm = s.ball.mx[r] !== null && s.ball.my[r] !== null ? [s.ball.mx[r]!, s.ball.my[r]!] as [number, number] : null;
  return { now: [s.ball.px[r]!, s.ball.py[r]!], trail, pitch: pm };
}

// ---- the video, behind one small interface (HTML5 video, YouTube, or a plain clock)
interface Source { time(): number; seek(t: number): void; play(): void; pause(): void; paused(): boolean; rate(r: number): void }

declare global {
  interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void }
}
type YTPlayer = { getCurrentTime(): number; seekTo(s: number, allow: boolean): void; playVideo(): void; pauseVideo(): void;
  getPlayerState(): number; setPlaybackRate(r: number): void };

function clockSource(start: number): Source {
  let base = start, since: number | null = null, speed = 1;
  const now = () => (since === null ? base : base + ((performance.now() - since) / 1000) * speed);
  return {
    time: now, seek: (t) => { base = t; if (since !== null) since = performance.now(); },
    play: () => { if (since === null) since = performance.now(); }, pause: () => { base = now(); since = null; },
    paused: () => since === null, rate: (r) => { base = now(); if (since !== null) since = performance.now(); speed = r; },
  };
}

type Mode = { kind: "html5"; src: string } | { kind: "youtube"; id: string } | { kind: "none" };

export function Review({ screens, moments, players, lineup, periods, frame, video, pitch, opponent }: {
  screens: Screen[]; moments: Moment[]; players: Player[]; lineup: { id: number; keeper: boolean; spans: [number, number][] }[];
  periods: [number, number][]; frame: [number, number]; video: Video; pitch: [number, number]; opponent: string;
}) {
  const offset = video.offset ?? 0;
  const [mode, setMode] = useState<Mode | null>(null);
  const [failed, setFailed] = useState(false);
  const [t, setT] = useState(screens[0]?.start ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [iso, setIso] = useState<number | null>(null);      // the player isolated on the video, if any
  const [, setLoaded] = useState(0);
  const cache = useRef(new Map<string, Indexed | "loading">());
  const source = useRef<Source | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const ytEl = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const people = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // where the video comes from (decided in the browser: localhost gets the local server)
  useEffect(() => {
    const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    setMode(video.youtube ? { kind: "youtube", id: video.youtube } : video.src ? { kind: "html5", src: video.src }
      : local && video.local ? { kind: "html5", src: video.local } : { kind: "none" });
  }, [video]);

  // ?t= (video seconds) opens the page at a moment, 2 s before it: the rating "Watch" links
  const asked = Number(useSearchParams().get("t"));
  const startAt = Number.isFinite(asked) && asked > 0 ? Math.max(0, asked - 2) : screens[0]?.start ?? 0;
  const firstStart = useRef(startAt);

  // build the source for the mode (once; a later ?t= only seeks, below)
  useEffect(() => {
    if (!mode) return;
    const startAt = firstStart.current;
    if (mode.kind === "none" || failed) {
      source.current = clockSource(startAt);
      setT(startAt);
      return;
    }
    if (mode.kind === "html5") {
      const v = videoEl.current!;
      source.current = {
        time: () => v.currentTime + offset, seek: (x) => { v.currentTime = Math.max(0, x - offset); },
        play: () => { v.play().catch(() => {}); }, pause: () => v.pause(), paused: () => v.paused,
        rate: (r) => { v.playbackRate = r; },
      };
      const go = () => { v.currentTime = Math.max(0, startAt - offset); setT(startAt); };
      if (v.readyState >= 1) go(); else v.addEventListener("loadedmetadata", go, { once: true });
      return;
    }
    // YouTube: the IFrame API, loaded once
    let player: YTPlayer | null = null;
    let started = false, pending = startAt;
    const make = () => {
      player = new window.YT!.Player(ytEl.current!, {
        videoId: mode.id, width: "100%", height: "100%",
        playerVars: { start: Math.floor(Math.max(0, startAt - offset)), rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onError: () => setFailed(true),
          // until it first plays, YouTube reports 0: keep showing the moment asked for until then
          onStateChange: (e: { data: number }) => { if (e.data === 1 || e.data === 2 || e.data === 3) started = true; },
        },
      });
      source.current = {
        time: () => (started ? (player?.getCurrentTime?.() ?? 0) + offset : pending),
        seek: (x) => { pending = x; player?.seekTo(Math.max(0, x - offset), true); },
        play: () => player?.playVideo(), pause: () => player?.pauseVideo(), paused: () => player?.getPlayerState?.() !== 1,
        rate: (r) => player?.setPlaybackRate(r),
      };
    };
    if (window.YT?.Player) make();
    else {
      window.onYouTubeIframeAPIReady = make;
      if (!document.querySelector("script[data-yt]")) {
        const sc = document.createElement("script");
        sc.src = "https://www.youtube.com/iframe_api"; sc.dataset.yt = "1"; sc.onerror = () => setFailed(true);
        document.head.append(sc);
      }
    }
  }, [mode, failed, offset]);

  // another moment asked for while the page is open: jump there
  useEffect(() => {
    if (startAt === firstStart.current || !source.current) return;
    firstStart.current = startAt;
    source.current.seek(startAt);
    setT(startAt);
  }, [startAt]);

  const segment = screens.find((s) => t >= s.start && t < s.end) ?? null;

  // fetch the screen for the stretch we're in (and the next one, so crossing over is seamless)
  useEffect(() => {
    const want = [segment, segment ? screens[screens.indexOf(segment) + 1] : undefined].filter(Boolean) as Screen[];
    want.forEach((s) => {
      if (cache.current.has(s.file)) return;
      cache.current.set(s.file, "loading");
      fetch(s.file).then((r) => r.json()).then((p: Packed) => { cache.current.set(s.file, indexed(p)); setLoaded((n) => n + 1); })
        .catch(() => cache.current.delete(s.file));
    });
  }, [segment, screens]);

  const screenAt = useCallback((x: number) => {
    const s = screens.find((g) => x >= g.start && x < g.end);
    const d = s ? cache.current.get(s.file) : undefined;
    return d && d !== "loading" ? d : null;
  }, [screens]);

  // draw the screen over the video every frame; update the panels a few times a second
  useEffect(() => {
    let raf = 0, last = 0;
    const draw = () => {
      const src = source.current, c = canvas.current;
      if (src && c) {
        const now = src.time();
        if (Math.abs(now - last) > 0.2 || performance.now() % 250 < 20) { last = now; setT(now); setPlaying(!src.paused()); }
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        const ctx = c.getContext("2d")!;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const s = screenAt(now);
        if (s && !failed && mode?.kind !== "none") paint(ctx, s, now, w / frame[0], people, iso, frame);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [screenAt, frame, people, failed, mode, iso]);

  const seek = (x: number) => { source.current?.seek(x); setT(x); };
  const toggle = () => { const s = source.current; if (!s) return; if (s.paused()) s.play(); else s.pause(); setPlaying(!s.paused()); };
  const setRate = (r: number) => { setSpeed(r); source.current?.rate(r); };

  // with a player isolated, only their moments are listed, marked and announced
  const involves = (m: Moment) => iso === null || m.from?.id === iso || m.to?.id === iso;
  const here = moments.filter((m) => segment && m.t >= segment.start && m.t < segment.end && involves(m));
  const current = moments.filter((m) => Math.abs(m.t - t) < 1.5 && involves(m));
  const isoPlayer = iso !== null ? people.get(iso) : undefined;
  const nextOfTheirs = iso !== null ? moments.find((m) => m.t > t + 2.5 && involves(m)) : undefined;
  const s = screenAt(t);
  const boxes = s ? boxesAt(s, t) : [];
  const ball = s ? ballAt(s, t) : null;
  const inShot = new Set(boxes.map((b) => s?.ids[String(b.k)]?.[0]).filter((x): x is number => typeof x === "number"));
  const playedTotal = playBefore(t, periods);
  const showVideo = mode && mode.kind !== "none" && !failed;

  return (
    <div className="review">
      <div className="chips-row" role="tablist" aria-label="Stretches of play">
        {screens.map((g) => {
          const n = moments.filter((m) => m.t >= g.start && m.t < g.end && involves(m)).length;
          return (
            <button key={g.file} type="button" role="tab" aria-selected={segment?.file === g.file} className="seg-chip" onClick={() => seek(g.start)}>
              <b>{g.label}</b><span>{n} moments</span>
            </button>
          );
        })}
      </div>
      <div className="review-grid">
        <div>
          <div className="stage" style={{ aspectRatio: `${frame[0]} / ${frame[1]}` }}>
            {mode?.kind === "html5" && !failed ? (
              <video ref={videoEl} src={mode.src} controls playsInline muted preload="metadata" onError={() => setFailed(true)} />
            ) : null}
            {mode?.kind === "youtube" && !failed ? <div className="yt"><div ref={ytEl} /></div> : null}
            {!showVideo && mode ? (
              <div className="novideo">
                <p><strong>The match video isn&apos;t online yet.</strong></p>
                <p className="small">The pitch, the moments and playing time below still play along. Press play.</p>
              </div>
            ) : null}
            <canvas ref={canvas} aria-hidden="true" />
            {isoPlayer && s && !inShot.has(isoPlayer.id) ? (
              <div className="banner"><span>{isoPlayer.name} is out of shot right now</span></div>
            ) : current.length ? (
              <div className="banner">{current.map((m, i) => <span key={i}><KindTag kind={m.kind} />{describe(m, opponent)}</span>)}</div>
            ) : null}
          </div>
          <div className="transport">
            <button type="button" onClick={() => seek(t - 5)} aria-label="Back 5 seconds">‹ 5s</button>
            {!showVideo ? <button type="button" className="play" onClick={toggle}>{playing ? "Pause" : "Play"}</button> : null}
            <button type="button" onClick={() => seek(t + 5)} aria-label="Forward 5 seconds">5s ›</button>
            <span className="clock"><b>{matchClock(t, periods)}</b><span className="muted small">video {mmss(t)}</span></span>
            <select aria-label="Speed" value={speed} onChange={(e) => setRate(Number(e.target.value))}>
              {[0.5, 1, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
          </div>
          {segment ? (
            <div className="strip" role="group" aria-label="Moments in this stretch"
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(segment.start + ((e.clientX - r.left) / r.width) * (segment.end - segment.start)); }}>
              {here.map((m, i) => (
                <button key={i} type="button" className={`mark ${m.kind}`} aria-label={`${minute(m.minute)} ${describe(m, opponent)}`}
                  style={{ left: `${(100 * (m.t - segment.start)) / (segment.end - segment.start)}%` }}
                  title={`${minute(m.minute)} ${describe(m, opponent)}`} onClick={(e) => { e.stopPropagation(); seek(m.t - 2); }} />
              ))}
              <span className="now" style={{ left: `${(100 * (t - segment.start)) / (segment.end - segment.start)}%` }} />
            </div>
          ) : null}
          <div className="moments">
            <ol className="feed">
              {here.map((m, i) => (
                <li key={i} className={`${tone(m)}${m.kind === "goal" ? " goal" : ""}${Math.abs(m.t - t) < 1.5 ? " live" : ""}`}>
                  <span className="m">{minute(m.minute)}</span>
                  <span className="kind-cell"><KindTag kind={m.kind} /></span>
                  <span className="text">{describe(m, opponent)}</span>
                  <button type="button" className="watch" onClick={() => seek(m.t - 2)}>Watch</button>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <aside className="side-col">
          <section className="iso">
            <h3>Isolate a player <span>{isoPlayer ? "isolated" : "everyone"}</span></h3>
            <div className="iso-row">
              <select aria-label="Isolate a player" value={iso ?? ""} onChange={(e) => setIso(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Everyone</option>
                {lineup.map((l) => people.get(l.id)).filter((p): p is Player => !!p).sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => <option key={p.id} value={p.id}>{p.number !== null ? `${p.number} ` : ""}{p.name}</option>)}
              </select>
              {iso !== null ? <button type="button" className="linkish" onClick={() => setIso(null)}>Show everyone</button> : null}
            </div>
            {isoPlayer ? (
              <p className="iso-note">
                Everything else on the video is dimmed and only {isoPlayer.name}&apos;s moments are listed.{" "}
                {nextOfTheirs ? <button type="button" className="linkish" onClick={() => seek(nextOfTheirs.t - 2)}>Their next moment</button> : null}
              </p>
            ) : <p className="iso-note">Pick a player, or tap one under playing time, to follow just them.</p>}
          </section>
          <section>
            <h3>Pitch <span>as the camera sees it</span></h3>
            <MiniPitch size={pitch} boxes={boxes} ids={s?.ids ?? {}} people={people} ball={ball?.pitch ?? null} iso={iso} />
          </section>
          <section>
            <h3>Playing time <span>{mmss(playedTotal)} played</span></h3>
            <ul className="playing">
              {[...lineup].map((l) => {
                const on = l.spans.some(([a, b]) => t >= a && t < b);
                const played = l.spans.reduce((x, [a, b]) => x + Math.max(0, Math.min(b, t) - a), 0);
                return { l, on, played };
              }).sort((a, b) => Number(b.on) - Number(a.on) || b.played - a.played).map(({ l, on, played }) => {
                const p = people.get(l.id);
                return (
                  <li key={l.id} className={`pickable${on ? "" : " off"}${iso === l.id ? " iso-on" : ""}`} tabIndex={0}
                    onClick={() => setIso(iso === l.id ? null : l.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIso(iso === l.id ? null : l.id); } }}
                    title={iso === l.id ? "Show everyone" : `Isolate ${p?.name ?? "this player"}`}>
                    <Shirt number={p?.number} size="sm" off={!on} />
                    <span className="nm">
                      <b>{p?.name ?? "?"}{l.keeper ? " (GK)" : ""}</b>
                      <span className={on && inShot.has(l.id) ? "in" : undefined}>{on ? (inShot.has(l.id) ? "On, in shot" : "On, out of shot") : "Off"}</span>
                    </span>
                    <span className="bar"><i style={{ width: `${playedTotal ? Math.min(100, (100 * played) / playedTotal) : 0}%` }} /></span>
                    <span className="tm">{mmss(played)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function paint(ctx: CanvasRenderingContext2D, s: Indexed, t: number, scale: number, people: Map<number, Player>,
  iso: number | null, frame: [number, number]) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const px = 1 / scale;
  const all = boxesAt(s, t);
  const mine = iso === null ? all : all.filter((b) => s.ids[String(b.k)]?.[0] === iso);
  if (iso !== null) {
    // a spotlight: the frame dimmed, with a clear window round the isolated player
    ctx.beginPath();
    ctx.rect(0, 0, frame[0], frame[1]);
    for (const b of mine) {
      const pad = Math.max(30, 0.6 * (b.x2 - b.x1));
      ctx.rect(b.x1 - pad, b.y1 - pad, b.x2 - b.x1 + 2 * pad, b.y2 - b.y1 + 2 * pad);
    }
    ctx.fillStyle = mine.length ? "rgba(8, 9, 11, 0.62)" : "rgba(8, 9, 11, 0.35)";
    ctx.fill("evenodd");
  }
  for (const b of mine) {
    const id = s.ids[String(b.k)];
    if (id && id[1] === "not_ours") continue;
    const p = id ? people.get(id[0]) : undefined;
    const sure = id?.[1] === "confirmed";
    let color = "rgba(20,20,20,.85)", dash: number[] = [], label: string | null = null, width = 1.5;
    if (p) { color = sure ? "#3ddc84" : "#ffb020"; dash = sure ? [] : [6, 4]; label = `${p.number ?? ""} ${p.name}${sure ? "" : "?"}`.trim(); width = iso === null ? 2 : 3; }
    else if (b.tm === 0) { color = "#ffffff"; dash = [3, 3]; label = "?"; }
    ctx.lineWidth = width * px * 1.4;
    ctx.setLineDash(dash.map((d) => d * px * 1.4));
    ctx.strokeStyle = color;
    ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
    if (label) {
      const fs = 14 * px * 1.3;
      ctx.setLineDash([]);
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(0,0,0,.65)";
      ctx.fillRect(b.x1, b.y1 - fs * 1.3, ctx.measureText(label).width + fs * 0.5, fs * 1.25);
      ctx.fillStyle = color;
      ctx.fillText(label, b.x1 + fs * 0.25, b.y1 - fs * 0.3);
    }
  }
  ctx.setLineDash([]);
  const ball = ballAt(s, t);
  if (ball.trail.length > 1) {
    ctx.strokeStyle = "rgba(255,140,0,.6)"; ctx.lineWidth = 3 * px;
    ctx.beginPath(); ball.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  if (ball.now) {
    ctx.fillStyle = "#ff8c00"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * px;
    ctx.beginPath(); ctx.arc(ball.now[0], ball.now[1], 9 * px, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function MiniPitch({ size, boxes, ids, people, ball, iso }: {
  size: [number, number]; boxes: Box[]; ids: Record<string, [number, string]>; people: Map<number, Player>; ball: [number, number] | null;
  iso: number | null;
}) {
  const [L, W] = size;
  return (
    <svg className="pitch-svg" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label="Where everyone is on the pitch">
      <rect x={-1} y={-1} width={L + 2} height={W + 2} fill="var(--pitch)" />
      <g fill="none" stroke="var(--pitch-line)" strokeWidth={0.25}>
        <rect x={0} y={0} width={L} height={W} />
        <line x1={L / 2} y1={0} x2={L / 2} y2={W} />
        <circle cx={L / 2} cy={W / 2} r={Math.min(4, W / 6)} />
      </g>
      {boxes.filter((b) => b.mx !== null && b.my !== null && b.mx >= -1 && b.mx <= L + 1).map((b) => {
        const id = ids[String(b.k)];
        if (id && id[1] === "not_ours") return null;
        const p = id ? people.get(id[0]) : undefined;
        const ours = b.tm === 0 || !!p;
        const on = iso !== null && p?.id === iso;
        return (
          <g key={b.k} opacity={iso === null || on ? 1 : 0.3}>
            <circle cx={b.mx!} cy={b.my!} r={on ? 1.7 : ours ? 1.1 : 0.8} fill={on ? "var(--club)" : ours ? "#fff" : "#111"}
              stroke={ours ? (on ? "#fff" : "var(--club)") : "none"} strokeWidth={0.25} />
            {p?.number !== undefined && p?.number !== null ? (
              <text x={b.mx!} y={b.my! + (on ? 0.6 : 0.45)} textAnchor="middle" fontSize={on ? 1.6 : 1.2} fontWeight={700}
                fill={on ? "#fff" : "var(--club)"}>{p.number}</text>
            ) : null}
          </g>
        );
      })}
      {ball ? <circle cx={ball[0]} cy={ball[1]} r={0.7} fill="#ff8c00" stroke="#fff" strokeWidth={0.2} /> : null}
    </svg>
  );
}
