# Ist-Analyse: Aktuelle Architektur

## Aktuelle Dateien

### 1. generate-press-release-structured.ts
**Pfad:** `src/lib/ai/flows/generate-press-release-structured.ts`
**Größe:** ~900 Zeilen
**Problem:** Monolithisch - enthält ALLES

```typescript
SYSTEM_PROMPTS = {
  base: "...",           // Grundprompt
  scoreRules: "...",     // Score-Optimierung
  exampleOptimizations,  // Beispiele
  rules: "...",          // Kritische Regeln

  tones: {               // ~250 Zeilen
    formal: "...",
    casual: "...",
    modern: "...",
    technical: "...",
    startup: "..."
  },

  audiences: {           // ~50 Zeilen
    b2b: "...",
    consumer: "...",
    media: "..."
  },

  industries: {          // ~100 Zeilen
    technology: "...",
    healthcare: "...",
    finance: "...",
    manufacturing: "...",
    retail: "...",
    automotive: "...",
    education: "..."
  }
}
```

### 2. ai-sequence.ts
**Pfad:** `src/lib/ai/prompts/ai-sequence.ts`
**Größe:** ~340 Zeilen
**Inhalt:**
- DNA-Extraktion (Tonalität, Blacklist, Pflicht-Begriffe)
- Context-Building mit 3 Ebenen
- Zielgruppen-Routing
- Zitier-Strategie

### 3. score-optimization.ts
**Pfad:** `src/lib/ai/prompts/score-optimization.ts`
**Inhalt:** Score-Regeln für PR-SEO

## Probleme der aktuellen Architektur

### 1. Prompt-Überladung
- **1200+ Zeilen** werden an die KI gesendet
- Alle Tonalitäten, alle Branchen, alle Regeln
- KI muss selbst filtern → Verwässerung

### 2. Keine klare Trennung
- Standard-Modus und Experten-Modus nicht sauber getrennt
- DNA-Synthese wird "zusätzlich" injiziert, nicht "statt"
- Tonalitäts-Bibliothek kollidiert mit DNA-Tonalität

### 3. Redundanz
- Tonalitäts-Regeln in `generate-press-release-structured.ts`
- Tonalitäts-Override in `ai-sequence.ts`
- Wer gewinnt? Unklar!

### 4. Keine Fakten-Matrix-Integration
- Project-Wizard liefert Fakten-Matrix
- Diese wird aktuell NICHT in die PM-Generierung übernommen
- Stattdessen: User muss manuell eingeben

## Aktueller Datenfluss

```
┌──────────────────────┐
│  generate-press-     │
│  release-structured  │◄─── prompt + context
│  .ts                 │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  SYSTEM_PROMPTS      │
│  (alle 900 Zeilen)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  ai-sequence.ts      │
│  (falls DNA da)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Gemini 2.5 Flash    │
└──────────────────────┘
```

## Was aktuell NICHT passiert

1. **Fakten-Matrix wird ignoriert**
   - Project-Wizard erstellt Fakten-Matrix
   - Diese wird nicht an PM-Generierung übergeben

2. **Zitatgeber nicht aus Matrix**
   - DNA hat Ansprechpartner
   - Fakten-Matrix hat "Zitatgeber für dieses Projekt"
   - PM-Generator wählt selbst → oft falsch

3. **Firmenstammdaten fehlen**
   - Name, Adresse, Website werden halluziniert
   - (wurde gerade gefixt in DNA-Synthese)

## Metriken

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Prompt-Größe (Standard) | ~1200 Zeilen | ~600 Zeilen |
| Prompt-Größe (Experte) | ~1500 Zeilen | ~400 Zeilen |
| Anzahl Dateien | 2 monolithisch | 5 modular |
| DNA-Nutzung | Optional, additiv | Pflicht, ersetzend |
