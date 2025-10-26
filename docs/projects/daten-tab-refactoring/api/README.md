# Daten Tab - API Dokumentation

> **Modul**: Daten Tab API
> **Version**: 1.0.0
> **Status**: ✅ Produktionsreif
> **Letzte Aktualisierung**: 2025-10-26

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [DatenTabContent Component API](#datentabcontent-component-api)
- [ProjectFoldersView API (Shared)](#projectfoldersview-api-shared)
- [TypeScript Interfaces](#typescript-interfaces)
- [Props Validation](#props-validation)
- [Return Types](#return-types)
- [Error Handling](#error-handling)
- [Code-Beispiele](#code-beispiele)
- [Best Practices](#best-practices)

---

## Übersicht

Die Daten Tab API besteht aus **zwei Ebenen**:

1. **DatenTabContent API** - Wrapper-Komponente (49 LOC)
2. **ProjectFoldersView API** - Shared Component (Phase 0.1)

```
DatenTabContent (API Layer 1)
    ↓
ProjectFoldersView (API Layer 2)
    ↓
Custom Hooks (useFolderNavigation, useFileActions, etc.)
    ↓
Firebase Services (media-folders-service, media-assets-service)
```

### API-Ebenen

| Ebene | Komponente | Verantwortung |
|-------|------------|---------------|
| **Layer 1** | DatenTabContent | Props Mapping, Conditional Rendering |
| **Layer 2** | ProjectFoldersView | Ordner-Navigation, Upload, Asset-Management |
| **Layer 3** | Custom Hooks | State-Management, Business-Logic |
| **Layer 4** | Firebase Services | CRUD-Operationen, Firestore/Storage |

---

## DatenTabContent Component API

### Component Signature

```typescript
export const DatenTabContent = React.memo(function DatenTabContent({
  project,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
}: DatenTabContentProps): JSX.Element
```

### Props Interface

```typescript
interface DatenTabContentProps {
  /**
   * Projekt-Objekt mit vollständigen Daten
   * @type {Project}
   * @required
   * @example
   * {
   *   id: 'project-123',
   *   name: 'Beispiel Projekt',
   *   customer: {
   *     id: 'customer-456',
   *     name: 'Beispiel Kunde GmbH'
   *   },
   *   organizationId: 'org-789'
   * }
   */
  project: Project;

  /**
   * Organization ID für Multi-Tenancy
   * @type {string}
   * @required
   * @format UUID
   * @example 'org_abc123xyz456'
   * @security Scoping-Key für alle Firestore-Queries
   */
  organizationId: string;

  /**
   * Projekt-Ordner Daten (pre-loaded via React Query)
   * @type {any}
   * @required
   * @nullable Wenn null/undefined, wird ProjectFoldersView NICHT gerendert
   * @example
   * {
   *   mainFolder: { id: 'folder-root', name: 'Projektdaten' },
   *   subfolders: [
   *     { id: 'folder-1', name: 'Medien', color: 'blue' },
   *     { id: 'folder-2', name: 'Dokumente', color: 'green' }
   *   ],
   *   assets: [
   *     { id: 'asset-1', fileName: 'bild.jpg' }
   *   ]
   * }
   */
  projectFolders: any;

  /**
   * Loading-State für Ordner-Daten
   * @type {boolean}
   * @required
   * @example true (zeigt Loading-Spinner), false (zeigt Inhalte)
   */
  foldersLoading: boolean;

  /**
   * Callback zum Neu-Laden der Ordner-Daten
   * @type {() => Promise<void>}
   * @required
   * @async
   * @example
   * async () => {
   *   await refetch(); // React Query refetch
   * }
   */
  onRefresh: () => Promise<void>;
}
```

### Prop Details

#### `project: Project`

**Type:** `Project` (aus `@/types/project`)

**Required:** ✅ Ja

**Struktur:**

```typescript
interface Project {
  id?: string;                    // Optional - kann undefined sein
  name: string;
  organizationId: string;
  customer?: {                    // Optional - kann fehlen
    id?: string;
    name?: string;
  };
  // ... weitere Felder
}
```

**Verwendung in DatenTabContent:**

```typescript
// Extrahiert project.id
projectId={project.id!}           // ← Non-null Assertion (!)

// Extrahiert customer.id (optional)
customerId={project.customer?.id}  // ← Optional Chaining (?.)

// Extrahiert customer.name (optional)
customerName={project.customer?.name}
```

**Beispiele:**

```typescript
// ✅ Mit Customer
const project: Project = {
  id: 'project-123',
  name: 'Website Relaunch',
  customer: {
    id: 'customer-456',
    name: 'Beispiel GmbH'
  },
  organizationId: 'org-789'
};

// ✅ Ohne Customer (customerId & customerName werden undefined)
const project: Project = {
  id: 'project-123',
  name: 'Internes Projekt',
  organizationId: 'org-789'
};

// ⚠️ Ohne ID (projectId wird undefined)
const project: Project = {
  name: 'Neues Projekt',
  organizationId: 'org-789'
};
```

#### `organizationId: string`

**Type:** `string`

**Required:** ✅ Ja

**Format:** UUID-String (z.B. `org_abc123xyz456`)

**Zweck:**
- Multi-Tenancy Scoping
- Alle Firestore-Queries verwenden organizationId
- Verhindert Cross-Organization-Zugriff

**Beispiele:**

```typescript
// ✅ Gut - UUID aus Context/Store
const organizationId = useOrganization().id;

// ❌ Schlecht - Hardcoded
const organizationId = 'org-123';
```

**Security:**

```typescript
// Alle Firestore-Queries in ProjectFoldersView verwenden organizationId:
query(
  collection(db, 'media_folders'),
  where('organizationId', '==', organizationId)
);
```

#### `projectFolders: any`

**Type:** `any` (wird in Zukunft zu `ProjectFolders` Interface typisiert)

**Required:** ✅ Ja (aber kann `null`/`undefined` sein)

**Null-Handling:**

```typescript
// null oder undefined → ProjectFoldersView wird NICHT gerendert
projectFolders = null       // ❌ Kein Render
projectFolders = undefined  // ❌ Kein Render

// Leeres Objekt → ProjectFoldersView wird gerendert (leerer Zustand)
projectFolders = {}         // ✅ Render (zeigt leeren Zustand)
```

**Struktur:**

```typescript
{
  mainFolder: {
    id: string;
    name: string;
    organizationId: string;
    // ... weitere MediaFolder-Felder
  },
  subfolders: MediaFolder[],  // Array von Unterordnern
  assets: MediaAsset[]        // Array von Assets
}
```

**Laden mit React Query:**

```typescript
const { data: projectFolders } = useQuery({
  queryKey: ['project-folders', organizationId, projectId],
  queryFn: () => getProjectFolders(organizationId, projectId)
});
```

#### `foldersLoading: boolean`

**Type:** `boolean`

**Required:** ✅ Ja

**Values:**
- `true` → Loading-State (zeigt Spinner in ProjectFoldersView)
- `false` → Data-State (zeigt Ordner-Inhalte)

**Verwendung:**

```typescript
const { data: projectFolders, isLoading } = useQuery({...});

<DatenTabContent
  foldersLoading={isLoading}  // ← React Query isLoading
  // ...
/>
```

**Durchgereicht an:**

```typescript
<ProjectFoldersView
  foldersLoading={foldersLoading}  // ← Zeigt interne Loading-UI
/>
```

#### `onRefresh: () => Promise<void>`

**Type:** `() => Promise<void>`

**Required:** ✅ Ja

**Async:** ✅ Ja (muss Promise zurückgeben)

**Verwendung:**

```typescript
// React Query refetch
const { refetch } = useQuery({...});

const handleRefresh = useCallback(async () => {
  await refetch();
}, [refetch]);

<DatenTabContent onRefresh={handleRefresh} />
```

**Aufgerufen von ProjectFoldersView:**
- Nach Upload-Erfolg
- Nach Datei-Löschung
- Nach Ordner-Erstellung
- Nach Asset-Verschiebung

**Best Practice:**

```typescript
// ✅ Gut - useCallback für Performance
const handleRefresh = useCallback(async () => {
  await refetch();
}, [refetch]);

// ❌ Schlecht - Neue Function bei jedem Render
const handleRefresh = async () => {
  await refetch();
};
```

---

## ProjectFoldersView API (Shared)

DatenTabContent nutzt die ProjectFoldersView-Komponente (Phase 0.1 Refactoring).

### Props Mapping

```typescript
// DatenTabContent Props → ProjectFoldersView Props
<ProjectFoldersView
  projectId={project.id!}
  organizationId={organizationId}
  customerId={project.customer?.id}
  customerName={project.customer?.name}
  projectFolders={projectFolders}
  foldersLoading={foldersLoading}
  onRefresh={onRefresh}
  filterByFolder="all"  // ← FEST: "all" (Daten Tab zeigt alle Ordner)
/>
```

### ProjectFoldersView Props Interface

```typescript
interface ProjectFoldersViewProps {
  projectId: string;
  organizationId: string;
  customerId?: string;
  customerName?: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
  filterByFolder?: 'all' | 'Dokumente';
  initialFolderId?: string;
  onFolderChange?: (folderId: string) => void;
}
```

### Wichtige Unterschiede

| Prop | DatenTabContent | ProjectFoldersView |
|------|-----------------|---------------------|
| `projectId` | ❌ Nicht vorhanden | ✅ Extrahiert aus `project.id` |
| `customerId` | ❌ Nicht vorhanden | ✅ Extrahiert aus `project.customer?.id` |
| `customerName` | ❌ Nicht vorhanden | ✅ Extrahiert aus `project.customer?.name` |
| `filterByFolder` | ❌ Nicht vorhanden | ✅ Fest auf `"all"` gesetzt |

### Detaillierte API-Dokumentation

**Vollständige ProjectFoldersView API:**
- [ProjectFoldersView API-Referenz](../../folders/api/README.md)
- [Custom Hooks API](../../folders/api/README.md#custom-hooks)
- [Komponenten-Props](../../folders/api/README.md#komponenten-props)

---

## TypeScript Interfaces

### Project Interface

```typescript
/**
 * Projekt-Interface (aus @/types/project)
 */
interface Project {
  id?: string;
  name: string;
  description?: string;
  organizationId: string;
  userId: string;
  status: 'active' | 'archived' | 'draft';
  stage: 'briefing' | 'concept' | 'production' | 'done';
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    // ... weitere Customer-Felder
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // ... weitere Felder
}
```

### MediaFolder Interface (aus ProjectFoldersView)

```typescript
/**
 * Ordner-Interface (verwendet in projectFolders.subfolders)
 */
interface MediaFolder {
  id?: string;
  userId: string;               // Legacy - wird zu createdBy
  organizationId: string;
  name: string;
  parentFolderId?: string;
  clientId?: string;
  color?: string;               // z.B. 'blue', 'green', 'orange'
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### MediaAsset Interface (aus ProjectFoldersView)

```typescript
/**
 * Asset-Interface (verwendet in projectFolders.assets)
 */
interface MediaAsset {
  id?: string;
  userId: string;               // Legacy - wird zu createdBy
  organizationId: string;
  fileName: string;
  fileType?: string;            // MIME-Type
  storagePath: string;          // Firebase Storage Path
  downloadUrl: string;
  description?: string;
  tags?: string[];
  folderId?: string;
  clientId?: string;
  metadata?: {
    fileSize?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## Props Validation

### Runtime Validation

DatenTabContent führt **keine Runtime-Validation** durch (TypeScript-only).

**Empfehlung für Production:**

```typescript
// Optional: Zod-Schema für Runtime-Validation
import { z } from 'zod';

const DatenTabContentPropsSchema = z.object({
  project: z.object({
    id: z.string().optional(),
    name: z.string(),
    organizationId: z.string(),
    customer: z.object({
      id: z.string().optional(),
      name: z.string().optional()
    }).optional()
  }),
  organizationId: z.string().uuid(),
  projectFolders: z.any(),
  foldersLoading: z.boolean(),
  onRefresh: z.function()
});

// In Komponente
const validatedProps = DatenTabContentPropsSchema.parse(props);
```

### TypeScript Checks

```bash
# TypeScript-Check ausführen
npx tsc --noEmit

# Nur DatenTabContent prüfen
npx tsc --noEmit src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
```

---

## Return Types

### Component Return Type

```typescript
DatenTabContent: React.MemoExoticComponent<
  (props: DatenTabContentProps) => JSX.Element
>
```

**Erklärung:**
- `React.memo` wrapped die Komponente
- Return Type: `JSX.Element` (React-Element)

### Rendering

```typescript
// Rendering-Logik
return (
  <div className="space-y-6">
    {/* Header */}
    <div>
      <Heading level={3}>Projektdaten verwalten</Heading>
      <Text className="text-gray-500 mt-1">
        Organisieren Sie alle Projektdateien und Dokumente zentral
      </Text>
    </div>

    {/* ProjectFoldersView - Conditional */}
    {projectFolders && (
      <ProjectFoldersView {...mappedProps} />
    )}
  </div>
);
```

**Conditional Rendering:**
- `projectFolders` ist `null`/`undefined` → Nur Header
- `projectFolders` ist Objekt → Header + ProjectFoldersView

---

## Error Handling

### Keine internen Errors

DatenTabContent wirft **keine Errors**:

```typescript
// ✅ Kein Throw bei fehlenden Props
customerId={project.customer?.id}  // undefined statt Error

// ✅ Kein Throw bei null projectFolders
{projectFolders && <ProjectFoldersView />}  // Conditional Rendering
```

### Error Handling im Parent

```typescript
// Error Handling sollte im Parent erfolgen
function ProjectDataTab() {
  const { data: project, error: projectError } = useQuery({...});
  const { data: projectFolders, error: foldersError } = useQuery({...});

  if (projectError || foldersError) {
    return <ErrorBoundary error={projectError || foldersError} />;
  }

  return (
    <DatenTabContent
      project={project!}
      projectFolders={projectFolders}
      // ...
    />
  );
}
```

### ProjectFoldersView Errors

Errors in ProjectFoldersView werden intern behandelt:

- Upload-Fehler → Toast-Notification
- Lösch-Fehler → Alert-Komponente
- Netzwerk-Fehler → Retry-Logic (3 Versuche)

---

## Code-Beispiele

### 1. Basic Usage

```typescript
import { DatenTabContent } from './components/tab-content/DatenTabContent';
import { useQuery } from '@tanstack/react-query';

function ProjectDataTab() {
  const { project } = useProject();
  const organizationId = useOrganization().id;

  const { data: projectFolders, isLoading, refetch } = useQuery({
    queryKey: ['project-folders', organizationId, project.id],
    queryFn: () => getProjectFolders(organizationId, project.id)
  });

  return (
    <DatenTabContent
      project={project}
      organizationId={organizationId}
      projectFolders={projectFolders}
      foldersLoading={isLoading}
      onRefresh={async () => await refetch()}
    />
  );
}
```

### 2. Mit Error Handling

```typescript
function ProjectDataTab() {
  const { project, isLoading: projectLoading } = useProject();
  const organizationId = useOrganization().id;

  const {
    data: projectFolders,
    isLoading: foldersLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['project-folders', organizationId, project?.id],
    queryFn: () => getProjectFolders(organizationId, project!.id),
    enabled: !!project?.id
  });

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (projectLoading) {
    return <LoadingSpinner />;
  }

  return (
    <DatenTabContent
      project={project!}
      organizationId={organizationId}
      projectFolders={projectFolders}
      foldersLoading={foldersLoading}
      onRefresh={async () => await refetch()}
    />
  );
}
```

### 3. Mit useCallback für Performance

```typescript
function ProjectDataTab() {
  const { project } = useProject();
  const organizationId = useOrganization().id;

  const { data: projectFolders, isLoading, refetch } = useQuery({
    queryKey: ['project-folders', organizationId, project.id],
    queryFn: () => getProjectFolders(organizationId, project.id),
    staleTime: 5 * 60 * 1000
  });

  // ✅ useCallback für Performance
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DatenTabContent
      project={project}
      organizationId={organizationId}
      projectFolders={projectFolders}
      foldersLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}
```

### 4. Mit Conditional Rendering

```typescript
function ProjectDataTab() {
  const { project } = useProject();
  const organizationId = useOrganization().id;

  const { data: projectFolders, isLoading, refetch } = useQuery({...});

  // ✅ Nur rendern wenn projectFolders geladen
  return (
    <>
      {projectFolders ? (
        <DatenTabContent
          project={project}
          organizationId={organizationId}
          projectFolders={projectFolders}
          foldersLoading={false}
          onRefresh={async () => await refetch()}
        />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <EmptyState message="Keine Ordner gefunden" />
      )}
    </>
  );
}
```

### 5. Mit Custom Hook

```typescript
// Custom Hook für Daten Tab
function useDatenTabData(project: Project, organizationId: string) {
  const { data: projectFolders, isLoading, error, refetch } = useQuery({
    queryKey: ['project-folders', organizationId, project.id],
    queryFn: () => getProjectFolders(organizationId, project.id),
    staleTime: 5 * 60 * 1000
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    projectFolders,
    foldersLoading: isLoading,
    error,
    onRefresh: handleRefresh
  };
}

// Verwendung
function ProjectDataTab() {
  const { project } = useProject();
  const organizationId = useOrganization().id;
  const { projectFolders, foldersLoading, error, onRefresh } = useDatenTabData(project, organizationId);

  if (error) return <ErrorMessage error={error} />;

  return (
    <DatenTabContent
      project={project}
      organizationId={organizationId}
      projectFolders={projectFolders}
      foldersLoading={foldersLoading}
      onRefresh={onRefresh}
    />
  );
}
```

---

## Best Practices

### 1. Immer useCallback für onRefresh

```typescript
// ✅ Gut
const handleRefresh = useCallback(async () => {
  await refetch();
}, [refetch]);

// ❌ Schlecht
const handleRefresh = async () => {
  await refetch();
};
```

### 2. React Query mit staleTime

```typescript
// ✅ Gut - 5 Minuten Cache
const { data } = useQuery({
  queryKey: ['folders', orgId, projectId],
  queryFn: () => getFolders(orgId, projectId),
  staleTime: 5 * 60 * 1000
});

// ❌ Schlecht - Kein Cache
const { data } = useQuery({
  queryKey: ['folders', orgId, projectId],
  queryFn: () => getFolders(orgId, projectId)
});
```

### 3. Optional Chaining für customer

```typescript
// ✅ Gut - Optional Chaining
<DatenTabContent
  project={project}
  // customerId und customerName werden automatisch extrahiert
/>

// Component-intern:
customerId={project.customer?.id}       // undefined wenn kein Customer
customerName={project.customer?.name}   // undefined wenn kein Customer
```

### 4. Error Boundary verwenden

```typescript
// ✅ Gut - Error Boundary um DatenTabContent
<ErrorBoundary>
  <DatenTabContent {...props} />
</ErrorBoundary>

// ❌ Schlecht - Kein Error Handling
<DatenTabContent {...props} />
```

### 5. Loading State korrekt übergeben

```typescript
// ✅ Gut - isLoading direkt übergeben
<DatenTabContent
  foldersLoading={isLoading}
  // ...
/>

// ❌ Schlecht - Loading-State manuell verwalten
const [loading, setLoading] = useState(false);
<DatenTabContent foldersLoading={loading} />
```

---

## Weitere Dokumentation

- **[Hauptdokumentation](../README.md)** - Übersicht, Features, Usage
- **[Komponenten-Dokumentation](../components/README.md)** - DatenTabContent Details
- **[ADRs](../adr/README.md)** - Architecture Decision Records
- **[ProjectFoldersView API](../../folders/api/README.md)** - Detaillierte API (Phase 0.1)

---

**Letzte Aktualisierung:** 2025-10-26
**Version:** 1.0.0
**Status:** ✅ Produktionsreif
