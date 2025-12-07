# KI-Übersetzung für Projekte

**Status:** Konzept
**Priorität:** 2 (Quick Win)
**Sprachen:** Beliebig (keine Begrenzung)

---

## Ziel

Wenn eine Pressemitteilung fertig ist, kann per Knopfdruck eine KI-Übersetzung in beliebige Sprachen generiert werden. Diese wird im Projekt gespeichert und kann beim Versand ausgewählt werden.

---

## User Story

> Als PR-Manager möchte ich meine fertige deutsche Pressemitteilung
> mit einem Klick ins Englische übersetzen lassen, damit ich sie
> an internationale Medien versenden kann.

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Pressemitteilung fertig (DE)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Button: "Übersetzung erstellen"                             │
│     → Sprache auswählen (EN, FR, ES, ...)                       │
│     → Glossar wird automatisch angewendet                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. KI generiert Übersetzung (Genkit Flow)                      │
│     → Fachbegriffe aus Glossar werden respektiert               │
│     → Formatierung bleibt erhalten (HTML)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Übersetzung wird im Projekt gespeichert                     │
│     → Status: "generated"                                        │
│     → Optional: Review durch User                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Versand-Modal                                                │
│     → Auswahl: Welche Sprachen mitsenden?                       │
│     → PDF-Format: Separat oder kombiniert?                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Datenmodell

### Projekt-Übersetzung
```typescript
interface ProjectTranslation {
  id: string;
  projectId: string;
  campaignId: string;

  // Sprache
  language: LanguageCode;           // 'en', 'fr', 'es', ...

  // Inhalt
  content: string;                  // Übersetzter HTML-Content
  title?: string;                   // Übersetzter Titel

  // Status
  status: 'generating' | 'generated' | 'reviewed' | 'approved';

  // Metadaten
  generatedAt: Timestamp;
  generatedBy: 'ai';                // Immer AI für diese Phase
  modelUsed?: string;               // z.B. 'gemini-1.5-pro'

  // Review (optional)
  reviewedBy?: string;
  reviewedAt?: Timestamp;

  // Glossar-Tracking
  glossaryEntriesUsed: string[];    // IDs der verwendeten Einträge

  // Versionierung
  sourceVersion: number;            // Version der Original-PM bei Erstellung
  isOutdated: boolean;              // true wenn Original geändert wurde
}
```

### Firestore Collection
```
organizations/{orgId}/projects/{projectId}/translations/{translationId}
```

---

## Genkit Flow

### Flow: translatePressRelease
```typescript
const translatePressReleaseFlow = ai.defineFlow(
  {
    name: 'translatePressRelease',
    inputSchema: z.object({
      content: z.string(),              // HTML Content
      title: z.string(),
      sourceLanguage: z.string(),       // 'de'
      targetLanguage: z.string(),       // 'en'
      glossaryEntries: z.array(z.object({
        source: z.string(),
        target: z.string(),
        context: z.string().optional()
      })).optional(),
      preserveFormatting: z.boolean().default(true)
    }),
    outputSchema: z.object({
      translatedContent: z.string(),
      translatedTitle: z.string(),
      glossaryUsed: z.array(z.string()),
      confidence: z.number()            // 0-1
    })
  },
  async (input) => {
    // 1. Glossar-Kontext aufbauen
    // 2. Prompt mit Formatierungs-Anweisungen
    // 3. KI-Übersetzung
    // 4. Validierung
  }
);
```

### Prompt-Strategie
```
Du bist ein professioneller Übersetzer für Pressemitteilungen.

FACHBEGRIFFE (MÜSSEN exakt so übersetzt werden):
- "Spannwelle" → "Air Shaft"
- "Druckmaschine" → "Printing Press"
...

ANWEISUNGEN:
1. Behalte die HTML-Formatierung exakt bei
2. Übersetze nur den Text, nicht die HTML-Tags
3. Behalte Eigennamen (Firmennamen, Produktnamen) unverändert
4. Verwende formellen Geschäftston
5. Behalte Absatzstruktur bei

QUELLTEXT (Deutsch):
{content}

Übersetze ins {targetLanguage}.
```

---

## UI-Komponenten

### 1. Übersetzungs-Button (in Kampagnen-Ansicht)
```
┌─────────────────────────────────────────┐
│  Pressemitteilung                       │
│  ─────────────────────────────────────  │
│  Status: ✅ Freigegeben                 │
│                                         │
│  Übersetzungen:                         │
│  🇬🇧 Englisch    [Generiert 05.12.]    │
│  🇫🇷 Französisch [+ Erstellen]         │
│                                         │
│  [+ Neue Übersetzung]                   │
└─────────────────────────────────────────┘
```

### 2. Übersetzungs-Modal
```
┌─────────────────────────────────────────┐
│  Übersetzung erstellen                  │
│  ─────────────────────────────────────  │
│                                         │
│  Zielsprache:                           │
│  [Englisch              ▼]              │
│                                         │
│  ☑ Glossar anwenden (12 Einträge)      │
│                                         │
│  [Abbrechen]     [🤖 Übersetzen]       │
└─────────────────────────────────────────┘
```

### 3. Versand-Modal Erweiterung
```
┌─────────────────────────────────────────┐
│  Versand-Optionen                       │
│  ─────────────────────────────────────  │
│                                         │
│  Sprachen:                              │
│  ☑ 🇩🇪 Deutsch (Original)              │
│  ☑ 🇬🇧 Englisch (05.12., generiert)    │
│  ☐ 🇫🇷 Französisch (nicht verfügbar)   │
│                                         │
│  PDF-Format:                            │
│  ○ Separate PDFs pro Sprache            │
│  ● Kombiniertes PDF (DE + EN)           │
│                                         │
│  [Versenden]                            │
└─────────────────────────────────────────┘
```

---

## PDF-Generierung

### Option 1: Separate PDFs
- Jede Sprache als eigenes PDF
- Einfacher zu implementieren
- Empfänger wählt selbst

### Option 2: Kombiniertes PDF
- Ein PDF mit Sprachtrennern
- Professioneller Look
- Erfordert PDF-Service Anpassung

```
┌─────────────────────────────────────────┐
│  PRESSEMITTEILUNG                       │
│  ═══════════════════════════════════════│
│                                         │
│  [Deutscher Inhalt]                     │
│                                         │
│  ───────────────────────────────────────│
│  PRESS RELEASE (English Version)        │
│  ───────────────────────────────────────│
│                                         │
│  [English Content]                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Outdated-Erkennung

Wenn das Original geändert wird:
1. Alle Übersetzungen werden als `isOutdated: true` markiert
2. UI zeigt Warnung: "⚠️ Original wurde geändert"
3. Button: "Neu übersetzen" oder "Als aktuell markieren"

---

## Implementierungs-Schritte

1. [ ] Datenmodell: `ProjectTranslation` Collection anlegen
2. [ ] Genkit Flow: `translatePressRelease` implementieren
3. [ ] UI: Übersetzungs-Button in Kampagnen-Ansicht
4. [ ] UI: Übersetzungs-Modal
5. [ ] UI: Versand-Modal Erweiterung
6. [ ] Service: PDF-Generierung für kombinierte PDFs
7. [ ] Feature: Outdated-Erkennung

---

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| KI-Übersetzung fehlerhaft | Glossar für Fachbegriffe + Review-Option |
| HTML-Formatierung geht verloren | Strenge Prompt-Anweisungen + Validierung |
| Kosten bei vielen Übersetzungen | Token-Tracking, ggf. Limits pro Org |
| Lange Generierungszeit | Async mit Status-Anzeige |
