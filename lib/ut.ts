// Ultimate Team: a seven-a-side squad builder in the style of the football game. Formations, the links
// between positions, chemistry and the team rating. Pure functions: they run on the server and in the browser.
//
// Chemistry comes from what the players really did together on the video: passes between the two (either
// way) and assists (one set up the other's goal). The pair counts are built at build time by lib/chemistry.ts.
import type { Attr, Card } from "./cards";
import type { Player } from "./data";

// One card in the pool. Almost always a player has one card and `id` is the player's id. A player with a second,
// goalkeeper card (lib/card-overrides.ts) has two UtPlayers: the main card keeps the player's id and the keeper card gets
// keeperCardId(id), so every card id is unique (React keys, data-pid and the swap flight all go by it). `pos` is then the
// position printed on that card, since the two cards are in different places. Everything about the PERSON (the
// links to teammates, the match data, the one-place-on-the-pitch rule) goes by `player.id`, never by `id`.
export type UtPlayer = { id: number; player: Player; card: Card; pos?: string };

export const KEEPER_CARD_ID = 1000;
export const keeperCardId = (playerId: number) => KEEPER_CARD_ID + playerId;

// what two players did together across the season, both directions added up
export type Pair = { passes: number; assists: number };
export type Pairs = Record<string, Pair>;
export const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Where each card stands, drawn attacking upwards on the squad screen's pitch. Each point is the card's foot (the
// card stands up from it, and the links meet there), in % of the pitch area (0,0 top left). Two sets:
//   x, y   - the wide screen (16:9). Cards are 7.7% of the width and 17.2% of the height; the middle column
//            (striker or midfielder, then the GK) is spaced a card and its label apart, and the wide players
//            stay clear of the corner panels (0-17% and 83-100%).
//   tx, ty - the tall screen of a phone or tablet (4:5). Cards are 14.1% of the width and 14.1% of the height, and
//            a card in the middle column stands 23% below the one above, room for the label on a phone.
// No two cards touch in either set (checked in the browser for every formation).
export type Slot = { key: string; pos: "GK" | "CB" | "CDM" | "CM" | "LM" | "RM" | "ST"; x: number; y: number; tx: number; ty: number };
export type Formation = { key: string; label: string; slots: Slot[]; links: [string, string][] };

export const FORMATIONS: Formation[] = [
  {
    key: "2-3-1", label: "2-3-1",
    slots: [
      { key: "st", pos: "ST", x: 50, y: 36.8, tx: 50, ty: 46 },
      { key: "lm", pos: "LM", x: 25, y: 54, tx: 15, ty: 64 },
      { key: "cm", pos: "CDM", x: 50, y: 60.4, tx: 50, ty: 69 },
      { key: "rm", pos: "RM", x: 75, y: 54, tx: 85, ty: 64 },
      { key: "lcb", pos: "CB", x: 37, y: 72.5, tx: 33, ty: 84 },
      { key: "rcb", pos: "CB", x: 63, y: 72.5, tx: 67, ty: 84 },
      { key: "gk", pos: "GK", x: 50, y: 84, tx: 50, ty: 92 },
    ],
    links: [["gk", "lcb"], ["gk", "rcb"], ["lcb", "rcb"], ["lcb", "lm"], ["lcb", "cm"], ["rcb", "cm"], ["rcb", "rm"],
      ["lm", "cm"], ["cm", "rm"], ["lm", "st"], ["cm", "st"], ["rm", "st"]],
  },
  {
    key: "3-2-1", label: "3-2-1",
    slots: [
      { key: "st", pos: "ST", x: 50, y: 36.8, tx: 50, ty: 46 },
      { key: "lcm", pos: "CM", x: 37, y: 48, tx: 33, ty: 57 },
      { key: "rcm", pos: "CM", x: 63, y: 48, tx: 67, ty: 57 },
      { key: "lcb", pos: "CB", x: 23, y: 60.4, tx: 15, ty: 69 },
      { key: "cb", pos: "CB", x: 50, y: 60.4, tx: 50, ty: 69 },
      { key: "rcb", pos: "CB", x: 77, y: 60.4, tx: 85, ty: 69 },
      { key: "gk", pos: "GK", x: 50, y: 84, tx: 50, ty: 92 },
    ],
    links: [["gk", "lcb"], ["gk", "cb"], ["gk", "rcb"], ["lcb", "cb"], ["cb", "rcb"], ["lcb", "lcm"], ["cb", "lcm"], ["cb", "rcm"],
      ["rcb", "rcm"], ["lcm", "rcm"], ["lcm", "st"], ["rcm", "st"]],
  },
  {
    key: "2-1-2-1", label: "2-1-2-1",
    slots: [
      { key: "st", pos: "ST", x: 50, y: 36.8, tx: 50, ty: 46 },
      { key: "lm", pos: "LM", x: 24, y: 46, tx: 18, ty: 57 },
      { key: "rm", pos: "RM", x: 76, y: 46, tx: 82, ty: 57 },
      { key: "cdm", pos: "CDM", x: 50, y: 60.4, tx: 50, ty: 69 },
      { key: "lcb", pos: "CB", x: 35, y: 73, tx: 31, ty: 84 },
      { key: "rcb", pos: "CB", x: 65, y: 73, tx: 69, ty: 84 },
      { key: "gk", pos: "GK", x: 50, y: 84, tx: 50, ty: 92 },
    ],
    links: [["gk", "lcb"], ["gk", "rcb"], ["lcb", "rcb"], ["lcb", "cdm"], ["rcb", "cdm"], ["lcb", "lm"], ["rcb", "rm"],
      ["cdm", "lm"], ["cdm", "rm"], ["cdm", "st"], ["lm", "st"], ["rm", "st"]],
  },
  {
    key: "3-1-2", label: "3-1-2",
    slots: [
      { key: "lst", pos: "ST", x: 36, y: 28, tx: 30, ty: 38 },
      { key: "rst", pos: "ST", x: 64, y: 28, tx: 70, ty: 38 },
      { key: "cm", pos: "CM", x: 50, y: 36.8, tx: 50, ty: 46 },
      { key: "lcb", pos: "CB", x: 23, y: 60.4, tx: 15, ty: 69 },
      { key: "cb", pos: "CB", x: 50, y: 60.4, tx: 50, ty: 69 },
      { key: "rcb", pos: "CB", x: 77, y: 60.4, tx: 85, ty: 69 },
      { key: "gk", pos: "GK", x: 50, y: 84, tx: 50, ty: 92 },
    ],
    links: [["gk", "lcb"], ["gk", "cb"], ["gk", "rcb"], ["lcb", "cb"], ["cb", "rcb"], ["lcb", "cm"], ["cb", "cm"], ["rcb", "cm"],
      ["cm", "lst"], ["cm", "rst"], ["lst", "rst"], ["lcb", "lst"], ["rcb", "rst"]],
  },
];

export type Lineup = Record<string, number | null>;      // slot key -> player id (null: empty)

// ---------- position fit: a player in their usual position, nearby, or out of position ----------
const NATURAL: Record<Slot["pos"], string[]> = {
  GK: ["GK"], CB: ["CB", "FB", "LB", "RB"], CDM: ["CDM", "CM"], CM: ["CM", "CDM", "AM"],
  LM: ["LM", "LW"], RM: ["RM", "RW"], ST: ["ST", "CF"],
};
const GROUP: Record<string, "gk" | "def" | "mid" | "att"> = {
  GK: "gk", CB: "def", FB: "def", LB: "def", RB: "def", CDM: "mid", CM: "mid", AM: "mid", CAM: "mid", LM: "mid", RM: "mid", LW: "mid", RW: "mid",
  ST: "att", CF: "att",
};
// CAM is in no NATURAL list: the formations have no CAM spot, so a CAM is "nearby" (fit 1) in the midfield spots (CDM, CM, LM,
// RM) and out of position (0) at striker, centre-back and in goal, as every midfielder who isn't a natural fit there.
export const usualPos = (u: UtPlayer) => u.pos ?? u.player.position ?? u.card.pos;
export function positionFit(u: UtPlayer, slotPos: Slot["pos"]): 0 | 1 | 2 {
  const p = usualPos(u);
  if (NATURAL[slotPos].includes(p)) return 2;
  if ((slotPos === "GK") !== (p === "GK")) return 0;     // keepers in goal only, outfield players out of it
  return GROUP[p] && GROUP[p] === GROUP[slotPos] ? 1 : 0;
}

// ---------- links: how well two players combine ----------
// a pass together counts 1, an assist between them counts ASSIST_WEIGHT; LINK_FULL of that makes a full-strength link
// (calibrated on the 62 real pairs of oct09/oct28/oct30: 15 green, 47 amber; a link needs a real pattern to be green)
export const ASSIST_WEIGHT = 4;
export const LINK_FULL = 8;                              // 8 = two assists, or 4 passes and an assist; 4 (an assist, or 4 passes) is green
export const STRONG_AT = 0.5;                            // strength from which a link shows green
export function linkScore(p: Pair | undefined): number {
  return p ? p.passes + ASSIST_WEIGHT * p.assists : 0;
}
export function linkStrength(p: Pair | undefined): number {
  return Math.min(1, linkScore(p) / LINK_FULL);
}
export type LinkLevel = "strong" | "ok" | "none";
const levelOf = (strength: number): LinkLevel => (strength >= STRONG_AT ? "strong" : strength > 0 ? "ok" : "none");
export function linkLevel(p: Pair | undefined): LinkLevel {
  return levelOf(linkStrength(p));
}
// A goalkeeper plays with the whole team: any link that touches the keeper's slot, whoever stands in it, is orange with
// everyone, exactly: never red, and never green either, so every keeper and every player beside him is treated the same.
export const KEEPER_LINK = 0.25;                         // strength of every link to the keeper (orange, half way to green)

// ---------- chemistry ----------
// each player 0-10 (as the game counts it): up to 4 for position (4 natural, 2 nearby, 0 out of position) and up to
// 6 from their links (the average strength of their links to the teammates next to them). Team chemistry 0-100.
export const POS_CHEM = [0, 2, 4] as const;
export const LINK_CHEM = 6;
export type LinkView = { a: string; b: string; level: LinkLevel; passes: number; assists: number; strength: number; keeper: boolean };   // keeper: one end is the goal slot
export type SquadChem = { team: number; perSlot: Record<string, number>; links: LinkView[] };

export function squadChem(f: Formation, lineup: Lineup, players: Map<number, UtPlayer>, pairs: Pairs): SquadChem {
  const at = (k: string) => { const id = lineup[k]; return id == null ? undefined : players.get(id); };
  const links: LinkView[] = f.links.map(([a, b]) => {
    const pa = at(a), pb = at(b);
    const pr = pa && pb ? pairs[pairKey(pa.player.id, pb.player.id)] : undefined;   // by person: both of a player's cards share his links
    const keeper = f.slots.some((x) => x.pos === "GK" && (x.key === a || x.key === b));
    const strength = pa && pb ? (keeper ? KEEPER_LINK : linkStrength(pr)) : 0;   // everything else (levels, chemistry, the lines) comes from this
    return { a, b, level: levelOf(strength), passes: pr?.passes ?? 0, assists: pr?.assists ?? 0, strength, keeper };
  });
  const perSlot: Record<string, number> = {};
  for (const s of f.slots) {
    const u = at(s.key);
    if (!u) { perSlot[s.key] = 0; continue; }
    const mine = links.filter((l) => (l.a === s.key || l.b === s.key) && at(l.a === s.key ? l.b : l.a));
    const avg = mine.length ? mine.reduce((t, l) => t + l.strength, 0) / mine.length : 0;
    perSlot[s.key] = Math.round(POS_CHEM[positionFit(u, s.pos)] + LINK_CHEM * avg);
  }
  const total = f.slots.reduce((t, s) => t + perSlot[s.key], 0);
  return { team: Math.round((100 * total) / (10 * f.slots.length)), perSlot, links };
}

// ---------- rating ----------
// the average overall of the rated outfield players on the pitch: keepers aren't rated yet, and a card measures
// outfield play, so whoever is in goal is left out of the team rating
export function squadRating(f: Formation, lineup: Lineup, players: Map<number, UtPlayer>): number | null {
  const ovrs = f.slots.filter((s) => s.pos !== "GK").map((s) => lineup[s.key]).map((id) => (id == null ? null : players.get(id)?.card))
    .filter((c): c is Card => !!c && c.rated && c.ovr !== null).map((c) => c.ovr!);
  return ovrs.length ? Math.round(ovrs.reduce((a, b) => a + b, 0) / ovrs.length) : null;
}
// stars as the game shows them, from the team rating
export function stars(rating: number | null): number {
  if (rating === null) return 0;
  return rating >= 82 ? 5 : rating >= 78 ? 4.5 : rating >= 74 ? 4 : rating >= 70 ? 3.5 : rating >= 66 ? 3 : rating >= 62 ? 2.5 : rating >= 58 ? 2 : 1.5;
}

// ---------- chemistry style: the label along the bottom of a squad-screen card ----------
// FIFA 15 gives every card a chemistry style (BAS, Basic, until one is applied), each boosting certain attributes. Here a
// card shows the game's style for its own two best attributes (a tie goes to the earlier one in PAC, SHO, PAS, DRI, DEF,
// PHY order); a card that isn't rated yet shows BAS.
export type ChemStyle = { code: string; name: string };
const ATTR_ORDER: Attr[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const STYLES: Record<string, ChemStyle> = {
  "PAC SHO": { code: "HUN", name: "Hunter" }, "PAC PAS": { code: "CAT", name: "Catalyst" }, "PAC DRI": { code: "ENG", name: "Engine" },
  "PAC DEF": { code: "SHA", name: "Shadow" }, "PAC PHY": { code: "HAW", name: "Hawk" }, "SHO PAS": { code: "DEA", name: "Deadeye" },
  "SHO DRI": { code: "SNI", name: "Sniper" }, "SHO DEF": { code: "GLA", name: "Gladiator" }, "SHO PHY": { code: "FIN", name: "Finisher" },
  "PAS DRI": { code: "ART", name: "Artist" }, "PAS DEF": { code: "POW", name: "Powerhouse" }, "PAS PHY": { code: "ARC", name: "Architect" },
  "DRI DEF": { code: "GUA", name: "Guardian" }, "DRI PHY": { code: "MAR", name: "Marksman" }, "DEF PHY": { code: "SEN", name: "Sentinel" },
};
export const BASIC: ChemStyle = { code: "BAS", name: "Basic" };
export function chemStyle(card: Card): ChemStyle {
  if (!card.rated) return BASIC;
  const top = [...ATTR_ORDER].sort((a, b) => card.attrs[b] - card.attrs[a] || ATTR_ORDER.indexOf(a) - ATTR_ORDER.indexOf(b)).slice(0, 2)
    .sort((a, b) => ATTR_ORDER.indexOf(a) - ATTR_ORDER.indexOf(b));
  return STYLES[top.join(" ")] ?? BASIC;
}

// ---------- the starting seven: the best card that fits each slot ----------
// The keeper's slot is filled first, then every other slot from the best natural fits, then from nearby fits. A player is
// used once, whichever of his cards: a player with an outfield card and a goalkeeper card (Arav) takes the goal when
// no other keeper is free (his goalkeeper card, unrated like any keeper card, so it's left out of the team rating as
// every keeper is), and his outfield card then cannot also be picked.
export function bestLineup(f: Formation, players: UtPlayer[]): Lineup {
  const pool = [...players].filter((u) => !u.player.loan)
    .sort((a, b) => (b.card.ovr ?? -1) - (a.card.ovr ?? -1) || a.player.name.localeCompare(b.player.name));
  const used = new Set<number>();                        // by player id: one card per person
  const slots = [...f.slots].sort((a, b) => Number(b.pos === "GK") - Number(a.pos === "GK"));
  const out: Lineup = {};
  for (const want of [2, 1] as const) {
    for (const s of slots) {
      if (out[s.key] != null) continue;
      const pick = pool.find((u) => !used.has(u.player.id) && positionFit(u, s.pos) === want);
      if (pick) { used.add(pick.player.id); out[s.key] = pick.id; }
    }
  }
  for (const s of f.slots) if (out[s.key] === undefined) out[s.key] = null;
  return out;
}
