# ProjectFoldersView API - Übersicht

> **Version:** 2.0.0
> **Letzte Aktualisierung:** 2025-10-19

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Firebase Services](#firebase-services)
- [Custom Hooks](#custom-hooks)
- [Komponenten-Props](#komponenten-props)
- [TypeScript-Typen](#typescript-typen)
- [Best Practices](#best-practices)

---

## Übersicht

Das ProjectFoldersView-Modul bietet drei API-Ebenen:

1. **Firebase Services** - Low-Level CRUD für Firestore/Storage
2. **Custom Hooks** - React-Integration mit State-Management
3. **Komponenten** - High-Level UI-Komponenten

```
Komponenten (UI)
    ↓
Custom Hooks (State Management)
    ↓
Firebase Services (Data Layer)
    ↓
Firestore / Firebase Storage
```

---

## Firebase Services

### media-folders-service.ts

**Datei:** `src/lib/firebase/media-folders-service.ts`

Alle CRUD-Operationen für Media Folders.

#### Kern-Funktionen

```typescript
// Ordner erstellen
createFolder(
  folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>,
  context: { organizationId: string; userId: string }
): Promise<string>

// Ordner laden
getFolders(
  organizationId: string,
  parentFolderId?: string
): Promise<MediaFolder[]>

// Einzelnen Ordner laden
getFolder(folderId: string): Promise<MediaFolder | null>

// Alle Ordner für Organization laden (flache Liste)
getAllFoldersForOrganization(
  organizationId: string
): Promise<MediaFolder[]>

// Ordner aktualisieren
updateFolder(
  folderId: string,
  updates: Partial<MediaFolder>
): Promise<void>

// Ordner löschen (nur wenn leer)
deleteFolder(folderId: string): Promise<void>

// Ordner verschieben (mit Validierung)
moveFolderToParent(
  folderId: string,
  newParentId: string | null,
  organizationId: string
): Promise<void>
```

#### Hilfsfunktionen

```typescript
// Prüfen ob Ordner Dateien enthält
hasFilesInFolder(folderId: string): Promise<boolean>

// Prüfen ob Ordner Unterordner hat
hasSubfolders(folderId: string): Promise<boolean>

// Breadcrumbs für Navigation
getBreadcrumbs(folderId: string): Promise<FolderBreadcrumb[]>

// Anzahl Dateien in Ordner
getFolderFileCount(folderId: string): Promise<number>
```

**Detaillierte Dokumentation:** [media-folders-service.md](./media-folders-service.md)

---

### media-assets-service.ts

**Datei:** `src/lib/firebase/media-assets-service.ts`

Alle CRUD-Operationen für Media Assets.

#### Kern-Funktionen

```typescript
// Media hochladen (mit Retry-Logic)
uploadMedia(
  file: File,
  organizationId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  retryCount?: number,
  context?: { userId: string; clientId?: string }
): Promise<MediaAsset>

// Assets laden
getMediaAssets(
  organizationId: string,
  folderId?: string
): Promise<MediaAsset[]>

// Einzelnes Asset laden
getMediaAssetById(assetId: string): Promise<MediaAsset | null>

// Asset aktualisieren
updateAsset(
  assetId: string,
  updates: Partial<MediaAsset>
): Promise<void>

// Asset verschieben (mit automatischer Client-Vererbung)
moveAssetToFolder(
  assetId: string,
  newFolderId?: string,
  organizationId?: string
): Promise<void>

// Asset löschen
deleteMediaAsset(asset: MediaAsset): Promise<void>
```

#### Spezial-Funktionen

```typescript
// Client-Media hochladen (Convenience-Wrapper)
uploadClientMedia(
  file: File,
  organizationId: string,
  clientId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  context?: { userId: string; description?: string }
): Promise<MediaAsset>

// Buffer hochladen (für PDF-Generierung)
uploadBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  folder?: string,
  context?: { userId?: string; clientId?: string }
): Promise<{ downloadUrl: string; filePath: string; fileSize: number }>

// Assets nach Client-ID laden
getMediaByClientId(
  organizationId: string,
  clientId: string,
  cleanupInvalid?: boolean,
  legacyUserId?: string
): Promise<{folders: any[], assets: MediaAsset[], totalCount: number}>
```

**Detaillierte Dokumentation:** [media-folders-service.md](./media-folders-service.md#media-assets-service)

---

## Custom Hooks

### useFolderNavigation

**Datei:** `src/components/projects/folders/hooks/useFolderNavigation.ts`

Verwaltet die komplette Ordner-Navigation inkl. Breadcrumbs und Stack.

#### API

```typescript
interface UseFolderNavigationProps {
  organizationId: string;
  projectFolders: any;
  filterByFolder?: 'all' | 'Dokumente';
  initialFolderId?: string;
  onFolderChange?: (folderId: string) => void;
}

interface UseFolderNavigationReturn {
  // State
  selectedFolderId: string | undefined;
  currentFolders: any[];
  currentAssets: any[];
  loading: boolean;
  breadcrumbs: Array<{id: string, name: string}>;
  allFolders: any[];

  // Setter
  setSelectedFolderId: (id: string | undefined) => void;
  setCurrentAssets: (assets: any[]) => void;

  // Actions
  handleFolderClick: (folderId: string) => void;
  handleGoToRoot: () => void;
  handleBreadcrumbClick: (clickedIndex: number) => void;
  handleBackClick: () => void;
  loadFolderContent: (folderId?: string) => Promise<void>;
  loadAllFolders: () => Promise<void>;
}
```

#### Verwendung

```typescript
const {
  selectedFolderId,
  currentFolders,
  currentAssets,
  loading,
  breadcrumbs,
  handleFolderClick,
  handleGoToRoot
} = useFolderNavigation({
  organizationId: 'org_123',
  projectFolders: projectData,
  filterByFolder: 'all',
  onFolderChange: (id) => console.log('Changed to:', id)
});

// Ordner öffnen
handleFolderClick('folder_456');

// Zurück zur Root
handleGoToRoot();
```

#### Performance-Optimierungen

- ✅ `loadAllFolders` mit `useCallback` gecached
- ✅ `loadFolderContent` mit `useCallback` gecached
- ✅ Event-Handler mit `useCallback` optimiert
- ✅ Initial-Load nur bei Änderungen

---

### useFileActions

**Datei:** `src/components/projects/folders/hooks/useFileActions.ts`

Verwaltet alle File-Operationen (Delete, Download, Move).

#### API

```typescript
interface UseFileActionsProps {
  organizationId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface UseFileActionsReturn {
  // Dialog-State
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  setConfirmDialog: (dialog: ...) => void;

  // Actions
  handleDeleteAsset: (assetId: string, fileName: string) => void;
  handleDownloadDocument: (asset: any) => Promise<void>;
  handleAssetClick: (asset: any, onEdit: (asset: any) => void) => void;
}
```

#### Verwendung

```typescript
const {
  confirmDialog,
  handleDeleteAsset,
  handleDownloadDocument,
  handleAssetClick
} = useFileActions({
  organizationId: 'org_123',
  onSuccess: (msg) => toast.success(msg),
  onError: (msg) => toast.error(msg)
});

// Datei löschen (mit Bestätigungsdialog)
handleDeleteAsset('asset_123', 'dokument.pdf');

// Dokument herunterladen
await handleDownloadDocument(asset);

// Asset anklicken (auto-detect: Editor oder Download)
handleAssetClick(asset, handleEditDocument);
```

#### Features

- ✅ **HTML → RTF Konvertierung** für .celero-doc Downloads
- ✅ **Bestätigungsdialog** für Lösch-Operationen
- ✅ **Auto-Detection** für editierbare vs. downloadbare Assets
- ✅ **Error-Handling** mit Callbacks

---

### useDocumentEditor

**Datei:** `src/components/projects/folders/hooks/useDocumentEditor.ts`

Verwaltet den Document-Editor-State (Create, Edit, Save).

#### API

```typescript
interface UseDocumentEditorProps {
  onSaveSuccess?: () => void;
}

interface UseDocumentEditorReturn {
  // State
  showDocumentEditor: boolean;
  editingDocument: InternalDocument | null;

  // Actions
  handleCreateDocument: () => void;
  handleEditDocument: (asset: any) => void;
  handleDocumentSave: () => void;
  handleCloseEditor: () => void;
}
```

#### Verwendung

```typescript
const {
  showDocumentEditor,
  editingDocument,
  handleCreateDocument,
  handleEditDocument,
  handleDocumentSave,
  handleCloseEditor
} = useDocumentEditor({
  onSaveSuccess: () => {
    refetch(); // React Query refetch
  }
});

// Neues Dokument erstellen
handleCreateDocument();

// Bestehendes Dokument bearbeiten
handleEditDocument(asset);

// Editor schließen
handleCloseEditor();
```

---

## Komponenten-Props

### Alert

```typescript
interface AlertProps {
  type: 'info' | 'error' | 'success';
  message: string;
}
```

**Verwendung:**
```tsx
<Alert type="success" message="Upload erfolgreich" />
<Alert type="error" message="Fehler beim Löschen" />
```

---

### DeleteConfirmDialog

```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Verwendung:**
```tsx
<DeleteConfirmDialog
  isOpen={showDialog}
  title="Datei löschen"
  message="Möchten Sie die Datei wirklich löschen?"
  onConfirm={handleDelete}
  onCancel={() => setShowDialog(false)}
/>
```

---

### FolderCreateDialog

```typescript
interface FolderCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: () => void;
  parentFolderId?: string;
  organizationId: string;
}
```

**Verwendung:**
```tsx
<FolderCreateDialog
  isOpen={showCreateDialog}
  onClose={() => setShowCreateDialog(false)}
  onCreateSuccess={() => {
    refetch();
    setShowCreateDialog(false);
  }}
  parentFolderId={currentFolderId}
  organizationId={organizationId}
/>
```

---

### UploadZone

```typescript
interface UploadZoneProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string;
  folderName?: string;
  organizationId: string;
  projectId: string;
}
```

**Verwendung:**
```tsx
<UploadZone
  isOpen={showUpload}
  onClose={() => setShowUpload(false)}
  onUploadSuccess={() => {
    refetch();
    toast.success('Upload erfolgreich');
  }}
  currentFolderId={selectedFolderId}
  folderName={currentFolder?.name}
  organizationId={organizationId}
  projectId={projectId}
/>
```

**Features:**
- Drag & Drop
- Multi-File Upload
- Progress-Tracking
- File-Size-Anzeige
- Retry-Logic (3 Versuche)

---

### MoveAssetModal

```typescript
interface MoveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoveSuccess: () => void;
  asset: any;
  availableFolders: any[];
  currentFolderId?: string;
  organizationId: string;
  rootFolder?: { id: string; name: string };
}
```

**Verwendung:**
```tsx
<MoveAssetModal
  isOpen={showMove}
  onClose={() => setShowMove(false)}
  onMoveSuccess={() => {
    refetch();
    toast.success('Datei verschoben');
  }}
  asset={selectedAsset}
  availableFolders={currentFolders}
  currentFolderId={selectedFolderId}
  organizationId={organizationId}
  rootFolder={rootFolder}
/>
```

**Features:**
- FTP-Style Navigation
- Breadcrumb-Anzeige
- Zurück-Button (..)
- Automatische Client-Vererbung

---

## TypeScript-Typen

### MediaFolder

```typescript
interface MediaFolder {
  id?: string;
  userId: string;             // Legacy (wird zu createdBy)
  name: string;
  parentFolderId?: string;    // Für Hierarchie
  clientId?: string;          // Firma-Zuordnung
  color?: string;             // Visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### MediaAsset

```typescript
interface MediaAsset {
  id?: string;
  userId: string;             // Legacy (wird zu createdBy)
  fileName: string;
  fileType?: string;          // MIME-Type
  storagePath: string;        // Firebase Storage Path
  downloadUrl: string;        // Öffentliche URL
  description?: string;
  tags?: string[];
  folderId?: string;          // Ordner-Zuordnung
  clientId?: string;          // Firma-Zuordnung

  // Erweiterte Metadaten
  metadata?: {
    fileSize?: number;
    dimensions?: { width: number; height: number };
    duration?: number;        // Für Videos
    // ... weitere Felder
  };

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### FolderBreadcrumb

```typescript
interface FolderBreadcrumb {
  id: string;
  name: string;
  parentFolderId?: string;
}
```

---

## Best Practices

### 1. Multi-Tenancy

**IMMER organizationId verwenden:**

```typescript
// ✅ Gut
const folders = await getFolders(organizationId, parentFolderId);

// ❌ Schlecht - Legacy userId
const folders = await getFolders(userId, parentFolderId);
```

### 2. React Query Integration

**Cache und Invalidation richtig nutzen:**

```typescript
// ✅ Gut: Query mit staleTime
const { data, refetch } = useQuery({
  queryKey: ['folders', organizationId, projectId],
  queryFn: () => getFolders(organizationId),
  staleTime: 5 * 60 * 1000  // 5 Minuten Cache
});

// ✅ Gut: Mutation mit Invalidation
const mutation = useMutation({
  mutationFn: (folderId) => deleteFolder(folderId),
  onSuccess: () => {
    queryClient.invalidateQueries(['folders', organizationId]);
  }
});
```

### 3. Error-Handling

**Immer Error-Callbacks verwenden:**

```typescript
// ✅ Gut
const { handleDeleteAsset } = useFileActions({
  organizationId,
  onSuccess: (msg) => toast.success(msg),
  onError: (msg) => toast.error(msg)
});

// ❌ Schlecht - Keine Error-Behandlung
const { handleDeleteAsset } = useFileActions({ organizationId });
```

### 4. Performance

**Callbacks memoizen:**

```typescript
// ✅ Gut
const handleFolderChange = useCallback((folderId: string) => {
  console.log('Changed:', folderId);
}, []);

<ProjectFoldersView onFolderChange={handleFolderChange} />

// ❌ Schlecht - Neue Funktion bei jedem Render
<ProjectFoldersView onFolderChange={(id) => console.log(id)} />
```

### 5. Parameterisierung

**filterByFolder korrekt verwenden:**

```typescript
// ✅ Daten-Tab: Alle Ordner
<ProjectFoldersView filterByFolder="all" />

// ✅ Strategie-Tab: Nur Dokumente mit Initial-Ordner
<ProjectFoldersView
  filterByFolder="Dokumente"
  initialFolderId={documentsId}
  onFolderChange={handleChange}
/>
```

---

## Weitere Dokumentation

- [Hauptdokumentation](../README.md)
- [Firebase Services Details](./media-folders-service.md)
- [Komponenten-Dokumentation](../components/README.md)
- [Architecture Decision Records](../adr/README.md)

---

**Letzte Aktualisierung:** 2025-10-19
**Version:** 2.0.0
