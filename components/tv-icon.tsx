// A little retro TV: antennas, a glowing screen with a play mark, two feet. It bounces next to the "TV" link
// in the header and, bigger, wanders around on the TV page (CSS only; still for reduced motion).
export function TvIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`tv-icon ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g className="tv-ant">
        <line x1="16" y1="8" x2="10" y2="2" />
        <line x1="16" y1="8" x2="22" y2="2" />
        <circle cx="10" cy="2" r="1.4" />
        <circle cx="22" cy="2" r="1.4" />
      </g>
      <rect className="tv-body" x="3" y="8" width="26" height="19" rx="4.5" />
      <rect className="tv-screen" x="6.5" y="11" width="16" height="13" rx="2.5" />
      <path className="tv-play" d="M12.6 14.4v6.2l5-3.1z" />
      <circle className="tv-knob" cx="25.6" cy="14" r="1.3" />
      <circle className="tv-knob" cx="25.6" cy="19" r="1.3" />
      <line className="tv-foot" x1="9" y1="27" x2="7.5" y2="30" />
      <line className="tv-foot" x1="23" y1="27" x2="24.5" y2="30" />
    </svg>
  );
}
