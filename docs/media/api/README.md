# Media API-Dokumentation

Vollständige API-Referenz für alle Media-Services.

---

## Übersicht

Das Media-Modul ist in 5 spezialisierte Services aufgeteilt:

| Service | Datei | Zeilen | Beschreibung |
|---------|-------|--------|--------------|
| **Assets** | `media-assets-service.ts` | ~400 | Asset CRUD Operations, Upload, Download |
| **Folders** | `media-folders-service.ts` | ~300 | Folder Management, Hierarchie, Verschachtelung |
| **Shares** | `media-shares-service.ts` | ~450 | Share-Link Operations, Public Sharing |
| **Clippings** | `media-clippings-service.ts` | ~300 | Monitoring Integration, Clipping Management |
| **Pipeline** | `media-pipeline-service.ts` | ~150 | Pipeline Workflows, Asset-Verarbeitung |

---

## media-assets-service

**Datei:** `src/lib/firebase/media-assets-service.ts`

### Core Operations

#### `getMediaAssets(organizationId, folderId?)`

Lädt alle Assets für eine Organization, optional gefiltert nach Folder.

```typescript
async function getMediaAssets(
  organizationId: string,
  folderId?: string | null
): Promise<MediaAsset[]>

// Beispiel
const assets = await mediaService.getMediaAssets('org-123', 'folder-456');
// Returns: [{ id: 'asset-1', fileName: 'image.jpg', ... }, ...]
```

**Query:** `media_assets` collection
- Filter: `organizationId == organizationId`
- Filter: `folderId == folderId` (optional)
- Order: `createdAt DESC`

#### `getMediaAssetById(assetId)`

Lädt ein einzelnes Asset by ID.

```typescript
async function getMediaAssetById(assetId: string): Promise<MediaAsset | null>

// Beispiel
const asset = await mediaService.getMediaAssetById('asset-123');
// Returns: { id: 'asset-123', fileName: 'logo.png', ... }
```

#### `uploadMedia(file, organizationId, folderId?, onProgress?, retryCount?, context?)`

Uploaded eine Datei zu Firebase Storage und erstellt Firestore-Dokument.

```typescript
async function uploadMedia(
  file: File,
  organizationId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  retryCount?: number,
  context?: { userId?: string }
): Promise<MediaAsset>

// Beispiel
const asset = await mediaService.uploadMedia(
  file,
  'org-123',
  'folder-456',
  (progress) => console.log(`${progress}%`),
  3, // Retry-Count
  { userId: 'user-789' }
);
```

**Flow:**
1. Generate unique filename
2. Upload to Storage: `organizations/{organizationId}/media/{filename}`
3. Get download URL
4. Create Firestore document with metadata
5. Return MediaAsset

**Retry-Logic:** Bei Fehler wird Upload bis zu `retryCount` mal wiederholt.

#### `deleteMediaAsset(asset)`

Löscht Asset aus Storage und Firestore.

```typescript
async function deleteMediaAsset(asset: MediaAsset): Promise<void>

// Beispiel
await mediaService.deleteMediaAsset(asset);
```

**Flow:**
1. Delete from Storage: `deleteObject(asset.storagePath)`
2. Delete from Firestore: `deleteDoc(media_assets/{assetId})`

#### `updateAsset(assetId, updates)`

Aktualisiert Asset-Metadaten.

```typescript
async function updateAsset(
  assetId: string,
  updates: Partial<MediaAsset>
): Promise<void>

// Beispiel
await mediaService.updateAsset('asset-123', {
  fileName: 'new-name.jpg',
  description: 'Updated description',
  tags: ['marketing', 'q1-2025'],
});
```

### Additional Operations

#### `moveAssetToFolder(assetId, newFolderId, organizationId)`

Verschiebt Asset in einen anderen Folder.

```typescript
async function moveAssetToFolder(
  assetId: string,
  newFolderId: string | null,
  organizationId: string
): Promise<void>
```

---

## media-folders-service

**Datei:** `src/lib/firebase/media-folders-service.ts`

### Core Operations

#### `getFolders(organizationId, parentFolderId?)`

Lädt alle Folders, optional gefiltert nach Parent.

```typescript
async function getFolders(
  organizationId: string,
  parentFolderId?: string
): Promise<MediaFolder[]>

// Beispiel - Root Folders
const rootFolders = await mediaService.getFolders('org-123');

// Beispiel - Sub-Folders
const subFolders = await mediaService.getFolders('org-123', 'folder-456');
```

#### `getFolder(folderId)`

Lädt einen einzelnen Folder.

```typescript
async function getFolder(folderId: string): Promise<MediaFolder | null>
```

#### `createFolder(folder, context)`

Erstellt einen neuen Folder.

```typescript
async function createFolder(
  folder: {
    name: string;
    userId: string;
    organizationId: string;
    parentFolderId?: string;
    description?: string;
  },
  context: { organizationId: string; userId: string }
): Promise<string> // Returns: folderId

// Beispiel
const folderId = await mediaService.createFolder(
  {
    name: 'Marketing Kampagne Q1',
    userId: 'user-123',
    organizationId: 'org-456',
    parentFolderId: 'folder-789',
    description: 'Q1 2025 Marketing Materials',
  },
  { organizationId: 'org-456', userId: 'user-123' }
);
```

#### `updateFolder(folderId, updates)`

Aktualisiert Folder-Metadaten.

```typescript
async function updateFolder(
  folderId: string,
  updates: Partial<MediaFolder>
): Promise<void>

// Beispiel
await mediaService.updateFolder('folder-123', {
  name: 'Neuer Name',
  description: 'Updated description',
});
```

#### `deleteFolder(folderId)`

Löscht einen Folder (nur wenn leer).

```typescript
async function deleteFolder(folderId: string): Promise<void>

// Beispiel
await mediaService.deleteFolder('folder-123');
// Throws: Error wenn Folder nicht leer ist
```

### Folder-Hierarchie

#### `getAllFolders(organizationId)`

Lädt ALLE Folders einer Organization (flache Liste).

```typescript
async function getAllFolders(
  organizationId: string
): Promise<MediaFolder[]>
```

#### `getFolderBreadcrumbs(folderId, organizationId)`

Generiert Breadcrumb-Pfad für einen Folder.

```typescript
async function getFolderBreadcrumbs(
  folderId: string,
  organizationId: string
): Promise<FolderBreadcrumb[]>

// Beispiel
const breadcrumbs = await mediaService.getFolderBreadcrumbs('folder-789', 'org-123');
// Returns: [
//   { id: 'folder-123', name: 'Marketing' },
//   { id: 'folder-456', name: 'Kampagnen' },
//   { id: 'folder-789', name: 'Q1 2025' }
// ]
```

---

## media-shares-service

**Datei:** `src/lib/firebase/media-shares-service.ts`

### Core Operations

#### `createShareLink(shareData)`

Erstellt einen Share-Link (Server-Side via Admin SDK).

```typescript
async function createShareLink(shareData: {
  targetId: string;
  type: 'file' | 'folder' | 'campaign';
  title: string;
  description?: string;
  settings: {
    downloadAllowed: boolean;
    passwordRequired: string | null;
    showFileList: boolean;
    expiresAt: Date | null;
    watermarkEnabled: boolean;
  };
  organizationId: string;
  createdBy: string;
}): Promise<ShareLink>

// Beispiel
const shareLink = await mediaService.createShareLink({
  targetId: 'asset-123',
  type: 'file',
  title: 'Logo-Freigabe',
  description: 'Unser neues Logo',
  settings: {
    downloadAllowed: true,
    passwordRequired: 'my-password', // wird mit bcrypt gehashed
    showFileList: false,
    expiresAt: new Date('2025-12-31'),
    watermarkEnabled: false,
  },
  organizationId: 'org-456',
  createdBy: 'user-789',
});

// Share-URL: https://app.example.com/share/{shareLink.shareId}
```

**Security:**
- Password wird mit bcrypt gehashed (10 salt rounds)
- ShareId wird mit nanoid(10) generiert
- Audit-Log erstellt für Compliance

#### `getShareLink(shareId)`

Lädt einen Share-Link (Public Access).

```typescript
async function getShareLink(shareId: string): Promise<ShareLink | null>

// Beispiel
const shareLink = await mediaService.getShareLink('abc123def');
```

#### `validateSharePassword(shareId, password)`

Validiert Passwort für geschützten Share (Server-Side via Admin SDK).

```typescript
async function validateSharePassword(
  shareId: string,
  password: string
): Promise<boolean>

// Beispiel
const isValid = await mediaService.validateSharePassword('abc123', 'my-password');
// Returns: true or false
```

**Security:**
- Passwort-Vergleich mit bcrypt
- Rate-Limiting (Server-Side)
- Audit-Log bei fehlgeschlagenen Versuchen

### Share-Link Types

#### File Share

```typescript
const fileShare = {
  type: 'file',
  targetId: 'asset-123', // Single Asset
  settings: { /* ... */ },
};
```

#### Folder Share

```typescript
const folderShare = {
  type: 'folder',
  targetId: 'folder-456', // All Assets in Folder
  settings: { showFileList: true }, // Zeige Liste
};
```

#### Campaign Share

```typescript
const campaignShare = {
  type: 'campaign',
  targetId: 'campaign-789', // Campaign Media Assets
  context: {
    campaignId: 'campaign-789',
    campaignName: 'Q1 Kampagne',
  },
};
```

### Campaign Media Assets

#### `getCampaignMediaAssets(shareLink)`

Lädt alle Media-Assets für eine Kampagne.

```typescript
async function getCampaignMediaAssets(
  shareLink: ShareLink
): Promise<MediaAsset[]>

// Beispiel
const assets = await mediaService.getCampaignMediaAssets(campaignShareLink);
// Returns: Alle Assets die zur Kampagne gehören
```

---

## media-clippings-service

**Datei:** `src/lib/firebase/media-clippings-service.ts`

### Core Operations

#### `saveClippingAsset(clipping, context)`

Speichert ein Clipping als Media-Asset.

```typescript
async function saveClippingAsset(
  clipping: {
    id: string;
    outlet: string;
    title: string;
    content: string;
    url: string;
    publishDate: Date;
    reachValue: number;
    sentimentScore: number;
    tags?: string[];
    projectId?: string;
    campaignId?: string;
  },
  context: { organizationId: string; userId: string }
): Promise<string> // Returns: assetId
```

#### `getProjectClippings(projectId, organizationId)`

Lädt alle Clippings für ein Projekt.

```typescript
async function getProjectClippings(
  projectId: string,
  organizationId: string
): Promise<ClippingAsset[]>
```

#### `updateClippingMetrics(clippingId, metrics, context)`

Aktualisiert Metriken für ein Clipping.

```typescript
async function updateClippingMetrics(
  clippingId: string,
  metrics: {
    reachValue: number;
    sentimentScore: number;
    mediaValue?: number;
    engagementScore?: number;
  },
  context: { organizationId: string; userId: string }
): Promise<void>
```

### Advanced Operations

#### `searchClippings(organizationId, filters)`

Suche Clippings mit erweiterten Filtern.

```typescript
async function searchClippings(
  organizationId: string,
  filters: {
    projectIds?: string[];
    outlets?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    sentimentRange?: { min: number; max: number };
    reachMin?: number;
    searchTerm?: string;
  }
): Promise<ClippingAsset[]>
```

#### `createClippingPackage(clippingIds, packageName, context)`

Erstellt ein Clipping-Package für Export.

```typescript
async function createClippingPackage(
  clippingIds: string[],
  packageName: string,
  context: { organizationId: string; userId: string }
): Promise<string> // Returns: shareId
```

#### `exportClippings(clippingIds, format, context)`

Exportiert Clippings in verschiedene Formate.

```typescript
async function exportClippings(
  clippingIds: string[],
  format: 'pdf' | 'excel' | 'csv',
  context: { organizationId: string; userId: string }
): Promise<Blob>
```

---

## media-pipeline-service

**Datei:** `src/lib/firebase/media-pipeline-service.ts`

### Core Operations

#### `addToPipeline(assetId, pipelineStage, context)`

Fügt Asset zur Pipeline hinzu.

```typescript
async function addToPipeline(
  assetId: string,
  pipelineStage: 'review' | 'approval' | 'distribution',
  context: { organizationId: string; userId: string }
): Promise<void>
```

#### `removeFromPipeline(assetId, context)`

Entfernt Asset aus Pipeline.

```typescript
async function removeFromPipeline(
  assetId: string,
  context: { organizationId: string; userId: string }
): Promise<void>
```

#### `getPipelineAssets(organizationId, stage?)`

Lädt alle Pipeline-Assets.

```typescript
async function getPipelineAssets(
  organizationId: string,
  stage?: string
): Promise<MediaAsset[]>
```

---

## React Query Hooks

Alle Services werden über React Query Hooks konsumiert:

```typescript
// Assets
useMediaAssets(organizationId, folderId)
useUploadMediaAsset()
useDeleteMediaAsset()
useBulkDeleteAssets()
useMoveAsset()

// Folders
useMediaFolders(organizationId, parentId)
useCreateFolder()
useUpdateFolder()
useDeleteFolder()
useMoveFolder()
useFolderBreadcrumbs(folderId)

// Shares
useShareLinks(organizationId)
useShareLink(shareId)
useCreateShareLink()
useUpdateShareLink()
useDeleteShareLink()
useValidateSharePassword()
useCampaignMediaAssets(shareLink)

// Pipeline
usePipelineAssets(organizationId)
useAddPipelineAsset()
useRemovePipelineAsset()
```

**Vorteile:**
- Automatisches Caching
- Background-Updates
- Query-Invalidierung nach Mutations
- Error-Handling
- Loading-States

---

## Error-Handling

Alle Service-Funktionen werfen Errors bei Problemen:

```typescript
try {
  const asset = await mediaService.uploadMedia(file, organizationId);
  console.log('Upload erfolgreich:', asset);
} catch (error) {
  if (error.code === 'storage/unauthorized') {
    console.error('Keine Berechtigung zum Hochladen');
  } else if (error.code === 'storage/quota-exceeded') {
    console.error('Storage-Quota überschritten');
  } else {
    console.error('Upload fehlgeschlagen:', error.message);
  }
}
```

**Häufige Error-Codes:**
- `storage/unauthorized` - Keine Berechtigung
- `storage/quota-exceeded` - Quota überschritten
- `storage/object-not-found` - Datei nicht gefunden
- `permission-denied` - Firestore Security Rules
- `not-found` - Dokument nicht gefunden

---

## Rate-Limiting

Share-Operations (Server-Side) haben Rate-Limiting:

- **Share-Link Creation:** 10/Minute pro User
- **Password Validation:** 5/Minute pro Share-Link
- **Share-Link Access:** 100/Minute pro Share-Link

Bei Überschreitung: HTTP 429 (Too Many Requests)

---

## Best Practices

### 1. Immer organizationId übergeben

```typescript
// ✅ GUT
const assets = await mediaService.getMediaAssets(organizationId, folderId);

// ❌ SCHLECHT
const assets = await mediaService.getMediaAssets(null, folderId);
```

### 2. React Query Hooks verwenden

```typescript
// ✅ GUT - Hooks nutzen
const { data: assets } = useMediaAssets(organizationId, folderId);

// ❌ SCHLECHT - Service direkt aufrufen
const assets = await mediaService.getMediaAssets(organizationId, folderId);
```

### 3. Error-Handling implementieren

```typescript
// ✅ GUT
const deleteMutation = useDeleteMediaAsset();

try {
  await deleteMutation.mutateAsync({ asset, organizationId });
  toast.success('Datei gelöscht');
} catch (error) {
  toast.error('Fehler beim Löschen');
}

// ❌ SCHLECHT - Keine Error-Handling
await deleteMutation.mutateAsync({ asset, organizationId });
```

### 4. Upload-Progress anzeigen

```typescript
// ✅ GUT
await mediaService.uploadMedia(
  file,
  organizationId,
  folderId,
  (progress) => setUploadProgress(progress)
);

// ❌ SCHLECHT - Kein Progress
await mediaService.uploadMedia(file, organizationId);
```

---

## Siehe auch

- **[Hauptdokumentation](../README.md)** - Übersicht über das Media-Modul
- **[Komponenten-Dokumentation](../components/README.md)** - UI-Komponenten
- **[Upload-Guide](../guides/upload-guide.md)** - Upload-Anleitungen
- **[Share-System-Guide](../guides/share-system-guide.md)** - Share-Link-Anleitungen

---

**Letztes Update:** 2025-10-16
**Version:** 2.0
