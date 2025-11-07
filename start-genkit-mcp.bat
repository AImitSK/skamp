  @echo off
  set GENKIT_ENV=dev
  set GENKIT_REFLECTION_PORT=3100
  genkit start --port 3100 -- npx tsx src/genkit-server.ts