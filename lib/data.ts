// The seeded data (data/*.json, written by `footy export-site` in Footy Analyzer), read at build
// time. Every page is static: nothing here runs in the browser.
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export type Side = 0 | 1;
export type Who = { id: number | null; name: string; team: Side | null };
export type Clip = { src: string; poster: string; start: number };

export type Goal = {
  minute: number; half: number; team: Side; scorer: Who | null; assist: Who | null; checked: boolean; clip: Clip | null;
};

export type Moment = {
  minute: number; half: number; kind: "pass" | "pass_intercepted" | "tackle" | "ball_out" | "shot" | "goal";
  team?: Side; from: Who | null; to: Who | null; on_target?: boolean | null; forward?: boolean | null;
  at?: [number, number] | null; checked: boolean; clip?: Clip | null;
};

export type BoxStats = {
  goals: number; assists: number; passes: number; passes_attempted: number; pass_pct: number | null; receptions: number;
  passes_forward: number; shots: number; shots_on_target: number; tackles_won: number; interceptions: number;
  turnovers: number; dispossessed: number; touches: number; carries_forward: number; possession_s: number;
};

export type MatchPlayer = {
  id: number; minutes: number; stints: number; rating: number | null; keeper: boolean;
  breakdown: { label: string; section: string; count: number; points: number }[];
  stats: BoxStats;
  running: { distance_km: number; top_speed_kmh: number | null; sprints: number | null };
  heat: number[][] | null; avg: [number, number] | null; clips: Clip[];
};

export type TeamStat = { key: string; label: string; us: number; them: number };

export type Match = {
  id: string; date: string | null; venue: string | null; opponent: string; competition: string | null;
  score: { us: number; them: number }; result: "W" | "L" | "D"; play_minutes: number; halves: number[];
  potm: number | null; goals: Goal[]; team_stats: TeamStat[]; players: MatchPlayer[]; timeline: Moment[];
  pitch: [number, number];
  review: { events: number; checked: number; waiting: number; goals: number; goals_checked: number };
};

export type MatchSummary = Pick<Match, "id" | "date" | "venue" | "opponent" | "competition" | "score" | "result" | "potm">;

export type Player = { id: number; slug: string; name: string; number: number | null; keeper: boolean; photo: string | null };

export type SeasonRow = {
  player_id: number; name: string; number: number | null; matches: number; avg_rating: number | null;
  best_rating: number | null; pass_pct: number | null; minutes: number; goals: number; assists: number; passes: number;
  passes_attempted: number; turnovers: number; interceptions: number; tackles_won: number; shots: number;
  shots_on_target: number; distance_km: number | null; points: number;
};

export type Site = {
  team: { name: string; short: string; primary: string; secondary: string };
  generated_at: string;
  matches: MatchSummary[];
  rating_formula: { baseline: number; spread: number; per: number; min_minutes: number;
    actions: { key: string; label: string; section: string; each: number }[] } | null;
};

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")) as T;
}

export const site = (): Site => read<Site>("site.json");
export const players = (): Player[] => read<Player[]>("players.json");
export const season = (): SeasonRow[] => read<SeasonRow[]>("season.json");
export const match = (id: string): Match => read<Match>(path.join("matches", `${id}.json`));
export const matches = (): Match[] => site().matches.map((m) => match(m.id));

export function playerById(): Map<number, Player> {
  return new Map(players().map((p) => [p.id, p]));
}

export function playerBySlug(slug: string): Player | undefined {
  return players().find((p) => p.slug === slug);
}

// Everything a player did across the season's matches, newest first.
export function playerMatches(id: number): { match: Match; line: MatchPlayer }[] {
  return matches().flatMap((m) => {
    const line = m.players.find((p) => p.id === id);
    return line ? [{ match: m, line }] : [];
  });
}
