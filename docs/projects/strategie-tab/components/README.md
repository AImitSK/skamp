# Komponenten-Dokumentation - Strategie Tab

> **Modul**: Strategie Tab Komponenten
> **Version**: 0.1.0
> **Letzte Aktualisierung**: 25. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ProjectStrategyTab](#projectstrategytab)
- [StrategyTemplateGrid](#strategytemplategrid)
- [StrategyDocumentsTable](#strategydocumentstable)
- [TemplateCard (Sub-Komponente)](#templatecard-sub-komponente)
- [Performance-Optimierungen](#performance-optimierungen)
- [Styling-Richtlinien](#styling-richtlinien)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)

---

## Übersicht

Das Strategie Tab Modul besteht aus **3 Haupt-Komponenten**:

1. **ProjectStrategyTab** - Orchestrator-Komponente (State Management, Lazy Loading)
2. **StrategyTemplateGrid** - Template-Auswahl mit 6 Kacheln
3. **StrategyDocumentsTable** - Dokumente-Tabelle (aktuell ungenutzt, aber dokumentiert)

Alle Komponenten sind mit **React.memo** optimiert und verwenden **TypeScript** für Typsicherheit.

---

## ProjectStrategyTab

### Beschreibung

Die **ProjectStrategyTab**-Komponente ist die Haupt-Orchestrator-Komponente des Strategie Tab Moduls. Sie verwaltet den State für Editor-Modals und koordiniert die Kommunikation zwischen Template-Auswahl und Editoren.

**Verantwortlichkeiten:**
- State Management für Editor-Modals
- Lazy Loading der Editor-Komponenten
- Unterscheidung zwischen Document- und Spreadsheet-Templates
- Callback-Handling für Template-Auswahl und Dokument-Speicherung

### Props

```typescript
interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
  project?: {
    title: string;
    currentStage: any;
    customer?: { name: string };
  };
  dokumenteFolderId?: string;
  onDocumentSaved?: () => void;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `projectId` | `string` | Ja | ID des aktuellen Projekts |
| `organizationId` | `string` | Ja | ID der Organisation (Multi-Tenancy) |
| `project` | `object` | Nein | Projekt-Objekt mit Metadaten |
| `dokumenteFolderId` | `string` | Nein | Ordner-ID für Dokument-Speicherung |
| `onDocumentSaved` | `() => void` | Nein | Callback nach erfolgreichem Speichern |

### State Management

```typescript
// Document Editor State
const [showEditor, setShowEditor] = useState(false);
const [templateContent, setTemplateContent] = useState<string | null>(null);
const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

// Spreadsheet Editor State
const [showSpreadsheetEditor, setShowSpreadsheetEditor] = useState(false);
```

### Handler (mit useCallback)

#### handleTemplateSelect

```typescript
const handleTemplateSelect = useCallback((templateType: TemplateType, content?: string) => {
  const template = STRATEGY_TEMPLATES[templateType];

  if (templateType === 'table') {
    // Öffne Spreadsheet Editor
    setTemplateInfo({ type: templateType, name: template.title });
    setShowSpreadsheetEditor(true);
  } else {
    // Öffne Document Editor
    setTemplateContent(content || '');
    setTemplateInfo({ type: templateType, name: template.title });
    setShowEditor(true);
  }
}, []);
```

**Logic:**
- Unterscheidet zwischen `'table'` (Spreadsheet) und anderen Templates (Document)
- Setzt entsprechenden State für Modal-Anzeige
- Übergibt Template-Content an Editor

#### handleCloseEditor

```typescript
const handleCloseEditor = useCallback(() => {
  setShowEditor(false);
  setTemplateContent(null);
  setTemplateInfo(null);
}, []);
```

#### handleCloseSpreadsheetEditor

```typescript
const handleCloseSpreadsheetEditor = useCallback(() => {
  setShowSpreadsheetEditor(false);
  setTemplateInfo(null);
}, []);
```

#### handleDocumentSave

```typescript
const handleDocumentSave = useCallback(() => {
  setShowEditor(false);
  setShowSpreadsheetEditor(false);
  setTemplateContent(null);
  setTemplateInfo(null);
  // Aktualisiere das Ordnermodul
  if (onDocumentSaved) {
    onDocumentSaved();
  }
}, [onDocumentSaved]);
```

### Lazy Loading

Die Editor-Modals werden mit **next/dynamic** lazy geladen:

```typescript
const DocumentEditorModal = dynamic(
  () => import('../DocumentEditorModal'),
  { ssr: false }
);

const SpreadsheetEditorModal = dynamic(
  () => import('../SpreadsheetEditorModal'),
  { ssr: false }
);
```

**Vorteile:**
- Initiales Bundle: **~-150 KB**
- Editor wird nur geladen, wenn benötigt
- `ssr: false` verhindert Server-Side Rendering (Client-Only)

### Performance

Die Komponente ist mit **React.memo** optimiert:

```typescript
const ProjectStrategyTab = React.memo(function ProjectStrategyTab({ ... }) {
  // Component Logic
});
```

**Effekt**: Keine Re-Renders bei Tab-Wechsel oder Parent-Updates, wenn Props unverändert bleiben.

### Verwendungsbeispiele

#### Basis-Integration

```tsx
import ProjectStrategyTab from '@/components/projects/strategy/ProjectStrategyTab';

function ProjectPage({ project }) {
  return (
    <ProjectStrategyTab
      projectId={project.id}
      organizationId={project.organizationId}
      project={project}
      dokumenteFolderId={project.dokumenteFolderId}
    />
  );
}
```

#### Mit Callback

```tsx
function ProjectPageWithCallback({ project }) {
  const handleDocumentSaved = () => {
    console.log('Dokument gespeichert');
    // Ordner-Modul neu laden
    refetchFolders();
  };

  return (
    <ProjectStrategyTab
      projectId={project.id}
      organizationId={project.organizationId}
      project={project}
      dokumenteFolderId={project.dokumenteFolderId}
      onDocumentSaved={handleDocumentSaved}
    />
  );
}
```

#### In Tab-Navigation

```tsx
import { Tab } from '@headlessui/react';

function ProjectTabs({ project }) {
  return (
    <Tab.Group>
      <Tab.List>
        <Tab>Übersicht</Tab>
        <Tab>Strategie</Tab>
        <Tab>Dokumente</Tab>
      </Tab.List>

      <Tab.Panels>
        <Tab.Panel>
          <ProjectOverview project={project} />
        </Tab.Panel>

        <Tab.Panel>
          <ProjectStrategyTab
            projectId={project.id}
            organizationId={project.organizationId}
            project={project}
            dokumenteFolderId={project.dokumenteFolderId}
          />
        </Tab.Panel>

        <Tab.Panel>
          <DocumentsModule project={project} />
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  );
}
```

---

## StrategyTemplateGrid

### Beschreibung

Die **StrategyTemplateGrid**-Komponente zeigt **6 Template-Kacheln** an, aus denen User auswählen können. Sie ist die primäre Interaktionsfläche für die Dokument-Erstellung.

**Features:**
- 6 vorgefertigte Template-Kacheln
- Unterscheidung zwischen Basis-Templates (`blank`, `table`) und strategischen Templates
- Icons von Heroicons (24/outline)
- Responsive Grid-Layout

### Props

```typescript
interface StrategyTemplateGridProps {
  onTemplateSelect: (templateType: TemplateType, content?: string) => void;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `onTemplateSelect` | `(templateType, content?) => void` | Ja | Callback bei Template-Auswahl |

### Template-Kacheln

Die Komponente rendert folgende Templates:

| Template | Icon | Typ | Badge |
|----------|------|-----|-------|
| Neues Dokument erstellen | DocumentTextIcon | `blank` | ❌ |
| Leere Tabelle erstellen | TableCellsIcon | `table` | ❌ |
| Unternehmensprofil & Senderanalyse | BuildingOfficeIcon | `company-profile` | ✅ Vorlage |
| Situationsanalyse | ChartBarIcon | `situation-analysis` | ✅ Vorlage |
| Zielgruppenanalyse | UsersIcon | `audience-analysis` | ✅ Vorlage |
| Kernbotschaften & Kommunikationsziele | SpeakerWaveIcon | `core-messages` | ✅ Vorlage |

### useMemo für templateCards

Das Template-Array wird mit **useMemo** erstellt, um unnötige Re-Kreationen zu vermeiden:

```typescript
const templateCards = useMemo<Array<{
  id: TemplateType;
  icon: React.ComponentType<{ className?: string }>;
}>>(() => [
  { id: 'blank', icon: DocumentTextIcon },
  { id: 'table', icon: TableCellsIcon },
  { id: 'company-profile', icon: BuildingOfficeIcon },
  { id: 'situation-analysis', icon: ChartBarIcon },
  { id: 'audience-analysis', icon: UsersIcon },
  { id: 'core-messages', icon: SpeakerWaveIcon },
], []);
```

### Performance

Die Komponente ist mit **React.memo** optimiert:

```typescript
const StrategyTemplateGrid = React.memo(function StrategyTemplateGrid({ ... }) {
  // Component Logic
});
```

### Verwendungsbeispiele

#### Basis-Verwendung

```tsx
import StrategyTemplateGrid from '@/components/projects/strategy/StrategyTemplateGrid';

function StrategyPage() {
  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
    console.log('Template ausgewählt:', templateType);
    // Öffne Editor mit Template-Content
  };

  return (
    <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />
  );
}
```

#### Mit State Management

```tsx
function StrategyPageWithState() {
  const [selectedTemplate, setSelectedTemplate] = useState<{
    type: TemplateType;
    content: string;
  } | null>(null);

  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
    setSelectedTemplate({
      type: templateType,
      content: content || ''
    });
  };

  return (
    <div>
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

      {selectedTemplate && (
        <div>
          <h3>Ausgewählt: {selectedTemplate.type}</h3>
          <pre>{selectedTemplate.content}</pre>
        </div>
      )}
    </div>
  );
}
```

#### Mit Editor-Integration

```tsx
function StrategyPageWithEditor() {
  const [showEditor, setShowEditor] = useState(false);
  const [content, setContent] = useState('');

  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
    setContent(content || '');
    setShowEditor(true);
  };

  return (
    <>
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

      {showEditor && (
        <EditorModal
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          initialContent={content}
        />
      )}
    </>
  );
}
```

---

## StrategyDocumentsTable

### Beschreibung

Die **StrategyDocumentsTable**-Komponente zeigt eine Tabelle mit allen Strategiedokumenten eines Projekts an. Sie ist aktuell **nicht im ProductStrategyTab integriert**, aber vollständig implementiert und dokumentiert.

**Features:**
- Tabellarische Darstellung von Dokumenten
- Status-Badges (Draft, Review, Approved, Archived)
- Typ-Badges (Briefing, Strategy, Analysis, Notes)
- Dropdown-Menü für Aktionen (Bearbeiten, Löschen)
- Loading-States mit Skeleton
- Empty-States

### Props

```typescript
interface StrategyDocumentsTableProps {
  documents: UnifiedStrategyDocument[];
  onEdit: (document: UnifiedStrategyDocument) => void;
  onDelete: (documentId: string) => void;
  loading: boolean;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `documents` | `UnifiedStrategyDocument[]` | Ja | Array von Dokumenten |
| `onEdit` | `(document) => void` | Ja | Callback für Bearbeiten-Aktion |
| `onDelete` | `(documentId) => void` | Ja | Callback für Löschen-Aktion |
| `loading` | `boolean` | Ja | Loading-State |

### UnifiedStrategyDocument Interface

```typescript
interface UnifiedStrategyDocument extends StrategyDocument {
  source?: 'strategy' | 'folder';
  assetId?: string;
  contentRef?: string;
}
```

### Helper-Funktionen

#### formatDate

```typescript
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';

  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return 'Unbekannt';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
```

**Beispiel-Output**: `25. Okt 2025`

#### getStatusColor

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'zinc';
    case 'review': return 'amber';
    case 'approved': return 'green';
    case 'archived': return 'zinc';
    default: return 'zinc';
  }
};
```

#### getStatusLabel

```typescript
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Entwurf';
    case 'review': return 'In Prüfung';
    case 'approved': return 'Freigegeben';
    case 'archived': return 'Archiviert';
    default: return status;
  }
};
```

#### getTypeLabel

```typescript
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'briefing': return 'Briefing';
    case 'strategy': return 'Strategie';
    case 'analysis': return 'Analyse';
    case 'notes': return 'Notizen';
    default: return type;
  }
};
```

### Loading State

```tsx
if (loading) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Empty State

```tsx
if (documents.length === 0) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <p className="text-gray-500 mb-2">Noch keine Strategiedokumente erstellt</p>
      <p className="text-sm text-gray-400">
        Verwenden Sie eine der Vorlagen oben, um zu beginnen.
      </p>
    </div>
  );
}
```

### Performance

Die Komponente ist mit **React.memo** optimiert:

```typescript
const StrategyDocumentsTable = React.memo(function StrategyDocumentsTable({ ... }) {
  // Component Logic
});
```

### Verwendungsbeispiele

#### Basis-Verwendung

```tsx
import { useStrategyDocuments } from '@/lib/hooks/useStrategyDocuments';
import StrategyDocumentsTable from '@/components/projects/strategy/StrategyDocumentsTable';

function DocumentsPage({ projectId, organizationId }) {
  const { data: documents, isLoading } = useStrategyDocuments(projectId, organizationId);

  const handleEdit = (document) => {
    console.log('Bearbeite Dokument:', document.id);
    // Öffne Editor
  };

  const handleDelete = (documentId) => {
    if (confirm('Dokument wirklich löschen?')) {
      // Lösche Dokument
    }
  };

  return (
    <StrategyDocumentsTable
      documents={documents || []}
      onEdit={handleEdit}
      onDelete={handleDelete}
      loading={isLoading}
    />
  );
}
```

#### Mit Mutation Hooks

```tsx
import { useArchiveStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function DocumentsPageWithMutation({ projectId, organizationId, userId }) {
  const { data: documents, isLoading } = useStrategyDocuments(projectId, organizationId);
  const { mutate: archiveDocument } = useArchiveStrategyDocument();

  const [editingDocument, setEditingDocument] = useState(null);

  const handleEdit = (document) => {
    setEditingDocument(document);
  };

  const handleDelete = (documentId) => {
    if (confirm('Dokument wirklich archivieren?')) {
      archiveDocument({
        id: documentId,
        projectId,
        organizationId,
        userId
      });
    }
  };

  return (
    <>
      <StrategyDocumentsTable
        documents={documents || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      {editingDocument && (
        <EditorModal
          document={editingDocument}
          onClose={() => setEditingDocument(null)}
        />
      )}
    </>
  );
}
```

---

## TemplateCard (Sub-Komponente)

### Beschreibung

Die **TemplateCard**-Komponente ist eine Sub-Komponente von `StrategyTemplateGrid` und repräsentiert eine einzelne Template-Kachel.

**Features:**
- Icon-Display
- Titel und Beschreibung
- "Vorlage"-Badge (nur für Templates, nicht für blank/table)
- Hover-Effekte
- Focus-Styles für Accessibility

### Props

```typescript
interface TemplateCardProps {
  id: TemplateType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}
```

### Template-Erkennung

```typescript
const isTemplate = id !== 'blank' && id !== 'table';
```

**Effekt**: Badge wird nur für strategische Templates angezeigt.

### Styling

```tsx
<button
  onClick={onClick}
  className={`w-full text-left border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
    isTemplate ? 'bg-gradient-to-br from-blue-50 to-white' : 'bg-white'
  }`}
>
```

**Klassen:**
- `border-gray-200` - Standard-Border
- `hover:border-gray-300 hover:shadow-sm` - Hover-Effekt
- `focus:ring-2 focus:ring-[#005fab]` - Focus-Ring (Accessibility)
- `bg-gradient-to-br from-blue-50 to-white` - Gradient für Templates
- `bg-white` - Weißer Hintergrund für blank/table

### Performance

Die Komponente ist mit **React.memo** optimiert:

```typescript
const TemplateCard = React.memo(function TemplateCard({ ... }) {
  // Component Logic
});
```

---

## Performance-Optimierungen

### 1. React.memo

Alle Komponenten verwenden `React.memo`:

```typescript
const ProjectStrategyTab = React.memo(function ProjectStrategyTab({ ... }) { ... });
const StrategyTemplateGrid = React.memo(function StrategyTemplateGrid({ ... }) { ... });
const TemplateCard = React.memo(function TemplateCard({ ... }) { ... });
const StrategyDocumentsTable = React.memo(function StrategyDocumentsTable({ ... }) { ... });
```

**Effekt**: Keine Re-Renders bei unverändertem Props.

### 2. useCallback für Handler

Alle Handler in `ProjectStrategyTab` nutzen `useCallback`:

```typescript
const handleTemplateSelect = useCallback((...) => { ... }, []);
const handleCloseEditor = useCallback((...) => { ... }, []);
const handleCloseSpreadsheetEditor = useCallback((...) => { ... }, []);
const handleDocumentSave = useCallback((...) => { ... }, [onDocumentSaved]);
```

**Effekt**: Stabile Referenzen → Child-Komponenten rendern nicht neu.

### 3. useMemo für Arrays

```typescript
const templateCards = useMemo(() => [...], []);
```

**Effekt**: Array wird nur einmal erstellt.

### 4. Lazy Loading

```typescript
const DocumentEditorModal = dynamic(() => import('../DocumentEditorModal'), { ssr: false });
```

**Effekt**: Initiales Bundle: **~-150 KB**.

---

## Styling-Richtlinien

### Tailwind CSS Classes

Alle Komponenten verwenden **Tailwind CSS** für Styling:

```tsx
// Container
<div className="mb-8">

// Grid-Layout (responsive)
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

// Button mit Hover
<button className="hover:border-gray-300 hover:shadow-sm">

// Focus-Styles (Accessibility)
<button className="focus:outline-none focus:ring-2 focus:ring-[#005fab]">
```

### CeleroPress Design System

**Farben:**
- Primary: `#005fab` (Blau)
- Gray-Töne: `gray-50`, `gray-200`, `gray-300`, `gray-600`, `gray-900`

**Badge-Farben:**
- `zinc` - Draft, Archived
- `amber` - Review
- `green` - Approved
- `blue` - Type-Badges

### Heroicons

Alle Icons stammen aus **@heroicons/react/24/outline**:

```tsx
import {
  DocumentTextIcon,
  TableCellsIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UsersIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
```

**Icon-Größe**: `w-8 h-8` für Template-Icons.

---

## Accessibility

### Focus Management

Alle interaktiven Elemente haben **Focus-Styles**:

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
```

### Screen Reader Support

```tsx
<th className="relative px-6 py-3">
  <span className="sr-only">Aktionen</span>
</th>
```

### Keyboard Navigation

- **Tab**: Navigiert durch Template-Kacheln
- **Enter/Space**: Aktiviert Template-Auswahl
- **Escape**: Schließt Modals (implementiert in Editor-Modals)

---

## Troubleshooting

### Problem: Templates werden nicht angezeigt

**Symptom**: StrategyTemplateGrid zeigt leeres Grid

**Lösung**: Prüfe, ob `STRATEGY_TEMPLATES` importiert ist:
```tsx
import { STRATEGY_TEMPLATES } from '@/constants/strategy-templates';
```

---

### Problem: Editor-Modal öffnet sich nicht

**Symptom**: Nach Template-Auswahl passiert nichts

**Lösung 1**: Prüfe, ob `dokumenteFolderId` übergeben wurde:
```tsx
<ProjectStrategyTab dokumenteFolderId={project.dokumenteFolderId} />
```

**Lösung 2**: Prüfe Browser-Console auf Lazy-Loading-Fehler.

---

### Problem: Performance-Issues bei vielen Dokumenten

**Symptom**: StrategyDocumentsTable lädt langsam

**Lösung**: Implementiere Pagination oder Virtualisierung:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

### Problem: Styling passt nicht zum Design System

**Symptom**: Komponenten sehen anders aus als erwartet

**Lösung**: Prüfe, ob Tailwind CSS korrekt konfiguriert ist:
```bash
npm run build
```

---

## Testing

### StrategyTemplateGrid Tests

Die Komponente hat **100% Coverage** mit 11 Test-Cases:

```typescript
describe('StrategyTemplateGrid Component', () => {
  it('should render all 6 template cards', () => { ... });
  it('should call onTemplateSelect with correct templateType and content on click', () => { ... });
  it('should display "Vorlage" badge only for template cards', () => { ... });
  it('should have focus ring styles for accessibility', () => { ... });
  it('should apply gradient background to template cards', () => { ... });
  it('should prevent re-renders with React.memo', () => { ... });
});
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

### Tests ausführen

```bash
# Alle Tests
npm test

# Mit Coverage
npm run test:coverage

# Spezifischer Test
npm test -- StrategyTemplateGrid
```

---

**Letzte Aktualisierung**: 25. Oktober 2025
**Dokumentiert von**: Claude AI (Anthropic)
