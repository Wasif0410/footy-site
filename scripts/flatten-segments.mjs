// After `next build`: Next.js 16 writes each page's prefetch data in nested folders
// (out/matches/oct09/__next.matches/$d$id/__PAGE__.txt) but the browser asks for it by a dotted
// name (out/matches/oct09/__next.matches.$d$id.__PAGE__.txt). Copy each file to the name asked
// for, so links prefetch instead of 404ing on any static host.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
let copied = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) flatten(dir, full);
    else walk(full);
  }
}

function flatten(routeDir, segDir) {
  const stack = [segDir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { stack.push(f); continue; }
      const dotted = path.relative(routeDir, f).split(path.sep).join(".");
      fs.copyFileSync(f, path.join(routeDir, dotted));
      copied += 1;
    }
  }
}

if (fs.existsSync(OUT)) walk(OUT);
console.log(`flatten-segments: ${copied} prefetch files copied`);
