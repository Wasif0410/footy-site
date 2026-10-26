// Player cards in the style of the football game: an overall rating and six attributes, worked out
// from what the video measured over the season, on a 40-99 scale.
//
// Every count is a rate per minute named on camera (the time the ratings are judged on), and every
// rate is set against our own squad: the team's average is 65, twice the team's average is 85, and
// the scale flattens above that, so 90+ needs something special kept up over real minutes.
// A short spell is less certain than a long one, so each player's rate is blended with the team's
// as if they'd also played SHRINK_MIN minutes at the team's average: over a full match the card is
// almost all their own numbers; over 10 minutes it sits halfway to the team's.
import type { SeasonPlayer } from "./season";

export type Attr = "PAC" | "SHO" | "PAS" | "DRI" | "DEF" | "PHY";
export type Card = {
  id: number; ovr: number | null; pos: "ATT" | "MID" | "DEF" | "GK"; tier: "gold" | "silver" | "bronze" | "none";
  // false for a player the system can't rate yet (keepers: saves aren't measured): the card shows ?? and no colour
  rated: boolean;
  attrs: Record<Attr, number>;
};

export const ATTR_NOTES: Record<Attr, string> = {
  PAC: "Pace: top speed held for a full second",
  SHO: "Shooting: goals, shots on target and shots a minute, against the squad's average",
  PAS: "Passing: pass accuracy and passes a minute, against the squad's average",
  DRI: "Dribbling: touches and runs with the ball a minute, less the times they were tackled, against the squad's average",
  DEF: "Defending: tackles won and interceptions a minute, against the squad's average",
  PHY: "Physical: metres covered a minute and sprints, against the squad's average",
};

const MIN_MINUTES = 5;                       // fewer minutes than this is too little to put on a card
const SHRINK_MIN = 10;                       // minutes of the team's average blended into every rate
const SHRINK_PASSES = 5;                     // passes at the team's accuracy blended into pass accuracy

// what each attribute counts, per player
const shooting = (p: SeasonPlayer) => 4 * p.goals + 1.5 * p.shotsOnTarget + 0.5 * p.shots;
const passing = (p: SeasonPlayer) => p.passes + p.passesForward;
const dribbling = (p: SeasonPlayer) => Math.max(0, p.touches + 2 * p.carries - 2 * p.dispossessed);
const pace = (p: SeasonPlayer) => (p.minutes > 0 ? (1000 * p.distanceKm) / p.minutes : 0);   // metres a minute

type Rates = { sho: number; pas: number; dri: number; def: number; spr: number; passPct: number; pace: number };
export type Baseline = { sections: Record<string, number>; rates: Rates };

export function teamBaseline(rows: SeasonPlayer[]): Baseline {
  const sections: Record<string, number> = {};
  for (const k of ["Attacking", "On the ball", "Defending"]) {
    const rates = rows.filter((r) => r.judgedMin > 0).map((r) => (60 * (r.sections[k] ?? 0)) / r.judgedMin);
    sections[k] = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  }
  // the squad's rates (outfield, a minute named on camera): what 65 on a card means
  const out = rows.filter((r) => !r.keeper && r.judgedMin > 0);
  const mins = out.reduce((a, r) => a + r.judgedMin, 0) || 1;
  const per = (f: (p: SeasonPlayer) => number) => out.reduce((a, r) => a + f(r), 0) / mins;
  const tried = out.reduce((a, r) => a + r.passesAttempted, 0);
  const played = out.reduce((a, r) => a + r.minutes, 0) || 1;
  const rates: Rates = {
    sho: per(shooting), pas: per(passing), dri: per(dribbling), def: per((p) => p.ballsWon), spr: per((p) => p.sprints),
    passPct: tried ? out.reduce((a, r) => a + r.passes, 0) / tried : 0.7,
    pace: (1000 * out.reduce((a, r) => a + r.distanceKm, 0)) / played,
  };
  return { sections, rates };
}

const clamp = (v: number, lo = 40, hi = 99) => Math.max(lo, Math.min(hi, v));
// a straight line from (x0, y0) to (x1, y1), held to the card's 40-99 scale
const line = (x: number, x0: number, y0: number, x1: number, y1: number) => clamp(y0 + ((x - x0) * (y1 - y0)) / (x1 - x0));
// a rate against the team's: none 45, the team's average 65, twice it 85, then flattening toward 99
const vsTeam = (rate: number, team: number) => {
  if (team <= 0) return 45;
  const x = rate / team;
  return clamp(x <= 2 ? 45 + 20 * x : 85 + 14 * (1 - Math.exp(-(x - 2))));
};

export function cardFor(p: SeasonPlayer, keeper: boolean, base: Baseline): Card {
  const t = base.rates;
  const m = p.judgedMin;
  // their rate a minute, blended with the team's as if they'd also played SHRINK_MIN minutes at its average
  const rate = (count: number, team: number) => (count + SHRINK_MIN * team) / (m + SHRINK_MIN);
  const pac = p.topSpeed !== null ? line(p.topSpeed, 17, 50, 27, 92) : 50;
  const sho = vsTeam(rate(shooting(p), t.sho), t.sho);
  const accuracy = (p.passes + SHRINK_PASSES * t.passPct) / (p.passesAttempted + SHRINK_PASSES);
  const pas = 0.6 * clamp(65 + (20 * (accuracy - t.passPct)) / Math.max(0.05, 1 - t.passPct)) + 0.4 * vsTeam(rate(passing(p), t.pas), t.pas);
  const dri = vsTeam(rate(dribbling(p), t.dri), t.dri);
  const def = vsTeam(rate(p.ballsWon, t.def), t.def);
  const steady = (pace(p) * m + SHRINK_MIN * t.pace) / (m + SHRINK_MIN);              // metres a minute, blended
  const phy = 0.7 * clamp(65 + (80 * (steady - t.pace)) / Math.max(1, t.pace)) + 0.3 * vsTeam(rate(p.sprints, t.spr), t.spr);
  const attrs = Object.fromEntries(
    (["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as Attr[]).map((k, i) => [k, Math.round(clamp([pac, sho, pas, dri, def, phy][i]))]),
  ) as Record<Attr, number>;
  const mean = Object.values(attrs).reduce((a, b) => a + b, 0) / 6;
  // the overall is mostly the match rating (already judged per minute against the team), topped up by the attributes
  const rated = !keeper && p.avgRating !== null && p.minutes >= MIN_MINUTES;
  const ovr = rated ? Math.round(clamp(0.75 * line(p.avgRating!, 4, 55, 9.5, 95) + 0.25 * mean)) : null;
  // where their rating points come from, against the team's average: attack, on the ball, or defending
  const share = (k: string) => (p.judgedMin > 0 ? (60 * (p.sections[k] ?? 0)) / p.judgedMin : 0) / Math.max(0.1, base.sections[k] ?? 0);
  const best = ([["ATT", share("Attacking")], ["MID", share("On the ball")], ["DEF", share("Defending")]] as const)
    .reduce((a, b) => (b[1] > a[1] ? b : a));
  const pos = keeper ? "GK" : best[1] > 0 ? best[0] : "MID";
  const tier = ovr === null ? "none" : ovr >= 75 ? "gold" : ovr >= 65 ? "silver" : "bronze";
  return { id: p.id, ovr, pos, tier, rated, attrs };
}
