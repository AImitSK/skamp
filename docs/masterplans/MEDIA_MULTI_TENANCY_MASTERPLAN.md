# MASTERPLAN: Media-System Multi-Tenancy-Refaktoring

## 🎯 ÜBERSICHT

Das Media-System in CeleroPress weist **kritische Multi-Tenancy-Inkonsistenzen** auf. Während die Grundarchitektur korrekt implementiert ist, gibt es verschiedene Upload-Systeme, Fallback-Mechanismen und Storage-Pfade, die nicht einheitlich sind.

**KRITISCHES PROBLEM:**
- 5 verschiedene Upload-Systeme verwenden unterschiedliche Storage-Pfade
- Fallback-Logik fällt auf `userId` zurück statt korrekter `organizationId`
- Profile-Upload verwendet komplett separates System
- Verschiedene Services verwenden unterschiedliche Ansätze

**🚀 NEUE ZIEL-VISION: HYBRID PROJEKT-ZENTRIERTE MEDIA-ARCHITEKTUR**

Nach der Analyse des bestehenden Projekt-Ordnerstruktur-Systems wurde eine **revolutionäre Erkenntnis** gewonnen: Die bereits implementierte automatische Projekt-Ordnerstruktur ist **Multi-Tenancy-konform** und **ideal** als Master-System für alle Upload-Funktionen geeignet.

**HYBRID-STRATEGIE für maximale Flexibilität:**
- **Projekt-Ordnerstruktur als Standard** für organisierte Uploads
- **"Unzugeordnet"-Bereich** für spontane/projektlose Uploads
- **Smart-Migration-System** für nachträgliche Projekt-Zuordnung
- **Context-aware Upload-Router** der automatisch entscheidet wohin
- **Flexible Workflows** ohne Zwang zur Projekt-Erstellung

## 🔍 PROBLEM-ANALYSE

### AKTUELLE STORAGE-PFAD-STRUKTUR

| System | Aktueller Pfad | Korrekt? | Problem |
|--------|---------------|----------|---------|
| **Media Library** | `organizations/{organizationId}/media/` | ✅ | Fallback auf userId |
| **PR Campaign Media** | `organizations/{organizationId}/media/` | ✅ | Korrekt implementiert |
| **Project Assets** | `organizations/{organizationId}/projects/{projectId}/` | ✅ | Korrekt implementiert |
| **Profile Upload** | `organizations/{organizationId}/profiles/{userId}/` | ⚠️ | Separates System |
| **PDF Generation** | `organizations/{organizationId}/pdfs/` | ✅ | Korrekt implementiert |

### 🎯 ZIEL-STORAGE-STRUKTUR: HYBRID PROJEKT-ZENTRIERT

**NEUE Hybrid-Ordnerstruktur mit Flexibilität:**
```
📁 organizations/{organizationId}/media/
├── 📁 Projekte/ ← ORGANISIERTE Uploads
│   └── 📁 P-{YYYYMMDD}-{CompanyName}-{ProjectTitle}/
│       ├── 📁 Medien/
│       │   ├── 📁 Campaign-{campaignId}/ ← Campaign-spezifische Ordner
│       │   │   ├── 📁 Key-Visuals/
│       │   │   └── 📁 Anhänge/
│       │   └── 📁 Assets/ ← Allgemeine Projekt-Medien
│       ├── 📁 Dokumente/
│       │   ├── 📁 Briefings/
│       │   ├── 📁 Konzepte/
│       │   └── 📁 KI-Austausch/ ← KI-Assistent Integration
│       └── 📁 Pressemeldungen/
│           └── 📁 Campaign-{campaignId}/ ← Campaign-spezifische PDFs
│               ├── 📁 Entwürfe/
│               ├── 📁 Freigaben/
│               └── 📁 Finale-PDFs/
├── 📁 Unzugeordnet/ ← FLEXIBLE Uploads - MAXIMALE BENUTZERFREUNDLICHKEIT (NEU!)
│   ├── 📁 Campaigns/ ← Campaigns ohne Projekt mit vollständiger Struktur
│   │   └── 📁 Campaign-{campaignId}/
│   │       ├── 📁 Medien/
│   │       │   ├── 📁 Key-Visuals/ ← Hauptbilder für PR-Kampagnen
│   │       │   ├── 📁 Anhänge/ ← Zusätzliche Medien-Dateien
│   │       │   ├── 📁 Logos/ ← Brand-Assets
│   │       │   └── 📁 Social-Media/ ← Platform-spezifische Formate
│   │       ├── 📁 Dokumente/
│   │       │   ├── 📁 Briefings/ ← Kampagnen-Briefings
│   │       │   ├── 📁 Konzepte/ ← Strategische Dokumente
│   │       │   └── 📁 Verträge/ ← Legal-Dokumente
│   │       └── 📁 PDFs/
│   │           ├── 📁 Entwürfe/ ← Work-in-Progress PDFs
│   │           ├── 📁 Freigaben/ ← Zur Freigabe eingereichte PDFs
│   │           └── 📁 Finale-PDFs/ ← Approved und veröffentlichte PDFs
│   ├── 📁 Spontane-Uploads/ ← Ad-hoc Medien ohne spezifischen Context
│   │   ├── 📁 {YYYY-MM}/ ← Monatsbasierte Organisation für bessere Übersicht
│   │   │   ├── 📁 Bilder/
│   │   │   ├── 📁 Videos/
│   │   │   ├── 📁 Dokumente/
│   │   │   └── 📁 Sonstiges/
│   │   └── 📁 Favoriten/ ← Oft verwendete Assets
│   ├── 📁 Profile/ ← Profile-Images (migriert aus altem System)
│   │   └── 📁 {userId}/ ← User-spezifische Ordner für Profile-Assets
│   │       ├── avatar.{ext} ← Hauptprofil-Bild
│   │       ├── cover.{ext} ← Banner/Cover-Bild (optional)
│   │       └── 📁 Historie/ ← Vorherige Profile-Bilder
│   └── 📁 KI-Sessions/ ← ZUKÜNFTIGE Integration für KI-Assistent
│       └── 📁 Session-{sessionId}/
│           ├── 📁 Input/ ← User-bereitgestellte Dateien
│           ├── 📁 Output/ ← KI-generierte Assets
│           └── 📁 Kontext/ ← Session-Metadata und Chat-Verlauf
└── 📁 Legacy/ ← Migration und Archiv
    ├── 📁 Alte-Uploads/ ← Bestehende Dateien vor Migration
    └── 📁 Verschoben/ ← Bei Projekt-Zuordnungs-Änderungen
```

**HYBRID Upload-Zuordnung mit intelligenter Routing:**
| Upload-Typ | MIT Projekt | OHNE Projekt | Upload-Router Logik |
|------------|-------------|---------------|---------------------|
| **Campaign Key-Visual** | `P-{project}/Medien/Campaign-{id}/Key-Visuals/` | `Unzugeordnet/Campaigns/Campaign-{id}/Medien/Key-Visuals/` | `context.projectId ? getProjectPath() : getUnassignedPath()` |
| **Campaign Attachments** | `P-{project}/Medien/Campaign-{id}/Anhänge/` | `Unzugeordnet/Campaigns/Campaign-{id}/Medien/Anhänge/` | Gleiche Logik, andere Kategorie |
| **PDF Freigaben** | `P-{project}/Pressemeldungen/Campaign-{id}/Freigaben/` | `Unzugeordnet/Campaigns/Campaign-{id}/PDFs/` | PDF-Context-aware Routing |
| **Spontane Medien** | `P-{project}/Medien/Assets/` | `Unzugeordnet/Spontane-Uploads/` | Fallback für Media Library |
| **Profile Images** | `Unzugeordnet/Profile/{userId}/` | `Unzugeordnet/Profile/{userId}/` | Profile sind organisationsübergreifend |
| **KI-Assistent Docs** | `P-{project}/Dokumente/KI-Austausch/` | `Unzugeordnet/KI-Sessions/` | Zukünftige Integration |

**REVOLUTIONÄRES SMART-MIGRATION-SYSTEM:**

Das Smart-Migration-System ist das Herzstück der Hybrid-Flexibilität. Es ermöglicht nahtlose Asset-Verschiebung ohne Workflow-Unterbrechung:

**AUTOMATISCHE MIGRATION-TRIGGER:**
| Trigger-Event | Source-Path | Target-Path | Smart-Migration-Logic |
|---------------|-------------|-------------|----------------------|
| **Campaign → Projekt zuordnen** | `Unzugeordnet/Campaigns/Campaign-{id}/` | `P-{project}/Medien+Pressemeldungen/Campaign-{id}/` | Vollständige Asset-Familie verschieben: Medien, Dokumente, PDFs |
| **Campaign → Projekt wechseln** | `P-{oldProject}/*/Campaign-{id}/` | `P-{newProject}/*/Campaign-{id}/` | Cross-Project Migration mit Asset-Integrity-Check |
| **Projekt löschen** | `P-{project}/` | `Legacy/Projekt-{id}-{date}/` | Sichere Archivierung statt Löschung |
| **Spontan → Campaign zuordnen** | `Unzugeordnet/Spontane-Uploads/` | `Unzugeordnet/Campaigns/Campaign-{id}/Medien/` | Asset-Context-Upgrade |
| **Campaign → Spontan rückführen** | `*/Campaigns/Campaign-{id}/` | `Unzugeordnet/Spontane-Uploads/{YYYY-MM}/` | Context-Downgrade bei Campaign-Löschung |

**SMART-DECISION-ENGINE:**
```typescript
interface SmartMigrationEngine {
  // Analyse-Funktionen
  analyzeAssetContext(asset: MediaAsset): AssetContext;
  suggestOptimalLocation(asset: MediaAsset, availableProjects: Project[]): LocationSuggestion;
  calculateMigrationConfidence(suggestion: LocationSuggestion): number; // 0-100%
  
  // Migration-Entscheidungen
  decideMigrationPath(assets: MediaAsset[], context: MigrationContext): MigrationPlan;
  validateMigrationIntegrity(plan: MigrationPlan): ValidationResult;
  
  // Execution
  executeMigration(plan: MigrationPlan): Promise<MigrationResult>;
  rollbackMigration(migrationId: string): Promise<void>;
}

interface LocationSuggestion {
  targetPath: string;
  confidence: number;
  reason: string;
  alternativeOptions: string[];
  estimatedBenefit: 'high' | 'medium' | 'low';
}

interface AssetContext {
  uploadTimestamp: Date;
  originalFilename: string;
  tags: string[];
  uploaderUserId: string;
  relatedCampaignId?: string;
  relatedProjectId?: string;
  fileSize: number;
  fileType: string;
  accessHistory: AccessEvent[];
}
```

**MIGRATION-CONFIDENCE-ALGORITHMUS:**
```typescript
// Smart-Confidence-Scoring für automatische vs. manuelle Migration
function calculateMigrationConfidence(asset: MediaAsset, targetProject: Project): number {
  let confidence = 0;
  
  // Zeitstempel-Matching (40% Gewichtung)
  const timeDistance = Math.abs(asset.uploadedAt - targetProject.createdAt);
  if (timeDistance < 24 * 60 * 60 * 1000) confidence += 40; // Gleicher Tag
  else if (timeDistance < 7 * 24 * 60 * 60 * 1000) confidence += 25; // Gleiche Woche
  
  // Tag-Overlap (30% Gewichtung)
  const tagOverlap = asset.tags.filter(tag => targetProject.tags.includes(tag)).length;
  confidence += Math.min(30, tagOverlap * 10);
  
  // Filename-Pattern-Matching (20% Gewichtung)
  if (asset.filename.includes(targetProject.company) || 
      asset.filename.includes(targetProject.title)) {
    confidence += 20;
  }
  
  // User-Upload-History (10% Gewichtung)
  if (targetProject.teamMembers.includes(asset.uploadedBy)) confidence += 10;
  
  return Math.min(100, confidence);
}
```

**MIGRATION-STRATEGIEN nach Confidence-Level:**
| Confidence | Strategie | Aktion |
|------------|-----------|---------|
| **90-100%** | 🤖 **Automatisch** | Sofortige Migration ohne User-Bestätigung |
| **70-89%** | ⚡ **Empfohlen** | User-Benachrichtigung mit "Auto-Apply in 24h" |
| **50-69%** | 🤔 **Vorgeschlagen** | User-Bestätigung erforderlich, aber empfohlen |
| **30-49%** | ⚠️ **Unsicher** | User-Entscheidung mit Warnung "Geringe Confidence" |
| **0-29%** | ❌ **Abgelehnt** | Keine Zuordnung, Asset bleibt in `Unzugeordnet/` |

### IDENTIFIZIERTE PROBLEME

#### 🚨 KRITISCH - Fallback-Logik in Media Library
```typescript
// PROBLEM: src/app/dashboard/pr-tools/media-library/page.tsx:46
const [assets, folders] = await Promise.all([
  mediaService.getAssetsByOrganization(currentOrganization?.id || user.uid), // FALLBACK AUF userId!
  mediaService.getFoldersByOrganization(currentOrganization?.id || user.uid)
]);
```

#### 🚨 KRITISCH - Profile-Upload verwendet eigenes System
```typescript
// PROBLEM: src/lib/services/profile-image-service.ts
// Verwendet komplett separaten Service statt media-service
```

#### ⚠️ MEDIUM - Inconsistente Service-Imports
```typescript
// In verschiedenen Dateien:
import { mediaService } from '@/lib/firebase/media-service'; // Korrekt
import { profileImageService } from '@/lib/services/profile-image-service'; // Separates System
```

### BETROFFENE DATEIEN (36 DATEIEN)

#### 📁 SERVICES (10 DATEIEN)
1. `src/lib/firebase/media-service.ts` - ✅ KORREKT
2. `src/lib/services/profile-image-service.ts` - ❌ SEPARATES SYSTEM
3. `src/lib/firebase/project-service.ts` - ⚠️ MIXED USAGE
4. `src/lib/firebase/pr-service.ts` - ✅ KORREKT
5. `src/lib/firebase/document-content-service.ts` - ⚠️ PRÜFEN
6. `src/lib/firebase/pdf-versions-service.ts` - ✅ KORREKT
7. `src/lib/firebase/branding-service.ts` - ⚠️ PRÜFEN
8. `src/lib/firebase/strategy-document-service.ts` - ⚠️ PRÜFEN
9. `src/lib/firebase/approval-service.ts` - ⚠️ PRÜFEN
10. `src/lib/firebase/organization-service.ts` - ⚠️ PRÜFEN

#### 🖥️ UI KOMPONENTEN (15 DATEIEN)
1. `src/app/dashboard/pr-tools/media-library/page.tsx` - ❌ FALLBACK PROBLEM
2. `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx` - ⚠️ PRÜFEN
3. `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` - ⚠️ PRÜFEN  
4. `src/app/dashboard/projects/[projectId]/page.tsx` - ⚠️ PRÜFEN
5. `src/app/dashboard/projects/page.tsx` - ⚠️ PRÜFEN
6. `src/app/dashboard/admin/profile/page.tsx` - ❌ SEPARATES SYSTEM
7. `src/components/mediathek/MediaLibraryMain.tsx` - ⚠️ PRÜFEN
8. `src/components/mediathek/UploadModal.tsx` - ⚠️ PRÜFEN
9. `src/components/mediathek/ShareModal.tsx` - ⚠️ PRÜFEN
10. `src/components/mediathek/AssetDetailsModal.tsx` - ⚠️ PRÜFEN
11. `src/components/projects/ProjectFoldersView.tsx` - ⚠️ PRÜFEN
12. `src/components/projects/creation/ProjectCreationWizard.tsx` - ⚠️ PRÜFEN
13. `src/components/projects/edit/ProjectEditWizard.tsx` - ⚠️ PRÜFEN
14. `src/components/pr/email/EmailEditor.tsx` - ⚠️ PRÜFEN
15. `src/components/admin/ProfileForm.tsx` - ❌ SEPARATES SYSTEM

#### 🧪 TESTS (11 DATEIEN)
1. `src/__tests__/media-library-management.test.tsx` - ⚠️ ANPASSEN
2. `src/lib/firebase/__tests__/project-service*.test.ts` - ⚠️ ANPASSEN
3. `src/lib/firebase/__tests__/strategy-document-service.test.ts` - ⚠️ ANPASSEN
4. Weitere Test-Dateien mit Media-Funktionen

## 🎯 REFACTORING-ZIELE

### PRIMÄRZIELE
1. **Einheitliche Storage-Pfade** - Alle Systeme verwenden `organizations/{organizationId}/`
2. **Eliminierung von Fallback-Logik** - Keine `userId` Fallbacks mehr
3. **Konsolidierung der Upload-Services** - Ein zentraler MediaService für alle Uploads
4. **Konsistente Multi-Tenancy** - OrganizationId wird überall korrekt verwendet

### SEKUNDÄRZIELE  
1. **Vereinheitlichung der APIs** - Gleiche Service-Methoden für alle Upload-Typen
2. **Verbesserung der Type-Safety** - Strikte TypeScript-Typisierung
3. **Test-Coverage** - 100% Test-Abdeckung für alle geänderten Services
4. **Performance-Optimierung** - Reduzierung redundanter Upload-Logik

## 📋 IMPLEMENTIERUNGS-PLAN

### PHASE 0: PROJEKT-INTEGRATION VORBEREITUNG (NEU - FUNDAMENTAL)

**Diese neue Phase wurde nach der Analyse der Projekt-Ordnerstruktur hinzugefügt. Sie ist die Grundlage für alle weiteren Phasen.**

#### 0.1 Project-Context-Provider Implementation
**DATEIEN:** 
- `src/context/ProjectContext.tsx` (NEU)
- `src/components/projects/ProjectSelector.tsx` (ERWEITERN)
- `src/app/layout.tsx` (Context integrieren)

**NEUE INTERFACES:**
```typescript
interface ProjectUploadContext {
  organizationId: string;
  userId: string;
  projectId?: string; // NEU: Projekt-Kontext
  category: 'media' | 'documents' | 'press'; // NEU: Upload-Kategorie
  subCategory?: string; // NEU: z.B. 'key-visual', 'attachment'
}

interface ProjectContextValue {
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  projectMediaFolder: string | null;
  projectDocumentsFolder: string | null;
  projectPressFolder: string | null;
  getProjectUploadPath: (category: string, subCategory?: string) => string;
}
```

#### 0.2 Project-Service Erweiterung für Ordner-Management
**DATEIEN:**
- `src/lib/firebase/project-service.ts` (ERWEITERN)

**NEUE METHODEN:**
```typescript
// Erweiterte Project-Service Methoden:
async getProjectMediaFolder(projectId: string, context: {organizationId: string}): Promise<string>
async getProjectDocumentsFolder(projectId: string, context: {organizationId: string}): Promise<string>
async getProjectPressFolder(projectId: string, context: {organizationId: string}): Promise<string>
async ensureProjectSubfolder(projectId: string, category: string, subCategory: string): Promise<string>
async getProjectFolderPath(projectId: string, category: 'media'|'documents'|'press', subCategory?: string): Promise<string>
```

#### 0.3 Media-Service Hybrid-Integration
**DATEIEN:**
- `src/lib/firebase/media-service.ts` (ERWEITERN)

**DETAILLIERTE SMART UPLOAD-ROUTER-LOGIK:**
```typescript
// === KERN-SYSTEM: SMART UPLOAD-ROUTER ===
async smartUpload(file: File, context: HybridUploadContext): Promise<MediaAsset> {
  // 1. Upload-Pfad-Entscheidung basierend auf Context
  const uploadPath = await this.resolveUploadPath(context);
  
  // 2. Storage-Upload durchführen
  const downloadURL = await this.uploadFileToStorage(file, uploadPath);
  
  // 3. Asset-Metadata erstellen
  const asset = await this.createAssetDocument(file, downloadURL, context, uploadPath);
  
  // 4. Smart-Migration-Check (falls applicable)
  if (context.autoMigrationEnabled && !context.projectId) {
    await this.queueMigrationAnalysis(asset);
  }
  
  return asset;
}

// === INTELLIGENTE UPLOAD-PFAD-RESOLVER ===
async resolveUploadPath(context: HybridUploadContext): Promise<string> {
  const basePath = `organizations/${context.organizationId}/media/`;
  
  // DECISION TREE für Upload-Routing:
  
  // 1. PROJEKT-KONTEXT vorhanden? → Projekt-Ordner-Struktur
  if (context.projectId && context.uploadStrategy !== 'unassigned-preferred') {
    return await this.resolveProjectUploadPath(context.projectId, context);
  }
  
  // 2. CAMPAIGN-KONTEXT ohne Projekt? → Unzugeordnet/Campaigns/
  if (context.campaignId && !context.projectId) {
    return await this.resolveCampaignUploadPath(context.campaignId, context);
  }
  
  // 3. PROFILE-UPLOAD? → Unzugeordnet/Profile/
  if (context.category === 'profile') {
    return `${basePath}Unzugeordnet/Profile/${context.userId}/`;
  }
  
  // 4. SPONTANER UPLOAD? → Unzugeordnet/Spontane-Uploads/
  if (context.category === 'spontaneous') {
    const monthFolder = new Date().toISOString().substr(0, 7); // YYYY-MM
    const subCategoryPath = context.subCategory || 'Sonstiges';
    return `${basePath}Unzugeordnet/Spontane-Uploads/${monthFolder}/${subCategoryPath}/`;
  }
  
  // 5. FALLBACK: Unzugeordnet/Spontane-Uploads/
  const monthFolder = new Date().toISOString().substr(0, 7);
  return `${basePath}Unzugeordnet/Spontane-Uploads/${monthFolder}/Unbekannt/`;
}

// === PROJEKT-SPEZIFISCHE PFAD-RESOLUTION ===
async resolveProjectUploadPath(projectId: string, context: HybridUploadContext): Promise<string> {
  // Projekt-Basis-Ordner ermitteln
  const project = await this.projectService.getProjectById(projectId, context.organizationId);
  const projectFolderName = this.generateProjectFolderName(project);
  
  const basePath = `organizations/${context.organizationId}/media/Projekte/${projectFolderName}/`;
  
  // KATEGORIE-BASIERTE SUB-PFAD-LOGIK:
  switch (context.category) {
    case 'media':
      if (context.campaignId) {
        // Campaign-spezifische Medien in Projekt
        const subCategory = context.subCategory || 'Assets';
        return `${basePath}Medien/Campaign-${context.campaignId}/${subCategory}/`;
      } else {
        // Allgemeine Projekt-Medien
        return `${basePath}Medien/Assets/`;
      }
      
    case 'documents':
      if (context.campaignId) {
        return `${basePath}Dokumente/Campaign-${context.campaignId}/`;
      } else {
        const subCategory = context.subCategory || 'Allgemein';
        return `${basePath}Dokumente/${subCategory}/`;
      }
      
    case 'press':
      if (context.campaignId) {
        const subCategory = context.subCategory || 'Entwürfe';
        return `${basePath}Pressemeldungen/Campaign-${context.campaignId}/${subCategory}/`;
      } else {
        return `${basePath}Pressemeldungen/Allgemein/`;
      }
      
    default:
      return `${basePath}Medien/Assets/`;
  }
}

// === CAMPAIGN-SPEZIFISCHE PFAD-RESOLUTION (Unzugeordnet) ===
async resolveCampaignUploadPath(campaignId: string, context: HybridUploadContext): Promise<string> {
  const basePath = `organizations/${context.organizationId}/media/Unzugeordnet/Campaigns/Campaign-${campaignId}/`;
  
  // KATEGORIE-MAPPING für Campaign-Assets:
  const categoryMap = {
    'media': 'Medien',
    'documents': 'Dokumente', 
    'press': 'PDFs'
  };
  
  const categoryFolder = categoryMap[context.category] || 'Medien';
  const subCategory = context.subCategory || '';
  
  return subCategory 
    ? `${basePath}${categoryFolder}/${subCategory}/`
    : `${basePath}${categoryFolder}/`;
}

// === ERWEITERTE UPLOAD-METHODEN ===
// Projekt-spezifische Upload-Methoden:
async uploadAssetToProject(file: File, context: ProjectUploadContext): Promise<MediaAsset> {
  // Strikte Projekt-Upload-Logik ohne Fallback auf Unzugeordnet
  const uploadPath = await this.resolveProjectUploadPath(context.projectId, context);
  const downloadURL = await this.uploadFileToStorage(file, uploadPath);
  return await this.createAssetDocument(file, downloadURL, context, uploadPath);
}

async ensureProjectSubfolder(projectId: string, category: string, subCategory?: string): Promise<string> {
  // Projekt-Unterordner-Strukturen automatisch erstellen falls nicht vorhanden
  const folderPath = await this.resolveProjectUploadPath(projectId, { category, subCategory });
  await this.ensureStorageFolderExists(folderPath);
  return folderPath;
}

// Unzugeordnet-Bereich Upload-Methoden:
async uploadAssetUnassigned(file: File, context: UnassignedUploadContext): Promise<MediaAsset> {
  // Flexible Upload-Logik für Unzugeordnet-Bereich
  const uploadPath = await this.resolveUnassignedUploadPath(context);
  const downloadURL = await this.uploadFileToStorage(file, uploadPath);
  
  // Asset mit Migration-Bereitschaft markieren
  const asset = await this.createAssetDocument(file, downloadURL, context, uploadPath);
  asset.migrationReadiness = context.migrationReadiness || 'ready';
  
  return asset;
}

async ensureUnassignedFolder(category: string, identifier?: string): Promise<string> {
  // Unzugeordnet-Ordner-Strukturen automatisch erstellen
  const context = { category, identifier } as UnassignedUploadContext;
  const folderPath = await this.resolveUnassignedUploadPath(context);
  await this.ensureStorageFolderExists(folderPath);
  return folderPath;
}

// Migration-Management:
async migrateCampaignToProject(campaignId: string, fromProjectId: string | null, toProjectId: string): Promise<MigrationResult> {
  // Vollständige Campaign-Asset-Migration zwischen Projekten oder von Unzugeordnet zu Projekt
  const migrationPlan = await this.createCampaignMigrationPlan(campaignId, fromProjectId, toProjectId);
  return await this.executeMigration(migrationPlan);
}

async getUnassignedAssets(organizationId: string): Promise<MediaAsset[]> {
  // Alle Assets im Unzugeordnet-Bereich finden, die für Migration geeignet sind
  return await this.queryAssetsInPath(`organizations/${organizationId}/media/Unzugeordnet/`);
}

async suggestProjectForAsset(asset: MediaAsset, availableProjects: Project[]): Promise<Project | null> {
  // Smart-Suggestion basierend auf Asset-Context und verfügbaren Projekten
  const suggestions = await Promise.all(
    availableProjects.map(project => ({
      project,
      confidence: this.calculateMigrationConfidence(asset, project)
    }))
  );
  
  // Beste Suggestion mit Mindest-Confidence zurückgeben
  const bestSuggestion = suggestions
    .filter(s => s.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence)[0];
    
  return bestSuggestion?.project || null;
}
```

#### 0.4 Upload-Context-System mit Campaign-Flexibilität (NEU)
**DATEIEN:**
- `src/types/media.ts` (ERWEITERN)
- `src/types/campaign.ts` (ERWEITERN)

**ERWEITERTE CONTEXT-INTERFACES mit Campaign-Flexibilität:**
```typescript
// Basis-Context für alle Uploads
interface BaseUploadContext {
  organizationId: string;
  userId: string;
  timestamp?: Date;
  migrationMetadata?: MigrationMetadata; // Für Smart-Migration-System
}

// REVOLUTIONÄRER Hybrid-Context: Maximale Flexibilität!
interface HybridUploadContext extends BaseUploadContext {
  projectId?: string; // Optional - Kernfunktion des Hybrid-Systems
  campaignId?: string;
  category: 'media' | 'documents' | 'press' | 'profile' | 'spontaneous';
  subCategory?: string;
  
  // NEU: Campaign-Flexibilität
  campaignContext?: CampaignUploadContext;
  uploadStrategy: 'project-first' | 'flexible' | 'unassigned-preferred';
  autoMigrationEnabled?: boolean; // User-Präferenz für automatische Migration
}

// Projekt-spezifischer Context (strikt organisiert)
interface ProjectUploadContext extends BaseUploadContext {
  projectId: string; // Required
  campaignId?: string;
  category: 'media' | 'documents' | 'press';
  subCategory?: string;
  
  // NEU: Project-Campaign-Integration
  campaignContext?: {
    campaignTitle: string;
    campaignType: 'pr' | 'marketing' | 'event' | 'crisis';
    expectedAssetTypes: string[];
  };
}

// Flexible Unzugeordnet-Context für Campaign-Workflows
interface UnassignedUploadContext extends BaseUploadContext {
  campaignId?: string;
  category: 'campaigns' | 'spontaneous' | 'profile' | 'ki-sessions';
  identifier?: string; // campaignId, userId, sessionId, etc.
  
  // NEU: Migration-Readiness
  migrationReadiness: 'ready' | 'pending' | 'locked';
  suggestedProjectIds?: string[]; // Für Smart-Migration-Suggestions
}

// Campaign-spezifischer Upload-Context (FLEXIBEL)
interface CampaignUploadContext {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: 'draft' | 'active' | 'completed' | 'archived';
  
  // HYBRID-LOGIC: Projekt optional!
  associatedProjectId?: string; // Kann null sein - Campaign ohne Projekt!
  
  // Asset-Organization
  expectedAssetStructure: {
    keyVisualsRequired: boolean;
    attachmentsAllowed: boolean;
    documentsRequired: boolean;
    pdfGenerationEnabled: boolean;
  };
  
  // Smart-Migration Settings
  autoProjectAssignment: boolean; // Auto-Zuordnung zu passendem Projekt
  migrationPreference: 'stay-flexible' | 'prefer-organization' | 'force-project';
}

// Migration-Metadata für Smart-Decision-Engine
interface MigrationMetadata {
  originalUploadPath: string;
  migrationAttempts: number;
  lastMigrationSuggestion?: Date;
  userMigrationPreferences?: {
    preferredProjectId?: string;
    autoAcceptConfidence: number; // Schwellwert für automatische Migration
    migrationNotifications: boolean;
  };
}
```

**CAMPAIGN-WORKFLOW-FLEXIBILITY:**
```typescript
// Campaign kann in 3 Modi existieren:
type CampaignMode = 
  | 'project-linked'    // Campaign gehört zu spezifischem Projekt
  | 'project-flexible'  // Campaign kann Projekt zugeordnet werden
  | 'standalone';       // Campaign bewusst ohne Projekt (spontan)

interface EnhancedCampaign {
  id: string;
  title: string;
  organizationId: string;
  
  // HYBRID-KERN: Projekt ist optional!
  projectId?: string;
  campaignMode: CampaignMode;
  
  // Upload-Pfad-Logik
  getUploadPath(category: string, subCategory?: string): string {
    if (this.projectId && this.campaignMode !== 'standalone') {
      // Organisierte Campaign in Projekt-Struktur
      return `organizations/${this.organizationId}/media/Projekte/P-{project}/Medien/Campaign-${this.id}/${category}/`;
    } else {
      // Flexible Campaign in Unzugeordnet-Bereich
      return `organizations/${this.organizationId}/media/Unzugeordnet/Campaigns/Campaign-${this.id}/${category}/`;
    }
  }
  
  // Smart-Migration zu Projekt
  async migrateToProject(targetProjectId: string, migrationEngine: SmartMigrationEngine): Promise<MigrationResult> {
    return await migrationEngine.migrateCampaignAssets(this.id, null, targetProjectId);
  }
}
```

### PHASE 1: SERVICE-LAYER KONSOLIDIERUNG (KRITISCH)

#### 1.1 Profile-Image-Service Migration
**DATEIEN:** 
- `src/lib/services/profile-image-service.ts` → `src/lib/firebase/media-service.ts`
- `src/app/dashboard/admin/profile/page.tsx`
- `src/components/admin/ProfileForm.tsx`

**ÄNDERUNGEN:**
```typescript
// ALT: Separater Service
import { profileImageService } from '@/lib/services/profile-image-service';

// NEU: Unified Media Service
import { mediaService } from '@/lib/firebase/media-service';

// Neue Methoden in media-service.ts:
async uploadProfileImage(file: File, userId: string, organizationId: string): Promise<string>
async deleteProfileImage(userId: string, organizationId: string): Promise<void>
async getProfileImageUrl(userId: string, organizationId: string): Promise<string | null>
```

#### 1.2 Media Library Fallback-Elimination  
**DATEIEN:**
- `src/app/dashboard/pr-tools/media-library/page.tsx`
- `src/components/mediathek/*.tsx`

**ÄNDERUNGEN:**
```typescript
// ALT: Gefährlicher Fallback
const assets = await mediaService.getAssetsByOrganization(currentOrganization?.id || user.uid);

// NEU: Strikte Validierung
if (!currentOrganization?.id) {
  throw new Error('Organization not found');
}
const assets = await mediaService.getAssetsByOrganization(currentOrganization.id);
```

#### 1.3 Service-Import Standardisierung
**ALLE BETROFFENEN DATEIEN:** Einheitliche Imports

```typescript
// STANDARD für alle Media-Operationen:
import { mediaService } from '@/lib/firebase/media-service';

// DEPRECATED - entfernen:
import { profileImageService } from '@/lib/services/profile-image-service';
```

### PHASE 2: STORAGE-PFAD VEREINHEITLICHUNG

#### 2.1 Profile-Storage-Pfad Migration
**ALT:** `organizations/{organizationId}/profiles/{userId}/avatar.{ext}`
**NEU:** `organizations/{organizationId}/media/profiles/{userId}_avatar.{ext}`

#### 2.2 Asset-Kategorisierung durch Metadaten
```typescript
// Erweiterte MediaAsset-Typen:
type AssetCategory = 'general' | 'profile' | 'campaign' | 'project' | 'document';

interface MediaAssetEnhanced extends MediaAsset {
  category: AssetCategory;
  subCategory?: string; // 'avatar', 'logo', 'banner', etc.
  relatedEntityId?: string; // userId für Profile, projectId für Projekte
}
```

### PHASE 3: UI-KOMPONENTEN MIGRATION

#### 3.1 Media Library UI Update
**DATEIEN:**
- `src/app/dashboard/pr-tools/media-library/page.tsx`
- `src/components/mediathek/MediaLibraryMain.tsx`

**FEATURES:**
- Asset-Kategorien-Filter
- Profile-Assets-Sektion  
- Verbesserte Error-Handling ohne Fallbacks

#### 3.2 Upload-Komponenten Standardisierung
**DATEIEN:**
- `src/components/mediathek/UploadModal.tsx`
- `src/components/admin/ProfileForm.tsx`
- Campaign/Project Upload-Komponenten

**VEREINHEITLICHUNG:**
```typescript
// Standard Upload-Interface für alle Komponenten:
interface UploadConfig {
  organizationId: string;
  category: AssetCategory;
  subCategory?: string;
  relatedEntityId?: string;
  allowedTypes: string[];
  maxSize: number;
}
```

#### 3.3 Campaign NEW/EDIT Hybrid-Integration (NEU)
**DATEIEN:**
- `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`

**HYBRID-UPLOAD-LOGIC:**
```typescript
// ALT: Direkter Upload ohne Context
const uploadResult = await mediaService.uploadAsset(file, {
  organizationId: currentOrganization.id,
  userId: user.uid
});

// NEU: Smart Hybrid-Upload mit Context-Aware Routing
const uploadResult = await mediaService.smartUpload(file, {
  organizationId: currentOrganization.id,
  userId: user.uid,
  projectId: selectedProject?.id, // Optional! Hybrid-Kern-Feature
  campaignId: campaign.id,
  category: 'media',
  subCategory: uploadType === 'keyVisual' ? 'key-visuals' : 'anhänge'
});

// Upload-Router entscheidet automatisch:
// MIT Projekt: P-{project}/Medien/Campaign-{id}/Key-Visuals/
// OHNE Projekt: Unzugeordnet/Campaigns/Campaign-{id}/Medien/Key-Visuals/
```

**UI-ERWEITERUNGEN für maximale Flexibilität:**
- **Optional Project-Selector** mit "Kein Projekt" Option für spontane Campaigns
- **Smart Upload-Pfad-Anzeige**: Live-Anzeige "Upload geht nach: P-{project}/... oder Unzugeordnet/..."
- **Flexible Migration-Buttons**: 
  - "Später Projekt zuordnen" (bei unzugeordneten Campaigns)
  - "Zu anderem Projekt verschieben" (bei bestehenden Zuordnungen)
- **Context-Warning-Banner** für informierte Entscheidungen:
  ```typescript
  {!campaign.projectId && (
    <Alert type="info" className="mb-4">
      📂 Diese Campaign ist flexibel - kein Projekt erforderlich.
      Medien werden strukturiert in "Unzugeordnet/Campaigns/" gespeichert.
      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={() => setShowProjectSelector(true)}>
          Projekt zuordnen
        </Button>
        <Button variant="ghost" onClick={() => setShowPathInfo(true)}>
          Speicherpfad anzeigen
        </Button>
      </div>
    </Alert>
  )}
  ```

**MIGRATION-SYSTEM Integration:**
- **Smart Project-Suggestion**: Basierend auf Campaign-Namen, Tags und Zeitstempel
- **Bulk-Migration-Modal**: Mehrere unzugeordnete Campaigns gleichzeitig zuordnen
- **Asset-Verschiebeung**: Automatische Verschiebung aller Campaign-Assets bei Projekt-Zuordnung
- **Rollback-Funktion**: "Aus Projekt entfernen" mit Asset-Rückverschiebung

#### 3.4 PDF-Generierung Projekt-Integration (NEU)
**DATEIEN:**
- `src/lib/firebase/pdf-versions-service.ts`
- PDF-Generierung-Komponenten

**ÄNDERUNGEN:**
```typescript
// ALT: PDF in organizations/{orgId}/pdfs/
const pdfPath = `organizations/${organizationId}/pdfs/${campaignId}_v${version}.pdf`;

// NEU: PDF in Projekt-Pressemeldungen-Ordner
const projectPressFolder = await projectService.getProjectPressFolder(projectId);
const pdfPath = `${projectPressFolder}/Freigaben/${campaignTitle}_v${version}_${timestamp}.pdf`;
```

#### 3.5 Media-Library Projekt-Filter (NEU)
**DATEIEN:**
- `src/app/dashboard/pr-tools/media-library/page.tsx`
- `src/components/mediathek/MediaLibraryMain.tsx`

**NEUE FEATURES:**
- Projekt-basierte Filterung
- Projekt-Ordner-Navigation
- Bulk-Operations für Projekt-Dateien
- "Alle Projekte" vs. "Aktuelles Projekt" View

### PHASE 4: HYBRID MIGRATION & SMART-CLEANUP

#### 4.1 Hybrid-System Migration
**SCRIPTS:** 
- `scripts/migrate-profile-assets.ts`
- `scripts/migrate-legacy-uploads-to-projects.ts` (NEU - HYBRID-AWARE)
- `scripts/analyze-orphaned-assets.ts` (NEU)
- `scripts/smart-campaign-migration.ts` (NEU)

1. **Smart Assets Migration mit Hybrid-Logic:**
   - Existierende Profile-Assets → `Unzugeordnet/Profile/`
   - Campaign-Assets → Project-zugeordnet ODER `Unzugeordnet/Campaigns/`
   - Spontane Uploads → `Unzugeordnet/Spontane-Uploads/`
   - Asset-Category-Metadaten + Context-Information hinzufügen

2. **Hybrid Storage Migration:**
   - Firebase Storage-Files in neue Hybrid-Struktur verschieben
   - Context-aware Download-URLs aktualisieren
   - Alte Storage-Pfade zu `Legacy/` Ordner verschieben (nicht löschen!)

3. **Smart Legacy Upload Migration (REVOLUTIONÄR):**
   - **Context-basierte Zuordnung** von Assets ohne Projekt:
     - Campaign-Assets: Automatisch zu `Unzugeordnet/Campaigns/Campaign-{id}/`
     - Zeitstempel-Heuristik: Upload-Zeit vs. Projekt-Erstellungsdatum-Matching
     - Tag-basierte Zuordnung: Asset-Tags mit Projekt-Tags abgleichen
     - User-Upload-Pattern: Historische Upload-Präferenzen analysieren
   - **Smart Migration-Decision-Engine**:
     ```typescript
     interface MigrationDecision {
       assetId: string;
       suggestedProject: Project | null;
       confidence: number; // 0-100%
       migrationPath: 'project' | 'unassigned' | 'legacy';
       reason: string; // Für Logging/Audit
     }
     ```
   - **Fallback-Strategie**: Nicht zuordenbare Assets → `Legacy/Unbekannt/`
   - **User-Bestätigung**: Migration-Vorschläge mit geringer Confidence zur Bestätigung

4. **Projekt-Ordner Hybrid-Vervollständigung:**
   - Automatische Unterordner-Erstellung für bestehende Projekte
   - Hybrid-Standard-Struktur: `P-{project}/Medien/|Dokumente/|Pressemeldungen/`
   - Campaign-spezifische Unterordner: `Campaign-{id}/` wo erforderlich
   - Validierung der gesamten Hybrid-Hierarchie

5. **Unzugeordnet-Bereich Setup (NEU):**
   - `Unzugeordnet/Campaigns/` Strukturierung für projektlose Campaigns
   - `Unzugeordnet/Spontane-Uploads/` für Ad-hoc Medien
   - `Unzugeordnet/Profile/` für Profile-Images
   - `Unzugeordnet/KI-Sessions/` für zukünftige KI-Assistent Integration

#### 4.2 Legacy-Code Cleanup
- `src/lib/services/profile-image-service.ts` löschen
- Alle `|| user.uid` Fallbacks entfernen
- Veraltete Import-Statements bereinigen

### PHASE 5: TESTING & VALIDATION

#### 5.1 Service-Level Tests
**DATEIEN:** 
- `src/lib/firebase/__tests__/media-service.test.ts` erweitern
- `src/__tests__/profile-upload-integration.test.ts` neu
- Alle bestehenden Media-Tests aktualisieren

**TEST-COVERAGE:**
- Profile-Upload Multi-Tenancy
- Asset-Kategorisierung
- Migration-Funktionen
- Error-Handling ohne Fallbacks

#### 5.2 Integration Tests
- End-to-End Upload-Workflows
- Multi-User Isolation
- Asset-Sharing zwischen Organisationen (sollte fehlschlagen)

## ⚠️ RISIKEN & MITIGATION

### HOHE RISIKEN
1. **Datenverlust bei Storage-Migration**
   - **Mitigation:** Vollständige Backups vor Migration
   - **Rollback-Plan:** Original-Pfade beibehalten bis Validation

2. **Breaking Changes in Production**
   - **Mitigation:** Feature-Flags für schrittweise Aktivierung
   - **Blue-Green Deployment** für kritische Komponenten

3. **Performance-Impact bei großen Organisationen**
   - **Mitigation:** Batch-Migration mit Rate-Limiting
   - **Monitoring:** Asset-Load-Performance vor/nach Migration

### MITTLERE RISIKEN
1. **UI-Inkonsistenzen während Migration**
   - **Mitigation:** Komponenten-Versionierung
   - **Fallback-UI** für Legacy-Assets

2. **Test-Instabilität**
   - **Mitigation:** Isolierte Test-Datenbanken
   - **Mock-Services** für komplexe Szenarien

## 📊 SUCCESS METRICS

### TECHNISCHE METRIKEN
- [ ] 0 `|| user.uid` Fallbacks im Codebase
- [ ] 1 einheitlicher MediaService für alle Uploads
- [ ] 100% Test-Coverage für geänderte Services
- [ ] < 5s Ladezeit für Media Library mit 1000+ Assets

### BUSINESS METRIKEN
- [ ] 0 Asset-Isolation-Verletzungen zwischen Organisationen
- [ ] 100% Profile-Upload-Success-Rate
- [ ] < 2s Upload-Time für Profile-Images

## 🚀 ROLLOUT-STRATEGIE

### WOCHE 1: Hybrid-System Foundation (NEU - ERWEITERT)
- [ ] **PHASE 0:** Project-Context-Provider Implementation mit Hybrid-Support
- [ ] Project-Service Erweiterung für Hybrid-Ordner-Management
- [ ] Media-Service Smart Upload-Router Implementation
- [ ] Upload-Context-System mit HybridUploadContext
- [ ] Basis-Tests für Hybrid-Upload-Scenarios

### WOCHE 2: Service-Layer Hybrid-Konsolidierung  
- [ ] **PHASE 1:** Profile-Image-Service Migration zu Unzugeordnet-Bereich
- [ ] Media Library Fallback-Elimination mit Hybrid-Logic
- [ ] Service-Import Standardisierung für Smart-Upload-System
- [ ] Integration Tests für Projekt/Unzugeordnet-Routing

### WOCHE 3: Hybrid-UI Implementation
- [ ] **PHASE 3:** Campaign NEW/EDIT mit flexibler Projekt-Zuordnung
- [ ] PDF-Generierung Hybrid-Integration (Projekt ODER Unzugeordnet)
- [ ] Media-Library Hybrid-Navigation (Projekte + Unzugeordnet)
- [ ] Upload-Komponenten mit Smart-Path-Anzeige und Migration-Buttons

### WOCHE 4: Smart Migration Development
- [ ] **PHASE 4:** Smart Migration-Decision-Engine entwickeln
- [ ] Hybrid Migration-Scripts für Legacy Upload Analysis
- [ ] Context-basierte Asset-Zuordnung mit Confidence-Scoring
- [ ] Test-Migration auf Staging mit Hybrid-Validation

### WOCHE 5: Production Hybrid-Rollout
- [ ] Feature-Flag Activation für Hybrid-System
- [ ] Production Smart-Migration (schrittweise mit User-Confirmation)
- [ ] Unzugeordnet-Bereich Setup und Validation
- [ ] Vollständige Hybrid-System-Validation mit Migration-Analytics

## 📋 DETAILLIERTE TASK-LISTE

### PHASE 0 TASKS (FUNDAMENTAL - NEU)

#### Task 0.1: Project-Context-Provider Implementation
**Priorität:** 🚀 FUNDAMENTAL  
**Geschätzte Zeit:** 2 Tage

**Dateien zu erstellen:**
1. `src/context/ProjectContext.tsx`
   - [ ] ProjectContextProvider implementieren
   - [ ] selectedProject State-Management
   - [ ] Projekt-Ordner-Pfad-Resolver
   - [ ] Context-Hook useProject()

2. `src/components/projects/ProjectSelector.tsx`
   - [ ] Dropdown für Projekt-Auswahl
   - [ ] "Alle Projekte" vs. "Spezifisches Projekt" Modus
   - [ ] Integration in bestehende UI

3. `src/app/layout.tsx`
   - [ ] ProjectContextProvider einbinden
   - [ ] Nach AuthContext und OrganizationContext

#### Task 0.2: Project-Service Erweiterung
**Priorität:** 🚀 FUNDAMENTAL
**Geschätzte Zeit:** 1.5 Tage

**Dateien zu ändern:**
1. `src/lib/firebase/project-service.ts`
   - [ ] `getProjectMediaFolder()` Methode hinzufügen
   - [ ] `getProjectDocumentsFolder()` Methode hinzufügen
   - [ ] `getProjectPressFolder()` Methode hinzufügen
   - [ ] `ensureProjectSubfolder()` Utility-Methode
   - [ ] `getProjectFolderPath()` Master-Methode

#### Task 0.3: Media-Service Projekt-Integration
**Priorität:** 🚀 FUNDAMENTAL
**Geschätzte Zeit:** 2 Tage

**Dateien zu ändern:**
1. `src/lib/firebase/media-service.ts`
   - [ ] `ProjectUploadContext` Interface definieren
   - [ ] `uploadAssetToProject()` Methode implementieren
   - [ ] `resolveProjectFolder()` Logic implementieren
   - [ ] `getProjectAssetsByCategory()` Query-Methode

2. `src/types/media.ts`
   - [ ] Erweiterte Asset-Kategorien definieren
   - [ ] Project-Upload-Context-Typen

### PHASE 1 TASKS (KRITISCH)

#### Task 1.1: Profile-Image-Service Elimination
**Priorität:** 🚨 KRITISCH
**Geschätzte Zeit:** 2 Tage

**Dateien zu ändern:**
1. `src/lib/firebase/media-service.ts`
   - [ ] `uploadProfileImage()` Methode hinzufügen
   - [ ] `deleteProfileImage()` Methode hinzufügen  
   - [ ] `getProfileImageUrl()` Methode hinzufügen
   - [ ] Storage-Pfad Konsolidierung

2. `src/app/dashboard/admin/profile/page.tsx`
   - [ ] Import von `profileImageService` zu `mediaService` ändern
   - [ ] Upload-Logik auf neue Service-Methoden umstellen
   - [ ] Error-Handling verbessern

3. `src/components/admin/ProfileForm.tsx`
   - [ ] Service-Integration aktualisieren
   - [ ] Upload-UI standardisieren

4. `src/lib/services/profile-image-service.ts`
   - [ ] Als DEPRECATED markieren
   - [ ] Nach Migration löschen

#### Task 1.2: Media Library Fallback-Fix
**Priorität:** 🚨 KRITISCH  
**Geschätzte Zeit:** 1 Tag

**Dateien zu ändern:**
1. `src/app/dashboard/pr-tools/media-library/page.tsx`
   - [ ] Alle `|| user.uid` Fallbacks entfernen
   - [ ] Strikte OrganizationId-Validierung
   - [ ] Error-Boundaries für fehlende Organization

2. `src/components/mediathek/MediaLibraryMain.tsx`
   - [ ] Props-Validierung verschärfen
   - [ ] Fallback-Error-Handling entfernen

#### Task 1.3: Service-Import Standardisierung  
**Priorität:** ⚠️ HOCH
**Geschätzte Zeit:** 1 Tag

**Alle 36 betroffenen Dateien:**
- [ ] Import-Statements standardisieren
- [ ] Service-Call-Patterns vereinheitlichen
- [ ] TypeScript-Typen aktualisieren

### PHASE 2 TASKS (HOCH)

#### Task 2.1: Asset-Kategorisierung-System
**Priorität:** ⚠️ HOCH
**Geschätzte Zeit:** 2 Tage

1. `src/types/media.ts`
   - [ ] `AssetCategory` enum definieren
   - [ ] `MediaAssetEnhanced` interface erweitern
   - [ ] Migration-Typen definieren

2. `src/lib/firebase/media-service.ts`
   - [ ] Upload-Methoden um Kategorisierung erweitern
   - [ ] Query-Methoden für Asset-Kategorien
   - [ ] Bulk-Migration-Utilities

#### Task 2.2: Storage-Pfad Vereinheitlichung
**Priorität:** ⚠️ HOCH  
**Geschätzte Zeit:** 1 Tag

1. Storage-Pfad Konsolidierung:
   - [ ] Profile: `organizations/{organizationId}/media/profiles/`
   - [ ] Campaigns: `organizations/{organizationId}/media/campaigns/`
   - [ ] Projects: `organizations/{organizationId}/media/projects/`
   - [ ] General: `organizations/{organizationId}/media/general/`

### PHASE 3 TASKS (MEDIUM)

#### Task 3.1: Upload-UI Standardisierung
**Priorität:** 📝 MEDIUM
**Geschätzte Zeit:** 3 Tage

**Komponenten-Updates:**
1. `src/components/mediathek/UploadModal.tsx`
2. `src/components/admin/ProfileForm.tsx`  
3. Campaign Upload-Komponenten
4. Project Upload-Komponenten

**Features:**
- [ ] Einheitliche Upload-Configuration
- [ ] Drag & Drop Standardisierung
- [ ] Progress-Indication Vereinheitlichung
- [ ] Error-Handling Standardisierung

#### Task 3.2: Media Library UI Enhancement
**Priorität:** 📝 MEDIUM
**Geschätzte Zeit:** 2 Tage

1. Asset-Kategorien-Filter
2. Profile-Assets-Sektion
3. Enhanced Search mit Kategorien
4. Batch-Operations für Kategorien

### PHASE 4 TASKS (CRITICAL FOR PRODUCTION)

#### Task 4.1: Migration-Scripts Entwicklung
**Priorität:** 🚨 KRITISCH für Production
**Geschätzte Zeit:** 3 Tage

1. `scripts/migrate-profile-assets.ts`
   - [ ] Storage-Files verschieben
   - [ ] Firestore-Documents aktualisieren
   - [ ] Download-URLs neu generieren
   - [ ] Rollback-Mechanismus

2. `scripts/validate-migration.ts`  
   - [ ] Asset-Integrity-Checks
   - [ ] Performance-Validation
   - [ ] Multi-Tenancy-Validation

#### Task 4.2: Production-Deployment-Strategie
**Priorität:** 🚨 KRITISCH
**Geschätzte Zeit:** 2 Tage

1. Feature-Flags Implementation
2. Blue-Green Deployment Setup
3. Monitoring & Alerting
4. Rollback-Procedures

### PHASE 5 TASKS (QUALITY ASSURANCE)

#### Task 5.1: Comprehensive Testing
**Priorität:** ⚠️ HOCH
**Geschätzte Zeit:** 3 Tage

**Test-Files zu erstellen/aktualisieren:**
1. `src/lib/firebase/__tests__/media-service-enhanced.test.ts`
2. `src/__tests__/profile-upload-integration.test.ts`
3. `src/__tests__/media-multi-tenancy.test.ts`
4. `src/__tests__/storage-migration.test.ts`

**Test-Coverage-Ziele:**
- [ ] 100% Service-Method-Coverage
- [ ] 100% Error-Scenario-Coverage  
- [ ] 100% Multi-Tenancy-Isolation-Coverage

#### Task 5.2: Performance & Security Validation
**Priorität:** ⚠️ HOCH
**Geschätzte Zeit:** 2 Tage

1. Load-Testing für Media Library
2. Security-Penetration-Testing
3. Multi-Tenancy-Isolation-Validation
4. GDPR-Compliance-Check

## 🎯 FINAL DELIVERABLES

### CODE DELIVERABLES
- [ ] Einheitlicher MediaService ohne Profile-Image-Service
- [ ] 0 Fallback-Mechanismen auf userId
- [ ] Konsolidierte Storage-Pfad-Struktur
- [ ] 100% Test-Coverage für geänderte Services

### DOCUMENTATION DELIVERABLES  
- [ ] Aktualisierte API-Dokumentation
- [ ] Migration-Guide für Entwickler
- [ ] Deployment-Runbook
- [ ] Performance-Monitoring-Guide

### PROCESS DELIVERABLES
- [ ] Automatisierte Migration-Pipeline
- [ ] Feature-Flag-Konfiguration
- [ ] Monitoring-Dashboards
- [ ] Rollback-Procedures

---

**KRITISCHER HINWEIS:** Diese Migration ist **PRODUKTIONSKRITISCH**. Alle Änderungen müssen sorgfältig getestet werden. Ein Fehler kann zu **Datenverlust** oder **Multi-Tenancy-Verletzungen** führen.

**EMPFOHLENE HYBRID-REIHENFOLGE:**
0. **Hybrid-System Foundation** (Phase 0) - REVOLUTIONÄRE FUNDAMENTAL-BASIS
1. **Service-Layer Hybrid-Konsolidierung** (Phase 1) - Absolute Priorität mit Flexibilität
2. **Storage Hybrid-Migration** (Phase 2) - Staging-Tests mit Smart-Decision-Engine  
3. **Hybrid-UI** (Phase 3) - Feature-Flag-gesteuert mit optionaler Projekt-Zuordnung
4. **Smart Migration** (Phase 4) - Production-kritisch + KI-gestützte Asset-Zuordnung
5. **Testing & Validation** (Phase 5) - Kontinuierlich mit Hybrid-Scenario-Coverage

**GESCHÄTZTE GESAMT-ZEIT:** 5-6 Wochen bei 1-2 Entwicklern (erweitert wegen Hybrid-Complexity)
**RISIKO-LEVEL:** MITTEL-HOCH (durch Smart-Migration und Fallback-Strategien reduziert)
**SUCCESS-PROBABILITY:** SEHR HOCH (durch Hybrid-Flexibilität und bewährte Projekt-Basis)

**REVOLUTIONÄRER HYBRID-ANSATZ:** 
Diese Migration ist ein **Paradigmenwechsel** von starren Strukturen zu **adaptiver Intelligenz**. Das System denkt mit:
- **Automatische Context-Erkennung** für optimale Asset-Platzierung
- **Nachträgliche Flexibilität** ohne Workflow-Unterbrechung  
- **KI-gestützte Migration** für Legacy-Assets
- **Projekt-zentrierte Organisation** OHNE Zwang zur Projekt-Erstellung
- **Smart-Decision-Engine** für perfekte Asset-Zuordnung

Das Ergebnis: Ein Media-System das sich **an die Nutzer anpasst**, nicht umgekehrt - ein Quantensprung in der Benutzerfreundlichkeit bei gleichzeitig perfekter Multi-Tenancy-Architektur!