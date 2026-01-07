# Ziel-Architektur: Modulare Prompt-Engine

## Grundprinzip

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE ENGINE (Shared)                         │
│  - JSON-Output-Schema                                            │
│  - Parsing-Regeln                                                │
│  - Basis-Struktur (Headline, Lead, Body, Zitat, CTA)            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    STANDARD-MODUS       │     │    EXPERTEN-MODUS       │
│    (Keine DNA)          │     │    (DNA + Fakten)       │
├─────────────────────────┤     ├─────────────────────────┤
│ • Branchenbibliothek    │     │ • DNA-Synthese          │
│ • Tonalitätsbibliothek  │     │ • Fakten-Matrix         │
│ • Generische Beispiele  │     │ • Spezifische Daten     │
│                         │     │                         │
│ ~600 Zeilen Prompt      │     │ ~400 Zeilen Prompt      │
└─────────────────────────┘     └─────────────────────────┘
```

## Datei-Struktur (NEU)

```
src/lib/ai/prompts/
├── press-release/
│   ├── core-engine.ts              # Shared: Output-Schema, Parsing-Anker
│   ├── press-release-craftsmanship.ts  # Shared: Universelle journalistische Standards ← NEU
│   ├── standard-library.ts         # NUR Standard: Branchen + Tonalitäten
│   └── expert-builder.ts           # NUR Experte: DNA + Fakten-Matrix
│
├── ai-sequence.ts                  # Context-Builder (bleibt, wird erweitert)
└── score-optimization.ts           # Score-Regeln (bleibt)

src/lib/ai/flows/
├── generate-press-release-structured.ts  # Nur noch Orchestrierung
└── generate-press-release-template.ts    # NEU: Vorlage aus Strategie
```

## Modul-Definitionen

### 1. core-engine.ts (~100 Zeilen)
**Zweck:** Technisches Skelett - Output-Format und Parsing-Anker.

### 1.5. press-release-craftsmanship.ts (~150 Zeilen) ← NEU
**Zweck:** Universelle journalistische Standards, die in BEIDEN Modi geladen werden.
- Lead beginnt mit Ort und Datum
- Zitate stehen in eigenen Absätzen
- Headline-Länge, Aktive Verben
- SEO-Grundregeln

### 2. (alt: base-rules.ts wird in craftsmanship.ts integriert)
```typescript
export const CORE_ENGINE = {
  // Output-Schema (für JSON-Parsing)
  outputSchema: `
    Antworte mit folgendem Format:
    HEADLINE: [40-75 Zeichen]
    LEAD: [80-200 Zeichen, 5 W-Fragen]
    BODY_1: [150-400 Zeichen]
    BODY_2: [150-400 Zeichen]
    BODY_3: [150-400 Zeichen]
    QUOTE: "[Zitat]", sagt [Name], [Position] bei [Firma].
    CTA: [[CTA: Handlungsaufforderung]]
    HASHTAGS: [[HASHTAGS: #Tag1 #Tag2 #Tag3]]
  `,

  // Parsing-Regeln (wie bisher)
  parsingRules: "...",

  // Struktur-Vorgaben
  structure: "..."
};
```

### 2. base-rules.ts (~100 Zeilen)
```typescript
export const BASE_RULES = {
  headline: {
    minLength: 40,
    maxLength: 75,
    rules: [
      "Aktive Verben verwenden",
      "Keywords früh platzieren",
      "Keine Übertreibungen"
    ]
  },
  lead: {
    minLength: 80,
    maxLength: 200,
    rules: ["5 W-Fragen beantworten"]
  },
  quote: {
    minWords: 20,
    maxWords: 35,
    rules: ["Vollständige Attribution"]
  },
  // ...
};
```

### 3. standard-library.ts (~500 Zeilen)
```typescript
// NUR geladen wenn KEINE DNA vorhanden
export const STANDARD_LIBRARY = {
  tones: {
    formal: "...",
    casual: "...",
    modern: "...",
    technical: "...",
    startup: "..."
  },
  industries: {
    technology: "...",
    healthcare: "...",
    // ...
  },
  audiences: {
    b2b: "...",
    consumer: "...",
    media: "..."
  }
};
```

### 4. expert-builder.ts (~200 Zeilen)
```typescript
// Baut den Experten-Prompt aus DNA + Fakten
export function buildExpertPrompt(
  dnaSynthese: string,
  faktenMatrix: FaktenMatrix,
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3'
): string {
  // 1. Extrahiere nur relevante DNA-Teile
  const tonality = extractTonalityOverride(dnaSynthese);
  const blacklist = extractBlacklist(dnaSynthese);
  const keyMessages = extractKeyMessagesForTargetGroup(dnaSynthese, targetGroup);
  const spokesperson = faktenMatrix.zitatgeber;

  // 2. Baue fokussierten Prompt
  return `
    TONALITÄT (PRIORITÄT 1): ${tonality}

    FAKTEN FÜR DIESE MELDUNG:
    - Was: ${faktenMatrix.wasUndWer}
    - Wann/Wo: ${faktenMatrix.wannUndWo}
    - Delta: ${faktenMatrix.delta}
    - Beweis: ${faktenMatrix.beweisDaten}

    ZITATGEBER (FEST):
    ${spokesperson.name}, ${spokesperson.position}
    Kern-Aussage: ${spokesperson.kernAussage}

    BLACKLIST (HARD CONSTRAINT):
    ${blacklist}
  `;
}
```

## Entscheidungslogik

```typescript
function selectPromptMode(context: GenerationContext): 'standard' | 'expert' {
  // Experten-Modus NUR wenn beides vorhanden
  if (context.dnaSynthese && context.faktenMatrix) {
    return 'expert';
  }
  return 'standard';
}

function buildFullPrompt(context: GenerationContext): string {
  const mode = selectPromptMode(context);

  let prompt = CORE_ENGINE.outputSchema;
  prompt += BASE_RULES.toPrompt();

  if (mode === 'expert') {
    // DNA ersetzt Bibliothek
    prompt += buildExpertPrompt(
      context.dnaSynthese,
      context.faktenMatrix,
      context.targetGroup
    );
  } else {
    // Standard-Bibliothek laden
    prompt += STANDARD_LIBRARY.getTone(context.tone);
    prompt += STANDARD_LIBRARY.getIndustry(context.industry);
    prompt += STANDARD_LIBRARY.getAudience(context.audience);
  }

  return prompt;
}
```

## Vorteile

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Prompt-Größe | 1200+ Zeilen immer | 400-600 Zeilen je nach Modus |
| Klarheit | Alles gemischt | Klare Trennung |
| DNA-Nutzung | Additiv (Konflikt) | Ersetzend (Dominanz) |
| Fakten-Matrix | Ignoriert | Voll integriert |
| Zitatgeber | KI wählt | Aus Matrix vorgegeben |
| Wartbarkeit | 1 Riesen-Datei | 5 fokussierte Module |
