// Small building blocks shared by every page. They render on the server at build time.
import Link from "next/link";
import type { Clip, Goal, Kind, Player, TeamStat } from "@/lib/data";
import { KIND_LABEL, minute, ratingBand } from "@/lib/format";

// The numbered shirt, drawn as the app draws it.
export function Shirt({ number, size, off = false }: { number: number | null | undefined; size?: "sm" | "lg"; off?: boolean }) {
  return (
    <svg className={`shirt${size ? ` ${size}` : ""}${off ? " off" : ""}`} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M13 3 L17 2 Q20 6 23 2 L27 3 L38 10 L34 18 L31 16 L31 38 L9 38 L9 16 L6 18 L2 10 Z" />
      <text x="20" y="30">{number ?? "?"}</text>
    </svg>
  );
}

export function Rating({ value, large = false }: { value: number | null; large?: boolean }) {
  return (
    <span className={`rating ${ratingBand(value)}${large ? " lg" : ""}`} title={value === null ? "Not rated" : `Rating ${value.toFixed(1)}`}>
      {value === null ? "–" : value.toFixed(1)}
    </span>
  );
}

// A player's name with their shirt, linking to their page.
export function Who({ player, sub, link = true, size = "sm" }: { player: Player | undefined; sub?: string; link?: boolean; size?: "sm" | "lg" }) {
  const inner = (
    <>
      <Shirt number={player?.number} size={size} />
      <span style={{ minWidth: 0 }}>
        <span className="name">{player?.name ?? "Unknown"}</span>
        {sub ? <span className="sub">{sub}</span> : null}
      </span>
    </>
  );
  return link && player ? <Link className="who" href={`/players/${player.slug}/`}>{inner}</Link> : <span className="who">{inner}</span>;
}

export function Bar({ value, max, tone }: { value: number; max: number; tone?: "up" | "down" }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
  return <span className={`bar${tone ? ` ${tone}` : ""}`} aria-hidden="true"><i style={{ width: `${w}%` }} /></span>;
}

// What kind of moment it was, coloured as the app labels it.
export function KindTag({ kind }: { kind: Kind }) {
  return <span className={`kind ${kind}`}>{KIND_LABEL[kind]}</span>;
}

// Our numbers against theirs, one bar pair per measure.
export function Compare({ stats, us, them }: { stats: TeamStat[]; us: string; them: string }) {
  return (
    <div>
      <div className="legend-2"><span style={{ color: "var(--club-ink)" }}>{us}</span><span className="muted">{them}</span></div>
      <div className="compare">
        {stats.map((s) => {
          const share = s.key === "possession" || s.key === "pass_pct";
          const total = s.us + s.them || 1;
          const w = (v: number) => (share ? v : (100 * v) / total);
          const suffix = share ? "%" : "";
          return (
            <div className="cmp" key={s.key}>
              <span className="label">{s.key === "possession" ? `${s.label} (estimate)` : s.label}</span>
              <span className={`v${s.us > s.them ? " lead" : ""}`}>{s.us}{suffix}</span>
              <span className="bars" role="img" aria-label={`${s.label}: ${us} ${s.us}${suffix}, ${them} ${s.them}${suffix}`}>
                <span className="us"><i style={{ width: `${Math.min(100, w(s.us))}%` }} /></span>
                <span className="them"><i style={{ width: `${Math.min(100, w(s.them))}%` }} /></span>
              </span>
              <span className="v r">{s.them}{suffix}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The match on one line: our goals above it, theirs below, half-time marked.
export function GoalTimeline({ goals, halves }: { goals: Goal[]; halves: number[] }) {
  const total = halves.reduce((a, b) => a + b, 0) || 1;
  const at = (m: number) => `${Math.max(1.5, Math.min(98.5, (100 * (m - 0.5)) / total))}%`;
  return (
    <div>
      <div className="gt" role="img" aria-label={`Goals by minute: ${goals.map((g) => `${minute(g.minute)} ${g.team === 0 ? "us" : "them"}`).join(", ")}`}>
        <span className="gt-line" />
        <span className="gt-ht" style={{ left: `${(100 * halves[0]) / total}%` }} />
        {goals.map((g, i) => (
          <span key={i} className={`gt-goal ${g.team === 0 ? "us" : "them"}`} style={{ left: at(g.minute) }}>{minute(g.minute)}</span>
        ))}
      </div>
      <div className="gt-scale"><span>Kick-off</span><span>Half-time</span><span>Full time</span></div>
    </div>
  );
}

export function ClipCard({ clip, title, sub, min }: { clip: Clip; title: string; sub?: string; min?: number }) {
  return (
    <figure className="clip">
      <video src={clip.src} poster={clip.poster} controls preload="none" playsInline muted />
      <figcaption>
        {min !== undefined ? <span className="m">{minute(min)}</span> : null}
        <span className="t">{title}</span>
        {sub ? <span className="s">{sub}</span> : null}
      </figcaption>
    </figure>
  );
}

// A pitch in metres (we attack to the right), with an optional heatmap of seconds per cell, and dots.
export function Pitch({ size, heat, dots, label }: {
  size: [number, number]; heat?: number[][] | null; label: string;
  dots?: { x: number; y: number; text?: string; fill?: string; ring?: string; r?: number }[];
}) {
  const [L, W] = size;
  const max = heat ? Math.max(1e-9, ...heat.flat()) : 1;
  const nx = heat?.length ?? 0, ny = heat?.[0]?.length ?? 0;
  const goalW = Math.min(5, W / 4);
  const box = Math.min(6, L / 9);
  return (
    <svg className="pitch-svg" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label={label}>
      <rect x={-1} y={-1} width={L + 2} height={W + 2} fill="var(--pitch)" />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={(i * L) / 8} y={0} width={L / 16} height={W} fill="var(--pitch-2)" />)}
      {heat?.map((col, i) => col.map((v, j) => (v > 0 ? (
        <rect key={`${i}-${j}`} x={(i * L) / nx} y={(j * W) / ny} width={L / nx} height={W / ny}
          fill="#ffd23f" opacity={Math.min(0.88, 0.1 + 0.8 * Math.sqrt(v / max))} />
      ) : null)))}
      <g fill="none" stroke="var(--pitch-line)" strokeWidth={0.22}>
        <rect x={0} y={0} width={L} height={W} />
        <line x1={L / 2} y1={0} x2={L / 2} y2={W} />
        <circle cx={L / 2} cy={W / 2} r={Math.min(4, W / 6)} />
        <rect x={0} y={W / 2 - goalW * 1.6} width={box} height={goalW * 3.2} />
        <rect x={L - box} y={W / 2 - goalW * 1.6} width={box} height={goalW * 3.2} />
        <rect x={-0.9} y={W / 2 - goalW / 2} width={0.9} height={goalW} />
        <rect x={L} y={W / 2 - goalW / 2} width={0.9} height={goalW} />
      </g>
      {dots?.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={d.r ?? 1.25} fill={d.fill ?? "var(--club)"} stroke={d.ring ?? "#fff"} strokeWidth={0.28} />
          {d.text ? <text x={d.x} y={d.y + 0.5} textAnchor="middle" fontSize={1.35} fontWeight={800} fill={d.fill === "#fff" ? "var(--club)" : "#fff"}>{d.text}</text> : null}
        </g>
      ))}
    </svg>
  );
}

export function SectionHead({ title, note, more }: { title: string; note?: string; more?: { href: string; label: string } }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {note ? <p style={{ marginTop: "0.35rem" }}>{note}</p> : null}
      </div>
      {more ? <Link className="more" href={more.href}>{more.label}</Link> : null}
    </div>
  );
}
