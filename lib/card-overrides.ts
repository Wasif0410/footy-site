// Card choices that belong to the site, not to the export: `footy.exe export-site` rewrites data/players.json every
// time, so anything set here survives a re-export. Keyed by the player's slug.

// The position printed on a player's main card. Only the label changes: the overall and the six attributes are worked
// out from the video as for everyone else, weighed for the position they played most (the card's "Why this card" still
// names that one). Ultimate Team and the home page's best seven place players by their roster position, not this label.
export const CARD_POSITION: Record<string, string> = {
  arav: "CDM",
  wasif: "CAM",
};

// Players who also get a goalkeeper card beside their main one: position GK, ?? for the overall and every attribute
// (saves aren't measured, so nothing is invented). It is a second card for the same player; the stats, ratings and
// leaderboards still count him once.
export const KEEPER_CARD: readonly string[] = ["arav"];
