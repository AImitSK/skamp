# Genkit Integration - Wichtige Erkenntnisse & Best Practices

## Übersicht

Diese Dokumentation fasst alle wichtigen Erkenntnisse aus der Genkit-Integration für AI-Flows zusammen. Nutze diese als Vorlage für die Migration weiterer Flows.

---

## 1. Modell-Auswahl

### ❌ NICHT verwenden:
- **Gemini 1.5 Flash/Pro** → Seit 2025 RETIRED (404 Error)
- **Gemini 2.0 Flash Preview** (`gemini-2.0-flash-exp`) → Experimentell, stoppt nach ~40 Tokens

### ✅ VERWENDEN:
```typescript
// src/lib/ai/genkit-config.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()]
});

// Gemini 2.5 Flash - Stabil & Produktionsreif
export const gemini25FlashModel = googleAI.model('gemini-2.5-flash');
```

**Wichtig:** In JavaScript/TypeScript `googleAI.model('name')` verwenden, NICHT `'googleai/name'` (das ist Python-Syntax!)

---

## 2. JSON Mode vs. Structured Output

### Problem mit Structured Output:
Gemini 2.5 Flash gibt bei `output: { schema: ZodSchema }` **JSON-in-JSON** zurück (escaped Strings):

```json
{
  "name": "{\"firstName\": \"Max\", ...}",  // ❌ STRING statt Objekt
  "emails": "[{\"email\": \"...\"}]"        // ❌ STRING statt Array
}
```

### ✅ Lösung: JSON Mode + Manuelles Parsing

```typescript
// ❌ NICHT SO (Structured Output):
const result = await ai.generate({
  model: gemini25FlashModel,
  output: { schema: MergedContactSchema },
  prompt
});

// ✅ SO (JSON Mode):
const result = await ai.generate({
  model: gemini25FlashModel,
  prompt,
  config: {
    temperature: 0.5,
    maxOutputTokens: 4096,
    response_mime_type: 'application/json'  // ✅ JSON Mode aktivieren
  }
});

// Text aus Response extrahieren
const textOutput = result.message?.content?.[0]?.text || result.text?.() || JSON.stringify(result);

// Manuelles Parsing + Validierung
const parsedOutput = JSON.parse(textOutput);
const validated = MergedContactSchema.parse(parsedOutput);  // Zod Validierung

return validated;
```

**Vorteile:**
- ✅ Echtes JSON (keine escaped Strings)
- ✅ Funktioniert mit verschachtelten Objekten/Arrays
- ✅ Manuelle Zod-Validierung danach möglich
- ✅ Bessere Error-Messages

---

## 3. Zod Schema für AI-Output

### ❌ Problem: `.optional()` lehnt `null` ab

Gemini gibt für fehlende Werte `null` zurück, nicht `undefined`:

```typescript
// Gemini Output:
{
  "title": null,      // ❌ Zod mit .optional() lehnt ab
  "department": null
}
```

### ✅ Lösung: `.nullish()` verwenden

```typescript
// ❌ NICHT SO:
export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().optional(),     // Nur undefined OK
  suffix: z.string().optional()
});

// ✅ SO:
export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().nullish(),      // null UND undefined OK
  suffix: z.string().nullish()
});
```

**Regel:** Alle optionalen Felder in AI-Schemas mit `.nullish()` statt `.optional()` definieren!

---

## 4. Text Extraction aus Genkit Response

### ❌ Problem: `result.text()` existiert nicht

```typescript
// ❌ NICHT SO:
const textOutput = result.text();  // TypeError: result.text is not a function
```

### ✅ Lösung: Korrekte Struktur verwenden

```typescript
// ✅ SO:
const textOutput = result.message?.content?.[0]?.text
                || result.text?.()
                || JSON.stringify(result);
```

**Fallback-Chain:**
1. `result.message.content[0].text` (Standard bei Genkit)
2. `result.text()` (falls verfügbar)
3. `JSON.stringify(result)` (letzter Fallback)

---

## 5. Error Handling & Fallbacks

### Best Practice: Immer Fallback-Strategie

```typescript
try {
  // Genkit Flow versuchen
  const result = await ai.generate({ ... });
  const textOutput = result.message?.content?.[0]?.text;
  const parsedOutput = JSON.parse(textOutput);
  const validated = MySchema.parse(parsedOutput);

  // Validierung der Required-Felder
  if (!validated.requiredField) {
    throw new Error('Missing required field');
  }

  // Fallbacks für fehlende optionale Felder
  if (!validated.emails?.length) {
    validated.emails = fallbackData.emails;
  }

  return validated;

} catch (error) {
  console.error('❌ AI-Flow fehlgeschlagen:', error);

  // Fallback: Nutze alternative Datenquelle
  return fallbackData;
}
```

**Wichtig:**
- ✅ Immer try-catch um Genkit-Calls
- ✅ Validierung der Required-Felder
- ✅ Fallbacks für kritische optionale Felder
- ✅ Aussagekräftige Error-Logs

---

## 6. Genkit Configuration

### Zentrale Config-Datei

```typescript
// src/lib/ai/genkit-config.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * Genkit Instance mit Google AI Plugin
 * Verwendet GOOGLE_GENAI_API_KEY aus .env
 */
export const ai = genkit({
  plugins: [googleAI()]
});

// Modelle exportieren
export const gemini25FlashModel = googleAI.model('gemini-2.5-flash');
export const gemini25ProModel = googleAI.model('gemini-2.5-pro');

// Type-Helpers
export type { GenerateOptions } from 'genkit';
```

### Environment Variable

```env
# .env.local
GOOGLE_GENAI_API_KEY=your-api-key-here
```

**Wichtig:** Genkit nutzt automatisch `GOOGLE_GENAI_API_KEY` wenn verfügbar!

---

## 7. Prompt Engineering für Merging

### Best Practices

```typescript
const prompt = `Merge ${variants.length} Kontakte zu EINEM optimalen Kontakt.

INPUT - Kontakte zum Mergen:
${JSON.stringify(contactDataOnly, null, 2)}

AUFGABE: Erstelle EIN gemergtes Contact-Objekt mit dieser EXAKTEN Struktur:

{
  "name": { "firstName": "...", "lastName": "...", "title": null },
  "displayName": "Vorname Nachname",
  "emails": [{ "email": "...", "type": "business", "isPrimary": true }],
  ...
}

MERGE-REGELN:
- NAME: Vollständigste Form (mit title falls vorhanden)
- EMAILS: ALLE aus ALLEN Kontakten sammeln (dedupliziert)
- BEATS: ALLE aus ALLEN Kontakten sammeln (dedupliziert)

KRITISCH: Antworte NUR mit einem Objekt dieser Struktur. KEIN Array! KEINE zusätzlichen Felder!`;
```

**Tipps:**
- ✅ Output-Template im Prompt zeigen (mit exakter Struktur)
- ✅ Explizit "ALLE" betonen bei Arrays
- ✅ Warnung: "KEIN Array! KEINE zusätzlichen Felder!"
- ✅ Nur relevante Daten im Input (nicht ganze Variant-Objekte)

---

## 8. API Route Pattern

### Server-Side AI-Calls

```typescript
// src/app/api/ai/my-flow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { myFlow } from '@/lib/ai/flows/my-flow';

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    // Flow aufrufen (läuft server-side)
    const result = await myFlow({ input });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ AI Flow Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### Client-Side Call

```typescript
// Client Component
const response = await fetch('/api/ai/my-flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: data })
});

const result = await response.json();
```

**Wichtig:**
- ✅ Genkit-Code IMMER server-side (API Routes)
- ✅ Client ruft API Route auf
- ✅ Kein direkter Genkit-Import in Client-Komponenten

---

## 9. Webpack Config (Next.js)

### Problem: Node.js Module im Client-Bundle

Genkit nutzt Node.js-Module (`fs`, `net`, `http2`) die nicht im Browser laufen.

### ✅ Lösung: Webpack Externals

```javascript
// next.config.mjs
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-Bundle: Externalize Node.js native modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        child_process: false,
      };

      // Externalize Genkit packages
      config.externals = config.externals || [];
      config.externals.push({
        '@google/generative-ai': 'commonjs @google/generative-ai',
        '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
        '@genkit-ai/core': 'commonjs @genkit-ai/core',
        'genkit': 'commonjs genkit',
        '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
        '@opentelemetry/exporter-trace-otlp-grpc': 'commonjs @opentelemetry/exporter-trace-otlp-grpc',
      });
    }

    return config;
  },
};
```

---

## 10. Genkit Developer UI (Local Testing)

### Lokales Testen mit Genkit UI

```bash
# Terminal: Dev-Server mit Genkit starten
npx genkit start -- npm run dev
```

- **Next.js:** http://localhost:3000
- **Genkit UI:** http://localhost:4000

### Im Genkit UI:
1. Flow auswählen
2. Test-Input eingeben
3. "Run Flow" klicken
4. Output + Logs + Traces sehen

**Vorteile:**
- ✅ Schneller als Deploy
- ✅ Live Logs
- ✅ Traces visualisiert
- ✅ Iteratives Testing

---

## 11. Häufige Fehler & Lösungen

### 404 Not Found - Model existiert nicht
```
Error: models/gemini-1.5-flash is not found
```
**Lösung:** Gemini 1.5 ist retired, nutze 2.5!

### TypeError: result.text is not a function
```
TypeError: result.text is not a function
```
**Lösung:** `result.message?.content?.[0]?.text` verwenden!

### ZodError: Invalid input (null)
```
ZodError: expected: "string", received: null
```
**Lösung:** `.optional()` → `.nullish()` im Schema!

### JSON-in-JSON (escaped Strings)
```json
{ "emails": "[{\"email\": \"...\"}]" }
```
**Lösung:** JSON Mode statt Structured Output!

### Build Error: Module not found (fs, net, http2)
```
Module not found: Can't resolve 'fs'
```
**Lösung:** Webpack externals konfigurieren!

---

## 12. Checklist für neue Flows

- [ ] Gemini 2.5 Flash Model verwenden
- [ ] JSON Mode aktiviert (`response_mime_type: 'application/json'`)
- [ ] Korrekte Text Extraction (`result.message?.content?.[0]?.text`)
- [ ] Manuelles JSON.parse() + Zod Validierung
- [ ] Alle optionalen Felder mit `.nullish()`
- [ ] Output-Template im Prompt zeigen
- [ ] Try-catch + Fallback-Strategie
- [ ] API Route (server-side)
- [ ] Error-Handling implementiert
- [ ] Lokales Testen mit Genkit UI

---

## 13. Performance & Kosten

### Temperature & Token Settings

```typescript
config: {
  temperature: 0.5,        // 0.0-1.0 (höher = kreativer)
  maxOutputTokens: 4096,   // Max Output-Länge
  topP: 0.95              // Nucleus Sampling
}
```

**Empfehlungen:**
- **Merge/Extraction:** temperature: 0.3-0.5 (deterministischer)
- **Content Generation:** temperature: 0.7-0.9 (kreativer)
- **maxOutputTokens:** Mind. 4096 für komplexe Outputs

### Kosten-Optimierung

- ✅ Prompt kurz halten (weniger Input-Tokens)
- ✅ Gemini 2.5 Flash nutzen (günstiger als Pro)
- ✅ Caching implementieren wo möglich
- ✅ Fallback auf mechanisches Merge bei Fehlern

---

## 14. Zusammenfassung - Quick Start Template

```typescript
// 1. Model definieren
import { ai } from '@/lib/ai/genkit-config';
import { googleAI } from '@genkit-ai/googleai';
const model = googleAI.model('gemini-2.5-flash');

// 2. Schema definieren
const OutputSchema = z.object({
  field1: z.string(),
  field2: z.string().nullish(),  // ✅ .nullish() für optional!
  field3: z.array(z.string()).nullish()
});

// 3. Flow implementieren
export async function myFlow(input: any) {
  try {
    // Output-Template im Prompt zeigen
    const prompt = `Task beschreibung...

    OUTPUT-STRUKTUR:
    { "field1": "...", "field2": null, "field3": [...] }

    INPUT:
    ${JSON.stringify(input, null, 2)}`;

    // Generate mit JSON Mode
    const result = await ai.generate({
      model,
      prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        response_mime_type: 'application/json'
      }
    });

    // Text extrahieren
    const text = result.message?.content?.[0]?.text
              || result.text?.()
              || JSON.stringify(result);

    // Parse + Validate
    const parsed = JSON.parse(text);
    const validated = OutputSchema.parse(parsed);

    // Fallbacks für kritische Felder
    if (!validated.field1) {
      throw new Error('Missing required field');
    }

    return validated;

  } catch (error) {
    console.error('Flow failed:', error);
    // Fallback-Logik
    throw error;
  }
}
```

---

## Weiterführende Links

- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Zod Documentation](https://zod.dev)

---

**Stand:** Oktober 2025
**Projekt:** SKAMP - CeleroPress
**Autor:** Claude Code 🤖
