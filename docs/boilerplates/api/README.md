# Boilerplates API-Übersicht

**Version:** 1.0
**Letzte Aktualisierung:** 16. Oktober 2025

---

## 📋 Übersicht

Diese Dokumentation beschreibt die API-Schnittstellen des Boilerplates-Moduls. Das Modul bietet zwei Hauptschnittstellen:

1. **Firestore Service** (`boilerplate-service.ts`) - Direkte Firestore-Operationen
2. **React Query Hooks** (`useBoilerplatesData.ts`) - Frontend State Management

---

## 🗂️ Dateien

### 1. boilerplate-service.ts

**Pfad:** `src/lib/firebase/boilerplate-service.ts`

**Zweck:** Zentrale Firestore-Schnittstelle für alle Boilerplate-Operationen

**Dokumentation:** [boilerplate-service.md](./boilerplate-service.md)

**Key Methods:**
- `getAll()` - Alle Boilerplates laden
- `getById()` - Einzelnen Boilerplate laden
- `create()` - Neuen Boilerplate erstellen
- `update()` - Boilerplate aktualisieren
- `delete()` - Boilerplate löschen
- `toggleFavorite()` - Favorit-Status ändern
- `search()` - Textsuche durchführen
- `getStats()` - Statistiken abrufen

### 2. useBoilerplatesData.ts

**Pfad:** `src/lib/hooks/useBoilerplatesData.ts`

**Zweck:** React Query Hooks für Frontend State Management

**Key Hooks:**
- `useBoilerplates()` - Query: Alle Boilerplates
- `useBoilerplate()` - Query: Einzelner Boilerplate
- `useCreateBoilerplate()` - Mutation: Erstellen
- `useUpdateBoilerplate()` - Mutation: Aktualisieren
- `useDeleteBoilerplate()` - Mutation: Löschen
- `useToggleFavoriteBoilerplate()` - Mutation: Favorit Toggle

---

## 🚀 Quick Reference

### Firestore Service

```typescript
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';

// Alle laden
const boilerplates = await boilerplatesService.getAll('org-123');

// Einzelnen laden
const boilerplate = await boilerplatesService.getById('bp-123');

// Erstellen
const newId = await boilerplatesService.create(
  {
    name: 'Test Boilerplate',
    content: '<p>Content</p>',
    category: 'company',
    isGlobal: true
  },
  { organizationId: 'org-123', userId: 'user-456' }
);

// Aktualisieren
await boilerplatesService.update(
  'bp-123',
  { name: 'Updated Name' },
  { organizationId: 'org-123', userId: 'user-456' }
);

// Löschen
await boilerplatesService.delete('bp-123');

// Favorit Toggle
await boilerplatesService.toggleFavorite(
  'bp-123',
  { organizationId: 'org-123', userId: 'user-456' }
);
```

### React Query Hooks

```typescript
import {
  useBoilerplates,
  useBoilerplate,
  useCreateBoilerplate,
  useUpdateBoilerplate,
  useDeleteBoilerplate,
  useToggleFavoriteBoilerplate
} from '@/lib/hooks/useBoilerplatesData';

function MyComponent() {
  const organizationId = 'org-123';
  const userId = 'user-456';

  // Query: Alle laden
  const { data: boilerplates, isLoading, error } = useBoilerplates(organizationId);

  // Query: Einzelnen laden
  const { data: boilerplate } = useBoilerplate('bp-123');

  // Mutation: Erstellen
  const createBoilerplate = useCreateBoilerplate();
  const handleCreate = async () => {
    await createBoilerplate.mutateAsync({
      organizationId,
      userId,
      boilerplateData: {
        name: 'New Boilerplate',
        content: '<p>Content</p>',
        category: 'company',
        isGlobal: true
      }
    });
  };

  // Mutation: Aktualisieren
  const updateBoilerplate = useUpdateBoilerplate();
  const handleUpdate = async (id: string) => {
    await updateBoilerplate.mutateAsync({
      id,
      organizationId,
      userId,
      boilerplateData: { name: 'Updated Name' }
    });
  };

  // Mutation: Löschen
  const deleteBoilerplate = useDeleteBoilerplate();
  const handleDelete = async (id: string) => {
    await deleteBoilerplate.mutateAsync({ id, organizationId });
  };

  // Mutation: Favorit Toggle
  const toggleFavorite = useToggleFavoriteBoilerplate();
  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite.mutateAsync({ id, organizationId, userId });
  };

  return (
    // JSX...
  );
}
```

---

## 📊 TypeScript-Typen

### Boilerplate

```typescript
interface Boilerplate {
  id?: string;
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: string;
  sortOrder?: number;

  // Metadata
  organizationId: string;
  userId?: string; // Legacy
  isArchived: boolean;
  isFavorite: boolean;
  usageCount?: number;
  lastUsedAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### BoilerplateCreateData

```typescript
interface BoilerplateCreateData {
  name: string;                 // Erforderlich
  content: string;              // Erforderlich
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom'; // Erforderlich
  description?: string;
  isGlobal?: boolean;           // Standard: true
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: string;
  sortOrder?: number;           // Standard: 999
}
```

---

## 🔄 React Query Features

### Caching

Alle Queries nutzen React Query Caching:

```typescript
const { data, isLoading, error, refetch } = useBoilerplates(organizationId);

// Cache Settings
staleTime: 5 * 60 * 1000 // 5 Minuten
```

### Automatische Cache-Invalidierung

Mutations invalidieren automatisch relevante Queries:

```typescript
// Nach Create/Update/Delete
queryClient.invalidateQueries({ queryKey: ['boilerplates', organizationId] });

// Nach Update/Toggle Favorite
queryClient.invalidateQueries({ queryKey: ['boilerplate', id] });
```

### Loading & Error States

```typescript
const { data, isLoading, error } = useBoilerplates(organizationId);

if (isLoading) return <div>Laden...</div>;
if (error) return <div>Fehler: {error.message}</div>;
if (!data) return <div>Keine Daten</div>;

return <div>{data.length} Boilerplates</div>;
```

### Mutation States

```typescript
const createBoilerplate = useCreateBoilerplate();

const handleCreate = async () => {
  try {
    await createBoilerplate.mutateAsync({...});
    toastService.success('Erstellt!');
  } catch (error) {
    toastService.error('Fehler beim Erstellen');
  }
};

// Loading State
{createBoilerplate.isLoading && <div>Speichern...</div>}
```

---

## 🎯 Best Practices

### 1. Verwenden Sie React Query Hooks im Frontend

**✅ Gut:**
```typescript
function BoilerplatesPage() {
  const { data: boilerplates } = useBoilerplates(organizationId);
  // Automatisches Caching, Re-Fetching, Error Handling
}
```

**❌ Schlecht:**
```typescript
function BoilerplatesPage() {
  const [boilerplates, setBoilerplates] = useState([]);

  useEffect(() => {
    boilerplatesService.getAll(organizationId).then(setBoilerplates);
  }, [organizationId]);
  // Kein Caching, manuelles Error Handling, Re-Fetching bei jedem Render
}
```

### 2. Nutzen Sie Mutations für Schreiboperationen

**✅ Gut:**
```typescript
const deleteBoilerplate = useDeleteBoilerplate();

const handleDelete = async (id: string) => {
  await deleteBoilerplate.mutateAsync({ id, organizationId });
  // Automatische Cache-Invalidierung, Optimistic Updates
};
```

**❌ Schlecht:**
```typescript
const handleDelete = async (id: string) => {
  await boilerplatesService.delete(id);
  // Manuelles Reload nötig
  await loadData();
};
```

### 3. Error Handling mit Try-Catch

```typescript
const createBoilerplate = useCreateBoilerplate();

const handleCreate = async (data: BoilerplateCreateData) => {
  try {
    const newId = await createBoilerplate.mutateAsync({
      organizationId,
      userId,
      boilerplateData: data
    });
    toastService.success('Erfolgreich erstellt!');
    return newId;
  } catch (error) {
    toastService.error(
      error instanceof Error
        ? `Fehler: ${error.message}`
        : 'Fehler beim Erstellen'
    );
    throw error; // Re-throw für weitere Fehlerbehandlung
  }
};
```

### 4. Validierung vor dem Speichern

```typescript
const handleSave = async (data: BoilerplateCreateData) => {
  // Validierung
  if (!data.name.trim()) {
    toastService.warning('Name ist erforderlich');
    return;
  }

  if (!data.content.trim()) {
    toastService.warning('Inhalt ist erforderlich');
    return;
  }

  // Speichern
  await createBoilerplate.mutateAsync({...});
};
```

### 5. Optimistic Updates (Optional)

```typescript
const updateBoilerplate = useUpdateBoilerplate();

const handleUpdate = async (id: string, updates: Partial<Boilerplate>) => {
  // Optimistic Update: UI sofort aktualisieren
  const previousData = queryClient.getQueryData(['boilerplate', id]);

  queryClient.setQueryData(['boilerplate', id], (old: Boilerplate) => ({
    ...old,
    ...updates
  }));

  try {
    await updateBoilerplate.mutateAsync({
      id,
      organizationId,
      userId,
      boilerplateData: updates
    });
  } catch (error) {
    // Rollback bei Fehler
    queryClient.setQueryData(['boilerplate', id], previousData);
    toastService.error('Fehler beim Speichern');
  }
};
```

---

## 🔐 Security

### Firestore Security Rules

Stellen Sie sicher, dass Firestore Security Rules korrekt konfiguriert sind:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boilerplates/{boilerplateId} {
      // Nur authentifizierte Benutzer
      allow read, write: if request.auth != null;

      // Optional: Organization-basierte Zugriffskontrolle
      allow read, write: if request.auth != null
        && (
          resource.data.organizationId == request.auth.token.organizationId
          || resource.data.userId == request.auth.uid
        );
    }
  }
}
```

### Context Parameter

Alle Schreiboperationen benötigen `context` mit `organizationId` und `userId`:

```typescript
await boilerplatesService.create(
  data,
  {
    organizationId: currentOrganization.id, // Aktuelle Organisation
    userId: user.uid                        // Aktueller Benutzer
  }
);
```

---

## 📈 Performance-Tipps

### 1. Nutzen Sie staleTime

```typescript
// In useBoilerplatesData.ts
staleTime: 5 * 60 * 1000 // 5 Minuten

// Daten werden nur alle 5 Minuten neu geladen
// Dazwischen: Instant-Loading aus Cache
```

### 2. Selective Invalidation

```typescript
// Nur relevante Queries invalidieren
queryClient.invalidateQueries({ queryKey: ['boilerplates', organizationId] });

// Nicht alle Queries
// queryClient.invalidateQueries(); // ❌
```

### 3. Parallel Queries

```typescript
// Gut: Parallel laden
const { data: boilerplates } = useBoilerplates(organizationId);
const { data: stats } = useQuery({
  queryKey: ['boilerplate-stats', organizationId],
  queryFn: () => boilerplatesService.getStats(organizationId)
});

// Beide Queries laufen parallel
```

### 4. Batch-Operationen

```typescript
// Gut: Batch-Update
await boilerplatesService.updateSortOrder([...], context);

// Schlecht: Einzelne Updates
for (const bp of boilerplates) {
  await boilerplatesService.update(bp.id, {...}, context);
}
```

---

## 🧪 Testing

### Mocking React Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBoilerplates } from '@/lib/hooks/useBoilerplatesData';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('sollte Boilerplates laden', async () => {
  (boilerplatesService.getAll as jest.Mock).mockResolvedValue([mockBoilerplate]);

  const { result } = renderHook(
    () => useBoilerplates('org-123'),
    { wrapper: createWrapper() }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toEqual([mockBoilerplate]);
});
```

### Mocking Firestore Service

```typescript
jest.mock('@/lib/firebase/boilerplate-service', () => ({
  boilerplatesService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn()
  }
}));

// In Tests
(boilerplatesService.getAll as jest.Mock).mockResolvedValue([mockBoilerplate]);
```

---

## 📖 Weitere Dokumentation

- **Detaillierte API-Referenz:** [boilerplate-service.md](./boilerplate-service.md)
- **Komponenten-Dokumentation:** [../components/README.md](../components/README.md)
- **Haupt-Dokumentation:** [../README.md](../README.md)
- **ADRs:** [../adr/README.md](../adr/README.md)

---

## 🆘 Hilfe & Support

### Häufige Probleme

**"Query ist disabled"**
- Ursache: `organizationId` ist `undefined`
- Lösung: Prüfen Sie `organizationId` vor Hook-Aufruf

**"Permission Denied"**
- Ursache: Firestore Security Rules
- Lösung: Prüfen Sie Rules und User-Authentifizierung

**"Cache wird nicht invalidiert"**
- Ursache: Falsche QueryKey
- Lösung: Verwenden Sie exakt die gleichen Keys wie in Hooks

### Debugging

```typescript
// React Query DevTools aktivieren (nur Development)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* App Content */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

// Query Status loggen
const { data, isLoading, error, status, fetchStatus } = useBoilerplates(organizationId);

console.log('Status:', status); // 'loading' | 'error' | 'success'
console.log('FetchStatus:', fetchStatus); // 'fetching' | 'paused' | 'idle'
console.log('Data:', data);
console.log('Error:', error);
```

---

**Maintainer:** CeleroPress Development Team
**Erstellt:** 16. Oktober 2025
**Letzte Aktualisierung:** 16. Oktober 2025
