"use client";
// Ultimate Team squad builder, drawn after the football game's squad screen: the pitch in perspective with the
// cards standing on it (chemistry on each card, green / amber / red links between their feet), Summary in the top
// left corner, Squad actions in the top right and the subs and reserves peeking up along the bottom (the strip pops up
// when it is used). On a phone the same pieces stack. Press a player, then press where they go: the two cards swap
// places across the pitch.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CanadaFlag } from "@/components/card-marks";
import { Crest } from "@/components/crest";
import { FRAMES, FutCard } from "@/components/fut-card";
import { sfx } from "@/lib/sfx";
import { ATTR_NOTES, GK_LABELS, GK_NOTES, type Attr } from "@/lib/cards";
import {
  FORMATIONS, bestLineup, chemStyle, positionFit, squadChem, squadRating, stars, usualPos,
  type Formation, type Lineup, type Pairs, type Slot, type SquadChem, type UtPlayer,
} from "@/lib/ut";
import { TALL_PITCH, WIDE_PITCH, pitchDrawing, type PitchDrawing } from "@/lib/ut-pitch";

const WIDE = pitchDrawing(WIDE_PITCH);
const TALL = pitchDrawing(TALL_PITCH);
const SUBS = 5;                              // the five best off the pitch are the subs, the rest the reserves
const STORE = "ut-v1";
const ATTRS: Attr[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const FIT_WORDS = ["Out of position", "Nearby position", "Natural position"] as const;

// what is picked up (or aimed at): a pitch slot (empty or not) or a player on the bench
type Spot = { t: "slot"; key: string } | { t: "bench"; id: number };
type Target = Spot | { t: "strip" };
const sameSpot = (a: Spot, b: Spot) => (a.t === "slot" ? b.t === "slot" && a.key === b.key : b.t === "bench" && a.id === b.id);

// "lcb" is the left CB, "rst" the right ST; every other slot is just its position
function slotName(s: Slot): string {
  if (s.key.length > 2 && (s.key[0] === "l" || s.key[0] === "r") && s.key.slice(1) === s.pos.toLowerCase()) {
    return `${s.key[0] === "l" ? "left" : "right"} ${s.pos}`;
  }
  return s.pos;
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const tone = (n: number, max: number) => (n / max >= 0.7 ? "hi" : n / max >= 0.4 ? "mid" : "lo");
const ovrOf = (u: UtPlayer) => (u.card.rated && u.card.ovr !== null ? u.card.ovr : null);

// A player with two cards (Arav: his midfield card and his goalkeeper card) is two UtPlayers with one `player.id`. The
// person stands on the pitch once, whichever card of his it is; his links, his match data and the Summary's link list go
// by the person. Card ids (`id`) are for React keys, data-pid and the swap flight only.
const twinOf = (byId: Map<number, UtPlayer>, u: UtPlayer): UtPlayer | null => {
  for (const x of byId.values()) if (x.player.id === u.player.id && x.id !== u.id) return x;
  return null;
};
// the name in a message: a player with two cards gets the card's position after it, so "Arav (GK)" is told from "Arav (CDM)"
const cardName = (byId: Map<number, UtPlayer>, u: UtPlayer | undefined) => (!u ? "" : twinOf(byId, u) ? `${u.player.name} (${usualPos(u)})` : u.player.name);
// the slot where a person stands on the pitch, by any of his cards, apart from `except`
const standingAt = (lineup: Lineup, byId: Map<number, UtPlayer>, person: number, except?: string): string | null =>
  Object.entries(lineup).find(([k, id]) => k !== except && id != null && byId.get(id)?.player.id === person)?.[0] ?? null;

// ---------- lineup logic (pure) ----------
// a formation change keeps the players: first those who stay in a slot they fit, then by fit, then in order
function refit(from: Formation, lineup: Lineup, to: Formation, byId: Map<number, UtPlayer>): Lineup {
  const pool = from.slots.map((s) => lineup[s.key]).filter((id): id is number => id != null && byId.has(id));
  const left = new Set(pool);
  const out: Lineup = {};
  const give = (s: Slot, ok: (u: UtPlayer, id: number) => boolean) => {
    if (out[s.key] != null) return;
    const id = pool.find((i) => left.has(i) && ok(byId.get(i)!, i));
    if (id !== undefined) { left.delete(id); out[s.key] = id; }
  };
  for (const s of to.slots) give(s, (u, id) => lineup[s.key] === id && positionFit(u, s.pos) === 2);
  for (const s of to.slots) give(s, (u) => positionFit(u, s.pos) === 2);
  for (const s of to.slots) give(s, (u) => positionFit(u, s.pos) === 1);
  for (const s of to.slots) give(s, () => true);
  for (const s of to.slots) if (out[s.key] == null) out[s.key] = null;
  return out;
}

// one move: swap two slots, bring a sub on, or send a starter to the bench. null when nothing would change; a refusal when
// the move would put one person on the pitch twice (a player's two cards: only a swap of his two cards is allowed).
type Move = { lineup: Lineup; msg: string } | { refuse: string } | null;
function applyMove(a: Spot, b: Target, f: Formation, lineup: Lineup, byId: Map<number, UtPlayer>): Move {
  const slot = (key: string) => slotName(f.slots.find((s) => s.key === key)!);
  const nm = (id: number | null | undefined) => (id == null ? "" : cardName(byId, byId.get(id)));
  const next: Lineup = { ...lineup };
  // a bench card goes into slot `key`, whoever stands there goes off
  const bringOn = (key: string, id: number): Move => {
    const inn = byId.get(id), out = lineup[key] != null ? byId.get(lineup[key]!) : undefined;
    if (!inn) return null;
    const there = standingAt(lineup, byId, inn.player.id, key);
    if (there) {
      return { refuse: `${inn.player.name} is already on the pitch at ${slot(there)}. Only one of his cards plays at a time: swap the two cards with each other.` };
    }
    next[key] = id;
    if (out && out.player.id === inn.player.id) {          // the same person: his other card comes on for this one
      return { lineup: next, msg: `${inn.player.name}'s ${usualPos(inn)} card on for his ${usualPos(out)} card.` };
    }
    return { lineup: next, msg: out ? `${nm(id)} on for ${nm(out.id)}.` : `${nm(id)} on at ${slot(key)}.` };
  };
  if (a.t === "slot" && b.t === "slot") {
    const pa = lineup[a.key], pb = lineup[b.key];
    if (pa == null && pb == null) return null;
    next[a.key] = pb ?? null; next[b.key] = pa ?? null;
    const msg = pa != null && pb != null ? `${nm(pa)} and ${nm(pb)} swapped.`
      : pa != null ? `${nm(pa)} moved to ${slot(b.key)}.` : `${nm(pb)} moved to ${slot(a.key)}.`;
    return { lineup: next, msg };
  }
  if (a.t === "slot" && b.t === "bench") return bringOn(a.key, b.id);
  if (a.t === "bench" && b.t === "slot") return bringOn(b.key, a.id);
  if (a.t === "slot" && b.t === "strip") {
    const pa = lineup[a.key];
    if (pa == null) return null;
    next[a.key] = null;
    return { lineup: next, msg: `${nm(pa)} to the bench.` };
  }
  return null;
}

// the saved lineup, checked: a good one comes back as it was, a stale one (a player gone, one twice, an empty slot) becomes
// the best seven. A save from before a player could have two cards (no `v`) holds his one id for the one card he had: it
// loads as whichever of his cards fits that slot (his goalkeeper card in goal, his other card elsewhere).
const SAVE_V = 2;
function loadSaved(byId: Map<number, UtPlayer>, players: UtPlayer[]): { f: Formation; lineup: Lineup } | null {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return null;
    const d = JSON.parse(raw) as { f?: unknown; l?: unknown; v?: unknown } | null;
    const f = FORMATIONS.find((x) => x.key === d?.f);
    if (!d || !f) return null;
    const l = d.l as Record<string, unknown> | null;
    let ok = !!l && typeof l === "object";
    const seen = new Set<number>();                        // by person: nobody stands twice
    const lineup: Lineup = {};
    for (const s of f.slots) {
      const saved = ok ? l![s.key] : undefined;
      const u0 = typeof saved === "number" ? byId.get(saved) : undefined;
      if (!u0) { ok = false; break; }
      const twin = twinOf(byId, u0);
      const u = d.v !== SAVE_V && twin && positionFit(u0, s.pos) < 2 && positionFit(twin, s.pos) === 2 ? twin : u0;
      if (seen.has(u.player.id)) { ok = false; break; }
      seen.add(u.player.id); lineup[s.key] = u.id;
    }
    return { f, lineup: ok ? lineup : bestLineup(f, players) };
  } catch { return null; }
}

// ---------- motion ----------
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FLY_MS = 420;                          // a card crossing the pitch
const SLIDE_MS = 280;                        // a bench card making room
const FLY_EASE = "cubic-bezier(0.3, 0.75, 0.2, 1)";

// where a player's card is drawn right now (pitch or bench), found by player id
type Seen = { pid: number; r: DOMRect; node: HTMLElement; fs: string };
function look(root: HTMLElement | null, pids: Iterable<number>): Seen[] {
  if (!root) return [];
  return [...pids].flatMap((pid) => {
    const el = [...root.querySelectorAll<HTMLElement>(`.ut-card[data-pid="${pid}"] > :is(.ut-c, .fut)`)].find((e) => e.getBoundingClientRect().width > 0);
    const r = el?.getBoundingClientRect();
    return el && r && r.width > 0 ? [{ pid, r, node: el.cloneNode(true) as HTMLElement, fs: getComputedStyle(el).fontSize }] : [];
  });
}

// a number that counts to its new value, as the game's rating and chemistry do
function useCount(value: number | null, ms = 480): number | null {
  const [shown, setShown] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    const from = last.current;
    last.current = value;
    if (value === null || from === null || from === value || reduced()) { setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

// ---------- component ----------
export function UltimateTeam({ players, pairs, potm }: { players: UtPlayer[]; pairs: Pairs; potm: number | null }) {
  const byId = useMemo(() => new Map(players.map((u) => [u.id, u])), [players]);
  const [fKey, setFKey] = useState(FORMATIONS[0].key);
  const [lineup, setLineup] = useState<Lineup>(() => bestLineup(FORMATIONS[0], players));
  const [sel, setSel] = useState<Spot | null>(null);
  const [note, setNote] = useState({ n: 0, text: "" });
  const [refusal, setRefusal] = useState<{ at: Spot; text: string } | null>(null);   // why the last press was refused, while that pick stands
  const [loaded, setLoaded] = useState(false);
  // the bench pops up while the pointer is on it, while the keyboard is in it, or (touch) after a tap on it
  const [benchHover, setBenchHover] = useState(false);
  const [benchKeys, setBenchKeys] = useState(false);
  const [benchPinned, setBenchPinned] = useState(false);
  const [kbSub, setKbSub] = useState<number | null>(null);      // the sub the keyboard is on
  const [hoverSub, setHoverSub] = useState<number | null>(null); // the sub under the pointer (the game opens the card under the cursor)
  const lastPointer = useRef("mouse");
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const flight = useRef<{ movers: Seen[]; bench: Seen[] } | null>(null);

  const formation = FORMATIONS.find((f) => f.key === fKey) ?? FORMATIONS[0];
  const chem = useMemo(() => squadChem(formation, lineup, byId, pairs), [formation, lineup, byId, pairs]);
  const rating = useMemo(() => squadRating(formation, lineup, byId), [formation, lineup, byId]);
  const shownRating = useCount(rating);
  const shownChem = useCount(chem.team) ?? 0;

  // the saved state is read after the first render, so the server and the first browser render match
  useEffect(() => {
    const saved = loadSaved(byId, players);
    if (saved) { setFKey(saved.f.key); setLineup(saved.lineup); }
    setLoaded(true);
  }, [byId, players]);
  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORE, JSON.stringify({ f: fKey, l: lineup, v: SAVE_V })); } catch { /* private mode: nothing to save */ }
  }, [loaded, fKey, lineup]);
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  // The swap: before a change each moving card is noted where it stands. Once the new lineup is laid out, a copy of the
  // card as it looks where it lands (a pitch card, or a bench card) flies there out of the old card, growing or shrinking
  // from the old card's size, while the old card fades where it was. Both swapping cards fly at once, bowed apart so they
  // pass each other, and the real card shows when its copy lands. Bench cards that only shuffle along slide over.
  const prepare = (movers: Iterable<number>) => {
    // a swap still in the air lands at once, so the next one starts from where every card really is
    layer.current?.replaceChildren();
    root.current?.querySelectorAll<HTMLElement>(".ut-card").forEach((c) => { c.style.visibility = ""; });
    if (reduced()) return;
    const ids = new Set(movers);
    const benchIds = [...(root.current?.querySelectorAll<HTMLElement>(".ut-sub .ut-card") ?? [])].map((e) => Number(e.dataset.pid)).filter((id) => !ids.has(id));
    flight.current = { movers: look(root.current, ids), bench: look(root.current, benchIds) };
  };
  useLayoutEffect(() => {
    const f = flight.current;
    flight.current = null;
    const box = layer.current;
    if (!f || !box || !root.current) return;
    const base = box.getBoundingClientRect();
    const now = new Map(look(root.current, [...f.movers, ...f.bench].map((m) => m.pid)).map((m) => [m.pid, m.r]));
    let flew = 0;
    f.movers.forEach((m, i) => {
      const to = now.get(m.pid);
      const card = root.current!.querySelector<HTMLElement>(`.ut-card[data-pid="${m.pid}"]`);
      if (!to || !card || (Math.abs(to.left - m.r.left) < 1 && Math.abs(to.top - m.r.top) < 1)) return;
      const dest = [...card.querySelectorAll<HTMLElement>(":scope > :is(.ut-c, .fut)")].find((e) => e.getBoundingClientRect().width > 0);
      if (!dest) return;
      // the old card fades and settles where it was
      const old = document.createElement("div");
      old.className = "ut-ghost";
      Object.assign(old.style, { left: `${m.r.left - base.left}px`, top: `${m.r.top - base.top}px`, width: `${m.r.width}px`, height: `${m.r.height}px`,
        fontSize: m.fs, transformOrigin: "50% 50%" });
      old.appendChild(m.node);
      box.appendChild(old);
      const fade = old.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.9)" }], { duration: 200, easing: "ease-out", fill: "forwards" });
      fade.onfinish = () => old.remove();
      window.setTimeout(() => old.remove(), 800);
      // the card as it will look flies out of it to its place
      const ghost = document.createElement("div");
      ghost.className = "ut-ghost";
      Object.assign(ghost.style, { left: `${to.left - base.left}px`, top: `${to.top - base.top}px`, width: `${to.width}px`, height: `${to.height}px`,
        fontSize: getComputedStyle(dest).fontSize, transformOrigin: "50% 50%" });
      ghost.appendChild(dest.cloneNode(true));
      box.appendChild(ghost);
      card.style.visibility = "hidden";
      flew++;
      const dx = (m.r.left + m.r.width / 2) - (to.left + to.width / 2), dy = (m.r.top + m.r.height / 2) - (to.top + to.height / 2);
      const s0 = Math.min(m.r.width / to.width, m.r.height / to.height);
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(70, len * 0.16) * (i % 2 ? 1 : -1);
      const mid = `translate(${dx / 2 + (dy / len) * bow}px, ${dy / 2 - (dx / len) * bow}px) scale(1.1)`;
      const run = ghost.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: 0.25 },
        { transform: `translate(${dx}px, ${dy - 8}px) scale(${s0 * 1.06})`, opacity: 1, offset: 0.16 },
        { transform: mid, offset: 0.56 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ], { duration: FLY_MS, easing: FLY_EASE, fill: "forwards" });
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        ghost.remove();
        card.style.visibility = "";
        card.classList.remove("is-landed");
        void card.offsetWidth;                // restart the landing flash
        card.classList.add("is-landed");
        window.setTimeout(() => card.classList.remove("is-landed"), 650);
      };
      run.onfinish = land;
      run.oncancel = land;
      window.setTimeout(land, FLY_MS + 600);   // a paused animation (a tab in the background) never hides a card for long
    });
    if (flew) sfx.play("whoosh");             // the swap's rush of air (silent until the visitor has pressed something, and when muted)
    f.bench.forEach((m) => {
      const to = now.get(m.pid);
      const card = root.current!.querySelector<HTMLElement>(`.ut-card[data-pid="${m.pid}"]`);
      if (!to || !card) return;
      const dx = m.r.left - to.left, dy = m.r.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: SLIDE_MS, easing: FLY_EASE });
    });
  }, [lineup, fKey]);

  const onPitch = new Set(Object.values(lineup).filter((id): id is number => id != null));
  const standing = new Set([...onPitch].map((id) => byId.get(id)?.player.id));   // the people on the pitch, by any of their cards
  const bench = players.filter((u) => !onPitch.has(u.id))
    .sort((a, b) => (ovrOf(b) ?? -1) - (ovrOf(a) ?? -1) || a.player.name.localeCompare(b.player.name));
  // a bench card whose player is already on the pitch (his other card) can't come on, so it isn't one of the five subs
  let eligible = 0;
  const benchRank = bench.map((u) => (standing.has(u.player.id) ? -1 : eligible++));

  const say = (text: string) => setNote((n) => ({ n: n.n + 1, text }));
  const stats = (f: Formation, l: Lineup) => {
    const r = squadRating(f, l, byId), c = squadChem(f, l, byId, pairs).team;
    return `${r === null ? "No rating yet" : `Rating ${r}`}, chemistry ${c}.`;
  };
  const moved = (a: Lineup, b: Lineup) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => (a[k] !== b[k] ? [a[k], b[k]] : [])).filter((id): id is number => id != null);
  };
  const commit = (next: Lineup, msg: string) => {
    prepare(moved(lineup, next));
    setLineup(next); setSel(null); say(`${msg} ${stats(formation, next)}`);
  };

  // press a card to pick it, then press where it goes
  const pick = (s: Spot) => {
    if (s.t === "bench") setBenchPinned(false);             // the pitch has to be in view to choose where they go
    if (!sel) { setSel(s); return; }
    if (sameSpot(sel, s)) { setSel(null); return; }
    const r = applyMove(sel, s, formation, lineup, byId);
    if (r && "refuse" in r) { setRefusal({ at: sel, text: r.refuse }); say(r.refuse); return; }   // the pick stays, nothing changes
    if (r) commit(r.lineup, r.msg); else setSel(s);         // bench to bench, or two empty slots: just change the pick
  };

  const changeFormation = (key: string) => {
    const to = FORMATIONS.find((f) => f.key === key);
    if (!to || to.key === formation.key) return;
    const next = refit(formation, lineup, to, byId);
    prepare(Object.values(next).filter((id): id is number => id != null));
    setFKey(to.key); setLineup(next); setSel(null);
    say(`Formation ${to.label}. ${stats(to, next)}`);
  };
  const best = () => {
    const next = bestLineup(formation, players);
    prepare(moved(lineup, next));
    setLineup(next); setSel(null); say(`Best seven picked. ${stats(formation, next)}`);
  };

  // who the Summary shows: the picked player, or else the first starter
  const selSlot = sel?.t === "slot" ? formation.slots.find((s) => s.key === sel.key) ?? null : null;
  let focusSlot: Slot | null = null;
  let focusId: number | null = null;
  if (sel?.t === "bench") focusId = sel.id;
  else if (selSlot && lineup[selSlot.key] != null) { focusSlot = selSlot; focusId = lineup[selSlot.key]; }
  else { focusSlot = formation.slots.find((s) => lineup[s.key] != null) ?? null; focusId = focusSlot ? lineup[focusSlot.key] : null; }
  const focus = focusId != null ? byId.get(focusId) ?? null : null;
  const pickedU = !sel ? undefined : sel.t === "bench" ? byId.get(sel.id) : selSlot && lineup[selSlot.key] != null ? byId.get(lineup[selSlot.key]!) : undefined;
  const pickedName = pickedU ? cardName(byId, pickedU) : null;
  const refused = refusal && sel && refusal.at === sel ? refusal.text : null;      // shown while the pick it was about is still the pick
  const pending = !sel ? null : pickedName ?? `the empty ${selSlot ? slotName(selSlot) : ""} slot`;
  const benchOpen = benchHover || benchKeys || benchPinned;

  const formSelect = (id: string, className: string) => (
    <div className={className}>
      <label className="ut-lab" htmlFor={id}>Formation</label>
      <select id={id} className="ut-select" value={fKey} onChange={(e) => changeFormation(e.target.value)}>
        {FORMATIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
    </div>
  );
  const rTone = rating === null ? "mid" : tone(rating - 40, 60);
  const cTone = tone(chem.team, 100);

  return (
    <div className={`ut${sel ? " has-pick" : ""}`} ref={root}>
      <p className="ut-sr" role="status" aria-live="polite" aria-atomic="true"><span key={note.n}>{note.text}</span></p>
      <div className="ut-in">

        {/* ---- the pitch, with the seven standing on it ---- */}
        <section className="ut-stage" aria-label={`Pitch, ${formation.label}`} data-formation={formation.key}>
          <Pitch d={WIDE} id="ut-pw" className="ut-pitch ut-w" />
          <Pitch d={TALL} id="ut-pt" className="ut-pitch ut-t" />
          {(["w", "t"] as const).map((view) => (
            <svg key={view} className={`ut-links ut-${view}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              {(["ut-link-case", "ut-link"] as const).map((layerName) => chem.links.map((l) => {
                const a = formation.slots.find((s) => s.key === l.a)!, b = formation.slots.find((s) => s.key === l.b)!;
                const [x1, y1, x2, y2] = view === "w" ? [a.x, a.y, b.x, b.y] : [a.tx, a.ty, b.tx, b.ty];
                // keyed by who is at each end, so a link that changes fades in again once the cards have landed
                const who = `${lineup[l.a] ?? "-"}.${lineup[l.b] ?? "-"}.${l.level}`;
                return <line key={`${layerName}-${l.a}-${l.b}-${who}`} className={layerName === "ut-link" ? `ut-link ut-link-${l.level}` : layerName}
                  x1={x1} y1={y1} x2={x2} y2={y2} />;
              }))}
            </svg>
          ))}
          {formation.slots.map((s) => {
            const id = lineup[s.key];
            const u = id == null ? null : byId.get(id) ?? null;
            const spot: Spot = { t: "slot", key: s.key };
            const isSel = sel !== null && sameSpot(sel, spot);
            const c = chem.perSlot[s.key] ?? 0;
            const name = slotName(s);
            const place = { "--x": `${s.x}%`, "--y": `${s.y}%`, "--tx": `${s.tx}%`, "--ty": `${s.ty}%`, zIndex: 2 + Math.round(s.y / 10) } as CSSProperties;
            return (
              <div key={s.key} className={`ut-slot${isSel ? " is-sel" : ""}${u ? "" : " is-empty"}`} style={place}>
                {u ? (
                  <button type="button" className="ut-btn" aria-pressed={isSel} onClick={() => pick(spot)} title={u.player.name}
                    aria-label={`${u.player.name}, overall ${ovrOf(u) ?? "not rated"}, ${name}, chemistry ${c} out of 10, style ${chemStyle(u.card).name}`}>
                    <span className="ut-card" data-pid={u.id} aria-hidden="true"><UtCard u={u} special={u.id === potm} chem={c} /></span>
                  </button>
                ) : (
                  <button type="button" className="ut-btn ut-empty" aria-pressed={isSel} onClick={() => pick(spot)} aria-label={`Empty ${name} slot`}>
                    <svg className="ut-empty-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <polygon points="50,0.8 62.5,4 91,4.3 95.5,8.8 99.2,13.8 99.2,85 95,88.6 86,90.7 74,93.8 62.5,96.8 50,99.2 37.5,96.8 26,93.8 14,90.7 5,88.6 0.8,85 0.8,13.8 4.5,8.8 9,4.3 37.5,4" />
                    </svg>
                    <span className="ut-plus" aria-hidden="true">+</span>
                  </button>
                )}
                <span className="ut-pos" aria-hidden="true">{s.pos}</span>
              </div>
            );
          })}
        </section>

        {/* ---- Summary ---- */}
        <aside className="ut-panel ut-sum" aria-label="Summary">
          <h2 className="ut-h">Summary</h2>
          <div className="ut-body">
            {formSelect("ut-formation", "ut-form ut-form-wide")}
            {focus
              ? <Summary u={focus} slot={focusSlot} lineup={lineup} chem={chem} formation={formation} byId={byId} picked={!!sel}
                  twinSlot={!focusSlot ? formation.slots.find((x) => x.key === standingAt(lineup, byId, focus.player.id)) ?? null : null} />
              : <p className="ut-help">No players on the pitch yet. Pick one from the subs.</p>}
          </div>
        </aside>

        {/* ---- Squad actions ---- */}
        <aside className="ut-panel ut-act" aria-label="Squad actions">
          <h2 className="ut-h">Squad actions</h2>
          <div className="ut-body">
            {formSelect("ut-formation-narrow", "ut-form ut-form-narrow")}
            <div className="ut-stats">
              <div className="ut-stat">
                <span className="ut-lab">Rating</span>
                <span className="ut-stars" role="img" aria-label={`${stars(rating)} stars out of 5`}>
                  <span className="ut-stars-bg" aria-hidden="true">★★★★★</span>
                  <span className="ut-stars-fg" aria-hidden="true" style={{ width: `${(stars(rating) / 5) * 100}%` }}><span>★★★★★</span></span>
                </span>
                <b className={`ut-big ut-${rTone}`}>{shownRating ?? "-"}</b>
              </div>
              <div className="ut-stat">
                <span className="ut-lab">Chemistry</span>
                <b className={`ut-big ut-${cTone}`}>{shownChem}<small>/100</small></b>
                <span className="ut-meter" aria-hidden="true"><i className={`ut-${cTone}`} style={{ width: `${chem.team}%` }} /></span>
              </div>
            </div>
            <div className="ut-actions">
              <button type="button" className="ut-act-btn ut-primary" onClick={best}>Best seven</button>
              {sel ? <button type="button" className="ut-act-btn" onClick={() => setSel(null)}>Cancel</button> : null}
            </div>
            <p className="ut-help">
              {refused ? <b className="ut-warn">{refused}</b> : sel ? <><b>{pending}</b> is picked. Now press who they swap with: another player on the pitch, or a sub to bring on. Esc cancels.</>
                : "Press a player, then press where they go."}
            </p>
            <ul className="ut-key" aria-label="Link colours">
              <li><i className="ut-dot ut-link-strong" />Strong link</li>
              <li><i className="ut-dot ut-link-ok" />Some play together, or in goal</li>
              <li><i className="ut-dot ut-link-none" />Not linked yet</li>
            </ul>
          </div>
        </aside>

        {/* ---- subs and reserves: a strip along the bottom that pops up to show the full cards ---- */}
        <section className={`ut-bench${benchOpen ? " is-open" : ""}`} aria-label={`Subs and reserves, ${bench.length} players`}
          onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
          onPointerEnter={(e) => { if (e.pointerType === "mouse") setBenchHover(true); }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") { setBenchHover(false); setHoverSub(null); } }}
          onFocus={(e) => { if ((e.target as HTMLElement).matches(":focus-visible")) setBenchKeys(true); }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setBenchKeys(false); }}>
          <div className="ut-band" aria-hidden="true" onClick={() => { if (lastPointer.current !== "mouse") setBenchPinned((p) => !p); }} />
          <div className="ut-strip" onScroll={(e) => { if (e.currentTarget.scrollTop) e.currentTarget.scrollTop = 0; }}>   {/* focus can scroll the lowered cards into view; the strip only scrolls sideways */}
            {bench.length === 0 ? <p className="ut-help ut-allon">Everyone is on the pitch.</p> : null}
            {bench.map((u, i) => {
              const spot: Spot = { t: "bench", id: u.id };
              const isSel = sel !== null && sameSpot(sel, spot);
              const wide = (hoverSub ?? kbSub ?? (sel?.t === "bench" ? sel.id : null)) === u.id;   // under the pointer, else the keyboard, else the pick
              const rank = benchRank[i];                       // -1: already on the pitch by his other card
              const twinAt = rank < 0 ? standingAt(lineup, byId, u.player.id) : null;
              const twinSlot = twinAt ? formation.slots.find((x) => x.key === twinAt) : undefined;
              return (
                <Fragment key={u.id}>
                  {i === 0 ? <span className="ut-tab" aria-hidden="true">Sub</span> : null}
                  {rank === SUBS ? <span className="ut-tab" aria-hidden="true">Res</span> : null}
                  <div className={`ut-sub${isSel ? " is-sel" : ""}${wide ? " is-x" : ""}${twinSlot ? " is-twin" : ""}`} style={{ "--i": i } as CSSProperties}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") setHoverSub(u.id); }}>
                    <button type="button" className="ut-btn" aria-pressed={isSel} onClick={() => pick(spot)}
                      onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setKbSub(u.id); }}
                      onBlur={() => setKbSub((k) => (k === u.id ? null : k))}
                      aria-label={`${u.player.name}, overall ${ovrOf(u) ?? "not rated"}, ${usualPos(u)}, ${twinSlot ? `already on the pitch at ${slotName(twinSlot)} by his other card` : rank < SUBS ? "sub" : "reserve"}${u.player.loan ? ", on loan" : ""}`}>
                      <span className="ut-card" data-pid={u.id} aria-hidden="true">
                        {/* an open card keeps its narrow card too: while the bench is down (a peek) the narrow one shows */}
                        <UtCard u={u} special={u.id === potm} bench />
                        {wide ? <FutCard card={u.card} player={u.player} special={u.id === potm} link={false} /> : null}
                      </span>
                    </button>
                    {u.player.loan ? <span className="ut-loan" title={u.player.loan}>Loan</span> : null}
                    {twinSlot ? <span className="ut-loan ut-xi" title={`${u.player.name} is already on the pitch at ${slotName(twinSlot)}`}>In XI</span> : null}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </section>
      </div>
      {/* the cards in flight during a swap are drawn here, above everything */}
      <div className="ut-flight" ref={layer} aria-hidden="true" />
    </div>
  );
}

// The small cards, as FIFA 15 draws them. On the pitch: overall and position side by side up top, the club crest and the
// nation (Canada) down the left, the face (head and shoulders) on the right, and along the bottom the chemistry style (BAS
// and the like); the player's chemistry only shows when the card is pointed at or picked. No name on a pitch card, as in
// the game (it is in the Summary, the tooltip and the label). A sub or reserve is the narrow bench card: the name up the
// left edge, overall and position, crest, nation, chemistry style and the six numbers, no face.
// The pitch card's face: every head drawn the same size and on the same line, from the measurements of each portrait the
// big card uses (hair top, chin, face middle, in px of the 640 px portrait). In em of the 7.04 x 8.8 card: the head is
// 3.8em from hair top to chin (about 43% of the card, as in the game), the hair top at 2.5em, the face's middle at 4.72em
// (67% across); the face box starts 2.5em from the left and 1.9em from the top. A portrait without measurements keeps
// the default framing in ut.css.
const UT_FACE = { h: 3.8, top: 2.5, mid: 4.72, left: 2.5, boxTop: 1.9 };
function faceFrame(slug: string): CSSProperties | undefined {
  const f = FRAMES[slug];
  if (!f) return undefined;
  const size = (UT_FACE.h * 640) / (f[1] - f[0]);   // the drawn portrait, em square
  return {
    backgroundSize: `${size.toFixed(3)}em auto`,
    backgroundPosition: `${(UT_FACE.mid - UT_FACE.left - (f[2] / 640) * size).toFixed(3)}em ${(UT_FACE.top - UT_FACE.boxTop - (f[0] / 640) * size).toFixed(3)}em`,
  };
}

function UtCard({ u, special, chem, bench = false }: { u: UtPlayer; special: boolean; chem?: number; bench?: boolean }) {
  const tier = special && u.card.rated ? "motm" : u.card.tier;
  const style = chemStyle(u.card);
  // the kicking player, the same figure as on the big card's band
  const kick = (
    <svg className="ut-c-sico" viewBox="0 0 28 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.6 8.2 L11.6 14.4" /><path d="M11.6 14.4 L9.4 18.4 L5.6 21.2" /><path d="M11.6 14.4 L16.4 15.6 L19.6 12.2" />
        <path d="M13.2 9.6 L8.6 8.4 L6.2 10.6" /><path d="M13.2 9.6 L17.4 10.4" />
      </g>
      <circle cx="15.6" cy="4.2" r="2.5" fill="currentColor" />
      <circle cx="23.6" cy="10.4" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
  if (bench) {
    return (
      <span className={`ut-c ut-c-${tier} ut-c-bench`}>
        <span className="ut-c-name">{u.player.name}</span>
        <span className="ut-c-top"><b>{ovrOf(u) ?? "??"}</b><i>{usualPos(u)}</i></span>
        <span className="ut-c-marks"><Crest className="ut-c-crest" /><CanadaFlag className="ut-c-nation" /></span>
        <span className="ut-c-style">{kick}<span>{style.code}</span></span>
        <span className="ut-c-attrs">{ATTRS.map((k) => <b key={k}>{u.card.rated ? u.card.attrs[k] : "??"}</b>)}</span>
      </span>
    );
  }
  // head and shoulders, cut flat above the strip, as the game's squad screen draws them (the portrait; a photo from the video is softened all round)
  const photo = u.player.photo;
  const cut = !!photo && photo.endsWith(".webp");
  return (
    <span className={`ut-c ut-c-${tier}`}>
      <span className="ut-c-top"><b>{ovrOf(u) ?? "??"}</b><i>{usualPos(u)}</i></span>
      <span className="ut-c-marks"><Crest className="ut-c-crest" /><CanadaFlag className="ut-c-nation" /></span>
      <span className={`ut-c-face${cut ? " is-cut" : ""}`} style={photo ? { backgroundImage: `url(${photo})`, ...(cut ? faceFrame(u.player.slug) : undefined) } : undefined}>
        {photo ? null : (
          <svg className="ut-c-anon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle cx="50" cy="34" r="19" /><path d="M14 100 C14 72 30 58 50 58 C70 58 86 72 86 100 Z" />
          </svg>
        )}
      </span>
      <span className="ut-c-style">{kick}<span>{style.code}</span></span>
      {chem !== undefined ? <b className={`ut-c-chem ut-${tone(chem, 10)}`}><span>{chem}</span></b> : null}
    </span>
  );
}

// the pitch: mowing bands, floodlight, white lines; the far half and the sides fade into the stadium
function Pitch({ d, id, className }: { d: PitchDrawing; id: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-fy`} gradientUnits="userSpaceOnUse" x1="0" y1={d.fadeFrom} x2="0" y2={d.fadeTo}>
          <stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id={`${id}-fx`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
          <stop offset="0" stopColor="#000" /><stop offset="0.045" stopColor="#fff" /><stop offset="0.955" stopColor="#fff" /><stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-my`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><rect x="-20" y="-20" width="140" height="140" fill={`url(#${id}-fy)`} /></mask>
        <mask id={`${id}-mx`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><rect x="-20" y="-20" width="140" height="140" fill={`url(#${id}-fx)`} /></mask>
        <radialGradient id={`${id}-lit`} gradientUnits="userSpaceOnUse" cx="50" cy="66" r="62">
          <stop offset="0" stopColor="#fff" stopOpacity="0.13" /><stop offset="0.55" stopColor="#fff" stopOpacity="0.03" /><stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id={`${id}-far`} gradientUnits="userSpaceOnUse" x1="0" y1={d.fadeFrom} x2="0" y2={d.fadeTo + 22}>
          <stop offset="0" stopColor="#03050a" stopOpacity="0.6" /><stop offset="1" stopColor="#03050a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g mask={`url(#${id}-mx)`}>
        <g mask={`url(#${id}-my)`}>
          {d.stripes.map((s, i) => <polygon key={i} points={s.points} className={s.dark ? "ut-grass-b" : "ut-grass-a"} />)}
          <rect x="-20" y="-20" width="140" height="140" fill={`url(#${id}-lit)`} />
          <rect x="-20" y="-20" width="140" height="140" fill={`url(#${id}-far)`} />
          <path className="ut-lines" d={d.lines} />
        </g>
      </g>
    </svg>
  );
}

// the picked player (or the first starter): numbers, position fit, chemistry and links
function Summary({ u, slot, lineup, chem, formation, byId, picked, twinSlot }: {
  u: UtPlayer; slot: Slot | null; lineup: Lineup; chem: SquadChem; formation: Formation; byId: Map<number, UtPlayer>; picked: boolean;
  twinSlot: Slot | null;                       // for a bench card: where his other card stands on the pitch, if it does
}) {
  const ovr = ovrOf(u);
  const c = slot ? chem.perSlot[slot.key] ?? 0 : 0;
  const fit = slot ? positionFit(u, slot.pos) : 0;
  const links = slot ? chem.links.flatMap((l) => {
    if (l.a !== slot.key && l.b !== slot.key) return [];
    const other = byId.get(lineup[l.a === slot.key ? l.b : l.a] ?? -1);
    return other ? [{ l, other }] : [];
  }) : [];
  return (
    <div className="ut-who">
      <div className="ut-who-head">
        <b className={`ut-ovr ut-tier-${u.card.tier}`}>{ovr ?? "??"}</b>
        <div className="ut-who-id">
          <div className="ut-name">{u.player.name}</div>
          <div className="ut-meta">
            <span className="ut-tag">{usualPos(u)}</span>
            {u.player.loan ? <span className="ut-tag ut-tag-loan">On loan</span> : null}
            {!picked ? <span className="ut-meta-note">First starter</span> : null}
          </div>
        </div>
      </div>
      <dl className="ut-attrs">
        {ATTRS.map((k) => {
          const v = u.card.rated ? u.card.attrs[k] : null;
          return (
            <div key={k} title={u.card.gkCard ? GK_NOTES[k] : ATTR_NOTES[k]}>
              <dd>{v ?? "??"}</dd><dt>{u.card.gkCard ? GK_LABELS[k] : k}</dt>
              <span className="ut-meter ut-meter-sm" aria-hidden="true"><i className={`ut-${v === null ? "mid" : tone(v - 30, 60)}`} style={{ width: `${v ?? 0}%` }} /></span>
            </div>
          );
        })}
      </dl>
      {slot ? (
        <>
          <div className="ut-row"><span className="ut-lab">At {slotName(slot)}</span><b className={`ut-fit ut-fit-${fit}`}>{FIT_WORDS[fit]}</b></div>
          <div className="ut-row"><span className="ut-lab">Chemistry style</span><b className="ut-style-name">{chemStyle(u.card).name} ({chemStyle(u.card).code})</b></div>
          <div className="ut-row">
            <span className="ut-lab">Chemistry</span>
            <b className={`ut-num ut-${tone(c, 10)}`}>{c}<small>/10</small></b>
          </div>
          <span className="ut-meter" aria-hidden="true"><i className={`ut-${tone(c, 10)}`} style={{ width: `${c * 10}%` }} /></span>
          <h3 className="ut-sub-h">Links in {formation.label}</h3>
          <ul className="ut-linklist">
            {links.map(({ l, other }) => (
              <li key={`${l.a}-${l.b}`}>
                <i className={`ut-dot ut-link-${l.level}`} aria-hidden="true" />
                <span><b>{other.player.name}</b>{" "}
                  {l.keeper ? <span className="ut-keeper">{slot.pos === "GK" ? "plays with the keeper" : "in goal: plays with everyone"}</span>   /* a keeper is orange with everyone, whatever they played */
                    : l.passes + l.assists > 0
                    ? [l.passes ? plural(l.passes, "pass", "passes") : "", l.assists ? plural(l.assists, "assist", "assists") : ""].filter(Boolean).join(", ")
                    : "have not combined yet"}
                  <span className="ut-sr"> ({l.level === "strong" ? "strong link" : l.level === "ok" ? "some play together" : "not linked"})</span>
                </span>
              </li>
            ))}
            {links.length === 0 ? <li className="ut-help">No teammates next to them yet.</li> : null}
          </ul>
        </>
      ) : (
        <p className="ut-help">
          {twinSlot ? <>{u.player.name} is already on the pitch at {slotName(twinSlot)}. Pick that card to swap this one in for it.</>
            : <>On the bench. Pick a pitch card to bring {u.player.name} on.</>}
        </p>
      )}
    </div>
  );
}
