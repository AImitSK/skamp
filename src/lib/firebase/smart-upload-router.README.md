# Smart Upload Router - Media Multi-Tenancy Phase 0

## Überblick

Der Smart Upload Router ist ein intelligenter Service, der automatisch die korrekte Upload-Methode und Storage-Pfade basierend auf dem Kontext bestimmt. Er implementiert die Hybrid-Architektur des Media Multi-Tenancy Masterplans.

## Funktionsweise

### 🎯 Context Detection
- Automatische Erkennung des Upload-Kontexts (Projekt, Campaign, Media Library, etc.)
- Prioritäts-basierte Routing-Entscheidungen
- Smart Fallback für unbekannte/legacy Kontexte

### 🗂️ Path Resolution
- **Organisierte Uploads**: `organizations/{organizationId}/media/Projekte/`
- **Unorganisierte Uploads**: `organizations/{organizationId}/media/Unzugeordnet/`
- **Legacy Support**: Bestehende Pfade werden weiterhin unterstützt

### 🔄 Service Delegation
- Weiterleitung an bestehende mediaService-Methoden
- Keine Breaking Changes für bestehende Workflows
- Erweiterte Funktionalität ohne Service-Umstellung

## Verwendung

### Basis-Upload mit Context
```typescript
import { smartUploadRouter } from '@/lib/firebase/smart-upload-router';

const context = smartUploadRouter.createUploadContext({
  organizationId: 'org-123',
  userId: 'user-456',
  uploadType: 'project',
  projectId: 'project-789',
  phase: 'creation'
});

const result = await smartUploadRouter.smartUpload(file, context);
```

### Convenience Functions

#### Media Library Upload
```typescript
import { uploadToMediaLibrary } from '@/lib/firebase/smart-upload-router';

const result = await uploadToMediaLibrary(
  file,
  organizationId,
  userId,
  folderId, // optional
  onProgress // optional
);
```

#### Projekt Upload
```typescript
import { uploadToProject } from '@/lib/firebase/smart-upload-router';

const result = await uploadToProject(
  file,
  organizationId,
  userId,
  projectId,
  'creation', // phase
  onProgress // optional
);
```

#### Kampagnen Upload
```typescript
import { uploadToCampaign } from '@/lib/firebase/smart-upload-router';

const result = await uploadToCampaign(
  file,
  organizationId,
  userId,
  campaignId,
  projectId, // optional
  'distribution', // phase
  onProgress // optional
);
```

## Features

### 🏷️ Auto-Tagging
Automatische Tag-Generierung basierend auf Kontext:
- `upload:project` - Upload-Typ
- `type:image` - Dateityp-Kategorie
- `project:project-789` - Projekt-ID
- `phase:creation` - Pipeline-Phase
- `date:2025-09-15` - Upload-Datum

### 🏢 Client Inheritance
Automatische Vererbung der Client-ID:
- Von Ordner-Kontext
- Von Projekt-Kontext (Phase 1+)
- Von Kampagne-Kontext (Phase 1+)

### 📁 Smart Folder Resolution
- Automatische Ordner-Zuordnung basierend auf Kontext
- Projektspezifische Ordner-Erstellung
- Fallback auf Root-Ordner

### 🔧 Naming Conventions
Flexible Dateinamen-Generierung:
- `timestamp`: `1694777000_datei.jpg` (Standard)
- `project`: `project-789_1694777000_datei.jpg`
- `campaign`: `campaign-456_1694777000_datei.jpg`

## Upload Result

```typescript
interface UploadResult {
  path: string;                    // Storage-Pfad
  service: string;                 // Verwendeter Service
  asset?: MediaAsset;             // Erstelltes Asset
  uploadMethod: 'organized' | 'unorganized' | 'legacy';
  metadata?: {
    resolvedFolder?: string;       // Aufgelöste Folder-ID
    inheritedClientId?: string;    // Vererbte Client-ID
    appliedTags?: string[];        // Angewendete Tags
    storagePath: string;           // Vollständiger Storage-Pfad
  };
}
```

## Context Validation

```typescript
const validation = smartUploadRouter.validateUploadContext(context);

if (!validation.isValid) {
  console.error('Context-Fehler:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Context-Warnungen:', validation.warnings);
}
```

## Storage Path Preview

```typescript
const previewPath = await smartUploadRouter.previewStoragePath(
  'datei.jpg',
  context,
  { namingConvention: 'project' }
);

console.log('Vorschau:', previewPath);
// Output: organizations/org-123/media/Projekte/project-789/project-789_1694777000_datei.jpg
```

## Routing-Konfiguration

```typescript
const config = {
  preferOrganized: true,          // Bevorzuge organisierte Uploads
  defaultFolder: 'folder-123',    // Standard-Ordner
  namingConvention: 'timestamp',  // Naming-Strategie
  autoTagging: true,              // Automatisches Tagging
  clientInheritance: true         // Client-ID Vererbung
};

const result = await smartUploadRouter.smartUpload(file, context, onProgress, config);
```

## Error Handling

```typescript
import { SmartUploadError } from '@/lib/firebase/smart-upload-router';

try {
  const result = await smartUploadRouter.smartUpload(file, context);
} catch (error) {
  if (error instanceof SmartUploadError) {
    console.error('Smart Upload Fehler:', error.message);
    console.error('Context:', error.context);
    console.error('Original Fehler:', error.originalError);
  }
}
```

## Fallback-Verhalten

Bei Fehlern wird automatisch auf das legacy Upload-Verhalten zurückgegriffen:

1. **Service Delegation Fehler**: Fallback auf Standard mediaService.uploadMedia
2. **Context Detection Fehler**: Verwendung von 'unorganized' Routing
3. **Path Resolution Fehler**: Verwendung von Standard-Pfaden
4. **Asset Enhancement Fehler**: Upload wird fortgesetzt, nur Metadaten-Update schlägt fehl

## Multi-Tenancy & Security

- Alle Uploads sind organizationId-isoliert
- Firebase Storage Rules validieren Zugriff
- Asset-Metadaten enthalten organizationId
- Client-ID Vererbung nur innerhalb derselben Organisation

## Performance-Optimierungen

- Lazy Loading von Services
- Caching von Folder-Resolution
- Batch-Operations für Metadaten-Updates
- Optimierte Storage-Pfad-Generierung

## Integration

Der Smart Upload Router ist als Drop-in-Replacement für direkte mediaService-Aufrufe konzipiert und kann schrittweise in bestehende Komponenten integriert werden, ohne Breaking Changes zu verursachen.

## Logging & Debugging

```typescript
import { SmartUploadLogger } from '@/lib/firebase/smart-upload-router';

// Context-Analyse loggen
SmartUploadLogger.logContextAnalysis(context, 'project');

// Routing-Entscheidung loggen  
SmartUploadLogger.logRoutingDecision('organized', path);

// Upload-Ergebnis loggen
SmartUploadLogger.logUploadResult(result);
```

---

**Status**: ✅ Implementiert und getestet  
**Phase**: Media Multi-Tenancy Phase 0  
**Version**: 1.0.0