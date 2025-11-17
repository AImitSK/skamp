# Monitoring Modals - API-Übersicht

> **Modul**: monitoring/modals/api
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-17

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [useMonitoringMutations Hook](#usemonitoringmutations-hook)
- [Mutations](#mutations)
- [TypeScript-Typen](#typescript-typen)
- [Error Handling](#error-handling)
- [Cache-Strategie](#cache-strategie)
- [Best Practices](#best-practices)
- [Siehe auch](#siehe-auch)

## Übersicht

Die Monitoring Modals API basiert auf React Query (TanStack Query v5) und bietet zwei Haupt-Mutations für die Veröffentlichungs-Erfassung:

1. **useMarkAsPublished** - Markiert Email-Versendungen als veröffentlicht
2. **useUpdateClipping** - Aktualisiert bestehende Media Clippings

Beide Mutations sind vollständig typsicher, optimistisch und invalidieren automatisch den React Query Cache.

## useMonitoringMutations Hook

**Datei**: `src/lib/hooks/useMonitoringMutations.ts` (235 Zeilen)

### Exports

```typescript
// Haupt-Hooks
export function useMarkAsPublished(): UseMutationResult<...>
export function useUpdateClipping(): UseMutationResult<...>

// TypeScript-Typen
export interface MarkAsPublishedFormData { ... }
export interface MarkAsPublishedInput { ... }
export interface UpdateClippingFormData { ... }
export interface UpdateClippingInput { ... }
```

### Quick Start

```typescript
import { useMarkAsPublished, useUpdateClipping } from '@/lib/hooks/useMonitoringMutations';

function MyComponent() {
  const markAsPublished = useMarkAsPublished();
  const updateClipping = useUpdateClipping();

  // Verwende die Mutations
  await markAsPublished.mutateAsync({ ... });
  await updateClipping.mutateAsync({ ... });
}
```

## Mutations

### useMarkAsPublished()

Erstellt ein neues Media Clipping und markiert den zugehörigen Email-Versand als veröffentlicht.

**Signatur**:
```typescript
function useMarkAsPublished(): UseMutationResult<
  { clippingId: string },
  Error,
  MarkAsPublishedInput,
  unknown
>
```

**Input**:
```typescript
interface MarkAsPublishedInput {
  organizationId: string;      // Multi-Tenancy ID
  campaignId: string;          // Zugehörige PR-Kampagne
  sendId: string;              // Email-Versand ID
  userId: string;              // Aktueller Benutzer
  recipientName: string;       // Empfänger-Name
  formData: MarkAsPublishedFormData;
}

interface MarkAsPublishedFormData {
  articleUrl: string;          // REQUIRED: URL des Artikels
  articleTitle: string;        // Artikel-Titel (optional)
  outletName: string;          // Medium/Outlet Name
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;               // Reichweite als String (wird zu number konvertiert)
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;      // -1.0 bis 1.0
  publishedAt: string;         // ISO Date string (YYYY-MM-DD)
}
```

**Return Value**:
```typescript
{
  clippingId: string;  // ID des erstellten Media Clippings
}
```

**Beispiel**:
```typescript
const markAsPublished = useMarkAsPublished();

const handleMarkAsPublished = async () => {
  try {
    const result = await markAsPublished.mutateAsync({
      organizationId: 'org_123',
      campaignId: 'campaign_456',
      sendId: 'send_789',
      userId: 'user_abc',
      recipientName: 'Max Mustermann',
      formData: {
        articleUrl: 'https://example.com/article',
        articleTitle: 'Großer Erfolg für Unternehmen X',
        outletName: 'Süddeutsche Zeitung',
        outletType: 'print',
        reach: '2500000',
        sentiment: 'positive',
        sentimentScore: 0.7,
        publishedAt: '2025-11-17'
      }
    });

    console.log('Clipping erstellt:', result.clippingId);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Mutation-Status abrufen
console.log('Loading:', markAsPublished.isPending);
console.log('Error:', markAsPublished.error);
console.log('Data:', markAsPublished.data);
```

**Interne Logik**:
```typescript
mutationFn: async (input) => {
  // 1. Timestamp erstellen
  const publishedTimestamp = Timestamp.fromDate(new Date(formData.publishedAt));

  // 2. Kampagne laden (für projectId)
  const campaign = await prService.getById(campaignId);

  // 3. Clipping-Daten vorbereiten
  const clippingData = {
    organizationId,
    campaignId,
    emailSendId: sendId,
    projectId: campaign?.projectId,
    title: formData.articleTitle || `Artikel von ${recipientName}`,
    url: formData.articleUrl,
    publishedAt: publishedTimestamp,
    outletName: formData.outletName || 'Unbekannt',
    outletType: formData.outletType,
    sentiment: formData.sentiment,
    sentimentScore: formData.sentimentScore,
    reach: parseInt(formData.reach) || undefined,
    detectionMethod: 'manual',
    detectedAt: Timestamp.now(),
    createdBy: userId,
    verifiedBy: userId,
    verifiedAt: Timestamp.now()
  };

  // 4. Clipping erstellen
  const clippingId = await clippingService.create(clippingData, { organizationId });

  // 5. Send-Status updaten
  await updateDoc(doc(db, 'email_campaign_sends', sendId), {
    publishedStatus: 'published',
    publishedAt: publishedTimestamp,
    clippingId,
    articleUrl: formData.articleUrl,
    sentiment: formData.sentiment,
    sentimentScore: formData.sentimentScore,
    manuallyMarkedPublished: true,
    markedPublishedBy: userId,
    markedPublishedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { clippingId };
}
```

**Success Callback**:
```typescript
onSuccess: () => {
  // 1. Cache invalidieren
  queryClient.invalidateQueries({ queryKey: ['clippings'] });
  queryClient.invalidateQueries({ queryKey: ['sends'] });
  queryClient.invalidateQueries({ queryKey: ['monitoring'] });

  // 2. Toast-Notification
  toastService.success('Erfolgreich als veröffentlicht markiert');
}
```

### useUpdateClipping()

Aktualisiert ein bestehendes Media Clipping und den zugehörigen Email-Versand.

**Signatur**:
```typescript
function useUpdateClipping(): UseMutationResult<
  void,
  Error,
  UpdateClippingInput,
  unknown
>
```

**Input**:
```typescript
interface UpdateClippingInput {
  organizationId: string;
  clippingId: string;          // ID des zu aktualisierenden Clippings
  sendId: string;
  recipientName: string;
  formData: UpdateClippingFormData;
}

interface UpdateClippingFormData {
  articleUrl: string;
  articleTitle: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  publishedAt: string;         // ISO Date string
}
```

**Beispiel**:
```typescript
const updateClipping = useUpdateClipping();

const handleUpdate = async () => {
  try {
    await updateClipping.mutateAsync({
      organizationId: 'org_123',
      clippingId: 'clipping_xyz',
      sendId: 'send_789',
      recipientName: 'Max Mustermann',
      formData: {
        articleUrl: 'https://example.com/article',
        articleTitle: 'Aktualisierter Titel',
        outletName: 'FAZ',
        outletType: 'print',
        reach: '3000000',
        sentiment: 'positive',
        sentimentScore: 0.8,
        publishedAt: '2025-11-17'
      }
    });

    console.log('Clipping aktualisiert');
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

**Interne Logik**:
```typescript
mutationFn: async (input) => {
  // 1. Timestamp erstellen
  const publishedTimestamp = Timestamp.fromDate(new Date(formData.publishedAt));

  // 2. Clipping updaten
  await clippingService.update(clippingId, {
    title: formData.articleTitle || `Artikel von ${recipientName}`,
    url: formData.articleUrl,
    publishedAt: publishedTimestamp,
    outletName: formData.outletName || 'Unbekannt',
    outletType: formData.outletType,
    sentiment: formData.sentiment,
    sentimentScore: formData.sentimentScore,
    reach: parseInt(formData.reach) || undefined,
    updatedAt: serverTimestamp()
  }, { organizationId });

  // 3. Send updaten
  await updateDoc(doc(db, 'email_campaign_sends', sendId), {
    publishedAt: publishedTimestamp,
    articleUrl: formData.articleUrl,
    sentiment: formData.sentiment,
    sentimentScore: formData.sentimentScore,
    articleTitle: formData.articleTitle || undefined,
    reach: parseInt(formData.reach) || undefined,
    updatedAt: serverTimestamp()
  });
}
```

## TypeScript-Typen

### Vollständige Type Definitions

```typescript
// ========================================
// Mark as Published Types
// ========================================

export interface MarkAsPublishedFormData {
  articleUrl: string;
  articleTitle: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;  // String wegen Input[type="number"] value
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;  // -1.0 bis 1.0
  publishedAt: string;  // ISO Date string (YYYY-MM-DD)
}

export interface MarkAsPublishedInput {
  organizationId: string;
  campaignId: string;
  sendId: string;
  userId: string;
  recipientName: string;
  formData: MarkAsPublishedFormData;
}

// ========================================
// Update Clipping Types
// ========================================

export interface UpdateClippingFormData {
  articleUrl: string;
  articleTitle: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  publishedAt: string;
}

export interface UpdateClippingInput {
  organizationId: string;
  clippingId: string;
  sendId: string;
  recipientName: string;
  formData: UpdateClippingFormData;
}

// ========================================
// React Query Types (automatisch inferiert)
// ========================================

type UseMarkAsPublishedResult = UseMutationResult<
  { clippingId: string },  // Success Data
  Error,                   // Error Type
  MarkAsPublishedInput,    // Variables
  unknown                  // Context
>;

type UseUpdateClippingResult = UseMutationResult<
  void,                    // Success Data (void)
  Error,
  UpdateClippingInput,
  unknown
>;
```

## Error Handling

### Automatisches Error Handling

Beide Mutations haben automatisches Error Handling eingebaut:

```typescript
onError: (error: Error) => {
  console.error('Fehler beim Markieren als veröffentlicht:', error);
  toastService.error(error.message || 'Fehler beim Speichern');
}
```

### Manuelles Error Handling

```typescript
const markAsPublished = useMarkAsPublished();

try {
  await markAsPublished.mutateAsync({ ... });
} catch (error) {
  // Custom Error Handling
  if (error.message.includes('permission-denied')) {
    alert('Keine Berechtigung für diese Aktion');
  } else {
    alert('Ein Fehler ist aufgetreten');
  }
}

// Oder reaktiv via Hook State
if (markAsPublished.isError) {
  console.error('Error:', markAsPublished.error);
}
```

### Häufige Fehler

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `organizationId is required` | Fehlender Multi-Tenancy Context | OrganizationContext laden |
| `permission-denied` | Keine Firestore-Berechtigung | Firestore Rules prüfen |
| `Campaign not found` | Ungültige campaignId | campaignId validieren |
| `Invalid date format` | Falsches publishedAt Format | ISO String verwenden (YYYY-MM-DD) |

## Cache-Strategie

### Invalidation

Nach erfolgreichen Mutations werden folgende Queries invalidiert:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['clippings'] });
  queryClient.invalidateQueries({ queryKey: ['sends'] });
  queryClient.invalidateQueries({ queryKey: ['monitoring'] });
}
```

**Warum diese Keys?**
- `['clippings']` - Clipping-Listen müssen neu geladen werden
- `['sends']` - Send-Status hat sich geändert (publishedStatus)
- `['monitoring']` - Monitoring-Dashboard muss aktualisiert werden

### Optimistic Updates (Future Enhancement)

Aktuell werden Optimistic Updates nicht verwendet. Future Enhancement:

```typescript
// NICHT IMPLEMENTIERT (könnte in Phase 5 hinzugefügt werden)
onMutate: async (newData) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: ['clippings'] });

  // Snapshot previous value
  const previousClippings = queryClient.getQueryData(['clippings']);

  // Optimistically update
  queryClient.setQueryData(['clippings'], (old) => [...old, newData]);

  return { previousClippings };
},
onError: (err, newData, context) => {
  // Rollback on error
  queryClient.setQueryData(['clippings'], context.previousClippings);
}
```

## Best Practices

### 1. Multi-Tenancy immer beachten

```typescript
// ✅ RICHTIG
const { currentOrganization } = useOrganization();

await markAsPublished.mutateAsync({
  organizationId: currentOrganization.id,
  // ...
});

// ❌ FALSCH
await markAsPublished.mutateAsync({
  organizationId: user.uid,  // Nutze NICHT userId
  // ...
});
```

### 2. Error Boundaries verwenden

```typescript
function MyComponent() {
  const markAsPublished = useMarkAsPublished();

  if (markAsPublished.isError) {
    return <ErrorMessage error={markAsPublished.error} />;
  }

  // ...
}
```

### 3. Loading States visualisieren

```typescript
<Button
  onClick={handleSubmit}
  disabled={markAsPublished.isPending}
>
  {markAsPublished.isPending ? 'Speichern...' : 'Speichern'}
</Button>
```

### 4. FormData validieren

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validierung
  if (!formData.articleUrl) {
    toastService.error('Artikel-URL ist erforderlich');
    return;
  }

  if (formData.reach && isNaN(parseInt(formData.reach))) {
    toastService.error('Reichweite muss eine Zahl sein');
    return;
  }

  // Mutation ausführen
  await markAsPublished.mutateAsync({ ... });
};
```

### 5. Cleanup in useEffect

```typescript
useEffect(() => {
  return () => {
    // Reset mutation state beim Unmount
    markAsPublished.reset();
  };
}, []);
```

## Siehe auch

- [useMonitoringMutations.md](./useMonitoringMutations.md) - Detaillierte API-Dokumentation
- [../components/README.md](../components/README.md) - Komponenten die diese Hooks verwenden
- [../adr/001-react-query-integration.md](../adr/001-react-query-integration.md) - Warum React Query?

---

**Letzte Aktualisierung**: 2025-11-17
**Lizenz**: Proprietär
