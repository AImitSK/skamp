// src/genkit-loader.js
// Lädt dotenv mit .env.local BEVOR andere Module importiert werden
require('dotenv').config({ path: '.env.local' });
