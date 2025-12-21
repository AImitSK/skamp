# Marken-DNA

**Version:** 1.0
**Status:** Production Ready
**Letzte Aktualisierung:** 2025-12-21

---

## Übersicht

Das Marken-DNA Modul revolutioniert den Strategie-Bereich von CeleroPress durch einen KI-gestützten, interaktiven Ansatz. Statt statischer Templates führt ein intelligenter Chat-Wizard durch die Erstellung strategischer Dokumente.

### Hauptfunktionen

- **6 Strategie-Dokumente**: Briefing-Check, SWOT-Analyse, Zielgruppen-Radar, Positionierungs-Designer, Ziele-Setzer, Botschaften-Baukasten
- **KI-gestützter Chat**: Interaktive Dokumenterstellung via Genkit Flows mit Gemini 2.0 Flash
- **🧪 DNA Synthese**: KI-generierte Kurzfassung aller Dokumente (~500 Tokens statt ~5.000)
- **💬 Kernbotschaft**: Projektspezifische Ausrichtung durch Chat-basierten Wizard
- **🧬 AI Sequenz**: Kombination von DNA Synthese + Kernbotschaft zur Text-Matrix
- **📋 Text-Matrix**: Strategisches Roh-Skelett (High-Fidelity Draft) für finale Pressemeldung
- **Strategie-Integration**: Nahtlose Einbindung in den Projekt-Workflow

---

## Kernprinzip: Die CeleroPress Formel

```
🧪 DNA Synthese + 💬 Kernbotschaft → 🧬 AI Sequenz → 📋 Text-Matrix → 📰 Pressemeldung
```

**Strategie-Sicherheit durch KI, Kreative Exzellenz durch Menschen:**

- Die 🧪 DNA-Synthese ist das "Leitplanken-System" – sie verhindert Abweichungen von der Markenidentität
- Die 📋 Text-Matrix ist ein High-Fidelity Draft – strategisch fundiert, aber noch nicht druckreif
- Der Mensch prüft, verfeinert und gibt den finalen Sign-off
- Erst dann ist es eine fertige 📰 Pressemeldung

---

## Drei-Ebenen-Architektur

### Ebene 1: Marken-DNA (Kundenebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Langfristig, statisch (jährliche Überprüfung) |
| **Speicherort** | Firestore: `companies/{companyId}/markenDNA/{docType}` |
| **UI-Pfad** | Bibliothek → Marken DNA → [Kunde] |
| **Inhalt** | 6 Strategie-Dokumente |
| **Zweck** | "Gedächtnis" der KI - Leitplanken für alle Kommunikation |

**Die 6 Dokumente:**

1. **Briefing-Check** - Die Faktenbasis (Wer sind wir?)
2. **SWOT-Analyse** - Die Bewertung (Stärken, Schwächen, Chancen, Risiken)
3. **Zielgruppen-Radar** - Die Adressaten (Empfänger, Mittler, Absender)
4. **Positionierungs-Designer** - Das Herzstück (USP und Soll-Image)
5. **Ziele-Setzer** - Die Messlatte (Kopf, Herz, Hand)
6. **Botschaften-Baukasten** - Die Argumentation (Kern, Beweis, Nutzen)

### Ebene 2: 🧪 DNA Synthese (Unternehmensebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Globales Brand-Manual für den Kunden |
| **Speicherort** | `companies/{companyId}/markenDNA/synthesis` |
| **Inhalt** | Kompakte Kurzform (~500 Tokens statt ~5.000) |
| **Zweck** | Effizienter KI-Kontext für Textgenerierung |

**Warum DNA Synthese?**

- Token-Ersparnis: 6 Dokumente = ~5.000 Tokens → Synthese = ~500 Tokens
- KI-optimiert: Strukturiert für schnelle Verarbeitung
- Fokus auf Textgenerierung: Tonalität, Kernbotschaften, Do's & Don'ts
- Aktualitäts-Check: Hash-basiertes Tracking erkennt Änderungen an Quelldokumenten

### Ebene 3: 💬 Kernbotschaft (Projektebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Kurzfristig, dynamisch (pro Projekt neu) |
| **Speicherort** | `projects/{projectId}/kernbotschaft` |
| **Inhalt** | Anlass, Ziel, Teilbotschaften, Material |
| **Zweck** | Konkrete Ausrichtung für dieses eine Projekt |

### Ebene 4: 🧬 AI Sequenz → 📋 Text-Matrix

| Aspekt | Beschreibung |
|--------|--------------|
| **AI Sequenz** | KI-Prozess der DNA Synthese + Kernbotschaft kombiniert |
| **Text-Matrix** | Strategisches Roh-Skelett (High-Fidelity Draft) |
| **Human-in-the-Loop** | Nach menschlichem Feinschliff → fertige 📰 Pressemeldung |
| **Drei-Schichten-Architektur** | EBENE 1: Marken-DNA (höchste Priorität) → EBENE 2: SCORE-Regeln (journalistisches Handwerk) → EBENE 3: Projekt-Kontext (aktuelle Fakten) |

**Kritische Regel:** Die Tonalität der DNA (Ebene 1) hat bei Konflikten **immer Vorrang** vor den Score-Regeln (Ebene 2).

---

## Architektur

### Routing-Struktur

```
/dashboard/library/marken-dna/
├── page.tsx                    # Kundenübersicht mit Status
└── [companyId]/
    └── [documentType]/
        └── page.tsx            # Editor für Dokumenttyp

/dashboard/projects/[projectId]/strategy/
└── page.tsx                    # Strategie-Tab mit DNA Synthese, Kernbotschaft, AI Sequenz
```

### Komponenten-Struktur

```
src/app/dashboard/library/marken-dna/
├── page.tsx                                # Hauptseite mit Kundenübersicht
├── [companyId]/
│   └── [documentType]/
│       └── page.tsx                        # Editor-Seite pro Dokumenttyp
├── components/
│   ├── CompanyTable.tsx                    # Tabelle mit Kunden und Status
│   ├── StatusCircles.tsx                   # 6 Kreise für Dokumentstatus
│   └── CompanyActionsDropdown.tsx          # 3-Punkte-Menü mit Aktionen
└── __tests__/
    ├── integration/
    │   └── marken-dna-flow.test.tsx
    └── unit/
        ├── StatusCircles.test.tsx
        └── CompanyActionsDropdown.test.tsx

src/components/marken-dna/
├── MarkenDNAEditorModal.tsx                # Split-View Modal (Chat + Preview)
├── ChatInterface.tsx                       # Chat-Komponente
└── DocumentPreview.tsx                     # Dokument-Vorschau

src/components/ai-chat/
├── AIChatModal.tsx                         # Fullscreen Chat-Modal
├── components/
│   ├── MessageList.tsx                     # Liste aller Nachrichten
│   ├── AIMessage.tsx                       # KI-Nachricht mit Markdown
│   ├── UserMessage.tsx                     # Benutzer-Nachricht
│   ├── SuggestedPrompts.tsx                # Klickbare Vorschläge
│   ├── ProgressBar.tsx                     # Fortschrittsanzeige
│   └── ChatInput.tsx                       # Eingabefeld
└── hooks/
    ├── useGenkitChat.ts                    # Genkit Chat Hook
    └── useChatPersistence.ts               # Chat-Verlauf speichern

src/lib/ai/flows/
├── marken-dna-chat.ts                      # Chat-Flow für alle 6 Dokumenttypen
├── dna-synthese.ts                         # Synthese-Generierung
└── project-strategy-chat.ts                # Kernbotschaft-Chat
```

---

## Technologie-Stack

### Frontend

- **Next.js 15** (App Router)
- **React 19** mit TypeScript
- **Tailwind CSS** + CeleroPress Design System
- **Heroicons** `/24/outline` (exklusiv)
- **next-intl** (i18n für DE/EN)

### State Management & Data Fetching

- **React Query** (@tanstack/react-query) - Data Caching & Server State
- **Custom Hooks** - useMarkenDNA, useSynthesizeDNA, useKernbotschaft, etc.

### KI-Integration

- **Genkit** - Flow-Definition und Ausführung
- **@genkit-ai/google-genai** - Gemini 2.0 Flash (Chat, Synthese)
- **@genkit-ai/vertexai** - Imagen 3 (optional für Bildgenerierung)

### Backend

- **Firebase Firestore** - Datenbank
- **Genkit Flows** - Server-Side AI Processing
- **Firebase Security Rules** - Multi-Tenancy mit organizationId

### UI Notifications

- **react-hot-toast** - Zentraler Toast-Service für konsistente Benachrichtigungen
- **toastService** (`@/lib/utils/toast`) - Wrapper mit CeleroPress-Styling
- Non-blocking Toasts in top-right Position

---

## Datenmodell

### Firestore-Struktur

```
companies/{companyId}/
└── markenDNA/
    ├── briefing/          # Briefing-Check Dokument
    ├── swot/              # SWOT-Analyse
    ├── audience/          # Zielgruppen-Radar
    ├── positioning/       # Positionierungs-Designer
    ├── goals/             # Ziele-Setzer
    ├── messages/          # Botschaften-Baukasten
    └── synthesis/         # 🧪 DNA Synthese (KI-generiert)

projects/{projectId}/
├── kernbotschaft/         # 💬 Kernbotschaft (projektspezifisch)
└── textMatrix/            # 📋 Text-Matrix (projektspezifisch)
```

### MarkenDNADocument Interface

```typescript
interface MarkenDNADocument {
  id: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  organizationId: string;

  // Typ
  type: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages';
  title: string;              // z.B. "Briefing-Check"

  // Inhalt
  content: string;            // HTML für Editor
  plainText: string;          // Plain-Text für KI
  structuredData?: Record<string, unknown>;

  // Status
  status: 'missing' | 'draft' | 'completed';
  completeness: number;       // 0-100

  // Chat-Verlauf (für Weiterbearbeitung)
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### DNASynthese Interface

```typescript
interface DNASynthese {
  id: string;
  companyId: string;
  organizationId: string;

  // Inhalt (KI-optimierte Kurzform, ~500 Tokens)
  content: string;            // HTML für Anzeige
  plainText: string;          // Plain-Text für KI-Übergabe

  // Tonalität (extrahiert/gewählt)
  tone: 'formal' | 'casual' | 'modern' | 'technical' | 'startup';

  // Status
  status: 'missing' | 'draft' | 'completed';

  // Tracking & Aktualitäts-Check
  synthesizedAt: Timestamp;
  synthesizedFrom: string[];  // Typen der 6 Marken-DNA Dokumente
  markenDNAVersion: string;   // Hash um Änderungen zu erkennen
  manuallyEdited: boolean;    // Wurde manuell angepasst?

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### Kernbotschaft Interface

```typescript
interface Kernbotschaft {
  id: string;
  projectId: string;
  companyId: string;
  organizationId: string;

  // Inhalt
  occasion: string;           // Anlass
  goal: string;               // Ziel
  keyMessage: string;         // Teilbotschaft
  content: string;            // Generiertes Dokument
  plainText: string;          // Für KI

  // Status
  status: 'draft' | 'completed';

  // Chat
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

---

## API-Dokumentation

→ Siehe [API-Übersicht](./api/README.md)

### Services

- **[markenDNAService](./api/marken-dna-service.md)** - CRUD für Marken-DNA Dokumente
- **[dnaSyntheseService](./api/dna-synthese-service.md)** - DNA Synthese Generierung
- **[kernbotschaftService](./api/kernbotschaft-service.md)** - Kernbotschaft CRUD

### React Query Hooks

- **[useMarkenDNA](./api/hooks.md)** - Lädt alle Dokumente einer Company
- **[useSaveMarkenDNA](./api/hooks.md)** - Speichert ein Dokument
- **[useDeleteMarkenDNA](./api/hooks.md)** - Löscht ein Dokument
- **[useSynthesizeDNA](./api/hooks.md)** - Generiert DNA Synthese
- **[useMarkenDNAStatus](./api/hooks.md)** - Status-Berechnung

### Genkit Flows

- **[markenDNAChatFlow](./api/genkit-flows.md)** - KI-Chat für Dokumenterstellung (alle 6 Typen)
- **[dnaSyntheseFlow](./api/genkit-flows.md)** - Synthese-Generierung aus 6 Dokumenten
- **[projectStrategyChatFlow](./api/genkit-flows.md)** - Kernbotschaft/Text-Matrix

---

## Komponenten-Dokumentation

→ Siehe [Komponenten-Übersicht](./components/README.md)

### Bibliothek-Seite

- **CompanyTable** - Tabelle mit Kunden und Status
- **StatusCircles** - 6 Kreise für Dokumentstatus
- **CompanyActionsDropdown** - 3-Punkte-Menü mit Aktionen

### Editor-Modal

- **MarkenDNAEditorModal** - Split-View Modal (Chat + Preview)
- **ChatInterface** - Chat-Komponente
- **DocumentPreview** - Dokument-Vorschau

### Chat-Komponenten

- **AIChatModal** - Fullscreen Chat-Modal
- **MessageList** - Liste aller Nachrichten
- **AIMessage** - KI-Nachricht mit Markdown
- **UserMessage** - Benutzer-Nachricht
- **SuggestedPrompts** - Klickbare Vorschläge
- **ProgressBar** - Fortschrittsanzeige
- **ChatInput** - Eingabefeld

---

## Testing

### Test-Struktur

```
src/app/dashboard/library/marken-dna/__tests__/
├── integration/
│   └── marken-dna-flow.test.tsx
└── unit/
    ├── StatusCircles.test.tsx
    └── CompanyActionsDropdown.test.tsx

src/lib/hooks/__tests__/
└── useMarkenDNAData.test.tsx

src/lib/firebase/__tests__/
├── marken-dna-service.test.ts
├── dna-synthese-service.test.ts
└── kernbotschaft-service.test.ts

src/lib/ai/flows/__tests__/
├── marken-dna-chat.test.ts
├── dna-synthese.test.ts
└── project-strategy-chat.test.ts
```

### Test-Kommandos

```bash
# Alle Marken-DNA Tests
npm test -- marken-dna

# Nur Integration Tests
npm test -- marken-dna/integration

# Mit Coverage
npm run test:coverage -- marken-dna

# Watch Mode (Entwicklung)
npm test -- --watch marken-dna
```

### Test-Coverage Ziel

| Kategorie | Ziel | Aktuell |
|-----------|------|---------|
| Services | 80%+ | 79/79 Tests bestanden |
| Hooks | 80%+ | In Arbeit |
| Flows | 80%+ | In Arbeit |
| Komponenten | 70%+ | In Arbeit |
| Integration | 60%+ | In Arbeit |

---

## Architektur-Entscheidungen

→ Siehe [ADR-Übersicht](./adr/README.md)

- **[ADR-0001: Genkit vs. Vercel AI SDK](./adr/ADR-0001-genkit-vs-vercel-ai.md)** - Warum Genkit für alle KI-Funktionalitäten
- **[ADR-0002: Firestore-Struktur](./adr/ADR-0002-firestore-structure.md)** - companies/{companyId}/markenDNA vs. customers Collection
- **[ADR-0003: Chat-UI Pattern](./adr/ADR-0003-chat-ui-pattern.md)** - Fullscreen Modal vs. Split-View

---

## Internationalisierung (i18n)

### Unterstützte Sprachen

- 🇩🇪 Deutsch (Primär)
- 🇬🇧 Englisch

### Sprach-Switching

Die gesamte UI und alle KI-Ausgaben passen sich automatisch der gewählten Sprache an:

- **UI-Texte:** `useTranslations('markenDNA')`
- **Toast-Meldungen:** `useTranslations('toasts')`
- **KI-Prompts:** Sprach-Parameter in allen Genkit Flows
- **Dokumente:** Werden in der Sprache erstellt, die der User gewählt hat

```typescript
// Beispiel: Chat-Flow mit Sprache
const locale = useLocale(); // 'de' oder 'en'

await markenDNAChatFlow({
  documentType: 'briefing',
  companyId: 'company-123',
  companyName: 'Test GmbH',
  language: locale,  // ← KI antwortet in dieser Sprache
  messages: [...],
});
```

---

## Berechtigungen

Das Marken-DNA Modul erfordert:

- ✅ Authentifizierung (Firebase Auth)
- ✅ Organization-Membership
- ✅ Role: `member` oder höher

### Firestore Security Rules

```javascript
// Marken-DNA als Subcollection unter companies
match /companies/{companyId}/markenDNA/{docType} {
  allow read: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow create: if isAuthenticated() &&
    belongsToOrganization(request.resource.data.organizationId);
  allow update: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow delete: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// DNA Synthese
match /companies/{companyId}/markenDNA/synthesis {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// Kernbotschaft
match /projects/{projectId}/kernbotschaft/{kernbotschaftId} {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}
```

---

## Bekannte Einschränkungen & Roadmap

### Einschränkungen v1.0

- Nur Deutsch/Englisch unterstützt (weitere Sprachen geplant)
- Keine Offline-Unterstützung
- Export nur als PDF (Word/Markdown geplant)
- DNA Synthese nur manuell auslösbar (kein automatisches Re-Synthetisieren bei Änderungen)
- Keine Versionierung der Dokumente

### Roadmap v1.1

- [ ] Weitere Sprachen (FR, ES, IT)
- [ ] Automatisches Re-Synthetisieren bei Marken-DNA Änderungen
- [ ] Dokumenten-Versionierung
- [ ] Team-Kollaboration im Chat (mehrere User gleichzeitig)

### Roadmap v1.2

- [ ] Export als Word/Markdown
- [ ] Bildgenerierung via Imagen 3 (optional)
- [ ] Template-Library für Branchen
- [ ] Analytics Dashboard (Token-Nutzung, Dokument-Statistiken)

### Roadmap v2.0

- [ ] Multi-Marken-Management (mehrere Marken pro Company)
- [ ] A/B-Testing für Kernbotschaften
- [ ] Sentiment-Analyse der generierten Texte
- [ ] Integration mit CRM-Daten (automatisches Pre-Fill)

---

## Implementierungsphasen

### Status-Übersicht

| Phase | Beschreibung | Status | Datum |
|-------|--------------|--------|-------|
| **1** | Datenmodell & Services | ✅ Abgeschlossen | 2025-12-20 |
| **2** | Marken-DNA Bibliothek (UI) | ✅ Abgeschlossen | 2025-12-21 |
| **3** | KI-Chat (Genkit Flows + Streaming) | ✅ Abgeschlossen | 2025-12-21 |
| **4** | Strategie-Tab Umbau | ✅ Abgeschlossen | 2025-12-21 |
| **5** | KI-Assistenten Integration | ✅ Abgeschlossen | 2025-12-21 |
| **6** | Dokumentation | ⏳ In Arbeit | 2025-12-21 |

### Phase 1: Datenmodell & Services (✅ Abgeschlossen)

- 12 Dateien erstellt
- 79 Tests bestanden
- Firestore Rules deployed
- Commit: `385ba7bc`

### Phase 2: Marken-DNA Bibliothek (✅ Abgeschlossen)

- Navigation erweitert (Bibliothek → Marken DNA)
- Hauptseite mit Kundenübersicht und Status
- Dropdown-Menü für Dokument-Aktionen
- Chat-Dialog für Dokument-Erstellung

### Phase 3: KI-Chat Backend (✅ Abgeschlossen)

- Genkit Flows mit Streaming
- System-Prompts für alle 6 Dokumenttypen (DE/EN)
- Output-Format Extraction ([DOCUMENT], [PROGRESS], [SUGGESTIONS])
- API-Endpoints

### Phase 4: Strategie-Tab Umbau (✅ Abgeschlossen)

- DNA Synthese Integration
- Kernbotschaft Chat
- AI Sequenz mit Drei-Schichten-Architektur
- Text-Matrix

### Phase 5: KI-Assistenten Integration (✅ Abgeschlossen)

- Experten-Modus hinzugefügt
- DNA Synthese Übergabe (~500 Tokens)
- Prompt-Anpassungen mit Drei-Schichten-Architektur
- Tonalität-Priorisierung (Marken-DNA > SCORE-Regeln)

### Phase 6: Dokumentation (⏳ In Arbeit)

- README nach CRM-Muster
- API-Dokumentation
- Komponenten-Dokumentation
- ADRs (3 vorbereitet)

---

## Performance-Ziele

| Metrik | Ziel | Status |
|--------|------|--------|
| Initial Load (Bibliothek) | <2s | ✅ |
| Chat-Response Time | <3s | ✅ |
| DNA Synthese Generierung | <10s | ✅ |
| Bundle Size (Marken-DNA Module) | <150 KB | ⏳ |
| Test Coverage | 80%+ | ⏳ |

---

## Entwicklungsrichtlinien

### Design System

Alle Marken-DNA Komponenten folgen dem CeleroPress Design System:

- **Icons:** Heroicons `/24/outline` (exklusiv)
- **Farben:** Primary (#005fab), Zinc-Palette
- **Höhen:** `h-10` für interaktive Elemente
- **Borders:** `border-zinc-200/300`
- **Schatten:** Keine (nur Dropdowns)

→ Siehe `docs/design-system/DESIGN_SYSTEM.md`

### Code-Standards

- TypeScript strikt verwenden
- Keine `console.log` Statements committen
- Multi-Tenancy mit `organizationId` beachten
- Toast-Benachrichtigungen für alle Benutzeraktionen
- i18n für alle UI-Texte

### Test-Standards

- Unit-Tests für alle Services und Hooks
- Integration-Tests für CRUD-Flows
- Genkit Flow Tests mit Mocks
- Mindestens 80% Coverage für Services

---

## Kontakt & Support

**Maintainer:** CeleroPress Development Team
**Letzte Änderung:** 2025-12-21
**Status:** Production Ready (Phase 1-5 abgeschlossen)

**Documentation Version:** 1.0
**Last Review:** 2025-12-21
**Next Review:** Q2 2026

Bei Fragen siehe: [Project README](../../README.md)
