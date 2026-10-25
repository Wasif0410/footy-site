// Building blocks used across pages. All render on the server at build time.
import Link from "next/link";
import type { Clip, Goal, Moment, Player, TeamStat } from "@/lib/data";
import { fmt, initials, minute, ratingBand } from "@/lib/format";

export function Crest({ name, side, size = 2.4 }: { name: string; side: "us" | "them"; size?: number }) {
  return (
    <span className={`crest ${side}`} style={{ width: `${size}rem`, height: `${size}rem`, fontSize: `${size * 0.3}rem` }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Rating({ value, large = false }: { value: number | null; large?: boolean }) {
  return (
    <span className={`rating ${ratingBand(value)}${large ? " lg" : ""}`} title={value === null ? "Not rated" : `Rating ${value.toFixed(1)}`}>
      {value === null ? "–" : value.toFixed(1)}
    </span>
  );
}

export function Avatar({ player, large = false }: { player: Player | undefined; large?: boolean }) {
  if (!player?.photo) {
    return <span className={`avatar fallback${large ? " lg" : ""}`} aria-hidden="true">{player?.number ?? "?"}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`avatar${large ? " lg" : ""}`} src={player.photo} alt="" loading="lazy" />;
}

export function PlayerLine({ player, sub, link = true }: { player: Player | undefined; sub?: string; link?: boolean }) {
  const inner = (
    <>
      <Avatar player={player} />
      <span className="who">
        <span className="name">{player?.name ?? "Unknown"}</span>
        {sub ? <span className="sub">{sub}</span> : null}
      </span>
    </>
  );
  return link && player ? <Link className="player-line" href={`/players/${player.slug}/`}>{inner}</Link> : <span className="player-line">{inner}</span>;
}

export function BallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
    </svg>
  );
}

const PATHS: Record<Moment["kind"], string> = {
  goal: "",
  shot: "M4 12h11M11 6l6 6-6 6M20 4v16",
  pass: "M4 12h13M13 7l5 5-5 5",
  pass_intercepted: "M4 8l16 8M4 16l7-3.5M20 8l-7 3.5",
  tackle: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z",
  ball_out: "M4 4h16v16H4zM9 12h6",
};

export function KindIcon({ kind }: { kind: Moment["kind"] }) {
  if (kind === "goal") return <BallIcon />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Compare({ stats }: { stats: TeamStat[] }) {
  return (
    <div className="compare">
      {stats.map((s) => {
        const total = s.us + s.them || 1;
        const suffix = s.key === "possession" || s.key === "pass_pct" ? "%" : "";
        const share = (v: number) => (suffix ? v : (100 * v) / total);
        return (
          <div className="compare-row" key={s.key}>
            <span className="label">{s.label}</span>
            <span className="v">{s.us}{suffix}</span>
            <span className="bars" role="img" aria-label={`${s.label}: us ${s.us}${suffix}, them ${s.them}${suffix}`}>
              <span className="us"><i style={{ width: `${Math.min(100, share(s.us))}%` }} /></span>
              <span className="them"><i style={{ width: `${Math.min(100, share(s.them))}%` }} /></span>
            </span>
            <span className="v right">{s.them}{suffix}</span>
          </div>
        );
      })}
    </div>
  );
}

// The match on one line: each goal at its minute, ours above, theirs below, half-time marked.
export function GoalTimeline({ goals, halves }: { goals: Goal[]; halves: number[] }) {
  const total = halves.reduce((a, b) => a + b, 0) || 1;
  const at = (m: number) => `${Math.min(100, (100 * (m - 0.5)) / total)}%`;
  return (
    <div>
      <div className="gt">
        <span className="gt-track" />
        <span className="gt-ht" style={{ left: `${(100 * halves[0]) / total}%` }} title="Half-time" />
        {goals.map((g, i) => (
          <span key={i} className={`gt-goal ${g.team === 0 ? "us" : "them"}`} style={{ left: at(g.minute) }}
            title={`${minute(g.minute)} ${g.team === 0 ? g.scorer?.name ?? "Goal" : "Goal against"}`}>
            {g.team === 1 ? <BallIcon /> : null}
            {minute(g.minute)}
            {g.team === 0 ? <BallIcon /> : null}
          </span>
        ))}
      </div>
      <div className="gt-scale"><span>Kick-off</span><span>Half-time</span><span>Full time</span></div>
    </div>
  );
}

export function ClipCard({ clip, title, sub, min }: { clip: Clip; title: string; sub?: string; min?: number }) {
  return (
    <figure className="clip" style={{ margin: 0 }}>
      <video src={clip.src} poster={clip.poster} controls preload="none" playsInline muted />
      <figcaption className="cap">
        {min !== undefined ? <span className="min">{minute(min)}</span> : null}
        <span><strong>{title}</strong>{sub ? <span className="muted small"> · {sub}</span> : null}</span>
      </figcaption>
    </figure>
  );
}

// A pitch drawn in metres (we attack to the right), with an optional heatmap of seconds per cell.
export function Pitch({ size, heat, dots, label }: {
  size: [number, number]; heat?: number[][] | null; dots?: { x: number; y: number; text?: string; tone?: string }[]; label: string;
}) {
  const [L, W] = size;
  const max = heat ? Math.max(1e-9, ...heat.flat()) : 1;
  const nx = heat?.length ?? 0, ny = heat?.[0]?.length ?? 0;
  const goalW = Math.min(5, W / 4);
  return (
    <svg className="pitch-svg" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label={label}>
      <rect x={-1} y={-1} width={L + 2} height={W + 2} fill="var(--pitch)" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={(i * L) / 8} y={0} width={L / 16} height={W} fill="var(--pitch-2)" />
      ))}
      {heat?.map((col, i) => col.map((v, j) => v > 0 ? (
        <rect key={`${i}-${j}`} x={(i * L) / nx} y={(j * W) / ny} width={L / nx} height={W / ny}
          fill="#ffd23f" opacity={Math.min(0.85, 0.08 + 0.8 * Math.sqrt(v / max))} />
      ) : null))}
      <g fill="none" stroke="var(--pitch-line)" strokeWidth={0.25}>
        <rect x={0} y={0} width={L} height={W} />
        <line x1={L / 2} y1={0} x2={L / 2} y2={W} />
        <circle cx={L / 2} cy={W / 2} r={Math.min(4, W / 6)} />
        <rect x={0} y={W / 2 - goalW * 1.6} width={Math.min(6, L / 9)} height={goalW * 3.2} />
        <rect x={L - Math.min(6, L / 9)} y={W / 2 - goalW * 1.6} width={Math.min(6, L / 9)} height={goalW * 3.2} />
        <rect x={-0.9} y={W / 2 - goalW / 2} width={0.9} height={goalW} />
        <rect x={L} y={W / 2 - goalW / 2} width={0.9} height={goalW} />
      </g>
      {dots?.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={1.3} fill={d.tone ?? "var(--club)"} stroke="#fff" strokeWidth={0.3} />
          {d.text ? <text x={d.x} y={d.y + 0.55} textAnchor="middle" fontSize={1.4} fontWeight={700} fill="#fff">{d.text}</text> : null}
        </g>
      ))}
    </svg>
  );
}

export function Kpi({ value, label }: { value: string | number; label: string }) {
  return <div className="kpi"><b>{value}</b><span>{label}</span></div>;
}

export function TrustLine({ checked, total, what }: { checked: number; total: number; what: string }) {
  const p = total ? (100 * checked) / total : 0;
  return (
    <p className="trust">
      <span className="meter" aria-hidden="true"><i style={{ width: `${p}%` }} /></span>
      <span>{checked} of {total} {what} checked by hand ({fmt(p)}%)</span>
    </p>
  );
}
