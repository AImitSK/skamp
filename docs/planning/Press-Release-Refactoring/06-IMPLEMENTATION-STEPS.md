# Implementierungsschritte

## Übersicht

| Phase | Fokus | Geschätzte Dateien |
|-------|-------|-------------------|
| 1 | Fakten-Matrix Typen & Schema | 3 Dateien |
| 2 | Project-Wizard Sidebar speichern | 2 Dateien |
| 3 | Prompt-Module erstellen | 4 Dateien |
| 4 | PM-Vorlage Flow | 3 Dateien |
| 5 | UI: Strategie-Tab erweitern | 4 Dateien |
| 6 | UI: Profi-Modus entfernen | 3 Dateien |
| 7 | Integration & Testing | 2 Dateien |

---

## Phase 1: Fakten-Matrix Typen & Schema

### Ziel
Strukturierte TypeScript-Typen für die Fakten-Matrix definieren.

### Dateien

#### 1.1 `src/types/fakten-matrix.ts` (NEU)
```typescript
import { Timestamp } from 'firebase/firestore';

/**
 * OPTIMIERTES FaktenMatrix Interface
 *
 * Änderungen gegenüber ursprünglichem Entwurf:
 * - speakerId statt vollständigem Zitatgeber-Objekt (Referenz auf DNA-Kontakt)
 * - Strukturiert für JSON-Output vom Wizard (kein Regex-Parsing!)
 * - Klare Trennung: hook (W-Fragen), details (Substanz), quote (O-Ton)
 */
export interface FaktenMatrix {
  hook: {
    event: string;      // Was passiert genau?
    location: string;   // Ort des Geschehens
    date: string;       // Zeitpunkt
  };
  details: {
    delta: string;      // Neuigkeitswert gegenüber Status Quo
    evidence: string;   // Harte Beweise (Zahlen, Daten, technische Fakten)
  };
  quote: {
    speakerId: string;    // ID des Ansprechpartners aus der Marken-DNA
    rawStatement: string; // Die im Chat erarbeitete Kernaussage
  };
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PMVorlage {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta: string;
  hashtags: string[];
  htmlContent: string;

  // Metadata
  generatedAt: Timestamp;
  targetGroup: 'ZG1' | 'ZG2' | 'ZG3';

  // Hash-basierte Änderungserkennung
  markenDNAHash: string;
  faktenMatrixHash: string;

  // History für Undo (letzte 3 Versionen)
  history?: Array<{
    content: PMVorlageContent;
    generatedAt: Timestamp;
  }>;
}

// Separates Interface für History-Content
export interface PMVorlageContent {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta: string;
  hashtags: string[];
  htmlContent: string;
}
```

#### 1.2 `src/lib/ai/schemas/fakten-matrix-schemas.ts` (NEU)
Zod-Schemas für Validierung.

#### 1.3 `src/types/strategy.ts` erweitern
Kernbotschaft-Typ um `faktenMatrix` erweitern.

### Deliverables
- [ ] FaktenMatrix Interface
- [ ] PMVorlage Interface
- [ ] Zod Schemas
- [ ] Type-Exports

---

## Phase 2: Project-Wizard Fakten-Matrix speichern

### Ziel
Der Project-Wizard liefert die Fakten-Matrix als **strukturiertes JSON** (nicht Markdown-Parsing!).

### ⚠️ WICHTIGE ENTSCHEIDUNG: JSON statt Regex

**Problem mit Regex-Parsing:**
- Fragil: Wenn die KI Überschriften leicht ändert, schlägt Extraktion fehl
- Wartungsaufwand hoch
- Fehleranfällig

**Lösung: Strukturierter Tool-Call**
Der Wizard wird instruiert, bei Abschluss einen Tool-Call mit strukturierten Daten abzusetzen.

### Dateien

#### 2.1 `src/lib/ai/agentic/skills/skill-sidebar.ts` erweitern

```typescript
// NEUER ANSATZ: Wizard sendet strukturierte Daten via Tool-Call

// Tool-Definition für den Wizard
const saveFaktenMatrixTool = ai.defineTool({
  name: 'saveFaktenMatrix',
  description: 'Speichert die gesammelten Fakten strukturiert',
  inputSchema: FaktenMatrixSchema,  // Zod-Schema
}, async (data: FaktenMatrix) => {
  await faktenMatrixService.save(projectId, data);
  return { success: true };
});

// Wizard-Prompt Ergänzung:
const WIZARD_FINALIZE_INSTRUCTION = `
Wenn alle Fakten gesammelt sind, rufe das Tool "saveFaktenMatrix" auf:
{
  "hook": {
    "event": "Was genau passiert",
    "location": "Ort des Geschehens",
    "date": "Zeitpunkt"
  },
  "details": {
    "delta": "Der Neuigkeitswert",
    "evidence": "Harte Beweise und Zahlen"
  },
  "quote": {
    "speakerId": "ID des gewählten Ansprechpartners",
    "rawStatement": "Die erarbeitete Kernaussage"
  }
}
`;
```

#### 2.2 `src/lib/firebase/fakten-matrix-service.ts` (NEU)
```typescript
class FaktenMatrixService {
  async save(projectId: string, data: FaktenMatrix): Promise<void>;
  async get(projectId: string): Promise<FaktenMatrix | null>;
  async exists(projectId: string): Promise<boolean>;
  async getWithHashes(projectId: string): Promise<{ data: FaktenMatrix; hash: string } | null>;
}
```

#### 2.3 `src/types/fakten-matrix.ts` aktualisieren
Neues Interface gemäß Feedback:
```typescript
interface FaktenMatrix {
  hook: {
    event: string;
    location: string;
    date: string;
  };
  details: {
    delta: string;
    evidence: string;
  };
  quote: {
    speakerId: string;    // Referenz auf DNA-Kontakt
    rawStatement: string;
  };
}
```

### Deliverables
- [ ] Tool-Definition `saveFaktenMatrix` im Wizard
- [ ] FaktenMatrix Firestore Service
- [ ] Zod-Schema für Validierung
- [ ] Wizard-Prompt mit Finalize-Instruktion

---

## Phase 3: Prompt-Module erstellen

### Ziel
Monolithischen Prompt in modulare Dateien aufteilen.

### Dateien

#### 3.1 `src/lib/ai/prompts/press-release/core-engine.ts` (NEU)
- Output-Format (HEADLINE, LEAD, BODY, QUOTE, CTA, HASHTAGS)
- Parsing-Anker (**Sterne**, [[CTA:...]], [[HASHTAGS:...]])
- Basis-Constraints (keine Boilerplate, keine Werbesprache)

#### 3.2 `src/lib/ai/prompts/press-release/press-release-craftsmanship.ts` (NEU) ← SHARED
**Wird in BEIDEN Modi geladen!**
- Lead-Struktur: "Ort, Datum – "
- Zitat-Formatierung: eigener Absatz
- Headline-Regeln: 40-75 Zeichen, aktive Verben
- Absatz-Struktur: 3 Body-Absätze
- SEO-Grundregeln

#### 3.3 `src/lib/ai/prompts/press-release/standard-library.ts` (NEU) ← NUR STANDARD
- Tonalitäten: formal, casual, modern, technical, startup
- Branchen: technology, automotive, healthcare, etc.
- Zielgruppen: b2b, consumer, media

#### 3.4 `src/lib/ai/prompts/press-release/expert-builder.ts` (NEU) ← NUR EXPERTE
- `buildExpertPrompt(dnaSynthese, faktenMatrix, dnaContacts, targetGroup)` Funktion
- DNA-Extraktion: Tonalität, Blacklist, Kernbotschaften
- Fakten-Matrix Integration mit neuem Interface
- Speaker-Lookup via `speakerId` aus DNA-Kontakten

### Deliverables
- [ ] core-engine.ts (~100 Zeilen)
- [ ] press-release-craftsmanship.ts (~150 Zeilen) ← NEU
- [ ] standard-library.ts (~500 Zeilen)
- [ ] expert-builder.ts (~200 Zeilen)
- [ ] index.ts (Re-Exports)

---

## Phase 4: PM-Vorlage Flow

### Ziel
Neuer Genkit Flow für PM-Vorlage Generierung.

### Dateien

#### 4.1 `src/lib/ai/flows/generate-pm-vorlage.ts` (NEU)
```typescript
export const generatePMVorlageFlow = ai.defineFlow({
  name: 'generatePMVorlage',
  inputSchema: z.object({
    projectId: z.string(),
    dnaSynthese: z.string(),
    faktenMatrix: FaktenMatrixSchema,
    targetGroup: z.enum(['ZG1', 'ZG2', 'ZG3']).optional()
  }),
  outputSchema: PMVorlageSchema
}, async (input) => {
  // 1. Build Expert Prompt
  const prompt = buildExpertPrompt(
    input.dnaSynthese,
    input.faktenMatrix,
    input.targetGroup
  );

  // 2. Add Core Engine + Base Rules
  const fullPrompt = [
    CORE_ENGINE.outputFormat,
    BASE_RULES.toPrompt(),
    prompt
  ].join('\n\n');

  // 3. Generate
  const result = await ai.generate({...});

  // 4. Parse & Return
  return parseToVorlage(result.text);
});
```

#### 4.2 `src/app/api/ai/pm-vorlage/route.ts` (NEU)
API-Endpoint für PM-Vorlage Generierung.

#### 4.3 `src/lib/firebase/pm-vorlage-service.ts` (NEU)
Firestore-Service für PM-Vorlagen.

### Deliverables
- [ ] Genkit Flow
- [ ] API Route
- [ ] Firestore Service

---

## Phase 5: UI - Strategie-Tab erweitern

### Ziel
PM-Vorlage Section zum Strategie-Tab hinzufügen.

### Dateien

#### 5.1 `src/components/projects/strategy/PMVorlageSection.tsx` (NEU)
Hauptkomponente für PM-Vorlage.

#### 5.2 `src/components/projects/strategy/PMVorlagePreview.tsx` (NEU)
Vorschau-Komponente.

#### 5.3 `src/lib/hooks/usePMVorlage.ts` (NEU)
React-Hook für Generierung & State.

#### 5.4 `src/app/.../StrategieTabContent.tsx` erweitern
PMVorlageSection einbinden.

### Deliverables
- [ ] PMVorlageSection Komponente
- [ ] PMVorlagePreview Komponente
- [ ] usePMVorlage Hook
- [ ] Integration in StrategieTabContent

---

## Phase 6: UI - Profi-Modus entfernen

### Ziel
Profi-Modus Toggle aus KI-Assistent entfernen.

### Dateien

#### 6.1 `src/components/pr/ai/StructuredGenerationModal.tsx`
- Mode-Toggle entfernen
- Hinweis-Box für Strategie hinzufügen

#### 6.2 `src/components/pr/ai/structured-generation/hooks/useStructuredGeneration.ts`
- Profi-Modus Logik entfernen
- Vereinfachen auf Standard-Modus

#### 6.3 `src/components/pr/AiAssistantModal.tsx`
- Falls Profi-Modus hier auch vorhanden

### Deliverables
- [ ] Mode-Toggle entfernt
- [ ] Hinweis-Box hinzugefügt
- [ ] Hook vereinfacht
- [ ] Tests angepasst

---

## Phase 7: Integration & Testing

### Ziel
Alles zusammenführen und testen.

### Dateien

#### 7.1 `src/lib/ai/flows/generate-press-release-structured.ts`
Refactoring auf modulare Prompt-Architektur.

```typescript
// Vorher: 900 Zeilen monolithisch
// Nachher: Import der Module

import { CORE_ENGINE } from '../prompts/press-release/core-engine';
import { BASE_RULES } from '../prompts/press-release/base-rules';
import { STANDARD_LIBRARY } from '../prompts/press-release/standard-library';

function buildSystemPrompt(context: Context): string {
  const parts = [CORE_ENGINE.outputFormat, BASE_RULES.toPrompt()];

  // Standard-Modus (kein DNA)
  if (context.tone) {
    parts.push(STANDARD_LIBRARY.getTone(context.tone));
  }
  // ...

  return parts.join('\n\n');
}
```

#### 7.2 Tests
- Unit-Tests für Prompt-Module
- Integration-Test für PM-Vorlage Flow
- E2E-Test für User-Journey

### Deliverables
- [ ] generate-press-release-structured.ts refactored
- [ ] Unit-Tests
- [ ] Integration-Tests
- [ ] E2E-Tests

---

## Reihenfolge

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
   │                        │           │
   │                        ▼           ▼
   │                    Phase 5 ◄── Phase 6
   │                        │
   │                        ▼
   └────────────────► Phase 7
```

**Kritischer Pfad:**
1 → 2 → 3 → 4 → 7

**Parallel möglich:**
- Phase 5 + 6 können parallel zu Phase 4 beginnen
- Phase 5 + 6 sind unabhängig voneinander
