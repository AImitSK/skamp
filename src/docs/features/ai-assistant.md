# AI Assistant - KI-Integration

## 📋 Übersicht

Der KI-Assistent nutzt Google Gemini zur intelligenten Unterstützung bei der Erstellung von Pressemeldungen. Er bietet kontextbezogene Generierung, Verbesserungsvorschläge und strukturierte Ausgaben für professionelle PR-Texte.

**Hauptzweck:** KI-gestützte Texterstellung und -optimierung für effizientere und bessere Pressemeldungen.

## ✅ Implementierte Funktionen

### Text-Generierung
- [x] **Strukturierte Pressemeldungen** generieren:
  - Headline (Überschrift)
  - Lead Paragraph (Einleitung)
  - Body Paragraphs (Haupttext)
  - Quote (Zitat mit Sprecher)
  - Boilerplate (Unternehmensbeschreibung)
- [x] **Kontext-Parameter**:
  - Branche
  - Tonalität (formal, modern, technisch, startup)
  - Zielgruppe (B2B, Consumer, Media)
- [x] **Prompt-basierte Generierung**

### Template-System
- [x] **Vordefinierte Templates**:
  - Produktankündigung
  - Strategische Partnerschaft
  - Unternehmensmeilenstein
  - Auszeichnung/Award
  - Führungswechsel
  - Forschungsergebnisse
- [x] **Template-Auswahl** im Editor
- [x] **Custom Prompts** möglich

### Integration
- [x] **Nahtlose Editor-Integration**
- [x] **Loading States** während Generierung
- [x] **Error Handling** bei API-Fehlern
- [x] **Fallback** auf manuelle Eingabe
- [x] **HTML-Formatierung** der Ausgabe

### Google Gemini API
- [x] **Gemini 1.5 Flash** Modell
- [x] **Strukturierte JSON-Ausgabe**
- [x] **Deutsche Sprachunterstützung**
- [x] **Rate Limiting** Handling
- [x] **Error Recovery**

## 🚧 In Entwicklung

- [ ] **Text-Verbesserung** (Branch: feature/ai-improve)
  - Bestehende Texte optimieren
  - Stil-Anpassungen
  - Längen-Optimierung

## ❗ Dringend benötigt

### 1. **Erweiterte KI-Features** 🔴
**Beschreibung:** Mehr KI-Unterstützung im gesamten Workflow
- **Text-Verbesserung**: Bestehende Texte überarbeiten
- **Zusammenfassungen**: Lange Texte kürzen
- **Übersetzungen**: Multi-Language Support
- **SEO-Optimierung**: Keywords und Meta-Descriptions
- **Tone-Anpassung**: Stil nachträglich ändern

**Technische Anforderungen:**
- Erweiterte Prompts
- Context-Preservation
- Batch-Processing

**Geschätzter Aufwand:** 2-3 Wochen

### 2. **Personalisierung & Learning** 🔴
**Beschreibung:** KI lernt den Firmenstil
- Analyse vergangener Pressemeldungen
- Stil-Fingerprint erstellen
- Marken-Voice Training
- Branchen-spezifische Anpassungen
- Feedback-Loop Implementation

**Geschätzter Aufwand:** 3-4 Wochen

### 3. **Content-Vorschläge** 🟡
**Beschreibung:** Proaktive Unterstützung
- Themen-Vorschläge basierend auf Trends
- Optimaler Versandzeitpunkt
- Betreffzeilen-Varianten
- Call-to-Action Empfehlungen
- Medien-Matching (welche Journalisten)

**Geschätzter Aufwand:** 2 Wochen

### 4. **Multimodale Unterstützung** 🟡
**Beschreibung:** Über Text hinaus
- Bild-Analyse für Pressematerial
- Auto-Captions für Bilder
- Infografik-Vorschläge
- Video-Transkription
- Alt-Text Generierung

**Geschätzter Aufwand:** 3 Wochen

## 💡 Nice to Have

### Erweiterte Generierung
- **Multi-Step Workflows** (Research → Outline → Draft → Final)
- **Quellenangaben** automatisch hinzufügen
- **Fakten-Checking** Integration
- **Zitat-Generierung** mit verschiedenen Sprechern
- **Interview-Simulationen** für Q&A Sections

### Analyse & Optimierung
- **Readability Scoring** (Flesch-Index)
- **Sentiment-Analyse** des generierten Textes
- **Competitor-Analyse** (ähnliche Meldungen)
- **Trend-Detection** in der Branche
- **Performance-Prediction** (wird gut ankommen?)

### Integration & Automation
- **Auto-Tagging** von Kontakten
- **Verteiler-Vorschläge** basierend auf Inhalt
- **Follow-up Generierung**
- **Social Media Adaptionen**
- **Newsletter-Versionen**

### Enterprise Features
- **Custom Model Training** auf Firmendaten
- **Private Deployment** (Vertex AI)
- **Compliance-Filter** für regulierte Branchen
- **Multi-Model Support** (GPT, Claude als Backup)
- **Audit-Trail** für generierte Inhalte

## 🔧 Technische Details

### API Integration

```typescript
// src/lib/ai/firebase-ai-service.ts
export class FirebaseAIService {
  private model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  async generatePressRelease(prompt: string): Promise<string> {
    const enhancedPrompt = this.buildStructuredPrompt(prompt);
    const result = await this.model.generateContent(enhancedPrompt);
    return this.parseStructuredResponse(result.response.text());
  }
}
```

### Prompt Engineering

```typescript
// Strukturierter Prompt für bessere Ergebnisse
const SYSTEM_PROMPT = `
Du bist ein erfahrener PR-Experte, der professionelle Pressemeldungen 
auf Deutsch verfasst. Erstelle eine strukturierte Pressemeldung mit:

1. **Headline**: Prägnante, aufmerksamkeitsstarke Überschrift
2. **Lead**: Zusammenfassung der wichtigsten Fakten (Wer, Was, Wann, Wo, Warum)
3. **Body**: 2-3 Absätze mit Details und Kontext
4. **Quote**: Aussagekräftiges Zitat einer Führungsperson
5. **Boilerplate**: Kurze Unternehmensbeschreibung

Kontext:
- Branche: {industry}
- Tonalität: {tone}
- Zielgruppe: {audience}

Ausgabe als JSON:
{
  "headline": "...",
  "leadParagraph": "...",
  "bodyParagraphs": ["...", "..."],
  "quote": {
    "text": "...",
    "person": "...",
    "role": "...",
    "company": "..."
  },
  "boilerplate": "..."
}
`;
```

### Error Handling & Fallbacks

```typescript
async function generateWithFallback(prompt: string): Promise<GenerationResult> {
  try {
    // Primärer Versuch
    return await geminiService.generate(prompt);
  } catch (error) {
    if (error.message.includes('RATE_LIMIT')) {
      // Exponential Backoff
      await delay(1000 * Math.pow(2, attempt));
      return generateWithFallback(prompt);
    }
    
    if (error.message.includes('SAFETY')) {
      // Prompt anpassen
      const sanitizedPrompt = sanitizePrompt(prompt);
      return generateWithFallback(sanitizedPrompt);
    }
    
    // Fallback auf Templates
    return getTemplateBasedFallback(prompt);
  }
}
```

### Caching & Performance

```typescript
// Response Caching für identische Prompts
const cache = new Map<string, CachedResponse>();

function getCacheKey(prompt: string, context: Context): string {
  return crypto.createHash('md5')
    .update(prompt + JSON.stringify(context))
    .digest('hex');
}

// Cache mit TTL
interface CachedResponse {
  data: GenerationResult;
  timestamp: number;
  ttl: number; // 1 Stunde
}
```

## 📊 Metriken & KPIs

- **Generierungen pro Tag/Monat**
- **Durchschnittliche Response-Zeit**
- **Error-Rate** (Safety Blocks, Timeouts)
- **Nutzung nach Template-Typ**
- **User-Zufriedenheit** (Wurde Text verwendet?)
- **Token-Verbrauch** und Kosten

## 🐛 Bekannte Probleme

1. **Rate Limiting**
   - Free Tier: 60 Requests/Minute Limit
   - Lösung: Queue-System, Retry-Logic

2. **Safety Filter**
   - Blockiert manchmal legitime Business-Inhalte
   - Lösung: Prompt-Reformulierung

3. **Inkonsistente Formatierung**
   - JSON-Parsing schlägt gelegentlich fehl
   - Lösung: Robusteres Parsing, Fallbacks

4. **Kontext-Verlust**
   - Bei Verbesserungen geht Originalkontext verloren
   - Lösung: Context-Preservation implementieren

## 🔒 Sicherheit & Datenschutz

- API-Keys sicher in Umgebungsvariablen
- Keine Speicherung sensibler Prompts
- Anonymisierung von Firmendaten in Prompts
- Rate Limiting zum Schutz vor Missbrauch
- Audit-Log für alle Generierungen
- DSGVO-konforme Datenverarbeitung

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Text-Verbesserung Feature
- Erweiterte Templates
- Besseres Error Handling

### Phase 2 (Q2 2025)
- Multi-Language Support
- Style Learning
- SEO-Optimierung

### Phase 3 (Q3 2025)
- Vertex AI Migration
- Custom Model Training
- Multimodal Features

## 📚 Weiterführende Dokumentation

- [Gemini API Docs](https://ai.google.dev/docs)
- [Prompt Engineering Guide](./prompt-engineering.md)
- [ADR-0005: Gemini Entscheidung](../adr/0005-gemini-ai.md)
- [Template Bibliothek](./ai-templates.md)