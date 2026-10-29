// Player cards in the style of the football game: an overall rating and six attributes, worked out
// from what the video measured over the season.
//
// Each attribute ranks the player against the squad's outfield players on several measures, each a
// rate per minute named on camera: the best in the squad gets about 90, the least about 45, so the
// cards spread out instead of all sitting near the middle. A short spell is less certain than a long
// one, so every rate counts SHRINK_MIN extra minutes in which nothing happened: a cameo has to show
// something to rate well, and a few lucky minutes count for less than the same rate kept up for 40.
// Shares (pass accuracy, keeping the ball) start from the squad's own share instead.
//
// The overall is half the player's average match rating and half their attributes weighted for their
// position: a centre-back's overall leans on defending and physical, a striker's on shooting and pace.
// Then it's pulled toward 55 a little for players seen only briefly.
import type { SeasonPlayer } from "./season";

export type Attr = "PAC" | "SHO" | "PAS" | "DRI" | "DEF" | "PHY";
export type Card = {
  id: number; ovr: number | null; pos: string; tier: "gold" | "silver" | "bronze" | "none";
  // false for a player the system can't rate yet (keepers: saves aren't measured): the card shows ?? and no colour
  rated: boolean;
  attrs: Record<Attr, number>;
};

export const ATTR_NOTES: Record<Attr, string> = {
  PAC: "Pace: top speed held for a full second, and sprints a minute",
  SHO: "Shooting: goals, shots on target and shots a minute",
  PAS: "Passing: completed passes and forward passes a minute, and pass accuracy",
  DRI: "Dribbling: runs with the ball and touches a minute, and keeping the ball (less often tackled or cut out)",
  DEF: "Defending: tackles won, interceptions and clearances a minute, and pressing their player on the ball",
  PHY: "Physical: metres covered a minute, sprints, and time spent closing down their ball carrier",
};

const MIN_MINUTES = 5;          // fewer minutes than this is too little to put on a card
const POOL_MIN = 8;             // players named on camera at least this long set the squad's ranks
const SHRINK_MIN = 10;          // minutes in which nothing happened, added to every rate
const SEEN_FOR_FULL = 8;        // minutes named on camera at which the overall is half trusted
const LOW = 45, HIGH = 90;      // the least and the best in the squad

type Group = "DEF" | "MID" | "WIDE" | "ATT";
const GROUP: Record<string, Group> = { CB: "DEF", FB: "DEF", CDM: "MID", CM: "MID", LM: "WIDE", RM: "WIDE", AM: "WIDE", ST: "ATT" };
// how much each attribute counts toward the overall, by position group
const WEIGHTS: Record<Group, Record<Attr, number>> = {
  DEF: { PAC: 0.1, SHO: 0.05, PAS: 0.2, DRI: 0.05, DEF: 0.35, PHY: 0.25 },
  MID: { PAC: 0.05, SHO: 0.05, PAS: 0.35, DRI: 0.2, DEF: 0.2, PHY: 0.15 },
  WIDE: { PAC: 0.25, SHO: 0.15, PAS: 0.2, DRI: 0.25, DEF: 0.05, PHY: 0.1 },
  ATT: { PAC: 0.2, SHO: 0.4, PAS: 0.1, DRI: 0.2, DEF: 0.0, PHY: 0.1 },
};
const EVEN: Record<Attr, number> = { PAC: 1 / 6, SHO: 1 / 6, PAS: 1 / 6, DRI: 1 / 6, DEF: 1 / 6, PHY: 1 / 6 };

// the measures, each a count over the season (rated per minute below)
type Measure = { count: (p: SeasonPlayer) => number; per?: "judged" | "played" | "touch" | "pass" };
const M: Record<string, Measure> = {
  shooting: { count: (p) => 4 * p.goals + 1.5 * p.shotsOnTarget + 0.5 * p.shots },
  passes: { count: (p) => p.passes },
  forward: { count: (p) => p.passesForward },
  carries: { count: (p) => p.carries },
  touches: { count: (p) => p.touches },
  wins: { count: (p) => p.tackles + p.interceptions + 0.5 * p.clearances },
  presses: { count: (p) => p.pressures },
  pressS: { count: (p) => p.pressS },
  sprints: { count: (p) => p.sprints, per: "played" },
  metres: { count: (p) => 1000 * p.distanceKm, per: "played" },
  // shares: the squad's rate of good outcomes, not per minute
  accuracy: { count: (p) => p.passes, per: "pass" },
  kept: { count: (p) => Math.max(0, p.touches - p.turnovers), per: "touch" },
};

const minutesFor = (p: SeasonPlayer, per: Measure["per"]) =>
  per === "played" ? p.minutes : per === "touch" ? p.touches : per === "pass" ? p.passesAttempted : p.judgedMin;

export type Baseline = { squad: Record<string, number>; pool: Record<string, number[]>; topSpeed: number[] };

function rate(p: SeasonPlayer, key: string, squad: number): number {
  const m = M[key];
  const n = minutesFor(p, m.per);
  if (m.per === "touch" || m.per === "pass") return (m.count(p) + 5 * squad) / (n + 5);   // a share: from the squad's
  return m.count(p) / (n + SHRINK_MIN);
}

// the squad's rates (the pool: outfield players seen long enough) that every card is ranked against
export function teamBaseline(rows: SeasonPlayer[]): Baseline {
  const out = rows.filter((r) => !r.keeper && r.judgedMin > 0);
  const squad: Record<string, number> = {};
  for (const [k, m] of Object.entries(M)) {
    const n = out.reduce((a, r) => a + minutesFor(r, m.per), 0);
    squad[k] = n > 0 ? out.reduce((a, r) => a + m.count(r), 0) / n : 0;
  }
  const poolRows = out.filter((r) => r.judgedMin >= POOL_MIN);
  const pool: Record<string, number[]> = {};
  for (const k of Object.keys(M)) pool[k] = poolRows.map((r) => rate(r, k, squad[k])).sort((a, b) => a - b);
  const topSpeed = poolRows.map((r) => r.topSpeed).filter((v): v is number => v !== null).sort((a, b) => a - b);
  return { squad, pool, topSpeed };
}

// where a value sits among the pool's: 0 below everyone, 1 above everyone (ties count half);
// none at all is the bottom, however many others also have none
function rank(sorted: number[], v: number): number {
  if (!sorted.length) return 0.5;
  if (v <= 0) return 0;
  const below = sorted.filter((x) => x < v).length;
  const same = sorted.filter((x) => x === v).length;
  return Math.max(0, Math.min(1, (below + same / 2) / sorted.length));
}

const clamp = (v: number, lo = 40, hi = 99) => Math.max(lo, Math.min(hi, v));
const scale = (r: number) => Math.round(LOW + (HIGH - LOW) * r);

export function cardFor(p: SeasonPlayer, keeper: boolean, base: Baseline): Card {
  const r = (k: string) => rank(base.pool[k], rate(p, k, base.squad[k]));
  const pace = p.topSpeed !== null ? rank(base.topSpeed, p.topSpeed) : 0.3;
  const parts: Record<Attr, number> = {
    PAC: 0.6 * pace + 0.4 * r("sprints"),
    SHO: r("shooting"),
    PAS: 0.4 * r("passes") + 0.3 * r("forward") + 0.3 * r("accuracy"),
    DRI: 0.5 * r("carries") + 0.3 * r("touches") + 0.2 * r("kept"),
    DEF: 0.6 * r("wins") + 0.4 * r("presses"),
    PHY: 0.5 * r("metres") + 0.25 * r("sprints") + 0.25 * r("pressS"),
  };
  const attrs = Object.fromEntries((Object.keys(parts) as Attr[]).map((k) => [k, scale(parts[k])])) as Record<Attr, number>;
  const group = p.position ? GROUP[p.position] : undefined;
  const w = group ? WEIGHTS[group] : EVEN;
  const role = (Object.keys(w) as Attr[]).reduce((a, k) => a + w[k] * attrs[k], 0);
  // the overall: half the match rating (6.0 is an ordinary game, 9.0 a great one), half the attributes for
  // their position, then trusted in proportion to how long they've been seen
  const rated = !keeper && p.avgRating !== null && p.minutes >= MIN_MINUTES;
  const fromRating = p.avgRating !== null ? clamp(55 + ((p.avgRating - 6) * 37) / 3) : 55;
  const trust = p.judgedMin / (p.judgedMin + SEEN_FOR_FULL);
  const ovr = rated ? Math.round(clamp(55 + (0.5 * fromRating + 0.5 * role - 55) * (0.5 + 0.5 * trust))) : null;
  const pos = keeper ? "GK" : p.position ?? "MID";
  const tier = ovr === null ? "none" : ovr >= 75 ? "gold" : ovr >= 65 ? "silver" : "bronze";
  return { id: p.id, ovr, pos, tier, rated, attrs };
}
