// A player card in the style of the football game: overall and position up top, the photo, the
// name, then the six attributes. Gold, silver or bronze by overall; the player of the match gets
// the club's special card.
import Link from "next/link";
import type { Player } from "@/lib/data";
import type { Attr, Card } from "@/lib/cards";
import { ATTR_NOTES } from "@/lib/cards";

const ORDER: Attr[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

export function FutCard({ card, player, special = false, link = true, size }: {
  card: Card; player: Player; special?: boolean; link?: boolean; size?: "lg";
}) {
  const body = (
    <>
      <div className="fut-top">
        <span className="ovr">{card.rated ? card.ovr : "??"}</span>
        <span className="pos">{card.pos}</span>
        <span className="club">7XI</span>
      </div>
      <div className="fut-photo" style={{ backgroundImage: player.photo ? `url(${player.photo})` : undefined }}>
        {player.photo ? null : <span className="fut-no">{player.number ?? ""}</span>}
      </div>
      <div className="fut-name">{player.name}</div>
      <dl className="fut-attrs">
        {ORDER.map((k) => (
          <div key={k} title={ATTR_NOTES[k]}><dt>{k}</dt><dd>{card.rated ? card.attrs[k] : "??"}</dd></div>
        ))}
      </dl>
      {special && card.rated ? <span className="fut-flag">Player of the match</span> : null}
      {!card.rated ? <span className="fut-flag">Not rated yet</span> : null}
    </>
  );
  const cls = `fut ${special && card.rated ? "motm" : card.tier}${size ? ` ${size}` : ""}`;
  const label = `${player.name}: ${card.rated ? `overall ${card.ovr}` : "not rated yet"}, ${card.pos}`;
  return link
    ? <Link className={cls} href={`/players/${player.slug}/`} aria-label={label}>{body}</Link>
    : <div className={cls} role="img" aria-label={label}>{body}</div>;
}
