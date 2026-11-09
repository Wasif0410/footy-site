import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import Link from "next/link";
import { Crest } from "@/components/crest";
import { MusicPlayer } from "@/components/music-player";
import { NavLinks } from "@/components/nav";
import { ShareButton } from "@/components/share-button";
import { UiSounds } from "@/components/ui-sounds";
import { matches, site } from "@/lib/data";
import { seasonTeam } from "@/lib/season";
import { squadCards, teamRating } from "@/lib/squad";
import { tvWeeks } from "@/lib/tv";
import "./globals.css";
import "./pages.css";

// The matchday look: a semi-condensed face for titles, tabs and numbers, its normal width for reading.
const cond = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-cond", display: "swap" });
const sans = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });

const s = site();

export const metadata: Metadata = {
  title: { default: `${s.team.name}`, template: `%s | ${s.team.name}` },
  description: `Results, ratings, stats and match video for ${s.team.name}.`,
  robots: { index: false, follow: false },            // for the team, not for search engines
};

export const viewport: Viewport = { themeColor: "#05070c", colorScheme: "dark" };

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches/", label: "Matches" },
  { href: "/players/", label: "Players" },
  { href: "/leaderboards/", label: "Leaderboards" },
  { href: "/stats/", label: "Stats" },
  { href: "/tv/", label: "TV" },
  { href: "/about/", label: "How it works" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const updated = new Date(s.generated_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });
  const ms = matches();
  const team = seasonTeam(ms, s.matches);
  const rating = teamRating(squadCards(ms));
  const latest = ms[0];
  const reel = tvWeeks()[0];
  const year = s.matches.map((m) => m.date?.slice(0, 4)).find(Boolean);
  const winShare = team.played ? (100 * team.won) / team.played : 0;
  const [first, ...rest] = s.team.name.split(" ");
  return (
    <html lang="en" className={`${cond.variable} ${sans.variable}`} data-theme="dark">
      <body>
        <UiSounds />
        <header className="site-head">
          <div className="wrap head-bar">
            <Link className="wordmark" href="/" aria-label={`${s.team.name} home`}>
              <Crest className="crest" />
              <span>{first}{rest.length ? <> <b>{rest.join(" ")}</b></> : null}</span>
            </Link>
            <div className="club-box">
              {/* the game's top-right box: the season on top; underneath, share, the TV reel, help, contact and the music */}
              <div className="hud">
                <div className="hud-row" aria-label={`Season record: played ${team.played}, won ${team.won}, drawn ${team.drawn}, lost ${team.lost}`}>
                  {year ? <span className="season-year">{year}</span> : null}
                  <span className="record-bar" aria-hidden="true"><i style={{ width: `${winShare}%` }} /><span>{team.won}W · {team.drawn}D · {team.lost}L</span></span>
                  <span className="played">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z" /></svg>
                    {team.played} played
                  </span>
                </div>
                <nav className="hud-icons" aria-label="Shortcuts">
                  <ShareButton />
                  {reel ? (
                    <Link href="/tv/" className={latest && reel.matches.includes(latest.id) ? "dot" : undefined}
                      aria-label={`Seven XI TV: the reel from ${reel.title}`} title={`TV: ${reel.title}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="12.5" rx="1.5" /><path d="M10.2 9.2v5.6l4.6-2.8z" /><path d="M8.5 21h7" /></svg>
                    </Link>
                  ) : null}
                  <Link href="/about/" aria-label="Help: how the site works" title="Help: how it works">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 4.1" /><path d="M12 17.6v.1" /></svg>
                  </Link>
                  <Link href="/contact/" aria-label="Contact the admin" title="Contact the admin">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3.8 6.6l8.2 6.4 8.2-6.4" /></svg>
                  </Link>
                  <MusicPlayer />
                </nav>
              </div>
              {rating !== null ? (
                <Link className="team-badge" href="/players/" title="Team rating: the average overall of the seven best cards">
                  <b>{rating}</b><small>TEAM</small>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="wrap">
            <NavLinks className="site-nav" label="Site" links={LINKS} />
          </div>
        </header>
        {children}
        <footer className="site-foot">
          <div className="wrap">
            <span><strong>{s.team.name}</strong> Match centre. Stats from our match video, checked moment by moment.</span>
            <span>Updated {updated}. <Link className="foot-link" href="/contact/">Contact the admin</Link></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
