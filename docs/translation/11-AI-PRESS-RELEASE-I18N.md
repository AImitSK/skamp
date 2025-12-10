# KI-Assistent Internationalisierung

**Status:** Konzept
**Priorität:** Hoch (Kernfunktion)
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

Dieser Leitfaden beschreibt die notwendigen Anpassungen am KI-Assistenten für Pressemeldungen, damit dieser auch englische Pressemeldungen generieren kann.

---

## Betroffene Bereiche

### 1. KI-Pressemeldungs-Generierung

Die KI sollte basierend auf der Zielsprache der Pressemeldung arbeiten:

| Aspekt | Aktuell | Ziel |
|--------|---------|------|
| Generierungssprache | Immer Deutsch | Basierend auf Projekt-Sprache |
| SEO-Empfehlungen | Deutsch | Sprachabhängig |
| Headline-Vorschläge | Deutsch | Sprachabhängig |

### 2. KI-Editor-Funktionen

Die inline KI-Funktionen (Verbessern, Kürzen, etc.) müssen die Sprache des Textes erkennen und respektieren.

### 3. SEO-Analyse

SEO-Empfehlungen sollten sprachspezifisch sein (andere Keywords, andere Lesbarkeits-Formeln).

---

## Betroffene Dateien

### Hauptkomponenten

| Datei | Beschreibung | Änderungsaufwand |
|-------|--------------|------------------|
| `src/components/pr/ai/StructuredGenerationModal.tsx` | Hauptmodal für KI-Generierung | Mittel |
| `src/components/pr/AiAssistantModal.tsx` | Legacy KI-Modal | Niedrig (wird ersetzt) |
| `src/components/pr/ai/HeadlineGenerator.tsx` | Headline-Generierung | Mittel |
| `src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx` | SEO-Analyse Dashboard | Mittel |

### Genkit Flows (Backend)

| Datei | Beschreibung | Änderungsaufwand |
|-------|--------------|------------------|
| `src/lib/ai/flows/generate-press-release-structured.ts` | Pressemeldungs-Generierung | Hoch |
| `src/lib/ai/flows/generate-headlines.ts` | Headline-Generierung | Mittel |
| `src/lib/ai/flows/analyze-keyword-seo.ts` | SEO-Analyse | Mittel |

### Services

| Datei | Beschreibung | Änderungsaufwand |
|-------|--------------|------------------|
| `src/lib/ai/firebase-ai-service.ts` | API-Service für KI | Niedrig |
| `src/lib/ai/seo-keyword-service.ts` | SEO-Keyword-Analyse | Hoch |

---

## Implementierungsplan

### Phase 1: Sprach-Parameter hinzufügen

#### 1.1 Schemas erweitern

**Datei:** `src/lib/ai/schemas/press-release-structured-schemas.ts`

```typescript
// Hinzufügen
targetLanguage: z.enum(['de', 'en']).default('de').describe('Zielsprache der Pressemeldung')
```

#### 1.2 Flow-Input erweitern

**Datei:** `src/lib/ai/flows/generate-press-release-structured.ts`

- `targetLanguage` Parameter zum Input hinzufügen
- Prompt dynamisch basierend auf Sprache generieren
- Sprachspezifische Ton-Prompts

### Phase 2: Prompts internationalisieren

#### 2.1 Pressemeldungs-Generierung

**Aktueller Prompt (Auszug):**
```
Du bist ein erfahrener PR-Experte und Pressesprecher...
Schreibe eine professionelle Pressemitteilung auf Deutsch...
```

**Neuer Prompt (mit Sprach-Switch):**
```typescript
const getSystemPrompt = (language: 'de' | 'en') => {
  if (language === 'en') {
    return `You are an experienced PR expert and press spokesperson...
    Write a professional press release in English...`;
  }
  return `Du bist ein erfahrener PR-Experte und Pressesprecher...
  Schreibe eine professionelle Pressemitteilung auf Deutsch...`;
};
```

#### 2.2 Headline-Generierung

**Datei:** `src/lib/ai/flows/generate-headlines.ts`

```typescript
const getHeadlinePrompt = (language: 'de' | 'en') => {
  if (language === 'en') {
    return {
      styles: ['Factual-Direct', 'Benefit-Oriented', 'Context-Rich'],
      instructions: 'Generate 3 alternative headlines in English...',
      constraints: '40-75 characters, active verbs, SEO-optimized'
    };
  }
  return {
    styles: ['Faktisch-Direkt', 'Nutzen-Orientiert', 'Kontext-Reich'],
    instructions: 'Generiere 3 alternative Headlines auf Deutsch...',
    constraints: '40-75 Zeichen, aktive Verben, SEO-optimiert'
  };
};
```

### Phase 3: SEO-Analyse internationalisieren

#### 3.1 Lesbarkeits-Formeln anpassen

**Datei:** `src/lib/ai/seo-keyword-service.ts`

```typescript
// Aktuell: Deutsche Flesch-Formel
const calculateReadability = (text: string, language: 'de' | 'en') => {
  if (language === 'en') {
    // Flesch Reading Ease (English)
    // Score = 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
    return calculateEnglishFleschScore(text);
  }
  // Deutsche Flesch-Formel (bestehend)
  return calculateGermanFleschScore(text);
};
```

#### 3.2 Keyword-Empfehlungen sprachspezifisch

```typescript
const getSEORecommendations = (language: 'de' | 'en') => {
  if (language === 'en') {
    return {
      minKeywordDensity: 1.0,
      maxKeywordDensity: 2.5,
      recommendations: [
        'Use keywords in the headline',
        'Include keywords in the first paragraph',
        'Maintain natural keyword density'
      ]
    };
  }
  return {
    minKeywordDensity: 1.0,
    maxKeywordDensity: 2.5,
    recommendations: [
      'Keywords in der Headline verwenden',
      'Keywords im ersten Absatz einbauen',
      'Natürliche Keyword-Dichte beibehalten'
    ]
  };
};
```

### Phase 4: UI-Anpassungen

#### 4.1 StructuredGenerationModal

**Datei:** `src/components/pr/ai/StructuredGenerationModal.tsx`

- Sprach-Selector im Kontext-Setup-Schritt hinzufügen
- Sprache an API weiterreichen
- Labels basierend auf Zielsprache anpassen

```typescript
// Im ContextSetupStep
<Select
  label={t('targetLanguage')}
  value={context.targetLanguage}
  onChange={(value) => setContext({ ...context, targetLanguage: value })}
>
  <Option value="de">Deutsch</Option>
  <Option value="en">English</Option>
</Select>
```

#### 4.2 PRSEOHeaderBar

**Datei:** `src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx`

- Sprach-Info anzeigen
- SEO-Empfehlungen basierend auf Sprache

---

## Datenmodell-Erweiterungen

### PRCampaign erweitern

```typescript
interface PRCampaign {
  // ... bestehende Felder
  language?: 'de' | 'en';  // Sprache der Pressemeldung
}
```

### GenerationRequest erweitern

```typescript
interface GenerationRequest {
  // ... bestehende Felder
  targetLanguage: 'de' | 'en';
}
```

---

## API-Änderungen

### POST /api/ai/generate

**Request Body erweitern:**
```typescript
{
  prompt: string;
  mode: 'generate' | 'improve';
  context: {
    industry: string;
    tone: string;
    audience: string;
    targetLanguage: 'de' | 'en';  // NEU
  };
}
```

---

## Test-Szenarien

### 1. Deutsche Pressemeldung generieren
- [ ] Prompt auf Deutsch
- [ ] Output auf Deutsch
- [ ] SEO-Empfehlungen auf Deutsch

### 2. Englische Pressemeldung generieren
- [ ] Prompt auf Englisch
- [ ] Output auf Englisch
- [ ] SEO-Empfehlungen auf Englisch

### 3. Headline-Generierung
- [ ] Deutsche Headlines für deutsche PM
- [ ] Englische Headlines für englische PM

### 4. SEO-Analyse
- [ ] Deutsche Lesbarkeits-Analyse
- [ ] Englische Lesbarkeits-Analyse
- [ ] Korrekte Keyword-Empfehlungen pro Sprache

---

## Migrations-Strategie

1. **Backward Compatibility:** Default auf 'de' wenn nicht angegeben
2. **Schrittweise Einführung:** Erst Generierung, dann SEO, dann Editor-Funktionen
3. **Feature Flag:** Optional hinter Feature-Flag für Beta-Test

---

## Aufwandsschätzung

| Komponente | Aufwand | Priorität |
|------------|---------|-----------|
| Schema-Erweiterung | 2h | Hoch |
| Prompt-Internationalisierung | 8h | Hoch |
| SEO-Service Anpassung | 6h | Mittel |
| UI-Anpassungen | 4h | Mittel |
| Tests | 4h | Hoch |
| **Gesamt** | **~24h** | |

---

## Abhängigkeiten

- Bestehende KI-Übersetzungsfunktion (Phase 2 - bereits implementiert)
- next-intl für UI-Texte
- Projekt-Sprache muss in PRCampaign gespeichert werden

---

## Offene Fragen

1. **Soll die Sprache pro Projekt oder pro Kampagne gesetzt werden?**
   - Empfehlung: Pro Kampagne, da flexibler

2. **Sollen bestehende deutsche Prompts als Fallback dienen?**
   - Empfehlung: Ja, für Abwärtskompatibilität

3. **Wie wird die Sprache bei Import/Export behandelt?**
   - Muss in Export-Format berücksichtigt werden

