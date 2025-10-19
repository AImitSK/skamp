# ProjectFoldersView Refactoring - Implementierungsplan

**Version:** 1.0
**Erstellt:** 2025-01-19
**Status:** 📋 Geplant
**Priorität:** 🔴 KRITISCH (blockiert 2 Tab-Refactorings!)

---

## 🚨 PROBLEM: CODE DUPLICATION

**Aktueller Zustand:**
- `ProjectFoldersView.tsx` wird in **2 verschiedenen Tabs** verwendet:
  1. **Strategie Tab** → Zeigt nur `Dokumente/` Ordner
  2. **Daten Tab** → Zeigt **alle** Projekt-Ordner

**Größe:** ~800+ LOC (SEHR KOMPLEX!)

**Problem:**
- Identischer Code in beiden Tabs
- Keine Parameterisierung
- Schwer wartbar
- Änderungen müssen doppelt gemacht werden

**Ziel:**
- **Eine** shared Component
- Parameterisiert (`filterByFolder: 'Dokumente' | 'all'`)
- Beide Tabs migrieren
- Code-Reduktion: ~800 Zeilen gespart

---

## 📋 Übersicht

### Entry Points

1. **Komponente:**
   - `src/components/projects/ProjectFoldersView.tsx` (~800 LOC)
   - `src/components/projects/components/SmartUploadInfoPanel.tsx` (~200 LOC)

2. **Verwendet in:**
   - `src/app/dashboard/projects/[projectId]/page.tsx` (Strategie Tab)
   - `src/app/dashboard/projects/[projectId]/page.tsx` (Daten Tab)

### Services & Abhängigkeiten

```typescript
// Services (nach Media-Refactoring)
- mediaFoldersService       // ✅ Direkt importiert (nicht lazy)
- mediaAssetsService        // ✅ Direkt importiert (nicht lazy)
- projectService
- documentContentService

// Utils
- projectFolderContextBuilder  // ⚠️ Smart Router - separat zu klären

// Feature Flags
- project-folder-feature-flags.ts  // ⚠️ Smart Router - separat zu klären
```

**Hinweis:** Smart Router Features (projectUploadService, projectFolderContextBuilder) werden separat evaluiert.

### Sub-Komponenten

```
ProjectFoldersView.tsx
├── SmartUploadInfoPanel
│   ├── SmartUploadInfoBadge
│   └── DragDropStatusIndicator
├── FolderNavigation (inline)
├── FileList (inline)
├── UploadZone (inline)
└── DeleteConfirmDialog (inline)
```

---

## 🎯 Ziele

- [ ] Code-Duplication eliminieren (~800 LOC)
- [ ] Component parameterisieren (filterByFolder: 'Dokumente' | 'all')
- [ ] Modularisierung (< 300 LOC pro Datei)
- [ ] React Query für Media-Loading
- [ ] Performance-Optimierung (useMemo, useCallback)
- [ ] Tests schreiben (>80% Coverage)
- [ ] Beide Tabs migrieren
- [ ] Production-Ready Code Quality

---

## 📁 Ziel-Struktur

```
src/components/projects/folders/
├── ProjectFoldersView.tsx              # Main Component (~200 LOC)
├── types.ts                            # Shared Types
├── components/
│   ├── FolderNavigation.tsx           # Folder-Tree (~150 LOC)
│   ├── FileList.tsx                   # File-Grid/List (~200 LOC)
│   ├── FileListItem.tsx               # Single File (~100 LOC)
│   ├── UploadZone.tsx                 # Drag & Drop Upload (~150 LOC)
│   ├── FolderCreateDialog.tsx         # New Folder Modal (~100 LOC)
│   ├── DeleteConfirmDialog.tsx        # Delete Confirmation (~80 LOC)
│   └── SmartUploadInfoPanel.tsx       # Upload Info (moved)
├── hooks/
│   ├── useFolderNavigation.ts         # Folder-State Logic
│   ├── useFileUpload.ts               # Upload Logic
│   └── useFileActions.ts              # CRUD Actions
└── __tests__/
    ├── ProjectFoldersView.test.tsx
    ├── FolderNavigation.test.tsx
    ├── FileList.test.tsx
    └── integration/
        └── folders-crud-flow.test.tsx

src/lib/hooks/
└── useMediaData.ts                     # React Query Hooks (NEW)

docs/modules/projects/folders/
├── README.md                           # Hauptdokumentation
├── api/
│   ├── README.md
│   └── media-service.md
├── components/
│   └── README.md
└── adr/
    └── README.md

# Backward Compatibility
src/components/projects/ProjectFoldersView.tsx  # Re-export (3 Zeilen)
```

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Analyse

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/project-folders-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  npx cloc src/components/projects/ProjectFoldersView.tsx
  npx cloc src/components/projects/components/SmartUploadInfoPanel.tsx
  ```

- [ ] Backups erstellen
  ```bash
  cp src/components/projects/ProjectFoldersView.tsx \
     src/components/projects/ProjectFoldersView.backup.tsx

  cp src/components/projects/components/SmartUploadInfoPanel.tsx \
     src/components/projects/components/SmartUploadInfoPanel.backup.tsx
  ```

- [ ] Verwendung analysieren
  ```bash
  # Wo wird ProjectFoldersView verwendet?
  rg "ProjectFoldersView" src/app/dashboard/projects/

  # Wie wird es aktuell aufgerufen?
  # → Tab 1 (Strategie): Nur Dokumente-Ordner
  # → Tab 2 (Daten): Alle Ordner
  ```

- [ ] Dependencies prüfen
  - React Query installiert? ✓
  - Testing Libraries vorhanden? ✓
  - TypeScript korrekt konfiguriert? ✓

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/project-folders-refactoring`
- Ist-Zustand analysiert:
  - ProjectFoldersView.tsx: ~800 Zeilen
  - SmartUploadInfoPanel.tsx: ~200 Zeilen
  - Verwendet in: 2 Tabs (Strategie, Daten)
- Backups erstellt
- Dependencies: Alle vorhanden

### Problem identifiziert
- **CODE DUPLICATION:** Identischer Code in 2 Tabs
- **Keine Parameterisierung:** Fest kodiert für jeweiligen Tab
- **Zu groß:** 800 LOC → Schwer wartbar

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup für ProjectFoldersView Refactoring

- Backups erstellt
- Analyse: CODE DUPLICATION in 2 Tabs identifiziert
- ProjectFoldersView.tsx: ~800 LOC
- SmartUploadInfoPanel.tsx: ~200 LOC

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR modularisiert wird

**Dauer:** 2-3 Stunden (große Komponente!)

**⚠️ WICHTIG:** Smart Router Features (projectUploadService, SmartUploadInfoPanel, projectFolderContextBuilder) werden in dieser Phase **NICHT** angefasst. Diese werden separat evaluiert.

#### 0.5.1 TODO-Kommentare

```bash
# TODOs finden
rg "TODO:" src/components/projects/ProjectFoldersView.tsx
```

**Aktion:**
- [ ] Alle TODOs durchgehen
- [ ] Implementieren oder entfernen
- [ ] Feature Flags prüfen (sind alle noch relevant?)

#### 0.5.2 Console-Logs

```bash
# Debug-Logs finden
rg "console\." src/components/projects/ProjectFoldersView.tsx
```

**Erlaubt:**
```typescript
// ✅ Production-Errors
catch (error) {
  console.error('Failed to load folders:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('📁 Folders:', folders);
console.log('🔄 Loading...');
```

**Aktion:**
- [ ] Alle console.log() entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Deprecated Functions

**Typische Muster:**
```typescript
// ❌ Mock-Implementations
const handleMockUpload = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
};

// ❌ Alte Feature Flags
if (OLD_FEATURE_FLAG) {
  // ... auskommentierter Code
}
```

**Aktion:**
- [ ] Feature Flags prüfen (alle aktiv?)
- [ ] Mock-Implementations entfernen
- [ ] Alte Upload-Logic identifizieren

#### 0.5.4 Unused State

```bash
# State-Deklarationen finden
rg "useState" src/components/projects/ProjectFoldersView.tsx | wc -l
```

**Typische Kandidaten:**
```typescript
// ❌ Wird nicht verwendet
const [oldFolderData, setOldFolderData] = useState(null);

// ❌ Nur in deprecated Function
const [tempUploadFiles, setTempUploadFiles] = useState([]);
```

**Aktion:**
- [ ] Alle useState durchgehen (~X States?)
- [ ] Unused States entfernen
- [ ] Zugehörige Setter entfernen

#### 0.5.5 Kommentierte Code-Blöcke

```bash
# Kommentierte Zeilen zählen
rg "^[[:space:]]*//" src/components/projects/ProjectFoldersView.tsx | wc -l
```

**Typisch:**
```typescript
// ❌ Alte Feature (auskommentiert)
// {/* Folder Permissions */}
// {showPermissions && (
//   <PermissionsDialog ... />
// )}
```

**Aktion:**
- [ ] Auskommentierte Feature-Blöcke identifizieren
- [ ] Entscheidung: Implementieren oder löschen?
- [ ] Code-Blöcke entfernen

#### 0.5.6 ESLint Auto-Fix

```bash
npx eslint src/components/projects/ProjectFoldersView.tsx --fix
npx eslint src/components/projects/components/SmartUploadInfoPanel.tsx --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.7 Manueller Test

```bash
npm run dev
# → /dashboard/projects/[projectId]
# → Tab: Strategie (Dokumente-Ordner testen)
# → Tab: Daten (Alle Ordner testen)
```

**Test-Szenarien:**
- [ ] Ordner-Navigation funktioniert
- [ ] Datei-Upload funktioniert (Drag & Drop)
- [ ] Datei-Download funktioniert
- [ ] Ordner erstellen funktioniert
- [ ] Datei löschen funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt (~X TODOs)
- [ ] Debug-Console-Logs entfernt (~Y Logs)
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Deprecated Functions
- [A] Unused State-Variablen (~10?)
- [B] Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- ProjectFoldersView.tsx: ~800 → ~750 Zeilen (-50 Zeilen toter Code)
- SmartUploadInfoPanel.tsx: ~200 → ~190 Zeilen
- Saubere Basis für React Query Integration

### Manueller Test
- ✅ Strategie-Tab: Dokumente-Ordner laden
- ✅ Daten-Tab: Alle Ordner laden
- ✅ Upload funktioniert
- ✅ Download funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

ProjectFoldersView.tsx: ~800 → ~750 Zeilen (-50 Zeilen toter Code)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Ziel:** State Management für Media-Loading mit React Query

#### 1.1 Custom Hooks erstellen

Datei: `src/lib/hooks/useMediaData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaFoldersService } from '@/lib/firebase/media-folders-service';
import { mediaAssetsService } from '@/lib/firebase/media-assets-service';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Lädt alle Ordner für ein Projekt
 *
 * @param organizationId - Organization ID (Multi-Tenancy)
 * @param projectId - Project ID
 */
export function useProjectFolders(organizationId: string, projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-folders', organizationId, projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      // ✅ Korrigiert: getFolders (nicht getByProject)
      return mediaFoldersService.getFolders(organizationId, projectId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 60 * 1000, // 60s (wie Media-Refactoring)
    gcTime: 10 * 60 * 1000, // 10 Minuten
    retry: 3,
  });
}

/**
 * Lädt Assets für einen Ordner
 *
 * @param organizationId - Organization ID (Multi-Tenancy)
 * @param folderId - Folder ID
 */
export function useFolderAssets(organizationId: string, folderId: string | undefined) {
  return useQuery({
    queryKey: ['folder-assets', organizationId, folderId],
    queryFn: async () => {
      if (!folderId) throw new Error('No folder ID');
      // ✅ Korrigiert: getMediaAssets (nicht getByFolder)
      return mediaAssetsService.getMediaAssets(organizationId, folderId);
    },
    enabled: !!folderId && !!organizationId,
    staleTime: 30 * 1000, // 30s (wie Media-Refactoring)
    gcTime: 5 * 60 * 1000, // 5 Minuten
    retry: 3,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Erstellt neuen Ordner
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      projectId: string;
      name: string;
      parentId?: string;
    }) => {
      // ✅ Korrigiert: createFolder (mit organizationId)
      return mediaFoldersService.createFolder({
        organizationId: data.organizationId,
        projectId: data.projectId,
        name: data.name,
        parentFolderId: data.parentId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-folders', variables.organizationId, variables.projectId]
      });
    },
    retry: 3,
  });
}

/**
 * Datei hochladen (Single File)
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file: File;
      organizationId: string;
      folderId: string;
      projectId: string;
      onProgress?: (progress: number) => void;
    }) => {
      // ✅ Korrigiert: uploadMedia (nicht upload)
      return mediaAssetsService.uploadMedia(
        data.file,
        data.organizationId,
        data.folderId,
        data.onProgress
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['folder-assets', variables.organizationId, variables.folderId]
      });
    },
    retry: 3,
  });
}

/**
 * Bulk-Upload (Multiple Files mit Batching)
 *
 * Wie Media-Refactoring ADR-0004:
 * - Batch-Size = 5 (optimal: 78% schneller, 100% Success-Rate)
 * - Overall-Progress-Tracking
 * - Error-Handling pro Datei
 */
export function useBulkUploadFiles() {
  const uploadFile = useUploadFile();

  return async (params: {
    files: File[];
    organizationId: string;
    folderId: string;
    projectId: string;
    onProgress?: (completed: number, total: number) => void;
  }) => {
    const BATCH_SIZE = 5; // ✅ Optimal nach Media-Refactoring Performance-Tests
    const results = [];
    let completedFiles = 0;

    for (let i = 0; i < params.files.length; i += BATCH_SIZE) {
      const batch = params.files.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const result = await uploadFile.mutateAsync({
              file,
              organizationId: params.organizationId,
              folderId: params.folderId,
              projectId: params.projectId,
            });
            completedFiles++;
            params.onProgress?.(completedFiles, params.files.length);
            return { status: 'success', file, result };
          } catch (error) {
            completedFiles++;
            params.onProgress?.(completedFiles, params.files.length);
            return { status: 'error', file, error };
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  };
}

/**
 * Datei löschen
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      fileId: string;
      organizationId: string;
      folderId: string;
    }) => {
      // ✅ Korrigiert: deleteMediaAsset (nicht delete)
      await mediaAssetsService.deleteMediaAsset(data.fileId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['folder-assets', variables.organizationId, variables.folderId]
      });
    },
    retry: 3,
  });
}

/**
 * Ordner löschen
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      folderId: string;
      organizationId: string;
      projectId: string;
    }) => {
      // ✅ Korrigiert: deleteFolder (mit organizationId)
      await mediaFoldersService.deleteFolder(data.folderId, data.organizationId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-folders', variables.organizationId, variables.projectId]
      });
    },
    retry: 3,
  });
}
```

#### 1.2 ProjectFoldersView.tsx anpassen

**Alte Pattern entfernen:**
```typescript
// ❌ Altes Pattern
const [folders, setFolders] = useState([]);
const [files, setFiles] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const foldersData = await mediaFoldersService.getByProject(projectId);
      setFolders(foldersData);
      // ...
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, [projectId]);
```

**Neue Pattern einfügen:**
```typescript
// ✅ React Query Pattern (nach Media-Refactoring)
import {
  useProjectFolders,
  useFolderAssets,
  useCreateFolder,
  useUploadFile,
  useBulkUploadFiles,
  useDeleteFile,
  useDeleteFolder,
} from '@/lib/hooks/useMediaData';

// In der Komponente
const { data: folders = [], isLoading: foldersLoading } = useProjectFolders(
  organizationId,
  projectId
);
const { data: files = [], isLoading: filesLoading } = useFolderAssets(
  organizationId,
  currentFolderId
);

const createFolder = useCreateFolder();
const uploadFile = useUploadFile();
const bulkUpload = useBulkUploadFiles();
const deleteFile = useDeleteFile();
const deleteFolder = useDeleteFolder();

// Handler anpassen
const handleFolderCreate = async (name: string) => {
  await createFolder.mutateAsync({
    organizationId,
    projectId,
    name,
    parentId: currentFolderId,
  });
  toastService.success('Ordner erstellt');
};

const handleFileUpload = async (file: File) => {
  await uploadFile.mutateAsync({
    file,
    organizationId,
    folderId: currentFolderId,
    projectId,
    onProgress: (progress) => setUploadProgress(progress),
  });
  toastService.success('Datei hochgeladen');
};

// Bulk-Upload Handler (für Multiple Files)
const handleBulkUpload = async (files: File[]) => {
  const results = await bulkUpload({
    files,
    organizationId,
    folderId: currentFolderId,
    projectId,
    onProgress: (completed, total) => {
      setUploadProgress(Math.round((completed / total) * 100));
    },
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  if (errorCount === 0) {
    toastService.success(`${successCount} Dateien hochgeladen`);
  } else {
    toastService.warning(`${successCount} erfolgreich, ${errorCount} fehlgeschlagen`);
  }
};
```

#### Checkliste Phase 1

- [ ] useMediaData.ts erstellt (7 Hooks: useProjectFolders, useFolderAssets, useCreateFolder, useUploadFile, useBulkUploadFiles, useDeleteFile, useDeleteFolder)
- [ ] organizationId für Multi-Tenancy integriert
- [ ] Service-Methoden korrekt verwendet (getFolders, getMediaAssets, uploadMedia, deleteMediaAsset, deleteFolder)
- [ ] Stale-Times angepasst (30s Assets, 60s Folders - wie Media-Refactoring)
- [ ] Retry-Logic integriert (retry: 3)
- [ ] Bulk-Upload mit Batching (Batch-Size = 5 wie Media-Refactoring ADR-0004)
- [ ] ProjectFoldersView.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Toast-Service integriert (statt inline Alerts)
- [ ] Tests durchlaufen

#### Phase-Bericht Template

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `useMediaData.ts` (7 Hooks)
  - useProjectFolders, useFolderAssets (Queries)
  - useCreateFolder, useUploadFile, useBulkUploadFiles, useDeleteFile, useDeleteFolder (Mutations)
- ProjectFoldersView.tsx vollständig auf React Query umgestellt
- Alte useEffect/loadData-Pattern entfernt
- organizationId für Multi-Tenancy integriert
- Service-Methoden korrekt verwendet (getFolders, getMediaAssets, uploadMedia, etc.)

### Vorteile
- Automatisches Caching (30s Assets, 60s Folders - wie Media-Refactoring)
- Query Invalidierung bei Mutations
- Retry-Logic (3 Versuche)
- Bulk-Upload mit Batching (Batch-Size = 5, 78% schneller)
- Error Handling über React Query
- ~50 Zeilen Boilerplate Code gespart

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für ProjectFoldersView"
```
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** 800 LOC → Mehrere kleine Komponenten (< 300 LOC)

#### 2.1 Ordnerstruktur anlegen

```bash
mkdir -p src/components/projects/folders/components
mkdir -p src/components/projects/folders/hooks
mkdir -p src/components/projects/folders/__tests__
```

#### 2.2 Types extrahieren

Datei: `src/components/projects/folders/types.ts`

```typescript
import { MediaAsset, MediaFolder } from '@/types/media';

export interface ProjectFoldersViewProps {
  /**
   * Organization ID (Multi-Tenancy)
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Filter für Ordner-Anzeige
   * - 'all': Alle Ordner anzeigen (Daten-Tab)
   * - 'Dokumente': Nur Dokumente-Ordner (Strategie-Tab)
   */
  filterByFolder?: 'all' | 'Dokumente';

  /**
   * Initial geöffneter Ordner
   */
  initialFolderId?: string;

  /**
   * Callback bei Ordner-Wechsel
   */
  onFolderChange?: (folderId: string) => void;
}

export interface FolderNavigationProps {
  folders: MediaFolder[];
  currentFolderId: string | null;
  onFolderSelect: (folderId: string) => void;
  onFolderCreate: (name: string, parentId?: string) => void;
  filterByFolder?: 'all' | 'Dokumente';
}

export interface FileListProps {
  files: MediaAsset[];
  loading: boolean;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileDownload: (fileId: string) => void;
}

export interface UploadZoneProps {
  folderId: string;
  projectId: string;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  uploadProgress: number;
}
```

#### 2.3 Komponenten extrahieren

**2.3.1 FolderNavigation.tsx**

Datei: `src/components/projects/folders/components/FolderNavigation.tsx`

**Extrahiert aus:** ProjectFoldersView.tsx (Zeilen ~50-200)

**Verantwortung:**
- Folder-Tree rendern
- Ordner-Navigation
- Filter anwenden (nur 'Dokumente' oder alle)
- Neuen Ordner erstellen

**Größe:** ~150 LOC

**2.3.2 FileList.tsx**

Datei: `src/components/projects/folders/components/FileList.tsx`

**Extrahiert aus:** ProjectFoldersView.tsx (Zeilen ~200-400)

**Verantwortung:**
- File-Grid/List rendern
- File-Actions (Download, Delete, Preview)
- Empty-State (keine Dateien)

**Größe:** ~150 LOC

**Sub-Komponente:** `FileListItem.tsx` (~100 LOC)
- Single File Card
- Thumbnail
- File-Info
- Action-Buttons

**2.3.3 UploadZone.tsx**

Datei: `src/components/projects/folders/components/UploadZone.tsx`

**Extrahiert aus:** ProjectFoldersView.tsx (Zeilen ~400-550)

**Verantwortung:**
- Drag & Drop Zone
- File-Input
- Upload-Progress
- Multiple Files

**Größe:** ~150 LOC

**2.3.4 FolderCreateDialog.tsx**

Datei: `src/components/projects/folders/components/FolderCreateDialog.tsx`

**Extrahiert aus:** ProjectFoldersView.tsx (Zeilen ~550-650)

**Verantwortung:**
- Modal für neuen Ordner
- Name-Input
- Parent-Folder-Selection

**Größe:** ~100 LOC

**2.3.5 DeleteConfirmDialog.tsx**

Datei: `src/components/projects/folders/components/DeleteConfirmDialog.tsx`

**Extrahiert aus:** ProjectFoldersView.tsx (Zeilen ~650-730)

**Verantwortung:**
- Lösch-Bestätigung (File/Folder)
- Warning für nicht-leere Ordner

**Größe:** ~80 LOC

**2.3.6 SmartUploadInfoPanel.tsx (verschieben)**

**Größe:** ~354 Zeilen (größer als ursprünglich angenommen!)

**Hinweis:** SmartUploadInfoPanel ist Teil des Smart Routers (wird separat evaluiert).

**Optionen:**

**Option A:** Einfach verschieben (wenn Smart Router behalten wird)
```bash
mv src/components/projects/components/SmartUploadInfoPanel.tsx \
   src/components/projects/folders/components/SmartUploadInfoPanel.tsx
```

**Option B:** Weiter modularisieren (wenn zu groß):
```
SmartUploadInfoPanel/
├── index.tsx                   (~100 Zeilen) - Main Component
├── SmartUploadInfoBadge.tsx    (~80 Zeilen)
├── DragDropStatusIndicator.tsx (~80 Zeilen)
└── SmartRoutingPreview.tsx     (~90 Zeilen)
```

**Option C:** Entfernen (wenn Smart Router nicht benötigt)
- SmartUploadInfoPanel komplett entfernen (~354 Zeilen)
- Durch einfaches Upload-Status-Panel ersetzen (~50 Zeilen)

**Entscheidung:** Wird separat getroffen nach Smart Router Evaluation.

#### 2.4 Hooks extrahieren

**2.4.1 useFolderNavigation.ts**

Datei: `src/components/projects/folders/hooks/useFolderNavigation.ts`

**Logik:**
- Current Folder State
- Navigation History
- Filter-Logik (filterByFolder)
- Breadcrumb-Pfad

**2.4.2 useFileUpload.ts**

Datei: `src/components/projects/folders/hooks/useFileUpload.ts`

**Logik:**
- File-Validierung
- Upload-Progress
- Multiple Files Handling
- Error-Handling

**2.4.3 useFileActions.ts**

Datei: `src/components/projects/folders/hooks/useFileActions.ts`

**Logik:**
- Download-Logic
- Delete-Logic
- Preview-Logic

#### 2.5 Main Component vereinfachen

Datei: `src/components/projects/folders/ProjectFoldersView.tsx`

**Ziel:** ~200 LOC (von 800!)

```typescript
import FolderNavigation from './components/FolderNavigation';
import FileList from './components/FileList';
import UploadZone from './components/UploadZone';
import FolderCreateDialog from './components/FolderCreateDialog';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import { useFolderNavigation } from './hooks/useFolderNavigation';
import { useFileUpload } from './hooks/useFileUpload';
import { useFileActions } from './hooks/useFileActions';
import { ProjectFoldersViewProps } from './types';

export default function ProjectFoldersView({
  organizationId,
  projectId,
  filterByFolder = 'all',
  initialFolderId,
  onFolderChange,
}: ProjectFoldersViewProps) {
  // React Query Hooks
  const { data: folders = [], isLoading: foldersLoading } = useProjectFolders(
    organizationId,
    projectId
  );

  const {
    currentFolderId,
    filteredFolders,
    breadcrumbs,
    navigateToFolder,
  } = useFolderNavigation(folders, initialFolderId, filterByFolder);

  const { data: files = [], isLoading: filesLoading } = useFolderAssets(
    organizationId,
    currentFolderId
  );

  // Custom Hooks für Upload & Actions
  const {
    handleUpload,
    uploadProgress,
    uploading,
  } = useFileUpload(organizationId, currentFolderId, projectId);

  const {
    handleDownload,
    handleDelete,
  } = useFileActions();

  // State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="project-folders-view">
      {/* Navigation */}
      <FolderNavigation
        folders={filteredFolders}
        currentFolderId={currentFolderId}
        onFolderSelect={navigateToFolder}
        onFolderCreate={() => setShowCreateDialog(true)}
        filterByFolder={filterByFolder}
      />

      {/* Upload Zone */}
      <UploadZone
        folderId={currentFolderId}
        projectId={projectId}
        onUpload={handleUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* File List */}
      <FileList
        files={files}
        loading={filesLoading}
        onFileSelect={() => {}}
        onFileDelete={handleDelete}
        onFileDownload={handleDownload}
      />

      {/* Modals */}
      <FolderCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        parentFolderId={currentFolderId}
        projectId={projectId}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {}}
      />
    </div>
  );
}
```

#### 2.6 Backward Compatibility

Datei: `src/components/projects/ProjectFoldersView.tsx` (alter Pfad)

```typescript
// Backward Compatibility - Re-export
export { default } from './folders/ProjectFoldersView';
export type { ProjectFoldersViewProps } from './folders/types';
```

**Vorteile:**
- Bestehende Imports funktionieren weiter
- Schrittweise Migration möglich
- Keine Breaking Changes

#### Checkliste Phase 2

- [ ] Ordnerstruktur angelegt
- [ ] types.ts erstellt
- [ ] 6 Komponenten extrahiert (FolderNavigation, FileList, FileListItem, UploadZone, CreateDialog, DeleteDialog)
- [ ] SmartUploadInfoPanel verschoben
- [ ] 3 Hooks extrahiert (useFolderNavigation, useFileUpload, useFileActions)
- [ ] Main Component vereinfacht (~800 → ~200 LOC)
- [ ] Backward Compatibility sichergestellt
- [ ] Imports aktualisiert

#### Phase-Bericht Template

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Struktur
- ProjectFoldersView.tsx: 800 LOC → 200 LOC (-600 LOC!)
- 6 neue Komponenten:
  - FolderNavigation.tsx (150 LOC)
  - FileList.tsx (150 LOC)
  - FileListItem.tsx (100 LOC)
  - UploadZone.tsx (150 LOC)
  - FolderCreateDialog.tsx (100 LOC)
  - DeleteConfirmDialog.tsx (80 LOC)
- 3 neue Hooks:
  - useFolderNavigation.ts
  - useFileUpload.ts
  - useFileActions.ts
- types.ts für shared types

### Vorteile
- Alle Komponenten < 200 LOC
- Bessere Wartbarkeit
- Eigenständig testbar
- Wiederverwendbar

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - ProjectFoldersView modularisiert (800 → 200 LOC)"
```
```

---

### Phase 3: Parameterisierung & Tab-Migration

**Ziel:** filterByFolder-Parameter einbauen und beide Tabs migrieren

#### 3.1 Filter-Logic in useFolderNavigation

Datei: `src/components/projects/folders/hooks/useFolderNavigation.ts`

```typescript
export function useFolderNavigation(
  folders: MediaFolder[],
  initialFolderId?: string,
  filterByFolder?: 'all' | 'Dokumente'
) {
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);

  // Filter anwenden
  const filteredFolders = useMemo(() => {
    if (filterByFolder === 'Dokumente') {
      // Nur Dokumente-Ordner und dessen Kinder
      const dokumenteFolder = folders.find(f => f.name === 'Dokumente');
      if (!dokumenteFolder) return [];

      return folders.filter(f =>
        f.id === dokumenteFolder.id ||
        f.parentFolderId === dokumenteFolder.id ||
        isChildOf(f, dokumenteFolder.id, folders)
      );
    }

    // Alle Ordner
    return folders;
  }, [folders, filterByFolder]);

  // ... weitere Logik

  return {
    currentFolderId,
    filteredFolders,
    breadcrumbs,
    navigateToFolder: setCurrentFolderId,
  };
}

function isChildOf(folder: MediaFolder, parentId: string, allFolders: MediaFolder[]): boolean {
  if (folder.parentFolderId === parentId) return true;
  if (!folder.parentFolderId) return false;

  const parent = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parent) return false;

  return isChildOf(parent, parentId, allFolders);
}
```

#### 3.2 Tab 1 migrieren (Strategie)

Datei: `src/app/dashboard/projects/[projectId]/page.tsx`

**Vorher:**
```typescript
{activeTab === 'strategie' && (
  <ProjectFoldersView
    organizationId={organizationId}
    projectId={projectId}
  />
  // Fest kodiert: Zeigt nur Dokumente
)}
```

**Nachher:**
```typescript
{activeTab === 'strategie' && (
  <ProjectFoldersView
    organizationId={organizationId}
    projectId={projectId}
    filterByFolder="Dokumente"
  />
)}
```

#### 3.3 Tab 2 migrieren (Daten)

**Vorher:**
```typescript
{activeTab === 'daten' && (
  <ProjectFoldersView
    organizationId={organizationId}
    projectId={projectId}
  />
  // Fest kodiert: Zeigt alle Ordner
)}
```

**Nachher:**
```typescript
{activeTab === 'daten' && (
  <ProjectFoldersView
    organizationId={organizationId}
    projectId={projectId}
    filterByFolder="all"
  />
)}
```

#### 3.4 Beide Tabs testen

```bash
npm run dev
# → /dashboard/projects/[projectId]

# Test 1: Strategie Tab
# - Nur "Dokumente"-Ordner sichtbar?
# - Unterordner von Dokumente sichtbar?
# - Andere Ordner (Assets, etc.) NICHT sichtbar?

# Test 2: Daten Tab
# - Alle Ordner sichtbar?
# - Dokumente, Assets, Uploads, etc.?
# - Volle Ordner-Struktur?
```

#### Checkliste Phase 3

- [ ] Filter-Logic in useFolderNavigation implementiert
- [ ] filterByFolder-Parameter getestet
- [ ] Tab 1 (Strategie) migriert → filterByFolder="Dokumente"
- [ ] Tab 2 (Daten) migriert → filterByFolder="all"
- [ ] Beide Tabs manuell getestet
- [ ] Keine Regressions (Upload, Download, Delete funktionieren)

#### Phase-Bericht Template

```markdown
## Phase 3: Parameterisierung & Tab-Migration ✅

### Implementiert
- filterByFolder-Parameter: 'all' | 'Dokumente'
- Filter-Logic in useFolderNavigation
- Rekursive isChildOf-Function für Unterordner

### Migration
- ✅ Strategie Tab: filterByFolder="Dokumente"
- ✅ Daten Tab: filterByFolder="all"

### Tests
- ✅ Strategie: Nur Dokumente-Ordner
- ✅ Daten: Alle Ordner
- ✅ Upload funktioniert
- ✅ Download funktioniert
- ✅ Delete funktioniert

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - filterByFolder Parameter & Tab-Migration"
```
```

---

### Phase 4: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

#### 4.1 useCallback für Handler

```typescript
// In ProjectFoldersView.tsx
const handleFolderCreate = useCallback(async (name: string) => {
  await createFolder.mutateAsync({ projectId, name, parentId: currentFolderId });
  toastService.success('Ordner erstellt');
}, [createFolder, projectId, currentFolderId]);

const handleFileUpload = useCallback(async (files: File[]) => {
  for (const file of files) {
    await uploadFile.mutateAsync({
      file,
      folderId: currentFolderId,
      projectId,
      onProgress: setUploadProgress,
    });
  }
  toastService.success(`${files.length} Datei(en) hochgeladen`);
}, [uploadFile, currentFolderId, projectId]);
```

#### 4.2 useMemo für Computed Values

```typescript
// Breadcrumbs berechnen
const breadcrumbs = useMemo(() => {
  if (!currentFolderId) return [];

  const path: MediaFolder[] = [];
  let folder = folders.find(f => f.id === currentFolderId);

  while (folder) {
    path.unshift(folder);
    folder = folders.find(f => f.id === folder.parentFolderId);
  }

  return path;
}, [currentFolderId, folders]);

// File-Statistics
const fileStats = useMemo(() => {
  return {
    total: files.length,
    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
    byType: files.reduce((acc, f) => {
      const ext = f.name.split('.').pop() || 'other';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}, [files]);
```

#### 4.3 React.memo für Komponenten

```typescript
// FileListItem.tsx
export default React.memo(function FileListItem({ file, onDelete, onDownload }: Props) {
  return (
    <div className="file-item">
      {/* ... */}
    </div>
  );
});

// FolderNavigation.tsx
export default React.memo(function FolderNavigation({
  folders,
  currentFolderId,
  onFolderSelect,
}: Props) {
  return (
    <nav className="folder-navigation">
      {/* ... */}
    </nav>
  );
});
```

#### 4.4 Debouncing für Search (optional)

```typescript
// Falls Search-Funktion hinzugefügt wird
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

const filteredFiles = useMemo(() => {
  if (!debouncedSearchTerm) return files;
  return files.filter(f =>
    f.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );
}, [files, debouncedSearchTerm]);
```

#### Checkliste Phase 4

- [ ] useCallback für alle Handler
- [ ] useMemo für Breadcrumbs
- [ ] useMemo für File-Stats
- [ ] React.memo für 6 Komponenten
- [ ] Performance-Tests durchgeführt (React DevTools Profiler)

#### Phase-Bericht Template

```markdown
## Phase 4: Performance-Optimierung ✅

### Implementiert
- useCallback für [X] Handler
- useMemo für Breadcrumbs, File-Stats
- React.memo für 6 Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~[X]%
- FileListItem re-rendert nur bei Prop-Änderung
- Breadcrumb-Berechnung gecached

### Commit
```bash
git add .
git commit -m "feat: Phase 4 - Performance-Optimierung für ProjectFoldersView"
```
```

---

### Phase 5: Testing

**Ziel:** >80% Test-Coverage

#### 5.1 Hook Tests

Datei: `src/lib/hooks/__tests__/useMediaData.test.tsx`

**Tests:**
- useProjectFolders lädt Ordner
- useFolderAssets lädt Assets
- useCreateFolder erstellt und invalidiert Cache
- useUploadFile lädt hoch und invalidiert Cache
- useDeleteFile löscht und invalidiert Cache
- useDeleteFolder löscht und invalidiert Cache

**Anzahl:** 8 Tests

#### 5.2 Component Tests

**5.2.1 FolderNavigation.test.tsx**
- Rendert Ordner-Tree
- Ordner-Click ruft onFolderSelect auf
- Create-Button ruft onFolderCreate auf
- Filter zeigt nur "Dokumente" (wenn filterByFolder="Dokumente")

**5.2.2 FileList.test.tsx**
- Rendert File-Grid
- Download-Button ruft onFileDownload auf
- Delete-Button ruft onFileDelete auf
- Empty-State bei keine Dateien

**5.2.3 UploadZone.test.tsx**
- Rendert Drag & Drop Zone
- File-Input funktioniert
- Upload-Progress wird angezeigt
- Multiple Files werden akzeptiert

#### 5.3 Integration Tests

Datei: `src/components/projects/folders/__tests__/integration/folders-crud-flow.test.tsx`

**Test-Szenarien:**
1. Ordner-Navigation
   - Lädt Ordner-Tree
   - Navigiert zu Unterordner
   - Breadcrumbs werden aktualisiert

2. Ordner erstellen
   - Öffnet Create-Dialog
   - Erstellt Ordner
   - Ordner erscheint in Tree

3. Datei hochladen
   - Wählt Datei aus
   - Upload-Progress
   - Datei erscheint in List

4. Datei löschen
   - Öffnet Delete-Dialog
   - Bestätigt Löschung
   - Datei verschwindet aus List

**Anzahl:** 4 Integration-Tests

#### Checkliste Phase 5

- [ ] Hook-Tests erstellt (8 Tests)
- [ ] Component-Tests erstellt (FolderNavigation, FileList, UploadZone, FileListItem)
- [ ] Integration-Tests erstellt (4 Tests)
- [ ] Alle Tests bestehen (npm test -- folders)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

#### Phase-Bericht Template

```markdown
## Phase 5: Testing ✅

### Test Suite
- Hook-Tests: 8/8 bestanden
- Component-Tests: 12/12 bestanden
- Integration-Tests: 4/4 bestanden
- **Gesamt: 24/24 Tests bestanden**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%

### Commit
```bash
git add .
git commit -m "test: Phase 5 - Comprehensive Test Suite für ProjectFoldersView"
```
```

---

### Phase 6: Dokumentation

**Ziel:** Vollständige Dokumentation mit `refactoring-dokumentation` Agent

#### 6.1 Agent aufrufen

```bash
# Agent starten (über Claude Code)
@refactoring-dokumentation src/components/projects/folders
```

**Agent erstellt:**
- `docs/modules/projects/folders/README.md` (~1000 Zeilen)
- `docs/modules/projects/folders/api/README.md` (~500 Zeilen)
- `docs/modules/projects/folders/api/media-service.md` (~800 Zeilen)
- `docs/modules/projects/folders/components/README.md` (~800 Zeilen)
- `docs/modules/projects/folders/adr/README.md` (~400 Zeilen)

**Gesamt:** ~3.500 Zeilen Dokumentation

#### 6.2 Manuelle Ergänzungen

**ADR hinzufügen:**

```markdown
## ADR-0001: Parameterisierung mit filterByFolder

**Status:** Accepted
**Datum:** 2025-01-19

### Problem
ProjectFoldersView war in 2 Tabs dupliziert mit fest kodierter Filter-Logik.

### Entscheidung
Parameterisierung mit `filterByFolder: 'all' | 'Dokumente'`

### Alternativen
1. **Separate Komponenten** - Mehr Code-Duplication
2. **Props für jeden Filter** - Zu kompliziert

### Konsequenzen
✅ Code-Reduktion: ~800 Zeilen
✅ Eine Komponente für beide Use-Cases
✅ Einfach erweiterbar (weitere Filter möglich)
```

#### Checkliste Phase 6

- [ ] `refactoring-dokumentation` Agent aufgerufen
- [ ] 5 Dokumentations-Dateien erstellt
- [ ] ADR-0001 (Parameterisierung) manuell ergänzt
- [ ] Alle Code-Beispiele getestet
- [ ] Links funktionieren

#### Phase-Bericht Template

```markdown
## Phase 6: Dokumentation ✅

### Erstellt (via refactoring-dokumentation Agent)
- README.md (~1000 Zeilen)
- api/README.md (~500 Zeilen)
- api/media-service.md (~800 Zeilen)
- components/README.md (~800 Zeilen)
- adr/README.md (~400 Zeilen)

### Manuelle Ergänzungen
- ADR-0001: Parameterisierung mit filterByFolder

### Gesamt
- **~3.500 Zeilen Dokumentation**

### Commit
```bash
git add .
git commit -m "docs: Phase 6 - Vollständige Dokumentation für ProjectFoldersView"
```
```

---

### Phase 7: Production-Ready Code Quality

**Ziel:** Code bereit für Production

#### 7.1 TypeScript Check

```bash
# Nur folders-Module prüfen
npx tsc --noEmit | grep "components/projects/folders"
```

**Ziel:** 0 Fehler

#### 7.2 ESLint Check

```bash
npx eslint src/components/projects/folders --max-warnings=0
```

**Ziel:** 0 Warnings

#### 7.3 Console Cleanup

```bash
rg "console\." src/components/projects/folders
```

**Erlaubt:**
```typescript
// ✅ Production-Errors
console.error('Failed to upload:', error);
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('📁 Current folder:', currentFolderId);
```

#### 7.4 Design System Compliance

**Checklist:**
- [ ] Keine Schatten (außer Dropdowns)
- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] Konsistente Borders (border-gray-200)
- [ ] Focus-Rings (focus:ring-2 focus:ring-primary)

#### 7.5 Final Build Test

```bash
npm run build
npm run start

# Testen:
# → /dashboard/projects/[projectId]
# → Tab: Strategie (Dokumente-Ordner)
# → Tab: Daten (Alle Ordner)
```

#### Checkliste Phase 7

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Beide Tabs funktionieren
- [ ] Performance: Flüssiges UI, kein Lag

#### Phase-Bericht Template

```markdown
## Phase 7: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Beide Tabs funktionieren

### Commit
```bash
git add .
git commit -m "chore: Phase 7 - Production-Ready Code Quality für ProjectFoldersView"
```
```

---

## 🔄 Merge zu Main

### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/project-folders-refactoring

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/project-folders-refactoring --no-edit

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- folders
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

### Final Report

```markdown
## ✅ ProjectFoldersView Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen
- **Tests:** 24/24 bestanden
- **Coverage:** [X]%
- **Dokumentation:** ~3.500 Zeilen

### Code-Reduktion
- **Vorher:** ~800 LOC (dupliziert in 2 Tabs = ~1.600 LOC gesamt)
- **Nachher:** ~730 LOC gesamt (verteilt auf 10 Dateien)
- **Ersparnis:** ~870 LOC (-54%)

### Highlights
- ✅ CODE DUPLICATION eliminiert
- ✅ Parameterisierung: filterByFolder
- ✅ 800 LOC → 10 modulare Komponenten
- ✅ React Query Integration (6 Hooks)
- ✅ Performance-Optimierung (useMemo, useCallback, React.memo)
- ✅ 24 Tests (Hook, Component, Integration)
- ✅ ~3.500 Zeilen Dokumentation
- ✅ Production-Ready

### Migration
- ✅ Strategie Tab: filterByFolder="Dokumente"
- ✅ Daten Tab: filterByFolder="all"

### Nächste Schritte
- Communication Components refactorn (Phase 0.2)
- Project Detail Page refactorn (Phase 1.1)
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~54% (-870 LOC)
- **Komponenten-Größe:** Alle < 200 LOC (Ziel: < 300)
- **Code-Duplikation:** ~800 Zeilen eliminiert
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Modularität

- **Komponenten:** 10 (von 1 Monolith)
- **Hooks:** 3 (useFolderNavigation, useFileUpload, useFileActions)
- **React Query Hooks:** 6 (useProjectFolders, useFolderAssets, useCreateFolder, useUploadFile, useDeleteFile, useDeleteFolder)

### Testing

- **Test-Coverage:** > 80%
- **Anzahl Tests:** 24 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~[X]%
- **useMemo:** Breadcrumbs, File-Stats gecached
- **React.memo:** 6 Komponenten memoized

### Dokumentation

- **Zeilen:** ~3.500 Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** [X] Beispiele

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Master-Checkliste:** `docs/planning/master-refactoring-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`

### Dokumentation (nach Phase 6)

- **Hauptdokumentation:** `docs/modules/projects/folders/README.md`
- **API-Dokumentation:** `docs/modules/projects/folders/api/README.md`
- **Komponenten-Dokumentation:** `docs/modules/projects/folders/components/README.md`
- **ADRs:** `docs/modules/projects/folders/adr/README.md`

---

## 🔄 Änderungshistorie

### Version 1.1 (2025-01-19) - Media-Refactoring Integration

**Anpassungen basierend auf Media-Refactoring (docs/media/):**

✅ **Services:**
- Lazy Import entfernt → Direkte Imports von mediaFoldersService, mediaAssetsService
- Service-Methoden korrigiert: `getFolders()`, `getMediaAssets()`, `uploadMedia()`, `deleteMediaAsset()`, `deleteFolder()`

✅ **React Query:**
- organizationId für Multi-Tenancy integriert
- Stale-Times angepasst (30s Assets, 60s Folders - wie Media-Refactoring)
- Retry-Logic: 3 Versuche (wie Media-Refactoring)
- 7 Hooks statt 6 (useBulkUploadFiles hinzugefügt)

✅ **Upload-Batching:**
- Bulk-Upload Hook mit Batch-Size = 5 (wie Media-Refactoring ADR-0004)
- 78% schneller bei 50 Dateien (100s → 22s)
- 100% Success-Rate
- Overall-Progress-Tracking

✅ **SmartUploadInfoPanel:**
- Größe korrigiert: ~354 Zeilen (nicht ~200)
- 3 Optionen definiert: Verschieben / Modularisieren / Entfernen

⚠️ **Smart Router:**
- Status: Wird separat evaluiert
- Im Media-Bereich erfolgreich entfernt (nicht benötigt)
- Im Projekt-Bereich evtl. nützlich (Verzeichnisstruktur anlegen, etc.)
- Komponenten: projectUploadService, SmartUploadInfoPanel, projectFolderContextBuilder
- Code-Umfang: ~300+ Zeilen

**Nächster Schritt:** Smart Router Evaluation separat durchführen.

---

**Erstellt:** 2025-01-19
**Aktualisiert:** 2025-01-19 (v1.1 - Media-Refactoring Integration)
**Maintainer:** CeleroPress Team
**Status:** 📋 Geplant → 🚀 Bereit für Implementierung (nach Smart Router Evaluation)

---

*Dieser Plan folgt dem bewährten 7-Phasen-Refactoring-Template und ist speziell auf die Eliminierung von Code-Duplication und Parameterisierung von ProjectFoldersView ausgerichtet. Angepasst an die Erkenntnisse aus dem Media-Refactoring.*
