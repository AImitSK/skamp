# Media Library - Mediathek (DAM)

## 📋 Übersicht

Die Mediathek ist SKAMPs Digital Asset Management (DAM) System für die zentrale Verwaltung aller Mediendateien. Sie ermöglicht die Organisation von Bildern, Dokumenten und anderen Dateien für PR-Kampagnen mit intelligenter Kunden-Zuordnung.

**Hauptzweck:** Zentrale Ablage und Verwaltung aller PR-relevanten Mediendateien mit schnellem Zugriff für Kampagnen.

## ✅ Implementierte Funktionen

### Datei-Management
- [x] **Multi-File Upload** mit Drag & Drop
- [x] **Unterstützte Formate**:
  - Bilder: JPG, PNG, GIF, WebP, SVG
  - Dokumente: PDF, DOC, DOCX
  - Videos: MP4, MOV (mit Größenlimit)
  - Sonstige: ZIP, TXT
- [x] **Automatische Thumbnail-Generierung** für Bilder
- [x] **Datei-Metadaten**: Name, Größe, Typ, Upload-Datum
- [x] **Firebase Storage Integration** mit CDN

### Ordner-System
- [x] **Hierarchische Ordnerstruktur**
- [x] **Farbcodierung** für visuelle Organisation
- [x] **Breadcrumb-Navigation**
- [x] **Ordner-Operationen**: Erstellen, Umbenennen, Löschen
- [x] **Drag & Drop** für Dateiverschiebung

### Kunden-Zuordnung
- [x] **Multi-Client Assignment** (Dateien zu mehreren Kunden)
- [x] **Automatische Zuordnung** beim Upload
- [x] **Kunden-Filter** in der Ansicht
- [x] **Kunden-spezifische Ordner** (optional)
- [x] **Integration mit CRM** (Firmen-Verknüpfung)

### Such- und Filter-Funktionen
- [x] **Volltext-Suche** in Dateinamen
- [x] **Filter nach**:
  - Dateityp (Bilder, Dokumente, etc.)
  - Kunde/Firma
  - Upload-Datum
  - Ordner
- [x] **Sortierung**: Name, Datum, Größe
- [x] **Grid & Listen-Ansicht**

### Kampagnen-Integration
- [x] **Direkte Datei-Auswahl** im Kampagnen-Editor
- [x] **Anhänge-Verwaltung** pro Kampagne
- [x] **Asset-Picker Modal** mit Vorschau
- [x] **Verwendungsnachweis** (wo wurde Datei genutzt)

## 🚧 In Entwicklung

- [ ] **Erweiterte Metadaten** (Branch: feature/media-metadata)
  - EXIF-Daten für Bilder
  - Custom Tags
  - Beschreibungen
  - Copyright-Informationen

## ❗ Dringend benötigt

### 1. **Bildbearbeitung & Optimierung** 🔴
**Beschreibung:** Basis-Bildbearbeitungsfunktionen direkt in der Mediathek
- Zuschneiden & Drehen
- Größenanpassung
- Format-Konvertierung
- Automatische Optimierung für Web
- Wasserzeichen hinzufügen

**Technische Anforderungen:**
- Client-seitige Bildbearbeitung (Canvas API)
- Cloud Functions für Batch-Processing
- WebP-Konvertierung

**Geschätzter Aufwand:** 2-3 Wochen

### 2. **Versions-Management** 🔴
**Beschreibung:** Versionierung für iterative Datei-Updates
- Versions-Historie
- Rollback-Funktion
- Änderungskommentare
- Diff-Ansicht für Dokumente
- Automatische Versionierung bei Upload

**Geschätzter Aufwand:** 2 Wochen

### 3. **Erweiterte Suche** 🟡
**Beschreibung:** Intelligentere Such- und Filterfunktionen
- OCR für PDF-Inhaltssuche
- KI-basierte Bilderkennung (Tags)
- Metadaten-Suche
- Gespeicherte Suchen
- Ähnliche Bilder finden

**Geschätzter Aufwand:** 2-3 Wochen

### 4. **Sharing & Collaboration** 🟡
**Beschreibung:** Teilen von Assets mit externen Partnern
- Öffentliche Share-Links
- Zeitlich begrenzte Links
- Passwortschutz
- Download-Berechtigungen
- Kommentare auf Dateien

**Geschätzter Aufwand:** 1-2 Wochen

## 💡 Nice to Have

### KI-Features
- **Auto-Tagging** mit Google Vision API
- **Intelligente Kategorisierung**
- **Duplikate-Erkennung** (Perceptual Hashing)
- **Content-basierte Empfehlungen**
- **Automatische Bildbeschreibungen** (Alt-Text)

### Workflow-Verbesserungen
- **Approval-Workflow** für Assets
- **Digital Rights Management** (DRM)
- **Ablaufdaten** für zeitkritische Assets
- **Asset-Collections** (Thematische Sammlungen)
- **Batch-Operationen** (Metadaten, Tags)

### Integration & Import
- **Adobe Creative Cloud** Connector
- **Google Drive** Sync
- **Dropbox** Integration
- **Stock-Foto APIs** (Unsplash, Pexels)
- **DAM-Migration Tools**

### Erweiterte Features
- **Brand Portal** für Kunden
- **Asset Analytics** (Nutzungsstatistiken)
- **Print-Ready Check** für Druckdateien
- **Video-Thumbnails** & Preview
- **360°-Bilder** Support
- **AR/VR Asset** Management

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
mediaFolders/
  {folderId}/
    - name: string
    - parentId?: string // für Hierarchie
    - color?: string
    - userId: string
    - createdAt: Timestamp

mediaAssets/
  {assetId}/
    - fileName: string
    - fileType: string
    - fileSize: number
    - folderId?: string
    - clientIds: string[] // Multi-Client
    - downloadUrl: string
    - thumbnailUrl?: string
    - metadata?: {
        width?: number
        height?: number
        duration?: number // für Videos
        pages?: number // für PDFs
      }
    - tags?: string[]
    - usageCount: number
    - userId: string
    - uploadedAt: Timestamp

// Firebase Storage Struktur
/users/{userId}/media/{assetId}/
  - original file
  - thumbnail (auto-generated)
  - variants/ (future)
```

### Service-Architektur

```typescript
// src/lib/firebase/media-service.ts
export const mediaService = {
  // Asset Management
  uploadAsset(file: File, metadata: AssetMetadata): Promise<Asset>
  deleteAsset(assetId: string): Promise<void>
  updateAsset(assetId: string, updates: Partial<Asset>): Promise<void>
  
  // Folder Management
  createFolder(data: FolderData): Promise<string>
  moveAsset(assetId: string, targetFolderId: string): Promise<void>
  
  // Retrieval
  getAssetsByFolder(folderId?: string): Promise<Asset[]>
  getAssetsByClient(clientId: string): Promise<Asset[]>
  searchAssets(query: string, filters: Filters): Promise<Asset[]>
  
  // Client Management
  assignClients(assetId: string, clientIds: string[]): Promise<void>
  removeClient(assetId: string, clientId: string): Promise<void>
}
```

### Upload-Handling

```typescript
// Optimierter Upload-Prozess
1. Client-seitige Validierung (Typ, Größe)
2. Thumbnail-Generierung (für Bilder)
3. Firebase Storage Upload mit Progress
4. Firestore Metadaten speichern
5. Optional: Cloud Function für Post-Processing

// Größenlimits
- Bilder: 10MB
- Dokumente: 50MB
- Videos: 100MB
- Gesamt-Speicher: User-Plan abhängig
```

### Performance-Optimierungen

```typescript
// Lazy Loading
- Virtuelles Scrolling für große Ordner
- Thumbnail-First Loading
- Pagination (50 Assets per Page)

// Caching
- IndexedDB für Thumbnails
- Service Worker für Offline-Assets
- CDN-URLs mit langer Cache-Zeit

// Optimierungen
- WebP-Thumbnails
- Responsive Images
- Lazy Load außerhalb Viewport
```

## 📊 Metriken & KPIs

- **Speichernutzung:** Pro User/Firma
- **Upload-Volumen:** Täglich/Monatlich
- **Populäre Assets:** Meist genutzte Dateien
- **Dateityp-Verteilung**
- **Client-Asset-Ratio**

## 🐛 Bekannte Probleme

1. **Große Datei-Uploads**
   - Timeout bei Dateien >50MB
   - Lösung: Resumable Uploads implementieren

2. **Thumbnail-Generierung**
   - Fehlt für PDF/Video
   - Lösung: Cloud Functions für Processing

3. **Ordner-Performance**
   - Langsam bei >500 Dateien
   - Lösung: Virtualisierung, Infinite Scroll

## 🔒 Sicherheit & Datenschutz

- Dateien nur für Upload-User sichtbar
- Sichere Firebase Storage Rules
- Signierte URLs mit Ablaufzeit
- Keine öffentlichen Asset-URLs (außer Shares)
- DSGVO-konforme Löschung
- Audit-Log für Asset-Zugriffe (geplant)

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Bildbearbeitung
- Versions-Management
- Erweiterte Metadaten

### Phase 2 (Q2 2025)
- KI-Integration (Auto-Tagging)
- External Sharing
- Cloud Storage Sync

### Phase 3 (Q3 2025)
- Brand Portal
- Video-Processing
- Enterprise DAM Features

## 📚 Weiterführende Dokumentation

- [Firebase Storage Setup](../setup/firebase-storage.md)
- [Upload Best Practices](./upload-guidelines.md)
- [Asset-Kampagnen Integration](./campaigns.md#anhänge)
- [Performance Guide](./media-performance.md)