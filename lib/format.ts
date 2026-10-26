// Shared formatting rules, so every page says things the same way.
import type { Kind, Moment } from "./data";

export const minute = (m: number) => `${m}'`;

export function longDate(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function shortDate(iso: string | null): string {
  if (!iso) return "TBC";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "short" });
}

// rating bands, as football apps colour them
export function ratingBand(r: number | null): "elite" | "good" | "fair" | "poor" | "none" {
  if (r === null) return "none";
  return r >= 8 ? "elite" : r >= 7 ? "good" : r >= 6 ? "fair" : "poor";
}

export const fmt = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(digits);

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "–" : `${Math.round(v)}%`);

export const signed = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The match clock at a moment of the video, as the app says it: "1st half 12:34", "Half-time"...
export function matchClock(t: number, periods: [number, number][]): string {
  if (!periods.length) return mmss(t);
  if (t < periods[0][0]) return "Warm-up";
  let before = 0;
  for (let i = 0; i < periods.length; i++) {
    const [a, b] = periods[i];
    if (t >= a && t < b) return `${["1st half", "2nd half", "Extra time"][Math.min(i, 2)]} ${mmss(before + t - a)}`;
    before += b - a;
    if (i + 1 < periods.length && t >= b && t < periods[i + 1][0]) return "Half-time";
  }
  return "Full time";
}

// Seconds of play before a moment of the video (for "played so far").
export function playBefore(t: number, periods: [number, number][]): number {
  return periods.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, t) - a), 0);
}

// What each kind of moment is called, as the app labels them.
export const KIND_LABEL: Record<Kind, string> = {
  pass: "Pass", pass_intercepted: "Pass intercepted", tackle: "Tackle", ball_out: "Ball out", shot: "Shot", goal: "Goal",
};

// One line of play-by-play: who did what, in plain words (the label says what kind of moment it was).
export function describe(m: Moment, opponent: string): string {
  const a = m.from?.name ?? "Someone";
  const b = m.to?.name;
  const them = (w: { team: number | null } | null) => w?.team === 1;
  switch (m.kind) {
    case "goal":
      return m.team === 0 ? `${m.from?.name ?? "Seven XI"} scores${m.to ? `, assisted by ${m.to.name}` : ""}` : `${opponent} score`;
    case "shot":
      return `${them(m.from) ? opponent : a}, ${m.on_target ? "on target" : "off target"}`;
    case "pass":
      return `${a} to ${b ?? "a teammate"}${m.forward ? ", forward" : ""}`;
    case "pass_intercepted":
      return them(m.from) ? `${b ?? "We"} cut out ${opponent}'s pass` : `${a}'s pass cut out by ${opponent}`;
    case "tackle":
      return them(m.from) ? `${b ?? "We"} win${b ? "s" : ""} it back from ${opponent}` : `${a} tackled by ${opponent}`;
    case "ball_out":
      return them(m.from) ? `${opponent} put it out` : `${a} puts it out`;
  }
}

// how a moment went for us: good, bad or neutral
export function tone(m: Moment): "good" | "bad" | "neutral" {
  if (m.kind === "goal") return m.team === 0 ? "good" : "bad";
  if (m.kind === "shot") return m.from?.team === 0 ? "good" : "bad";
  if (m.kind === "tackle" || m.kind === "pass_intercepted") return m.to?.team === 0 ? "good" : "bad";
  if (m.kind === "ball_out") return m.from?.team === 0 ? "bad" : "neutral";
  return "neutral";
}

export const KEY_KINDS = new Set<Kind>(["goal", "shot", "tackle", "pass_intercepted"]);

// Our ball-winning moments for the highlights: "Critical tackle" when won in our third (it stopped a chance).
export function winTag(m: Moment): string {
  const tackle = m.kind === "tackle";
  return m.critical ? (tackle ? "Critical tackle" : "Critical interception") : tackle ? "Tackle won" : "Interception";
}
export const winner = (m: Moment) => (m.to?.id ? m.to.name : "A Seven XI player");
