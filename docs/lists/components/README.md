# Listen Components Guide

**Version:** 1.0
**Letzte Aktualisierung:** 2025-10-14

---

## Übersicht

Dokumentation aller React-Komponenten des Listen-Moduls. Umfasst Shared Components, Modal Sections und Main Pages.

---

## Komponenten-Struktur

```
src/app/dashboard/contacts/lists/
├── page.tsx                        # Main Lists Overview
├── [listId]/page.tsx              # List Detail Page
├── components/
│   ├── shared/                     # Shared Components
│   │   ├── Alert.tsx               # Notification Component
│   │   ├── ConfirmDialog.tsx       # Confirmation Dialog
│   │   └── EmptyState.tsx          # Empty State Component
│   ├── modals/
│   │   └── ContactSelectorModal.tsx  # Contact Selection
│   └── sections/                   # ListModal Sections
│       ├── index.tsx                      # Main ListModal Component
│       ├── types.ts                       # Shared Types & Helpers
│       ├── BasicInfoSection.tsx           # Basic Info Fields
│       ├── CompanyFiltersSection.tsx      # Company Filters
│       ├── PersonFiltersSection.tsx       # Person Filters
│       ├── JournalistFiltersSection.tsx   # Journalist Filters
│       ├── PreviewSection.tsx             # Live Preview
│       └── ContactSelectorSection.tsx     # Contact Selection
└── PublicationFilterSection.tsx    # Publication Filters
```

---

## Shared Components

### Alert

**Pfad:** `src/app/dashboard/contacts/lists/components/shared/Alert.tsx`
**Zeilen:** 85
**Tests:** 7/7 passing

Wiederverwendbare Benachrichtigungskomponente für Erfolg, Fehler, Warnungen und Informationen.

#### Props

```typescript
interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### Verwendung

```typescript
<Alert
  type="success"
  title="Liste erstellt"
  message="Die Liste wurde erfolgreich erstellt."
/>

<Alert
  type="error"
  title="Fehler beim Löschen"
  message="Die Liste konnte nicht gelöscht werden."
  action={{
    label: 'Erneut versuchen',
    onClick: () => retry()
  }}
/>
```

#### Styling

- **Info (default):** Blauer Hintergrund mit InformationCircleIcon
- **Success:** Grüner Hintergrund mit CheckCircleIcon
- **Warning:** Gelber Hintergrund mit ExclamationTriangleIcon
- **Error:** Roter Hintergrund mit XCircleIcon

#### Use Cases

- Feedback nach CRUD-Operationen
- Error-Anzeige bei fehlgeschlagenen Requests
- Info-Messages für User-Guidance

---

### ConfirmDialog

**Pfad:** `src/app/dashboard/contacts/lists/components/shared/ConfirmDialog.tsx`
**Zeilen:** 70
**Tests:** 8/8 passing

Wiederverwendbarer Bestätigungsdialog für kritische Aktionen.

#### Props

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}
```

#### Verwendung

```typescript
<ConfirmDialog
  isOpen={showDeleteDialog}
  title="Liste löschen?"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  type="danger"
  onConfirm={() => handleDelete()}
  onCancel={() => setShowDeleteDialog(false)}
/>

<ConfirmDialog
  isOpen={showWarning}
  title="Ungespeicherte Änderungen"
  message="Möchten Sie fortfahren ohne zu speichern?"
  type="warning"
  confirmLabel="Fortfahren"
  cancelLabel="Zurück"
  onConfirm={() => closeModal()}
  onCancel={() => setShowWarning(false)}
/>
```

#### Styling

- **Danger (default):** Roter Bestätigungs-Button ("Löschen")
- **Warning:** Gelber Bestätigungs-Button ("Bestätigen")
- Custom Labels überschreiben Defaults

#### Use Cases

- Listen löschen
- Bulk-Delete Bestätigung
- Ungespeicherte Änderungen
- Kritische Aktionen

---

### EmptyState

**Pfad:** `src/app/dashboard/contacts/lists/components/shared/EmptyState.tsx`
**Zeilen:** 40
**Tests:** 4/4 passing

Einheitliche Komponente für Leerzustände mit optionalem Call-to-Action.

#### Props

```typescript
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
}
```

#### Verwendung

```typescript
<EmptyState
  icon={FolderIcon}
  title="Keine Listen vorhanden"
  description="Erstellen Sie Ihre erste Verteilerliste."
  action={{
    label: 'Liste erstellen',
    onClick: () => openCreateModal(),
    icon: PlusIcon
  }}
/>

<EmptyState
  icon={MagnifyingGlassIcon}
  title="Keine Ergebnisse"
  description="Versuchen Sie andere Suchbegriffe."
/>
```

#### Styling

- Zentriertes Layout
- Icon: text-zinc-400 (64x64px)
- Title: text-base font-semibold
- Description: text-sm text-zinc-600

#### Use Cases

- Leere Listen-Übersicht
- Keine Suchergebnisse
- Leere Filter-Ergebnisse
- Keine Kontakte in Liste

---

## ListModal Sections

### index.tsx (Main Component)

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/index.tsx`
**Zeilen:** 293

Hauptkomponente des ListModal mit State Management und Orchestrierung aller Sections.

#### Props

```typescript
interface ListModalProps {
  list?: DistributionList | null;
  onClose: () => void;
  onSave: (list: Partial<DistributionList>) => Promise<void>;
  userId: string;
  organizationId: string;
}
```

#### State Management

```typescript
const [formData, setFormData] = useState<Partial<DistributionList>>({
  name: '',
  description: '',
  type: 'dynamic',
  category: 'custom',
  filters: {},
  contactIds: []
});

const [validationErrors, setValidationErrors] = useState<string[]>([]);
```

#### Key Features

- **Validierung:** Name required, Filter/ContactIds je nach Typ
- **Conditional Rendering:** Sections basierend auf List Type
- **Performance:** useCallback für alle Handler
- **Error Handling:** Validierung vor Submit

#### Verwendung

```typescript
{showModal && (
  <ListModal
    list={editingList}
    onClose={() => setShowModal(false)}
    onSave={handleSaveList}
    userId={user.uid}
    organizationId={organization.id}
  />
)}
```

---

### BasicInfoSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/BasicInfoSection.tsx`
**Zeilen:** 77

Eingabefelder für Name, Beschreibung, Kategorie und Listen-Typ.

#### Props

```typescript
interface BasicInfoSectionProps {
  formData: Partial<DistributionList>;
  onChange: (key: string, value: any) => void;
  validationErrors?: string[];
}
```

#### Felder

- **Name** (required) - Text Input
- **Beschreibung** (optional) - Textarea
- **Kategorie** - Select (press, media, custom)
- **Listen-Typ** - Radio Buttons (dynamic, static)

#### Verwendung

```typescript
<BasicInfoSection
  formData={formData}
  onChange={handleFormDataChange}
  validationErrors={validationErrors}
/>
```

---

### CompanyFiltersSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/CompanyFiltersSection.tsx`
**Zeilen:** 100

Firmen-bezogene Filter mit Memoization für Performance.

#### Props

```typescript
interface CompanyFiltersSectionProps {
  filters: ListFilters;
  onChange: (key: keyof ListFilters, value: any) => void;
}
```

#### Filter

- **Firmentypen:** Multi-Select (Verlag, Medienhaus, Agentur, etc.)
- **Branchen:** Multi-Select
- **Tags:** Multi-Select
- **Länder:** Multi-Select

#### Performance

```typescript
const companyTypeOptions = useMemo(() =>
  Object.entries(extendedCompanyTypeLabels).map(([value, label]) => ({ value, label })),
  []
);
```

#### Verwendung

```typescript
<CompanyFiltersSection
  filters={formData.filters}
  onChange={handleFilterChange}
/>
```

---

### PersonFiltersSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/PersonFiltersSection.tsx`
**Zeilen:** 81

Personen-bezogene Filter (E-Mail, Telefon, Sprachen, Positionen).

#### Props

```typescript
interface PersonFiltersSectionProps {
  filters: ListFilters;
  onChange: (key: keyof ListFilters, value: any) => void;
}
```

#### Filter

- **E-Mail vorhanden:** Checkbox
- **Telefon vorhanden:** Checkbox
- **Sprachen:** Multi-Select (Deutsch, Englisch, Französisch, etc.)
- **Positionen:** Multi-Select (Redakteur, Chefredakteur, etc.)

#### Verwendung

```typescript
<PersonFiltersSection
  filters={formData.filters}
  onChange={handleFilterChange}
/>
```

---

### JournalistFiltersSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/JournalistFiltersSection.tsx`
**Zeilen:** 55

Journalisten-spezifische Filter (Beats/Ressorts).

#### Props

```typescript
interface JournalistFiltersSectionProps {
  filters: ListFilters;
  onChange: (key: keyof ListFilters, value: any) => void;
}
```

#### Filter

- **Beats/Ressorts:** Multi-Select
  - Politik
  - Wirtschaft
  - Sport
  - Kultur
  - Technologie
  - etc.

#### Performance

```typescript
const beatOptions = useMemo(() =>
  availableBeats.map(beat => ({ value: beat, label: beatLabels[beat] })),
  []
);
```

#### Verwendung

```typescript
<JournalistFiltersSection
  filters={formData.filters}
  onChange={handleFilterChange}
/>
```

---

### PreviewSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/PreviewSection.tsx`
**Zeilen:** 105

Live-Vorschau der gefilterten Kontakte mit Debouncing.

#### Props

```typescript
interface PreviewSectionProps {
  formData: Partial<DistributionList>;
  organizationId: string;
}
```

#### Features

- **Live-Update:** 500ms Debounce
- **Limit:** Zeigt erste 10 Kontakte
- **Count:** Gesamtanzahl immer sichtbar
- **Loading State:** Spinner während Laden
- **Journalist Badge:** Spezielle Kennzeichnung

#### State Management

```typescript
const [previewContacts, setPreviewContacts] = useState<ContactEnhanced[]>([]);
const [previewCount, setPreviewCount] = useState(0);
const [loadingPreview, setLoadingPreview] = useState(false);
```

#### Verwendung

```typescript
<PreviewSection
  formData={formData}
  organizationId={organizationId}
/>
```

---

### ContactSelectorSection

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/ContactSelectorSection.tsx`
**Zeilen:** 28

Wrapper für manuelle Kontaktauswahl bei statischen Listen.

#### Props

```typescript
interface ContactSelectorSectionProps {
  contactIds: string[];
  onChange: (contactIds: string[]) => void;
  organizationId: string;
}
```

#### Features

- Zeigt Anzahl ausgewählter Kontakte
- Button öffnet ContactSelectorModal
- Einfache Wrapper-Komponente

#### Verwendung

```typescript
<ContactSelectorSection
  contactIds={formData.contactIds || []}
  onChange={handleContactIdsChange}
  organizationId={organizationId}
/>
```

---

## Utilities & Helpers

### types.ts

**Pfad:** `src/app/dashboard/contacts/lists/components/sections/types.ts`
**Zeilen:** 73

Shared Types und Helper-Funktionen für Section-Komponenten.

#### Exports

```typescript
// Extended Company Type Labels
export const extendedCompanyTypeLabels = {
  customer: 'Kunde',
  competitor: 'Wettbewerber',
  partner: 'Partner',
  supplier: 'Lieferant',
  other: 'Sonstiges',
  publisher: 'Verlag',
  media_house: 'Medienhaus',
  agency: 'Agentur'
} as const;

// Helper: Format Contact Name
export function formatContactName(contact: any): string {
  if ('name' in contact && typeof contact.name === 'object') {
    const parts = [];
    if (contact.name.title) parts.push(contact.name.title);
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || contact.displayName;
  } else {
    return `${contact.firstName} ${contact.lastName}`;
  }
}

// Helper: Get Primary Email
export function getPrimaryEmail(contact: ContactEnhanced): string | undefined {
  const primary = contact.emails?.find(e => e.isPrimary);
  return primary?.email || contact.emails?.[0]?.email;
}

// Helper: Get Primary Phone
export function getPrimaryPhone(contact: ContactEnhanced): string | undefined {
  const primary = contact.phones?.find(p => p.isPrimary);
  return primary?.number || contact.phones?.[0]?.number;
}
```

---

## Main Pages

### page.tsx (Lists Overview)

**Pfad:** `src/app/dashboard/contacts/lists/page.tsx`
**Zeilen:** ~700

Haupt-Übersichtsseite mit Filter, Suche und Bulk-Actions.

#### Key Features

- **React Query Integration:** useLists, useCreateList, useUpdateList, useDeleteList
- **Filter:** Search, Type, Category
- **Pagination:** Client-side, 25 Items/Page
- **Bulk-Actions:** Multi-Select, Bulk-Delete
- **Export:** CSV-Export für alle Listen
- **Performance:** useMemo für filteredLists, paginatedLists

#### State Management

```typescript
const { data: lists = [], isLoading } = useLists(currentOrganization?.id);
const { mutate: createList } = useCreateList();
const { mutate: updateList } = useUpdateList();
const { mutate: deleteList } = useDeleteList();
const { mutate: bulkDeleteLists } = useBulkDeleteLists();
```

#### Memoization

```typescript
const filteredLists = useMemo(() => {
  // Filter-Logik
}, [lists, searchTerm, selectedTypes, selectedCategories]);

const paginatedLists = useMemo(() => {
  // Pagination-Logik
}, [filteredLists, currentPage, itemsPerPage]);
```

---

### [listId]/page.tsx (List Detail)

**Pfad:** `src/app/dashboard/contacts/lists/[listId]/page.tsx`
**Zeilen:** ~600

Detailseite einer einzelnen Liste mit Statistiken und Export.

#### Key Features

- **React Query Integration:** useList, useUpdateList
- **Statistics:** Kontaktanzahl, Letzte Aktualisierung
- **Export:** CSV/Excel Export
- **Refresh:** Manueller Refresh für dynamische Listen
- **Edit:** In-Place Edit via ListModal

#### State Management

```typescript
const { data: list, isLoading } = useList(listId);
const { mutate: updateList } = useUpdateList();
```

#### Actions

- **Bearbeiten:** Öffnet ListModal mit list-Daten
- **Löschen:** ConfirmDialog + Delete
- **Export:** Lädt alle Kontakte + CSV-Download
- **Refresh:** Aktualisiert contactCount (nur dynamisch)

---

## Component Patterns

### 1. Props-Down Pattern

Alle Sections erhalten Props von index.tsx:

```typescript
<BasicInfoSection
  formData={formData}
  onChange={handleFormDataChange}
/>

<CompanyFiltersSection
  filters={formData.filters}
  onChange={handleFilterChange}
/>
```

### 2. Callback Memoization

Alle Event-Handler werden memoized:

```typescript
const handleFilterChange = useCallback((key: keyof ListFilters, value: any) => {
  setFormData(prev => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
}, []);
```

### 3. Conditional Rendering

Sections werden basierend auf formData.type gerendert:

```typescript
{formData.type === 'dynamic' && (
  <>
    <CompanyFiltersSection />
    <PersonFiltersSection />
    <JournalistFiltersSection />
  </>
)}

{formData.type === 'static' && (
  <ContactSelectorSection />
)}
```

### 4. Debounced Updates

Live-Vorschau nutzt Debouncing:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    updatePreview();
  }, 500);
  return () => clearTimeout(timer);
}, [filters]);
```

---

## Testing-Strategie

### Unit Tests

```typescript
// Shared Components
describe('Alert Component', () => {
  it('renders info alert', () => {
    render(<Alert type="info" title="Info" message="Test" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// Lists CRUD Flow
describe('Lists CRUD Flow', () => {
  it('creates list with filters', async () => {
    render(<ListsPage />);
    // ... create list flow
  });
});
```

### Test Coverage

- **Shared Components:** 19/19 Tests passing
- **Hook Tests:** 8/8 Tests passing
- **Integration Tests:** 2/2 Tests passing

---

## Best Practices

### DO ✅

- **Memoization:** useMemo/useCallback für Performance
- **Type Safety:** Vollständige TypeScript-Types
- **Reusability:** Shared Components extrahieren
- **Testing:** Unit + Integration Tests
- **Accessibility:** Labels, ARIA-Attributes

### DON'T ❌

- Keine Inline-Styles (use Tailwind)
- Keine Direct DOM-Manipulation
- Keine Prop-Drilling (max 2-3 Levels)
- Keine Fetch-Calls in Components (use React Query)
- Keine console.logs in Production

---

## Performance-Tipps

### 1. Memoization

```typescript
// ✅ GUT: Memoized Dropdown-Optionen
const options = useMemo(() =>
  items.map(item => ({ value: item.id, label: item.name })),
  [items]
);

// ❌ SCHLECHT: Neu berechnet bei jedem Render
const options = items.map(item => ({ value: item.id, label: item.name }));
```

### 2. Debouncing

```typescript
// ✅ GUT: Debounced Preview
useEffect(() => {
  const timer = setTimeout(updatePreview, 500);
  return () => clearTimeout(timer);
}, [filters]);

// ❌ SCHLECHT: Sofortige Updates
useEffect(() => {
  updatePreview();
}, [filters]);
```

### 3. Conditional Rendering

```typescript
// ✅ GUT: Lazy Loading
{formData.type === 'dynamic' && <PreviewSection />}

// ❌ SCHLECHT: Immer rendern
<PreviewSection style={{ display: formData.type === 'dynamic' ? 'block' : 'none' }} />
```

---

## Migration & Updates

### Von v0 zu v1.0

**Breaking Changes:**
- ListModal ist jetzt modularisiert (8 Dateien statt 1)
- Shared Components extrahiert
- React Query statt useEffect

**Migration Path:**

```typescript
// Alt (v0):
const [lists, setLists] = useState<DistributionList[]>([]);
useEffect(() => {
  loadLists();
}, []);

// Neu (v1.0):
const { data: lists = [] } = useLists(organizationId);
```

---

## Zukünftige Erweiterungen

### Geplante Features

1. **ListModal Steps:** Multi-Step Wizard für bessere UX
2. **Advanced Filters:** Erweiterte Publikations-Filter
3. **Templates:** Vordefinierte Listen-Templates
4. **Collaborative Editing:** Team-Features
5. **Activity Timeline:** Änderungshistorie

### Refactoring-Kandidaten

- **PublicationFilterSection:** Aufteilen in kleinere Sections
- **ContactSelectorModal:** Virtualisierung für große Listen
- **PreviewSection:** Optimistic UI Updates

---

## Support

**Team:** CeleroPress Development Team
**Documentation:** v1.0
**Letzte Aktualisierung:** 2025-10-14

Bei Fragen siehe: [API README](../api/README.md) | [Project README](../../../README.md)
