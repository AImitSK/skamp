# Plan 6/9: Media-Assets-Integration-Implementierung

## Übersicht
Implementierung der **Media-Assets Besonderheiten** in die Projekt-Pipeline durch Erweiterung der bestehenden Media-Asset-Architektur. Das besondere CampaignAssetAttachment System wird für die Pipeline-Integration angepasst.

## 🎯 Bestehende Systeme erweitern (NICHT neu erstellen)

### 1. CampaignAssetAttachment Erweiterung
**Erweitert**: Bestehende `CampaignAssetAttachment` Interface

#### Interface Erweiterung
```typescript
// Erweitere src/types/media.ts
interface CampaignAssetAttachment {
  id: string;                    // Eigene ID (nicht Asset-ID!)
  type: 'asset' | 'folder';      // Asset oder ganzer Ordner
  assetId?: string;              // Referenz zum MediaAsset (optional)
  folderId?: string;             // Referenz zum MediaFolder (optional)
  
  // BESTEHENDE Metadaten-Snapshot Struktur
  metadata: {
    fileName?: string;
    folderName?: string;
    fileType?: string;
    description?: string;
    thumbnailUrl?: string;
    
    // NEUE Pipeline-spezifische Felder
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
    
    // Pipeline-Tracking
    attachedAt?: Timestamp;
    attachedInPhase?: 'ideas_planning' | 'creation' | 'internal_approval' | 'customer_approval' | 'distribution' | 'monitoring';
    lastVerified?: Timestamp;
    needsRefresh?: boolean;
  };
  
  // Pipeline-Integration
  projectId?: string;
  stageId?: string;
  isProjectWide?: boolean; // Asset für ganzes Projekt verfügbar
}
```

### 2. Project Interface Erweiterung
**Erweitert**: Bestehende `Project` Interface

#### Project Media-Integration
```typescript
// Erweitere src/types/project.ts
interface Project {
  // ... bestehende Felder
  
  // Projekt-weite Asset-Integration
  mediaConfig?: {
    allowAssetSharing: boolean; // Assets zwischen Kampagnen teilen
    assetLibraryId?: string;    // Projekt-spezifische Asset-Library
    defaultFolder?: string;     // Standard-Ordner für neue Assets
    assetNamingPattern?: string; // Naming-Convention
    assetRetentionDays?: number; // Asset-Aufbewahrung
  };
  
  // Aggregierte Asset-Daten (Performance-Optimierung)
  assetSummary?: {
    totalAssets: number;
    assetsByType: Record<string, number>; // {'image': 15, 'pdf': 3}
    lastAssetAdded?: Timestamp;
    storageUsed: number; // in Bytes
    topAssets: Array<{ assetId: string; fileName: string; usage: number }>;
  };
  
  // Asset-Library Verknüpfung
  sharedAssets?: CampaignAssetAttachment[]; // Projekt-weit verfügbare Assets
  assetFolders?: Array<{
    folderId: string;
    folderName: string;
    assetCount: number;
    lastModified: Timestamp;
  }>;
}
```

### 3. PRCampaign Interface Erweiterung
**Erweitert**: Bestehende `PRCampaign` Interface für Pipeline-Assets

#### PRCampaign Asset-Pipeline Integration
```typescript
// Erweitere src/types/pr.ts
interface PRCampaign {
  // ... bestehende Felder einschließlich attachedAssets: CampaignAssetAttachment[]
  
  // Pipeline-spezifische Asset-Features
  assetHistory?: Array<{
    action: 'added' | 'removed' | 'modified' | 'shared';
    assetId: string;
    fileName: string;
    timestamp: Timestamp;
    userId: string;
    userName: string;
    phase: string;
    reason?: string;
  }>;
  
  // Asset-Vererbung von Projekt
  inheritProjectAssets?: boolean;
  projectAssetFilter?: {
    includeTypes?: string[]; // ['image', 'pdf']
    excludeFolders?: string[];
    onlyVerified?: boolean;
  };
  
  // Asset-Validierung
  assetValidation?: {
    lastChecked?: Timestamp;
    missingAssets?: string[]; // Asset-IDs die nicht mehr verfügbar sind
    outdatedSnapshots?: string[]; // Attachments mit veralteten Metadaten
    validationStatus: 'valid' | 'needs_review' | 'invalid';
  };
}
```

### 4. Erweiterte Services
**Erweitert**: Bestehende Services mit Pipeline-Asset-Integration

#### mediaService Erweiterung
```typescript
// Erweitere src/lib/firebase/mediaService.ts
class MediaService {
  // ... bestehende Methoden
  
  // Pipeline-spezifische Asset-Methoden
  async createProjectAssetAttachment(
    assetId: string, 
    projectId: string, 
    phase: string
  ): Promise<CampaignAssetAttachment>
  
  async resolveAttachedAssets(
    attachments: CampaignAssetAttachment[], 
    validateAccess: boolean = true
  ): Promise<ResolvedAsset[]>
  
  async validateAssetAttachments(
    attachments: CampaignAssetAttachment[]
  ): Promise<AssetValidationResult>
  
  async refreshAssetSnapshots(
    attachments: CampaignAssetAttachment[]
  ): Promise<CampaignAssetAttachment[]>
  
  async getProjectAssetSummary(projectId: string): Promise<AssetSummary>
  
  async shareAssetToProject(
    assetId: string, 
    projectId: string, 
    permissions: AssetPermissions
  ): Promise<void>
  
  async getAssetUsageInProject(
    assetId: string, 
    projectId: string
  ): Promise<AssetUsageData>
}

interface ResolvedAsset {
  attachment: CampaignAssetAttachment;
  asset?: MediaAsset;
  isAvailable: boolean;
  hasChanged: boolean;
  needsRefresh: boolean;
  downloadUrl?: string;
  error?: string;
}

interface AssetValidationResult {
  isValid: boolean;
  missingAssets: string[];
  outdatedSnapshots: string[];
  validationErrors: string[];
  lastValidated: Timestamp;
}

interface AssetSummary {
  totalAssets: number;
  assetsByType: Record<string, number>;
  assetsByPhase: Record<string, number>;
  storageUsed: number;
  recentAssets: CampaignAssetAttachment[];
  topAssets: Array<{ assetId: string; fileName: string; usage: number }>;
}
```

#### projectService Erweiterung
```typescript
// Erweitere src/lib/firebase/projectService.ts
class ProjectService {
  // ... bestehende Methoden
  
  // Asset-Integration Methoden
  async updateProjectAssetSummary(projectId: string): Promise<void>
  async getProjectSharedAssets(projectId: string): Promise<CampaignAssetAttachment[]>
  async addSharedAssetToProject(projectId: string, assetAttachment: CampaignAssetAttachment): Promise<void>
  async removeSharedAssetFromProject(projectId: string, attachmentId: string): Promise<void>
  async validateProjectAssets(projectId: string): Promise<ProjectAssetValidation>
}

interface ProjectAssetValidation {
  projectId: string;
  totalAssets: number;
  validAssets: number;
  missingAssets: number;
  outdatedAssets: number;
  validationDetails: Array<{
    campaignId: string;
    campaignTitle: string;
    assetIssues: AssetValidationResult;
  }>;
}
```

## 🔧 Neue UI-Komponenten

### 1. Project Asset Gallery
**Datei**: `src/components/projects/assets/ProjectAssetGallery.tsx`
- Übersicht aller Projekt-Assets
- Gruppierung nach Phase und Typ
- Asset-Sharing zwischen Kampagnen
- Drag & Drop Asset-Zuordnung
- Bulk-Operations (Teilen, Löschen, Exportieren)

### 2. Asset Pipeline Status
**Datei**: `src/components/projects/assets/AssetPipelineStatus.tsx`
- Zeigt Asset-Verwendung durch Pipeline-Phasen
- Validation-Status pro Asset
- Missing Assets Warning
- Outdated Snapshots Detection
- Asset-History Timeline

### 3. Smart Asset Selector
**Datei**: `src/components/projects/assets/SmartAssetSelector.tsx`
- Erweitert bestehende AssetSelectorModal
- Projekt-weite Asset-Vorschläge
- Phase-spezifische Asset-Filter
- Auto-Tagging basierend auf Kontext
- Asset-Vererbung von Projekt

### 4. Asset Validation Panel
**Datei**: `src/components/projects/assets/AssetValidationPanel.tsx`
- Asset-Validation Dashboard
- One-Click Snapshot Refresh
- Missing Assets Recovery
- Batch-Validation für alle Projekt-Kampagnen
- Asset-Health Monitoring

### 5. Project Asset Settings
**Datei**: `src/components/projects/assets/ProjectAssetSettings.tsx`
- Media-Config Konfiguration
- Asset-Library Setup
- Naming-Convention Einstellungen
- Storage-Limits Management
- Asset-Sharing Policies

## 🔄 Seitenmodifikationen

### 1. Projekt-Detail Seite
**Erweitert**: `src/app/dashboard/projects/[projectId]/page.tsx`
- Neuer "Assets" Tab
- Project Asset Gallery Integration
- Asset-Validation Status
- Shared Assets Management

### 2. Campaign Editor
**Erweitert**: `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
- Smart Asset Selector Integration
- Project Asset Inheritance
- Asset-Pipeline-Status Anzeige
- Quick Asset Validation

### 3. Asset Selector Modal
**Erweitert**: `src/components/pr/AssetSelectorModal.tsx`
- Projekt-Kontext Detection
- Smart Asset Suggestions
- Pipeline-Phase Filtering
- Asset-Vererbung Options

### 4. Media Library
**Erweitert**: `src/app/dashboard/pr-tools/media-library/page.tsx`
- Project-Filter für Assets
- Pipeline-Phase Filter
- Asset-Usage Analytics
- Project Asset Assignment Tools

## 🎨 Design System Integration

### Asset-Pipeline Icons
```typescript
// Verwende /24/outline Icons
import {
  PhotoIcon,           // Asset Gallery
  FolderIcon,         // Asset Folders
  ShareIcon,          // Shared Assets
  ExclamationTriangleIcon, // Missing Assets
  ArrowPathIcon,      // Refresh Snapshots
  LinkIcon,          // Asset Linking
  ClipboardDocumentCheckIcon, // Validation
} from '@heroicons/react/24/outline';
```

### Asset-Status Badges
```typescript
// Erweitere bestehende Badge-Komponenten
const assetStatusConfig = {
  valid: { color: 'green', label: 'Gültig' },
  needs_refresh: { color: 'yellow', label: 'Update erforderlich' },
  missing: { color: 'red', label: 'Nicht verfügbar' },
  shared: { color: 'blue', label: 'Projekt-weit' },
  outdated: { color: 'orange', label: 'Veraltet' },
};
```

## 🧩 Besondere Implementierungsdetails

### 1. Metadaten-Snapshot Handling
```typescript
// Asset-Attachment mit Snapshot-Logik
const createAssetAttachment = async (
  asset: MediaAsset, 
  projectId: string, 
  phase: string
): Promise<CampaignAssetAttachment> => {
  return {
    id: nanoid(), // Neue Attachment-ID!
    type: 'asset',
    assetId: asset.id,
    projectId,
    metadata: {
      // Snapshot der aktuellen Asset-Daten
      fileName: asset.fileName,
      fileType: asset.fileType,
      thumbnailUrl: asset.thumbnailUrl,
      description: asset.description,
      
      // Pipeline-Tracking
      attachedAt: Timestamp.now(),
      attachedInPhase: phase,
      lastVerified: Timestamp.now(),
      needsRefresh: false,
      
      // Erweiterte Metadaten
      copyright: asset.copyright,
      author: asset.author,
      license: asset.license,
    }
  };
};
```

### 2. Asset-Auflösung mit Validation
```typescript
// Erweiterte Asset-Auflösung mit Pipeline-Kontext
const resolveAttachedAssets = async (
  attachments: CampaignAssetAttachment[],
  projectId: string
): Promise<ResolvedAsset[]> => {
  const resolvedAssets: ResolvedAsset[] = [];
  
  for (const attachment of attachments) {
    const resolved: ResolvedAsset = {
      attachment,
      isAvailable: false,
      hasChanged: false,
      needsRefresh: false,
    };
    
    try {
      if (attachment.type === 'asset' && attachment.assetId) {
        const currentAsset = await mediaService.getMediaAssetById(attachment.assetId);
        
        if (currentAsset) {
          resolved.asset = currentAsset;
          resolved.isAvailable = true;
          resolved.downloadUrl = currentAsset.downloadUrl;
          
          // Change Detection
          resolved.hasChanged = 
            attachment.metadata.fileName !== currentAsset.fileName ||
            attachment.metadata.fileType !== currentAsset.fileType;
          
          // Refresh Check
          const daysSinceLastVerified = (Date.now() - attachment.metadata.lastVerified.toMillis()) / (1000 * 60 * 60 * 24);
          resolved.needsRefresh = daysSinceLastVerified > 7 || resolved.hasChanged;
        }
      } else if (attachment.type === 'folder' && attachment.folderId) {
        const folderAssets = await mediaService.getMediaAssetsInFolder(attachment.folderId);
        resolved.isAvailable = folderAssets.length > 0;
        // Folder-Assets werden separat aufgelöst
      }
    } catch (error) {
      resolved.error = error.message;
    }
    
    resolvedAssets.push(resolved);
  }
  
  return resolvedAssets;
};
```

### 3. Asset-Vererbung zwischen Kampagnen
```typescript
// Project Asset Sharing Logic
const shareAssetToProject = async (
  assetAttachment: CampaignAssetAttachment,
  projectId: string
) => {
  // Asset zu Projekt-weiten Assets hinzufügen
  const sharedAttachment = {
    ...assetAttachment,
    id: nanoid(), // Neue ID für geteiltes Asset
    isProjectWide: true,
    metadata: {
      ...assetAttachment.metadata,
      attachedAt: Timestamp.now(),
      attachedInPhase: 'project_shared',
    }
  };
  
  await projectService.addSharedAssetToProject(projectId, sharedAttachment);
  
  // Asset-History aktualisieren
  await trackAssetAction({
    action: 'shared',
    assetId: assetAttachment.assetId,
    projectId,
    userId: getCurrentUserId(),
    phase: 'shared',
    reason: 'Made available project-wide'
  });
};
```

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose`
- **Aufgabe:**
  1. CampaignAssetAttachment Interface um Pipeline-Felder erweitern
  2. Project Interface um Media-Integration erweitern
  3. PRCampaign Interface um Asset-Pipeline erweitern
  4. mediaService um Pipeline-Asset-Methoden erweitern
  5. projectService um Asset-Integration erweitern
  6. Alle 5 neuen UI-Komponenten implementieren
  7. 4 bestehende Seiten um Asset-Pipeline erweitern
- **Dauer:** 4-5 Tage

### SCHRITT 2: DOKUMENTATION
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Media-Assets-Feature-Status aktualisieren, Masterplan synchronisieren
- **Dauer:** 0.5 Tage

### SCHRITT 3: TYPESCRIPT VALIDATION
- **Agent:** `general-purpose`
- **Aufgabe:** `npm run typecheck` + alle Fehler beheben
- **Erfolgskriterium:** ZERO TypeScript-Errors

### SCHRITT 4: TEST-COVERAGE
- **Agent:** `test-writer`
- **Aufgabe:** Tests bis 100% Coverage implementieren
  - Asset-Attachment Creation Tests
  - Asset-Resolution Logic Tests
  - Asset-Validation Tests
  - Project Asset Sharing Tests
  - Snapshot Refresh Tests
- **Erfolgskriterium:** `npm test` → ALL PASS

### SCHRITT 5: PLAN-ABSCHLUSS
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Plan als "✅ COMPLETED" markieren

## 🔐 Sicherheit & Multi-Tenancy
- Alle Asset-Attachments mit `organizationId` isoliert
- Asset-Zugriff über bestehende Firebase Rules validiert
- Projekt-Asset-Sharing nur innerhalb Organization
- Asset-History mit User-Tracking für Audit-Trail

## 📊 Erfolgskriterien
- ✅ Bestehende CampaignAssetAttachment Architektur erweitert (nicht ersetzt)
- ✅ Asset-Snapshots funktionieren mit Pipeline-Kontext
- ✅ Asset-Vererbung zwischen Kampagnen implementiert
- ✅ Asset-Validation und Refresh-Logic aktiv
- ✅ Project Asset Gallery voll funktionsfähig
- ✅ Multi-Tenancy vollständig implementiert
- ✅ Performance durch Asset-Caching optimiert
- ✅ ZERO Breaking Changes für bestehende Asset-Workflows

## 💡 Technische Hinweise
- **BESTEHENDE Attachment-Architektur nutzen** - nur erweitern!
- **Metadaten-Snapshot-Konzept beibehalten** für historische Konsistenz
- **1:1 Umsetzung** aus Media-Assets-Besonderheiten-Dokumentation.md
- **Ordner-Asset-Auflösung** zur Laufzeit wie bisher
- **Firebase Storage URLs cachen** für Performance
- **Legacy-Kompatibilität** für userId-Fallbacks beachten
- **Design System v2.0 konsequent verwenden**
- **Nur /24/outline Icons verwenden**