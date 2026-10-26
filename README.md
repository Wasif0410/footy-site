# Footy Match Centre

The team's public match centre: results, player ratings, box scores, play-by-play, pitch maps and
highlight clips. It's a fully static site (Next.js, `output: "export"`) hosted on Vercel. Nothing
runs on a server and nothing connects back to the laptop that makes the stats.

## Where the data comes from

Everything in `data/` and `public/media/` is **seeded** from the local Footy Analyzer app:

```
cd ../Footy_Analyzer
uv run footy export-site ../footy-site
```

The export uses the app's own numbers, keeping only what's fit to show:

- Only events that count: ones the system is sure of or that were checked by hand. Events still
  waiting for a check are left out until they're decided.
- A photo per player (their clearest crop from the match video).
- Short highlight clips of goals and shots (540p, about 0.5–1 MB each). The full match video
  stays local.
- No file paths, review notes or model internals.

Clips and photos are made once and kept, so re-seeding takes about 20 seconds. Delete
`public/media/photos/` to remake the photos.

## Settings: `seed.config.json`

| Key | What it does |
| --- | --- |
| `team.name`, `team.short` | The club name and its 3-letter crest |
| `team.primary`, `team.secondary` | Kit colours (for reference; the stylesheet uses maroon and cream) |
| `matches.<id>.opponent` | Who we played (shown on the scoreboard) |
| `matches.<id>.competition`, `.venue` | Shown above the scoreboard |
| `matches.<id>.score` | The real final score, e.g. `{"us": 2, "them": 10}`. Goals the video didn't show are listed as "unable to find" |
| `matches.<id>.video` | `youtube` (the unlisted upload's id), `offset` (seconds, if the upload was trimmed), `local` (only used on this computer) |
| `extra_matches` | Matches played without stats: `id`, `date`, `opponent`, `result` (W/D/L), optional `score`. They count in the record and show as "No stats available" |
| `exclude_matches` | Match ids to leave off the site |
| `photos`, `clips` | Turn player photos or video clips off |

## Updating the site after labelling

1. Label and review in Footy Analyzer as usual.
2. `uv run footy export-site ../footy-site`
3. `npm run build` (checks every page builds; the result is in `out/`)
4. Commit and push. Vercel rebuilds and deploys on every push to `main`.

## First deploy (one time)

1. Create an empty GitHub repo (private is fine) and push this one to it.
2. On vercel.com: **Add New → Project**, import the repo. `vercel.json` already sets everything
   (build `npm run build`, output `out/`, served as plain static files); leave the framework preset
   as it comes and add no environment variables.
3. Share the `*.vercel.app` link with the team.

The site asks search engines not to index it, but anyone with the link can open it. Vercel can put
a password on it (Deployment Protection) if needed.

## Local development

```
npm install
npm run dev        # http://localhost:3000
npm run lint       # type-check
```

## Pages

- **Home:** latest result, player of the match, top rated, our goals on video, season leaders
- **Match centre** (`/matches/<id>/`): Summary, Ratings, Box score, Play-by-play, Pitch, Highlights
- **Players:** squad cards, plus a profile per player (season numbers, match log, rating breakdown, heatmap, clips)
- **Stats:** season leaderboards and a sortable table
- **How it works:** where the numbers come from and how ratings are worked out
