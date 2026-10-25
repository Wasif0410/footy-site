import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Public_Sans } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/nav";
import { Crest } from "@/components/ui";
import { site } from "@/lib/data";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-body" });

const s = site();

export const metadata: Metadata = {
  title: { default: `${s.team.name} · Match Centre`, template: `%s · ${s.team.name}` },
  description: `Results, player ratings, stats and highlights for ${s.team.name}.`,
  robots: { index: false, follow: false },            // for the team, not for search engines
};

export const viewport: Viewport = { themeColor: "#0f141b" };

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches/", label: "Matches" },
  { href: "/players/", label: "Players" },
  { href: "/stats/", label: "Stats" },
  { href: "/about/", label: "How it works" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const updated = new Date(s.generated_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="masthead">
          <div className="wrap">
            <Link className="brand" href="/">
              <Crest name={s.team.short} side="us" size={2} />
              {s.team.name}
            </Link>
            <NavLinks className="nav" links={LINKS} />
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap">
            <span>{s.team.name} Match Centre · stats from our match video, checked by the team</span>
            <span>Updated {updated}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
