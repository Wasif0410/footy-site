// The chemistry engine: which of our players really combined on the video. Builds, for every pair of players,
// the passes between them (either way) and the assists (one set up the other's goal), for lib/ut.ts to turn
// into links. Runs at build time only (it reads the match files through ./data).
//
// Three sources, nothing invented:
//   A  the timeline: our passes with both the passer and the receiver named (kind "pass", both on team 0).
//   B  the per-player video check: the "To {Name}" / "Forward to {Name}" moments on a checked player's pass lines.
//   C  goals of ours with both a scorer and an assist named.
// A player followed moment by moment in a match (MatchPlayer.checked) has his on-ball numbers from B, so from A we
// only take his passes that were checked by hand or by Claude. A player who was not followed in that match has
// his A passes as exported (the site's counted events) plus any B moments he has. The same directed pass seen in
// both A and B (same passer, same receiver, within DUP_S seconds) counts once. If the two disagree on the receiver
// of one pass (same passer within DUP_S, different receiver) the per-player check wins and the timeline's is dropped.
import { matches, players } from "./data";
import type { Match } from "./data";
import { pairKey } from "./ut";
import type { Pairs } from "./ut";

export type ChemSources = { timelinePasses: number; checkPasses: number; deduped: number; assists: number; pairs: number };

const DUP_S = 2.0;                                       // the same pass seen in both sources, in video seconds
const PASS_LINES = new Set(["passes_forward", "passes_other"]);

type Pass = { from: number; to: number; t: number };

function build(ms: Match[]) {
  const nameToId = new Map<string, number>();
  for (const p of players()) nameToId.set(p.name, p.id);   // exact names only
  const squad = new Set(nameToId.values());

  let timelinePasses = 0, checkPasses = 0, deduped = 0, assists = 0;
  const pairs: Pairs = {};
  const bump = (a: number, b: number, key: "passes" | "assists") => {
    const k = pairKey(a, b);
    const p = (pairs[k] ??= { passes: 0, assists: 0 });
    p[key] += 1;
  };

  for (const m of ms) {
    const followed = new Set(m.players.filter((p) => p.checked).map((p) => p.id));

    // Source A
    const a: Pass[] = [];
    for (const e of m.timeline) {
      if (e.kind !== "pass" || e.from?.team !== 0 || e.to?.team !== 0) continue;
      const f = e.from.id, to = e.to.id;
      if (f == null || to == null || f === to || !squad.has(f) || !squad.has(to)) continue;
      if (followed.has(f) && !(e.checked === true || e.claude === true)) continue;
      a.push({ from: f, to, t: e.t });
    }

    // Source B
    const b: Pass[] = [];
    for (const mp of m.players) {
      if (!squad.has(mp.id)) continue;
      for (const line of mp.breakdown) {
        if (!PASS_LINES.has(line.key)) continue;
        for (const mo of line.moments) {
          const mt = /^(?:Forward to|To) (.+)$/.exec(mo.text);
          const to = mt ? nameToId.get(mt[1]) : undefined;
          if (to === undefined || to === mp.id) continue;
          b.push({ from: mp.id, to, t: mo.t });
        }
      }
    }

    // the same pass seen by both with a different receiver (same passer within DUP_S): the per-player check follows
    // him moment by moment, so its answer stands and the timeline's is left out (counting both would double it)
    const near = (x: Pass, y: Pass) => y.from === x.from && Math.abs(y.t - x.t) <= DUP_S;
    for (let i = a.length - 1; i >= 0; i--) {
      const x = a[i];
      if (b.some((y) => near(x, y) && y.to !== x.to) && !b.some((y) => near(x, y) && y.to === x.to)) a.splice(i, 1);
    }

    timelinePasses += a.length;
    checkPasses += b.length;

    // de-duplicate: each B pass is matched to at most one unmatched A pass (nearest in time) of the same direction
    const used = new Set<number>();
    for (const x of b) {
      let best = -1, bestD = Infinity;
      a.forEach((y, i) => {
        if (used.has(i) || y.from !== x.from || y.to !== x.to) return;
        const d = Math.abs(y.t - x.t);
        if (d <= DUP_S && d < bestD) { best = i; bestD = d; }
      });
      if (best >= 0) { used.add(best); deduped += 1; }
    }
    a.forEach((y, i) => { if (!used.has(i)) bump(y.from, y.to, "passes"); });
    for (const x of b) bump(x.from, x.to, "passes");

    // Source C
    for (const g of m.goals) {
      if (g.team !== 0 || g.scorer?.id == null || g.assist?.id == null) continue;
      if (g.scorer.id === g.assist.id || !squad.has(g.scorer.id) || !squad.has(g.assist.id)) continue;
      bump(g.scorer.id, g.assist.id, "assists");
      assists += 1;
    }
  }
  const sources: ChemSources = { timelinePasses, checkPasses, deduped, assists, pairs: Object.keys(pairs).length };
  return { pairs, sources };
}

// what each pair of players did together across the season's matches: passes either way, assists either way
export function chemistryPairs(ms: Match[] = matches()): Pairs { return build(ms).pairs; }
// how many of each source went in (for the page's footnote)
export function chemistrySources(ms: Match[] = matches()): ChemSources { return build(ms).sources; }
