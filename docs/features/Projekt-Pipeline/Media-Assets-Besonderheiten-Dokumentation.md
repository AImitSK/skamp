# Media Assets Besonderheiten - Dokumentation für Projekt-Pipeline

## Übersicht
Das Media Asset System in CeleroPress verwendet ein besonderes Verknüpfungs- und ID-System, das sich von traditionellen referenziellen Datenbank-Strukturen unterscheidet. Diese Dokumentation analysiert die spezifischen Eigenschaften und Implementierungsdetails.

## Kern-Besonderheiten des Media Asset Systems

### 1. Direkte ID-Speicherung statt Referenzen
**Besonderheit**: Assets werden nicht über separate Verknüpfungstabellen zugeordnet, sondern **direkt in den Kampagnen-Objekten gespeichert**.

#### Traditioneller Ansatz (NICHT verwendet):
```sql
-- Separate Verknüpfungstabelle
campaign_assets:
  - campaign_id (FK)
  - asset_id (FK)
  - created_at
```

#### CeleroPress Ansatz (WIRD verwendet):
```typescript
// Direkt im PRCampaign Object
PRCampaign {
  attachedAssets: CampaignAssetAttachment[]
}
```

### 2. CampaignAssetAttachment Struktur
**Einzigartige Architektur**: Jedes angehängte Asset wird als eigenständiges Objekt mit Metadaten-Snapshot gespeichert.

```typescript
interface CampaignAssetAttachment {
  id: string;                    // Eigene ID (nicht Asset-ID!)
  type: 'asset' | 'folder';      // Asset oder ganzer Ordner
  assetId?: string;              // Referenz zum MediaAsset (optional)
  folderId?: string;             // Referenz zum MediaFolder (optional)
  
  // BESONDERHEIT: Metadaten-Snapshot zum Zeitpunkt der Zuordnung
  metadata: {
    fileName?: string;
    folderName?: string;
    fileType?: string;
    description?: string;
    thumbnailUrl?: string;
    
    // Zukünftige Erweiterungen
    copyright?: string;
    author?: string;
    license?: string;
    expiryDate?: Date;
    usage?: {
      allowPrint?: boolean;
      allowDigital?: boolean;
      allowSocial?: boolean;
      restrictions?: string;
    };
  };
}
```

### 3. Metadaten-Snapshot Konzept
**Kritische Eigenschaft**: Bei der Asset-Zuordnung wird ein **Snapshot der Metadaten** erstellt.

#### Vorteile:
1. **Historische Konsistenz**: Asset-Namen ändern sich nicht rückwirkend in Kampagnen
2. **Performance**: Keine JOINs notwendig bei Kampagnen-Anzeige
3. **Offline-Fähigkeit**: Kampagnen-Daten sind vollständig ohne Asset-Lookup
4. **Versionierung**: Verschiedene Kampagnen können unterschiedliche Asset-Metadaten haben

#### Implementierung:
```typescript
// Bei Asset-Auswahl in AssetSelectorModal:
const createAssetAttachment = (asset: MediaAsset): CampaignAssetAttachment => ({
  id: nanoid(), // Neue ID generieren!
  type: 'asset',
  assetId: asset.id,
  metadata: {
    fileName: asset.fileName,      // Snapshot!
    fileType: asset.fileType,      // Snapshot!
    thumbnailUrl: asset.thumbnailUrl, // Snapshot!
    // ... weitere Metadaten
  }
});
```

### 4. Duale Asset-Zuordnung
**Besonderheit**: Assets können sowohl **einzeln** als auch als **ganze Ordner** zugeordnet werden.

#### Einzelne Assets:
```typescript
{
  type: 'asset',
  assetId: 'asset_123',
  metadata: { fileName: 'pressebild.jpg' }
}
```

#### Ganze Ordner:
```typescript
{
  type: 'folder',
  folderId: 'folder_456',
  metadata: { folderName: 'Produktbilder Q1' }
}
```

#### Asset-Auflösung zur Laufzeit:
```typescript
// Bei Kampagnen-Anzeige werden Ordner-Assets dynamisch aufgelöst:
if (attachment.type === 'folder') {
  const folderAssets = await mediaService.getMediaAssetsInFolder(attachment.folderId);
  // Dynamische Einbindung aller Assets im Ordner
}
```

### 5. Multi-Tenancy Integration
**Organisationsbasierte Struktur**: Assets verwenden organizationId statt userId.

#### Datenbankstruktur:
```
/media_assets
  /{assetId}
    - organizationId: "org_123"    // Multi-Tenancy
    - createdBy: "user_456"        // Original-Ersteller
    - clientId: "client_789"       // Kundenzuordnung
    - folderId: "folder_101"       // Ordner-Zugehörigkeit
    - fileName, fileType, etc.
```

#### Legacy-Kompatibilität:
```typescript
// Automatische Migration von userId zu organizationId
const compatibilityMapping = {
  organizationId: data.organizationId || data.userId, // Fallback
  createdBy: data.createdBy || data.userId,
  userId: data.createdBy || data.organizationId // UI-Kompatibilität
};
```

### 6. Client-Asset Zuordnung
**Besondere Logik**: Assets können kundenspezifisch oder organisationsweit verfügbar sein.

#### Zuordnungslogik:
```typescript
// Kunde-spezifische Assets
const clientAssets = await mediaService.getMediaByClientId(orgId, clientId);

// Nicht-zugeordnete (organisationsweite) Assets
const unassignedAssets = allAssets.filter(asset => !asset.clientId);

// Kombinierte Verfügbarkeit in AssetSelector
const availableAssets = [...clientAssets, ...unassignedAssets];
```

### 7. Asset-Speicherung und URLs
**Firebase Storage Integration**: Assets werden in Firebase Storage mit strukturierten Pfaden gespeichert.

#### Pfad-Struktur:
```
/organizations/{orgId}/clients/{clientId}/{folder}/{fileName}
/organizations/{orgId}/general/{folder}/{fileName}
```

#### URL-Generierung:
```typescript
// Download-URLs mit Tokens
downloadUrl: "https://firebasestorage.googleapis.com/.../o/...?alt=media&token=..."

// Thumbnail-URLs (automatisch generiert)
thumbnailUrl: "https://firebasestorage.googleapis.com/.../o/...thumb?alt=media&token=..."
```

### 8. Share-Link System
**Erweiterte Freigabe**: Assets können über spezielle Share-Links extern geteilt werden.

#### ShareLink Struktur:
```typescript
interface ShareLink {
  shareId: string;              // Öffentliche ID
  organizationId: string;       // Multi-Tenancy
  
  // Kann mehrere Assets/Ordner enthalten
  assetIds?: string[];          // Direkte Asset-IDs
  folderIds?: string[];         // Ordner-IDs
  
  // Sicherheitseinstellungen
  settings: {
    expiresAt: Date | null;
    downloadAllowed: boolean;
    passwordRequired: string | null;
    watermarkEnabled: boolean;
  };
}
```

### 9. Asset-Aufauflösung in Kampagnen
**Komplexe Auflösungslogik**: Bei Kampagnen-Anzeige werden Assets dynamisch geladen.

#### Auflösungsschritte:
1. **Direkte Assets**: Über assetId laden
2. **Ordner-Assets**: Alle Assets im Ordner laden
3. **Metadaten-Merge**: Snapshot-Daten mit aktuellen Asset-Daten kombinieren
4. **Deduplizierung**: Gleiche Assets nur einmal anzeigen
5. **Berechtigungsprüfung**: Zugriff validieren

```typescript
const resolveAttachedAssets = async (attachments: CampaignAssetAttachment[]) => {
  const resolvedAssets: MediaAsset[] = [];
  
  for (const attachment of attachments) {
    if (attachment.type === 'asset' && attachment.assetId) {
      const asset = await mediaService.getMediaAssetById(attachment.assetId);
      if (asset) {
        // Merge Snapshot-Metadaten mit aktuellen Daten
        resolvedAssets.push({
          ...asset,
          // Bevorzuge Snapshot-Daten für historische Konsistenz
          fileName: attachment.metadata.fileName || asset.fileName,
          description: attachment.metadata.description || asset.description
        });
      }
    } else if (attachment.type === 'folder' && attachment.folderId) {
      const folderAssets = await mediaService.getMediaAssetsInFolder(attachment.folderId);
      resolvedAssets.push(...folderAssets);
    }
  }
  
  // Deduplizierung
  return uniqueBy(resolvedAssets, 'id');
};
```

### 10. Besondere Performance-Optimierungen
**Optimierte Datenbankabfragen**: Spezielle Indexierung und Caching-Strategien.

#### Firestore Queries:
```typescript
// Index auf organizationId + clientId
const clientAssetsQuery = query(
  collection(db, 'media_assets'),
  where('organizationId', '==', orgId),
  where('clientId', '==', clientId)
);

// Index auf organizationId + folderId
const folderAssetsQuery = query(
  collection(db, 'media_assets'),
  where('organizationId', '==', orgId),
  where('folderId', '==', folderId)
);
```

#### Caching-Strategie:
```typescript
// Asset-URLs werden gecacht für Performance
const urlCache = new Map<string, { url: string; expiry: number }>();

const getCachedAssetUrl = (assetId: string): string | null => {
  const cached = urlCache.get(assetId);
  if (cached && Date.now() < cached.expiry) {
    return cached.url;
  }
  return null;
};
```

## Auswirkungen auf Projekt-Pipeline

### 1. Asset-Verknüpfung in Projekt-Karten
**Direkte Einbindung**: Projekt-Karten können Assets direkt über attachedAssets[] einbinden.

```typescript
// Projekt-Pipeline Asset-Integration
interface ProjectCard {
  campaignId: string;
  
  // Direkt verfügbare Asset-Gallery
  attachedAssets: CampaignAssetAttachment[];
  
  // Pre-resolved Asset-Count für Performance
  assetCount: number;
  mediaTypes: string[]; // ['image', 'pdf', 'video']
}
```

### 2. Asset-Gallery Komponente
**Optimierte Darstellung**: Assets können ohne zusätzliche API-Calls angezeigt werden.

```typescript
const AssetGallery = ({ attachments }: { attachments: CampaignAssetAttachment[] }) => {
  return (
    <div className="asset-gallery">
      {attachments.map(attachment => (
        <AssetThumbnail
          key={attachment.id}
          fileName={attachment.metadata.fileName}
          thumbnailUrl={attachment.metadata.thumbnailUrl}
          type={attachment.type}
          onClick={() => openAsset(attachment)}
        />
      ))}
    </div>
  );
};
```

### 3. Benötigte Werte für Pipeline-Integration

#### Asset-Metadaten (aus CampaignAssetAttachment):
1. **attachmentId**: Eindeutige Attachment-ID
2. **assetType**: 'asset' | 'folder'
3. **originalAssetId**: Referenz zum Original-Asset
4. **fileName**: Name der Datei (Snapshot)
5. **fileType**: Medientyp (image, pdf, video, etc.)
6. **thumbnailUrl**: Vorschaubild-URL
7. **fileSize**: Dateigröße in Bytes
8. **attachedAt**: Zeitpunkt der Zuordnung

#### Erweiterte Asset-Informationen:
9. **copyright**: Urheberrechtsinformationen
10. **author**: Ersteller/Fotograf
11. **license**: Lizenz-Informationen
12. **usage**: Verwendungsrechte
13. **expiryDate**: Ablaufdatum der Rechte
14. **watermarkRequired**: Wasserzeichen erforderlich?

#### Asset-Status:
15. **isAvailable**: Asset noch verfügbar?
16. **hasChanged**: Asset seit Zuordnung geändert?
17. **needsRefresh**: Metadaten-Update erforderlich?
18. **downloadUrl**: Aktuelle Download-URL

#### Ordner-spezifische Daten:
19. **folderName**: Name des Ordners
20. **folderPath**: Vollständiger Pfad
21. **assetCount**: Anzahl Assets im Ordner
22. **lastModified**: Letzte Änderung im Ordner

## Herausforderungen und Lösungsansätze

### 1. Metadaten-Synchronisation
**Problem**: Snapshot-Daten können veralten
**Lösung**: Hintergrund-Synchronisation + Change-Detection

### 2. Ordner-Asset Dynamik
**Problem**: Ordner-Inhalte ändern sich
**Lösung**: Cache-Invalidierung + Lazy-Loading

### 3. Performance bei vielen Assets
**Problem**: Große Kampagnen mit vielen Assets
**Lösung**: Pagination + Thumbnail-Caching + Lazy-Loading

### 4. Berechtigungsvalidierung
**Problem**: Asset-Zugriff muss validiert werden
**Lösung**: Multi-Level-Permissions + organizationId-Checks

## Integration in Projekt-Pipeline

Das besondere Asset-System ermöglicht:

1. **Snapshot-basierte Medien-Galerien** ohne Live-DB-Zugriff
2. **Historische Konsistenz** von Asset-Namen in Projekten
3. **Performance-optimierte** Darstellung durch gecachte Metadaten
4. **Ordner-basierte** Asset-Gruppierung
5. **Multi-Tenancy** Support mit organisationsweiter Medien-Verfügbarkeit

Diese Architektur ist speziell für die CeleroPress-Anforderungen optimiert und unterscheidet sich erheblich von Standard-Datenbank-Beziehungen.

## Entwicklungsrichtlinien

### Beim Arbeiten mit Assets:
1. **Immer Metadaten-Snapshots** beim Anhängen erstellen
2. **Attachment-IDs verwenden**, nicht Asset-IDs für UI-Tracking
3. **Ordner-Assets dynamisch auflösen** bei Bedarf
4. **organizationId-basierte** Berechtigungsprüfung
5. **Legacy-Kompatibilität** für userId-Fallbacks beachten

### Bei Pipeline-Integration:
1. **Pre-resolved Asset-Counts** für Performance
2. **Thumbnail-URLs cachen** für schnelle Darstellung
3. **Lazy-Loading** für große Asset-Listen
4. **Change-Detection** für veraltete Snapshots