# Lists API Dokumentation

**Version:** 1.0
**Letzte Aktualisierung:** 2025-10-14

---

## Übersicht

Die Lists API bietet vollständigen Zugriff auf das Verteilerlisten-System von CeleroPress. Sie umfasst CRUD-Operationen, erweiterte Filter-Funktionen, Publikations-Integration und Analytics.

---

## Services

### listsService

**Pfad:** `@/lib/firebase/lists-service`

Hauptservice für alle Listen-Operationen mit Firebase Firestore.

**Verwendung:**

```typescript
import { listsService } from '@/lib/firebase/lists-service';
```

---

## API-Kategorien

### 1. CRUD-Operationen

Grundlegende Create, Read, Update, Delete-Operationen für Verteilerlisten.

**Siehe:** [CRUD Operations](#crud-operations)

### 2. Filter & Suche

Erweiterte Filter-Funktionen für dynamische Listen mit Publikations-Integration.

**Siehe:** [Filter Operations](#filter-operations)

### 3. Listen-Wartung

Automatische Aktualisierung dynamischer Listen und Kontakt-Synchronisation.

**Siehe:** [List Maintenance](#list-maintenance)

### 4. Analytics & Metriken

Usage-Tracking und Performance-Metriken für Listen-Nutzung.

**Siehe:** [Analytics & Metrics](#analytics--metrics)

### 5. Export & Utilities

Hilfsfunktionen für Export, Duplizierung und Kontakt-Verwaltung.

**Siehe:** [Utilities](#utilities)

---

## Quick Start

### Listen abrufen

```typescript
// Alle Listen einer Organisation
const lists = await listsService.getAll(organizationId);

// Einzelne Liste
const list = await listsService.getById(listId);
```

### Liste erstellen

```typescript
const newList = {
  name: 'Journalisten Wirtschaft',
  description: 'Alle Wirtschaftsjournalisten',
  type: 'dynamic',
  category: 'press',
  userId: user.uid,
  organizationId: organization.id,
  filters: {
    companyTypes: ['media_house', 'publisher'],
    beats: ['economy', 'business']
  },
  contactIds: []
};

const listId = await listsService.create(newList);
```

### Kontakte abrufen

```typescript
// Alle Kontakte einer Liste
const contacts = await listsService.getContacts(list);

// Preview (erste 10 Kontakte)
const preview = await listsService.getContactsPreview(list, 10);

// Nach Filtern
const filteredContacts = await listsService.getContactsByFilters(
  filters,
  organizationId
);
```

---

## React Query Integration

Für optimales State Management wird React Query empfohlen:

```typescript
import {
  useLists,
  useList,
  useCreateList,
  useUpdateList,
  useDeleteList
} from '@/lib/hooks/useListsData';

// Automatisches Caching & Invalidierung
const { data: lists, isLoading } = useLists(organizationId);
const { mutate: createList } = useCreateList();
const { mutate: updateList } = useUpdateList();
```

**Siehe:** [React Query Hooks Documentation](../hooks/useListsData.md) *(geplant)*

---

## Detaillierte Dokumentation

Für vollständige API-Referenz mit allen Methoden, Parametern und Beispielen:

**→ [Lists Service API Reference](./lists-service.md)**

---

## Type Definitions

```typescript
interface DistributionList {
  id?: string;
  name: string;
  description?: string;
  type: 'dynamic' | 'static';
  category: 'press' | 'media' | 'custom';
  color?: string;
  userId: string;
  organizationId: string;
  contactCount: number;
  filters?: ListFilters;
  contactIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUpdated: Timestamp;
}

interface ListFilters {
  // Firmen-Filter
  companyTypes?: string[];
  industries?: string[];
  countries?: string[];
  tagIds?: string[];

  // Personen-Filter
  hasEmail?: boolean;
  hasPhone?: boolean;
  positions?: string[];

  // Journalisten-Filter
  beats?: string[];

  // Publikations-Filter
  publications?: PublicationFilters;

  // Datum-Filter
  createdAfter?: Date;
  createdBefore?: Date;
}

interface PublicationFilters {
  publicationIds?: string[];
  publisherIds?: string[];
  types?: string[];
  formats?: string[];
  frequencies?: string[];
  languages?: string[];
  countries?: string[];
  geographicScopes?: string[];
  focusAreas?: string[];
  targetIndustries?: string[];
  status?: string[];
  minPrintCirculation?: number;
  maxPrintCirculation?: number;
  minOnlineVisitors?: number;
  maxOnlineVisitors?: number;
  onlyVerified?: boolean;
}
```

**Siehe:** `@/types/lists.ts` für vollständige Type-Definitionen

---

## Error Handling

Alle API-Methoden können Errors werfen. Best Practice:

```typescript
try {
  const list = await listsService.getById(listId);
  if (!list) {
    console.error('Liste nicht gefunden');
    return;
  }
  // ... weiterer Code
} catch (error) {
  console.error('Fehler beim Laden der Liste:', error);
  // Error-Handling
}
```

**React Query Error Handling:**

```typescript
const { data, error, isError } = useLists(organizationId);

if (isError) {
  return <Alert type="error" message={error.message} />;
}
```

---

## Performance-Tipps

### 1. React Query Caching nutzen

```typescript
// ✅ GUT: Automatisches Caching mit React Query
const { data: lists } = useLists(organizationId);

// ❌ SCHLECHT: Direkter Service-Call ohne Caching
const lists = await listsService.getAll(organizationId);
```

### 2. Preview statt Full-Load

```typescript
// ✅ GUT: Nur Preview laden (10 Kontakte)
const preview = await listsService.getContactsPreview(list, 10);

// ❌ SCHLECHT: Alle Kontakte laden für Vorschau
const allContacts = await listsService.getContacts(list);
```

### 3. Debouncing für Filter

```typescript
// ✅ GUT: Debounced Filter-Updates
useEffect(() => {
  const timer = setTimeout(() => {
    updatePreview();
  }, 500);
  return () => clearTimeout(timer);
}, [filters]);
```

---

## Beispiele

### Beispiel 1: Dynamische Liste mit Publikations-Filter

```typescript
const journalistList = {
  name: 'Wirtschaftsjournalisten Top-Medien',
  type: 'dynamic',
  category: 'press',
  userId: user.uid,
  organizationId: org.id,
  filters: {
    beats: ['economy', 'business'],
    publications: {
      types: ['newspaper', 'magazine'],
      minPrintCirculation: 50000,
      onlyVerified: true
    }
  }
};

const listId = await listsService.create(journalistList);
```

### Beispiel 2: Liste mit Live-Vorschau

```typescript
function PreviewSection({ filters }: Props) {
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await listsService.getContactsByFilters(
        filters,
        organizationId
      );
      setContacts(result.slice(0, 10));
      setCount(result.length);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div>
      <p>{count} Kontakte gefunden</p>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### Beispiel 3: Export mit Bulk-Actions

```typescript
async function exportMultipleLists(listIds: string[]) {
  const allContacts: ContactEnhanced[] = [];

  for (const listId of listIds) {
    const contacts = await listsService.exportContacts(listId);
    allContacts.push(...contacts);
  }

  // Deduplizierung
  const unique = Array.from(
    new Map(allContacts.map(c => [c.id, c])).values()
  );

  // CSV-Export
  downloadCSV(unique);
}
```

---

## Migration & Compatibility

### Legacy Support

Der Service unterstützt automatisch Legacy-Daten:

```typescript
// Versucht zuerst organizationId, dann userId (Legacy)
const lists = await listsService.getAll(organizationId, legacyUserId);
```

### Multi-Tenancy

Alle Operationen sind organizationId-aware:

```typescript
// Automatische Filterung nach Organization
const lists = await listsService.getAll(organizationId);
// Gibt nur Listen dieser Organization zurück
```

---

## Support & Feedback

**Entwickler:** CeleroPress Development Team
**Dokumentation:** v1.0
**Letzte Aktualisierung:** 2025-10-14

Bei Fragen siehe: [Project README](../../../README.md)
