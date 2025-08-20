// .puppeteerrc.js - Puppeteer Konfiguration
const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // In Produktion wird @sparticuz/chromium verwendet
  // Lokale Entwicklung verwendet standard Chrome
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // Skip Download in Production (Vercel build)
  skipDownload: process.env.NODE_ENV === 'production' || process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',
};