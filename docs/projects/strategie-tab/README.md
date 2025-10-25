# Strategie Tab - Hauptdokumentation

> **Modul**: Strategie Tab
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 25. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur-Übersicht](#architektur-übersicht)
- [Quick Start Guide](#quick-start-guide)
- [Verzeichnisstruktur](#verzeichnisstruktur)
- [Technologie-Stack](#technologie-stack)
- [Performance-Optimierungen](#performance-optimierungen)
- [Testing](#testing)
- [Migration & Changelog](#migration--changelog)
- [Weiterführende Dokumentation](#weiterführende-dokumentation)

---

## Übersicht

Das **Strategie Tab** ist ein zentrales Modul der CeleroPress-Plattform zur Verwaltung und Erstellung von Strategiedokumenten innerhalb von Projekten. Es ermöglicht Nutzern, aus vorgefertigten Templates strukturierte Dokumente zu erstellen, zu bearbeiten und zu verwalten.

### Kernfunktionalität

Das Modul bietet eine intuitive Benutzeroberfläche zur:
- **Template-basierten Dokumentenerstellung** mit 6 vorgefertigten Templates
- **Echtzeit-Datenverwaltung** über React Query mit automatischem Caching
- **Performance-optimierten Komponenten** durch React.memo und useCallback
- **Lazy Loading** für Editor-Modals zur Reduzierung der initialen Bundle-Größe
- **Multi-Tenancy-sichere** Firebase-Integration mit organizationId-Filterung

### Zielgruppe

- **Projektmanager**: Erstellen von Projekt-Briefings und Strategiedokumenten
- **Kommunikationsexperten**: Erstellung von Zielgruppenanalysen und Kernbotschaften
- **Teams**: Kollaborative Dokumentenerstellung in Projekten

---

## Features

### 1. Template System

Das Strategie Tab bietet **6 verschiedene Templates** für unterschiedliche Dokumenttypen:

#### Basis-Templates
- **Neues Dokument erstellen** (`blank`): Leeres Dokument für freie Notizen
- **Leere Tabelle erstellen** (`table`): Strukturierte Tabellenerstellung

#### Strategische Templates
- **Unternehmensprofil & Senderanalyse** (`company-profile`): Erfassung der Kernfakten des Absenders
- **Situationsanalyse** (`situation-analysis`): SWOT-Analyse und Marktumfeld
- **Zielgruppenanalyse** (`audience-analysis`): Detaillierte Persona- und Stakeholder-Analyse
- **Kernbotschaften & Kommunikationsziele** (`core-messages`): Definition von Kommunikationszielen und Botschaften

Jedes Template enthält vorgefertigte HTML-Strukturen mit Platzhaltern, die sofort einsatzbereit sind.

### 2. React Query Integration

**Automatisches Caching und State Management** über `@tanstack/react-query`:

```typescript
const { data, isLoading, error } = useStrategyDocuments(projectId, organizationId);
```

- **Cache-Dauer**: 5 Minuten (staleTime)
- **Automatische Invalidierung** bei Mutations (Create, Update, Delete)
- **Optimistic Updates** für bessere UX
- **Error Handling** integriert

### 3. Lazy Loading für Modals

Die Editor-Modals werden **nur bei Bedarf geladen**, um die initiale Bundle-Größe zu reduzieren:

```typescript
const DocumentEditorModal = dynamic(() => import('../DocumentEditorModal'), { ssr: false });
const SpreadsheetEditorModal = dynamic(() => import('../SpreadsheetEditorModal'), { ssr: false });
```

**Vorteile:**
- Reduzierte initiale Ladezeit
- Kleineres JavaScript-Bundle
- Bessere Performance auf mobilen Geräten

### 4. Performance-Optimierungen

- **React.memo**: Alle Komponenten verwenden `React.memo` zur Vermeidung unnötiger Re-Renders
- **useCallback**: Handler-Funktionen werden mit `useCallback` stabilisiert
- **useMemo**: Template-Arrays werden memoized
- **Optimierte Re-Render-Strategie**: Komponenten rendern nur bei relevanten Prop-Änderungen

### 5. Multi-Tenancy Security

Alle Firebase-Abfragen sind mit **organizationId-Filterung** abgesichert:

```typescript
where('organizationId', '==', context.organizationId)
```

Dies verhindert Cross-Organization-Datenzugriff.

---

## Architektur-Übersicht

### High-Level Architektur

```
┌─────────────────────────────────────────┐
│     ProjectStrategyTab (Orchestrator)   │
│  - State Management                     │
│  - Handler (useCallback)                │
│  - Lazy Loading                         │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      │                │
┌─────▼─────┐   ┌──────▼──────┐
│  Template │   │  Documents  │
│   Grid    │   │    Table    │
│ (6 Cards) │   │  (CRUD UI)  │
└───────────┘   └──────┬──────┘
                       │
              ┌────────┴────────┐
              │                 │
     ┌────────▼───────┐  ┌──────▼──────┐
     │ Document Editor│  │ Spreadsheet │
     │     Modal      │  │   Editor    │
     │ (Lazy Loaded)  │  │(Lazy Loaded)│
     └────────────────┘  └─────────────┘
```

### Datenfluss

```
User Action (Template auswählen)
   │
   ▼
handleTemplateSelect (ProjectStrategyTab)
   │
   ├── templateType === 'table' ?
   │     └─► SpreadsheetEditorModal
   │
   └── else
         └─► DocumentEditorModal (mit initialContent)
```

### Service-Layer

```
React Components
   │
   ▼
useStrategyDocuments Hook (React Query)
   │
   ▼
strategyDocumentService (Firebase Service)
   │
   ▼
Firestore (strategy_documents Collection)
```

---

## Quick Start Guide

### 1. Integration in eine Projektseite

```tsx
import ProjectStrategyTab from '@/components/projects/strategy/ProjectStrategyTab';

function ProjectPage({ project, dokumenteFolderId }) {
  return (
    <ProjectStrategyTab
      projectId={project.id}
      organizationId={project.organizationId}
      project={project}
      dokumenteFolderId={dokumenteFolderId}
      onDocumentSaved={() => console.log('Dokument gespeichert')}
    />
  );
}
```

### 2. Template auswählen und Dokument erstellen

```tsx
// User klickt auf Template-Kachel
// → handleTemplateSelect wird aufgerufen
// → Editor-Modal öffnet sich mit Template-Content
// → User bearbeitet und speichert
// → onDocumentSaved Callback wird ausgelöst
```

### 3. Dokumente mit React Query laden

```tsx
import { useStrategyDocuments } from '@/lib/hooks/useStrategyDocuments';

function MyComponent() {
  const { data: documents, isLoading } = useStrategyDocuments(projectId, organizationId);

  if (isLoading) return <div>Lädt...</div>;

  return (
    <ul>
      {documents?.map(doc => (
        <li key={doc.id}>{doc.title}</li>
      ))}
    </ul>
  );
}
```

### 4. Dokument erstellen mit Mutation

```tsx
import { useCreateStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function CreateDocumentButton() {
  const { mutate, isLoading } = useCreateStrategyDocument();

  const handleCreate = () => {
    mutate({
      projectId: 'project-123',
      organizationId: 'org-456',
      userId: 'user-789',
      documentData: {
        projectId: 'project-123',
        organizationId: 'org-456',
        title: 'Mein Strategiedokument',
        type: 'strategy',
        content: '<h1>Neue Strategie</h1>',
        status: 'draft',
        author: 'user-789',
        authorName: 'Max Mustermann'
      }
    });
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Erstellt...' : 'Dokument erstellen'}
    </button>
  );
}
```

---

## Verzeichnisstruktur

```
src/
├── components/
│   └── projects/
│       └── strategy/
│           ├── ProjectStrategyTab.tsx          # Haupt-Orchestrator
│           ├── StrategyTemplateGrid.tsx        # Template-Auswahl (6 Kacheln)
│           ├── StrategyDocumentsTable.tsx      # Dokumente-Tabelle (aktuell ungenutzt)
│           └── __tests__/
│               └── StrategyTemplateGrid.test.tsx # 100% Coverage
│
├── lib/
│   ├── hooks/
│   │   └── useStrategyDocuments.ts             # React Query Hooks (4 Hooks)
│   │
│   └── firebase/
│       └── strategy-document-service.ts        # Firebase Service (CRUD + Versionierung)
│
├── constants/
│   └── strategy-templates.ts                   # STRATEGY_TEMPLATES Konstante (6 Templates)
│
└── docs/
    └── projects/
        └── strategie-tab/
            ├── README.md                       # Diese Datei
            ├── api/
            │   ├── README.md                   # API-Übersicht
            │   └── strategie-tab-hooks.md      # Detaillierte Hook-Referenz
            ├── components/
            │   └── README.md                   # Komponenten-Dokumentation
            └── adr/
                └── README.md                   # Architecture Decision Records
```

---

## Technologie-Stack

### Frontend

| Technologie | Version | Verwendung |
|------------|---------|------------|
| **React** | 18+ | UI-Framework |
| **Next.js** | 15.4.4 | App-Framework (SSR, Routing) |
| **TypeScript** | 5.x | Typsicherheit |
| **@tanstack/react-query** | 5.90.2 | Server State Management |
| **TailwindCSS** | 3.4.17 | Styling |
| **Heroicons** | 2.2.0 | Icons (24/outline) |

### Backend

| Technologie | Version | Verwendung |
|------------|---------|------------|
| **Firebase** | 11.9.1 | Backend-as-a-Service |
| **Firestore** | - | NoSQL-Datenbank |
| **firebase-admin** | 13.5.0 | Server-seitige Admin-SDK |

### Tooling

| Technologie | Version | Verwendung |
|------------|---------|------------|
| **Jest** | 30.0.5 | Unit-Testing |
| **@testing-library/react** | 16.3.0 | Component-Testing |
| **ESLint** | 8.x | Code-Linting |

---

## Performance-Optimierungen

### 1. React.memo

Alle Komponenten verwenden `React.memo` zur Vermeidung unnötiger Re-Renders:

```tsx
const ProjectStrategyTab = React.memo(function ProjectStrategyTab({ ... }) {
  // Component Logic
});

const StrategyTemplateGrid = React.memo(function StrategyTemplateGrid({ ... }) {
  // Component Logic
});

const TemplateCard = React.memo(function TemplateCard({ ... }) {
  // Component Logic
});
```

**Effekt**: Bei Tab-Wechsel oder Parent-Re-Renders werden Child-Komponenten nicht neu gerendert, wenn sich ihre Props nicht geändert haben.

### 2. useCallback für Handler

Handler-Funktionen werden mit `useCallback` stabilisiert:

```tsx
const handleTemplateSelect = useCallback((templateType: TemplateType, content?: string) => {
  // Handler-Logic
}, []);

const handleCloseEditor = useCallback(() => {
  // Close-Logic
}, []);
```

**Effekt**: Stabile Referenzen für Props → verhindert Re-Renders von Child-Komponenten.

### 3. useMemo für Arrays

Template-Cards werden nur einmal berechnet:

```tsx
const templateCards = useMemo<Array<{ id: TemplateType; icon: React.ComponentType }>>(() => [
  { id: 'blank', icon: DocumentTextIcon },
  { id: 'table', icon: TableCellsIcon },
  { id: 'company-profile', icon: BuildingOfficeIcon },
  { id: 'situation-analysis', icon: ChartBarIcon },
  { id: 'audience-analysis', icon: UsersIcon },
  { id: 'core-messages', icon: SpeakerWaveIcon },
], []);
```

**Effekt**: Array wird nicht bei jedem Render neu erstellt.

### 4. React Query Caching

- **staleTime**: 5 Minuten → Daten werden nicht ständig neu geladen
- **Automatische Invalidierung**: Bei Mutations (Create, Update, Delete) wird der Cache aktualisiert
- **Background Refetch**: Daten werden im Hintergrund aktualisiert

### 5. Lazy Loading

```tsx
const DocumentEditorModal = dynamic(() => import('../DocumentEditorModal'), { ssr: false });
```

**Effekt**:
- Initiales Bundle: **~-150 KB**
- Editor wird nur geladen, wenn benötigt
- Bessere Time-to-Interactive (TTI)

---

## Testing

### Test-Coverage

Das Modul verfügt über **umfassende Unit-Tests** für kritische Komponenten:

**StrategyTemplateGrid.test.tsx**: **100% Coverage**
- 11 Test-Cases
- Rendering aller 6 Template-Kacheln
- Template-Selection Handler
- Badge-Rendering (nur für Templates, nicht für blank/table)
- Accessibility (Focus-Styles)
- React.memo Re-Render Verhalten

### Tests ausführen

```bash
# Alle Tests
npm test

# Mit Coverage
npm run test:coverage

# Watch Mode
npm run test:watch
```

### Test-Beispiel

```typescript
it('should call onTemplateSelect with correct templateType and content on click', () => {
  render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

  const blankCard = screen.getByText('Neues Dokument erstellen');
  fireEvent.click(blankCard.closest('button')!);

  expect(mockOnTemplateSelect).toHaveBeenCalledWith('blank', '');
});
```

---

## Migration & Changelog

### Phase 0-4: Refactoring-Journey

**Phase 1: React Query Integration** (Abgeschlossen ✅)
- Migration von `useState` + `useEffect` zu React Query
- Implementierung von 4 Hooks: `useStrategyDocuments`, `useCreateStrategyDocument`, `useUpdateStrategyDocument`, `useArchiveStrategyDocument`
- Automatisches Caching mit 5-Minuten staleTime
- +147 Zeilen (Hook-Datei), -26 Zeilen (page.tsx)

**Phase 2: Code-Separation** (Abgeschlossen ✅)
- Keine Änderungen nötig → Code war bereits optimal strukturiert
- Klare Trennung von Concerns

**Phase 3: Performance-Optimierung** (Abgeschlossen ✅)
- `React.memo` für alle Komponenten (ProjectStrategyTab, StrategyTemplateGrid, TemplateCard)
- `useCallback` für 4 Handler-Funktionen
- `useMemo` für templateCards-Array
- Messbare Performance-Verbesserung bei Re-Renders

**Phase 4: Testing** (Abgeschlossen ✅)
- StrategyTemplateGrid.test.tsx mit 100% Coverage
- 11 Test-Cases für alle Features
- React.memo Re-Render Tests

### Weitere Verbesserungen

**Toast-Migration** (Abgeschlossen ✅)
- Migration von Custom-Toast zu `react-hot-toast`
- Zentralisierter Toast-Service (`ToastService`)
- Konsistente Toast-Benachrichtigungen

**Security Rules** (Abgeschlossen ✅)
- Firestore Security Rules für `strategy_documents` Collection
- Multi-Tenancy-Absicherung gegen Cross-Org-Zugriff

---

## Weiterführende Dokumentation

### API-Dokumentation
- **[API-Übersicht](./api/README.md)** - Übersicht aller Services und Hooks
- **[Hook-Referenz](./api/strategie-tab-hooks.md)** - Detaillierte Dokumentation der React Query Hooks

### Komponenten-Dokumentation
- **[Komponenten](./components/README.md)** - Dokumentation aller React-Komponenten

### Architecture Decision Records
- **[ADRs](./adr/README.md)** - Architektur-Entscheidungen und deren Begründung

### Externe Ressourcen
- [React Query Dokumentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Firebase Firestore Dokumentation](https://firebase.google.com/docs/firestore)
- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [CeleroPress Design System](../../design-system/DESIGN_SYSTEM.md)

---

## Support & Kontakt

Bei Fragen oder Problemen:
1. Konsultiere die [Troubleshooting-Sektion](./components/README.md#troubleshooting) in der Komponenten-Dokumentation
2. Prüfe die [ADRs](./adr/README.md) für Design-Entscheidungen
3. Erstelle ein Issue im Projekt-Repository

---

**Letzte Aktualisierung**: 25. Oktober 2025
**Dokumentiert von**: Claude AI (Anthropic)
**Status**: Produktiv ✅
