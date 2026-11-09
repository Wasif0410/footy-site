// The squad screen's pitch, as the football game draws it: our half seen from behind our goal, in perspective,
// with the far half fading into the stadium. Drawn from a real pitch's measurements (68 m wide, 105 m long) and
// projected; everything comes out in % of the pitch area (an SVG with viewBox 0 0 100 100 stretched over it).
//
// A view: y0 and y1 are where the halfway line and our goal line sit (% from the top), hw0 is half the pitch's
// width at the halfway line (% of the width), r is how much wider the goal line is than the halfway line, and
// vMin is how far into their half the drawing runs (in half-pitch lengths, so -0.35 is about 18 m).
export type PitchView = { y0: number; y1: number; hw0: number; r: number; vMin: number };

export const WIDE_PITCH: PitchView = { y0: 27, y1: 99, hw0: 26, r: 1.95, vMin: -0.35 };
export const TALL_PITCH: PitchView = { y0: 18, y1: 99, hw0: 38, r: 1.3, vMin: -0.15 };

export type PitchDrawing = {
  stripes: { points: string; dark: boolean }[];   // mowing bands, across the pitch
  lines: string;                                   // every white line, one path
  fadeFrom: number; fadeTo: number;                 // the far half fades in between these heights
};

const W = 68;            // width, metres
const HALF = 52.5;       // half the length, metres
const BAND = HALF / 6;   // mowing band, metres

export function pitchDrawing(p: PitchView): PitchDrawing {
  const a = (p.y1 - p.y0) / (p.r - 1);
  const yh = p.y0 - a;                             // the horizon
  const k = 1 - 1 / p.r;
  // metres across from the left touchline, and from the halfway line towards our goal
  const at = (across: number, fromHalf: number): [number, number] => {
    const t = 1 / (1 - (fromHalf / HALF) * k);
    return [50 + (across / W - 0.5) * 2 * p.hw0 * t, yh + a * t];
  };
  const f = (n: number) => String(Math.round(n * 100) / 100);
  const pt = ([x, y]: [number, number]) => `${f(x)} ${f(y)}`;
  const path = (pts: [number, number][]) => `M${pts.map(pt).join("L")}`;
  const seg = (x1: number, d1: number, x2: number, d2: number) => path([at(x1, d1), at(x2, d2)]);
  const rect = (x1: number, d1: number, x2: number, d2: number) => `${path([at(x1, d1), at(x2, d1), at(x2, d2), at(x1, d2)])}Z`;
  const arc = (cx: number, cd: number, r: number, from: number, to: number, n: number) =>
    path(Array.from({ length: n + 1 }, (_, i) => {
      const th = from + ((to - from) * i) / n;
      return at(cx + r * Math.cos(th), cd + r * Math.sin(th));
    }));

  const dMin = p.vMin * HALF;
  const cx = W / 2;
  const lines = [
    seg(0, dMin, 0, HALF), seg(W, dMin, W, HALF),             // touchlines
    seg(0, HALF, W, HALF),                                     // our goal line
    seg(0, 0, W, 0),                                           // halfway line
    arc(cx, 0, 9.15, 0, 2 * Math.PI, 96),                      // centre circle
    arc(cx, 0, 0.35, 0, 2 * Math.PI, 12),                      // centre spot
    rect(cx - 20.16, HALF - 16.5, cx + 20.16, HALF),           // penalty area
    rect(cx - 9.16, HALF - 5.5, cx + 9.16, HALF),              // goal area
    arc(cx, HALF - 11, 0.3, 0, 2 * Math.PI, 12),               // penalty spot
    arc(cx, HALF - 11, 9.15, Math.PI + 0.6435, 2 * Math.PI - 0.6435, 40),   // the D: the part outside the area
  ].join("");

  // mowing bands from the far end of the drawing to just past our goal line, a little wider than the touchlines
  const stripes: PitchDrawing["stripes"] = [];
  for (let i = Math.floor(dMin / BAND); i * BAND < HALF + BAND; i++) {
    const d1 = Math.max(i * BAND, dMin), d2 = (i + 1) * BAND;
    stripes.push({ points: [at(-9, d1), at(W + 9, d1), at(W + 9, d2), at(-9, d2)].map(pt).join(" "), dark: i % 2 !== 0 });
  }
  return { stripes, lines, fadeFrom: at(0, dMin)[1], fadeTo: p.y0 + 3 };
}
