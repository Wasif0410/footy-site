import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/nav";
import { ThemeSwitch } from "@/components/theme-switch";
import { site } from "@/lib/data";
import "./globals.css";

// One family in two widths: condensed (font-stretch 75%) for numbers and headings, normal for text.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

const s = site();

export const metadata: Metadata = {
  title: { default: `${s.team.name}`, template: `%s | ${s.team.name}` },
  description: `Results, ratings, stats and match video for ${s.team.name}.`,
  robots: { index: false, follow: false },            // for the team, not for search engines
};

export const viewport: Viewport = { themeColor: "#111214", colorScheme: "dark" };

// before the page paints: a visitor who picked light mode gets it straight away (no dark flash)
const THEME = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches/", label: "Matches" },
  { href: "/players/", label: "Players" },
  { href: "/leaderboards/", label: "Leaderboards" },
  { href: "/stats/", label: "Stats" },
  { href: "/about/", label: "How it works" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const updated = new Date(s.generated_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });
  return (
    <html lang="en" className={archivo.variable} data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link className="wordmark" href="/" aria-label={`${s.team.name} home`}><i aria-hidden="true" />{s.team.name}</Link>
            <NavLinks className="site-nav" label="Site" links={LINKS} />
          </div>
        </header>
        {children}
        <footer className="site-foot">
          <div className="wrap">
            <span><strong>{s.team.name}</strong> Match centre. Stats from our match video, checked moment by moment.</span>
            <span>Updated {updated}. <ThemeSwitch /></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
