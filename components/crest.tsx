// The club crest (drawn for Seven XI: an oxblood shield with the cream of the kit), and a plain shield
// with the opponent's initials, since we don't have their badges.
import { useId } from "react";

const SHIELD = "M50 3 L95 15 V62 C95 88 74 105 50 115 C26 105 5 88 5 62 V15 Z";

export function Crest({ className = "crest", label }: { className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 100 118" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b13a5c" /><stop offset="1" stopColor="#5a1229" />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#cg${id})`} stroke="#efe8d6" strokeWidth="5" />
      <path d="M50 14 L85 23.5 V61 C85 81 69 95 50 103.5 C31 95 15 81 15 61 V23.5 Z" fill="none" stroke="#efe8d6" strokeOpacity=".45" strokeWidth="1.6" />
      <path d="M30 35 H70" stroke="#efe8d6" strokeOpacity=".55" strokeWidth="2" />
      <text x="50" y="78" textAnchor="middle" fontWeight="800" fontSize="36" fill="#efe8d6" letterSpacing="1" className="crest-txt">7XI</text>
    </svg>
  );
}

// "Asli Madrid" -> "AM", "Lads FC" -> "LF", "Opponent" -> "OP"
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function OppCrest({ name, className = "crest" }: { name: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 100 118" aria-hidden="true">
      <defs>
        <linearGradient id={`og${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6075" /><stop offset="1" stopColor="#23252f" />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#og${id})`} stroke="#d9dbe3" strokeWidth="5" />
      <text x="50" y="76" textAnchor="middle" fontWeight="800" fontSize="36" fill="#eef0f5" className="crest-txt">{initials(name)}</text>
    </svg>
  );
}
