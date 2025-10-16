# Media-Modul Refactoring Implementierungsplan

**Version:** 1.0
**Modul:** `/dashboard/library/media` + Public Share Pages
**Projekt:** CeleroPress
**Erstellt:** 16. Oktober 2025
**Basiert auf:** Modul-Refactoring Template v1.1

---

## 📋 Executive Summary

Das Media-Modul ist eines der größten und komplexesten Module in CeleroPress. Es umfasst:

- **Media-Bibliothek** (`page.tsx`: 1426 Zeilen)
- **Public Share Pages** (`share/[shareId]/page.tsx`: 457 Zeilen)
- **Media Service** (`media-service.ts`: 1949+ Zeilen)
- **Upload Modal** mit Drag & Drop
- **Folder-Hierarchie** mit Client-Zuordnung
- **Sharing-System** mit Branding und Passwortschutz
- **Campaign-Integration** für Media Assets
- **Clipping-Operations** (Monitoring-Integration)
- **Pipeline-Asset-Integration**

**Geschätzter Aufwand:** 4-6 Tage (größtes Modul)

---

## 🎯 Refactoring-Ziele

### Primäre Ziele

- [ ] **React Query Integration** - Ersetze manuelle loadData() mit React Query Hooks
- [ ] **Service-Refactoring** - Teile media-service.ts (1949+ Zeilen) in 5 kleinere Services
- [ ] **Komponenten-Modularisierung** - Teile page.tsx (1426 Zeilen) in < 300 Zeilen pro Datei
- [ ] **Shared Components** - Ersetze inline Alert durch toastService
- [ ] **Admin SDK Migration** - Migriere Share-Operations zu Firebase Admin SDK (Server-Side)
- [ ] **Performance-Optimierung** - useCallback, useMemo, Debouncing für File Upload
- [ ] **Test-Coverage** - >80% Coverage für alle Media-Operationen
- [ ] **Vollständige Dokumentation** - 3000+ Zeilen Dokumentation

### Sekundäre Ziele

- [ ] **Drag & Drop Optimierung** - Verbesserte Performance bei großen Ordnern
- [ ] **Upload-Retry-Logic** - Robuste Fehlerbehandlung
- [ ] **Share-Link-Analytics** - Tracking für Share-Zugriffe
- [ ] **Branding-Optimierung** - Konsistente Branding-Integration

---

## 📊 Ist-Zustand Analyse

### Dateien-Übersicht

```
src/app/dashboard/library/media/
├── page.tsx                                    # 1426 Zeilen (❌ zu groß)
├── UploadModal.tsx                             # ??? Zeilen
├── __tests__/
│   └── ...
└── utils/
    └── ...

src/app/share/[shareId]/
└── page.tsx                                    # 457 Zeilen (⚠️ groß)

src/lib/firebase/
└── media-service.ts                            # 1949+ Zeilen (❌ SEHR groß)

src/api/
├── media-upload/route.ts                       # Upload-Handler
└── rss-detect/route.ts                         # RSS-Detection (Publications)
```

### Zeilen-Statistik (Geschätzt)

```bash
# Vor Refactoring
page.tsx:              1426 Zeilen
share/[shareId]/page:   457 Zeilen
media-service.ts:      1949 Zeilen
UploadModal.tsx:       ~400 Zeilen (geschätzt)
-------------------------------------------
GESAMT:               ~4232 Zeilen

# Ziel nach Refactoring
- page.tsx:            < 300 Zeilen (Main Orchestrator)
- share/[shareId]/page: < 200 Zeilen (mit Shared Components)
- 5 Service-Dateien:   ~400 Zeilen pro Service
- 15+ Section/Shared Components: < 150 Zeilen pro Komponente
```

### Identifizierte Probleme

#### 1. Kein React Query (❌ Kritisch)

**Problem:**
```typescript
// page.tsx verwendet immer noch manuelles loadData()
const loadData = async () => {
  if (!organizationId) return;
  setLoading(true);
  try {
    const [foldersData, assetsData] = await Promise.all([
      mediaService.getFolders(organizationId, currentFolderId),
      mediaService.getMediaAssets(organizationId, currentFolderId)
    ]);
    setFolders(foldersData);
    setMediaAssets(assetsData);
  } catch (error) {
    showAlert('error', 'Fehler beim Laden', 'Die Mediathek konnte nicht geladen werden.');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadData();
}, [organizationId, currentFolderId]);
```

**Lösung:** React Query Hooks mit automatischem Caching

#### 2. Riesiger Service (❌ Kritisch)

**Problem:** media-service.ts hat 1949+ Zeilen mit 18+ verschiedenen Operation-Kategorien

**Vorgeschlagene Aufteilung:**

1. **media-assets-service.ts** (~400 Zeilen)
   - `getMediaAssets()`
   - `getMediaAssetById()`
   - `uploadMediaAsset()`
   - `uploadMediaFromBuffer()`
   - `updateMediaAsset()`
   - `deleteMediaAsset()`
   - `bulkDeleteAssets()`
   - `moveAssetToFolder()`

2. **media-folders-service.ts** (~350 Zeilen)
   - `getFolders()`
   - `getFolderById()`
   - `createFolder()`
   - `updateFolder()`
   - `deleteFolder()`
   - `moveFolderToParent()`
   - `getFolderHierarchy()`

3. **media-shares-service.ts** (~450 Zeilen) 🔐 Admin SDK Kandidat
   - `createShareLink()`
   - `getShareLink()`
   - `updateShareLink()`
   - `deleteShareLink()`
   - `validatePassword()`
   - `trackShareAccess()` (Analytics)
   - `getCampaignMediaAssets()`

4. **media-clippings-service.ts** (~300 Zeilen)
   - `createClipping()`
   - `getClippingsForMonitoring()`
   - `updateClippingMetadata()`
   - `deleteClipping()`

5. **media-pipeline-service.ts** (~300 Zeilen)
   - `addPipelineAsset()`
   - `getPipelineAssets()`
   - `updatePipelineAssetStatus()`
   - `removePipelineAsset()`

#### 3. Inline Alert-Komponente (⚠️ Moderate Priorität)

**Problem:** Inline Alert in page.tsx (54 Zeilen) statt toastService

**Lösung:** Ersetze durch `toastService` (~33 Zeilen gespart)

#### 4. Große page.tsx (❌ Kritisch)

**Problem:** 1426 Zeilen mit komplexer State-Verwaltung

**Vorgeschlagene Modularisierung:**

```
src/app/dashboard/library/media/
├── page.tsx (< 300 Zeilen) - Main Orchestrator
├── components/
│   ├── shared/
│   │   ├── MediaCard.tsx                   # Asset-Karte
│   │   ├── FolderCard.tsx                  # Ordner-Karte
│   │   ├── EmptyState.tsx                  # Leere Mediathek
│   │   ├── MediaGridView.tsx               # Grid-Layout
│   │   ├── MediaListView.tsx               # Listen-Layout
│   │   └── MediaToolbar.tsx                # Filter, Search, View-Toggle
│   ├── sections/
│   │   ├── MediaBreadcrumbs.tsx           # Navigation
│   │   ├── MediaUploadSection.tsx         # Upload-Area
│   │   ├── MediaSelectionActions.tsx      # Bulk-Actions
│   │   └── MediaPagination.tsx            # Pagination
│   └── modals/
│       ├── UploadModal/
│       │   ├── index.tsx
│       │   ├── DropZone.tsx
│       │   ├── FileList.tsx
│       │   ├── UploadProgress.tsx
│       │   └── types.ts
│       ├── CreateFolderModal.tsx
│       ├── ShareModal/
│       │   ├── index.tsx
│       │   ├── BasicSettings.tsx
│       │   ├── BrandingSettings.tsx
│       │   ├── PasswordSettings.tsx
│       │   └── SharePreview.tsx
│       └── MoveModal.tsx
```

#### 5. Share-Operations (🔐 Admin SDK Kandidat)

**Problem:** Share-Link-Erstellung erfolgt client-side

**Sicherheitsrisiken:**
- Client kann shareId manipulieren
- Passwort-Validierung client-side ist unsicher
- Keine Server-Side Access-Logs
- Keine Rate-Limiting für Share-Zugriffe

**Lösung:** Migriere zu Admin SDK Server-Side API Routes

#### 6. Public Share Page (⚠️ Moderate Priorität)

**Problem:** share/[shareId]/page.tsx (457 Zeilen) mit direkt eingebetteten Komponenten

**Vorgeschlagene Modularisierung:**

```
src/app/share/[shareId]/
├── page.tsx (< 200 Zeilen) - Main Orchestrator
└── components/
    ├── PasswordPrompt.tsx              # Passwort-Eingabe
    ├── ShareHeader.tsx                 # Branding-Header
    ├── MediaGallery.tsx                # Grid mit Assets
    ├── MediaDownloadButton.tsx         # Download-Button
    └── ShareFooter.tsx                 # Footer mit Branding
```

---

## 🚀 Die 7 Phasen (Detailliert)

### Phase 0: Vorbereitung & Setup

**Dauer:** 1-2 Stunden

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/media-refactoring-production
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  npx cloc src/app/dashboard/library/media
  npx cloc src/app/share/[shareId]
  npx cloc src/lib/firebase/media-service.ts
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  cp src/app/dashboard/library/media/page.tsx \
     src/app/dashboard/library/media/page.backup.tsx

  cp src/app/share/[shareId]/page.tsx \
     src/app/share/[shareId]/page.backup.tsx

  cp src/lib/firebase/media-service.ts \
     src/lib/firebase/media-service.backup.ts
  ```

- [ ] Dependencies prüfen
  - React Query installiert? (`@tanstack/react-query`)
  - Testing Libraries vorhanden? (`jest`, `@testing-library/react`)
  - Firebase Admin SDK? (`firebase-admin`)

#### Deliverable

**Phase-Bericht:**
```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/media-refactoring-production`
- Ist-Zustand: [X] Dateien, [Y] Zeilen Code
- Backups:
  - page.backup.tsx (1426 Zeilen)
  - share/page.backup.tsx (457 Zeilen)
  - media-service.backup.ts (1949 Zeilen)
- Dependencies: Alle vorhanden

### Struktur (Ist)
- media/page.tsx: 1426 Zeilen
- share/[shareId]/page.tsx: 457 Zeilen
- media-service.ts: 1949 Zeilen
- UploadModal.tsx: ~400 Zeilen

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Media-Refactoring

- Feature-Branch erstellt
- Backups angelegt (3832+ Zeilen gesichert)
- Ist-Zustand dokumentiert
- Dependencies geprüft

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Dauer:** 2-3 Stunden (größeres Modul = mehr Cleanup)

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### 0.5.1 TODO-Kommentare finden & entfernen

```bash
# TODOs finden
rg "TODO:" src/app/dashboard/library/media
rg "TODO:" src/app/share/[shareId]
rg "TODO:" src/lib/firebase/media-service.ts
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen
- [ ] Zugehörigen Code prüfen (implementieren oder löschen)

#### 0.5.2 Console-Logs entfernen

```bash
# Debug-Logs finden
rg "console\." src/app/dashboard/library/media
rg "console\." src/app/share/[shareId]
rg "console\." src/lib/firebase/media-service.ts
```

**Erlaubt ✅:**
```typescript
catch (error) {
  console.error('Failed to upload media:', error);
}
```

**Zu entfernen ❌:**
```typescript
console.log('📁 Uploading file:', file.name);
console.log('🔍 Loading folders...');
console.log('data:', data);
```

#### 0.5.3 Deprecated Functions entfernen

**Suche nach:**
- Mock-Implementations
- Alte Upload-Handler (falls vorhanden)
- Ungenutzte Helper-Functions

```bash
rg "deprecated|old|legacy|mock" src/app/dashboard/library/media
```

#### 0.5.4 Unused State entfernen

```bash
# State-Deklarationen finden
grep -n "useState" src/app/dashboard/library/media/page.tsx | wc -l
```

**Beispiele für möglicherweise unused State:**
```typescript
// ❌ Alte Preview-State (falls ersetzt)
const [previewUrl, setPreviewUrl] = useState(null);

// ❌ Temporäre States
const [tempSelection, setTempSelection] = useState([]);
```

#### 0.5.5 Kommentierte Code-Blöcke entfernen

```bash
# Kommentierte Zeilen zählen
grep "^[[:space:]]*//" src/app/dashboard/library/media/page.tsx | wc -l
```

**Entfernen:**
- Auskommentierte alte Upload-Logic
- Auskommentierte Features
- Kommentierte State-Updates

#### 0.5.6 ESLint Auto-Fix

```bash
npx eslint src/app/dashboard/library/media --fix
npx eslint src/app/share/[shareId] --fix
npx eslint src/lib/firebase/media-service.ts --fix
```

#### 0.5.7 Manueller Test

```bash
npm run dev
# Navigiere zu /dashboard/library/media
# Teste:
# - Ordner erstellen
# - Datei hochladen
# - Drag & Drop
# - Share-Link erstellen
# - Public Share öffnen
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Media-Bibliothek aufrufen
- [ ] Upload testen
- [ ] Folder-Navigation testen
- [ ] Share-Link erstellen und öffnen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt (~X gefunden)
- [ ] Debug-Console-Logs entfernt (~Y gefunden)
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
- [A] Unused State-Variablen
- [B] Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- page.tsx: 1426 → [NEW] Zeilen (-[X] Zeilen toter Code)
- share/page.tsx: 457 → [NEW] Zeilen (-[Y] Zeilen)
- media-service.ts: 1949 → [NEW] Zeilen (-[Z] Zeilen)

### Warum wichtig?
Verhindert dass toter Code in Phase 2 modularisiert wird.

### Manueller Test
- ✅ Media-Bibliothek lädt
- ✅ Upload funktioniert
- ✅ Folder-Navigation funktioniert
- ✅ Share-Links funktionieren
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

page.tsx: 1426 → [NEW] Zeilen (-[DIFF] Zeilen toter Code)
share/page.tsx: 457 → [NEW] Zeilen (-[DIFF] Zeilen)
media-service.ts: 1949 → [NEW] Zeilen (-[DIFF] Zeilen)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Dauer:** 1 Tag

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen

**Datei:** `src/lib/hooks/useMediaData.ts`

**Hooks zu implementieren:**

```typescript
// Media Assets
export function useMediaAssets(organizationId: string | undefined, folderId: string | null)
export function useMediaAsset(id: string | undefined)
export function useUploadMediaAsset()
export function useUpdateMediaAsset()
export function useDeleteMediaAsset()
export function useBulkDeleteAssets()
export function useMoveAsset()

// Folders
export function useMediaFolders(organizationId: string | undefined, parentId: string | null)
export function useMediaFolder(id: string | undefined)
export function useCreateFolder()
export function useUpdateFolder()
export function useDeleteFolder()
export function useMoveFolder()

// Shares (später zu Admin SDK migriert)
export function useShareLinks(organizationId: string | undefined)
export function useShareLink(shareId: string | undefined)
export function useCreateShareLink()
export function useUpdateShareLink()
export function useDeleteShareLink()
export function useValidateSharePassword()

// Campaign Media
export function useCampaignMediaAssets(shareLink: ShareLink | undefined)

// Pipeline Assets
export function usePipelineAssets(organizationId: string | undefined)
export function useAddPipelineAsset()
export function useRemovePipelineAsset()
```

**Geschätzte Zeilen:** ~600 Zeilen

#### 1.2 page.tsx anpassen

**Entfernen:**
```typescript
// ❌ Altes Pattern
const [folders, setFolders] = useState<MediaFolder[]>([]);
const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [foldersData, assetsData] = await Promise.all([
        mediaService.getFolders(organizationId, currentFolderId),
        mediaService.getMediaAssets(organizationId, currentFolderId)
      ]);
      setFolders(foldersData);
      setMediaAssets(assetsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Mediathek konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, [organizationId, currentFolderId]);
```

**Hinzufügen:**
```typescript
// ✅ React Query Pattern
import {
  useMediaAssets,
  useMediaFolders,
  useDeleteMediaAsset,
  useBulkDeleteAssets,
  useMoveAsset,
  useCreateFolder,
  useDeleteFolder
} from '@/lib/hooks/useMediaData';

const { data: folders = [], isLoading: foldersLoading } = useMediaFolders(organizationId, currentFolderId);
const { data: assets = [], isLoading: assetsLoading } = useMediaAssets(organizationId, currentFolderId);
const deleteAsset = useDeleteMediaAsset();
const bulkDelete = useBulkDeleteAssets();
const moveAsset = useMoveAsset();

// Handler mit Mutations
const handleDeleteAsset = async (id: string) => {
  await deleteAsset.mutateAsync({ id, organizationId });
  toastService.success('Datei gelöscht');
};

const handleBulkDelete = async () => {
  await bulkDelete.mutateAsync({ ids: selectedIds, organizationId });
  setSelectedIds([]);
  toastService.success(`${selectedIds.length} Dateien gelöscht`);
};
```

#### 1.3 share/[shareId]/page.tsx anpassen

**Entfernen:**
```typescript
// ❌ Altes Pattern
const [shareLink, setShareLink] = useState<ShareLink | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadShareLink = async () => {
    // ...
  };
  loadShareLink();
}, [shareId]);
```

**Hinzufügen:**
```typescript
// ✅ React Query Pattern
import { useShareLink, useCampaignMediaAssets } from '@/lib/hooks/useMediaData';

const { data: shareLink, isLoading } = useShareLink(shareId);
const { data: mediaItems = [] } = useCampaignMediaAssets(shareLink);
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`useMediaData.ts`)
- [ ] 22 Hooks implementiert
  - [ ] 7 Asset-Hooks
  - [ ] 6 Folder-Hooks
  - [ ] 6 Share-Hooks
  - [ ] 1 Campaign-Hook
  - [ ] 2 Pipeline-Hooks
- [ ] page.tsx auf React Query umgestellt
- [ ] share/[shareId]/page.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Tests durchlaufen

#### Phase-Bericht Template

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `useMediaData.ts` (22 Hooks, 600 Zeilen)
- media/page.tsx vollständig auf React Query umgestellt
- share/[shareId]/page.tsx auf React Query umgestellt

### Hook-Kategorien
- **Assets:** 7 Hooks (get, upload, update, delete, bulk, move)
- **Folders:** 6 Hooks (get, create, update, delete, move)
- **Shares:** 6 Hooks (get, create, update, delete, validate)
- **Campaign:** 1 Hook (getCampaignAssets)
- **Pipeline:** 2 Hooks (add, remove)

### Vorteile
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations
- Error Handling über React Query
- ~200 Zeilen Boilerplate Code reduziert

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Media-Modul

- 22 Custom Hooks implementiert (useMediaData.ts)
- media/page.tsx auf React Query umgestellt
- share/[shareId]/page.tsx auf React Query umgestellt
- Alte loadData/useEffect entfernt
- Automatisches Caching und Query Invalidierung

Hooks-Kategorien:
- Assets: 7 Hooks
- Folders: 6 Hooks
- Shares: 6 Hooks
- Campaign: 1 Hook
- Pipeline: 2 Hooks

Vorteile:
- ~200 Zeilen Boilerplate reduziert
- Automatisches Error Handling
- Background Updates

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 2: Code-Separation & Modularisierung

**Dauer:** 2 Tage (größtes Modul)

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

#### Phase 2.1: Service-Refactoring (Priorität 1)

**Ziel:** media-service.ts (1949 Zeilen) → 5 Services (~400 Zeilen pro Service)

**Datei-Struktur:**

```
src/lib/firebase/
├── media-assets-service.ts      # ~400 Zeilen
├── media-folders-service.ts     # ~350 Zeilen
├── media-shares-service.ts      # ~450 Zeilen (später Admin SDK)
├── media-clippings-service.ts   # ~300 Zeilen
├── media-pipeline-service.ts    # ~300 Zeilen
└── media-service.backup.ts      # Backup (1949 Zeilen)
```

**1. media-assets-service.ts** (~400 Zeilen)

**Funktionen:**
```typescript
// CRUD Operations
export async function getMediaAssets(organizationId: string, folderId: string | null): Promise<MediaAsset[]>
export async function getMediaAssetById(id: string): Promise<MediaAsset | null>
export async function uploadMediaAsset(data: UploadMediaAssetInput): Promise<{ id: string }>
export async function uploadMediaFromBuffer(data: BufferUploadInput): Promise<{ id: string }>
export async function updateMediaAsset(id: string, data: Partial<MediaAsset>): Promise<void>
export async function deleteMediaAsset(id: string): Promise<void>
export async function bulkDeleteAssets(ids: string[]): Promise<void>
export async function moveAssetToFolder(assetId: string, targetFolderId: string | null): Promise<void>

// Helper Functions
async function uploadToStorage(file: File | Buffer, path: string): Promise<string>
async function deleteFromStorage(storagePath: string): Promise<void>
```

**2. media-folders-service.ts** (~350 Zeilen)

**Funktionen:**
```typescript
export async function getFolders(organizationId: string, parentId: string | null): Promise<MediaFolder[]>
export async function getFolderById(id: string): Promise<MediaFolder | null>
export async function createFolder(data: CreateFolderInput): Promise<{ id: string }>
export async function updateFolder(id: string, data: Partial<MediaFolder>): Promise<void>
export async function deleteFolder(id: string): Promise<void>
export async function moveFolderToParent(folderId: string, newParentId: string | null): Promise<void>
export async function getFolderHierarchy(folderId: string): Promise<MediaFolder[]>

// Helper Functions
async function validateFolderMove(folderId: string, newParentId: string | null): Promise<boolean>
async function deleteAllAssetsInFolder(folderId: string): Promise<void>
```

**3. media-shares-service.ts** (~450 Zeilen) 🔐 Admin SDK Kandidat

**Funktionen:**
```typescript
// CRUD Operations (später zu Admin SDK migrieren)
export async function createShareLink(data: CreateShareLinkInput): Promise<ShareLink>
export async function getShareLink(shareId: string): Promise<ShareLink | null>
export async function updateShareLink(shareId: string, data: Partial<ShareLink>): Promise<void>
export async function deleteShareLink(shareId: string): Promise<void>

// Password Validation (🔐 MUSS Admin SDK werden!)
export async function validateSharePassword(shareId: string, password: string): Promise<boolean>

// Analytics (🔐 Besser als Admin SDK)
export async function trackShareAccess(shareId: string, metadata: AccessMetadata): Promise<void>

// Campaign Media
export async function getCampaignMediaAssets(shareLink: ShareLink): Promise<MediaAsset[]>
async function getMediaAssetsInFolder(folderId: string): Promise<MediaAsset[]>
```

**4. media-clippings-service.ts** (~300 Zeilen)

**Funktionen:**
```typescript
// Monitoring-Integration
export async function createClipping(data: CreateClippingInput): Promise<{ id: string }>
export async function getClippingsForMonitoring(monitoringId: string): Promise<MediaAsset[]>
export async function updateClippingMetadata(id: string, metadata: ClippingMetadata): Promise<void>
export async function deleteClipping(id: string): Promise<void>

// Helper Functions
async function extractArticleImage(articleUrl: string): Promise<Buffer>
async function generateClippingThumbnail(imageBuffer: Buffer): Promise<Buffer>
```

**5. media-pipeline-service.ts** (~300 Zeilen)

**Funktionen:**
```typescript
// Pipeline-Integration
export async function addPipelineAsset(data: PipelineAssetInput): Promise<{ id: string }>
export async function getPipelineAssets(organizationId: string, pipelineId: string): Promise<MediaAsset[]>
export async function updatePipelineAssetStatus(id: string, status: PipelineStatus): Promise<void>
export async function removePipelineAsset(id: string): Promise<void>

// Helper Functions
async function validatePipelineAsset(data: PipelineAssetInput): Promise<boolean>
async function notifyPipelineUpdate(pipelineId: string, assetId: string): Promise<void>
```

**Migration-Strategie:**

1. **Neue Service-Dateien erstellen** (mit Funktionen aus media-service.ts)
2. **Alte media-service.ts → media-service.backup.ts umbenennen**
3. **Neue media-service.ts erstellen** (re-export für Kompatibilität)

```typescript
// media-service.ts (Re-Export für Backward Compatibility)
export * from './media-assets-service';
export * from './media-folders-service';
export * from './media-shares-service';
export * from './media-clippings-service';
export * from './media-pipeline-service';

// Default-Export für alten Import-Style
import * as assetsService from './media-assets-service';
import * as foldersService from './media-folders-service';
import * as sharesService from './media-shares-service';
import * as clippingsService from './media-clippings-service';
import * as pipelineService from './media-pipeline-service';

export const mediaService = {
  ...assetsService,
  ...foldersService,
  ...sharesService,
  ...clippingsService,
  ...pipelineService,
};
```

4. **useMediaData.ts Hooks anpassen** (neue Service-Imports)
5. **Tests durchführen** (alle Media-Funktionen testen)

**Checkliste Service-Refactoring:**

- [ ] media-assets-service.ts erstellt (~400 Zeilen)
- [ ] media-folders-service.ts erstellt (~350 Zeilen)
- [ ] media-shares-service.ts erstellt (~450 Zeilen)
- [ ] media-clippings-service.ts erstellt (~300 Zeilen)
- [ ] media-pipeline-service.ts erstellt (~300 Zeilen)
- [ ] media-service.ts als Re-Export erstellt
- [ ] media-service.backup.ts angelegt
- [ ] useMediaData.ts aktualisiert
- [ ] TypeScript-Fehler behoben
- [ ] Alle Media-Funktionen testen

**Commit:**
```bash
git add .
git commit -m "refactor: Phase 2.1 - Service-Refactoring abgeschlossen

Media-Service aufgeteilt (1949 Zeilen → 5 Services):
- media-assets-service.ts (~400 Zeilen)
- media-folders-service.ts (~350 Zeilen)
- media-shares-service.ts (~450 Zeilen)
- media-clippings-service.ts (~300 Zeilen)
- media-pipeline-service.ts (~300 Zeilen)

Vorteile:
- Bessere Wartbarkeit (< 500 Zeilen pro Service)
- Klare Separation of Concerns
- Einfachere Unit-Tests
- Backward Compatibility via Re-Export

media-service.ts jetzt Re-Export für Kompatibilität.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Phase 2.2: Toast-Service Integration & Shared Components

**Priorität 1: Toast-Service Integration** ⭐

**Ziel:** Ersetze alle inline Alert-Komponenten durch den zentralen `toastService` (wie in `/dashboard/contacts/crm/companies`)

**Inline-Alert entfernen (page.tsx):**

```typescript
// ❌ ALT: Inline Alert-Komponente (54 Zeilen zu entfernen)
const [alert, setAlert] = useState<{
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
} | null>(null);

const showAlert = useCallback((type, title, message) => {
  setAlert({ type, title, message });
  setTimeout(() => setAlert(null), 5000);
}, []);

// Inline Alert-JSX (54 Zeilen)
{alert && (
  <div className="mb-4">
    <Alert
      type={alert.type}
      title={alert.title}
      message={alert.message}
      onClose={() => setAlert(null)}
    />
  </div>
)}

// Usage
const handleDelete = async (id: string) => {
  try {
    await mediaService.deleteMediaAsset(id);
    showAlert('success', 'Datei gelöscht', 'Die Datei wurde erfolgreich gelöscht.');
  } catch (error) {
    showAlert('error', 'Fehler', 'Die Datei konnte nicht gelöscht werden.');
  }
};
```

**Ersetzen durch toastService:**

```typescript
// ✅ NEU: Zentraler Toast-Service
import { toastService } from '@/lib/utils/toast';

// Kein Alert-State mehr!
// Kein showAlert mehr!
// Keine Alert-JSX mehr!

// Usage - Direkt toastService verwenden
const handleDelete = useCallback(async (id: string) => {
  try {
    await deleteAsset.mutateAsync({ id, organizationId });
    toastService.success('Datei gelöscht');
  } catch (error) {
    toastService.error('Fehler beim Löschen der Datei');
  }
}, [deleteAsset, organizationId]);

const handleBulkDelete = useCallback(async () => {
  try {
    await bulkDelete.mutateAsync({ ids: selectedIds, organizationId });
    setSelectedIds([]);
    toastService.success(`${selectedIds.length} Dateien gelöscht`);
  } catch (error) {
    toastService.error('Fehler beim Löschen der Dateien');
  }
}, [bulkDelete, selectedIds, organizationId]);

const handleUpload = useCallback(async (files: File[]) => {
  const loadingToast = toastService.loading('Dateien werden hochgeladen...');
  try {
    await uploadFiles(files);
    toastService.dismiss(loadingToast);
    toastService.success(`${files.length} Dateien hochgeladen`);
  } catch (error) {
    toastService.dismiss(loadingToast);
    toastService.error('Fehler beim Hochladen');
  }
}, []);
```

**Code-Einsparung durch Toast-Service:**
- Alert-State: ~5 Zeilen gespart
- showAlert-Funktion: ~15 Zeilen gespart
- Alert-JSX: ~10 Zeilen gespart
- Icon-Imports (ExclamationTriangleIcon, InformationCircleIcon, etc.): ~3 Zeilen gespart
- **Gesamt: ~33 Zeilen pro Datei gespart**

**Dateien anzupassen:**
- [ ] `page.tsx` - Inline Alert entfernen, toastService integrieren
- [ ] `share/[shareId]/page.tsx` - Inline Alert entfernen (falls vorhanden)
- [ ] `UploadModal/index.tsx` - toastService für Upload-Feedback
- [ ] `CreateFolderModal.tsx` - toastService für Success/Error
- [ ] `ShareModal/index.tsx` - toastService für Share-Link-Erstellung
- [ ] `MoveModal.tsx` - toastService für Move-Operationen

---

**Priorität 2: Shared Components erstellen**

**Komponenten zu erstellen:**

**Datei:** `src/app/dashboard/library/media/components/shared/`

1. **MediaCard.tsx** (~120 Zeilen)
   - Asset-Karte mit Thumbnail
   - Checkbox für Bulk-Selection
   - Quick-Actions (Download, Share, Delete)

2. **FolderCard.tsx** (~100 Zeilen)
   - Ordner-Karte mit Icon
   - Anzahl Assets anzeigen
   - Drag & Drop Support

3. **EmptyState.tsx** (~60 Zeilen)
   - Leere Mediathek
   - Upload-Button
   - Icon + Message

4. **MediaGridView.tsx** (~150 Zeilen)
   - Grid-Layout für Assets + Folders
   - Drag & Drop Areas
   - Selection-State

5. **MediaListView.tsx** (~180 Zeilen)
   - Listen-Layout (Tabelle)
   - Sortierung
   - Bulk-Actions

6. **MediaToolbar.tsx** (~200 Zeilen)
   - Search-Input
   - Filter (Dateityp, Ordner)
   - View-Toggle (Grid/List)
   - Bulk-Actions-Bar

**Checkliste Phase 2.2:**

- [ ] **Toast-Service integriert in:**
  - [ ] page.tsx (Alert-State + JSX entfernt)
  - [ ] share/[shareId]/page.tsx (falls Alert vorhanden)
  - [ ] UploadModal
  - [ ] CreateFolderModal
  - [ ] ShareModal
  - [ ] MoveModal
- [ ] **6 Shared Components erstellt**
- [ ] Inline-Komponenten aus page.tsx entfernt
- [ ] Code-Duplikation eliminiert (~33 Zeilen gespart durch Toast)

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2.2 - Toast-Service Integration & Shared Components

Toast-Service Integration (Priorität 1):
- Inline Alert-Komponenten entfernt in 6 Dateien
- Zentraler toastService integriert (wie in companies)
- Alert-State + showAlert-Funktion entfernt (~33 Zeilen pro Datei gespart)
- Loading-Toasts für Upload-Operations

Dateien angepasst:
- page.tsx: Alert → toastService
- share/[shareId]/page.tsx: Alert → toastService
- UploadModal: toastService für Upload-Feedback
- CreateFolderModal: toastService
- ShareModal: toastService
- MoveModal: toastService

Shared Components erstellt:
- MediaCard.tsx (120 Zeilen)
- FolderCard.tsx (100 Zeilen)
- EmptyState.tsx (60 Zeilen)
- MediaGridView.tsx (150 Zeilen)
- MediaListView.tsx (180 Zeilen)
- MediaToolbar.tsx (200 Zeilen)

Code-Duplikation eliminiert:
- ~198 Zeilen durch Toast-Service (6 Dateien × 33 Zeilen)
- ~810 Zeilen → Shared Components

Gesamt: ~1008 Zeilen Duplikation eliminiert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Phase 2.3: page.tsx modularisieren

**Ziel:** page.tsx (1426 Zeilen) → < 300 Zeilen

**Section-Komponenten:**

**Datei:** `src/app/dashboard/library/media/components/sections/`

1. **MediaBreadcrumbs.tsx** (~80 Zeilen)
   - Folder-Navigation
   - "Home" → "Folder A" → "Subfolder"
   - Click-Handler für Navigation

2. **MediaUploadSection.tsx** (~100 Zeilen)
   - Upload-Button
   - Drag & Drop Area
   - Upload-Progress

3. **MediaSelectionActions.tsx** (~120 Zeilen)
   - Bulk-Actions-Bar
   - "X Dateien ausgewählt"
   - Actions: Delete, Move, Share

4. **MediaPagination.tsx** (~80 Zeilen)
   - Page-Numbers
   - Items-per-Page Dropdown
   - Total Count

**Modal-Komponenten:**

**Datei:** `src/app/dashboard/library/media/components/modals/`

1. **UploadModal/**
   - **index.tsx** (~200 Zeilen) - Main Orchestrator
   - **DropZone.tsx** (~100 Zeilen) - Drag & Drop Zone
   - **FileList.tsx** (~120 Zeilen) - Liste der hochzuladenden Dateien
   - **UploadProgress.tsx** (~100 Zeilen) - Progress-Bars
   - **types.ts** (~50 Zeilen) - Shared Types

2. **CreateFolderModal.tsx** (~100 Zeilen)
   - Folder-Name-Input
   - Parent-Folder-Dropdown
   - Client-Zuordnung

3. **ShareModal/**
   - **index.tsx** (~250 Zeilen) - Main Orchestrator
   - **BasicSettings.tsx** (~100 Zeilen) - Title, Description
   - **BrandingSettings.tsx** (~150 Zeilen) - Logo, Colors, Footer
   - **PasswordSettings.tsx** (~80 Zeilen) - Passwort-Schutz
   - **SharePreview.tsx** (~120 Zeilen) - Live-Preview

4. **MoveModal.tsx** (~150 Zeilen)
   - Folder-Tree-View
   - Destination-Folder auswählen
   - Bulk-Move Support

**Neue page.tsx Struktur:**

```typescript
// src/app/dashboard/library/media/page.tsx (< 300 Zeilen)
'use client';

import { useState } from 'react';
import { useOrganization } from '@/lib/hooks/useOrganization';
import { useMediaAssets, useMediaFolders } from '@/lib/hooks/useMediaData';
import MediaBreadcrumbs from './components/sections/MediaBreadcrumbs';
import MediaToolbar from './components/shared/MediaToolbar';
import MediaGridView from './components/shared/MediaGridView';
import MediaListView from './components/shared/MediaListView';
import MediaPagination from './components/sections/MediaPagination';
import UploadModal from './components/modals/UploadModal';
import CreateFolderModal from './components/modals/CreateFolderModal';
import ShareModal from './components/modals/ShareModal';
import MoveModal from './components/modals/MoveModal';

export default function MediaPage() {
  const { organizationId } = useOrganization();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // React Query
  const { data: folders = [], isLoading: foldersLoading } = useMediaFolders(organizationId, currentFolderId);
  const { data: assets = [], isLoading: assetsLoading } = useMediaAssets(organizationId, currentFolderId);

  return (
    <div className="p-6">
      <MediaBreadcrumbs
        currentFolderId={currentFolderId}
        onNavigate={setCurrentFolderId}
      />

      <MediaToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedIds.length}
        onUpload={() => setShowUploadModal(true)}
        onCreateFolder={() => setShowFolderModal(true)}
        onShare={() => setShowShareModal(true)}
        onMove={() => setShowMoveModal(true)}
      />

      {viewMode === 'grid' ? (
        <MediaGridView
          folders={folders}
          assets={assets}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onFolderClick={setCurrentFolderId}
        />
      ) : (
        <MediaListView
          folders={folders}
          assets={assets}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onFolderClick={setCurrentFolderId}
        />
      )}

      <MediaPagination
        totalItems={assets.length}
        currentPage={1}
        itemsPerPage={24}
        onPageChange={() => {}}
      />

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          currentFolderId={currentFolderId}
          organizationId={organizationId}
        />
      )}

      {showFolderModal && (
        <CreateFolderModal
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          parentFolderId={currentFolderId}
          organizationId={organizationId}
        />
      )}

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          selectedAssetIds={selectedIds}
          organizationId={organizationId}
        />
      )}

      {showMoveModal && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          selectedAssetIds={selectedIds}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
```

**Backward Compatibility:**
```bash
# Alte page.tsx umbenennen
mv src/app/dashboard/library/media/page.tsx \
   src/app/dashboard/library/media/page.backup.tsx

# Neue page.tsx erstellen (< 300 Zeilen)
```

**Checkliste:**

- [ ] Section-Komponenten erstellt (4 Komponenten)
- [ ] Modal-Komponenten erstellt (4 Modals)
- [ ] page.tsx neu geschrieben (< 300 Zeilen)
- [ ] page.backup.tsx angelegt
- [ ] TypeScript-Fehler behoben
- [ ] Alle Features funktionieren

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2.3 - page.tsx modularisiert

page.tsx aufgeteilt (1426 Zeilen → < 300 Zeilen):

Section-Komponenten:
- MediaBreadcrumbs.tsx (80 Zeilen)
- MediaUploadSection.tsx (100 Zeilen)
- MediaSelectionActions.tsx (120 Zeilen)
- MediaPagination.tsx (80 Zeilen)

Modal-Komponenten:
- UploadModal/ (570 Zeilen gesamt)
- CreateFolderModal.tsx (100 Zeilen)
- ShareModal/ (700 Zeilen gesamt)
- MoveModal.tsx (150 Zeilen)

Neue page.tsx: Main Orchestrator (< 300 Zeilen)

Vorteile:
- Bessere Code-Lesbarkeit
- Eigenständig testbare Komponenten
- Wiederverwendbare Modals
- Einfachere Wartung

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Phase 2.4: share/[shareId]/page.tsx modularisieren

**Ziel:** share/[shareId]/page.tsx (457 Zeilen) → < 200 Zeilen

**Komponenten:**

**Datei:** `src/app/share/[shareId]/components/`

1. **PasswordPrompt.tsx** (~80 Zeilen)
   - Passwort-Eingabe
   - Submit-Button
   - Error-Message

2. **ShareHeader.tsx** (~100 Zeilen)
   - Branding-Logo (conditional)
   - Title + Description
   - Campaign-Type Badge

3. **MediaGallery.tsx** (~150 Zeilen)
   - Grid-Layout für Assets
   - Lightbox für Preview
   - Download-Button

4. **MediaDownloadButton.tsx** (~60 Zeilen)
   - Single-File Download
   - Bulk-Download (ZIP)

5. **ShareFooter.tsx** (~50 Zeilen)
   - Branding-Footer (conditional)
   - Powered by [Company]

**Neue page.tsx Struktur:**

```typescript
// src/app/share/[shareId]/page.tsx (< 200 Zeilen)
'use client';

import { useState } from 'react';
import { useShareLink, useCampaignMediaAssets } from '@/lib/hooks/useMediaData';
import PasswordPrompt from './components/PasswordPrompt';
import ShareHeader from './components/ShareHeader';
import MediaGallery from './components/MediaGallery';
import ShareFooter from './components/ShareFooter';

export default function SharePage({ params }: { params: { shareId: string } }) {
  const { shareId } = params;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: shareLink, isLoading } = useShareLink(shareId);
  const { data: mediaItems = [] } = useCampaignMediaAssets(shareLink);

  // Password-Protected Share
  if (shareLink?.settings?.requirePassword && !isAuthenticated) {
    return (
      <PasswordPrompt
        shareId={shareId}
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  if (!shareLink) {
    return <div>Share nicht gefunden</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ShareHeader shareLink={shareLink} />
      <MediaGallery assets={mediaItems} shareLink={shareLink} />
      <ShareFooter shareLink={shareLink} />
    </div>
  );
}
```

**Checkliste:**

- [ ] 5 Komponenten erstellt
- [ ] page.tsx neu geschrieben (< 200 Zeilen)
- [ ] page.backup.tsx angelegt
- [ ] TypeScript-Fehler behoben
- [ ] Share-Funktionen testen

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2.4 - share/[shareId]/page.tsx modularisiert

share/[shareId]/page.tsx aufgeteilt (457 Zeilen → < 200 Zeilen):

Komponenten erstellt:
- PasswordPrompt.tsx (80 Zeilen)
- ShareHeader.tsx (100 Zeilen)
- MediaGallery.tsx (150 Zeilen)
- MediaDownloadButton.tsx (60 Zeilen)
- ShareFooter.tsx (50 Zeilen)

Neue page.tsx: Main Orchestrator (< 200 Zeilen)

Vorteile:
- Klare Separation of Concerns
- Wiederverwendbare Share-Komponenten
- Einfachere Branding-Integration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Phase-Bericht Phase 2

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Phase 2.1: Service-Refactoring
- media-service.ts: 1949 Zeilen → 5 Services (~400 Zeilen pro Service)
- Bessere Wartbarkeit und Testbarkeit

### Phase 2.2: Shared Components
- 6 Shared Components erstellt (810 Zeilen gesamt)
- Inline Alert entfernt → toastService (~33 Zeilen gespart)

### Phase 2.3: page.tsx Modularisierung
- page.tsx: 1426 Zeilen → < 300 Zeilen
- 4 Section-Komponenten (380 Zeilen)
- 4 Modal-Komponenten (1520 Zeilen gesamt)

### Phase 2.4: share/[shareId]/page.tsx Modularisierung
- share/page.tsx: 457 Zeilen → < 200 Zeilen
- 5 Komponenten erstellt (440 Zeilen)

### Gesamt-Ergebnis
- **Vorher:** 3832 Zeilen in 3 großen Dateien
- **Nachher:** ~3150 Zeilen in 25+ modularen Dateien
- **Durchschnitt:** ~126 Zeilen pro Komponente
- **Code-Duplikation:** ~810 Zeilen eliminiert

### Vorteile
- Alle Komponenten < 300 Zeilen
- Eigenständig testbar
- Wiederverwendbar
- Bessere Wartbarkeit
```

---

### Phase 3: Performance-Optimierung

**Dauer:** 1 Tag

**Ziel:** Unnötige Re-Renders vermeiden, Upload-Performance verbessern

#### 3.1 useCallback für Handler

```typescript
// page.tsx
const handleDeleteAsset = useCallback(async (id: string) => {
  await deleteAsset.mutateAsync({ id, organizationId });
  toastService.success('Datei gelöscht');
}, [deleteAsset, organizationId]);

const handleBulkDelete = useCallback(async () => {
  await bulkDelete.mutateAsync({ ids: selectedIds, organizationId });
  setSelectedIds([]);
  toastService.success(`${selectedIds.length} Dateien gelöscht`);
}, [bulkDelete, selectedIds, organizationId]);

const handleMoveAsset = useCallback(async (assetId: string, targetFolderId: string | null) => {
  await moveAsset.mutateAsync({ assetId, targetFolderId, organizationId });
  toastService.success('Datei verschoben');
}, [moveAsset, organizationId]);

const handleFolderClick = useCallback((folderId: string) => {
  setCurrentFolderId(folderId);
  setSelectedIds([]); // Reset selection
}, []);

const handleUploadComplete = useCallback(() => {
  setShowUploadModal(false);
  queryClient.invalidateQueries({ queryKey: ['media-assets', organizationId, currentFolderId] });
}, [organizationId, currentFolderId, queryClient]);
```

#### 3.2 useMemo für Computed Values

```typescript
// Gefilterte Assets
const filteredAssets = useMemo(() => {
  let result = assets;

  // Search-Filter
  if (searchTerm) {
    result = result.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Filetyp-Filter
  if (selectedFileType) {
    result = result.filter(asset => asset.fileType === selectedFileType);
  }

  // Sortierung
  result.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'size') return b.fileSize - a.fileSize;
    return 0;
  });

  return result;
}, [assets, searchTerm, selectedFileType, sortBy]);

// Statistiken
const stats = useMemo(() => {
  return {
    totalAssets: assets.length,
    filteredAssets: filteredAssets.length,
    selectedAssets: selectedIds.length,
    totalSize: assets.reduce((sum, asset) => sum + asset.fileSize, 0),
  };
}, [assets.length, filteredAssets.length, selectedIds.length, assets]);

// Filetyp-Optionen für Dropdown
const fileTypeOptions = useMemo(() => {
  const types = new Set(assets.map(asset => asset.fileType));
  return Array.from(types).map(type => ({
    value: type,
    label: type.toUpperCase(),
  }));
}, [assets]);

// Breadcrumbs-Pfad
const breadcrumbPath = useMemo(() => {
  if (!currentFolderId) return [];
  // Build path from current folder to root
  return buildFolderPath(folders, currentFolderId);
}, [folders, currentFolderId]);
```

#### 3.3 Debouncing für Search & Upload

**Search-Debouncing:**

```typescript
// useDebounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// In Komponente
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms Delay

// Filter verwenden debouncedSearchTerm
const filteredAssets = useMemo(() => {
  if (!debouncedSearchTerm) return assets;
  return assets.filter(asset =>
    asset.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );
}, [assets, debouncedSearchTerm]);
```

**Upload-Optimierung:**

```typescript
// UploadModal/index.tsx
import { useCallback, useMemo } from 'react';

// Batch-Upload (5 Dateien parallel)
const CONCURRENT_UPLOADS = 5;

const uploadFiles = useCallback(async (files: File[]) => {
  const batches = [];
  for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
    batches.push(files.slice(i, i + CONCURRENT_UPLOADS));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(file => uploadSingleFile(file))
    );
  }
}, []);

// Upload-Progress memoized
const uploadProgress = useMemo(() => {
  const completed = uploadQueue.filter(item => item.status === 'completed').length;
  const total = uploadQueue.length;
  return total > 0 ? (completed / total) * 100 : 0;
}, [uploadQueue]);
```

#### 3.4 React.memo für Komponenten

```typescript
// MediaCard.tsx
export default React.memo(function MediaCard({ asset, isSelected, onSelect }: Props) {
  return (
    <div className="...">
      {/* ... */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom Comparison: Nur re-rendern wenn Asset oder Selection ändert
  return prevProps.asset.id === nextProps.asset.id &&
         prevProps.isSelected === nextProps.isSelected;
});

// FolderCard.tsx
export default React.memo(function FolderCard({ folder, onClick }: Props) {
  return (
    <div className="..." onClick={() => onClick(folder.id)}>
      {/* ... */}
    </div>
  );
});

// MediaGallery.tsx
export default React.memo(function MediaGallery({ assets, selectedIds, onSelectionChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {assets.map(asset => (
        <MediaCard
          key={asset.id}
          asset={asset}
          isSelected={selectedIds.includes(asset.id)}
          onSelect={() => onSelectionChange(asset.id)}
        />
      ))}
    </div>
  );
});
```

#### 3.5 Drag & Drop Performance

```typescript
// MediaGridView.tsx
import { useCallback, useState } from 'react';

// Throttle Drag-Over Events
const useDragOver = (callback: (e: DragEvent) => void, delay: number = 100) => {
  const [lastRun, setLastRun] = useState(0);

  return useCallback((e: DragEvent) => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      callback(e);
      setLastRun(now);
    }
  }, [callback, delay, lastRun]);
};

// In Komponente
const handleDragOver = useDragOver((e: DragEvent) => {
  e.preventDefault();
  // Zeige Drop-Indicator
}, 100); // Max 10x pro Sekunde

// Optimized Drop-Handler
const handleDrop = useCallback(async (e: DragEvent, targetFolderId: string | null) => {
  e.preventDefault();

  const draggedAssetIds = JSON.parse(e.dataTransfer.getData('assetIds'));

  // Batch-Move (nicht einzeln)
  await bulkMoveAssets.mutateAsync({
    assetIds: draggedAssetIds,
    targetFolderId,
    organizationId,
  });

  toastService.success(`${draggedAssetIds.length} Dateien verschoben`);
}, [bulkMoveAssets, organizationId]);
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler (~15 Callbacks)
- [ ] useMemo für Dropdown-Optionen
- [ ] useMemo für gefilterte Assets
- [ ] useMemo für Statistiken
- [ ] useMemo für Breadcrumbs-Pfad
- [ ] Debouncing für Search (300ms)
- [ ] Upload-Batching (5 parallel)
- [ ] React.memo für MediaCard
- [ ] React.memo für FolderCard
- [ ] React.memo für MediaGallery
- [ ] Drag & Drop Throttling
- [ ] Performance-Tests durchgeführt

#### Phase-Bericht Template

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- **useCallback:** 15 Handler memoized
- **useMemo:** 5 Computed Values (gefilterte Assets, Stats, Options, Breadcrumbs)
- **Debouncing:** Search (300ms), Drag-Over (100ms)
- **React.memo:** 3 Komponenten (MediaCard, FolderCard, MediaGallery)
- **Upload-Batching:** 5 Dateien parallel (statt alle auf einmal)

### Messbare Verbesserungen
- Re-Renders reduziert um ~60% (bei 100 Assets)
- Upload-Performance: 5x schneller bei 20+ Dateien
- Search-Performance: Kein Lag bei 1000+ Assets
- Drag & Drop: Smooth bei großen Ordnern

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

Optimierungen:
- useCallback für 15 Handler
- useMemo für 5 Computed Values
- Search-Debouncing (300ms)
- Upload-Batching (5 parallel)
- React.memo für Grid-Komponenten
- Drag & Drop Throttling (100ms)

Messbare Verbesserungen:
- Re-Renders: -60%
- Upload: 5x schneller (20+ Dateien)
- Search: Kein Lag bei 1000+ Assets

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 4: Testing

**Dauer:** 1 Tag

**Ziel:** Comprehensive Test Suite mit >80% Coverage

#### 4.1 Hook Tests

**Datei:** `src/lib/hooks/__tests__/useMediaData.test.tsx`

**Tests zu implementieren:** (~400 Zeilen)

```typescript
describe('useMediaData Hooks', () => {
  // Assets (7 Tests)
  describe('useMediaAssets', () => {
    it('sollte Assets für Folder laden');
    it('sollte leeres Array bei fehlendem organizationId');
    it('sollte Error bei Firestore-Fehler werfen');
  });

  describe('useUploadMediaAsset', () => {
    it('sollte Asset hochladen und Cache invalidieren');
    it('sollte Error bei fehlendem File werfen');
  });

  describe('useDeleteMediaAsset', () => {
    it('sollte Asset löschen und Cache invalidieren');
  });

  describe('useBulkDeleteAssets', () => {
    it('sollte mehrere Assets löschen');
  });

  // Folders (6 Tests)
  describe('useMediaFolders', () => {
    it('sollte Folders für Parent laden');
    it('sollte Root-Folders laden (parentId null)');
  });

  describe('useCreateFolder', () => {
    it('sollte Folder erstellen und Cache invalidieren');
  });

  // Shares (6 Tests)
  describe('useShareLink', () => {
    it('sollte Share-Link laden');
    it('sollte null bei ungültigem shareId');
  });

  describe('useCreateShareLink', () => {
    it('sollte Share-Link erstellen');
    it('sollte Campaign-Share-Link erstellen');
  });

  describe('useValidateSharePassword', () => {
    it('sollte korrektes Passwort validieren');
    it('sollte falsches Passwort ablehnen');
  });

  // Campaign (1 Test)
  describe('useCampaignMediaAssets', () => {
    it('sollte Campaign-Assets laden und deduplicaten');
  });
});
```

**Geschätzte Tests:** ~25 Tests

#### 4.2 Integration Tests

**Datei:** `src/app/dashboard/library/media/__tests__/integration/media-crud-flow.test.tsx`

**Tests:** (~300 Zeilen)

```typescript
describe('Media CRUD Flow', () => {
  it('sollte kompletten Upload-Flow durchlaufen', async () => {
    // 1. Mediathek laden (leer)
    // 2. Upload-Modal öffnen
    // 3. Datei hochladen
    // 4. Datei in Liste sehen
    // 5. Datei löschen
  });

  it('sollte Folder-Flow durchlaufen', async () => {
    // 1. Folder erstellen
    // 2. Folder öffnen
    // 3. Datei in Folder hochladen
    // 4. Folder löschen (inkl. Assets)
  });

  it('sollte Drag & Drop Flow durchlaufen', async () => {
    // 1. Folder erstellen
    // 2. Asset hochladen
    // 3. Asset per Drag & Drop in Folder verschieben
  });

  it('sollte Share-Flow durchlaufen', async () => {
    // 1. Asset hochladen
    // 2. Share-Link erstellen
    // 3. Share-Link öffnen
    // 4. Asset herunterladen
  });
});
```

**Geschätzte Tests:** ~5-8 Tests

#### 4.3 Component Tests

**Shared Components Tests:** (~600 Zeilen gesamt)

```typescript
// MediaCard.test.tsx
describe('MediaCard', () => {
  it('sollte Asset-Thumbnail rendern');
  it('sollte Checkbox für Selection rendern');
  it('sollte Quick-Actions zeigen');
  it('sollte Download-Button aufrufen');
  it('sollte Delete-Action triggern');
});

// FolderCard.test.tsx
describe('FolderCard', () => {
  it('sollte Folder-Icon rendern');
  it('sollte Asset-Count anzeigen');
  it('sollte Folder-Click triggern');
});

// MediaToolbar.test.tsx
describe('MediaToolbar', () => {
  it('sollte Search-Input rendern');
  it('sollte View-Toggle funktionieren');
  it('sollte Bulk-Actions zeigen bei Selection');
});

// UploadModal.test.tsx
describe('UploadModal', () => {
  it('sollte Drag & Drop Zone rendern');
  it('sollte Datei-Auswahl ermöglichen');
  it('sollte Upload-Progress anzeigen');
  it('sollte Upload-Errors anzeigen');
});

// ShareModal.test.tsx
describe('ShareModal', () => {
  it('sollte Basic-Settings rendern');
  it('sollte Branding-Settings anzeigen');
  it('sollte Password-Protection aktivieren');
  it('sollte Share-Link generieren');
});
```

**Geschätzte Tests:** ~30 Tests

#### 4.4 Service Tests

**Datei:** `src/lib/firebase/__tests__/media-assets-service.test.ts`

```typescript
describe('media-assets-service', () => {
  describe('getMediaAssets', () => {
    it('sollte Assets für Folder laden');
    it('sollte Root-Assets laden (folderId null)');
  });

  describe('uploadMediaAsset', () => {
    it('sollte Asset hochladen zu Storage');
    it('sollte Metadata in Firestore speichern');
  });

  describe('deleteMediaAsset', () => {
    it('sollte Asset aus Storage löschen');
    it('sollte Metadata aus Firestore löschen');
  });
});
```

**Geschätzte Tests pro Service:** ~10 Tests
**Gesamt (5 Services):** ~50 Tests

#### 4.5 Public Share Page Tests

**Datei:** `src/app/share/[shareId]/__tests__/share-page.test.tsx`

```typescript
describe('Public Share Page', () => {
  it('sollte Share-Link laden');
  it('sollte Passwort-Prompt zeigen bei geschütztem Share');
  it('sollte Campaign-Assets anzeigen');
  it('sollte Download-Button rendern');
  it('sollte Branding anzeigen');
});
```

**Geschätzte Tests:** ~8 Tests

#### Test-Coverage-Ziel

```bash
# Coverage-Report erstellen
npm run test:coverage

# Ziel-Coverage
- Statements:   >80%
- Branches:     >75%
- Functions:    >80%
- Lines:        >80%
```

#### Checkliste Phase 4

- [ ] Hook-Tests erstellt (25 Tests)
- [ ] Integration-Tests erstellt (8 Tests)
- [ ] Component-Tests erstellt (30 Tests)
- [ ] Service-Tests erstellt (50 Tests)
- [ ] Share-Page-Tests erstellt (8 Tests)
- [ ] **Gesamt: ~121 Tests**
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt
- [ ] Coverage >80%

#### Phase-Bericht Template

```markdown
## Phase 4: Testing ✅

### Test Suite
- **Hook-Tests:** 25/25 bestanden
- **Integration-Tests:** 8/8 bestanden
- **Component-Tests:** 30/30 bestanden
- **Service-Tests:** 50/50 bestanden
- **Share-Page-Tests:** 8/8 bestanden
- **Gesamt: 121/121 Tests bestanden** ✅

### Coverage
- Statements: 85%
- Branches: 78%
- Functions: 82%
- Lines: 86%

### Test-Kategorien
- CRUD-Operations: 35 Tests
- Upload-Flow: 15 Tests
- Share-System: 20 Tests
- Drag & Drop: 10 Tests
- UI-Komponenten: 30 Tests
- Service-Layer: 50 Tests

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt

Test Suite vollständig implementiert:
- Hook-Tests: 25 Tests
- Integration-Tests: 8 Tests
- Component-Tests: 30 Tests
- Service-Tests: 50 Tests
- Share-Page-Tests: 8 Tests

Gesamt: 121/121 Tests bestanden ✅

Coverage: >80% (Statements, Functions, Lines)

Test-Kategorien:
- CRUD-Operations: 35 Tests
- Upload-Flow: 15 Tests
- Share-System: 20 Tests
- Drag & Drop: 10 Tests
- UI-Komponenten: 30 Tests
- Service-Layer: 50 Tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 5: Dokumentation

**Dauer:** 1 Tag

**Ziel:** Vollständige, wartbare Dokumentation

#### 5.1 Struktur anlegen

```bash
mkdir -p docs/media/{api,components,adr,guides}
```

#### 5.2 README.md (Hauptdokumentation)

**Datei:** `docs/media/README.md` (~600 Zeilen)

**Inhalt:**

```markdown
# Media-Modul Dokumentation

## Übersicht

Das Media-Modul ist das zentrale Asset-Management-System von CeleroPress.

## Features

- ✅ **Media-Bibliothek** - Dateien und Ordner verwalten
- ✅ **Drag & Drop Upload** - Mehrere Dateien gleichzeitig hochladen
- ✅ **Folder-Hierarchie** - Verschachtelte Ordner mit Client-Zuordnung
- ✅ **Share-Links** - Öffentliche Freigabe mit Branding
- ✅ **Campaign-Integration** - Media-Assets für Kampagnen
- ✅ **Clipping-Operations** - Monitoring-Integration
- ✅ **Pipeline-Assets** - Integration mit Workflows
- ✅ **React Query Integration** - Automatisches Caching
- ✅ **Performance-Optimiert** - Upload-Batching, Debouncing
- ✅ **Comprehensive Tests** - 121 Tests, >80% Coverage

## Architektur

[Diagramme, Ordnerstruktur, etc.]

## Technologie-Stack

- **React 18** - UI Framework
- **Next.js 15** - App Router
- **TypeScript** - Type Safety
- **React Query v5** - State Management
- **Firebase Firestore** - Backend
- **Firebase Storage** - File Storage
- **Firebase Admin SDK** - Server-Side Operations (Share-Links)
- **Tailwind CSS** - Styling
- **Jest + Testing Library** - Testing

## Installation & Setup

[Setup-Anweisungen]

## API-Dokumentation

Siehe: [API-Dokumentation](./api/README.md)

## Komponenten

Siehe: [Komponenten-Dokumentation](./components/README.md)

## Guides

- [Upload-Guide](./guides/upload-guide.md)
- [Share-System-Guide](./guides/share-system-guide.md)
- [Branding-Guide](./guides/branding-guide.md)

## Testing

[Test-Anweisungen, Coverage-Reports]

## Performance

[Performance-Messungen, Optimierungen]

## Troubleshooting

[Häufige Probleme und Lösungen]
```

#### 5.3 API-Dokumentation

**Datei:** `docs/media/api/README.md` (~400 Zeilen)

**Datei:** `docs/media/api/media-assets-service.md` (~500 Zeilen)
**Datei:** `docs/media/api/media-folders-service.md` (~400 Zeilen)
**Datei:** `docs/media/api/media-shares-service.md` (~600 Zeilen)
**Datei:** `docs/media/api/media-clippings-service.md` (~300 Zeilen)
**Datei:** `docs/media/api/media-pipeline-service.md` (~300 Zeilen)

**Gesamt:** ~2500 Zeilen API-Dokumentation

#### 5.4 Komponenten-Dokumentation

**Datei:** `docs/media/components/README.md` (~800 Zeilen)

**Inhalt:**

```markdown
# Media Komponenten-Dokumentation

## Shared Components

### MediaCard
[Props, Verwendung, Beispiele]

### FolderCard
[Props, Verwendung, Beispiele]

### MediaToolbar
[Props, Verwendung, Beispiele]

## Section Components

### MediaBreadcrumbs
[Props, Verwendung, Beispiele]

### MediaPagination
[Props, Verwendung, Beispiele]

## Modal Components

### UploadModal
[Props, Verwendung, Beispiele, Upload-Flow]

### ShareModal
[Props, Verwendung, Beispiele, Share-Settings]

## Best Practices

[Komponenten-Design, Performance-Tipps]
```

#### 5.5 Guides

**Datei:** `docs/media/guides/upload-guide.md` (~400 Zeilen)

**Inhalt:**

```markdown
# Upload-Guide

## Single-File Upload

[Anleitung, Code-Beispiele]

## Bulk-Upload

[Anleitung, Upload-Batching, Error-Handling]

## Drag & Drop Upload

[Anleitung, Browser-Kompatibilität]

## Upload zu Folder

[Anleitung, Folder-Auswahl]

## Resumable Uploads

[Anleitung, Retry-Logic]
```

**Datei:** `docs/media/guides/share-system-guide.md` (~500 Zeilen)

**Inhalt:**

```markdown
# Share-System-Guide

## Share-Link erstellen

[Anleitung, Basic Settings]

## Branding anpassen

[Anleitung, Logo, Colors, Footer]

## Passwort-Schutz

[Anleitung, Security Best Practices]

## Campaign-Shares

[Anleitung, Campaign-Integration]

## Share-Analytics

[Anleitung, Tracking, Reports]
```

**Datei:** `docs/media/guides/branding-guide.md` (~300 Zeilen)

#### 5.6 ADR-Dokumentation

**Datei:** `docs/media/adr/README.md` (~600 Zeilen)

**Inhalt:**

```markdown
# Architecture Decision Records (ADRs) - Media

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | React Query für State Management | Accepted | [Datum] |
| ADR-0002 | Service-Aufteilung Strategie | Accepted | [Datum] |
| ADR-0003 | Admin SDK für Share-Operations | Accepted | [Datum] |
| ADR-0004 | Upload-Batching Strategie | Accepted | [Datum] |

---

## ADR-0003: Admin SDK für Share-Operations

**Status:** Accepted
**Datum:** [Datum]

### Kontext

Share-Link-Erstellung erfolgte bisher client-side mit Sicherheitsrisiken:
- Client kann shareId manipulieren
- Passwort-Validierung client-side unsicher
- Keine Server-Side Access-Logs
- Keine Rate-Limiting

### Entscheidung

Wir migrieren Share-Operations zu Firebase Admin SDK (Server-Side API Routes).

### Alternativen

1. **Client-Side (aktuell)**
   - ❌ Sicherheitsrisiken
   - ❌ Keine Rate-Limiting
   - ❌ Keine Server-Logs

2. **Admin SDK (neu)**
   - ✅ Server-Side Security
   - ✅ Rate-Limiting
   - ✅ Access-Logs
   - ✅ Passwort-Hashing

### Konsequenzen

✅ **Vorteile:**
- Server-Side Security für Share-Links
- Passwort-Hashing mit bcrypt
- Rate-Limiting für Share-Zugriffe
- Audit-Logs für Compliance

⚠️ **Trade-offs:**
- Migration-Aufwand (~2-3 Stunden)
- API-Route-Setup erforderlich
- Client-Code-Anpassung

### Implementation

[Details zur Implementation, siehe Phase 6]

---
```

#### Checkliste Phase 5

- [ ] docs/media/README.md erstellt (600 Zeilen)
- [ ] docs/media/api/README.md erstellt (400 Zeilen)
- [ ] 5 Service-Docs erstellt (2500 Zeilen gesamt)
- [ ] docs/media/components/README.md erstellt (800 Zeilen)
- [ ] 3 Guides erstellt (1200 Zeilen gesamt)
- [ ] docs/media/adr/README.md erstellt (600 Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Phase-Bericht Template

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (600 Zeilen) - Hauptdokumentation
- api/README.md (400 Zeilen) - API-Übersicht
- 5 Service-Docs (2500 Zeilen gesamt)
- components/README.md (800 Zeilen)
- 3 Guides (1200 Zeilen gesamt):
  - upload-guide.md (400 Zeilen)
  - share-system-guide.md (500 Zeilen)
  - branding-guide.md (300 Zeilen)
- adr/README.md (600 Zeilen)

### Gesamt
- **6.100+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen
- ADRs für wichtige Entscheidungen

### Commit
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt

Dokumentation erstellt (6100+ Zeilen):
- README.md (600 Zeilen)
- API-Docs (2900 Zeilen)
- Komponenten-Docs (800 Zeilen)
- Guides (1200 Zeilen)
- ADRs (600 Zeilen)

Guides:
- Upload-Guide (Drag & Drop, Batching, Retry)
- Share-System-Guide (Branding, Passwort, Analytics)
- Branding-Guide (Logo, Colors, Footer)

ADRs:
- React Query Integration
- Service-Aufteilung
- Admin SDK für Share-Operations
- Upload-Batching Strategie

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 6: Admin SDK Migration & Production-Ready Code Quality

**Dauer:** 1 Tag

**Ziel:** Share-Operations zu Admin SDK migrieren + Production-Ready Code Quality

#### 6.1 Admin SDK Setup

**Dependencies installieren:**

```bash
npm install firebase-admin
```

**Admin SDK initialisieren:**

**Datei:** `src/lib/firebase/admin.ts` (~100 Zeilen)

```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
```

#### 6.2 Share-API-Routes erstellen

**Datei:** `src/app/api/media/share/create/route.ts` (~200 Zeilen)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetId, type, title, description, settings, assetIds, folderIds, organizationId, userId } = body;

    // Validierung
    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique shareId
    const shareId = nanoid(10);

    // Hash password (wenn vorhanden)
    let hashedPassword;
    if (settings?.requirePassword && settings?.password) {
      hashedPassword = await bcrypt.hash(settings.password, 10);
    }

    // Create Share-Link
    const shareLink = {
      shareId,
      targetId,
      type,
      title,
      description,
      settings: {
        ...settings,
        password: hashedPassword, // Gehashtes Passwort
      },
      assetIds,
      folderIds,
      organizationId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      accessCount: 0,
    };

    await adminDb.collection('media_shares').doc(shareId).set(shareLink);

    // Audit-Log erstellen
    await adminDb.collection('audit_logs').add({
      action: 'share_created',
      shareId,
      userId,
      organizationId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ shareId }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}
```

**Datei:** `src/app/api/media/share/validate/route.ts` (~150 Zeilen)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareId, password } = body;

    if (!shareId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load Share-Link
    const shareDoc = await adminDb.collection('media_shares').doc(shareId).get();

    if (!shareDoc.exists) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    const shareLink = shareDoc.data();

    // Validate Password
    const isValid = await bcrypt.compare(password, shareLink.settings.password);

    if (!isValid) {
      // Log failed attempt
      await adminDb.collection('audit_logs').add({
        action: 'share_password_failed',
        shareId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Log successful access
    await adminDb.collection('audit_logs').add({
      action: 'share_password_success',
      shareId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment Access-Count
    await adminDb.collection('media_shares').doc(shareId).update({
      accessCount: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error('Error validating share password:', error);
    return NextResponse.json(
      { error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}
```

**Datei:** `src/app/api/media/share/[shareId]/route.ts` (~100 Zeilen)

```typescript
// GET - Load Share-Link
export async function GET(req: NextRequest, { params }: { params: { shareId: string } }) {
  // ...
}

// DELETE - Delete Share-Link
export async function DELETE(req: NextRequest, { params }: { params: { shareId: string } }) {
  // ...
}
```

#### 6.3 Client-Code anpassen

**useMediaData.ts anpassen:**

```typescript
// Alte Client-Side Implementation entfernen
export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShareLinkInput) => {
      // ❌ Alt: Client-Side
      // return sharesService.createShareLink(data);

      // ✅ Neu: API-Route (Server-Side)
      const response = await fetch('/api/media/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create share');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['share-links', variables.organizationId]
      });
    },
  });
}

export function useValidateSharePassword() {
  return useMutation({
    mutationFn: async (data: { shareId: string; password: string }) => {
      // ✅ API-Route (Server-Side)
      const response = await fetch('/api/media/share/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Invalid password');
      }

      return response.json();
    },
  });
}
```

#### 6.4 TypeScript Check

```bash
npx tsc --noEmit
```

**Häufige Fehler:**
- Missing imports in API-Routes
- Type mismatches (admin.firestore vs. Firestore)
- Async/await missing

#### 6.5 ESLint Check

```bash
npx eslint src/app/dashboard/library/media --fix
npx eslint src/app/share/[shareId] --fix
npx eslint src/lib/firebase/media-*-service.ts --fix
npx eslint src/app/api/media --fix
```

#### 6.6 Console Cleanup

```bash
rg "console\." src/app/dashboard/library/media
rg "console\." src/app/share/[shareId]
rg "console\." src/lib/firebase/media-*-service.ts
```

**Erlaubt:**
```typescript
console.error('Failed to upload media:', error);
```

**Zu entfernen:**
```typescript
console.log('📁 Uploading file:', file.name);
```

#### 6.7 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
# Checklist
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ #dedc00 für Checkboxen
✓ Konsistente Höhen (h-10 für Toolbar)
✓ Konsistente Borders (zinc-300 für Inputs)
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

#### 6.8 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- Build erfolgreich?
- Keine TypeScript-Errors?
- Keine ESLint-Errors?
- App startet korrekt?
- Media-Modul funktioniert?
- Share-Links funktionieren?

#### Checkliste Phase 6

**Admin SDK:**
- [ ] Admin SDK installiert
- [ ] admin.ts erstellt
- [ ] 3 API-Routes erstellt (create, validate, get)
- [ ] bcrypt für Passwort-Hashing
- [ ] Audit-Logs implementiert
- [ ] Client-Code angepasst (useMediaData.ts)

**Code Quality:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Share-Links funktionieren (mit Admin SDK)

#### Phase-Bericht Template

```markdown
## Phase 6: Admin SDK Migration & Production-Ready Code Quality ✅

### Admin SDK Migration
- Firebase Admin SDK integriert
- 3 API-Routes erstellt:
  - POST /api/media/share/create (Share erstellen)
  - POST /api/media/share/validate (Passwort validieren)
  - GET /api/media/share/[shareId] (Share laden)
- Passwort-Hashing mit bcrypt
- Audit-Logs für Compliance
- Client-Code auf API-Routes umgestellt

### Sicherheitsverbesserungen
- ✅ Server-Side Share-Link-Erstellung
- ✅ Passwort-Hashing (bcrypt)
- ✅ Rate-Limiting vorbereitet
- ✅ Audit-Logs für alle Share-Zugriffe
- ✅ Server-Side Validierung

### Code Quality
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Commit
```bash
git add .
git commit -m "feat: Phase 6 - Admin SDK Migration & Production-Ready

Admin SDK Migration:
- Firebase Admin SDK integriert
- 3 API-Routes erstellt (create, validate, get)
- Passwort-Hashing mit bcrypt
- Audit-Logs für Compliance
- Client-Code auf API-Routes umgestellt

Sicherheitsverbesserungen:
- Server-Side Share-Link-Erstellung
- Passwort-Hashing (bcrypt)
- Audit-Logs für alle Share-Zugriffe
- Server-Side Validierung

Code Quality:
- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Build: Erfolgreich
- Production-Test: Bestanden

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🔄 Merge zu Main

**Letzte Phase:** Code zu Main mergen

### Workflow

```bash
# 1. Finaler Commit
git add .
git commit -m "test: Finaler Test-Cleanup und Production-Readiness"

# 2. Push Feature-Branch
git push origin feature/media-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/media-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- media
npm run build
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup)
- [ ] 121 Tests bestehen
- [ ] Dokumentation vollständig (6100+ Zeilen)
- [ ] Admin SDK migriert
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Production-Deployment geplant

### Final Report

```markdown
## ✅ Media-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Refactoring Cleanup + Admin SDK)
- **Tests:** 121/121 bestanden ✅
- **Coverage:** >80% (Statements, Functions, Lines)
- **Dokumentation:** 6100+ Zeilen

### Änderungen
- **Vorher:** 3832 Zeilen in 3 großen Dateien
- **Nachher:** ~3150 Zeilen in 30+ modulare Dateien
- **Code-Reduktion:** ~682 Zeilen durch Modularisierung + Cleanup

### Highlights

#### Service-Refactoring
- media-service.ts (1949 Zeilen) → 5 Services (~400 Zeilen pro Service)
- Bessere Wartbarkeit und Testbarkeit

#### React Query Integration
- 22 Custom Hooks implementiert (useMediaData.ts)
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations

#### Komponenten-Modularisierung
- page.tsx: 1426 → < 300 Zeilen
- share/page.tsx: 457 → < 200 Zeilen
- 6 Shared Components
- 4 Section-Komponenten
- 4 Modal-Komponenten

#### Performance-Optimierungen
- useCallback für 15 Handler
- useMemo für 5 Computed Values
- Search-Debouncing (300ms)
- Upload-Batching (5 parallel)
- React.memo für Grid-Komponenten
- Drag & Drop Throttling

#### Admin SDK Migration
- Server-Side Share-Link-Erstellung
- Passwort-Hashing mit bcrypt
- Audit-Logs für Compliance
- Rate-Limiting vorbereitet

#### Testing
- 121 Tests implementiert
- >80% Coverage
- Hook-Tests, Integration-Tests, Component-Tests, Service-Tests

#### Dokumentation
- 6100+ Zeilen Dokumentation
- API-Docs für alle 5 Services
- Komponenten-Dokumentation
- 3 Guides (Upload, Share-System, Branding)
- 4 ADRs

### Messbare Verbesserungen
- **Code-Qualität:** ~682 Zeilen reduziert, alle Komponenten < 300 Zeilen
- **Performance:** Re-Renders -60%, Upload 5x schneller
- **Security:** Server-Side Share-Operations, Passwort-Hashing, Audit-Logs
- **Wartbarkeit:** 30+ modulare Dateien statt 3 Monolithen
- **Test-Coverage:** >80%

### Nächste Schritte
- [ ] Production-Deployment vorbereiten
- [ ] Team-Demo durchführen
- [ ] Monitoring aufsetzen (Share-Analytics)
- [ ] Rate-Limiting für Share-Links aktivieren
- [ ] User-Feedback sammeln
```

---

## 🔐 Admin SDK Evaluation (Detailliert)

### Übersicht

Dieser Abschnitt evaluiert, welche Operationen vom Client-Side Code zum Firebase Admin SDK migriert werden sollten.

### Kriterien für Admin SDK Migration

Eine Operation sollte zum Admin SDK migriert werden, wenn mindestens eines zutrifft:

1. **Security-Critical** - Operation enthält sensible Daten oder Validierungen
2. **Server-Side-Only** - Operation benötigt Server-Ressourcen (z.B. Passwort-Hashing)
3. **Audit-Log-Required** - Operation muss für Compliance geloggt werden
4. **Rate-Limiting** - Operation ist anfällig für Missbrauch
5. **Complex-Validation** - Operation benötigt komplexe Server-Side Validierung

### Evaluation: Media-Operations

#### ✅ Share-Link-Erstellung (MUSS Admin SDK werden)

**Aktuelle Implementation:** Client-Side (media-shares-service.ts)

**Probleme:**
```typescript
// ❌ Client-Side - UNSICHER
export async function createShareLink(data: CreateShareLinkInput): Promise<ShareLink> {
  const shareId = nanoid(10); // Client generiert shareId → Manipulierbar!

  const shareLink = {
    shareId,
    settings: {
      requirePassword: data.settings.requirePassword,
      password: data.settings.password, // ❌ Klartext-Passwort in Firestore!
    },
    // ...
  };

  await db.collection('media_shares').doc(shareId).set(shareLink);
}
```

**Risiken:**
- ⚠️ Client kann shareId manipulieren (Collision-Attacks)
- ⚠️ Passwort wird im Klartext gespeichert (!)
- ⚠️ Keine Server-Side Validierung
- ⚠️ Keine Audit-Logs
- ⚠️ Kein Rate-Limiting

**Admin SDK Solution:**
```typescript
// ✅ Server-Side API-Route - SICHER
export async function POST(req: NextRequest) {
  const { settings, organizationId, userId } = await req.json();

  // Server generiert shareId (sicher)
  const shareId = nanoid(10);

  // Passwort-Hashing (bcrypt)
  const hashedPassword = settings.password
    ? await bcrypt.hash(settings.password, 10)
    : null;

  // Server-Side Validierung
  if (!organizationId || !userId) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Audit-Log
  await adminDb.collection('audit_logs').add({
    action: 'share_created',
    shareId,
    userId,
    organizationId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Share-Link erstellen
  await adminDb.collection('media_shares').doc(shareId).set({
    shareId,
    settings: { ...settings, password: hashedPassword },
    organizationId,
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ shareId }, { status: 201 });
}
```

**Vorteile:**
- ✅ Server generiert shareId (keine Manipulation)
- ✅ Passwort-Hashing mit bcrypt
- ✅ Server-Side Validierung
- ✅ Audit-Logs für Compliance
- ✅ Rate-Limiting möglich (Next.js Middleware)

**Aufwand:** ~3 Stunden (API-Route + Client-Anpassung)

**Empfehlung:** **MUSS migriert werden** (Security-Critical)

---

#### ✅ Passwort-Validierung (MUSS Admin SDK werden)

**Aktuelle Implementation:** Client-Side

```typescript
// ❌ Client-Side - EXTREM UNSICHER
export async function validateSharePassword(shareId: string, password: string): Promise<boolean> {
  const shareDoc = await db.collection('media_shares').doc(shareId).get();
  const shareLink = shareDoc.data();

  // ❌ Klartext-Passwort-Vergleich im Client!
  return shareLink.settings.password === password;
}
```

**Risiken:**
- 🚨 **KRITISCH:** Passwort wird im Klartext verglichen
- 🚨 **KRITISCH:** Passwort-Hash (falls vorhanden) im Client-Code sichtbar
- ⚠️ Keine Rate-Limiting (Brute-Force-Attacken)
- ⚠️ Keine Audit-Logs für fehlgeschlagene Versuche

**Admin SDK Solution:**
```typescript
// ✅ Server-Side API-Route - SICHER
export async function POST(req: NextRequest) {
  const { shareId, password } = await req.json();

  // Load Share-Link
  const shareDoc = await adminDb.collection('media_shares').doc(shareId).get();
  const shareLink = shareDoc.data();

  // bcrypt-Vergleich (Server-Side)
  const isValid = await bcrypt.compare(password, shareLink.settings.password);

  if (!isValid) {
    // Audit-Log für failed attempt
    await adminDb.collection('audit_logs').add({
      action: 'share_password_failed',
      shareId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Audit-Log für success
  await adminDb.collection('audit_logs').add({
    action: 'share_password_success',
    shareId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ valid: true }, { status: 200 });
}
```

**Vorteile:**
- ✅ Passwort-Hash bleibt Server-Side
- ✅ bcrypt-Vergleich (kein Klartext)
- ✅ Rate-Limiting möglich
- ✅ Audit-Logs für Compliance

**Aufwand:** ~2 Stunden

**Empfehlung:** **MUSS migriert werden** (Security-Critical)

---

#### ⚠️ Share-Link-Zugriff-Tracking (SOLLTE Admin SDK werden)

**Aktuelle Implementation:** Client-Side

```typescript
// ⚠️ Client-Side - Unsicher für Analytics
export async function trackShareAccess(shareId: string, metadata: AccessMetadata): Promise<void> {
  await db.collection('share_access_logs').add({
    shareId,
    timestamp: Timestamp.now(),
    ...metadata,
  });

  // Increment Access-Count
  await db.collection('media_shares').doc(shareId).update({
    accessCount: FieldValue.increment(1),
  });
}
```

**Probleme:**
- ⚠️ Client kann Access-Logs manipulieren
- ⚠️ Access-Count kann manipuliert werden
- ⚠️ Keine IP-Adresse / User-Agent Logging

**Admin SDK Solution:**
```typescript
// ✅ Server-Side - Bessere Analytics
export async function POST(req: NextRequest) {
  const { shareId } = await req.json();

  // Server-Side Metadata sammeln
  const metadata = {
    ip: req.ip || req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Audit-Log
  await adminDb.collection('share_access_logs').add({
    shareId,
    ...metadata,
  });

  // Increment Access-Count
  await adminDb.collection('media_shares').doc(shareId).update({
    accessCount: admin.firestore.FieldValue.increment(1),
  });

  return NextResponse.json({ success: true });
}
```

**Vorteile:**
- ✅ Server-Side Metadata (IP, User-Agent)
- ✅ Manipulationssicher
- ✅ Bessere Analytics

**Aufwand:** ~1 Stunde

**Empfehlung:** **SOLLTE migriert werden** (bessere Analytics, aber nicht kritisch)

---

#### ❌ Asset-Upload (KANN Client-Side bleiben)

**Aktuelle Implementation:** Client-Side mit Firebase Storage

```typescript
// ✅ Client-Side - OK
export async function uploadMediaAsset(file: File, data: UploadMediaAssetInput) {
  // Upload zu Firebase Storage
  const storagePath = `media/${organizationId}/${nanoid()}-${file.name}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  // Upload-Progress
  uploadTask.on('state_changed', (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    onProgress(progress);
  });

  await uploadTask;

  // Metadata in Firestore
  const downloadUrl = await getDownloadURL(storageRef);
  await db.collection('media_assets').add({
    ...data,
    downloadUrl,
    storagePath,
  });
}
```

**Warum Client-Side OK?**
- ✅ Firebase Storage Security Rules schützen Upload
- ✅ Client-Side Upload = Weniger Server-Last
- ✅ Progress-Updates direkt im Client
- ✅ Resumable Uploads built-in

**Vorteile Client-Side:**
- ✅ Weniger Server-Kosten
- ✅ Bessere Upload-Performance
- ✅ Progress-Tracking im Client

**Nachteile Admin SDK:**
- ❌ Server muss Datei buffern (RAM-Verbrauch)
- ❌ Kein Client-Side Progress
- ❌ Höhere Latenz

**Empfehlung:** **Client-Side BEHALTEN** (Performance + Kosten)

---

#### ❌ Folder-Operations (KANN Client-Side bleiben)

**Aktuelle Implementation:** Client-Side

```typescript
// ✅ Client-Side - OK
export async function createFolder(data: CreateFolderInput) {
  await db.collection('media_folders').add({
    name: data.name,
    parentId: data.parentId,
    organizationId: data.organizationId,
    createdBy: data.userId,
    createdAt: Timestamp.now(),
  });
}
```

**Warum Client-Side OK?**
- ✅ Firestore Security Rules schützen Folder-Erstellung
- ✅ Keine sensiblen Daten
- ✅ Keine komplexe Validierung
- ✅ Kein Audit-Log erforderlich

**Empfehlung:** **Client-Side BEHALTEN**

---

#### ❌ Asset-Delete (KANN Client-Side bleiben, aber Überlegung wert)

**Aktuelle Implementation:** Client-Side

```typescript
// ⚠️ Client-Side - Könnte besser sein
export async function deleteMediaAsset(id: string) {
  const assetDoc = await db.collection('media_assets').doc(id).get();
  const asset = assetDoc.data();

  // Delete from Storage
  await deleteObject(ref(storage, asset.storagePath));

  // Delete from Firestore
  await db.collection('media_assets').doc(id).delete();
}
```

**Überlegung:** Admin SDK wäre besser für:
- Audit-Logs (wer hat was gelöscht?)
- Cleanup-Operations (alle Assets in Folder löschen)
- Quota-Management (Storage-Limits)

**Aber:** Nicht kritisch, kann später migriert werden

**Empfehlung:** **Client-Side BEHALTEN** (für jetzt), später evaluieren

---

### Zusammenfassung: Admin SDK Evaluation

| Operation | Status | Empfehlung | Aufwand | Priorität |
|-----------|--------|------------|---------|-----------|
| **Share-Link-Erstellung** | ❌ Client-Side | **MUSS Admin SDK** | 3h | 🔴 Kritisch |
| **Passwort-Validierung** | ❌ Client-Side | **MUSS Admin SDK** | 2h | 🔴 Kritisch |
| **Share-Zugriff-Tracking** | ⚠️ Client-Side | **SOLLTE Admin SDK** | 1h | 🟡 Empfohlen |
| **Asset-Upload** | ✅ Client-Side | **Client-Side BEHALTEN** | - | - |
| **Folder-Operations** | ✅ Client-Side | **Client-Side BEHALTEN** | - | - |
| **Asset-Delete** | ✅ Client-Side | **Client-Side BEHALTEN** (für jetzt) | - | - |

### Gesamt-Aufwand Admin SDK Migration

- **Kritische Operations:** 5 Stunden (Share-Link + Passwort)
- **Empfohlene Operations:** 1 Stunde (Tracking)
- **Gesamt:** ~6 Stunden

### Implementation-Reihenfolge

1. **Phase 6.1:** Admin SDK Setup (1h)
2. **Phase 6.2:** Share-Link-Erstellung API-Route (2h)
3. **Phase 6.3:** Passwort-Validierung API-Route (1h)
4. **Phase 6.4:** Share-Zugriff-Tracking API-Route (1h)
5. **Phase 6.5:** Client-Code anpassen (useMediaData.ts) (1h)

**Gesamt:** ~6 Stunden (Teil von Phase 6)

---

## 📊 Erfolgsmetriken

### Code Quality

**Vorher:**
- page.tsx: 1426 Zeilen
- share/page.tsx: 457 Zeilen
- media-service.ts: 1949 Zeilen
- **Gesamt:** 3832 Zeilen in 3 Dateien

**Nachher:**
- page.tsx: < 300 Zeilen
- share/page.tsx: < 200 Zeilen
- 5 Services: ~400 Zeilen pro Service
- 6 Shared Components: ~810 Zeilen gesamt
- 4 Section-Komponenten: ~380 Zeilen gesamt
- 4 Modal-Komponenten: ~1520 Zeilen gesamt
- **Gesamt:** ~3150 Zeilen in 30+ Dateien

**Code-Reduktion:** ~682 Zeilen (-18%)

**Durchschnitt:** ~126 Zeilen pro Komponente

### Testing

- **Anzahl Tests:** 121 Tests
- **Test-Coverage:** >80%
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** -60% (bei 100 Assets)
- **Upload-Performance:** 5x schneller (20+ Dateien)
- **Search-Performance:** Kein Lag bei 1000+ Assets
- **Initial Load:** < 500ms (bei 100 Assets)

### Security

- ✅ Server-Side Share-Link-Erstellung
- ✅ Passwort-Hashing (bcrypt)
- ✅ Audit-Logs für Compliance
- ✅ Rate-Limiting vorbereitet

### Dokumentation

- **Zeilen:** 6100+ Zeilen
- **Dateien:** 15+ Dokumente
- **Code-Beispiele:** 50+ Beispiele

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung (Phase 0)

- [ ] Feature-Branch erstellt
- [ ] Backups angelegt (3832+ Zeilen)
- [ ] Ist-Zustand dokumentiert
- [ ] Dependencies geprüft

### Phase 0.5: Pre-Refactoring Cleanup

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt

### Phase 1: React Query

- [ ] Custom Hooks erstellt (22 Hooks, 600 Zeilen)
- [ ] page.tsx umgestellt
- [ ] share/[shareId]/page.tsx umgestellt
- [ ] Alte loadData/useEffect entfernt

### Phase 2: Modularisierung

- [ ] Service-Refactoring (5 Services)
- [ ] 6 Shared Components erstellt
- [ ] 4 Section-Komponenten erstellt
- [ ] 4 Modal-Komponenten erstellt
- [ ] page.tsx modularisiert (< 300 Zeilen)
- [ ] share/page.tsx modularisiert (< 200 Zeilen)

### Phase 3: Performance

- [ ] useCallback für 15 Handler
- [ ] useMemo für 5 Computed Values
- [ ] Search-Debouncing (300ms)
- [ ] Upload-Batching (5 parallel)
- [ ] React.memo für Grid-Komponenten
- [ ] Drag & Drop Throttling

### Phase 4: Testing

- [ ] Hook-Tests (25 Tests)
- [ ] Integration-Tests (8 Tests)
- [ ] Component-Tests (30 Tests)
- [ ] Service-Tests (50 Tests)
- [ ] Share-Page-Tests (8 Tests)
- [ ] Coverage >80%

### Phase 5: Dokumentation

- [ ] README.md (600 Zeilen)
- [ ] 5 Service-Docs (2500 Zeilen)
- [ ] Komponenten-Docs (800 Zeilen)
- [ ] 3 Guides (1200 Zeilen)
- [ ] ADRs (600 Zeilen)

### Phase 6: Admin SDK & Code Quality

- [ ] Admin SDK integriert
- [ ] 3 API-Routes erstellt
- [ ] Client-Code angepasst
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

### Merge

- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 🚀 Nächste Schritte nach Refactoring

1. **Team-Demo** - Media-Modul Features und neue Architektur vorstellen
2. **Monitoring** - Share-Analytics aufsetzen, Upload-Performance tracken
3. **Rate-Limiting** - Next.js Middleware für Share-Zugriffe aktivieren
4. **User-Feedback** - Sammeln und iterieren
5. **Performance-Monitoring** - Real-User-Monitoring (RUM) einrichten
6. **Weitere Module** - Template für andere Module anwenden

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** [Name]
**Fragen?** Siehe Team README oder Slack-Channel

---

**Version:** 1.0
**Erstellt:** 16. Oktober 2025
**Basiert auf:** Modul-Refactoring Template v1.1
**Geschätzter Aufwand:** 4-6 Tage

---

*Dieser Plan ist ein lebendes Dokument. Anpassungen während der Implementation sind zu erwarten.*
