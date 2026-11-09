// The squad as the cards see it: every player's card, the team rating, and the best seven on a pitch.
// Kept in one place so the header badge, the home page and the Players page always agree.
import { cardFor, teamBaseline, weighsLike, type Baseline, type Card } from "./cards";
import { CARD_POSITION, KEEPER_CARD } from "./card-overrides";
import type { Match, Player } from "./data";
import { matches, players } from "./data";
import { seasonPlayers, type SeasonPlayer } from "./season";
import { keeperCardId, type UtPlayer } from "./ut";

export type CardedPlayer = { p: Player; card: Card | null };

// a card for someone with nothing on the video yet (a guest who hasn't played): ?? everywhere, no colour
export function blankCard(p: Player): Card {
  return { id: p.id, ovr: null, pos: p.keeper ? "GK" : p.position ?? "MID", tier: "none", rated: false,
    attrs: { PAC: 0, SHO: 0, PAS: 0, DRI: 0, DEF: 0, PHY: 0 } };
}

// A player's main card: worked out from the video (or blank), with the position label the site keeps for them if it
// has one (lib/card-overrides.ts). Only the label is swapped: the overall and the attributes stay as worked out.
export function mainCard(p: Player, row: SeasonPlayer | undefined, base: Baseline): Card {
  const card = row ? cardFor(row, p.keeper, base) : blankCard(p);
  const pos = CARD_POSITION[p.slug];
  if (!pos || pos === card.pos) return card;
  // ratedAs keeps the position the overall was weighed for, when the label's position would weigh it differently
  return weighsLike(pos, card.pos) ? { ...card, pos } : { ...card, pos, ratedAs: card.pos };
}

// A second, goalkeeper card for a player who has one (lib/card-overrides.ts), or null. It shows ?? for the overall and
// every attribute: nothing is measured for a keeper's work yet, so no number is made up. It never feeds the squad's
// ratings or leaderboards (those use the main card only). Ultimate Team has both cards (see utPlayers below).
export function keeperCard(p: Player): Card | null {
  if (!KEEPER_CARD.includes(p.slug)) return null;
  return { id: p.id, ovr: null, pos: "GK", tier: "none", rated: false, gkCard: true,
    attrs: { PAC: 0, SHO: 0, PAS: 0, DRI: 0, DEF: 0, PHY: 0 } };
}

// every player's card this season (a blank one for anyone who hasn't played yet), best first
export function squadCards(ms: Match[] = matches()): CardedPlayer[] {
  const rows = seasonPlayers(ms);
  const base = teamBaseline(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return players().map((p) => ({ p, card: mainCard(p, byId.get(p.id), base) }))
    .sort((a, b) => (b.card?.ovr ?? -1) - (a.card?.ovr ?? -1) || a.p.name.localeCompare(b.p.name));
}

// The cards Ultimate Team can put on its pitch: one per player, and two for a player with a goalkeeper card (his main card
// keeps his id and its own position label; the keeper card gets keeperCardId(id)). Both belong to the same person
// (player.id), who can stand on the pitch once. A player whose card has a position label of its own (CARD_POSITION:
// Arav CDM, Wasif CAM) shows that label here too, on the bench, the pitch and the Summary; where he fits is then
// worked out from that label (lib/ut.ts positionFit). Everyone else keeps his roster position.
export function utPlayers(cards: CardedPlayer[]): UtPlayer[] {
  return cards.filter((c) => c.card).flatMap(({ p, card }): UtPlayer[] => {
    const gk = keeperCard(p);
    const label = CARD_POSITION[p.slug] ?? (gk ? card!.pos : undefined);
    const main: UtPlayer = label ? { id: p.id, player: p, card: card!, pos: label } : { id: p.id, player: p, card: card! };
    return gk ? [main, { id: keeperCardId(p.id), player: p, card: gk, pos: "GK" }] : [main];
  });
}

export const TEAM_SIZE = 7;                 // seven-a-side

// The team rating: the average overall of the seven best rated cards in the squad (guests on loan left out).
export function teamRating(cards: CardedPlayer[] = squadCards()): number | null {
  const best = cards.filter((c) => !c.p.loan && c.card?.rated && c.card.ovr !== null).slice(0, TEAM_SIZE);
  if (best.length < TEAM_SIZE) return null;
  return Math.round(best.reduce((a, c) => a + c.card!.ovr!, 0) / TEAM_SIZE);
}

// A seven-a-side 2-3-1: the best card at each slot, picked by where each player usually plays.
export type Slot = { key: string; label: string; x: number; y: number; wants: string[] };
export const SLOTS: Slot[] = [
  { key: "st", label: "ST", x: 50, y: 17, wants: ["ST", "CF", "AM"] },
  { key: "lm", label: "LM", x: 19, y: 43, wants: ["LM", "LW"] },
  { key: "cm", label: "CDM", x: 50, y: 47, wants: ["CDM", "CM"] },
  { key: "rm", label: "RM", x: 81, y: 43, wants: ["RM", "RW"] },
  { key: "lcb", label: "CB", x: 33, y: 70, wants: ["CB", "FB"] },
  { key: "rcb", label: "CB", x: 67, y: 70, wants: ["CB", "FB"] },
  { key: "gk", label: "GK", x: 50, y: 86, wants: ["GK"] },
];

export function lineup(cards: CardedPlayer[] = squadCards()): { starters: { slot: Slot; c: CardedPlayer }[]; subs: CardedPlayer[] } {
  const pool = cards.filter((c) => !c.p.loan && c.card);
  const used = new Set<number>();
  const starters: { slot: Slot; c: CardedPlayer }[] = [];
  for (const slot of SLOTS) {
    const pick = pool.find((c) => !used.has(c.p.id) && slot.wants.includes(c.p.position ?? c.card!.pos));
    if (pick) { used.add(pick.p.id); starters.push({ slot, c: pick }); }
  }
  return { starters, subs: pool.filter((c) => !used.has(c.p.id)) };
}

// FIFA's habit: blue for attack, green for midfield, amber for defence, orange for keepers
export function posGroup(pos: string | null | undefined): "att" | "mid" | "def" | "gk" {
  if (!pos) return "mid";
  if (pos === "GK") return "gk";
  if (["CB", "FB", "LB", "RB"].includes(pos)) return "def";
  if (["ST", "CF"].includes(pos)) return "att";
  return "mid";
}
