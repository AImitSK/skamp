# React Query Hooks - Detaillierte Referenz

> **Datei**: `src/lib/hooks/useStrategyDocuments.ts`
> **Zeilen**: 133
> **Letzte Aktualisierung**: 25. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [useStrategyDocuments (Query)](#usestrategydocuments-query)
- [useCreateStrategyDocument (Mutation)](#useCreatestrategydocument-mutation)
- [useUpdateStrategyDocument (Mutation)](#useupdatestrategydocument-mutation)
- [useArchiveStrategyDocument (Mutation)](#usearchivestrategydocument-mutation)
- [QueryKey-Struktur](#querykey-struktur)
- [Cache-Management](#cache-management)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Übersicht

Die `useStrategyDocuments.ts` Datei stellt **4 React Query Hooks** bereit, die das vollständige CRUD-Management für Strategiedokumente abbilden:

1. **useStrategyDocuments** - Query Hook zum Laden aller Dokumente eines Projekts
2. **useCreateStrategyDocument** - Mutation Hook zum Erstellen neuer Dokumente
3. **useUpdateStrategyDocument** - Mutation Hook zum Aktualisieren bestehender Dokumente (mit automatischer Versionierung)
4. **useArchiveStrategyDocument** - Mutation Hook zum Archivieren von Dokumenten (Soft Delete)

Alle Hooks nutzen **@tanstack/react-query** für:
- Automatisches Caching
- Optimistic Updates
- Retry-Logic
- Error Handling
- Cache Invalidierung

---

## useStrategyDocuments (Query)

### Signatur

```typescript
function useStrategyDocuments(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<StrategyDocument[], Error>
```

### Beschreibung

Lädt alle Strategiedokumente für ein Projekt mit automatischem Caching und staleTime von 5 Minuten.

### Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `projectId` | `string \| undefined` | Ja | ID des Projekts, für das Dokumente geladen werden sollen |
| `organizationId` | `string \| undefined` | Ja | ID der Organisation (Multi-Tenancy) |

### Rückgabewert

```typescript
{
  data: StrategyDocument[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  refetch: () => Promise<...>;
  // ... weitere React Query Eigenschaften
}
```

### Konfiguration

```typescript
{
  queryKey: ['strategy-documents', projectId, organizationId],
  queryFn: async () => {
    if (!projectId || !organizationId) {
      throw new Error('Missing projectId or organizationId');
    }
    return strategyDocumentService.getByProjectId(projectId, { organizationId });
  },
  enabled: !!projectId && !!organizationId,
  staleTime: 5 * 60 * 1000, // 5 Minuten
}
```

**Wichtige Features:**
- **Enabled-Logic**: Query läuft nur wenn beide IDs vorhanden sind
- **StaleTime**: 5 Minuten → Daten werden nicht ständig neu geladen
- **Automatische Re-Fetches**: Bei Window-Focus und Netzwerk-Reconnect

### Verwendungsbeispiele

#### Basis-Verwendung

```tsx
import { useStrategyDocuments } from '@/lib/hooks/useStrategyDocuments';

function DocumentList({ projectId, organizationId }) {
  const { data: documents, isLoading, error } = useStrategyDocuments(
    projectId,
    organizationId
  );

  if (isLoading) {
    return <div>Lädt Dokumente...</div>;
  }

  if (error) {
    return <div>Fehler: {error.message}</div>;
  }

  return (
    <ul>
      {documents?.map(doc => (
        <li key={doc.id}>{doc.title}</li>
      ))}
    </ul>
  );
}
```

#### Mit Loading Skeleton

```tsx
function DocumentListWithSkeleton({ projectId, organizationId }) {
  const { data: documents, isLoading } = useStrategyDocuments(projectId, organizationId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul>
      {documents?.map(doc => (
        <li key={doc.id}>
          <h3>{doc.title}</h3>
          <p className="text-sm text-gray-600">{doc.status}</p>
        </li>
      ))}
    </ul>
  );
}
```

#### Mit Filterung und Sortierung

```tsx
function FilteredDocumentList({ projectId, organizationId }) {
  const { data: documents } = useStrategyDocuments(projectId, organizationId);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    if (statusFilter === 'all') return documents;

    return documents.filter(doc => doc.status === statusFilter);
  }, [documents, statusFilter]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      // Sortiere nach updatedAt (neueste zuerst)
      return b.updatedAt.seconds - a.updatedAt.seconds;
    });
  }, [filteredDocuments]);

  return (
    <div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="all">Alle</option>
        <option value="draft">Entwurf</option>
        <option value="review">In Prüfung</option>
        <option value="approved">Freigegeben</option>
      </select>

      <ul>
        {sortedDocuments.map(doc => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Mit manuellem Refetch

```tsx
function DocumentListWithRefresh({ projectId, organizationId }) {
  const { data: documents, refetch, isRefetching } = useStrategyDocuments(
    projectId,
    organizationId
  );

  return (
    <div>
      <button
        onClick={() => refetch()}
        disabled={isRefetching}
      >
        {isRefetching ? 'Aktualisiert...' : 'Aktualisieren'}
      </button>

      <ul>
        {documents?.map(doc => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## useCreateStrategyDocument (Mutation)

### Signatur

```typescript
function useCreateStrategyDocument(): UseMutationResult<
  string,
  Error,
  {
    projectId: string;
    organizationId: string;
    userId: string;
    documentData: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  }
>
```

### Beschreibung

Erstellt ein neues Strategiedokument und invalidiert automatisch den Query-Cache nach erfolgreichem Erstellen.

### Mutation-Parameter

```typescript
{
  projectId: string;
  organizationId: string;
  userId: string;
  documentData: {
    projectId: string;
    organizationId: string;
    title: string;
    type: 'briefing' | 'strategy' | 'analysis' | 'notes';
    content: string;
    plainText?: string;
    status: 'draft' | 'review' | 'approved' | 'archived';
    author: string;
    authorName: string;
    templateId?: string;
    templateName?: string;
  };
}
```

### Rückgabewert

```typescript
{
  mutate: (variables, options?) => void;
  mutateAsync: (variables, options?) => Promise<string>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: string | undefined; // documentId
}
```

### Cache-Invalidierung

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({
    queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
  });
}
```

Nach erfolgreichem Erstellen wird der Query-Cache für die betroffene Projekt-Organisation-Kombination invalidiert.

### Verwendungsbeispiele

#### Basis-Erstellung

```tsx
import { useCreateStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function CreateDocumentButton({ projectId, organizationId, userId }) {
  const { mutate, isLoading } = useCreateStrategyDocument();

  const handleCreate = () => {
    mutate({
      projectId,
      organizationId,
      userId,
      documentData: {
        projectId,
        organizationId,
        title: 'Neues Strategiedokument',
        type: 'strategy',
        content: '<h1>Neue Strategie</h1>',
        status: 'draft',
        author: userId,
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

#### Mit Success/Error Callbacks

```tsx
function CreateDocumentWithFeedback({ projectId, organizationId, userId }) {
  const { mutate, isLoading } = useCreateStrategyDocument();
  const [message, setMessage] = useState<string>('');

  const handleCreate = () => {
    mutate(
      {
        projectId,
        organizationId,
        userId,
        documentData: {
          projectId,
          organizationId,
          title: 'Neues Dokument',
          type: 'strategy',
          content: '<h1>Content</h1>',
          status: 'draft',
          author: userId,
          authorName: 'Max Mustermann'
        }
      },
      {
        onSuccess: (documentId) => {
          setMessage(`Dokument erfolgreich erstellt: ${documentId}`);
        },
        onError: (error) => {
          setMessage(`Fehler: ${error.message}`);
        }
      }
    );
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        {isLoading ? 'Erstellt...' : 'Dokument erstellen'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

#### Mit React Hot Toast

```tsx
import toast from 'react-hot-toast';

function CreateDocumentWithToast({ projectId, organizationId, userId }) {
  const { mutate, isLoading } = useCreateStrategyDocument();

  const handleCreate = () => {
    mutate(
      {
        projectId,
        organizationId,
        userId,
        documentData: {
          projectId,
          organizationId,
          title: 'Neues Dokument',
          type: 'strategy',
          content: '<h1>Content</h1>',
          status: 'draft',
          author: userId,
          authorName: 'Max Mustermann'
        }
      },
      {
        onSuccess: () => {
          toast.success('Dokument erfolgreich erstellt');
        },
        onError: (error) => {
          toast.error(`Fehler: ${error.message}`);
        }
      }
    );
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Erstellt...' : 'Dokument erstellen'}
    </button>
  );
}
```

#### Aus Template erstellen

```tsx
import { STRATEGY_TEMPLATES } from '@/constants/strategy-templates';

function CreateFromTemplate({ templateType, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useCreateStrategyDocument();

  const handleCreate = () => {
    const template = STRATEGY_TEMPLATES[templateType];

    mutate({
      projectId,
      organizationId,
      userId,
      documentData: {
        projectId,
        organizationId,
        title: template.title,
        type: 'strategy',
        content: template.content,
        plainText: '', // Wird vom Service generiert
        status: 'draft',
        author: userId,
        authorName: 'Max Mustermann',
        templateId: templateType,
        templateName: template.title
      }
    });
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {template.title} erstellen
    </button>
  );
}
```

---

## useUpdateStrategyDocument (Mutation)

### Signatur

```typescript
function useUpdateStrategyDocument(): UseMutationResult<
  void,
  Error,
  {
    id: string;
    projectId: string;
    organizationId: string;
    userId: string;
    updates: Partial<Pick<StrategyDocument, 'title' | 'content' | 'status' | 'plainText' | 'version'>>;
    versionNotes: string;
  }
>
```

### Beschreibung

Aktualisiert ein bestehendes Strategiedokument und erstellt automatisch eine neue Version bei Content-Änderungen. Invalidiert den Query-Cache nach Erfolg.

### Mutation-Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `id` | `string` | Ja | ID des zu aktualisierenden Dokuments |
| `projectId` | `string` | Ja | Projekt-ID (für Cache-Invalidierung) |
| `organizationId` | `string` | Ja | Organisations-ID (Multi-Tenancy) |
| `userId` | `string` | Ja | ID des aktualisierenden Users |
| `updates` | `Partial<...>` | Ja | Zu aktualisierende Felder |
| `versionNotes` | `string` | Ja | Notiz für die Versionsverwaltung |

### Versionierung-Logic

Wenn `updates.content` sich vom aktuellen Content unterscheidet:
1. Neue Version wird erstellt (`version++`)
2. Content wird in `document_versions` Collection gespeichert
3. Hauptdokument wird aktualisiert

```typescript
// Interne Service-Logic
if (updates.content && updates.content !== currentDoc.content) {
  const newVersion = currentDoc.version + 1;

  await this.createVersion(documentId, {
    version: newVersion,
    content: updates.content,
    versionNotes,
    createdBy: context.userId
  });

  updates = { ...updates, version: newVersion };
}
```

### Verwendungsbeispiele

#### Basis-Update

```tsx
import { useUpdateStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function EditDocumentButton({ document, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useUpdateStrategyDocument();

  const handleUpdate = () => {
    mutate({
      id: document.id,
      projectId,
      organizationId,
      userId,
      updates: {
        title: 'Aktualisierter Titel',
        content: '<h1>Neuer Content</h1>'
      },
      versionNotes: 'Titel und Content aktualisiert'
    });
  };

  return (
    <button onClick={handleUpdate} disabled={isLoading}>
      {isLoading ? 'Speichert...' : 'Speichern'}
    </button>
  );
}
```

#### Status-Änderung (ohne neue Version)

```tsx
function ApproveDocumentButton({ document, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useUpdateStrategyDocument();

  const handleApprove = () => {
    mutate({
      id: document.id,
      projectId,
      organizationId,
      userId,
      updates: {
        status: 'approved'
      },
      versionNotes: 'Dokument freigegeben'
    });
  };

  return (
    <button onClick={handleApprove} disabled={isLoading}>
      {isLoading ? 'Genehmigt...' : 'Freigeben'}
    </button>
  );
}
```

#### Vollständiger Editor mit Form

```tsx
function DocumentEditor({ document, projectId, organizationId, userId, onClose }) {
  const { mutate, isLoading } = useUpdateStrategyDocument();
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [versionNotes, setVersionNotes] = useState('');

  const handleSave = () => {
    mutate(
      {
        id: document.id,
        projectId,
        organizationId,
        userId,
        updates: {
          title,
          content
        },
        versionNotes: versionNotes || 'Bearbeitung'
      },
      {
        onSuccess: () => {
          toast.success('Dokument gespeichert');
          onClose();
        },
        onError: (error) => {
          toast.error(`Fehler: ${error.message}`);
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        className="w-full px-3 py-2 border rounded"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content (HTML)"
        className="w-full px-3 py-2 border rounded h-64"
      />

      <input
        type="text"
        value={versionNotes}
        onChange={(e) => setVersionNotes(e.target.value)}
        placeholder="Änderungsnotiz"
        className="w-full px-3 py-2 border rounded"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {isLoading ? 'Speichert...' : 'Speichern'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
```

#### Mit Optimistic Update

```tsx
import { useQueryClient } from '@tanstack/react-query';

function QuickStatusChange({ document, projectId, organizationId, userId }) {
  const { mutate } = useUpdateStrategyDocument();
  const queryClient = useQueryClient();

  const handleStatusChange = (newStatus: string) => {
    mutate(
      {
        id: document.id,
        projectId,
        organizationId,
        userId,
        updates: { status: newStatus as any },
        versionNotes: `Status geändert zu ${newStatus}`
      },
      {
        // Optimistic Update: UI sofort aktualisieren
        onMutate: async () => {
          await queryClient.cancelQueries({
            queryKey: ['strategy-documents', projectId, organizationId]
          });

          const previousData = queryClient.getQueryData([
            'strategy-documents',
            projectId,
            organizationId
          ]);

          queryClient.setQueryData(
            ['strategy-documents', projectId, organizationId],
            (old: StrategyDocument[] | undefined) => {
              if (!old) return old;
              return old.map(doc =>
                doc.id === document.id ? { ...doc, status: newStatus } : doc
              );
            }
          );

          return { previousData };
        },
        onError: (err, variables, context) => {
          // Rollback bei Fehler
          if (context?.previousData) {
            queryClient.setQueryData(
              ['strategy-documents', projectId, organizationId],
              context.previousData
            );
          }
        }
      }
    );
  };

  return (
    <select
      value={document.status}
      onChange={(e) => handleStatusChange(e.target.value)}
    >
      <option value="draft">Entwurf</option>
      <option value="review">In Prüfung</option>
      <option value="approved">Freigegeben</option>
    </select>
  );
}
```

---

## useArchiveStrategyDocument (Mutation)

### Signatur

```typescript
function useArchiveStrategyDocument(): UseMutationResult<
  void,
  Error,
  {
    id: string;
    projectId: string;
    organizationId: string;
    userId: string;
  }
>
```

### Beschreibung

Archiviert ein Strategiedokument (Soft Delete). Das Dokument wird nicht gelöscht, sondern nur der Status wird auf `'archived'` gesetzt. Invalidiert den Query-Cache nach Erfolg.

### Mutation-Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `id` | `string` | Ja | ID des zu archivierenden Dokuments |
| `projectId` | `string` | Ja | Projekt-ID (für Cache-Invalidierung) |
| `organizationId` | `string` | Ja | Organisations-ID (Multi-Tenancy) |
| `userId` | `string` | Ja | ID des archivierenden Users |

### Soft Delete Logic

Intern ruft der Hook `strategyDocumentService.archive()` auf, was wiederum `update()` mit `status: 'archived'` aufruft:

```typescript
async archive(documentId: string, context: { organizationId: string; userId: string }) {
  await this.update(documentId, { status: 'archived' }, 'Dokument archiviert', context);
}
```

### Verwendungsbeispiele

#### Basis-Archivierung

```tsx
import { useArchiveStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function ArchiveButton({ documentId, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useArchiveStrategyDocument();

  const handleArchive = () => {
    mutate({
      id: documentId,
      projectId,
      organizationId,
      userId
    });
  };

  return (
    <button onClick={handleArchive} disabled={isLoading}>
      {isLoading ? 'Archiviert...' : 'Archivieren'}
    </button>
  );
}
```

#### Mit Bestätigungs-Dialog

```tsx
function ArchiveButtonWithConfirm({ document, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useArchiveStrategyDocument();

  const handleArchive = () => {
    if (confirm(`Dokument "${document.title}" wirklich archivieren?`)) {
      mutate(
        {
          id: document.id,
          projectId,
          organizationId,
          userId
        },
        {
          onSuccess: () => {
            toast.success('Dokument archiviert');
          },
          onError: (error) => {
            toast.error(`Fehler: ${error.message}`);
          }
        }
      );
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={isLoading}
      className="text-red-600 hover:text-red-800"
    >
      {isLoading ? 'Archiviert...' : 'Archivieren'}
    </button>
  );
}
```

#### Mit Modal-Dialog

```tsx
function ArchiveModal({ document, isOpen, onClose, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useArchiveStrategyDocument();

  const handleConfirm = () => {
    mutate(
      {
        id: document.id,
        projectId,
        organizationId,
        userId
      },
      {
        onSuccess: () => {
          toast.success('Dokument archiviert');
          onClose();
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h3 className="text-lg font-semibold mb-4">Dokument archivieren</h3>
        <p className="mb-6">
          Möchten Sie das Dokument "{document.title}" wirklich archivieren?
          <br />
          <span className="text-sm text-gray-500">
            Archivierte Dokumente können später wiederhergestellt werden.
          </span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            {isLoading ? 'Archiviert...' : 'Archivieren'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Bulk-Archivierung

```tsx
function BulkArchiveButton({ selectedDocuments, projectId, organizationId, userId }) {
  const { mutate } = useArchiveStrategyDocument();
  const [archivingCount, setArchivingCount] = useState(0);

  const handleBulkArchive = async () => {
    if (!confirm(`${selectedDocuments.length} Dokumente archivieren?`)) return;

    setArchivingCount(selectedDocuments.length);

    for (const doc of selectedDocuments) {
      await new Promise((resolve) => {
        mutate(
          {
            id: doc.id,
            projectId,
            organizationId,
            userId
          },
          {
            onSettled: () => {
              setArchivingCount((prev) => prev - 1);
              resolve(undefined);
            }
          }
        );
      });
    }

    toast.success(`${selectedDocuments.length} Dokumente archiviert`);
  };

  return (
    <button onClick={handleBulkArchive} disabled={archivingCount > 0}>
      {archivingCount > 0
        ? `Archiviert... (${archivingCount} verbleibend)`
        : `${selectedDocuments.length} Dokumente archivieren`}
    </button>
  );
}
```

---

## QueryKey-Struktur

### Standard QueryKey

```typescript
['strategy-documents', projectId, organizationId]
```

**Komponenten:**
1. `'strategy-documents'` - Namespace für alle Strategy Document Queries
2. `projectId` - Spezifisches Projekt
3. `organizationId` - Spezifische Organisation (Multi-Tenancy)

### Warum diese Struktur?

- **Isolation**: Jede Projekt-Organisation-Kombination hat einen eigenen Cache
- **Invalidierung**: Bei Mutations kann gezielt der Cache der betroffenen Kombination invalidiert werden
- **Multi-Tenancy**: Verhindert Cache-Collisions zwischen Organisationen

### Beispiele für Cache-Keys

```typescript
// Projekt A in Organisation 1
['strategy-documents', 'project-a-id', 'org-1-id']

// Projekt A in Organisation 2 (andere Daten!)
['strategy-documents', 'project-a-id', 'org-2-id']

// Projekt B in Organisation 1
['strategy-documents', 'project-b-id', 'org-1-id']
```

---

## Cache-Management

### Automatische Invalidierung

Alle Mutation-Hooks invalidieren automatisch den passenden Query-Cache:

```typescript
queryClient.invalidateQueries({
  queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
});
```

### Manuelle Invalidierung

```tsx
import { useQueryClient } from '@tanstack/react-query';

function ManualRefresh({ projectId, organizationId }) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['strategy-documents', projectId, organizationId]
    });
  };

  return <button onClick={handleRefresh}>Aktualisieren</button>;
}
```

### Cache-Reset (alle Strategy Documents)

```tsx
function ResetAllCaches() {
  const queryClient = useQueryClient();

  const handleReset = () => {
    queryClient.invalidateQueries({
      queryKey: ['strategy-documents']
    });
  };

  return <button onClick={handleReset}>Alle Caches zurücksetzen</button>;
}
```

### Prefetching

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { strategyDocumentService } from '@/lib/firebase/strategy-document-service';

function PrefetchDocuments({ projectId, organizationId }) {
  const queryClient = useQueryClient();

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['strategy-documents', projectId, organizationId],
      queryFn: () =>
        strategyDocumentService.getByProjectId(projectId, { organizationId }),
      staleTime: 5 * 60 * 1000
    });
  };

  return <button onMouseEnter={handlePrefetch}>Hover to prefetch</button>;
}
```

---

## Best Practices

### 1. Immer Enabled-Logic verwenden

```tsx
// ✅ Gut: Query läuft nur wenn IDs vorhanden
const { data } = useStrategyDocuments(projectId, organizationId);

// ❌ Schlecht: Query könnte mit undefined IDs laufen
const { data } = useStrategyDocuments(maybeProjectId, maybeOrgId);
```

### 2. Callbacks für User-Feedback

```tsx
// ✅ Gut: User bekommt Feedback
mutate(data, {
  onSuccess: () => toast.success('Erfolgreich!'),
  onError: (err) => toast.error(err.message)
});

// ❌ Schlecht: User weiß nicht, ob es funktioniert hat
mutate(data);
```

### 3. Loading States behandeln

```tsx
// ✅ Gut: Loading State wird angezeigt
if (isLoading) return <Spinner />;

// ❌ Schlecht: Komponente zeigt undefined-Daten
return <div>{data?.map(...)}</div>; // crash wenn data undefined
```

### 4. Error Boundaries verwenden

```tsx
// ✅ Gut: Error wird abgefangen
<ErrorBoundary fallback={<ErrorMessage />}>
  <DocumentList projectId={id} organizationId={orgId} />
</ErrorBoundary>

// ❌ Schlecht: App crashed bei Fehler
<DocumentList projectId={id} organizationId={orgId} />
```

### 5. Memoization für gefilterte Daten

```tsx
// ✅ Gut: Filter wird nur bei Änderung neu berechnet
const filtered = useMemo(() =>
  documents?.filter(d => d.status === status),
  [documents, status]
);

// ❌ Schlecht: Filter wird bei jedem Render neu berechnet
const filtered = documents?.filter(d => d.status === status);
```

---

## Troubleshooting

### Problem: Query läuft nicht

**Symptom**: `data` bleibt `undefined`, `isLoading` ist `false`

**Lösung**: Prüfe, ob beide IDs vorhanden sind:
```tsx
console.log({ projectId, organizationId }); // Beide müssen Strings sein
```

---

### Problem: Cache wird nicht invalidiert

**Symptom**: Nach Mutation werden alte Daten angezeigt

**Lösung 1**: Prüfe, ob QueryKey übereinstimmt:
```tsx
// Query
['strategy-documents', projectId, organizationId]

// Mutation onSuccess
['strategy-documents', variables.projectId, variables.organizationId]
```

**Lösung 2**: Manuelle Invalidierung:
```tsx
queryClient.invalidateQueries({ queryKey: ['strategy-documents'] });
```

---

### Problem: Zu viele Re-Fetches

**Symptom**: Netzwerk-Tab zeigt viele Firestore-Requests

**Lösung**: Erhöhe `staleTime`:
```tsx
useQuery({
  ...,
  staleTime: 10 * 60 * 1000 // 10 Minuten statt 5
});
```

---

### Problem: Mutation schlägt fehl mit "Missing organizationId"

**Symptom**: Error "Missing projectId or organizationId"

**Lösung**: Stelle sicher, dass alle Parameter übergeben werden:
```tsx
mutate({
  projectId,         // ✅
  organizationId,    // ✅
  userId,            // ✅
  documentData: { ... }
});
```

---

### Problem: TypeScript-Fehler bei documentData

**Symptom**: Type error bei `documentData`

**Lösung**: Verwende korrekte Omit-Type:
```tsx
const documentData: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
  projectId,
  organizationId,
  title: 'Test',
  type: 'strategy',
  content: '<h1>Test</h1>',
  status: 'draft',
  author: userId,
  authorName: 'Test User'
};
```

---

**Letzte Aktualisierung**: 25. Oktober 2025
**Dokumentiert von**: Claude AI (Anthropic)
