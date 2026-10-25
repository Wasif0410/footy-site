// Small shared formatting rules, so every page says things the same way.
import type { Moment } from "./data";

export const minute = (m: number) => `${m}'`;

export function longDate(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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

// a crest's letters: "Our Team" -> "OT", "OUR" -> "OUR", "Opponent" -> "OPP"
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).slice(0, 3).toUpperCase();
}

// One line of play-by-play, written the way a commentator would put it.
export function describe(m: Moment, opponent: string): string {
  const a = m.from?.name ?? "Someone";
  const b = m.to?.name;
  const them = (w: { team: number | null } | null) => w?.team === 1;
  switch (m.kind) {
    case "goal":
      return m.team === 0 ? `Goal! ${m.from?.name ?? "We score"}${m.to ? `, assisted by ${m.to.name}` : ""}` : `Goal for ${opponent}`;
    case "shot":
      return `${them(m.from) ? opponent : a} shoots, ${m.on_target ? "on target" : "off target"}`;
    case "pass":
      return `${a} ${m.forward ? "plays it forward to" : "passes to"} ${b ?? "a teammate"}`;
    case "pass_intercepted":
      return them(m.from) ? `${b ?? "We"} intercept${b ? "s" : ""} ${opponent}'s pass` : `${a}'s pass is cut out by ${opponent}`;
    case "tackle":
      return them(m.from) ? `${b ?? "We"} win${b ? "s" : ""} the ball back from ${opponent}` : `${a} loses the ball to a tackle`;
    case "ball_out":
      return them(m.from) ? `${opponent} put it out of play` : `${a} puts it out of play`;
  }
}

// how a moment went for us: good, bad or neutral (colours the play-by-play)
export function tone(m: Moment): "good" | "bad" | "neutral" {
  if (m.kind === "goal") return m.team === 0 ? "good" : "bad";
  if (m.kind === "shot") return m.from?.team === 0 ? "good" : "bad";
  if (m.kind === "tackle" || m.kind === "pass_intercepted") return m.to?.team === 0 ? "good" : "bad";
  if (m.kind === "ball_out") return m.from?.team === 0 ? "bad" : "neutral";
  return "neutral";
}

export const KEY_KINDS = new Set(["goal", "shot", "tackle", "pass_intercepted"]);
