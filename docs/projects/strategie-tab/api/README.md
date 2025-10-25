# API-Übersicht - Strategie Tab

> **Modul**: Strategie Tab API
> **Version**: 0.1.0
> **Letzte Aktualisierung**: 25. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [React Query Hooks](#react-query-hooks)
- [Firebase Service](#firebase-service)
- [Constants & Types](#constants--types)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Error Handling](#error-handling)
- [Performance & Caching](#performance--caching)
- [Weiterführende Dokumentation](#weiterführende-dokumentation)

---

## Übersicht

Das Strategie Tab Modul stellt drei Haupt-API-Schichten bereit:

1. **React Query Hooks** (`useStrategyDocuments.ts`) - Client-seitiges State Management
2. **Firebase Service** (`strategy-document-service.ts`) - Backend-Integration
3. **Constants & Types** (`strategy-templates.ts`) - Template-Definitionen und TypeScript-Typen

---

## React Query Hooks

### Verfügbare Hooks

Die `useStrategyDocuments.ts` Datei exportiert **4 React Query Hooks** für vollständiges CRUD-Management:

| Hook | Typ | Beschreibung |
|------|-----|--------------|
| **useStrategyDocuments** | Query | Lädt alle Strategiedokumente für ein Projekt |
| **useCreateStrategyDocument** | Mutation | Erstellt ein neues Strategiedokument |
| **useUpdateStrategyDocument** | Mutation | Aktualisiert ein bestehendes Dokument (mit Versionierung) |
| **useArchiveStrategyDocument** | Mutation | Archiviert ein Dokument (Soft Delete) |

### Query Hook

```typescript
useStrategyDocuments(projectId: string | undefined, organizationId: string | undefined)
```

**Returns:**
```typescript
{
  data: StrategyDocument[] | undefined,
  isLoading: boolean,
  error: Error | null,
  refetch: () => void
}
```

**Features:**
- Automatisches Caching (5 Minuten)
- Enabled-Logic: Query läuft nur wenn beide IDs vorhanden
- Automatische Error-Behandlung

### Mutation Hooks

**useCreateStrategyDocument()**
```typescript
{
  mutate: (data: {
    projectId: string;
    organizationId: string;
    userId: string;
    documentData: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  }) => void;
  isLoading: boolean;
  error: Error | null;
}
```

**useUpdateStrategyDocument()**
```typescript
{
  mutate: (data: {
    id: string;
    projectId: string;
    organizationId: string;
    userId: string;
    updates: Partial<Pick<StrategyDocument, 'title' | 'content' | 'status' | 'plainText' | 'version'>>;
    versionNotes: string;
  }) => void;
  isLoading: boolean;
  error: Error | null;
}
```

**useArchiveStrategyDocument()**
```typescript
{
  mutate: (data: {
    id: string;
    projectId: string;
    organizationId: string;
    userId: string;
  }) => void;
  isLoading: boolean;
  error: Error | null;
}
```

**Alle Mutations invalidieren automatisch den Query-Cache nach Erfolg.**

---

## Firebase Service

### strategyDocumentService

Der `strategyDocumentService` ist ein Singleton-Service für Firebase Firestore-Operationen.

#### Hauptmethoden

| Methode | Beschreibung | Rückgabewert |
|---------|--------------|--------------|
| `create()` | Erstellt ein neues Dokument | `Promise<string>` (documentId) |
| `getById()` | Holt ein Dokument nach ID | `Promise<StrategyDocument \| null>` |
| `getByProjectId()` | Holt alle Dokumente eines Projekts | `Promise<StrategyDocument[]>` |
| `update()` | Aktualisiert ein Dokument | `Promise<void>` |
| `archive()` | Archiviert ein Dokument | `Promise<void>` |
| `getVersions()` | Holt alle Versionen eines Dokuments | `Promise<DocumentVersion[]>` |
| `getTemplates()` | Holt verfügbare Templates | `Promise<DocumentTemplate[]>` |
| `createFromTemplate()` | Erstellt Dokument aus Template | `Promise<string>` |
| `exportToPDF()` | Exportiert Dokument als PDF | `Promise<Blob>` |

#### Multi-Tenancy Security

Alle Methoden verlangen einen `context`-Parameter mit `organizationId`:

```typescript
context: { organizationId: string; userId?: string }
```

**Sicherheitsfeatures:**
- Alle Firestore-Queries filtern nach `organizationId`
- `getById()` prüft, ob Dokument zur Organisation gehört
- Verhindert Cross-Organization-Zugriff

#### Versionierung

Bei Content-Änderungen erstellt `update()` automatisch eine neue Version:

```typescript
// Interne Versionsverwaltung
if (updates.content !== currentDoc.content) {
  const newVersion = currentDoc.version + 1;
  await this.createVersion(documentId, {
    version: newVersion,
    content: updates.content,
    versionNotes,
    createdBy: context.userId
  });
}
```

---

## Constants & Types

### STRATEGY_TEMPLATES

Die `STRATEGY_TEMPLATES` Konstante definiert alle verfügbaren Templates:

```typescript
export const STRATEGY_TEMPLATES: Record<TemplateType, StrategyTemplate> = {
  'blank': { ... },
  'table': { ... },
  'company-profile': { ... },
  'situation-analysis': { ... },
  'audience-analysis': { ... },
  'core-messages': { ... }
};
```

**Template-Struktur:**
```typescript
interface StrategyTemplate {
  title: string;           // Anzeigename
  description: string;     // Kurzbeschreibung
  content: string;         // HTML-Content (TipTap-kompatibel)
}
```

### TemplateType

```typescript
export type TemplateType =
  | 'blank'
  | 'table'
  | 'company-profile'
  | 'situation-analysis'
  | 'audience-analysis'
  | 'core-messages';
```

### StrategyDocument Interface

```typescript
interface StrategyDocument {
  id: string;
  projectId: string;
  organizationId: string;

  // Content
  title: string;
  content: string;           // HTML vom TipTap Editor
  plainText?: string;        // Plain-Text Version

  // Metadaten
  type: 'briefing' | 'strategy' | 'analysis' | 'notes';
  status: 'draft' | 'review' | 'approved' | 'archived';

  // Autor
  author: string;
  authorName: string;

  // Versionierung
  version: number;
  previousVersionId?: string;
  versionNotes?: string;

  // Template-Info
  templateId?: string;
  templateName?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Verwendungsbeispiele

### Beispiel 1: Dokumente laden

```tsx
import { useStrategyDocuments } from '@/lib/hooks/useStrategyDocuments';

function DocumentList({ projectId, organizationId }) {
  const { data: documents, isLoading, error } = useStrategyDocuments(
    projectId,
    organizationId
  );

  if (isLoading) return <div>Lädt Dokumente...</div>;
  if (error) return <div>Fehler: {error.message}</div>;

  return (
    <ul>
      {documents?.map(doc => (
        <li key={doc.id}>
          <h3>{doc.title}</h3>
          <p>Status: {doc.status}</p>
          <p>Version: {doc.version}</p>
        </li>
      ))}
    </ul>
  );
}
```

### Beispiel 2: Dokument erstellen

```tsx
import { useCreateStrategyDocument } from '@/lib/hooks/useStrategyDocuments';
import { STRATEGY_TEMPLATES } from '@/constants/strategy-templates';

function CreateDocumentButton({ projectId, organizationId, userId }) {
  const { mutate, isLoading } = useCreateStrategyDocument();

  const handleCreate = () => {
    const template = STRATEGY_TEMPLATES['company-profile'];

    mutate({
      projectId,
      organizationId,
      userId,
      documentData: {
        projectId,
        organizationId,
        title: 'Neues Unternehmensprofil',
        type: 'strategy',
        content: template.content,
        plainText: '',
        status: 'draft',
        author: userId,
        authorName: 'Max Mustermann',
        templateId: 'company-profile',
        templateName: template.title
      }
    }, {
      onSuccess: (documentId) => {
        console.log('Dokument erstellt:', documentId);
      },
      onError: (error) => {
        console.error('Fehler beim Erstellen:', error);
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

### Beispiel 3: Dokument aktualisieren (mit Versionierung)

```tsx
import { useUpdateStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function EditDocumentForm({ document, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useUpdateStrategyDocument();
  const [content, setContent] = useState(document.content);

  const handleSave = () => {
    mutate({
      id: document.id,
      projectId,
      organizationId,
      userId,
      updates: {
        content,
        status: 'review' // Status auf "In Prüfung" setzen
      },
      versionNotes: 'Überarbeitung nach Feedback vom Team'
    }, {
      onSuccess: () => {
        console.log('Dokument aktualisiert und neue Version erstellt');
      }
    });
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button onClick={handleSave} disabled={isLoading}>
        Speichern
      </button>
    </div>
  );
}
```

### Beispiel 4: Dokument archivieren

```tsx
import { useArchiveStrategyDocument } from '@/lib/hooks/useStrategyDocuments';

function ArchiveButton({ documentId, projectId, organizationId, userId }) {
  const { mutate, isLoading } = useArchiveStrategyDocument();

  const handleArchive = () => {
    if (confirm('Dokument wirklich archivieren?')) {
      mutate({
        id: documentId,
        projectId,
        organizationId,
        userId
      }, {
        onSuccess: () => {
          console.log('Dokument archiviert');
        }
      });
    }
  };

  return (
    <button onClick={handleArchive} disabled={isLoading}>
      {isLoading ? 'Archiviert...' : 'Archivieren'}
    </button>
  );
}
```

### Beispiel 5: Templates abrufen

```typescript
import { strategyDocumentService } from '@/lib/firebase/strategy-document-service';

async function loadTemplates(organizationId: string) {
  // Lädt Built-in Templates + Custom-Templates der Organisation
  const templates = await strategyDocumentService.getTemplates(organizationId);

  console.log(`${templates.length} Templates verfügbar`);

  templates.forEach(template => {
    console.log(`- ${template.name} (${template.type})`);
  });
}
```

---

## Error Handling

### React Query Error Handling

Alle Hooks bieten automatisches Error Handling:

```tsx
const { data, error, isError } = useStrategyDocuments(projectId, organizationId);

if (isError) {
  return <ErrorMessage error={error} />;
}
```

### Service-Level Error Handling

Der `strategyDocumentService` wirft Fehler, die von React Query abgefangen werden:

```typescript
try {
  await strategyDocumentService.create(data, context);
} catch (error) {
  console.error('Fehler beim Erstellen:', error);
  // React Query behandelt den Fehler automatisch
  throw error;
}
```

### Typische Fehlerszenarien

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Missing projectId or organizationId` | IDs nicht übergeben | Prüfe, ob beide IDs vorhanden sind |
| `Strategiedokument nicht gefunden` | Falsches documentId oder keine Berechtigung | Prüfe ID und organizationId |
| `Permission denied` | Firestore Security Rules blockieren Zugriff | Prüfe organizationId-Übereinstimmung |

---

## Performance & Caching

### React Query Cache-Konfiguration

```typescript
useQuery({
  queryKey: ['strategy-documents', projectId, organizationId],
  queryFn: async () => { ... },
  enabled: !!projectId && !!organizationId,
  staleTime: 5 * 60 * 1000, // 5 Minuten
});
```

**Vorteile:**
- **Reduzierte Firestore-Reads**: Daten werden 5 Minuten gecacht
- **Automatische Invalidierung**: Bei Mutations wird der Cache aktualisiert
- **Background Refetch**: Daten werden im Hintergrund aktualisiert

### Cache-Invalidierung bei Mutations

Alle Mutation-Hooks invalidieren automatisch den Query-Cache:

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({
    queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
  });
}
```

### Manuelle Cache-Invalidierung

```tsx
import { useQueryClient } from '@tanstack/react-query';

function RefreshButton({ projectId, organizationId }) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['strategy-documents', projectId, organizationId]
    });
  };

  return <button onClick={handleRefresh}>Aktualisieren</button>;
}
```

---

## Weiterführende Dokumentation

### Detaillierte API-Referenz
- **[Hook-Referenz](./strategie-tab-hooks.md)** - Vollständige Dokumentation aller React Query Hooks mit Signaturen, Parametern und erweiterten Beispielen

### Komponenten-Dokumentation
- **[Komponenten](../components/README.md)** - Dokumentation der React-Komponenten, die diese APIs verwenden

### Architecture Decision Records
- **[ADR-0001: React Query vs. direkter Service-Call](../adr/README.md#adr-0001-react-query-vs-direkter-service-call)** - Warum React Query gewählt wurde

### Externe Ressourcen
- [React Query Dokumentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Firebase Firestore Dokumentation](https://firebase.google.com/docs/firestore)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

---

**Letzte Aktualisierung**: 25. Oktober 2025
