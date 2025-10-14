# Editors Komponenten-Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** Januar 2025

---

## Übersicht

Das Editors-Modul besteht aus einer modularen Komponenten-Architektur mit wiederverwendbaren Shared Components.

**Komponenten-Hierarchie:**
```
EditorsPage (page.tsx)
├── Alert (Shared)
├── EmptyState (Shared)
├── Search & Filter Toolbar
├── Journalist Table
│   └── Table Rows (map)
├── Pagination
├── JournalistImportDialog
└── JournalistDetailModal
```

---

## Shared Components

### Alert

Wiederverwendbare Alert-Komponente für Info, Success, Warning und Error Messages.

**Location:** `src/app/dashboard/library/editors/components/shared/Alert.tsx`

**Props:**
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

**Verwendung:**
```typescript
<Alert
  type="success"
  title="Multi-Entity Verweis erstellt"
  message="Journalist wurde mit Company und Publications als Verweis hinzugefügt."
/>

<Alert
  type="error"
  title="Import fehlgeschlagen"
  message="Der Journalist konnte nicht importiert werden."
  action={{
    label: "Erneut versuchen",
    onClick: handleRetry
  }}
/>
```

**Styling:**
- **Info:** Blaue Farbe (`bg-blue-50`, `text-blue-700`)
- **Success:** Grüne Farbe (`bg-green-50`, `text-green-700`)
- **Warning:** Gelbe Farbe (`bg-yellow-50`, `text-yellow-700`)
- **Error:** Rote Farbe (`bg-red-50`, `text-red-700`)

**Icons:**
- Info/Success: `InformationCircleIcon`
- Warning/Error: `ExclamationTriangleIcon`

**Tests:** 8 Tests in `Alert.test.tsx`

---

### EmptyState

Wiederverwendbare EmptyState-Komponente für leere Listen.

**Location:** `src/app/dashboard/library/editors/components/shared/EmptyState.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}
```

**Verwendung:**
```typescript
<EmptyState
  title="Keine Journalisten gefunden"
  description="Versuchen Sie andere Suchbegriffe oder Filter."
/>

<EmptyState
  icon={InboxIcon}
  title="Keine importierten Journalisten"
  description="Klicken Sie auf das Stern-Icon um Journalisten zu importieren."
/>
```

**Styling:**
- Zentriertes Layout (`text-center py-12`)
- Icon: 48x48 Pixel (`h-12 w-12 text-zinc-400`)
- Title: Medium Font (`text-sm font-medium text-zinc-900`)
- Description: Kleinere Schrift (`text-sm text-zinc-500`)

**Default Icon:** `UserIcon` (Heroicons)

**Tests:** 4 Tests in `EmptyState.test.tsx`

---

## Page Components

### EditorsPage

Main Component für die Editors Premium-Datenbank.

**Location:** `src/app/dashboard/library/editors/page.tsx`

**Größe:** < 300 Zeilen (nach Refactoring)

**Hauptfunktionen:**
- Laden der globalen Journalisten (React Query)
- Search & Filter
- Pagination
- Import/Remove von References
- Detail-Ansicht

**State Management:**
```typescript
// React Query
const { data: journalists = [], isLoading } = useGlobalJournalists();
const { data: importedIds } = useImportedJournalists(currentOrganization?.id);
const { data: companies = [] } = useCompanies(currentOrganization?.id);
const { data: publications = [] } = usePublications(currentOrganization?.id);

// Mutations
const createReference = useCreateJournalistReference();
const removeReference = useRemoveJournalistReference();

// Local UI State
const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
const [minQualityScore, setMinQualityScore] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [detailJournalist, setDetailJournalist] = useState<...>(null);
```

**Computed Values (useMemo):**
```typescript
const isSuperAdmin = useMemo(() =>
  currentOrganization?.id === "superadmin-org",
  [currentOrganization?.id]
);

const convertedJournalists = useMemo(() => {
  return journalists.map((contact) => {
    // CRM-Format → JournalistDatabaseEntry
  });
}, [journalists, companies, publications]);

const filteredJournalists = useMemo(() => {
  return convertedJournalists.filter(journalist => {
    // Search + Filter Logic
  });
}, [convertedJournalists, debouncedSearchTerm, selectedTopics, minQualityScore]);

const paginatedJournalists = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredJournalists.slice(startIndex, startIndex + itemsPerPage);
}, [filteredJournalists, currentPage, itemsPerPage]);
```

**Event Handlers (useCallback):**
```typescript
const handleImportReference = useCallback(async (journalist) => {
  // Import Logic with Validation
}, [isSuperAdmin, subscription, currentOrganization, user, createReference, showAlert]);

const handleRemoveReference = useCallback(async (journalist) => {
  // Remove Logic
}, [currentOrganization, user, removeReference, showAlert]);

const handleToggleReference = useCallback(async (journalist) => {
  // Toggle Logic
}, [importedIds, handleRemoveReference, handleImportReference]);

const handleTopicToggle = useCallback((topic, checked) => {
  // Filter Toggle
}, []);
```

---

## UI Sections

### Search & Filter Toolbar

**Layout:**
```jsx
<div className="mb-6">
  <div className="flex items-center gap-2">
    {/* Search Input */}
    <div className="flex-1 relative">
      <MagnifyingGlassIcon />
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Suchen..."
      />
    </div>

    {/* Filter Button */}
    <Popover>
      <PopoverButton>
        <FunnelIcon />
        {activeFiltersCount > 0 && <Badge>{activeFiltersCount}</Badge>}
      </PopoverButton>

      <PopoverPanel>
        {/* Filter Options */}
      </PopoverPanel>
    </Popover>
  </div>
</div>
```

**Features:**
- 300ms Debouncing für Search
- Live-Filter für Topics
- Quality Score Slider (0-100)
- Active Filter Count Badge

---

### Journalist Table

**Layout:**
```jsx
<div className="bg-white rounded-lg shadow-sm">
  {/* Table Header */}
  <div className="px-6 py-3 border-b bg-zinc-50">
    <div className="flex items-center">
      <div className="flex-1">Journalist</div>
      <div className="w-48">Medienhaus</div>
      <div className="w-48">Publikationen</div>
      <div className="w-24 text-center">Score</div>
      <div className="w-16 text-center">Themen</div>
      <div className="w-40">Kontakt</div>
      <div className="w-24 text-center"></div>
    </div>
  </div>

  {/* Table Body */}
  <div className="divide-y divide-zinc-200">
    {paginatedJournalists.map((journalist) => (
      <TableRow key={journalist.id} journalist={journalist} />
    ))}
  </div>
</div>
```

**Table Row Features:**
- Journalist Name (klickbar → Detail-Modal)
- Medienhaus mit Icon & Typ
- Publikationen als Badges (max 2 sichtbar + Counter)
- Quality Score (0-100)
- Topics Count mit Popover
- Kontakt-Icons (Email, Phone)
- Import/Remove Button (Stern-Icon)

---

### Pagination

**Layout:**
```jsx
{totalPages > 1 && (
  <nav className="mt-6 flex items-center justify-between">
    {/* Previous Button */}
    <Button onClick={handlePreviousPage} disabled={currentPage === 1}>
      <ChevronLeftIcon />
      Zurück
    </Button>

    {/* Page Numbers */}
    <div className="hidden md:flex">
      {pages.map(page => (
        <Button
          key={page}
          onClick={() => handleGoToPage(page)}
          className={currentPage === page ? 'font-semibold text-primary' : ''}
        >
          {page}
        </Button>
      ))}
    </div>

    {/* Next Button */}
    <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
      Weiter
      <ChevronRightIcon />
    </Button>
  </nav>
)}
```

**Features:**
- Max 7 sichtbare Page-Buttons
- Smart Page-Range (zeigt Seiten um aktuelle Page)
- Disabled States für First/Last Page
- Responsive (versteckt Page-Numbers auf Mobile)

---

### Detail Modal

**Layout:**
```jsx
<Dialog open={!!detailJournalist} onClose={() => setDetailJournalist(null)}>
  <DialogTitle>
    <div className="flex items-center space-x-3">
      <UserIcon className="h-12 w-12" />
      <div>
        <h3>{detailJournalist.personalData.displayName}</h3>
        <p>{detailJournalist.professionalData.employment?.position}</p>
        <p>Score: {detailJournalist.metadata?.dataQuality?.overallScore}</p>
      </div>
    </div>
  </DialogTitle>

  <DialogBody>
    {/* Kontaktinformationen */}
    <div className="grid grid-cols-2 gap-6">
      <EmailsList />
      <PhonesList />
    </div>

    {/* Medienhaus */}
    <CompanySection />

    {/* Publikationen */}
    <PublicationsSection />

    {/* Themen */}
    <TopicsSection />

    {/* Social Media */}
    <SocialMediaSection />
  </DialogBody>

  <DialogActions>
    <Button plain onClick={() => setDetailJournalist(null)}>
      Schließen
    </Button>
    <Button onClick={() => handleToggleReference(detailJournalist)}>
      <StarIcon />
      {isImported ? 'Verweis entfernen' : 'Als Verweis hinzufügen'}
    </Button>
  </DialogActions>
</Dialog>
```

**Features:**
- Vollständige Journalist-Daten
- Company mit Badge
- Publikationen als Grid (2 Spalten)
- Social Media mit Verified-Badge
- Import/Remove Button

---

## Styling Guidelines

### Color Palette

**Primary:**
- Primary Action: `#005fab` (Blau)
- Star (Import): `#dedc00` (Gelb)

**Neutral:**
- Text: `text-zinc-900` (Dunkel)
- Text Secondary: `text-zinc-500` (Mittel)
- Text Muted: `text-zinc-400` (Hell)
- Borders: `border-zinc-300`
- Background: `bg-zinc-50`

**Semantic:**
- Success: `text-green-700`, `bg-green-50`
- Error: `text-red-700`, `bg-red-50`
- Warning: `text-yellow-700`, `bg-yellow-50`
- Info: `text-blue-700`, `bg-blue-50`

### Spacing

```css
/* Container Padding */
px-6 py-4      /* Standard */
px-4 py-3      /* Compact */

/* Gap zwischen Elementen */
gap-2          /* Small (8px) */
gap-4          /* Medium (16px) */
gap-6          /* Large (24px) */

/* Margin */
mb-4           /* Bottom Margin (16px) */
mt-6           /* Top Margin (24px) */
```

### Icons

**Nur Heroicons /24/outline verwenden:**
```typescript
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  StarIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";
```

**Icon-Größen:**
- Small: `h-4 w-4` (16px)
- Medium: `h-5 w-5` (20px)
- Large: `h-12 w-12` (48px)

### Shadows

**Erlaubte Schatten:**
- Dropdowns/Popovers: `shadow-lg`
- Cards/Tables: `shadow-sm`

**NICHT verwenden:**
- Buttons: Keine Schatten
- Inputs: Keine Schatten

---

## Accessibility

### ARIA Labels

```jsx
<button aria-label="Filter">
  <FunnelIcon aria-hidden="true" />
</button>

<input
  type="search"
  placeholder="Suchen..."
  aria-label="Journalisten durchsuchen"
/>
```

### Keyboard Navigation

- Tab-Index für interaktive Elemente
- Enter/Space für Buttons
- Escape für Modals schließen

### Screen Reader Support

- Semantisches HTML (`<nav>`, `<table>`, `<button>`)
- ARIA Labels für Icon-Only Buttons
- Alt-Text für Bilder

---

## Testing

### Component Tests

**Alert Component (8 Tests):**
```typescript
it('renders info alert with title and message');
it('renders success alert');
it('renders warning alert');
it('renders error alert');
it('renders without message');
it('renders with action button and handles click');
it('defaults to info type when not specified');
it('applies correct styling for different alert types');
```

**EmptyState Component (4 Tests):**
```typescript
it('renders with title and description');
it('renders with default icon (UserIcon)');
it('renders with custom icon');
it('applies correct styling classes');
```

### Integration Tests

```typescript
// Zu implementieren
it('sollte Journalist importieren und wieder entfernen');
it('sollte Search-Filter anwenden');
it('sollte Pagination korrekt funktionieren');
```

---

## Performance

### React.memo

```typescript
// Nicht implementiert (noch)
// Könnte für Table-Rows nützlich sein:
export default React.memo(function JournalistTableRow({ journalist }: Props) {
  return <div>{/* ... */}</div>;
});
```

### useCallback für Event Handler

Alle Event Handler sind bereits mit `useCallback` optimiert:
- `handleImportReference`
- `handleRemoveReference`
- `handleToggleReference`
- `handleTopicToggle`
- `handleQualityScoreChange`
- `handlePreviousPage`
- `handleNextPage`
- `handleGoToPage`

### useMemo für Computed Values

Alle berechneten Werte sind bereits mit `useMemo` optimiert:
- `isSuperAdmin`
- `convertedJournalists`
- `filteredJournalists`
- `paginatedJournalists`
- `availableTopics`
- `activeFiltersCount`
- `totalPages`

---

## Troubleshooting

### Problem: "Komponente re-rendert zu oft"

**Symptom:** Performance-Probleme, UI laggt

**Lösung:**
```typescript
// 1. Prüfen ob useCallback/useMemo verwendet wird
// 2. React DevTools Profiler verwenden
// 3. Dependency Arrays prüfen
```

### Problem: "Filter funktioniert nicht"

**Symptom:** Filter-Änderungen haben keine Auswirkung

**Debugging:**
```typescript
console.log('Filter State:', {
  searchTerm,
  debouncedSearchTerm,
  selectedTopics,
  minQualityScore
});

console.log('Filtered Count:', filteredJournalists.length);
```

### Problem: "Pagination zeigt falsche Seiten"

**Symptom:** Page-Numbers stimmen nicht mit Daten überein

**Lösung:**
```typescript
// totalPages prüfen
const totalPages = Math.ceil(filteredJournalists.length / itemsPerPage);

// currentPage resetten bei Filter-Änderungen
useEffect(() => {
  setCurrentPage(1);
}, [selectedTopics, minQualityScore, debouncedSearchTerm]);
```

---

**Version:** 1.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** Januar 2025
