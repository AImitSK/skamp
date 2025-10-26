# Komponenten-Dokumentation - Verteiler-Tab

> **Modul**: Verteiler-Tab Komponenten
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 26. Oktober 2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Hauptkomponenten](#hauptkomponenten)
- [Sub-Komponenten](#sub-komponenten)
- [Detail-Komponenten](#detail-komponenten)
- [Props-Referenz](#props-referenz)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Performance](#performance)
- [Styling-Guidelines](#styling-guidelines)

---

## Übersicht

Der Verteiler-Tab besteht aus **3 Hauptkomponenten** und **13 Sub-Komponenten**:

### Komponenten-Struktur

```
src/components/projects/distribution/
├── ProjectDistributionLists.tsx       # 386 Zeilen - Orchestrator
├── MasterListBrowser.tsx              # 178 Zeilen - Master-Listen Browser
├── ListDetailsModal.tsx               # 132 Zeilen - Details Modal
├── components/
│   ├── ListSearchBar.tsx              # 56 Zeilen - Suchfeld
│   ├── ListFilterButton.tsx           # 170 Zeilen - Filter Popover
│   ├── ListTableHeader.tsx            # 33 Zeilen - Tabellen-Header
│   ├── EmptyListState.tsx             # 45 Zeilen - Empty State
│   ├── ListStatsBar.tsx               # 28 Zeilen - Statistik-Anzeige
│   ├── LoadingSpinner.tsx             # 21 Zeilen - Loading State
│   ├── ProjectListRow.tsx             # 145 Zeilen - Projekt-Listen-Zeile
│   ├── MasterListRow.tsx              # 128 Zeilen - Master-Listen-Zeile
│   ├── ListPagination.tsx             # 94 Zeilen - Pagination
│   └── details/
│       ├── ListInfoHeader.tsx         # 57 Zeilen - Info-Header
│       ├── ListFiltersDisplay.tsx     # 115 Zeilen - Filter-Anzeige
│       ├── ListContactsPreview.tsx    # 169 Zeilen - Kontakte-Vorschau
│       └── EmptyContactsState.tsx     # 39 Zeilen - Empty State (Kontakte)
```

---

## Hauptkomponenten

### ProjectDistributionLists

**Datei:** `src/components/projects/distribution/ProjectDistributionLists.tsx`
**Zeilen:** 386
**Rolle:** Orchestrator

#### Props
```typescript
interface Props {
  projectId: string;
  organizationId: string;
}
```

#### Features
- Lädt Projekt-Listen und Master-Listen
- Verwaltet State (Search, Filter, Modals)
- CRUD-Operationen (Link, Create, Update, Delete)
- CSV-Export
- Performance-Optimierungen (useCallback, useMemo, Debouncing)

#### State
```typescript
const [projectLists, setProjectLists] = useState<ProjectDistributionList[]>([]);
const [masterLists, setMasterLists] = useState<DistributionList[]>([]);
const [masterListDetails, setMasterListDetails] = useState<Map<string, DistributionList>>(new Map());
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
const [selectedList, setSelectedList] = useState<ProjectDistributionList | null>(null);
const [detailsModalOpen, setDetailsModalOpen] = useState(false);
const [editingList, setEditingList] = useState<ProjectDistributionList | null>(null);
const [showEditModal, setShowEditModal] = useState(false);
const [showCreateModal, setShowCreateModal] = useState(false);
```

#### Verwendung
```tsx
import ProjectDistributionLists from '@/components/projects/distribution/ProjectDistributionLists';

<ProjectDistributionLists
  projectId={project.id}
  organizationId={user.organizationId}
/>
```

---

### MasterListBrowser

**Datei:** `src/components/projects/distribution/MasterListBrowser.tsx`
**Zeilen:** 178
**Rolle:** Browser für verfügbare Master-Listen

#### Props
```typescript
interface Props {
  lists: DistributionList[];
  linkedListIds?: string[];
  onLink: (listId: string) => void;
  onUnlink?: (listId: string) => void;
}
```

#### Features
- Zeigt alle verfügbaren Master-Listen
- Pagination (10 Listen pro Seite)
- Search & Filter
- Toggle für Verknüpfung/Entfernung
- Status-Anzeige (verknüpft/nicht verknüpft)

#### State
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [selectedList, setSelectedList] = useState<DistributionList | null>(null);
const [modalOpen, setModalOpen] = useState(false);
const itemsPerPage = 10;
```

#### Verwendung
```tsx
<MasterListBrowser
  lists={masterLists}
  linkedListIds={linkedListIds}
  onLink={handleLinkMasterList}
  onUnlink={handleUnlinkList}
/>
```

---

### ListDetailsModal

**Datei:** `src/components/projects/distribution/ListDetailsModal.tsx`
**Zeilen:** 132
**Rolle:** Modal für detaillierte Listen-Informationen

#### Props
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  list: DistributionList | ProjectDistributionList | null;
  type: 'master' | 'project';
}
```

#### Features
- Zeigt Listen-Informationen (Name, Kategorie, Typ, Kontakte)
- Rendert Filter-Anzeige (bei dynamischen Listen)
- Kontakte-Vorschau (erste 5 Kontakte)
- Lädt Zusatzdaten (Tags, Publikationen) für Filter-Rendering

#### State
```typescript
const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
const [tags, setTags] = useState<Tag[]>([]);
const [publications, setPublications] = useState<Publication[]>([]);
const [loading, setLoading] = useState(false);
```

#### Type Guards
```typescript
const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);
```

#### Verwendung
```tsx
<ListDetailsModal
  open={detailsModalOpen}
  onClose={() => setDetailsModalOpen(false)}
  list={selectedList}
  type="project"
/>
```

---

## Sub-Komponenten

### ListSearchBar

**Datei:** `src/components/projects/distribution/components/ListSearchBar.tsx`
**Zeilen:** 56

#### Props
```typescript
interface ListSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

#### Features
- Suchfeld mit Icon (MagnifyingGlassIcon)
- Clear-Button (wenn nicht leer)
- Accessibility (aria-label)
- Design System compliant

#### Verwendung
```tsx
<ListSearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Suchen..."
/>
```

---

### ListFilterButton

**Datei:** `src/components/projects/distribution/components/ListFilterButton.tsx`
**Zeilen:** 170

#### Props
```typescript
interface FilterOption {
  value: string;
  label: string;
}

interface ListFilterButtonProps {
  categoryOptions: FilterOption[];
  typeOptions: FilterOption[];
  selectedCategories: string[];
  selectedTypes: string[];
  onCategoryChange: (values: string[]) => void;
  onTypeChange: (values: string[]) => void;
  onReset: () => void;
}
```

#### Features
- Popover mit Headless UI Transition
- Kategorie- und Typ-Filter (Checkboxen)
- Aktive Filter Badge
- Reset-Button
- Responsive Design

#### Verwendung
```tsx
<ListFilterButton
  categoryOptions={categoryOptions}
  typeOptions={projectListTypeOptions}
  selectedCategories={selectedCategories}
  selectedTypes={selectedTypes}
  onCategoryChange={setSelectedCategories}
  onTypeChange={setSelectedTypes}
  onReset={() => {
    setSelectedCategories([]);
    setSelectedTypes([]);
  }}
/>
```

---

### ProjectListRow

**Datei:** `src/components/projects/distribution/components/ProjectListRow.tsx`
**Zeilen:** 145

#### Props
```typescript
interface ProjectListRowProps {
  list: ProjectDistributionList;
  masterListDetails?: DistributionList;
  onViewDetails: () => void;
  onEdit?: () => void;
  onExport: () => void;
  onDelete: () => void;
}
```

#### Features
- Kompakte Zeilen-Darstellung
- Badges (Typ, Kategorie, Listen-Typ)
- Actions-Dropdown (Bearbeiten, Exportieren, Löschen)
- Hover-Effekt
- React.memo für Performance

#### Spalten
- Name (35%) - mit Typ-Badge
- Kategorie (15%) - Badge
- Typ (15%) - Dynamisch/Statisch Badge
- Kontakte (12%) - Anzahl
- Datum (flex-1) - Hinzugefügt-Datum

#### Verwendung
```tsx
<ProjectListRow
  list={list}
  masterListDetails={masterListDetails.get(list.masterListId)}
  onViewDetails={() => handleViewDetails(list)}
  onEdit={list.type === 'custom' ? () => handleEditList(list) : undefined}
  onExport={() => handleExportList(list)}
  onDelete={() => handleUnlinkList(list.id!)}
/>
```

---

### MasterListRow

**Datei:** `src/components/projects/distribution/components/MasterListRow.tsx`
**Zeilen:** 128

#### Props
```typescript
interface MasterListRowProps {
  list: DistributionList;
  isLinked: boolean;
  onViewDetails: () => void;
  onToggleLink: () => void;
}
```

#### Features
- Stern-Icon für verknüpfte Listen (gefüllt/ungefüllt)
- Dynamische Liste Indicator (ArrowPathIcon)
- Toggle-Button für Verknüpfung
- Beschreibung (falls vorhanden)

#### Spalten
- Name (35%) - mit Beschreibung
- Kategorie (15%)
- Typ (15%) - mit Icon für dynamische Listen
- Kontakte (12%)
- Aktualisiert (flex-1)
- Link-Button

#### Verwendung
```tsx
<MasterListRow
  list={list}
  isLinked={linkedListIds.includes(list.id!)}
  onViewDetails={() => handleViewDetails(list)}
  onToggleLink={() => handleToggleLink(list.id!)}
/>
```

---

### ListTableHeader

**Datei:** `src/components/projects/distribution/components/ListTableHeader.tsx`
**Zeilen:** 33

#### Props
```typescript
interface Column {
  label: string;
  width: string;
}

interface ListTableHeaderProps {
  columns: Column[];
}
```

#### Features
- Flexible Spalten-Konfiguration
- Uppercase Labels
- Graues Background

#### Verwendung
```tsx
<ListTableHeader
  columns={[
    { label: 'Name', width: 'w-[35%]' },
    { label: 'Kategorie', width: 'w-[15%]' },
    { label: 'Typ', width: 'w-[15%]' },
    { label: 'Kontakte', width: 'w-[12%]' },
    { label: 'Hinzugefügt', width: 'flex-1' },
  ]}
/>
```

---

### EmptyListState

**Datei:** `src/components/projects/distribution/components/EmptyListState.tsx`
**Zeilen:** 45

#### Props
```typescript
interface EmptyListStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### Features
- Wiederverwendbarer Empty State
- Icon + Titel + Beschreibung
- Optionaler Action-Button

#### Verwendung
```tsx
<EmptyListState
  icon={UsersIcon}
  title="Keine Listen gefunden"
  description="Versuchen Sie andere Suchbegriffe"
/>

// Mit Action
<EmptyListState
  icon={UsersIcon}
  title="Noch keine Listen"
  description="Erstellen Sie Ihre erste Liste"
  action={{
    label: 'Neue Liste erstellen',
    onClick: () => setShowCreateModal(true)
  }}
/>
```

---

### ListStatsBar

**Datei:** `src/components/projects/distribution/components/ListStatsBar.tsx`
**Zeilen:** 28

#### Props
```typescript
interface ListStatsBarProps {
  filteredCount: number;
  totalCount: number;
  itemLabel?: string;
}
```

#### Features
- Zeigt Anzahl gefilterte/gesamt Items
- Konfigurierbares Label

#### Verwendung
```tsx
<ListStatsBar
  filteredCount={filteredProjectLists.length}
  totalCount={projectLists.length}
  itemLabel="Listen"
/>
// → "5 von 10 Listen"
```

---

### LoadingSpinner

**Datei:** `src/components/projects/distribution/components/LoadingSpinner.tsx`
**Zeilen:** 21

#### Props
```typescript
interface LoadingSpinnerProps {
  message?: string;
}
```

#### Features
- Zentrierter Spinner
- Optionale Nachricht
- Design System compliant

#### Verwendung
```tsx
if (loading) {
  return <LoadingSpinner message="Lade Verteilerlisten..." />;
}
```

---

### ListPagination

**Datei:** `src/components/projects/distribution/components/ListPagination.tsx`
**Zeilen:** 94

#### Props
```typescript
interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

#### Features
- Vorherige/Nächste Buttons
- Seiten-Nummern (intelligent gekürzt bei >7 Seiten)
- Disabled States
- Accessibility

#### Logik
```typescript
// Bei > 7 Seiten: Intelligente Kürzung
if (totalPages > 7) {
  if (currentPage <= 4) {
    // [1] [2] [3] [4] [5] ... [10]
  } else if (currentPage >= totalPages - 3) {
    // [1] ... [6] [7] [8] [9] [10]
  } else {
    // [1] ... [4] [5] [6] ... [10]
  }
}
```

#### Verwendung
```tsx
<ListPagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
/>
```

---

## Detail-Komponenten

### ListInfoHeader

**Datei:** `src/components/projects/distribution/components/details/ListInfoHeader.tsx`
**Zeilen:** 57

#### Props
```typescript
interface ListInfoHeaderProps {
  listName: string;
  listCategory: string;
  listType: string;
  contactCount: number;
  listDescription?: string;
}
```

#### Features
- Listen-Beschreibung (falls vorhanden)
- Kategorie-Badge
- Typ-Badge (Dynamisch/Statisch)
- Kontaktanzahl

#### Verwendung
```tsx
<ListInfoHeader
  listName="Tech-Journalisten"
  listCategory="press"
  listType="dynamic"
  contactCount={42}
  listDescription="Alle Technologie-Journalisten in DACH"
/>
```

---

### ListFiltersDisplay

**Datei:** `src/components/projects/distribution/components/details/ListFiltersDisplay.tsx`
**Zeilen:** 115

#### Props
```typescript
interface ListFiltersDisplayProps {
  filters: any;
  tags: Tag[];
  publications: Publication[];
}
```

#### Features
- Basis-Filter (Kontakt-Filter) Rendering
- Publikations-Filter Rendering
- Icon + Label + formatierter Wert
- Gruppierung nach Typ
- Nutzt filter-helpers.ts

#### Filter-Struktur
```typescript
{
  // Basis-Filter
  companyTypes?: string[];
  industries?: string[];
  countries?: string[];
  tagIds?: string[];
  positions?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  beats?: string[];

  // Publikations-Filter
  publications?: {
    publicationIds?: string[];
    types?: string[];
    frequencies?: string[];
    // ...
  };
}
```

#### Verwendung
```tsx
<ListFiltersDisplay
  filters={list.filters}
  tags={tags}
  publications={publications}
/>
```

---

### ListContactsPreview

**Datei:** `src/components/projects/distribution/components/details/ListContactsPreview.tsx`
**Zeilen:** 169

#### Props
```typescript
interface ListContactsPreviewProps {
  contacts: ContactEnhanced[];
  contactCount: number;
  loading: boolean;
}
```

#### Features
- Zeigt erste 5 Kontakte
- Name, Position, Firma, E-Mail, Telefon
- Fallback-Handling für fehlende Daten
- Loading State
- Kompakte Darstellung

#### Name-Parsing
```typescript
// Unterstützt nested und flat structure
const name = 'name' in contact && typeof contact.name === 'object'
  ? `${contact.name.firstName} ${contact.name.lastName}`
  : `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
```

#### Verwendung
```tsx
<ListContactsPreview
  contacts={contacts}
  contactCount={contactCount}
  loading={loading}
/>
```

---

### EmptyContactsState

**Datei:** `src/components/projects/distribution/components/details/EmptyContactsState.tsx`
**Zeilen:** 39

#### Props
```typescript
interface EmptyContactsStateProps {
  listType: string;
}
```

#### Features
- Dynamische Message basierend auf Listen-Typ
- Icon (UsersIcon)
- Hilfetext

#### Messages
```typescript
const message = listType === 'dynamic'
  ? 'Noch keine Kontakte entsprechen den Filterkriterien.'
  : 'Noch keine Kontakte hinzugefügt.';
```

#### Verwendung
```tsx
{contacts.length === 0 && (
  <EmptyContactsState listType={list.type} />
)}
```

---

## Props-Referenz

### Gemeinsame Patterns

#### Listen-Props
```typescript
// Alle Listen-Komponenten erwarten eine Liste
list: ProjectDistributionList | DistributionList

// Optional: Master-Listen-Details für verknüpfte Listen
masterListDetails?: DistributionList
```

#### Event-Handler Props
```typescript
// Standard-Pattern
onViewDetails: () => void
onEdit?: () => void  // Optional
onDelete: () => void
onExport: () => void

// Toggle-Pattern
onToggleLink: () => void

// Change-Pattern
onChange: (value: T) => void
onCategoryChange: (values: string[]) => void
```

#### State-Props
```typescript
// Selection
selected: boolean
isLinked: boolean

// Loading/Empty States
loading: boolean
contacts: ContactEnhanced[]
```

---

## Verwendungsbeispiele

### Vollständige Integration

```tsx
import ProjectDistributionLists from '@/components/projects/distribution/ProjectDistributionLists';

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const projectId = params.id;

  if (!user?.organizationId) {
    return <div>Bitte anmelden</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1>Projekt-Verteiler</h1>
      <ProjectDistributionLists
        projectId={projectId}
        organizationId={user.organizationId}
      />
    </div>
  );
}
```

### Custom Filter-Handling

```tsx
function CustomListFilter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      // Search
      if (searchTerm && !list.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(list.category)) {
        return false;
      }

      // Types
      if (selectedTypes.length > 0 && !selectedTypes.includes(list.type)) {
        return false;
      }

      return true;
    });
  }, [lists, searchTerm, selectedCategories, selectedTypes]);

  return (
    <>
      <div className="flex gap-2">
        <ListSearchBar value={searchTerm} onChange={setSearchTerm} />
        <ListFilterButton
          categoryOptions={categoryOptions}
          typeOptions={typeOptions}
          selectedCategories={selectedCategories}
          selectedTypes={selectedTypes}
          onCategoryChange={setSelectedCategories}
          onTypeChange={setSelectedTypes}
          onReset={() => {
            setSelectedCategories([]);
            setSelectedTypes([]);
          }}
        />
      </div>

      {filteredLists.length > 0 && (
        <ListStatsBar
          filteredCount={filteredLists.length}
          totalCount={lists.length}
        />
      )}
    </>
  );
}
```

---

## Performance

### React.memo Komponenten

Alle Sub-Komponenten verwenden `React.memo` zur Vermeidung unnötiger Re-Renders:

```typescript
const ListSearchBar = memo(function ListSearchBar({ ... }) {
  // ...
});

const ProjectListRow = memo(function ProjectListRow({ ... }) {
  // ...
});
```

### useCallback für Event-Handler

```typescript
const handleViewDetails = useCallback((list: ProjectDistributionList) => {
  setSelectedList(list);
  setDetailsModalOpen(true);
}, []);
```

### useMemo für Computed Values

```typescript
const filteredLists = useMemo(() => {
  return lists.filter(/* ... */);
}, [lists, searchTerm, filters]);
```

### Performance-Metriken

| Komponente | Initial Render | Re-Render (Props-Änderung) |
|------------|----------------|----------------------------|
| ProjectDistributionLists | 180ms | 20-30ms |
| MasterListBrowser | 80ms | 15-25ms |
| ListDetailsModal | 120ms | 30-40ms |
| ProjectListRow | 5ms | 2-3ms |
| MasterListRow | 4ms | 2ms |

---

## Styling-Guidelines

### Design System Compliance

Alle Komponenten folgen dem CeleroPress Design System:

#### Farben
```typescript
// Primary Color
className="bg-[#005fab] hover:bg-[#004a8c] text-white"

// Neutral (Zinc-Palette)
className="bg-zinc-50 border-zinc-300 text-zinc-700"
```

#### Höhen
```typescript
// Konsistente Höhe für Inputs/Buttons
className="h-10"
```

#### Focus States
```typescript
className="focus:outline-none focus:ring-2 focus:ring-primary"
```

#### Icons
```typescript
// Nur /24/outline Icons
import { UsersIcon, PlusIcon } from '@heroicons/react/24/outline';
```

### Responsive Design

```tsx
// Flex-Layouts mit sm: Breakpoints
<div className="flex flex-col sm:flex-row gap-4">
  {/* ... */}
</div>

// Adaptive Widths
<div className="w-full sm:w-auto">
  {/* ... */}
</div>
```

### Accessibility

```tsx
// ARIA Labels
<button
  aria-label="Liste löschen"
  aria-describedby="delete-help-text"
>
  <TrashIcon />
</button>

// ARIA Hidden für dekorative Icons
<MagnifyingGlassIcon aria-hidden="true" />
```

---

## Siehe auch

- [Hauptdokumentation](../README.md)
- [API-Dokumentation](../api/README.md)
- [Architecture Decision Records](../adr/README.md)
- [Design System](../../../design-system/DESIGN_SYSTEM.md)

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Team
