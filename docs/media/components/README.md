# Media Komponenten-Dokumentation

Dokumentation für alle UI-Komponenten im Media-Modul.

---

## Shared Components

### MediaCard

Asset-Card mit Thumbnail, Actions und Selection.

**Props:**
```typescript
interface MediaCardProps {
  asset: MediaAsset;
  isSelected: boolean;
  onSelect: (assetId: string) => void;
  onDelete: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDetails: (asset: MediaAsset) => void;
  onDragStart?: (asset: MediaAsset) => void;
  onDragEnd?: () => void;
}
```

**Verwendung:**
```typescript
<MediaCard
  asset={asset}
  isSelected={selectedIds.includes(asset.id)}
  onSelect={handleSelect}
  onDelete={handleDelete}
  onShare={handleShare}
  onDetails={handleDetails}
/>
```

**Features:**
- Thumbnail-Preview für Bilder
- File-Icon für andere Dateitypen
- Checkbox für Multi-Selection
- Quick-Actions (Download, Share, Delete)
- Drag & Drop Support
- Optimized mit React.memo

---

### FolderCard

Folder-Card mit Drag & Drop und Asset-Count.

**Props:**
```typescript
interface FolderCardProps {
  folder: MediaFolder;
  onClick: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string) => void;
  onDragOver?: (e: React.DragEvent, folderId: string) => void;
  onDrop?: (e: React.DragEvent, folder: MediaFolder) => void;
  onDragStart?: (folder: MediaFolder) => void;
  onDragEnd?: () => void;
  assetsCount?: number;
}
```

**Verwendung:**
```typescript
<FolderCard
  folder={folder}
  onClick={handleFolderClick}
  onDelete={handleFolderDelete}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  assetsCount={12}
/>
```

**Features:**
- Folder-Icon
- Asset-Count Badge
- Drag & Drop Support (verschachteln)
- Quick-Actions (Rename, Delete)
- Client-Badge (wenn clientId vorhanden)

---

### MediaToolbar

Toolbar mit Search, View-Toggle und Bulk-Actions.

**Props:**
```typescript
interface MediaToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  selectedAssetsCount: number;
  foldersCount: number;
  assetsCount: number;
  onCreateFolder: () => void;
  onUpload: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  disabled?: boolean;
}
```

**Verwendung:**
```typescript
<MediaToolbar
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  viewMode={viewMode}
  setViewMode={setViewMode}
  selectedAssetsCount={selectedIds.length}
  foldersCount={folders.length}
  assetsCount={assets.length}
  onCreateFolder={handleCreateFolder}
  onUpload={handleUpload}
  onSelectAll={handleSelectAll}
  onClearSelection={handleClearSelection}
  onBulkDelete={handleBulkDelete}
/>
```

**Features:**
- Search-Input mit Debouncing (300ms)
- View-Toggle (Grid/List)
- Bulk-Actions (bei Selection)
- Create Folder Button
- Upload Button
- Results Info (X Ordner, Y Dateien)

---

### Alert

Wiederverwendbare Alert-Komponente.

**Props:**
```typescript
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
}
```

**Verwendung:**
```typescript
<Alert
  type="success"
  title="Erfolgreich"
  message="Datei wurde hochgeladen"
  onClose={() => setShowAlert(false)}
/>
```

---

### ConfirmDialog

Bestätigungsdialog für kritische Aktionen.

**Props:**
```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}
```

**Verwendung:**
```typescript
<ConfirmDialog
  open={showDialog}
  title="Datei löschen?"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  confirmText="Löschen"
  cancelText="Abbrechen"
  onConfirm={handleConfirmDelete}
  onCancel={() => setShowDialog(false)}
  variant="danger"
/>
```

---

### EmptyState

Empty-State für leere Listen.

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ComponentType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

**Verwendung:**
```typescript
<EmptyState
  icon={PhotoIcon}
  title="Keine Medien"
  message="Laden Sie Ihre ersten Dateien hoch"
  actionLabel="Dateien hochladen"
  onAction={handleUpload}
/>
```

---

## Section Components

### MediaGridView

Grid-Ansicht für Assets und Folders.

**Props:**
```typescript
interface MediaGridViewProps {
  folders: MediaFolder[];
  assets: MediaAsset[];
  selectedIds: string[];
  onSelectAsset: (assetId: string) => void;
  onDeleteAsset: (asset: MediaAsset) => void;
  onShareAsset: (asset: MediaAsset) => void;
  onFolderClick: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  // Drag & Drop
  handleAssetDragStart: (asset: MediaAsset) => void;
  handleAssetDragEnd: () => void;
  handleFolderDragOver: (e: React.DragEvent, folderId: string) => void;
  handleFolderDragLeave: () => void;
  handleFolderDrop: (e: React.DragEvent, folder: MediaFolder) => void;
  handleFolderMove: (folderId: string, targetFolderId: string) => Promise<void>;
  handleFolderDragStart: (folder: MediaFolder) => void;
  handleFolderDragEnd: () => void;
  handleRootDrop: (e: React.DragEvent) => void;
}
```

**Features:**
- Responsive Grid (1-5 Spalten)
- Drag & Drop Support
- Optimized mit React.memo

---

### MediaListView

List-Ansicht für Assets (tabellarisch).

**Props:** Ähnlich wie MediaGridView

**Features:**
- Tabellen-Layout
- Sortier-Optionen
- Kompakte Darstellung

---

### MediaBreadcrumbs

Breadcrumb-Navigation für Folder-Hierarchie.

**Props:**
```typescript
interface MediaBreadcrumbsProps {
  breadcrumbs: FolderBreadcrumb[];
  onNavigate: (folderId: string | null) => void;
}
```

**Verwendung:**
```typescript
<MediaBreadcrumbs
  breadcrumbs={[
    { id: null, name: 'Root' },
    { id: 'folder-1', name: 'Marketing' },
    { id: 'folder-2', name: 'Kampagnen' },
  ]}
  onNavigate={handleNavigate}
/>
```

---

## Modal Components

### UploadModal

Upload-Dialog mit Drag & Drop und Progress.

**Props:**
```typescript
interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  currentFolderId?: string;
  folderName?: string;
  preselectedClientId?: string;
  organizationId: string;
  userId: string;
}
```

**Verwendung:**
```typescript
<UploadModal
  onClose={() => setShowUpload(false)}
  onUploadSuccess={async () => {
    // React Query refresht automatisch
  }}
  currentFolderId={currentFolderId}
  folderName={folderName}
  organizationId={organizationId}
  userId={userId}
/>
```

**Features:**
- Drag & Drop Zone
- Multi-File Selection
- Client-Zuordnung
- Upload-Progress pro Datei
- Batch-Upload (5 parallel)
- Retry-Logic (3 Versuche)
- Upload-Summary

---

### ShareModal

Dialog zum Erstellen von Share-Links.

**Sections:**
1. `BasicInfoSection` - Titel, Beschreibung, Kategorie
2. `SettingsSection` - Download-Erlaubnis, Passwort-Schutz
3. `BrandingSection` - Logo, Colors, Footer (optional)
4. `PreviewSection` - Live-Vorschau
5. `SuccessSection` - Share-Link anzeigen + kopieren

**Props:**
```typescript
interface ShareModalProps {
  target: MediaAsset | MediaFolder;
  type: 'file' | 'folder' | 'campaign';
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  userId: string;
}
```

**Verwendung:**
```typescript
<ShareModal
  target={asset}
  type="file"
  onClose={() => setShowShare(false)}
  onSuccess={() => {
    // React Query refresht automatisch
  }}
  organizationId={organizationId}
  userId={userId}
/>
```

**Features:**
- Schritt-für-Schritt Wizard
- Password-Protection
- Expiration Date
- Watermark-Option
- Branding-Anpassung
- Live-Vorschau
- Copy-to-Clipboard

---

### AssetDetailsModal

Detail-Ansicht und Bearbeitung für Assets.

**Props:**
```typescript
interface AssetDetailsModalProps {
  asset: MediaAsset;
  onClose: () => void;
  onSave: (updates: Partial<MediaAsset>) => Promise<void>;
  onDelete: () => Promise<void>;
}
```

**Features:**
- Full-Size Preview
- Metadata-Anzeige
- Inline-Editing
- Client-Zuordnung
- Tags-Management
- Download-Button
- Delete-Button

---

### FolderModal

Dialog zum Erstellen/Bearbeiten von Folders.

**Props:**
```typescript
interface FolderModalProps {
  folder?: MediaFolder; // undefined = create mode
  onClose: () => void;
  onSave: (folderData: FolderFormData) => Promise<void>;
  organizationId: string;
  userId: string;
  parentFolderId?: string;
}
```

**Verwendung:**
```typescript
// Create Mode
<FolderModal
  onClose={() => setShowFolderDialog(false)}
  onSave={handleCreateFolder}
  organizationId={organizationId}
  userId={userId}
  parentFolderId={currentFolderId}
/>

// Edit Mode
<FolderModal
  folder={folder}
  onClose={() => setShowFolderDialog(false)}
  onSave={handleUpdateFolder}
  organizationId={organizationId}
  userId={userId}
/>
```

**Features:**
- Folder-Name
- Client-Zuordnung
- Description (optional)
- Parent-Folder-Auswahl

---

## Best Practices

### 1. React.memo für Performance

Alle Grid-Komponenten sollten mit React.memo optimiert werden:

```typescript
export default React.memo(function MediaCard({ asset, isSelected }: Props) {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.asset.id === nextProps.asset.id &&
         prevProps.isSelected === nextProps.isSelected;
});
```

### 2. useCallback für Handler

Alle Handler sollten mit useCallback gecached werden:

```typescript
const handleSelect = useCallback((assetId: string) => {
  setSelectedIds(prev =>
    prev.includes(assetId)
      ? prev.filter(id => id !== assetId)
      : [...prev, assetId]
  );
}, []);
```

### 3. Debouncing für Search

Search-Input sollte debounced werden (300ms):

```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

// Filter verwenden debouncedSearchTerm
const filteredAssets = useMemo(() => {
  if (!debouncedSearchTerm) return assets;
  return assets.filter(asset =>
    asset.fileName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );
}, [assets, debouncedSearchTerm]);
```

### 4. Loading-States

Alle Komponenten sollten Loading-States haben:

```typescript
if (loading) {
  return <div className="animate-pulse">Loading...</div>;
}
```

### 5. Error-Boundaries

Kritische Komponenten sollten Error-Boundaries haben:

```typescript
<ErrorBoundary fallback={<ErrorState />}>
  <MediaGridView {...props} />
</ErrorBoundary>
```

---

## Styling-Guidelines

### Tailwind Classes

Konsistente Tailwind-Klassen verwenden:

```typescript
// Cards
className="bg-white rounded-lg border border-gray-200 p-4"

// Hover
className="hover:bg-gray-50 transition-colors"

// Focus
className="focus:outline-none focus:ring-2 focus:ring-primary"

// Selected
className={`border-2 ${isSelected ? 'border-primary' : 'border-transparent'}`}
```

### Responsive Design

Grid-Layout sollte responsive sein:

```typescript
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
```

---

## Testing

Alle Komponenten sollten Tests haben:

```typescript
// MediaCard.test.tsx
describe('MediaCard', () => {
  it('sollte Thumbnail rendern', () => {
    render(<MediaCard asset={mockAsset} {...} />);
    expect(screen.getByAltText(mockAsset.fileName)).toBeInTheDocument();
  });

  it('sollte Selection funktionieren', () => {
    const onSelect = jest.fn();
    render(<MediaCard asset={mockAsset} onSelect={onSelect} {...} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(mockAsset.id);
  });
});
```

---

## Siehe auch

- **[Hauptdokumentation](../README.md)** - Übersicht
- **[API-Dokumentation](../api/README.md)** - Service-APIs
- **[Guides](../guides/)** - Praktische Anleitungen

---

**Letztes Update:** 2025-10-16
**Version:** 2.0
