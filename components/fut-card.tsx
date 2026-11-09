// A player card laid out as FIFA 15 lays out its cards: the name across the top, the overall and position side by side
// under it, the club crest and the nation down the left, the player on the right in front of the card's lens, a band
// with the chemistry style (a kicking player and its name), then the six attributes in two columns. Gold, silver or
// bronze by overall (all drawn as the game's rare cards); the player of the match gets the club's special card, in its
// colours (the colour alone marks it: its band reads like every other card's). Every player is Canadian.
import Link from "next/link";
import type { CSSProperties } from "react";
import { CanadaFlag } from "@/components/card-marks";
import { Crest } from "@/components/crest";
import type { Player } from "@/lib/data";
import type { Attr, Card } from "@/lib/cards";
import { ATTR_NOTES, GK_LABELS, GK_NOTES } from "@/lib/cards";
import { chemStyle } from "@/lib/ut";

const ORDER: Attr[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

// Framing the face. Each supplied portrait is a 640 x 640 cut-out, framed a little differently by the photographer, so
// the head would be bigger, higher or off to one side on some cards. Per player: [top of the hair, bottom of the chin,
// middle of the face], all in px of the 640 x 640 portrait. The card draws every head the same size (hair top to chin =
// FACE_H px of the portrait, at the base 130% of the box), with the hair top on one line and the face in the middle of
// the box. The box is 7.47em wide (.fut-photo in globals.css); a new portrait without an entry here is drawn as it is.
const FACE_H = 325;
const TOP_EM = 0.25;
const BOX_W = 7.47;
export const FRAMES: Record<string, [number, number, number]> = {
  abishek: [39, 345, 325], advaith: [16, 325, 323], "al-ghoul": [12, 362, 328], arav: [11, 325, 320], areesh: [8, 295, 320],
  aryan: [8, 345, 320], ayaan: [17, 372, 320], imaad: [18, 335, 316], kaif: [7, 358, 320], khaled: [13, 338, 330],
  praneet: [20, 345, 320], rishi: [33, 360, 325], "ritvik-dhanda": [12, 375, 320], siddiqui: [12, 328, 320],
  vishwan: [19, 325, 320], wasif: [7, 360, 316], zuhair: [16, 339, 316],
};
// A photo from the video (240 x 320) is a whole player: [top of the head in px, middle of the head as a fraction of the
// photo's width, head width in px]. The head is drawn 2.6em wide (the shirt number stays in view), its top on the same line, its middle in the box.
const VIDEO_FRAMES: Record<string, [number, number, number]> = {
  chaudhary: [5, 0.54, 80], hamza: [3, 0.48, 85],
};
function photoFrame(slug: string, cutout: boolean): CSSProperties {
  const f = FRAMES[slug];
  if (cutout && f) {
    const k = FACE_H / (f[1] - f[0]);                 // how much bigger or smaller than the base size this head is drawn
    const img = BOX_W * 1.3 * k;                      // the drawn width and height of the portrait, em
    return { backgroundSize: `${(130 * k).toFixed(2)}% auto`,
      backgroundPosition: `${(BOX_W / 2 - (f[2] / 640) * img).toFixed(3)}em ${(TOP_EM - (f[0] / 640) * img).toFixed(3)}em` };
  }
  const v = VIDEO_FRAMES[slug];
  if (!cutout && v) {
    const w = Math.max((2.6 / v[2]) * 240, BOX_W * 1.04); // drawn width of the photo, em (the head 2.6em wide, never less than the box)
    return { backgroundSize: `${((w / BOX_W) * 100).toFixed(2)}% auto`,
      backgroundPosition: `${(BOX_W / 2 - v[1] * w).toFixed(3)}em ${(TOP_EM - (v[0] / 320) * (w * 4 / 3)).toFixed(3)}em` };
  }
  return {};
}

// the small kicking player beside the chemistry style: head, a leaning body, the standing leg and the kicking leg out in
// front, arms thrown out for balance, and the ball
function KickIcon() {
  return (
    <svg className="fut-ico" viewBox="0 0 28 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.6 8.2 L11.6 14.4" />
        <path d="M11.6 14.4 L9.4 18.4 L5.6 21.2" />
        <path d="M11.6 14.4 L16.4 15.6 L19.6 12.2" />
        <path d="M13.2 9.6 L8.6 8.4 L6.2 10.6" />
        <path d="M13.2 9.6 L17.4 10.4" />
      </g>
      <circle cx="15.6" cy="4.2" r="2.5" fill="currentColor" />
      <circle cx="23.6" cy="10.4" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
export function FutCard({ card, player, special = false, link = true, size }: {
  card: Card; player: Player; special?: boolean; link?: boolean; size?: "lg";
}) {
  // a supplied portrait is a cut-out on a clear background; a photo from the video is a rectangle, softened all round
  const motm = special && card.rated;
  const cutout = !!player.photo && player.photo.endsWith(".webp");
  const body = (
    <>
      <div className="fut-name">{player.name}</div>
      <div className="fut-head">
        <span className="ovr">{card.rated ? card.ovr : "??"}</span>
        <span className="pos">{card.pos}</span>
      </div>
      <div className="fut-marks">
        <Crest className="fut-crest" />
        <CanadaFlag className="fut-nation" />
      </div>
      <div className={`fut-photo${cutout ? " is-cut" : ""}`} style={{ backgroundImage: player.photo ? `url(${player.photo})` : undefined, ...photoFrame(player.slug, cutout) }}>
        {player.photo ? null : (
          // no photo yet: an anonymous silhouette, as the game shows a player without a face scan
          <svg className="fut-anon" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="34" r="19" />
            <path d="M14 100 C14 72 30 58 50 58 C70 58 86 72 86 100 Z" />
          </svg>
        )}
      </div>
      <dl className="fut-attrs">
        {ORDER.map((k) => (
          <div key={k} title={card.gkCard ? GK_NOTES[k] : ATTR_NOTES[k]}><dt>{card.gkCard ? GK_LABELS[k] : k}</dt><dd>{card.rated ? card.attrs[k] : "??"}</dd></div>
        ))}
      </dl>
      {/* the band: where the game prints a card's chemistry style, a kicking player and its name */}
      <div className="fut-note">
        {card.rated ? <KickIcon /> : null}
        <span>{card.rated ? chemStyle(card).name : card.gkCard ? "Saves not measured" : "Not rated yet"}</span>
      </div>
    </>
  );
  const cls = `fut ${motm ? "motm" : card.tier}${size ? ` ${size}` : ""}`;
  const label = `${player.name}${card.gkCard ? " (goalkeeper card)" : ""}: ${card.rated ? `overall ${card.ovr}` : card.gkCard ? "not rated, saves aren't measured" : "not rated yet"}, ${card.pos}, Canada`;
  return link
    ? <Link className={cls} href={`/players/${player.slug}/`} aria-label={label}>{body}</Link>
    : <div className={cls} role="img" aria-label={label}>{body}</div>;
}
