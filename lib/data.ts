// The seeded data (data/*.json, written by `footy export-site` in Footy Analyzer), read at build
// time. Every page is static: nothing here runs in the browser.
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export type Side = 0 | 1;
export type Who = { id: number | null; name: string; team: Side | null };
export type Clip = { src: string; poster: string; start: number };
export type Proof = { t: number; text: string };
export type Screen = { label: string; start: number; end: number; file: string };
export type Video = { youtube: string | null; src: string | null; local: string | null; offset: number | null };
export type Kind = "pass" | "pass_intercepted" | "tackle" | "ball_out" | "shot" | "goal";

export type Goal = {
  minute: number; half: number; t: number; team: Side; scorer: Who | null; assist: Who | null; checked: boolean; clip: Clip | null;
};

export type Moment = {
  minute: number; half: number; t: number; kind: Kind; team?: Side; from: Who | null; to: Who | null;
  on_target?: boolean | null; forward?: boolean | null; at?: [number, number] | null; checked: boolean; clip?: Clip | null;
  claude?: boolean;                          // decided by Claude from the video, not checked by hand
  critical?: boolean; still?: string;        // our ball-winning moments: won in our third, and a picture of it
};

export type BoxStats = {
  goals: number; assists: number; passes: number; passes_attempted: number; pass_pct: number | null; receptions: number;
  passes_forward: number; shots: number; shots_on_target: number; tackles_won: number; interceptions: number;
  turnovers: number; dispossessed: number; touches: number; carries_forward: number; possession_s: number;
  clearances?: number;                       // counted by the per-player check
  pressures?: number; press_s?: number;      // closing down their player on the ball (from tracking)
};

export type RatingLine = {
  key: string; label: string; section: string; count: number; each: number; points: number; moments: Proof[];
  sure?: number | null;                      // the share these count for: below 1 when some aren't checked yet
};

export type Running = {
  distance_km: number; top_speed_kmh: number | null; sprints: number | null; pace_m_min: number | null; tracked_s: number;
};

export type MatchPlayer = {
  id: number; minutes: number; stints: number; rating: number | null; keeper: boolean;
  position?: string | null;                  // where they played in this match (CB, CDM, RM, ST...)
  checked?: boolean;                         // followed through the video by Claude (all his minutes)
  band?: number | null;                      // how far the rating could move as its events are checked
  points: number | null; per_hour: number | null; expected: number | null; above: number | null;
  judged_min: number | null; seen_min: number | null; estimated: string[];
  breakdown: RatingLine[]; stats: BoxStats; running: Running;
  heat: number[][] | null; avg: [number, number] | null; clips: Clip[];
  waiting: number;                           // their moments still waiting for a check (not counted yet)
};

export type TeamStat = { key: string; label: string; us: number; them: number };

export type Match = {
  id: string; date: string | null; venue: string | null; opponent: string; competition: string | null;
  score: { us: number; them: number }; result: "W" | "L" | "D"; play_minutes: number; halves: number[];
  goals_missing: { us: number; them: number };   // goals in the real score that the video didn't show
  potm: number | null; goals: Goal[]; team_stats: TeamStat[]; players: MatchPlayer[]; timeline: Moment[];
  pitch: [number, number];
  periods: [number, number][]; frame: [number, number]; video: Video; screens: Screen[];
  lineup: { id: number; keeper: boolean; spans: [number, number][] }[];
  // checked: our moments checked by hand; claude: decided by Claude from the video
  review: { events: number; checked: number; claude?: number; waiting: number; goals: number; goals_checked: number;
    players_checked?: number };   // players_checked: followed moment by moment through the video by Claude
};

// every match on the season's list; stats: false for a match played but not filmed or analysed
export type MatchSummary = Pick<Match, "id" | "date" | "venue" | "opponent" | "competition" | "result" | "potm"> & {
  score: { us: number; them: number } | null; stats: boolean;
};

// keeper: only ever played in goal; loan: a guest for a day (shown apart from the squad)
export type Player = {
  id: number; slug: string; name: string; number: number | null; keeper: boolean; photo: string | null; loan?: string | null;
  position?: string | null;                  // where they usually play
};

export type Formula = {
  baseline: number; spread: number; scale: number; per: number; min_minutes: number; judge_on: string;
  compare?: "team" | "fixed";               // fixed: everyone from the same baseline, points on their own
  min_named_minutes: number; team_per_hour: number; sections: string[];
  sure?: { checked: number; claude: number; auto: number; pending: number };
  actions: { key: string; label: string; section: string; each: number }[];
};

export type Site = {
  team: { name: string; short: string; primary: string; secondary: string };
  generated_at: string;
  matches: MatchSummary[];
  rating_formula: Formula | null;
};

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")) as T;
}

export const site = (): Site => read<Site>("site.json");
export const players = (): Player[] => read<Player[]>("players.json");
export const match = (id: string): Match => read<Match>(path.join("matches", `${id}.json`));
// the matches with stats (the ones that have a match centre)
export const matches = (): Match[] => site().matches.filter((m) => m.stats).map((m) => match(m.id));

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
