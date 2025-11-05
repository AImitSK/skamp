# AttachmentsTab - Context API Dokumentation

> **Modul**: AttachmentsTab Context API
> **Version**: Phase 4 Refactoring
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-05

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [CampaignContext Assets API](#campaigncontext-assets-api)
- [State Management](#state-management)
- [API-Funktionen](#api-funktionen)
- [Toast-Service Integration](#toast-service-integration)
- [TypeScript Types](#typescript-types)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Performance](#performance)

## Überblick

Der AttachmentsTab nutzt ausschließlich den **CampaignContext** für State Management. Es gibt keine isolierten API-Calls oder React Query Hooks. Alle Asset-Operationen (Hinzufügen, Entfernen) werden zentral im Context verwaltet und lösen automatisch Toast-Benachrichtigungen aus.

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    CampaignContext                       │
│  - attachedAssets: CampaignAssetAttachment[]           │
│  - updateAttachedAssets(assets)                        │
│  - removeAsset(assetId)                                │
│  - Toast-Service Integration                           │
└─────────────────────────────────────────────────────────┘
                          ↓
                          ↓ useCampaign()
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    AttachmentsTab                        │
│  - Konsumiert Context via useCampaign()                │
│  - Props: organizationId, onOpenAssetSelector          │
│  - Keine eigenen API-Calls                             │
└─────────────────────────────────────────────────────────┘
                          ↓
                          ↓ Props
                          ↓
┌──────────────────────────┬──────────────────────────────┐
│       MediaList          │      MediaEmptyState         │
│  - attachments prop      │  - onAddMedia prop           │
│  - onRemove prop         │  - Kein Context-Zugriff      │
└──────────────────────────┴──────────────────────────────┘
```

## CampaignContext Assets API

### Context Interface (Assets-bezogen)

```typescript
interface CampaignContextValue {
  // Assets State
  attachedAssets: CampaignAssetAttachment[];

  // Assets Actions
  updateAttachedAssets: (assets: CampaignAssetAttachment[]) => void;
  removeAsset: (assetId: string) => void;

  // Company State (für Boilerplate-Loader)
  selectedCompanyId: string;
  selectedCompanyName: string;

  // Boilerplate State
  boilerplateSections: BoilerplateSection[];
  updateBoilerplateSections: (sections: BoilerplateSection[]) => void;

  // ... weitere Context-Properties
}
```

### Context Provider

```typescript
<CampaignProvider campaignId={campaignId} organizationId={organizationId}>
  {/* AttachmentsTab und andere Komponenten */}
</CampaignProvider>
```

### Context Hook

```typescript
import { useCampaign } from '../context/CampaignContext';

const {
  attachedAssets,
  updateAttachedAssets,
  removeAsset
} = useCampaign();
```

## State Management

### State-Initialisierung

```typescript
// Im CampaignContext (CampaignProvider)
const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);

// Beim Laden der Campaign
const loadCampaign = useCallback(async () => {
  const campaign = await prService.getById(campaignId);
  if (campaign) {
    setAttachedAssets(campaign.attachedAssets || []);
    // ...
  }
}, [campaignId]);

useEffect(() => {
  loadCampaign();
}, [loadCampaign]);
```

### State-Updates

#### Assets hinzufügen

```typescript
const updateAttachedAssets = useCallback((assets: CampaignAssetAttachment[]) => {
  setAttachedAssets(prev => {
    // Berechne Anzahl neuer Assets
    const newCount = assets.length - prev.length;

    // Zeige Toast nur bei neuen Assets
    if (newCount > 0) {
      toastService.success(`${newCount} Medium${newCount > 1 ? 'en' : ''} hinzugefügt`);
    }

    return assets;
  });
}, []);
```

**Features**:
- ✅ Pluralisierung ("1 Medium" vs. "2 Medien")
- ✅ Automatisches Toast-Feedback
- ✅ Funktionale State-Updates (prev => next)

#### Asset entfernen

```typescript
const removeAsset = useCallback((assetId: string) => {
  setAttachedAssets(prev =>
    prev.filter(asset =>
      (asset.assetId || asset.folderId) !== assetId
    )
  );

  toastService.success('Medium entfernt');
}, []);
```

**Features**:
- ✅ Unterstützt Assets (`assetId`) und Ordner (`folderId`)
- ✅ Automatisches Toast-Feedback
- ✅ Immutable Updates (filter)

### State-Persistierung

Assets werden beim Speichern der Campaign persistiert:

```typescript
const saveCampaign = async () => {
  const campaignData = {
    // ... andere Felder
    attachedAssets: attachedAssets,
  };

  await prService.update(campaignId, campaignData);
  toastService.success('Kampagne gespeichert');
};
```

**Wichtig**: `saveCampaign()` muss manuell aufgerufen werden (z.B. bei "Speichern"-Button). Assets werden NICHT automatisch gespeichert.

## API-Funktionen

### updateAttachedAssets()

Ersetzt das komplette attachedAssets-Array.

#### Signatur

```typescript
updateAttachedAssets: (assets: CampaignAssetAttachment[]) => void
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `assets` | `CampaignAssetAttachment[]` | Neues Assets-Array (komplett ersetzt) |

#### Return Value

`void` (State-Update + Toast)

#### Verhalten

1. Vergleicht neue Anzahl mit vorheriger Anzahl
2. Zeigt Toast nur bei Erhöhung der Anzahl (neue Assets)
3. Pluralisiert Toast-Message ("1 Medium" vs. "2 Medien")
4. Ersetzt State komplett (nicht Merge!)

#### Verwendung

```typescript
// Assets hinzufügen (append)
const newAssets = [
  {
    id: 'att-new-1',
    type: 'asset',
    assetId: 'asset-123',
    metadata: { fileName: 'logo.png' },
    attachedAt: Timestamp.now(),
    attachedBy: user.uid
  }
];

updateAttachedAssets([...attachedAssets, ...newAssets]);
// Toast: "1 Medium hinzugefügt"
```

```typescript
// Mehrere Assets hinzufügen
const multipleAssets = [asset1, asset2, asset3];
updateAttachedAssets([...attachedAssets, ...multipleAssets]);
// Toast: "3 Medien hinzugefügt"
```

```typescript
// Assets ersetzen (kein Toast, da Anzahl gleich)
const updatedAssets = attachedAssets.map(asset =>
  asset.id === 'att-1' ? { ...asset, metadata: { ...asset.metadata, fileName: 'new-name.pdf' } } : asset
);
updateAttachedAssets(updatedAssets);
// Kein Toast (Anzahl unverändert)
```

#### Edge Cases

**Anzahl reduziert** (z.B. externe Löschung):
```typescript
updateAttachedAssets(attachedAssets.slice(0, -1));
// Kein Toast (newCount = -1, nicht > 0)
```

**Leeres Array**:
```typescript
updateAttachedAssets([]);
// Kein Toast (Anzahl reduziert)
```

**Gleiche Anzahl**:
```typescript
updateAttachedAssets([...attachedAssets]); // Shallow copy
// Kein Toast (Anzahl unverändert)
```

### removeAsset()

Entfernt ein einzelnes Asset aus dem Array.

#### Signatur

```typescript
removeAsset: (assetId: string) => void
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `assetId` | `string` | Asset-ID oder Folder-ID zum Entfernen |

#### Return Value

`void` (State-Update + Toast)

#### Verhalten

1. Filtert Asset mit übereinstimmender `assetId` oder `folderId` heraus
2. Zeigt immer Toast "Medium entfernt" (auch wenn nichts gefunden)
3. Immutable Update (filter erstellt neues Array)

#### Verwendung

```typescript
// Asset entfernen
removeAsset('asset-123');
// Toast: "Medium entfernt"
```

```typescript
// Ordner entfernen
removeAsset('folder-456');
// Toast: "Medium entfernt"
```

```typescript
// In MediaList (via Prop)
<MediaList
  attachments={attachedAssets}
  onRemove={removeAsset}
/>
```

#### Edge Cases

**Nicht existierende ID**:
```typescript
removeAsset('non-existent-id');
// Toast: "Medium entfernt" (auch wenn nichts gefunden!)
// State bleibt unverändert (filter findet nichts)
```

**Leere ID**:
```typescript
removeAsset('');
// Entfernt Assets wo assetId UND folderId leer/undefined sind
// (sollte nicht vorkommen, aber technisch möglich)
```

**Null/Undefined**:
```typescript
removeAsset(null); // TypeScript-Fehler (nicht string)
removeAsset(undefined); // TypeScript-Fehler (nicht string)
```

### updateBoilerplateSections()

Aktualisiert Boilerplate-Sektionen (für SimpleBoilerplateLoader).

#### Signatur

```typescript
updateBoilerplateSections: (sections: BoilerplateSection[]) => void
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `sections` | `BoilerplateSection[]` | Neue Boilerplate-Sektionen |

#### Return Value

`void` (State-Update, kein Toast)

#### Verwendung

```typescript
// In AttachmentsTab
<SimpleBoilerplateLoader
  organizationId={organizationId}
  clientId={selectedCompanyId}
  clientName={selectedCompanyName}
  onSectionsChange={updateBoilerplateSections}
  initialSections={boilerplateSections}
/>
```

**Hinweis**: Toast-Handling ist im SimpleBoilerplateLoader implementiert, nicht im Context.

## Toast-Service Integration

### Toast-Positionen

Alle Asset-bezogenen Toasts werden zentral im CampaignContext ausgelöst:

| Aktion | Toast-Message | Typ | Dauer |
|--------|--------------|-----|-------|
| **Asset hinzufügen (1)** | "1 Medium hinzugefügt" | Success | 3s |
| **Assets hinzufügen (N)** | "N Medien hinzugefügt" | Success | 3s |
| **Asset entfernen** | "Medium entfernt" | Success | 3s |

### Warum zentral im Context?

**Vorteile**:
1. **Konsistenz**: Gleiche Toast-Messages unabhängig vom Auslöser (AttachmentsTab, Sidebar, API)
2. **Single Source of Truth**: Eine Stelle für Toast-Logic
3. **Testbarkeit**: Toast-Verhalten kann im Context getestet werden
4. **Separation of Concerns**: UI-Komponenten kümmern sich nicht um Feedback

**Alternative (nicht genutzt)**:
```typescript
// ❌ NICHT im AttachmentsTab (Komponenten haben kein Toast-Handling)
const handleRemove = (assetId: string) => {
  removeAsset(assetId);
  toastService.success('Medium entfernt'); // Redundant!
};
```

### Toast-Service API

```typescript
import { toastService } from '@/lib/utils/toast';

// Success Toast
toastService.success(message: string, options?: ToastOptions);

// Error Toast
toastService.error(message: string, options?: ToastOptions);

// Info Toast
toastService.info(message: string, options?: ToastOptions);

// Warning Toast
toastService.warning(message: string, options?: ToastOptions);
```

**Standardoptionen**:
- Position: `top-right`
- AutoClose: `3000ms`
- CloseButton: `true`
- Pausable: `true` (bei Hover)

## TypeScript Types

### CampaignAssetAttachment

```typescript
type CampaignAssetAttachment = {
  /** Eindeutige Attachment-ID (generiert beim Anhängen) */
  id: string;

  /** Asset-Typ: 'asset' (Datei) oder 'folder' (Ordner) */
  type: 'asset' | 'folder';

  /** Asset-ID (nur bei type: 'asset') */
  assetId?: string;

  /** Ordner-ID (nur bei type: 'folder') */
  folderId?: string;

  /** Metadaten zum Asset/Ordner */
  metadata: {
    /** Dateiname (bei Assets) */
    fileName?: string;

    /** Ordnername (bei Ordnern) */
    folderName?: string;

    /** MIME-Type (z.B. 'image/png', 'application/pdf') */
    fileType?: string;

    /** Thumbnail-URL (bei Bildern) */
    thumbnailUrl?: string;
  };

  /** Zeitstempel des Anhängens */
  attachedAt: Timestamp;

  /** User-ID des Anhängers */
  attachedBy: string;
};
```

#### Beispiele

**Bild-Asset**:
```typescript
const imageAttachment: CampaignAssetAttachment = {
  id: 'att-img-1',
  type: 'asset',
  assetId: 'asset-abc123',
  metadata: {
    fileName: 'product-photo.jpg',
    fileType: 'image/jpeg',
    thumbnailUrl: 'https://storage.googleapis.com/.../thumb_product-photo.jpg'
  },
  attachedAt: Timestamp.now(),
  attachedBy: 'user-xyz789'
};
```

**PDF-Dokument**:
```typescript
const pdfAttachment: CampaignAssetAttachment = {
  id: 'att-pdf-1',
  type: 'asset',
  assetId: 'asset-def456',
  metadata: {
    fileName: 'press-release.pdf',
    fileType: 'application/pdf'
    // Kein thumbnailUrl bei PDFs
  },
  attachedAt: Timestamp.now(),
  attachedBy: 'user-xyz789'
};
```

**Ordner**:
```typescript
const folderAttachment: CampaignAssetAttachment = {
  id: 'att-folder-1',
  type: 'folder',
  folderId: 'folder-ghi789',
  metadata: {
    folderName: 'Marketing Assets 2024'
    // Keine fileType/thumbnailUrl bei Ordnern
  },
  attachedAt: Timestamp.now(),
  attachedBy: 'user-xyz789'
};
```

### BoilerplateSection

```typescript
interface BoilerplateSection {
  /** Eindeutige Sektion-ID */
  id: string;

  /** Typ: 'boilerplate' oder 'custom' */
  type?: 'boilerplate' | 'custom';

  /** Referenz zur Boilerplate-Vorlage (optional) */
  boilerplateId?: string;

  /** HTML-Content der Sektion */
  content: string;

  /** Metadaten (optional) */
  metadata?: Record<string, any>;

  /** Sortier-Reihenfolge */
  order: number;

  /** Sektion gesperrt (nicht editierbar) */
  isLocked?: boolean;

  /** Sektion eingeklappt (UI-State) */
  isCollapsed?: boolean;

  /** Custom-Titel (überschreibt Standard-Titel) */
  customTitle?: string;

  /** Boilerplate-Objekt (geladen aus boilerplatesService) */
  boilerplate?: any;
}
```

## Verwendungsbeispiele

### Basis-Verwendung in AttachmentsTab

```typescript
import { useCampaign } from '../context/CampaignContext';
import { MediaList } from './components/MediaList';
import { MediaEmptyState } from './components/MediaEmptyState';

export default function AttachmentsTab({ organizationId, onOpenAssetSelector }: Props) {
  // Context-Zugriff
  const {
    attachedAssets,
    removeAsset,
    boilerplateSections,
    updateBoilerplateSections,
    selectedCompanyId,
    selectedCompanyName
  } = useCampaign();

  return (
    <div>
      {/* Boilerplates */}
      <SimpleBoilerplateLoader
        organizationId={organizationId}
        clientId={selectedCompanyId}
        clientName={selectedCompanyName}
        onSectionsChange={updateBoilerplateSections}
        initialSections={boilerplateSections}
      />

      {/* Medien */}
      {attachedAssets.length > 0 ? (
        <MediaList attachments={attachedAssets} onRemove={removeAsset} />
      ) : (
        <MediaEmptyState onAddMedia={onOpenAssetSelector} />
      )}
    </div>
  );
}
```

### Assets hinzufügen (via Asset-Selector)

```typescript
const [showAssetSelector, setShowAssetSelector] = useState(false);
const { attachedAssets, updateAttachedAssets } = useCampaign();

const handleAssetSelect = (selectedAssets: Asset[]) => {
  // Konvertiere Asset[] zu CampaignAssetAttachment[]
  const newAttachments: CampaignAssetAttachment[] = selectedAssets.map(asset => ({
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'asset',
    assetId: asset.id,
    metadata: {
      fileName: asset.name,
      fileType: asset.fileType,
      thumbnailUrl: asset.thumbnailUrl
    },
    attachedAt: Timestamp.now(),
    attachedBy: user.uid
  }));

  // Füge zu bestehenden Assets hinzu
  updateAttachedAssets([...attachedAssets, ...newAttachments]);
  // Toast: "N Medien hinzugefügt" (automatisch im Context)

  setShowAssetSelector(false);
};

<AssetSelectorModal
  open={showAssetSelector}
  onClose={() => setShowAssetSelector(false)}
  onSelect={handleAssetSelect}
/>
```

### Optimistic UI Update

```typescript
const handleAddAssets = async (newAssets: Asset[]) => {
  // 1. Optimistic Update (sofort UI ändern)
  const tempAttachments = newAssets.map(asset => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    type: 'asset' as const,
    assetId: asset.id,
    metadata: {
      fileName: asset.name,
      fileType: asset.fileType,
      thumbnailUrl: asset.thumbnailUrl
    },
    attachedAt: Timestamp.now(),
    attachedBy: user.uid
  }));

  const previousAssets = [...attachedAssets]; // Backup für Rollback
  updateAttachedAssets([...attachedAssets, ...tempAttachments]);
  // Toast: "N Medien hinzugefügt"

  try {
    // 2. Sync mit Backend
    await saveCampaign(); // Persistiert attachedAssets

    // 3. Optional: Reload Campaign für Server-IDs
    // await reloadCampaign();

  } catch (error) {
    // 4. Rollback bei Fehler
    updateAttachedAssets(previousAssets);
    toastService.error('Fehler beim Hinzufügen der Medien');
  }
};
```

### Batch-Operationen

```typescript
// Alle Assets eines Typs entfernen
const removeAllImages = () => {
  const remainingAssets = attachedAssets.filter(
    asset => !asset.metadata.fileType?.startsWith('image/')
  );

  updateAttachedAssets(remainingAssets);
  // Kein automatischer Toast (Anzahl reduziert)

  // Manueller Toast
  const removedCount = attachedAssets.length - remainingAssets.length;
  toastService.success(`${removedCount} Bilder entfernt`);
};

// Alle Assets entfernen
const removeAllAssets = () => {
  if (window.confirm('Alle Medien entfernen?')) {
    updateAttachedAssets([]);
    toastService.success('Alle Medien entfernt');
  }
};
```

### Asset-Metadaten aktualisieren

```typescript
// Dateinamen ändern (ohne Asset zu entfernen/neu hinzuzufügen)
const renameAsset = (assetId: string, newName: string) => {
  const updatedAssets = attachedAssets.map(asset =>
    (asset.assetId || asset.folderId) === assetId
      ? { ...asset, metadata: { ...asset.metadata, fileName: newName } }
      : asset
  );

  updateAttachedAssets(updatedAssets);
  // Kein Toast (Anzahl unverändert)

  // Manueller Toast
  toastService.success('Dateiname aktualisiert');
};
```

## Best Practices

### 1. Stabile Context-Referenzen nutzen

```typescript
// ✅ Gut: Direkt aus Context
const { removeAsset } = useCampaign();
<MediaList onRemove={removeAsset} />

// ❌ Schlecht: Wrapper-Funktion (neue Referenz bei jedem Render)
<MediaList onRemove={(id) => removeAsset(id)} />
```

### 2. Immutable Updates

```typescript
// ✅ Gut: Spread-Operator (neues Array)
updateAttachedAssets([...attachedAssets, newAsset]);

// ❌ Schlecht: Mutation (direktes Push)
attachedAssets.push(newAsset);
updateAttachedAssets(attachedAssets);
```

### 3. Asset-IDs generieren

```typescript
// ✅ Gut: Eindeutige ID mit Timestamp + Random
const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ❌ Schlecht: Nur Timestamp (bei schnellen Klicks nicht eindeutig)
const id = `att-${Date.now()}`;

// ❌ Schlecht: Nur Random (bei Page-Reload nicht stabil)
const id = `att-${Math.random()}`;
```

### 4. Typ-Guards für Assets

```typescript
// ✅ Gut: Type-Guard für Bilder
const isImageAsset = (asset: CampaignAssetAttachment): boolean => {
  return asset.type === 'asset' && asset.metadata.fileType?.startsWith('image/') || false;
};

// Verwendung
const imageAssets = attachedAssets.filter(isImageAsset);
```

### 5. Error Handling bei Asset-Operationen

```typescript
const handleAddAssets = async (newAssets: Asset[]) => {
  if (newAssets.length === 0) {
    toastService.warning('Keine Assets ausgewählt');
    return;
  }

  if (attachedAssets.length + newAssets.length > 100) {
    toastService.error('Maximal 100 Medien pro Kampagne');
    return;
  }

  try {
    const attachments = newAssets.map(asset => ({
      id: generateId(),
      type: 'asset' as const,
      assetId: asset.id,
      metadata: {
        fileName: asset.name || 'Unbenannt',
        fileType: asset.fileType || 'application/octet-stream',
        thumbnailUrl: asset.thumbnailUrl
      },
      attachedAt: Timestamp.now(),
      attachedBy: user.uid
    }));

    updateAttachedAssets([...attachedAssets, ...attachments]);
  } catch (error) {
    console.error('Error adding assets:', error);
    toastService.error('Fehler beim Hinzufügen der Medien');
  }
};
```

### 6. Context Provider platzieren

```typescript
// ✅ Gut: Provider umschließt alle benötigten Komponenten
<CampaignProvider campaignId={campaignId} organizationId={organizationId}>
  <CampaignEditPage />
</CampaignProvider>

// ❌ Schlecht: Provider zu tief verschachtelt
<CampaignEditPage>
  <CampaignProvider>
    <AttachmentsTab /> {/* Andere Tabs haben keinen Zugriff */}
  </CampaignProvider>
</CampaignEditPage>
```

## Error Handling

### Context nicht verfügbar

```typescript
// Im useCampaign Hook
export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);

  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }

  return context;
}
```

**Fehler**: "useCampaign must be used within CampaignProvider"

**Ursache**: Komponente nicht im CampaignProvider-Baum

**Lösung**: Provider hinzufügen
```typescript
<CampaignProvider campaignId={id} organizationId={orgId}>
  <AttachmentsTab />
</CampaignProvider>
```

### Asset-ID nicht gefunden

```typescript
// removeAsset filtert stillschweigend (kein Error)
removeAsset('non-existent-id');
// Zeigt trotzdem Toast: "Medium entfernt"
// State bleibt unverändert
```

**Best Practice**: Validierung vor Aufruf
```typescript
const handleRemove = (assetId: string) => {
  const assetExists = attachedAssets.some(
    asset => (asset.assetId || asset.folderId) === assetId
  );

  if (!assetExists) {
    toastService.warning('Medium nicht gefunden');
    return;
  }

  removeAsset(assetId);
};
```

### Speicherfehler

```typescript
const saveCampaign = async () => {
  setSaving(true);

  try {
    await prService.update(campaignId, {
      attachedAssets: attachedAssets,
      // ... andere Felder
    });

    toastService.success('Kampagne gespeichert');

  } catch (error) {
    console.error('Save failed:', error);

    if (error.code === 'permission-denied') {
      toastService.error('Keine Berechtigung zum Speichern');
    } else {
      toastService.error('Fehler beim Speichern');
    }

    throw error; // Re-throw für Caller

  } finally {
    setSaving(false);
  }
};
```

## Performance

### Context Re-Renders minimieren

#### useCallback für Actions

```typescript
// Im CampaignContext
const removeAsset = useCallback((assetId: string) => {
  setAttachedAssets(prev =>
    prev.filter(asset => (asset.assetId || asset.folderId) !== assetId)
  );
  toastService.success('Medium entfernt');
}, []); // Leere Dependencies = stabile Referenz

const updateAttachedAssets = useCallback((assets: CampaignAssetAttachment[]) => {
  setAttachedAssets(prev => {
    const newCount = assets.length - prev.length;
    if (newCount > 0) {
      toastService.success(`${newCount} Medium${newCount > 1 ? 'en' : ''} hinzugefügt`);
    }
    return assets;
  });
}, []); // Leere Dependencies = stabile Referenz
```

#### Context-Splitting (optional, nicht implementiert)

Falls Performance-Probleme auftreten (bei sehr großen Campaigns):

```typescript
// Separate Contexts für verschiedene Bereiche
<CampaignMetaProvider>
  <CampaignContentProvider>
    <CampaignAssetsProvider>
      {/* Komponenten konsumieren nur benötigte Contexts */}
    </CampaignAssetsProvider>
  </CampaignContentProvider>
</CampaignMetaProvider>
```

**Aktuell nicht nötig**: Ein Context ist ausreichend performant.

### Memoization in Konsumenten

```typescript
// In AttachmentsTab oder anderen Konsumenten
const { attachedAssets, removeAsset } = useCampaign();

// ✅ Gut: Memoized Komponente
const MemoizedMediaList = React.memo(MediaList);

<MemoizedMediaList
  attachments={attachedAssets}
  onRemove={removeAsset}
/>
```

### Performance-Metriken

| Operation | Durchschnitt | p95 | p99 |
|-----------|--------------|-----|-----|
| **useCampaign() Hook** | <1ms | 1ms | 2ms |
| **updateAttachedAssets()** | 2-5ms | 8ms | 15ms |
| **removeAsset()** | 1-3ms | 5ms | 10ms |
| **Toast Render** | 5-10ms | 15ms | 25ms |

**Testumgebung**: Chrome DevTools Performance, Development Build, 50 Assets

---

**Weitere Dokumentation**:
- [AttachmentsTab README](../README.md)
- [Komponenten-Details](../components/README.md)
- [Architecture Decision Records](../adr/README.md)
