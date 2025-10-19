# Firebase Services API-Referenz

> **Version:** 2.0.0
> **Letzte Aktualisierung:** 2025-10-19
> **Dateien:** `media-folders-service.ts`, `media-assets-service.ts`

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [media-folders-service](#media-folders-service)
  - [Folder Operations](#folder-operations)
  - [Folder Queries](#folder-queries)
  - [Folder Utilities](#folder-utilities)
- [media-assets-service](#media-assets-service)
  - [Asset Upload](#asset-upload)
  - [Asset Queries](#asset-queries)
  - [Asset Operations](#asset-operations)
  - [Spezial-Funktionen](#spezial-funktionen)
- [Multi-Tenancy](#multi-tenancy)
- [Error-Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Übersicht

Die Firebase Services bilden die **Data Layer** des ProjectFoldersView-Moduls.

### Service-Architektur

```
media-folders-service.ts   →  Firestore (media_folders Collection)
media-assets-service.ts    →  Firestore (media_assets Collection) + Firebase Storage
```

### Datenmodell

```
media_folders (Collection)
├── organizationId: string       ← Multi-Tenancy Key
├── createdBy: string
├── name: string
├── parentFolderId?: string      ← Hierarchie
├── clientId?: string            ← Firma-Zuordnung
├── color?: string
├── description?: string
├── createdAt: Timestamp
└── updatedAt: Timestamp

media_assets (Collection)
├── organizationId: string       ← Multi-Tenancy Key
├── createdBy: string
├── fileName: string
├── fileType: string             ← MIME-Type
├── storagePath: string          ← Firebase Storage Path
├── downloadUrl: string
├── folderId?: string            ← Ordner-Zuordnung
├── clientId?: string            ← Firma-Zuordnung
├── metadata?: object            ← Erweiterte Metadaten
├── contentRef?: string          ← Für .celero-doc
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

---

## media-folders-service

**Datei:** `src/lib/firebase/media-folders-service.ts`

### Folder Operations

#### createFolder()

Erstellt einen neuen Ordner in Firestore.

```typescript
async function createFolder(
  folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>,
  context: { organizationId: string; userId: string }
): Promise<string>
```

**Parameter:**
- `folder`: Ordner-Daten (ohne Auto-Generated Fields)
- `context.organizationId`: Organization ID (Multi-Tenancy)
- `context.userId`: User ID (für createdBy)

**Return:** Document ID des erstellten Ordners

**Beispiel:**

```typescript
import { createFolder } from '@/lib/firebase/media-folders-service';
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();

// Einfacher Ordner
const folderId = await createFolder(
  {
    userId: user.uid,  // Legacy-Feld (wird zu createdBy)
    name: 'Medien',
    description: 'Hauptordner für Medien'
  },
  {
    organizationId: 'org_123',
    userId: user.uid
  }
);

// Unterordner mit Parent
const subfolderId = await createFolder(
  {
    userId: user.uid,
    name: 'Produktbilder',
    parentFolderId: folderId,
    color: '#3B82F6',
    description: 'Bilder der Produktpalette'
  },
  {
    organizationId: 'org_123',
    userId: user.uid
  }
);

// Ordner mit Client-Zuordnung
const clientFolderId = await createFolder(
  {
    userId: user.uid,
    name: 'Kunde ABC',
    clientId: 'client_456',
    color: '#10B981'
  },
  {
    organizationId: 'org_123',
    userId: user.uid
  }
);
```

**Firestore-Dokument:**

```json
{
  "organizationId": "org_123",
  "createdBy": "user_789",
  "name": "Medien",
  "description": "Hauptordner für Medien",
  "createdAt": { "_seconds": 1697800000, "_nanoseconds": 0 },
  "updatedAt": { "_seconds": 1697800000, "_nanoseconds": 0 }
}
```

**Fehler:**
- `Error`: Bei Firestore-Fehlern

---

#### updateFolder()

Aktualisiert einen bestehenden Ordner.

```typescript
async function updateFolder(
  folderId: string,
  updates: Partial<MediaFolder>
): Promise<void>
```

**Parameter:**
- `folderId`: ID des zu aktualisierenden Ordners
- `updates`: Zu aktualisierende Felder (Partial)

**Erlaubte Update-Felder:**
- `name`
- `description`
- `color`
- `clientId`
- `parentFolderId`

**Beispiel:**

```typescript
import { updateFolder } from '@/lib/firebase/media-folders-service';

// Name ändern
await updateFolder('folder_123', {
  name: 'Neue Medien'
});

// Mehrere Felder aktualisieren
await updateFolder('folder_123', {
  name: 'Produktbilder 2024',
  color: '#EF4444',
  description: 'Aktualisierte Produktbilder Q1/2024'
});

// Ordner verschieben (Parent ändern)
await updateFolder('folder_123', {
  parentFolderId: 'folder_456'
});

// Client-Zuordnung ändern
await updateFolder('folder_123', {
  clientId: 'client_789'
});
```

**Hinweis:** `updatedAt` wird automatisch auf `serverTimestamp()` gesetzt.

**Fehler:**
- `Error`: Bei Firestore-Fehlern oder ungültiger Folder-ID

---

#### deleteFolder()

Löscht einen Ordner (nur wenn leer).

```typescript
async function deleteFolder(folderId: string): Promise<void>
```

**Parameter:**
- `folderId`: ID des zu löschenden Ordners

**Validierung:**
- Ordner darf keine Dateien enthalten → `hasFilesInFolder()`
- Ordner darf keine Unterordner enthalten → `hasSubfolders()`

**Beispiel:**

```typescript
import { deleteFolder, hasFilesInFolder, hasSubfolders } from '@/lib/firebase/media-folders-service';

// Sicheres Löschen mit Validierung
async function deleteFolderSafe(folderId: string) {
  const hasFiles = await hasFilesInFolder(folderId);
  const hasSubs = await hasSubfolders(folderId);

  if (hasFiles || hasSubs) {
    throw new Error('Ordner ist nicht leer');
  }

  await deleteFolder(folderId);
}

// Einfaches Löschen (wirft Error bei nicht-leerem Ordner)
try {
  await deleteFolder('folder_123');
  console.log('Ordner gelöscht');
} catch (error) {
  console.error('Fehler:', error.message);
  // "Ordner kann nicht gelöscht werden: Enthält noch Dateien oder Unterordner"
}
```

**Fehler:**
- `Error`: "Ordner kann nicht gelöscht werden: Enthält noch Dateien oder Unterordner"
- `Error`: Bei Firestore-Fehlern

---

#### moveFolderToParent()

Verschiebt einen Ordner zu einem neuen Parent (mit zirkulärer Referenz-Validierung).

```typescript
async function moveFolderToParent(
  folderId: string,
  newParentId: string | null,
  organizationId: string
): Promise<void>
```

**Parameter:**
- `folderId`: ID des zu verschiebenden Ordners
- `newParentId`: ID des neuen Parent-Ordners (null = Root)
- `organizationId`: Organization ID (für Validierung)

**Validierung:**
- Verhindert Verschieben eines Ordners in sich selbst
- Verhindert zirkuläre Referenzen (A → B → A)

**Beispiel:**

```typescript
import { moveFolderToParent } from '@/lib/firebase/media-folders-service';

// Ordner zur Root verschieben
await moveFolderToParent('folder_123', null, 'org_123');

// Ordner zu neuem Parent verschieben
await moveFolderToParent('folder_123', 'folder_456', 'org_123');

// Mit Error-Handling
try {
  await moveFolderToParent('folder_123', 'folder_789', 'org_123');
} catch (error) {
  // "Ungültiger Ordner-Verschub: Würde zirkuläre Referenz erzeugen"
  console.error(error.message);
}
```

**Fehler:**
- `Error`: "Ungültiger Ordner-Verschub: Würde zirkuläre Referenz erzeugen"

---

### Folder Queries

#### getFolders()

Lädt Ordner für Organization/Parent.

```typescript
async function getFolders(
  organizationId: string,
  parentFolderId?: string
): Promise<MediaFolder[]>
```

**Parameter:**
- `organizationId`: Organization ID (Multi-Tenancy)
- `parentFolderId`: Parent-Ordner-ID (undefined = Root-Ordner)

**Return:** Array von MediaFolder (sortiert nach Name)

**Beispiel:**

```typescript
import { getFolders } from '@/lib/firebase/media-folders-service';

// Root-Ordner laden (alle ohne Parent)
const rootFolders = await getFolders('org_123');
// → [{ name: 'Medien' }, { name: 'Dokumente' }, { name: 'Pressemeldungen' }]

// Unterordner laden
const subfolders = await getFolders('org_123', 'folder_123');
// → [{ name: 'Produktbilder' }, { name: 'Logos' }]

// Mit React Query
import { useQuery } from '@tanstack/react-query';

const { data: folders, isLoading } = useQuery({
  queryKey: ['folders', organizationId, parentFolderId],
  queryFn: () => getFolders(organizationId, parentFolderId),
  staleTime: 5 * 60 * 1000
});
```

**Firestore-Query:**

```typescript
// Root-Ordner (parentFolderId === undefined)
query(
  collection(db, 'media_folders'),
  where('organizationId', '==', organizationId)
)
// → Filter: !folder.parentFolderId

// Unterordner (parentFolderId vorhanden)
query(
  collection(db, 'media_folders'),
  where('organizationId', '==', organizationId),
  where('parentFolderId', '==', parentFolderId)
)
```

**Fehler:**
- `Error`: Bei Firestore-Fehlern

---

#### getFolder()

Lädt einen einzelnen Ordner by ID.

```typescript
async function getFolder(folderId: string): Promise<MediaFolder | null>
```

**Parameter:**
- `folderId`: ID des Ordners

**Return:** MediaFolder oder null (wenn nicht gefunden)

**Beispiel:**

```typescript
import { getFolder } from '@/lib/firebase/media-folders-service';

// Ordner laden
const folder = await getFolder('folder_123');

if (folder) {
  console.log('Ordner:', folder.name);
  console.log('Parent:', folder.parentFolderId);
  console.log('Farbe:', folder.color);
} else {
  console.log('Ordner nicht gefunden');
}

// Mit Error-Handling
try {
  const folder = await getFolder('folder_123');
  if (!folder) {
    throw new Error('Ordner existiert nicht');
  }
  // ... Ordner verwenden
} catch (error) {
  console.error('Fehler beim Laden:', error);
}
```

**Fehler:**
- `Error`: Bei Firestore-Fehlern

---

#### getAllFoldersForOrganization()

Lädt alle Ordner einer Organization (flache Liste).

```typescript
async function getAllFoldersForOrganization(
  organizationId: string
): Promise<MediaFolder[]>
```

**Parameter:**
- `organizationId`: Organization ID

**Return:** Array aller Ordner (unsortiert, flache Liste)

**Beispiel:**

```typescript
import { getAllFoldersForOrganization } from '@/lib/firebase/media-folders-service';

// Alle Ordner laden
const allFolders = await getAllFoldersForOrganization('org_123');
// → [{ id: 'folder_1', name: 'Medien', parentFolderId: undefined },
//     { id: 'folder_2', name: 'Produktbilder', parentFolderId: 'folder_1' },
//     { id: 'folder_3', name: 'Dokumente', parentFolderId: undefined }, ...]

// Hierarchie aufbauen
const buildTree = (folders: MediaFolder[]) => {
  const map = new Map<string, MediaFolder & { children: MediaFolder[] }>();
  const roots: MediaFolder[] = [];

  folders.forEach(folder => {
    map.set(folder.id!, { ...folder, children: [] });
  });

  folders.forEach(folder => {
    if (folder.parentFolderId) {
      const parent = map.get(folder.parentFolderId);
      if (parent) {
        parent.children.push(map.get(folder.id!)!);
      }
    } else {
      roots.push(map.get(folder.id!)!);
    }
  });

  return roots;
};

const tree = buildTree(allFolders);
```

**Fehler:**
- `Error`: Bei Firestore-Fehlern

---

### Folder Utilities

#### hasFilesInFolder()

Prüft ob Ordner Dateien enthält.

```typescript
async function hasFilesInFolder(folderId: string): Promise<boolean>
```

**Beispiel:**

```typescript
const hasFiles = await hasFilesInFolder('folder_123');
if (hasFiles) {
  console.log('Ordner enthält Dateien');
}
```

---

#### hasSubfolders()

Prüft ob Ordner Unterordner hat.

```typescript
async function hasSubfolders(folderId: string): Promise<boolean>
```

**Beispiel:**

```typescript
const hasSubs = await hasSubfolders('folder_123');
if (hasSubs) {
  console.log('Ordner hat Unterordner');
}
```

---

#### getBreadcrumbs()

Generiert Breadcrumb-Navigation für Ordner.

```typescript
async function getBreadcrumbs(
  folderId: string
): Promise<FolderBreadcrumb[]>
```

**Return:** Array von Breadcrumbs (Root → Current)

**Beispiel:**

```typescript
import { getBreadcrumbs } from '@/lib/firebase/media-folders-service';

// Breadcrumbs für tief verschachtelten Ordner
const breadcrumbs = await getBreadcrumbs('folder_789');
// → [
//   { id: 'folder_1', name: 'Medien' },
//   { id: 'folder_2', name: 'Produktbilder' },
//   { id: 'folder_789', name: '2024' }
// ]

// In UI rendern
breadcrumbs.map((crumb, index) => (
  <button key={crumb.id} onClick={() => handleBreadcrumbClick(index)}>
    {crumb.name}
  </button>
));
```

---

#### getFolderFileCount()

Zählt Dateien in Ordner.

```typescript
async function getFolderFileCount(folderId: string): Promise<number>
```

**Beispiel:**

```typescript
const count = await getFolderFileCount('folder_123');
console.log(`Ordner enthält ${count} Dateien`);
```

---

## media-assets-service

**Datei:** `src/lib/firebase/media-assets-service.ts`

### Asset Upload

#### uploadMedia()

Lädt Datei hoch (mit Retry-Logic und Progress-Tracking).

```typescript
async function uploadMedia(
  file: File,
  organizationId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  retryCount?: number,
  context?: { userId: string; clientId?: string }
): Promise<MediaAsset>
```

**Parameter:**
- `file`: JavaScript File-Objekt
- `organizationId`: Organization ID (Multi-Tenancy)
- `folderId`: Ordner-ID (optional)
- `onProgress`: Callback für Progress (0-100)
- `retryCount`: Anzahl Retry-Versuche (default: 3)
- `context.userId`: User ID (für createdBy)
- `context.clientId`: Client ID (optional)

**Return:** Hochgeladenes MediaAsset

**Beispiel:**

```typescript
import { uploadMedia } from '@/lib/firebase/media-assets-service';
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();

// Einfacher Upload
const asset = await uploadMedia(
  file,
  'org_123',
  'folder_456',
  undefined,
  3,
  { userId: user.uid }
);

// Mit Progress-Tracking
const [uploadProgress, setUploadProgress] = useState(0);

const asset = await uploadMedia(
  file,
  'org_123',
  'folder_456',
  (progress) => {
    setUploadProgress(progress);
    console.log(`Upload: ${progress.toFixed(0)}%`);
  },
  3,
  { userId: user.uid, clientId: 'client_789' }
);

// Multi-File Upload
const uploadFiles = async (files: File[]) => {
  const uploadPromises = files.map(file =>
    uploadMedia(file, orgId, folderId, (p) => {
      setProgress(prev => ({ ...prev, [file.name]: p }));
    }, 3, { userId: user.uid })
  );

  const assets = await Promise.all(uploadPromises);
  return assets;
};
```

**Firebase Storage Struktur:**

```
organizations/
  {organizationId}/
    media/
      {timestamp}_{cleanFileName}
```

**Firestore-Dokument:**

```json
{
  "organizationId": "org_123",
  "createdBy": "user_456",
  "clientId": "client_789",
  "fileName": "produkt.jpg",
  "fileType": "image/jpeg",
  "storagePath": "organizations/org_123/media/1697800000_produkt.jpg",
  "downloadUrl": "https://firebasestorage.googleapis.com/...",
  "folderId": "folder_456",
  "metadata": {
    "fileSize": 1024768
  },
  "createdAt": { "_seconds": 1697800000 },
  "updatedAt": { "_seconds": 1697800000 }
}
```

**Retry-Logic:**

Automatischer Retry bei:
- `storage/canceled`
- `storage/unknown`
- Network-Fehlern

**Fehler:**
- `Error`: Bei Upload-Fehlern (nach allen Retries)

---

#### uploadClientMedia()

Convenience-Wrapper für Client-Media Upload.

```typescript
async function uploadClientMedia(
  file: File,
  organizationId: string,
  clientId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  context?: { userId: string; description?: string }
): Promise<MediaAsset>
```

**Beispiel:**

```typescript
import { uploadClientMedia } from '@/lib/firebase/media-assets-service';

// Client-Media hochladen (clientId wird automatisch gesetzt)
const asset = await uploadClientMedia(
  file,
  'org_123',
  'client_456',
  'folder_789',
  (progress) => console.log(`Upload: ${progress}%`),
  { userId: user.uid, description: 'Firmenlogo' }
);
```

---

#### uploadBuffer()

Lädt Buffer hoch (für PDF-Generierung, Server-Side).

```typescript
async function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  folder?: string,
  context?: { userId?: string; clientId?: string }
): Promise<{ downloadUrl: string; filePath: string; fileSize: number }>
```

**Beispiel:**

```typescript
import { uploadBuffer } from '@/lib/firebase/media-assets-service';
import PDFDocument from 'pdfkit';

// PDF generieren und hochladen
const doc = new PDFDocument();
const chunks: Buffer[] = [];

doc.on('data', (chunk) => chunks.push(chunk));
doc.on('end', async () => {
  const pdfBuffer = Buffer.concat(chunks);

  const result = await uploadBuffer(
    pdfBuffer,
    'bericht.pdf',
    'application/pdf',
    'org_123',
    'reports',
    { userId: 'user_456', clientId: 'client_789' }
  );

  console.log('PDF URL:', result.downloadUrl);
  console.log('Dateigröße:', result.fileSize);
});

doc.text('Hallo Welt');
doc.end();
```

---

### Asset Queries

#### getMediaAssets()

Lädt Assets für Organization/Folder.

```typescript
async function getMediaAssets(
  organizationId: string,
  folderId?: string
): Promise<MediaAsset[]>
```

**Parameter:**
- `organizationId`: Organization ID
- `folderId`: Ordner-ID (undefined = Root-Assets)

**Return:** Array von MediaAsset (sortiert nach createdAt DESC)

**Beispiel:**

```typescript
import { getMediaAssets } from '@/lib/firebase/media-assets-service';

// Root-Assets laden
const rootAssets = await getMediaAssets('org_123');

// Assets in Ordner laden
const folderAssets = await getMediaAssets('org_123', 'folder_456');

// Mit React Query
const { data: assets, isLoading } = useQuery({
  queryKey: ['assets', organizationId, folderId],
  queryFn: () => getMediaAssets(organizationId, folderId),
  staleTime: 5 * 60 * 1000
});

// Assets filtern
const images = assets?.filter(a => a.fileType?.startsWith('image/'));
const documents = assets?.filter(a => a.fileType === 'celero-doc');
```

**Firestore-Query:**

```typescript
// Root-Assets
query(
  collection(db, 'media_assets'),
  where('organizationId', '==', organizationId)
)
// → Filter: !asset.folderId

// Ordner-Assets
query(
  collection(db, 'media_assets'),
  where('organizationId', '==', organizationId),
  where('folderId', '==', folderId)
)
```

---

#### getMediaAssetById()

Lädt einzelnes Asset by ID.

```typescript
async function getMediaAssetById(
  assetId: string
): Promise<MediaAsset | null>
```

**Beispiel:**

```typescript
const asset = await getMediaAssetById('asset_123');

if (asset) {
  console.log('Datei:', asset.fileName);
  console.log('Größe:', asset.metadata?.fileSize);
  console.log('URL:', asset.downloadUrl);
}
```

---

#### getMediaAssetsInFolder()

Lädt alle Assets in Ordner (ohne Root-Filter).

```typescript
async function getMediaAssetsInFolder(
  folderId: string
): Promise<MediaAsset[]>
```

**Beispiel:**

```typescript
const assets = await getMediaAssetsInFolder('folder_123');
console.log(`${assets.length} Assets gefunden`);
```

---

#### getMediaByClientId()

Lädt alle Assets für Client (mit Deduplizierung und Validierung).

```typescript
async function getMediaByClientId(
  organizationId: string,
  clientId: string,
  cleanupInvalid?: boolean,
  legacyUserId?: string
): Promise<{folders: any[], assets: MediaAsset[], totalCount: number}>
```

**Beispiel:**

```typescript
import { getMediaByClientId } from '@/lib/firebase/media-assets-service';

// Client-Media laden
const result = await getMediaByClientId('org_123', 'client_456');

console.log('Assets:', result.assets.length);
console.log('Total:', result.totalCount);

// Mit Legacy-Fallback
const result = await getMediaByClientId(
  'org_123',
  'client_456',
  false,
  'legacy_user_789'
);
```

---

### Asset Operations

#### updateAsset()

Aktualisiert Asset-Metadaten.

```typescript
async function updateAsset(
  assetId: string,
  updates: Partial<MediaAsset>
): Promise<void>
```

**Erlaubte Update-Felder:**
- `fileName`
- `description`
- `tags`
- `folderId`
- `clientId`

**Beispiel:**

```typescript
import { updateAsset } from '@/lib/firebase/media-assets-service';

// Dateinamen ändern
await updateAsset('asset_123', {
  fileName: 'neuer-name.jpg'
});

// Mehrere Felder
await updateAsset('asset_123', {
  description: 'Produktbild 2024',
  tags: ['produkt', 'hero', '2024']
});

// Ordner-Zuordnung ändern
await updateAsset('asset_123', {
  folderId: 'folder_456'
});
```

---

#### moveAssetToFolder()

Verschiebt Asset zu neuem Ordner (mit automatischer Client-Vererbung).

```typescript
async function moveAssetToFolder(
  assetId: string,
  newFolderId?: string,
  organizationId?: string
): Promise<void>
```

**Features:**
- ✅ Automatische Client-Vererbung vom Ziel-Ordner
- ✅ Unterstützt Root-Verschiebung (newFolderId = undefined)

**Beispiel:**

```typescript
import { moveAssetToFolder } from '@/lib/firebase/media-assets-service';

// Asset zu Ordner verschieben (mit Client-Vererbung)
await moveAssetToFolder('asset_123', 'folder_456', 'org_123');

// Asset zur Root verschieben
await moveAssetToFolder('asset_123', undefined, 'org_123');

// In React-Komponente
const handleMoveAsset = async (assetId: string, targetFolderId: string) => {
  try {
    await moveAssetToFolder(assetId, targetFolderId, organizationId);
    toast.success('Datei verschoben');
    refetch(); // React Query Refetch
  } catch (error) {
    toast.error('Fehler beim Verschieben');
  }
};
```

**Client-Vererbung:**

```typescript
// Ziel-Ordner hat clientId = 'client_456'
await moveAssetToFolder('asset_123', 'folder_789', 'org_123');
// → Asset erhält automatisch clientId = 'client_456'
```

---

#### deleteMediaAsset()

Löscht Asset aus Firestore und Storage.

```typescript
async function deleteMediaAsset(asset: MediaAsset): Promise<void>
```

**Parameter:**
- `asset`: Vollständiges MediaAsset-Objekt (benötigt storagePath)

**Beispiel:**

```typescript
import { deleteMediaAsset, getMediaAssetById } from '@/lib/firebase/media-assets-service';

// Asset laden und löschen
const asset = await getMediaAssetById('asset_123');
if (asset) {
  await deleteMediaAsset(asset);
  console.log('Asset gelöscht');
}

// Mit Bestätigung
const handleDelete = async (assetId: string, fileName: string) => {
  const confirmed = window.confirm(`"${fileName}" wirklich löschen?`);
  if (!confirmed) return;

  const asset = await getMediaAssetById(assetId);
  if (!asset) {
    throw new Error('Asset nicht gefunden');
  }

  await deleteMediaAsset(asset);
};
```

**Fehler:**
- `Error`: Bei Storage-Fehlern (Datei nicht gefunden)
- `Error`: Bei Firestore-Fehlern

---

### Spezial-Funktionen

#### removeInvalidAsset()

Entfernt invalide Assets (für Cleanup).

```typescript
async function removeInvalidAsset(
  assetId: string,
  reason?: string
): Promise<void>
```

**Beispiel:**

```typescript
import { removeInvalidAsset } from '@/lib/firebase/media-assets-service';

// Invalides Asset entfernen
await removeInvalidAsset('asset_123', 'Broken download URL');
```

---

#### quickCleanupAsset()

Quick-Cleanup für einzelnes Asset.

```typescript
async function quickCleanupAsset(assetId: string): Promise<boolean>
```

**Return:** `true` bei Erfolg, `false` bei Fehler

**Beispiel:**

```typescript
const success = await quickCleanupAsset('asset_123');
if (success) {
  console.log('Asset bereinigt');
}
```

---

## Multi-Tenancy

Alle Services sind **organization-scoped**.

### Wichtige Regeln

1. **IMMER organizationId verwenden**

```typescript
// ✅ Gut
const folders = await getFolders(organizationId);
const assets = await getMediaAssets(organizationId, folderId);

// ❌ Schlecht - Legacy userId
const folders = await getFolders(userId);
```

2. **Context-Object bei Mutations**

```typescript
// ✅ Gut - organizationId im Context
await createFolder(
  { userId, name: 'Medien' },
  { organizationId, userId }
);

// ✅ Gut - Upload mit Context
await uploadMedia(file, organizationId, folderId, onProgress, 3, {
  userId,
  clientId
});
```

3. **Firestore-Queries sind automatisch gefiltert**

```typescript
// Alle Queries verwenden where('organizationId', '==', organizationId)
const q = query(
  collection(db, 'media_folders'),
  where('organizationId', '==', organizationId)
);
```

---

## Error-Handling

### Standard-Fehler

Alle Funktionen werfen `Error` bei Fehlern:

```typescript
try {
  await deleteFolder('folder_123');
} catch (error) {
  console.error('Fehler:', error.message);
  // "Ordner kann nicht gelöscht werden: Enthält noch Dateien oder Unterordner"
}
```

### Error-Types

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Ordner kann nicht gelöscht werden: ...` | Ordner nicht leer | Dateien/Unterordner entfernen |
| `Ungültiger Ordner-Verschub: ...` | Zirkuläre Referenz | Anderen Ziel-Ordner wählen |
| `Asset nicht gefunden` | Ungültige Asset-ID | ID prüfen |
| `storage/canceled` | Upload abgebrochen | Retry-Logic nutzen |
| `storage/unknown` | Storage-Fehler | Retry-Logic nutzen |

---

## Best Practices

### 1. React Query Integration

```typescript
// ✅ Gut: Query mit staleTime
const { data: folders } = useQuery({
  queryKey: ['folders', organizationId, parentFolderId],
  queryFn: () => getFolders(organizationId, parentFolderId),
  staleTime: 5 * 60 * 1000
});

// ✅ Gut: Mutation mit Invalidation
const mutation = useMutation({
  mutationFn: (data) => createFolder(data.folder, data.context),
  onSuccess: () => {
    queryClient.invalidateQueries(['folders', organizationId]);
  }
});
```

### 2. Progress-Tracking

```typescript
// ✅ Gut: State für jeden Upload
const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

const uploadFiles = async (files: File[]) => {
  const promises = files.map(file =>
    uploadMedia(file, orgId, folderId, (progress) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
    }, 3, { userId })
  );

  await Promise.all(promises);
};
```

### 3. Error-Handling mit Toasts

```typescript
// ✅ Gut: Benutzerfreundliche Fehler
const handleDeleteFolder = async (folderId: string) => {
  try {
    await deleteFolder(folderId);
    toast.success('Ordner gelöscht');
    refetch();
  } catch (error) {
    if (error.message.includes('nicht leer')) {
      toast.error('Ordner ist nicht leer');
    } else {
      toast.error('Fehler beim Löschen');
    }
  }
};
```

### 4. Validierung vor Mutations

```typescript
// ✅ Gut: Vorher validieren
const handleDeleteFolder = async (folderId: string) => {
  const hasFiles = await hasFilesInFolder(folderId);
  const hasSubs = await hasSubfolders(folderId);

  if (hasFiles || hasSubs) {
    toast.error('Ordner ist nicht leer');
    return;
  }

  await deleteFolder(folderId);
};
```

### 5. Cleanup bei Unmount

```typescript
// ✅ Gut: Upload-Tasks abbrechen
useEffect(() => {
  let uploadTask: any;

  const upload = async () => {
    // uploadTask = uploadBytesResumable(...);
  };

  upload();

  return () => {
    if (uploadTask) {
      uploadTask.cancel();
    }
  };
}, []);
```

---

## Weitere Dokumentation

- [Hauptdokumentation](../README.md)
- [API-Übersicht](./README.md)
- [Komponenten-Dokumentation](../components/README.md)
- [Architecture Decision Records](../adr/README.md)

---

**Letzte Aktualisierung:** 2025-10-19
**Version:** 2.0.0
