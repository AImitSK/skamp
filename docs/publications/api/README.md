# Publications API - Übersicht

**Version:** 1.0
**Letztes Update:** 15. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Service-Methoden](#service-methoden)
- [React Query Hooks](#react-query-hooks)
- [Quick Reference](#quick-reference)
- [Detaillierte Dokumentation](#detaillierte-dokumentation)

---

## Übersicht

Die Publications API bietet vollständigen CRUD-Zugriff auf Publikationen über:

1. **Service Layer** (`publicationService`) - Direkter Firebase-Zugriff
2. **React Query Hooks** (`usePublicationsData`) - State Management & Caching

### Architektur

```
Component
    │
    ├─→ React Query Hook (usePublications)
    │       ↓
    │   React Query Cache (5min staleTime)
    │       ↓
    │   publicationService.getAll()
    │       ↓
    │   Firebase Firestore
    │       ↓
    │   Collection: publications
```

---

## Service-Methoden

### publicationService

Der Publication Service bietet direkten Zugriff auf Firestore.

```typescript
import { publicationService } from '@/lib/firebase/library-service';
```

**Verfügbare Methoden:**

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `getAll(organizationId)` | Alle Publikationen laden | `Promise<Publication[]>` |
| `getById(id, organizationId)` | Einzelne Publikation | `Promise<Publication \| null>` |
| `create(data, context)` | Neue Publikation | `Promise<Publication>` |
| `update(id, data, context)` | Publikation aktualisieren | `Promise<void>` |
| `softDelete(id, context)` | Publikation löschen | `Promise<void>` |
| `verify(id, context)` | Publikation verifizieren | `Promise<void>` |

**Context-Objekt:**
```typescript
interface Context {
  organizationId: string;
  userId: string;
}
```

---

## React Query Hooks

### usePublicationsData

Custom Hooks für State Management mit React Query.

```typescript
import {
  usePublications,
  usePublication,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication,
  useVerifyPublication,
} from '@/lib/hooks/usePublicationsData';
```

---

### Query Hooks (Daten laden)

#### usePublications

Lädt alle Publikationen einer Organisation.

```typescript
const {
  data: publications = [],
  isLoading,
  error,
  refetch
} = usePublications(organizationId);
```

**Features:**
- ✅ Automatisches Caching (5min)
- ✅ Background Refetching
- ✅ Enabled nur wenn `organizationId` vorhanden

---

#### usePublication

Lädt eine einzelne Publikation.

```typescript
const {
  data: publication,
  isLoading,
  error
} = usePublication(publicationId, organizationId);
```

**Features:**
- ✅ Automatisches Caching
- ✅ Gibt `null` zurück wenn nicht gefunden
- ✅ Enabled nur wenn beide IDs vorhanden

---

### Mutation Hooks (Daten ändern)

#### useCreatePublication

Erstellt eine neue Publikation.

```typescript
const createPublication = useCreatePublication();

// In Handler:
await createPublication.mutateAsync({
  organizationId: 'org-123',
  userId: 'user-456',
  publicationData: {
    title: 'Neue Publikation',
    type: 'magazine',
    // ...
  }
});
```

**Features:**
- ✅ Automatische Cache-Invalidierung
- ✅ Optimistic Updates möglich
- ✅ Error Handling

---

#### useUpdatePublication

Aktualisiert eine Publikation.

```typescript
const updatePublication = useUpdatePublication();

await updatePublication.mutateAsync({
  id: 'pub-123',
  organizationId: 'org-123',
  userId: 'user-456',
  publicationData: {
    title: 'Updated Title'
  }
});
```

**Features:**
- ✅ Invalidiert beide Caches (Liste + Detail)
- ✅ Partial Updates möglich

---

#### useDeletePublication

Löscht eine Publikation (Soft Delete).

```typescript
const deletePublication = useDeletePublication();

await deletePublication.mutateAsync({
  id: 'pub-123',
  organizationId: 'org-123',
  userId: 'user-456'
});
```

**Features:**
- ✅ Soft Delete (isDeleted Flag)
- ✅ Cache-Invalidierung

---

#### useVerifyPublication

Verifiziert eine Publikation.

```typescript
const verifyPublication = useVerifyPublication();

await verifyPublication.mutateAsync({
  id: 'pub-123',
  organizationId: 'org-123',
  userId: 'user-456'
});
```

---

## Quick Reference

### Komplettes Beispiel

```typescript
'use client';

import { usePublications, useCreatePublication } from '@/lib/hooks/usePublicationsData';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';

export default function PublicationsPage() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // Daten laden
  const {
    data: publications = [],
    isLoading,
    error
  } = usePublications(currentOrganization?.id);

  // Mutation
  const createPublication = useCreatePublication();

  const handleCreate = async (formData: any) => {
    try {
      await createPublication.mutateAsync({
        organizationId: currentOrganization!.id,
        userId: user!.uid,
        publicationData: formData
      });

      alert('Publikation erstellt!');
    } catch (error) {
      alert('Fehler beim Erstellen');
    }
  };

  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div>Fehler: {error.message}</div>;

  return (
    <div>
      <h1>Publications ({publications.length})</h1>
      {publications.map(pub => (
        <div key={pub.id}>{pub.title}</div>
      ))}
    </div>
  );
}
```

---

## Detaillierte Dokumentation

Für detaillierte Informationen zu jedem Service-Methodenaufruf, Typen und Beispielen:

📖 **[Publication Service - Detaillierte Referenz](./publication-service.md)**

---

## Error Handling

Alle Hooks verwenden React Query's Error Handling:

```typescript
const { data, error, isError } = usePublications(orgId);

if (isError) {
  console.error('Fehler beim Laden:', error);
  // Toast-Notification anzeigen
}
```

**Typische Fehler:**
- `No organization` - organizationId fehlt
- `No ID` - publicationId fehlt
- Firebase Errors - Permission denied, Network errors

---

## Performance-Tipps

### 1. Stale Time nutzen

React Query cached 5 Minuten. Nutze `refetch()` nur wenn nötig:

```typescript
const { data, refetch } = usePublications(orgId);

// ❌ Nicht bei jedem Click
<button onClick={() => refetch()}>Reload</button>

// ✅ Nur bei User-Intent
<button onClick={() => {
  confirm('Wirklich neu laden?') && refetch();
}}>Reload</button>
```

### 2. Enabled-Option

Vermeide unnötige Queries:

```typescript
// ✅ Query läuft nur wenn ID vorhanden
const { data } = usePublication(id, orgId);

// Query ist automatisch disabled wenn id === undefined
```

### 3. Background Refetching

React Query aktualisiert automatisch im Hintergrund:

```typescript
// Keine manuelle Implementierung nötig!
// React Query updated automatisch bei:
// - Window Focus
// - Network Reconnect
// - Interval (konfigurierbar)
```

---

**Nächste Schritte:**

- 📖 [Zurück zur Hauptdokumentation](../README.md)
- 📖 [Publication Service Details](./publication-service.md)
- 📖 [Komponenten-Dokumentation](../components/README.md)
