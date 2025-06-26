# SKAMP Mediathek Enhancement Plan

## 🎯 Ziele
Die Mediathek von einem simplen Datei-Upload zu einem professionellen Digital Asset Management (DAM) System entwickeln, das für Agenturen und Marketing-Teams optimiert ist.

## 📋 Geplante Features

### 1. **Ansichten & Navigation**

#### Grid-Ansicht ✨
- Kachel-basierte Darstellung mit Vorschaubildern
- Responsive Grid (1-6 Spalten je nach Bildschirmgröße)
- Große Vorschaubilder für bessere Übersicht
- Hover-Effekte mit Dateiinfos

#### Verbesserte List-Ansicht
- Sortierung nach: Name, Datum, Größe, Typ, Kunde
- Filter-Chips für schnelle Suche
- Bulk-Operationen (mehrere Dateien markieren)

### 2. **Ordnerstruktur & Organisation**

#### Hierarchische Ordner
```typescript
interface MediaFolder {
  id: string;
  name: string;
  parentFolderId?: string;  // Für Unterordner
  userId: string;
  clientId?: string;       // Optional: Kunde zugeordnet
  createdAt: Timestamp;
  color?: string;          // Ordner-Farbe für visuelle Unterscheidung
}
```

#### Breadcrumb-Navigation
- Klickbare Pfad-Anzeige: `Home > Kunde A > Kampagne 2024 > Bilder`
- Schnelle Navigation zwischen Ebenen

#### Drag & Drop
- Dateien zwischen Ordnern verschieben
- Ordner erstellen per Drag & Drop
- Upload direkt in gewünschten Ordner

### 3. **Kunden-Integration**

#### Dateien Kunden zuordnen
```typescript
interface MediaAsset {
  // ... bestehende Felder
  clientId?: string;       // Verknüpfung zur Company
  campaignId?: string;     // Optional: PR-Kampagne zuordnen
  isShared?: boolean;      // Öffentlich teilbar?
  shareSettings?: {
    expiresAt?: Date;
    passwordProtected?: boolean;
    downloadAllowed?: boolean;
  }
}
```

#### Kundenansicht erweitern
- Tab "Medien" auf der Firmen-Detailseite
- Übersicht aller Medien eines Kunden
- Upload direkt vom Kunden-Profil

### 4. **Sharing & Links**

#### Öffentliche Share-Links
```typescript
interface ShareLink {
  id: string;
  mediaAssetId: string;
  publicUrl: string;       // Kurze UUID-basierte URL
  createdBy: string;
  expiresAt?: Date;
  accessCount: number;
  isActive: boolean;
  settings: {
    downloadAllowed: boolean;
    passwordRequired?: string;
    watermark?: boolean;
  }
}
```

#### Ordner-Sharing
- Ganze Ordner per Link teilen
- ZIP-Download für Ordner
- Galerie-Ansicht für geteilte Ordner

### 5. **Erweiterte Datei-Features**

#### Metadaten & Tagging
```typescript
interface MediaAsset {
  // ... bestehende Felder
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    copyrightInfo?: string;
    photographer?: string;
    location?: string;
    campaign?: string;
  };
  aiGeneratedTags?: string[];  // ~~Gestrichen: Automatische KI-Erkennung~~
  customTags?: string[];       // Manuelle Tags
}
```

#### Versionierung
- Neue Version einer Datei hochladen
- Versionsverlauf anzeigen
- Vorherige Versionen wiederherstellen

#### Duplikate-Erkennung (vereinfacht)
- Hash-basierte Erkennung gleicher Dateien
- Warnung bei Upload von Duplikaten
- ~~Space-Optimierung durch Deduplizierung~~ (Vorerst nicht implementiert)

### 6. **Suche & Filter**

#### Erweiterte Suche
- Volltextsuche in Dateinamen und Metadaten
- Filter nach: Dateityp, Größe, Datum, Kunde, Tags, Ordner
- Gespeicherte Suchfilter ("Smart Folders")

~~#### AI-basierte Features~~
~~Gestrichen aus Komplexitätsgründen~~

### 7. **Performance & Skalierung**

#### Thumbnail-System
```typescript
interface MediaAsset {
  // ... bestehende Felder
  thumbnails?: {
    small: string;    // 150x150
    medium: string;   // 300x300
    large: string;    // 800x600
  };
  processedAt?: Timestamp;
}
```

#### Lazy Loading
- Infinite Scroll für große Dateimensgen
- Progressive Bildladung
- Caching-Strategien

### 8. **Integration in bestehende Features**

#### PR-Kampagnen Integration
- Medien direkt in E-Mail-Editor einbetten
- Kampagnen-spezifische Ordner automatisch erstellen
- Verwendungshistorie pro Datei

#### CRM-Integration
- Firmen-Logo automatisch als Avatar verwenden
- Kontakt-Fotos in der Kontaktliste
- Medien in Notizen einbetten

## 🏗️ Implementierungs-Roadmap

### Phase 1: Grundlegende Verbesserungen (2-3 Wochen)
1. Grid-Ansicht implementieren
2. Grundlegende Ordnerstruktur
3. Kunden-Zuordnung von Dateien
4. Verbesserte Upload-Experience

### Phase 2: Sharing & Organisation (2-3 Wochen)
1. Share-Links System
2. Ordner-Management UI
3. Drag & Drop zwischen Ordnern
4. Erweiterte Filter und Suche

### Phase 3: Professional Features (3-4 Wochen)
1. Metadaten-Management
2. Versionierung
3. Thumbnail-Generation
4. Integration in PR-Tools
5. Duplikate-Erkennung (Hash-basiert)
6. Performance-Optimierungen

### ~~Phase 4: AI & Analytics~~ ❌ **Gestrichen**
~~Komplexität reduziert - Features werden vorerst nicht implementiert~~

## 💾 Datenbank-Schema Erweiterungen

### Neue Collections
```javascript
// Firestore Collections
- media_folders/        // Ordnerstruktur
- media_shares/         // Share-Links
- media_versions/       // Dateiversionen
// media_usage_stats/   // ❌ Gestrichen: Analytics
```

### Security Rules Anpassungen
```javascript
// Ordner-Zugriff
match /media_folders/{folderId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}

// Share-Links (öffentlich lesbar wenn aktiv)
match /media_shares/{shareId} {
  allow read: if resource.data.isActive == true;
  allow write: if request.auth.uid == resource.data.createdBy;
}
```

## 🎨 UI/UX Verbesserungen

### Design-Patterns
- Konsistente Card-basierte Layouts
- Contextual Menus (Rechtsklick)
- Keyboard Shortcuts (Del, Ctrl+A, etc.)
- Progress Indicators für alle Aktionen

### Mobile Optimierung
- Touch-optimierte Grid-Ansicht
- Swipe-Gesten für Aktionen
- Responsive Upload-Interface

### Accessibility
- Alt-Texte für alle Bilder
- Keyboard-Navigation
- Screen-Reader Unterstützung

## 🔧 Technische Überlegungen

### Performance
- CDN für Datei-Delivery (Firebase Storage CDN)
- Image Optimization (Next.js Image Komponente)
- Client-side Caching mit Service Workers

### Backup & Security
- Automatische Backups der Metadaten
- Virus-Scanning für Uploads
- Wasszeichen für geteilte Bilder

### API-Design
```typescript
// Erweiterte API Endpoints
/api/media/folders        // CRUD für Ordner
/api/media/share         // Share-Link Management
/api/media/search        // Erweiterte Suche
/api/media/bulk          // Bulk-Operationen
```

## 📊 Success Metrics
- Reduzierte Suchzeit für Dateien (< 10 Sekunden)
- Erhöhte Datei-Wiederverwendung durch bessere Organisation
- Bessere Kundenorganisation (alle Dateien zugeordnet)
- Effizienterer PR-Workflow (direkter Zugriff aus E-Mail-Editor)
- Professionelle Share-Links für Kundenkommunikation

---

**Dieses Enhancement macht die SKAMP Mediathek zu einem professionellen DAM-System, das speziell für Marketing-Agenturen optimiert ist.**