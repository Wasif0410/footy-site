// Seven XI TV: each match's reel (one edited video of the 10 best moments) and the moments in it
// (data/tv.json, written by tools/tv in Footy Analyzer). Read at build time like the rest of the data.
import fs from "node:fs";
import path from "node:path";

export type TvMoment = {
  rank: number; kind: string; player_id: number; match: string; opponent: string; minute: number; half: number;
  extra: string | null;
  t: number;                                 // where it starts in the reel (seconds)
};

export type TvWeek = {
  id: string; title: string; from: string; to: string; matches: string[];
  reel: { src: string; poster: string; length: number; music?: string } | null;
  top: TvMoment[];
  player_of_week?: { id: number; line: string; t: number; award?: string } | null;
};

export function tvWeeks(): TvWeek[] {
  const f = path.join(process.cwd(), "data", "tv.json");
  if (!fs.existsSync(f)) return [];
  const weeks = (JSON.parse(fs.readFileSync(f, "utf-8")) as { weeks: TvWeek[] }).weeks;
  return [...weeks].sort((a, b) => b.from.localeCompare(a.from));
}
