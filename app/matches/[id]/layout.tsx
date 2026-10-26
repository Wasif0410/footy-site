import { MatchHead } from "@/components/blocks";
import { NavLinks } from "@/components/nav";
import { match, site } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return site().matches.filter((m) => m.stats).map((m) => ({ id: m.id }));
}

export default async function MatchLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const base = `/matches/${id}`;
  const tabs = [
    { href: `${base}/`, label: "Overview" },
    { href: `${base}/review/`, label: "Watch" },
    { href: `${base}/ratings/`, label: "Ratings" },
    { href: `${base}/player-stats/`, label: "Player stats" },
    { href: `${base}/movement/`, label: "Movement" },
    { href: `${base}/timeline/`, label: "Play-by-play" },
    { href: `${base}/highlights/`, label: "Highlights" },
  ];
  return (
    <>
      <MatchHead m={m} team={site().team} />
      <div className="tabs-bar"><div className="wrap"><NavLinks className="tabs" label="Match sections" links={tabs} exact /></div></div>
      <main className="wrap">{children}</main>
    </>
  );
}
