// next.config.mjs

import nextMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hier kommen deine normalen Next.js-Einstellungen rein
  // Wichtig: pageExtensions ist im App Router nicht mehr nötig
};

const withMDX = nextMDX()

// Exportiere die mit MDX erweiterte Konfiguration
export default withMDX(nextConfig)