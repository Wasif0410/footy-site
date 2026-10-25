import { Scoreboard } from "@/components/blocks";
import { NavLinks } from "@/components/nav";
import { match, site } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return site().matches.map((m) => ({ id: m.id }));
}

export default async function MatchLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const base = `/matches/${id}`;
  const tabs = [
    { href: `${base}/`, label: "Summary" },
    { href: `${base}/ratings/`, label: "Ratings" },
    { href: `${base}/box-score/`, label: "Box score" },
    { href: `${base}/timeline/`, label: "Play-by-play" },
    { href: `${base}/pitch/`, label: "Pitch" },
    { href: `${base}/highlights/`, label: "Highlights" },
  ];
  return (
    <>
      <Scoreboard m={m} team={site().team}>
        <div className="wrap"><NavLinks className="tabs" links={tabs} exact /></div>
      </Scoreboard>
      <main className="wrap">{children}</main>
    </>
  );
}
