// Background music: six FIFA 15 soundtrack favourites chosen and supplied by the site owner (MP3s in public/media/music/).
// `seconds` is the length of the file as served; `bpm` is the song's tempo (measured from the audio and checked against
// published values; it is not used by the player).
export type Track = { src: string; title: string; artist: string; bpm: number; seconds: number };

export const TRACKS: Track[] = [
  { src: "/media/music/the-nights.mp3", title: "The Nights", artist: "Avicii", bpm: 126, seconds: 187.0 },
  { src: "/media/music/walk.mp3", title: "Walk", artist: "Kwabs", bpm: 144, seconds: 213.0 },
  { src: "/media/music/my-type.mp3", title: "My Type", artist: "Saint Motel", bpm: 118, seconds: 209.3 },
  { src: "/media/music/busy-earnin.mp3", title: "Busy Earnin'", artist: "Jungle", bpm: 100, seconds: 178.3 },
  { src: "/media/music/pressure.mp3", title: "Pressure", artist: "Tensnake feat. Thabo", bpm: 122, seconds: 172.5 },
  { src: "/media/music/mess-is-mine.mp3", title: "Mess Is Mine", artist: "Vance Joy", bpm: 108, seconds: 234.5 },
];

// Shared with the interface sounds (lib/sfx.ts), which follow the speaker button: muted means silent, and the clicks sit at a fixed
// fraction of this volume.
export const MUSIC_VOLUME = 0.35;
export const MUSIC_MUTE_KEY = "music-muted";
