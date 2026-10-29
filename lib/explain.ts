// Plain-words reasons for a match rating and for a card, written from the numbers themselves, so
// every player sees why they got what they got. Nothing here is a judgement call: it only says
// which numbers moved the rating or the attribute, and by how much.
import type { Formula, MatchPlayer } from "./data";
import type { Attr, Baseline, Card } from "./cards";
import type { SeasonPlayer } from "./season";
import { mmss } from "./format";

const POS_NAME: Record<string, string> = {
  GK: "keeper", CB: "centre-back", FB: "full-back", CDM: "defensive midfielder", CM: "central midfielder",
  LM: "left midfielder", RM: "right midfielder", AM: "attacking midfielder", ST: "striker",
};
const pts = (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;
const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function verdict(r: number): string {
  if (r >= 8.5) return "An outstanding game";
  if (r >= 7.5) return "A very good game";
  if (r >= 6.8) return "A good game";
  if (r >= 6.3) return "A solid game";
  return "A quiet game";
}

// why a player got their rating in one match
export function whyRating(r: MatchPlayer, name: string, f: Formula): string[] {
  if (r.keeper) return [`${name} was in goal. Keepers aren't rated yet because saves aren't measured.`];
  if (r.rating === null) return [`${name} played ${mmss(r.minutes * 60)}, too little to rate.`];
  const lines = r.breakdown.filter((b) => b.count && b.points);
  const good = lines.filter((b) => b.points > 0).sort((a, b) => b.points - a.points);
  const bad = lines.filter((b) => b.points < 0).sort((a, b) => a.points - b.points);
  const out: string[] = [];
  const top = good.slice(0, 3).map((b) => `${lower(b.label)} (${n(b.count)}, ${pts(b.points)})`);
  out.push(`${verdict(r.rating)}: ${r.rating.toFixed(1)} from ${pts(r.points ?? 0)} points in ${mmss(r.minutes * 60)}.`
    + (top.length ? ` Most of it came from ${top.join(", ")}.` : ` ${name} did little on the ball, so the rating stays near the 6.0 everyone starts from.`));
  if (bad.length) {
    const lost = bad.reduce((a, b) => a + b.points, 0);
    out.push(`Held back by ${bad.slice(0, 2).map((b) => `${lower(b.label)} (${n(b.count)})`).join(" and ")}, ${pts(lost)} in all.`);
  } else if (good.length) {
    out.push("No costly mistakes: nothing took points away.");
  }
  const group = r.position ? f.roles?.[r.position] : undefined;
  const w = group ? f.role_weights?.[group] : undefined;
  if (r.position && w) {
    const up = Object.entries(w).filter(([, v]) => v > 1).map(([k, v]) => `${lower(k)} ×${v}`);
    const down = Object.entries(w).filter(([, v]) => v < 1).map(([k, v]) => `${lower(k)} ×${v}`);
    out.push(`Judged as a ${POS_NAME[r.position] ?? r.position}: ${[...up, ...down].join(", ")}`
      + " (goals and assists count the same for everyone).");
  }
  out.push(r.checked
    ? "Every moment the ball came near them was checked from the video, and each line links to it."
    : "Counted from the system's events and the ones checked so far; each line links to its moments.");
  return out;
}

// what each attribute is built from, in this player's own numbers
function evidence(k: Attr, p: SeasonPlayer): string {
  const perMin = (x: number) => (p.judgedMin > 0 ? (x / p.judgedMin) * 10 : 0).toFixed(1);
  switch (k) {
    case "PAC": return p.topSpeed !== null ? `top speed ${p.topSpeed.toFixed(1)} km/h, ${p.sprints} sprints` : "too little tracking to measure speed";
    case "SHO": return p.shots ? `${p.goals} goals, ${p.shotsOnTarget} of ${p.shots} shots on target` : "no shots";
    case "PAS": return `${p.passes} of ${p.passesAttempted} passes completed (${p.passesForward} forward), ${perMin(p.passes)} every 10 minutes`;
    case "DRI": return `${p.carries} runs with the ball, ${p.touches} touches, lost it ${p.turnovers} times`;
    case "DEF": return `${p.tackles} tackles won, ${p.interceptions} interceptions, ${p.clearances} clearances, ${p.pressures} presses`;
    case "PHY": return `${p.minutes > 0 ? Math.round((1000 * p.distanceKm) / p.minutes) : 0} metres a minute, ${p.sprints} sprints`;
  }
}

const ATTR_NAME: Record<Attr, string> = { PAC: "pace", SHO: "shooting", PAS: "passing", DRI: "dribbling", DEF: "defending", PHY: "physical" };

// why a card looks the way it does
export function whyCard(card: Card, p: SeasonPlayer, name: string, _base: Baseline): string[] {
  if (!card.rated) return [`${name} has no card rating yet: keepers aren't rated, and outfield players need a few minutes on camera.`];
  const order = (Object.keys(card.attrs) as Attr[]).sort((a, b) => card.attrs[b] - card.attrs[a]);
  const best = order.slice(0, 2), worst = order.slice(-2).reverse();
  const out = [
    `Overall ${card.ovr}: half from their average match rating (${p.avgRating?.toFixed(1) ?? "–"} over ${p.ratedMatches} ${p.ratedMatches === 1 ? "game" : "games"}), half from their attributes weighted for a ${POS_NAME[card.pos] ?? card.pos}.`,
    `Strongest: ${best.map((k) => `${ATTR_NAME[k]} ${card.attrs[k]} (${evidence(k, p)})`).join("; ")}.`,
    `Weakest: ${worst.map((k) => `${ATTR_NAME[k]} ${card.attrs[k]} (${evidence(k, p)})`).join("; ")}.`,
  ];
  if (p.judgedMin < 15) out.push(`Only ${Math.round(p.judgedMin)} minutes judged so far, so the card is pulled toward the middle until there's more to go on.`);
  return out;
}
