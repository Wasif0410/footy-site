// The season, added up from the match files: each player's totals and the team's. Kept in one
// place so the home page, the leaderboards, the stats page and the player pages always agree.
import type { Match, MatchPlayer, MatchSummary } from "./data";
import { matches, site } from "./data";

export type SeasonPlayer = {
  id: number; matches: number; minutes: number; judgedMin: number;
  avgRating: number | null; bestRating: number | null; ratedMatches: number;
  goals: number; assists: number; shots: number; shotsOnTarget: number;
  passes: number; passesAttempted: number; passPct: number | null; passesForward: number; receptions: number;
  tackles: number; interceptions: number; ballsWon: number; turnovers: number; dispossessed: number;
  mistakes: number; mistakePoints: number; touches: number; carries: number; possessionS: number;
  distanceKm: number; topSpeed: number | null; sprints: number; waiting: number;
  keeper: boolean;                           // only ever played in goal
  played: number; playedMin: number;         // every match, in goal too (the rest counts outfield games only)
  sections: Record<string, number>;          // rating points by section (Attacking, On the ball, Defending, ...)
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// mistakes as the rating counts them: passes cut out, tackled, ball out of play (any line that costs points)
const mistakesOf = (p: MatchPlayer) => p.breakdown.filter((b) => b.each < 0);

export function seasonPlayers(ms: Match[] = matches()): SeasonPlayer[] {
  const lines = new Map<number, MatchPlayer[]>();
  ms.forEach((m) => m.players.forEach((p) => lines.set(p.id, [...(lines.get(p.id) ?? []), p])));
  return [...lines].map(([id, all]) => {
    // games in goal aren't outfield play: a player who also played outfield is judged on those games
    const outfield = all.filter((l) => !l.keeper);
    const ls = outfield.length ? outfield : all;
    const st = (k: keyof MatchPlayer["stats"]) => sum(ls.map((l) => Number(l.stats[k]) || 0));
    const rated = ls.map((l) => l.rating).filter((r): r is number => r !== null);
    const speeds = ls.map((l) => l.running.top_speed_kmh).filter((v): v is number => v !== null);
    const passes = st("passes"), attempted = st("passes_attempted");
    const sections: Record<string, number> = {};
    ls.forEach((l) => l.breakdown.forEach((b) => { sections[b.section] = (sections[b.section] ?? 0) + b.points; }));
    return {
      id, matches: ls.length, minutes: sum(ls.map((l) => l.minutes)),
      judgedMin: sum(ls.map((l) => l.judged_min ?? l.minutes)),
      avgRating: rated.length ? Math.round((10 * sum(rated)) / rated.length) / 10 : null,
      bestRating: rated.length ? Math.max(...rated) : null, ratedMatches: rated.length,
      goals: st("goals"), assists: st("assists"), shots: st("shots"), shotsOnTarget: st("shots_on_target"),
      passes, passesAttempted: attempted, passPct: attempted ? (100 * passes) / attempted : null,
      passesForward: st("passes_forward"), receptions: st("receptions"),
      tackles: st("tackles_won"), interceptions: st("interceptions"), ballsWon: st("tackles_won") + st("interceptions"),
      turnovers: st("turnovers"), dispossessed: st("dispossessed"),
      mistakes: sum(ls.flatMap((l) => mistakesOf(l).map((b) => b.count))),
      mistakePoints: sum(ls.flatMap((l) => mistakesOf(l).map((b) => b.points))),
      touches: st("touches"), carries: st("carries_forward"), possessionS: st("possession_s"),
      distanceKm: sum(ls.map((l) => l.running.distance_km || 0)),
      topSpeed: speeds.length ? Math.max(...speeds) : null, sprints: sum(ls.map((l) => l.running.sprints || 0)),
      waiting: sum(ls.map((l) => l.waiting || 0)), sections, keeper: !outfield.length,
      played: all.length, playedMin: sum(all.map((l) => l.minutes)),
    };
  });
}

export type SeasonTeam = {
  played: number; won: number; drawn: number; lost: number; withStats: number; form: MatchSummary[];
  possession: number | null; passes: number; passPct: number | null; shots: number; shotsOnTarget: number;
  tackles: number; interceptions: number; distanceKm: number; sprints: number;
};

// The record counts every match played; the numbers come from the matches with stats.
export function seasonTeam(ms: Match[] = matches(), all: MatchSummary[] = site().matches): SeasonTeam {
  const stat = (m: Match, k: string) => m.team_stats.find((s) => s.key === k)?.us ?? 0;
  const total = (k: string) => sum(ms.map((m) => stat(m, k)));
  const passes = total("passes");
  const attempted = sum(ms.map((m) => (stat(m, "pass_pct") > 0 ? (100 * stat(m, "passes")) / stat(m, "pass_pct") : 0)));
  const dated = [...all].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  return {
    played: all.length, won: all.filter((m) => m.result === "W").length, drawn: all.filter((m) => m.result === "D").length,
    lost: all.filter((m) => m.result === "L").length, withStats: ms.length, form: dated,
    possession: ms.length ? Math.round(total("possession") / ms.length) : null,
    passes, passPct: attempted ? (100 * passes) / attempted : null,
    shots: total("shots"), shotsOnTarget: total("shots_on_target"),
    tackles: total("tackles_won"), interceptions: total("interceptions"),
    distanceKm: sum(ms.flatMap((m) => m.players.map((p) => p.running.distance_km || 0))),
    sprints: sum(ms.flatMap((m) => m.players.map((p) => p.running.sprints || 0))),
  };
}

// A leaderboard: who leads on one measure (players with too little time or too few chances left out).
export type Board = {
  key: string; title: string; note?: string; value: (p: SeasonPlayer) => number | null;
  show: (v: number) => string; qualifies?: (p: SeasonPlayer) => boolean; lowFirst?: boolean;
};

const MIN_RATE = 10;                         // minutes needed before "per 30 minutes" or "per hour" ranks count
const per = (n: number, mins: number, span: number) => (mins > 0 ? (n / mins) * span : null);
// awards are for outfield play: keepers (not rated yet) are left out of them
const enough = (p: SeasonPlayer) => p.minutes >= MIN_RATE && !p.keeper;
const outfield = (p: SeasonPlayer) => !p.keeper;

// Who does what best: the rating's own sections per hour on camera, and a few awards.
export const AWARDS: Board[] = [
  { key: "attack", title: "Best attackers", note: "Attacking rating points an hour: goals, assists, shots, forward passes, runs with the ball",
    value: (p) => per(p.sections["Attacking"] ?? 0, p.judgedMin, 60), show: (v) => v.toFixed(1), qualifies: enough },
  { key: "defend", title: "Best defenders", note: "Defending rating points an hour: tackles won, interceptions, clearances",
    value: (p) => per(p.sections["Defending"] ?? 0, p.judgedMin, 60), show: (v) => v.toFixed(1), qualifies: enough },
  { key: "playmaker", title: "Best on the ball", note: "On-the-ball rating points an hour: passing and touches",
    value: (p) => per(p.sections["On the ball"] ?? 0, p.judgedMin, 60), show: (v) => v.toFixed(1), qualifies: enough },
  { key: "hustle", title: "Hardest workers", note: "Sprints, balls won and runs with the ball, every 30 minutes",
    value: (p) => per(p.sprints + p.ballsWon + p.carries, p.minutes, 30), show: (v) => v.toFixed(1), qualifies: enough },
  { key: "engine", title: "The engine", note: "Metres covered a minute", value: (p) => per(1000 * p.distanceKm, p.minutes, 1),
    show: (v) => `${Math.round(v)} m/min`, qualifies: enough },
  { key: "magnet", title: "Ball magnet", note: "Touches every 30 minutes", value: (p) => per(p.touches, p.minutes, 30),
    show: (v) => v.toFixed(1), qualifies: enough },
  { key: "speed", title: "Speed demon", note: "Top speed held for a full second", value: (p) => p.topSpeed, show: (v) => `${v.toFixed(1)} km/h`,
    qualifies: outfield },
  { key: "reliable", title: "Mr Reliable", note: "Pass accuracy, at least 5 passes tried", value: (p) => p.passPct,
    show: (v) => `${Math.round(v)}%`, qualifies: (p) => p.passesAttempted >= 5 && !p.keeper },
  { key: "clean", title: "Cleanest game", note: "Fewest mistakes every 30 minutes", value: (p) => per(p.mistakes, p.minutes, 30),
    show: (v) => v.toFixed(1), qualifies: enough, lowFirst: true },
];

// The plain numbers.
export const BOARDS: Board[] = [
  { key: "rating", title: "Average rating", value: (p) => p.avgRating, show: (v) => v.toFixed(1) },
  { key: "goals", title: "Goals", value: (p) => p.goals, show: String },
  { key: "assists", title: "Assists", value: (p) => p.assists, show: String },
  { key: "won", title: "Balls won", note: "Tackles won and interceptions", value: (p) => p.ballsWon, show: String },
  { key: "speed", title: "Fastest", note: "Top speed held for a full second", value: (p) => p.topSpeed, show: (v) => `${v.toFixed(1)} km/h` },
  { key: "distance", title: "Distance covered", value: (p) => p.distanceKm, show: (v) => `${v.toFixed(1)} km` },
  { key: "sprints", title: "Sprints", value: (p) => p.sprints, show: String },
  { key: "passpct", title: "Pass accuracy", note: "At least 5 passes tried", value: (p) => p.passPct, show: (v) => `${Math.round(v)}%`,
    qualifies: (p) => p.passesAttempted >= 5 },
  { key: "passes", title: "Passes completed", value: (p) => p.passes, show: String },
  { key: "touches", title: "Touches", value: (p) => p.touches, show: String },
  { key: "shots", title: "Shots", value: (p) => p.shots, show: String },
  { key: "lost", title: "Lost the ball most", note: "Passes cut out, tackled, ball out of play", value: (p) => p.turnovers, show: String },
  { key: "mistakes", title: "Most rating points lost", note: "From mistakes, as the rating counts them",
    value: (p) => (p.mistakePoints ? -p.mistakePoints : 0), show: (v) => `−${v.toFixed(1)}` },
];

export function leaders(board: Board, rows: SeasonPlayer[], top = 5): { p: SeasonPlayer; v: number }[] {
  return rows.filter((p) => (board.qualifies ? board.qualifies(p) : true))
    .map((p) => ({ p, v: board.value(p) }))
    .filter((x): x is { p: SeasonPlayer; v: number } => x.v !== null && (board.lowFirst ? x.v >= 0 : x.v > 0))
    // a tie goes to whoever did it in fewer minutes ("most" boards) or kept it up for longer ("fewest" boards)
    .sort((a, b) => (board.lowFirst ? a.v - b.v || b.p.minutes - a.p.minutes : b.v - a.v || a.p.minutes - b.p.minutes))
    .slice(0, top);
}
