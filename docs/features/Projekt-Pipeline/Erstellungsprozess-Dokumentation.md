# Erstellungsprozess-Dokumentation für Projekt-Pipeline

## Übersicht
Der Erstellungsprozess in CeleroPress umfasst die komplette Kampagnen-Erstellung, von der initialen Texterstellung über Medienauswahl bis hin zur finalen Zusammenstellung. Das System bietet einen strukturierten Workflow mit umfangreichen Editor-Features, Medien-Integration und Textbaustein-Management.

## Kernkomponenten des Erstellungsprozesses

### 1. Kampagnen-Erstellung (New Campaign)
**Datei**: `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`

#### Hauptfunktionen
- **Schritt-für-Schritt Erstellung**
- **Content-Editor** mit Rich-Text Features
- **Medien-Integration**
- **Textbaustein-System**
- **Freigabe-Konfiguration**
- **Vorschau-Funktion**

#### PRCampaign Entity
```typescript
interface PRCampaign {
  id?: string;
  userId: string;
  organizationId?: string; // Multi-Tenancy
  
  // Basis-Informationen
  title: string;
  contentHtml: string; // Finaler HTML-Content
  status: PRCampaignStatus;
  
  // Template-Integration
  templateId?: string;
  templateName?: string;
  templateAppliedAt?: Timestamp;
  
  // Key Visual
  keyVisual?: KeyVisualData;
  
  // Content-Komponenten
  content?: {
    editorContent?: string; // Haupt-Editor Content
    boilerplateSections?: CampaignBoilerplateSection[];
    structuredElements?: any[];
  };
  
  // Medien
  attachedAssets?: CampaignAssetAttachment[];
  
  // Kunde & Empfänger
  clientId?: string;
  clientName?: string;
  distributionListIds?: string[];
  distributionListNames?: string[];
  manualRecipients?: ManualRecipient[];
  
  // Freigabe
  approvalData?: SimplifiedApprovalData;
  editLock?: EditLockData;
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
```

### 2. Kampagnen-Bearbeitung (Edit Campaign)
**Datei**: `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`

#### Erweiterte Features
- **Live-Speicherung** mit Auto-Save
- **Edit-Lock System** für Freigabe-Workflows
- **Versions-Historie**
- **PDF-Versions-Management**
- **Feedback-Integration**
- **Collaborative Editing** mit Lock-Status

#### Edit-Lock System
```typescript
interface EditLockData {
  isLocked: boolean;
  reason?: EditLockReason; // pending_customer_approval | approved_final | system_processing | manual_lock
  lockedAt?: Timestamp;
  lockedBy?: {
    userId: string;
    displayName: string;
    action: string;
  };
  unlockRequests?: UnlockRequest[];
  canRequestUnlock?: boolean;
}
```

### 3. Content-Composer
**Component**: `CampaignContentComposer`

#### Features
- **TipTap Rich-Text Editor**
  - Bold, Italic, Underline
  - Headings (H1-H3)
  - Lists (Ordered/Unordered)
  - Links
  - Tables
  - Images
  - Variables ({{firstName}}, {{companyName}})
  
- **AI-Integration**
  - Content-Generierung
  - Text-Optimierung
  - SEO-Verbesserung
  - Ton-Anpassung

- **SEO-Header Bar**
  - Character Count
  - Word Count
  - Reading Time
  - SEO Score

### 4. Media Library System
**Datei**: `src/app/dashboard/pr-tools/media-library/page.tsx`

#### MediaAsset Entity
```typescript
interface MediaAsset {
  id?: string;
  
  // Datei-Informationen
  fileName: string;
  fileType: 'image' | 'video' | 'document' | 'audio' | 'other';
  mimeType: string;
  fileSize: number;
  
  // URLs
  downloadUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  
  // Organisation
  folderId?: string;
  folderPath?: string;
  tags?: string[];
  
  // Metadaten
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // für Videos/Audio
    pageCount?: number; // für PDFs
    description?: string;
    altText?: string;
    copyright?: string;
  };
  
  // Verknüpfungen
  clientId?: string;
  clientName?: string;
  campaignIds?: string[];
  
  // Berechtigungen
  visibility: 'private' | 'team' | 'public';
  sharedWith?: string[];
  shareLink?: string;
  
  // Timestamps
  uploadedAt: Timestamp;
  uploadedBy: string;
  lastModified?: Timestamp;
  organizationId: string;
}
```

#### MediaFolder Entity
```typescript
interface MediaFolder {
  id?: string;
  name: string;
  parentId?: string;
  path: string;
  
  // Organisation
  color?: string;
  icon?: string;
  description?: string;
  
  // Statistiken
  fileCount: number;
  folderCount: number;
  totalSize: number;
  
  // Berechtigungen
  visibility: 'private' | 'team' | 'public';
  permissions?: {
    canRead: string[];
    canWrite: string[];
    canDelete: string[];
  };
  
  // Metadaten
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  organizationId: string;
}
```

#### Media Library Features
- **Ordner-Struktur** mit Breadcrumb-Navigation
- **Drag & Drop Upload**
- **Bulk-Operationen** (Multi-Select)
- **Grid & Listen-Ansicht**
- **Such- und Filter-Funktionen**
- **Sharing-Funktionen**
- **Preview-Modal**
- **Asset-Details** mit Metadaten-Bearbeitung

### 5. Boilerplates System (Textbausteine)
**Datei**: `src/app/dashboard/pr-tools/boilerplates/page.tsx`

#### Boilerplate Entity
```typescript
interface Boilerplate {
  id?: string;
  
  // Basis-Informationen
  name: string;
  content: string; // HTML-Content
  description?: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  
  // Gültigkeit
  isGlobal: boolean; // Für alle Kunden oder spezifisch
  clientId?: string; // Falls kundenspezifisch
  clientName?: string;
  
  // Organisation
  tags?: string[];
  language?: 'de' | 'en' | 'fr' | 'es' | 'it';
  order?: number; // Standard-Reihenfolge
  
  // Verwendung
  usageCount?: number;
  lastUsedAt?: Timestamp;
  isActive: boolean;
  isFavorite?: boolean;
  
  // Variablen
  variables?: string[]; // z.B. ['{{companyName}}', '{{year}}']
  
  // Metadaten
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
  organizationId: string;
}
```

#### Boilerplate Features
- **Kategorisierung** (Unternehmen, Kontakt, Rechtlich, Produkt, Sonstige)
- **Multi-Language Support**
- **Global vs. Kundenspezifisch**
- **Favoriten-System**
- **Variablen-Support**
- **Such- und Filter-Funktionen**
- **Usage-Tracking**
- **Drag & Drop** in Kampagnen

### 6. Key Visual Management
**Component**: `KeyVisualSection`

#### KeyVisualData
```typescript
interface KeyVisualData {
  assetId?: string;  // Referenz zur Media Library
  url: string;       // Download URL des gecroppten Bildes
  cropData?: {       // Crop-Koordinaten
    x: number;
    y: number;
    width: number;
    height: number;
    unit: string;
  };
}
```

#### Features
- **Image Cropping** mit react-image-crop
- **Aspect Ratio** Presets (16:9, 4:3, 1:1, etc.)
- **Preview** im Kampagnen-Kontext
- **Media Library Integration**
- **Drag & Drop** Upload

### 7. Asset Attachment System
**Component**: `AssetSelectorModal`

#### CampaignAssetAttachment
```typescript
interface CampaignAssetAttachment {
  assetId: string;
  type: 'file' | 'folder';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
    folderName?: string;
    fileCount?: number;
  };
}
```

#### Features
- **Multi-Select** aus Media Library
- **Folder-Support** (ganze Ordner anhängen)
- **Preview-Thumbnails**
- **Drag & Drop** Sortierung
- **Quick-Actions** (View, Remove)

## Workflow der Erstellungsphase

### 1. Kampagnen-Initialisierung
1. User klickt "Neue Kampagne"
2. Formular öffnet sich mit Tabs/Steps
3. Titel und Kunde werden ausgewählt

### 2. Content-Erstellung
1. **Haupttext verfassen** im Rich-Text Editor
2. **AI-Unterstützung** optional nutzen
3. **Variables** für Personalisierung einfügen
4. **SEO-Optimierung** beachten

### 3. Textbausteine hinzufügen
1. **Boilerplates laden** aus Bibliothek
2. **Position festlegen** (Header/Footer/Custom)
3. **Reihenfolge** per Drag & Drop anpassen
4. **Customization** der Inhalte

### 4. Medien-Integration
1. **Key Visual** auswählen und croppen
2. **Assets anhängen** aus Media Library
3. **Neue Medien uploaden** bei Bedarf
4. **Metadaten** ergänzen

### 5. Empfänger-Konfiguration
1. **Verteilerlisten** auswählen (Multi-Select)
2. **Manuelle Empfänger** hinzufügen
3. **Duplikate** automatisch entfernen
4. **Validierung** der E-Mail-Adressen

### 6. Freigabe-Setup
1. **Freigabe-Workflow** aktivieren
2. **Kunden-Kontakt** auswählen
3. **Nachricht** für Freigabe-Anfrage
4. **Deadline** optional setzen

### 7. Preview & Finalisierung
1. **Live-Vorschau** der Kampagne
2. **PDF-Preview** generieren
3. **Test-Versand** durchführen
4. **Speichern** als Entwurf oder
5. **Zur Freigabe senden**

## Benötigte Werte für Erstellungsphase in Projekt-Pipeline

### Kampagnen-Grunddaten
1. **campaignId**: Eindeutige Kampagnen-ID
2. **campaignTitle**: Kampagnentitel
3. **campaignStatus**: Aktueller Status
4. **clientId**: Verknüpfter Kunde
5. **clientName**: Kundenname
6. **organizationId**: Organisation (Multi-Tenancy)

### Content-Daten
7. **contentHtml**: Finaler HTML-Content
8. **editorContent**: Editor-Rohtext
9. **wordCount**: Wortanzahl
10. **readingTime**: Geschätzte Lesezeit
11. **seoScore**: SEO-Bewertung
12. **hasAIContent**: Wurde AI verwendet?

### Textbausteine
13. **boilerplateSections**: Array von Textbausteinen
14. **boilerplateCount**: Anzahl verwendeter Bausteine
15. **boilerplateIds**: IDs der verwendeten Bausteine
16. **customizedBoilerplates**: Angepasste Bausteine

### Medien-Assets
17. **keyVisual**: Hero-Bild Daten
18. **attachedAssets**: Angehängte Medien
19. **assetCount**: Anzahl Medien
20. **totalAssetSize**: Gesamtgröße in Bytes
21. **assetTypes**: Verwendete Medientypen

### Template-Daten
22. **templateId**: PDF-Template ID
23. **templateName**: Template-Name
24. **templateAppliedAt**: Template angewendet am
25. **hasCustomTemplate**: Custom-Template?

### Empfänger-Konfiguration
26. **distributionListIds**: Ausgewählte Listen
27. **distributionListNames**: Listen-Namen
28. **manualRecipients**: Manuelle Empfänger
29. **totalRecipientCount**: Gesamtanzahl
30. **validRecipientCount**: Validierte Anzahl

### Freigabe-Konfiguration
31. **approvalRequired**: Freigabe erforderlich?
32. **approvalContact**: Freigabe-Kontakt
33. **approvalMessage**: Freigabe-Nachricht
34. **approvalDeadline**: Freigabe-Deadline
35. **editLockStatus**: Edit-Lock Status

### Versions-Management
36. **version**: Aktuelle Version
37. **previousVersionId**: Vorherige Version
38. **hasChanges**: Ungespeicherte Änderungen?
39. **lastSavedAt**: Zuletzt gespeichert
40. **autoSaveEnabled**: Auto-Save aktiv?

### Collaboration
41. **currentEditor**: Aktueller Bearbeiter
42. **collaborators**: Weitere Bearbeiter
43. **comments**: Kommentare
44. **changeRequests**: Änderungsanfragen

### Metadaten
45. **createdAt**: Erstellt am
46. **createdBy**: Erstellt von
47. **updatedAt**: Aktualisiert am
48. **updatedBy**: Aktualisiert von
49. **publishedAt**: Veröffentlicht am
50. **tags**: Kampagnen-Tags

## Service-Architektur

### Services
1. **prService**: Kampagnen-Verwaltung
2. **mediaService**: Media Library
3. **boilerplatesService**: Textbausteine
4. **pdfVersionsService**: PDF-Versionen
5. **approvalService**: Freigabe-Workflow
6. **teamMemberService**: Team-Verwaltung

### Datenbankstruktur
```
/campaigns
  /{campaignId}
    - PRCampaign Daten
    - content (Editor, Boilerplates)
    - attachments
    - organizationId

/media
  /{assetId}
    - MediaAsset Daten
    - metadata
    - permissions
    - organizationId

/folders
  /{folderId}
    - MediaFolder Daten
    - permissions
    - organizationId

/boilerplates
  /{boilerplateId}
    - Boilerplate Daten
    - usage statistics
    - organizationId

/pdfVersions
  /{campaignId}
    /{versionId}
      - Version Daten
      - downloadUrl
      - status
```

## UI-Komponenten

### Haupt-Komponenten
1. **NewPRCampaignPage**: Neue Kampagne erstellen
2. **EditPRCampaignPage**: Kampagne bearbeiten
3. **CampaignContentComposer**: Content-Editor
4. **MediathekPage**: Media Library
5. **BoilerplatesPage**: Textbausteine
6. **KeyVisualSection**: Hero-Bild Management
7. **AssetSelectorModal**: Asset-Auswahl
8. **SimpleBoilerplateLoader**: Boilerplate-Integration
9. **CampaignPreviewStep**: Vorschau
10. **EditLockBanner**: Lock-Status

### Features
- **Tabbed Interface** für strukturierte Navigation
- **Drag & Drop** für Medien und Boilerplates
- **Real-time Validation**
- **Auto-Save** alle 30 Sekunden
- **Undo/Redo** im Editor
- **Responsive Design**
- **Dark Mode Support**
- **Keyboard Shortcuts**

## Sicherheit & Berechtigungen
- Multi-Tenancy über organizationId
- Rollenbasierte Zugriffskontrolle
- Edit-Lock für parallele Bearbeitung
- Asset-Permissions (private/team/public)
- Audit-Trail für Änderungen

## Performance-Optimierungen
- Lazy-Loading für Medien
- Thumbnail-Generierung
- Content-Caching
- Optimierte Queries
- CDN für Assets
- Debounced Auto-Save

## Integration-Punkte
1. **CRM-System**: Kunden-Verknüpfung
2. **E-Mail-System**: Distribution
3. **AI-Service**: Content-Generierung
4. **PDF-Service**: Vorschau-Generierung
5. **Analytics**: Usage-Tracking
6. **Storage**: Firebase Storage/CDN

## Fehlende Features für Projekt-Pipeline

1. **projectId**: Verknüpfung zum übergeordneten Projekt
2. **pipelineStage**: Aktuelle Pipeline-Phase
3. **taskDependencies**: Abhängigkeiten zu anderen Tasks
4. **timeTracking**: Zeiterfassung pro Phase
5. **budgetTracking**: Budget-Verwendung
6. **resourceAllocation**: Ressourcen-Zuweisung
7. **qualityChecks**: Qualitätsprüfungen
8. **milestones**: Meilenstein-Tracking
9. **deliverables**: Liefergegenstände
10. **integrationWebhooks**: Externe System-Events