import type { NextConfig } from "next";

// A fully static site: `next build` writes plain files to out/, which Vercel (or any host) serves.
// The data is seeded from the local Footy Analyzer (`footy export-site`), so nothing runs server-side.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default config;
