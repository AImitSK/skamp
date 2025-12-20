# Phase 6: Dokumentation

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel

Nach Abschluss der Implementierung (Phasen 1-5) wird das Marken-DNA Feature vollständig dokumentiert - analog zu anderen Modulen wie CRM, Lists, Editors.

> **Referenz-Implementierung:** `docs/crm/README.md` (362 Zeilen, vollständig)
> **Template:** `docs/templates/module-refactoring-template.md` (Phase 5)

---

## Dokumentations-Struktur

Nach Abschluss soll folgende Struktur existieren:

```
docs/marken-dna/
├── README.md                    # Haupt-Dokumentation (~400 Zeilen)
├── api/
│   ├── README.md                # API-Übersicht
│   ├── marken-dna-service.md    # Firebase Service
│   ├── dna-synthese-service.md  # Synthese Service
│   ├── hooks.md                 # React Query Hooks
│   └── genkit-flows.md          # KI Flows Dokumentation
├── components/
│   ├── README.md                # Komponenten-Übersicht
│   ├── library-page.md          # Bibliothek-Seite
│   ├── editor-modal.md          # Editor mit Chat
│   └── chat-interface.md        # Chat-Komponente
└── adr/
    ├── README.md                # ADR-Übersicht
    ├── ADR-0001-genkit-vs-vercel-ai.md
    ├── ADR-0002-firestore-structure.md
    └── ADR-0003-chat-ui-pattern.md
```

---

## 1. Haupt-README

**Datei:** `docs/marken-dna/README.md`
**Umfang:** ~400 Zeilen
**Vorlage:** `docs/crm/README.md`

### Struktur

```markdown
# Marken-DNA

**Version:** 1.0
**Status:** Production Ready
**Letzte Aktualisierung:** YYYY-MM-DD

---

## Übersicht

Das Marken-DNA Modul ermöglicht die strategische Positionierung von Kunden
durch KI-gestützte Dokumenterstellung.

### Hauptfunktionen

- **6 Dokumenttypen**: Briefing, SWOT, Zielgruppen, Positionierung, Ziele, Botschaften
- **KI-Chat**: Interaktive Dokumenterstellung mit Genkit Flows
- **DNA Synthese**: KI-generierte Kurzfassung aller Dokumente
- **Strategie-Integration**: Kernbotschaft und Text-Matrix pro Projekt

---

## Architektur

### Routing-Struktur

\`\`\`
/dashboard/library/marken-dna/
├── page.tsx                    # Kundenübersicht mit Status
└── [companyId]/
    └── [documentType]/
        └── page.tsx            # Editor für Dokumenttyp
\`\`\`

### Komponenten-Struktur

\`\`\`
src/app/dashboard/library/marken-dna/
├── page.tsx
├── components/
│   ├── CompanyTable.tsx
│   ├── StatusCircles.tsx
│   └── CompanyActionsDropdown.tsx
└── __tests__/

src/components/marken-dna/
├── MarkenDNAEditorModal.tsx
├── ChatInterface.tsx
└── DocumentPreview.tsx

src/components/ai-chat/
├── AIChatModal.tsx
├── components/
│   ├── MessageList.tsx
│   ├── AIMessage.tsx
│   ├── UserMessage.tsx
│   ├── SuggestedPrompts.tsx
│   └── ProgressBar.tsx
└── hooks/
    ├── useGenkitChat.ts
    └── useChatPersistence.ts
\`\`\`

---

## Technologie-Stack

### Frontend
- Next.js 15 (App Router)
- React 19 mit TypeScript
- Tailwind CSS + Design System
- Heroicons /24/outline

### State Management & Data Fetching
- React Query (@tanstack/react-query)
- Custom Hooks (useMarkenDNA, useSynthesizeDNA, etc.)

### KI-Integration
- **Genkit** - Flow-Definition und Ausführung
- **@genkit-ai/google-genai** - Gemini 2.0 Flash
- **@genkit-ai/vertexai** - Imagen 3 (optional)

### Backend
- Firebase Firestore
- Genkit Flows (Server-Side)

---

## Datenmodell

### Firestore-Struktur

\`\`\`
companies/{companyId}/
└── markenDNA/
    ├── briefing/          # Briefing-Check Dokument
    ├── swot/              # SWOT-Analyse
    ├── audience/          # Zielgruppen-Radar
    ├── positioning/       # Positionierungs-Diamant
    ├── goals/             # Ziele-Setzer
    ├── messages/          # Botschaften-Baukasten
    └── synthesis/         # DNA Synthese (KI-generiert)

projects/{projectId}/
├── kernbotschaft/         # Kernbotschaft (projektspezifisch)
└── textMatrix/            # Text-Matrix (projektspezifisch)
\`\`\`

---

## API-Dokumentation

→ Siehe [API-Übersicht](./api/README.md)

- [markenDNAService](./api/marken-dna-service.md)
- [dnaSyntheseService](./api/dna-synthese-service.md)
- [React Query Hooks](./api/hooks.md)
- [Genkit Flows](./api/genkit-flows.md)

---

## Komponenten-Dokumentation

→ Siehe [Komponenten-Übersicht](./components/README.md)

---

## Testing

### Test-Struktur

\`\`\`
src/app/dashboard/library/marken-dna/__tests__/
├── integration/
│   └── marken-dna-flow.test.tsx
└── unit/
    ├── StatusCircles.test.tsx
    └── CompanyActionsDropdown.test.tsx

src/lib/hooks/__tests__/
└── useMarkenDNAData.test.tsx

src/lib/ai/flows/__tests__/
└── marken-dna-chat.test.ts
\`\`\`

### Test-Kommandos

\`\`\`bash
npm test -- marken-dna
npm run test:coverage -- marken-dna
\`\`\`

---

## Architektur-Entscheidungen

→ Siehe [ADR-Übersicht](./adr/README.md)

- [ADR-0001: Genkit vs. Vercel AI SDK](./adr/ADR-0001-genkit-vs-vercel-ai.md)
- [ADR-0002: Firestore-Struktur](./adr/ADR-0002-firestore-structure.md)
- [ADR-0003: Chat-UI Pattern](./adr/ADR-0003-chat-ui-pattern.md)

---

## Berechtigungen

- Authentifizierung (Firebase Auth)
- Organization-Membership
- Role: `member` oder höher

---

## Bekannte Einschränkungen & Roadmap

### Einschränkungen v1.0
- Nur Deutsch/Englisch unterstützt
- Keine Offline-Unterstützung
- Export nur als PDF

### Roadmap
- [ ] Weitere Sprachen
- [ ] Dokumenten-Versionierung
- [ ] Team-Kollaboration im Chat
- [ ] Export als Word/Markdown

---

**Maintainer:** CeleroPress Development Team
**Documentation Version:** 1.0
```

---

## 2. API-Dokumentation

### 2.1 API README

**Datei:** `docs/marken-dna/api/README.md`

```markdown
# Marken-DNA API-Dokumentation

Übersicht aller Services, Hooks und Flows für das Marken-DNA Modul.

## Services

| Service | Beschreibung | Datei |
|---------|--------------|-------|
| markenDNAService | CRUD für Marken-DNA Dokumente | [→ Docs](./marken-dna-service.md) |
| dnaSyntheseService | DNA Synthese Generierung | [→ Docs](./dna-synthese-service.md) |

## React Query Hooks

| Hook | Beschreibung | Datei |
|------|--------------|-------|
| useMarkenDNA | Lädt alle Dokumente einer Company | [→ Docs](./hooks.md) |
| useSaveMarkenDNA | Speichert ein Dokument | [→ Docs](./hooks.md) |
| useDeleteMarkenDNA | Löscht ein Dokument | [→ Docs](./hooks.md) |
| useSynthesizeDNA | Generiert DNA Synthese | [→ Docs](./hooks.md) |

## Genkit Flows

| Flow | Beschreibung | Datei |
|------|--------------|-------|
| markenDNAChatFlow | KI-Chat für Dokumenterstellung | [→ Docs](./genkit-flows.md) |
| dnaSyntheseFlow | Synthese-Generierung | [→ Docs](./genkit-flows.md) |
| projectStrategyChatFlow | Kernbotschaft/Text-Matrix | [→ Docs](./genkit-flows.md) |
```

### 2.2 Service-Dokumentation

**Datei:** `docs/marken-dna/api/marken-dna-service.md`

```markdown
# markenDNAService

Firebase Service für Marken-DNA Dokumente.

## Import

\`\`\`typescript
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
\`\`\`

## Methoden

### getAll(companyId)

Lädt alle Marken-DNA Dokumente einer Company.

\`\`\`typescript
const documents = await markenDNAService.getAll('company-123');
// Returns: { briefing: Document | null, swot: Document | null, ... }
\`\`\`

### get(companyId, documentType)

Lädt ein spezifisches Dokument.

\`\`\`typescript
const briefing = await markenDNAService.get('company-123', 'briefing');
\`\`\`

### save(companyId, documentType, data)

Speichert ein Dokument (create oder update).

\`\`\`typescript
await markenDNAService.save('company-123', 'briefing', {
  content: '<h1>Briefing</h1>...',
  plainText: 'Briefing...',
  chatHistory: [...],
  isComplete: true,
  completeness: 100,
});
\`\`\`

### delete(companyId, documentType)

Löscht ein Dokument.

\`\`\`typescript
await markenDNAService.delete('company-123', 'briefing');
\`\`\`

### deleteAll(companyId)

Löscht alle Dokumente einer Company.

\`\`\`typescript
await markenDNAService.deleteAll('company-123');
\`\`\`

### getCompanyStatus(companyId)

Berechnet den Status aller Dokumente.

\`\`\`typescript
const status = await markenDNAService.getCompanyStatus('company-123');
// Returns: { briefing: true, swot: false, ..., completeness: 33 }
\`\`\`

## TypeScript Interfaces

\`\`\`typescript
interface MarkenDNADocument {
  type: MarkenDNADocumentType;
  content: string;
  plainText: string;
  chatHistory: ChatMessage[];
  isComplete: boolean;
  completeness: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  language: 'de' | 'en';
}

type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';
\`\`\`
```

### 2.3 Genkit Flows Dokumentation

**Datei:** `docs/marken-dna/api/genkit-flows.md`

```markdown
# Genkit Flows

KI-Flows für Marken-DNA basierend auf Genkit.

## markenDNAChatFlow

Interaktiver Chat zur Dokumenterstellung.

### Import

\`\`\`typescript
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';
\`\`\`

### Input Schema

\`\`\`typescript
{
  documentType: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages';
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  existingDocument?: string;
  dnaSynthese?: string;
}
\`\`\`

### Output Schema

\`\`\`typescript
{
  response: string;           // KI-Antwort (bereinigt)
  document?: string;          // Extrahiert aus [DOCUMENT]...[/DOCUMENT]
  progress?: number;          // Extrahiert aus [PROGRESS:XX]
  suggestions?: string[];     // Extrahiert aus [SUGGESTIONS]...[/SUGGESTIONS]
}
\`\`\`

### Beispiel

\`\`\`typescript
const result = await markenDNAChatFlow({
  documentType: 'briefing',
  companyId: 'company-123',
  companyName: 'IBD Wickeltechnik GmbH',
  language: 'de',
  messages: [
    { role: 'user', content: 'Wir sind ein Maschinenbauer aus Stuttgart.' }
  ],
});

console.log(result.response);   // "Perfekt! Maschinenbau..."
console.log(result.document);   // "## Briefing-Check\n- Branche: Maschinenbau..."
console.log(result.progress);   // 25
console.log(result.suggestions); // ["Zielgruppen definieren", "Wettbewerber"]
\`\`\`

## dnaSyntheseFlow

Generiert DNA Synthese aus allen vorhandenen Dokumenten.

### Input

\`\`\`typescript
{
  companyId: string;
  companyName: string;
  documents: Record<MarkenDNADocumentType, string | null>;
  language: 'de' | 'en';
}
\`\`\`

### Output

\`\`\`typescript
{
  synthesis: string;          // Generierte Synthese
  hash: string;               // Hash der Quelldokumente
}
\`\`\`
```

---

## 3. Komponenten-Dokumentation

**Datei:** `docs/marken-dna/components/README.md`

```markdown
# Marken-DNA Komponenten

Übersicht aller React-Komponenten des Marken-DNA Moduls.

## Bibliothek-Seite

| Komponente | Beschreibung | Props |
|------------|--------------|-------|
| CompanyTable | Tabelle mit Kunden und Status | companies, onAction |
| StatusCircles | 6 Kreise für Dokumentstatus | documents, clickable, onCircleClick |
| CompanyActionsDropdown | 3-Punkte-Menü mit Aktionen | company, documents, onEdit, onCreate, onDelete |

## Editor-Modal

| Komponente | Beschreibung | Props |
|------------|--------------|-------|
| MarkenDNAEditorModal | Split-View Modal | open, onClose, company, documentType, onSave |
| ChatInterface | Chat-Komponente | messages, onSend, isLoading, suggestedPrompts |
| DocumentPreview | Dokument-Vorschau | content, onEdit |

## Chat-Komponenten

| Komponente | Beschreibung | Props |
|------------|--------------|-------|
| AIChatModal | Fullscreen Chat-Modal | isOpen, onClose, documentType, ... |
| MessageList | Liste aller Nachrichten | messages, isLoading |
| AIMessage | KI-Nachricht mit Markdown | content, onCopy, onRegenerate |
| UserMessage | Benutzer-Nachricht | content |
| SuggestedPrompts | Klickbare Vorschläge | prompts, onSelect |
| ProgressBar | Fortschrittsanzeige | progress |
| ChatInput | Eingabefeld | value, onChange, onSubmit, isLoading |

## Design System

Alle Komponenten folgen dem CeleroPress Design System:

- **Icons:** Heroicons /24/outline
- **Farben:** Primary (#005fab), Zinc-Palette
- **Höhen:** h-10 für interaktive Elemente
- **Borders:** border-zinc-200/300

→ Siehe `docs/design-system/DESIGN_SYSTEM.md`
```

---

## 4. Architecture Decision Records (ADRs)

### 4.1 ADR README

**Datei:** `docs/marken-dna/adr/README.md`

```markdown
# Architecture Decision Records (ADRs)

Dokumentierte Architektur-Entscheidungen für das Marken-DNA Modul.

## Übersicht

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| 0001 | Genkit vs. Vercel AI SDK | Accepted | YYYY-MM-DD |
| 0002 | Firestore-Struktur | Accepted | YYYY-MM-DD |
| 0003 | Chat-UI Pattern | Accepted | YYYY-MM-DD |

## ADR-Template

\`\`\`markdown
# ADR-XXXX: Titel

## Status
Proposed | Accepted | Deprecated | Superseded

## Kontext
Was ist das Problem?

## Entscheidung
Was haben wir entschieden?

## Konsequenzen
Was sind die Auswirkungen?

## Alternativen
Welche Alternativen wurden betrachtet?
\`\`\`
```

### 4.2 ADR-0001: Genkit vs. Vercel AI SDK

**Datei:** `docs/marken-dna/adr/ADR-0001-genkit-vs-vercel-ai.md`

```markdown
# ADR-0001: Genkit vs. Vercel AI SDK

## Status
Accepted

## Kontext

Für die KI-Chat-Funktionalität der Marken-DNA musste eine Entscheidung
zwischen zwei Frameworks getroffen werden:

1. **Vercel AI SDK** - useChat Hook, Streaming, einfache Integration
2. **Genkit** - Bereits im Projekt für 17+ Flows verwendet

## Entscheidung

**Wir bleiben bei Genkit** für alle KI-Funktionalitäten.

### Begründung

1. **Konsistenz:** Genkit wird bereits für 17+ Flows verwendet
   - Press Releases, Headlines, SEO, Email, Image Generation
   - Evaluators für Qualitätsprüfung

2. **Infrastruktur:** Genkit-Config bereits vorhanden
   - Google AI Plugin (Gemini)
   - Vertex AI Plugin (Imagen)
   - Service Account Integration

3. **Wartbarkeit:** Ein Framework statt zwei
   - Keine doppelten Dependencies
   - Einheitliche Patterns
   - Einfacheres Onboarding

## Konsequenzen

### Positiv
- Einheitliche KI-Architektur
- Bestehende Infrastruktur wiederverwendet
- Konsistente Entwicklungserfahrung

### Negativ
- Kein automatisches Streaming via useChat
- Manuelles State-Management für Chat
- useGenkitChat Hook muss selbst implementiert werden

## Alternativen

### Vercel AI SDK
- Pro: useChat Hook mit automatischem Streaming
- Pro: Einfachere Integration für Chat-UIs
- Contra: Zweites KI-Framework im Projekt
- Contra: Doppelte Dependencies und Konfiguration

### Hybrid (beide)
- Contra: Erhöhte Komplexität
- Contra: Zwei verschiedene Patterns
- Contra: Schwieriger zu warten
```

---

## 5. Dokumentations-Checkliste

### Haupt-Dokumentation
- [ ] `docs/marken-dna/README.md` erstellt (~400 Zeilen)
- [ ] Übersicht und Hauptfunktionen
- [ ] Architektur und Routing-Struktur
- [ ] Technologie-Stack
- [ ] Datenmodell
- [ ] Testing-Infos
- [ ] Bekannte Einschränkungen & Roadmap

### API-Dokumentation
- [ ] `docs/marken-dna/api/README.md` - Übersicht
- [ ] `docs/marken-dna/api/marken-dna-service.md` - Service Docs
- [ ] `docs/marken-dna/api/dna-synthese-service.md` - Synthese Docs
- [ ] `docs/marken-dna/api/hooks.md` - React Query Hooks
- [ ] `docs/marken-dna/api/genkit-flows.md` - Genkit Flow Docs

### Komponenten-Dokumentation
- [ ] `docs/marken-dna/components/README.md` - Übersicht
- [ ] Alle Komponenten mit Props dokumentiert
- [ ] Design System Referenzen

### ADRs
- [ ] `docs/marken-dna/adr/README.md` - Übersicht
- [ ] ADR-0001: Genkit vs. Vercel AI SDK
- [ ] ADR-0002: Firestore-Struktur (companies statt customers)
- [ ] ADR-0003: Chat-UI Pattern (Fullscreen Modal)

### Code-Dokumentation
- [ ] JSDoc/TSDoc für alle öffentlichen Funktionen
- [ ] Inline-Kommentare für komplexe Logik
- [ ] Type-Exports dokumentiert

---

## 6. Dokumentations-Standards

### Umfang (wie CRM-Modul)

| Bereich | Ziel |
|---------|------|
| README.md | ~400 Zeilen |
| API-Docs gesamt | ~800 Zeilen |
| Component-Docs | ~400 Zeilen |
| ADRs gesamt | ~300 Zeilen |
| **Gesamt** | **~2000 Zeilen** |

### Sprache

- Dokumentation auf **Deutsch**
- Code-Beispiele mit deutschen Kommentaren
- Konsistent mit anderen Modulen (CRM, Lists, etc.)

### Format

- Markdown mit GitHub-Flavored Syntax
- Code-Blöcke mit Syntax-Highlighting
- Tabellen für Übersichten
- Mermaid-Diagramme wo hilfreich

---

## Abhängigkeiten

- Phasen 1-5 müssen abgeschlossen sein
- Implementierung muss stabil sein
- Tests müssen grün sein

---

## Erledigungs-Kriterien

- [ ] `docs/marken-dna/` Ordnerstruktur erstellt
- [ ] README.md vollständig (~400 Zeilen)
- [ ] API-Dokumentation vollständig
- [ ] Komponenten-Dokumentation vollständig
- [ ] Mindestens 3 ADRs geschrieben
- [ ] JSDoc für alle Services und Hooks
- [ ] Alle Links funktionieren
- [ ] Review durch zweiten Entwickler
