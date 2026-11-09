// Interface sounds, made in code with the Web Audio API (no audio files, no samples): short ticks, blips and a whoosh,
// in the spirit of a console football-game menu. Everything goes through one master gain, then a gentle limiter.
//
//   sfx.play("click")     a sound by name (nothing happens before the visitor has pressed something, on the server, in a hidden tab,
//                         when the site's speaker button is muted, or when Web Audio is missing)
//   sfx.setMuted(true)    the music player's speaker button calls this, so "muted" means silent for the clicks too
//   sfx.setVolume(0.35)   the music volume; the clicks sit at a fixed fraction of it (MIX), so they stay under the music
//
// The components/ui-sounds.tsx component turns presses and hovers into these calls; other code can call sfx.play directly or
// dispatch window.dispatchEvent(new CustomEvent("sfx", { detail: "whoosh" })).
import { MUSIC_MUTE_KEY, MUSIC_VOLUME } from "./music";

export const SFX_NAMES = ["click", "select", "confirm", "back", "toggle", "whoosh", "hover"] as const;
export type SfxName = (typeof SFX_NAMES)[number];
export const isSfxName = (s: unknown): s is SfxName => typeof s === "string" && (SFX_NAMES as readonly string[]).includes(s);

const MIX = 0.4;               // clicks relative to the music volume (the sounds below peak at about 0.8 before this)
const MIN_GAP: Record<SfxName, number> = { click: 40, select: 40, confirm: 70, back: 70, toggle: 50, whoosh: 140, hover: 75 };
const MAX_VOICES = 14;         // oscillators/noise sources alive at once; beyond this new sounds are dropped
const FLOOR = 0.0001;          // "silence" for exponential ramps (they cannot reach 0)

type Ctor = typeof AudioContext;
type Bus = { ctx: AudioContext; out: GainNode };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let gestured = false;          // the visitor has pressed/typed/tapped something: sound is allowed from now on
let broken = false;            // Web Audio is missing or failed: stay silent for good
let volume = MUSIC_VOLUME;
let muted = false;
let voices = 0;
let queuedWhileSuspended = 0;
const lastAt: Partial<Record<SfxName, number>> = {};

if (typeof window !== "undefined") {
  try { muted = window.localStorage.getItem(MUSIC_MUTE_KEY) === "1"; } catch { /* blocked storage: assume sound is wanted */ }
}

function applyGain() {
  if (master && ctx) master.gain.setTargetAtTime(volume * MIX, ctx.currentTime, 0.01);
}

function create(): Bus | null {
  if (broken || typeof window === "undefined") return null;
  if (ctx && master) return { ctx, out: master };
  try {
    const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) { broken = true; return null; }
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = volume * MIX;      // mute is checked when a sound starts, so a click already under way is not cut short
    // a light limiter so a burst of presses can never get loud or crackle
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 8;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    ctx.addEventListener("statechange", () => { if (ctx?.state === "running") queuedWhileSuspended = 0; });
    return { ctx, out: master };
  } catch {
    broken = true;
    ctx = null; master = null;
    return null;
  }
}

/** Call from inside a user gesture (a press, a key, a tap). Creates the audio context if needed and wakes it up (iOS Safari needs
 *  the resume to happen in the gesture handler). Safe to call as often as you like. */
function unlock() {
  if (typeof window === "undefined" || broken) return;
  gestured = true;
  const bus = create();
  if (!bus) return;
  if (bus.ctx.state !== "running") bus.ctx.resume().catch(() => {});
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// ---- building blocks -------------------------------------------------------------------------------------------------------
// every voice: source -> optional filter -> envelope gain -> bus. The envelope starts at silence and ends at silence, so there are
// no clicks at the start or end; the source is stopped just after the tail.

function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, FLOOR * 2), t + attack);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + attack + decay);
}

function finish(src: AudioScheduledSourceNode, nodes: AudioNode[], end: number) {
  voices++;
  src.stop(end + 0.03);
  src.onended = () => {
    voices = Math.max(0, voices - 1);
    for (const n of nodes) { try { n.disconnect(); } catch { /* already gone */ } }
  };
}

type ToneOpts = { type?: OscillatorType; f: number; to?: number; t: number; peak: number; attack?: number; decay: number; lp?: number };
/** A pitched blip: an oscillator (optionally gliding from f to `to`), shaped by a fast attack and an exponential decay. */
function tone(bus: Bus, o: ToneOpts) {
  const { ctx: c } = bus;
  const attack = o.attack ?? 0.003;
  const osc = c.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + attack + o.decay);
  const g = c.createGain();
  envelope(g, o.t, o.peak, attack, o.decay);
  const nodes: AudioNode[] = [osc, g];
  let tail: AudioNode = osc;
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lp;
    f.Q.value = 0.5;
    osc.connect(f);
    tail = f;
    nodes.push(f);
  }
  tail.connect(g);
  g.connect(bus.out);
  osc.start(o.t);
  finish(osc, nodes, o.t + attack + o.decay);
}

type NoiseOpts = { t: number; peak: number; attack?: number; decay: number; type: BiquadFilterType; f: number; to?: number; q?: number };
/** A burst of filtered noise: the "tick" of a click, or a whoosh when it is long and its filter sweeps. */
function burst(bus: Bus, o: NoiseOpts) {
  const { ctx: c } = bus;
  const attack = o.attack ?? 0.001;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f, o.t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, o.t + attack + o.decay);
  const g = c.createGain();
  envelope(g, o.t, o.peak, attack, o.decay);
  src.connect(f); f.connect(g); g.connect(bus.out);
  src.start(o.t, Math.random() * 0.3);
  finish(src, [src, f, g], o.t + attack + o.decay);
}

// ---- the sounds ------------------------------------------------------------------------------------------------------------
// Each is a function of the start time `t` and a small random `v` (about 0.97 to 1.03) that nudges the pitch of the everyday
// sounds so that pressing a lot of things does not sound like the same sample over and over.

const SOUNDS: Record<SfxName, (b: Bus, t: number, v: number) => void> = {
  // a crisp tick on top, a short mid "tok", and a soft low body that drops in pitch: about 100 ms
  click(b, t, v) {
    burst(b, { t, peak: 0.34, decay: 0.014, type: "bandpass", f: 4300 * v, q: 1.1 });
    tone(b, { t, f: 1500 * v, to: 900 * v, peak: 0.2, decay: 0.035, lp: 5000 });
    tone(b, { t, f: 190 * v, to: 118 * v, peak: 0.62, attack: 0.002, decay: 0.09 });
  },
  // the same family, a little higher and shorter: choosing something (a card, a row, a segment)
  select(b, t, v) {
    burst(b, { t, peak: 0.3, decay: 0.012, type: "bandpass", f: 5200 * v, q: 1.1 });
    tone(b, { t, f: 2100 * v, to: 1300 * v, peak: 0.2, decay: 0.03, lp: 6000 });
    tone(b, { t, f: 280 * v, to: 175 * v, peak: 0.5, attack: 0.002, decay: 0.075 });
  },
  // a brighter two-step blip, rising (A5 then E6, a fifth apart): about 150 ms
  confirm(b, t) {
    burst(b, { t, peak: 0.22, decay: 0.012, type: "highpass", f: 3500 });
    tone(b, { t, f: 880, peak: 0.42, decay: 0.07, lp: 6500 });
    tone(b, { t, f: 1760, peak: 0.09, decay: 0.05, lp: 7000 });
    tone(b, { t, f: 220, to: 170, peak: 0.34, decay: 0.07 });
    tone(b, { t: t + 0.06, f: 1318.5, peak: 0.4, decay: 0.09, lp: 6500 });
    tone(b, { t: t + 0.06, f: 2637, peak: 0.07, decay: 0.06, lp: 7000 });
  },
  // softer, lower, falling: about 130 ms
  back(b, t) {
    tone(b, { t, f: 540, peak: 0.34, decay: 0.06, lp: 2600 });
    tone(b, { t: t + 0.05, f: 380, peak: 0.34, decay: 0.08, lp: 2200 });
    tone(b, { t, f: 150, to: 110, peak: 0.36, decay: 0.1 });
  },
  // a switch flipping: two quick triangle ticks, the second a step up: about 90 ms
  toggle(b, t, v) {
    tone(b, { t, type: "triangle", f: 1050 * v, peak: 0.3, decay: 0.026, lp: 4500 });
    tone(b, { t: t + 0.032, type: "triangle", f: 1560 * v, peak: 0.3, decay: 0.04, lp: 5000 });
    tone(b, { t, f: 170 * v, to: 130 * v, peak: 0.3, decay: 0.07 });
  },
  // a swoosh of band-passed noise sweeping upward, with a soft swell: about 320 ms
  whoosh(b, t) {
    burst(b, { t, peak: 0.55, attack: 0.09, decay: 0.23, type: "bandpass", f: 450, to: 3400, q: 0.9 });
    burst(b, { t, peak: 0.16, attack: 0.1, decay: 0.2, type: "highpass", f: 2500, to: 6500, q: 0.5 });
    tone(b, { t, f: 140, to: 260, peak: 0.12, attack: 0.08, decay: 0.2 });
  },
  // very quiet, very short: a tiny high tick
  hover(b, t, v) {
    tone(b, { t, type: "triangle", f: 2800 * v, peak: 0.1, attack: 0.002, decay: 0.014, lp: 6000 });
    burst(b, { t, peak: 0.04, decay: 0.008, type: "highpass", f: 5000 });
  },
};

// ---- public API ------------------------------------------------------------------------------------------------------------

function play(name: SfxName) {
  try {
    if (typeof window === "undefined" || broken || !gestured || muted) return;
    if (!isSfxName(name)) return;
    if (document.visibilityState === "hidden") return;
    const now = performance.now();
    if (now - (lastAt[name] ?? -1e9) < MIN_GAP[name]) return;      // rapid presses do not stack into noise
    if (voices >= MAX_VOICES) return;
    const bus = create();
    if (!bus) return;
    if (bus.ctx.state !== "running") {
      // not awake yet (the first press while it is still resuming): let a couple through, but never build up a backlog that
      // would all play at once if the browser keeps the context asleep
      bus.ctx.resume().catch(() => {});
      if (++queuedWhileSuspended > 2) return;
    }
    lastAt[name] = now;
    const v = 0.97 + Math.random() * 0.06;
    SOUNDS[name](bus, bus.ctx.currentTime + 0.004, v);
  } catch {
    // a sound must never break the page
  }
}

export const sfx = {
  play,
  unlock,
  setMuted(m: boolean) { muted = m; applyGain(); },
  isMuted: () => muted,
  setVolume(v: number) { volume = Math.min(1, Math.max(0, v)); applyGain(); },
};
