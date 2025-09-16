// src/lib/firebase/smart-upload-router.ts
// Smart Upload Router für Media Multi-Tenancy Phase 0
// Automatische Erkennung von Upload-Kontext und intelligente Weiterleitung

import { Timestamp } from 'firebase/firestore';
import { MediaAsset } from '../../types/media';
import { mediaService } from './media-service';

// =====================
// CONTEXT INTERFACES
// =====================

/**
 * Upload-Kontext für intelligentes Routing
 */
export interface UploadContext {
  organizationId: string;
  userId: string;
  projectId?: string;
  campaignId?: string;
  folderId?: string;
  uploadType: 'project' | 'campaign' | 'media-library' | 'profile' | 'branding';
  
  // Erweiterte Kontext-Informationen
  clientId?: string;
  phase?: 'ideas_planning' | 'creation' | 'internal_approval' | 'customer_approval' | 'distribution' | 'monitoring';
  autoTags?: string[];
  category?: string;
}

/**
 * Upload-Ergebnis mit Service-Information
 */
export interface UploadResult {
  path: string;
  service: string;
  asset?: MediaAsset;
  uploadMethod: 'organized' | 'unorganized' | 'legacy';
  metadata?: {
    resolvedFolder?: string;
    inheritedClientId?: string;
    appliedTags?: string[];
    storagePath: string;
  };
}

/**
 * Routing-Konfiguration
 */
interface RoutingConfig {
  preferOrganized: boolean;
  defaultFolder?: string;
  namingConvention?: 'timestamp' | 'project' | 'campaign' | 'custom';
  autoTagging: boolean;
  clientInheritance: boolean;
}

/**
 * Storage-Pfad-Konfiguration gemäß Hybrid-Architektur
 */
interface StoragePathConfig {
  basePath: string;
  subPath: string;
  fileName: string;
  isOrganized: boolean;
}

// =====================
// SMART UPLOAD ROUTER SERVICE
// =====================

class SmartUploadRouterService {
  private readonly DEFAULT_CONFIG: RoutingConfig = {
    preferOrganized: true,
    namingConvention: 'timestamp',
    autoTagging: true,
    clientInheritance: true
  };

  /**
   * Hauptmethode: Smart Upload mit automatischem Routing
   */
  async smartUpload(
    file: File,
    context: UploadContext,
    onProgress?: (progress: number) => void,
    config: Partial<RoutingConfig> = {}
  ): Promise<UploadResult> {
    try {
      const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

      // 1. Context Detection & Path Resolution
      const detectedContext = await this.detectUploadContext(context);
      SmartUploadLogger.logContextAnalysis(context, detectedContext.contextType);

      const pathConfig = await this.resolveStoragePath(file, context, mergedConfig);
      
      // 2. Folder Resolution (falls erforderlich)
      const resolvedFolderId = await this.resolveFolderContext(context, pathConfig);
      
      // 3. Client ID Inheritance (falls erforderlich)
      const inheritedClientId = await this.resolveClientInheritance(context, resolvedFolderId);
      
      // 4. Auto-Tagging basierend auf Kontext
      const autoTags = await this.generateAutoTags(context, file, mergedConfig);
      
      // 5. Service Delegation - Weiterleitung an bestehende Services
      const expectedPath = `${pathConfig.basePath}/${pathConfig.subPath}`;
      SmartUploadLogger.logRoutingDecision(pathConfig.isOrganized ? 'organized' : 'unorganized', expectedPath);

      const uploadResult = await this.delegateUpload(
        file,
        context,
        pathConfig,
        resolvedFolderId,
        inheritedClientId,
        autoTags,
        onProgress
      );
      
      const finalResult = {
        ...uploadResult,
        metadata: {
          resolvedFolder: resolvedFolderId,
          inheritedClientId,
          appliedTags: autoTags,
          storagePath: pathConfig.basePath + '/' + pathConfig.subPath + '/' + pathConfig.fileName
        }
      };

      SmartUploadLogger.logUploadResult(finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('🚫 Smart Upload Router - Error occurred, falling back to legacy upload:', error);
      // Fallback: Standard Upload ohne Routing
      return this.fallbackUpload(file, context, onProgress);
    }
  }

  /**
   * Context Detection: Automatische Erkennung des Upload-Kontexts
   */
  private async detectUploadContext(context: UploadContext): Promise<{
    contextType: string;
    priority: number;
    routing: 'organized' | 'unorganized' | 'legacy';
  }> {
    // Prioritäts-basierte Context Detection
    if (context.campaignId) {
      return {
        contextType: 'campaign',
        priority: 10,
        routing: 'organized'
      };
    }
    
    if (context.projectId) {
      return {
        contextType: 'project',
        priority: 8,
        routing: 'organized'
      };
    }
    
    if (context.folderId) {
      return {
        contextType: 'folder',
        priority: 6,
        routing: 'organized'
      };
    }
    
    if (context.uploadType === 'media-library') {
      return {
        contextType: 'media_library',
        priority: 4,
        routing: 'unorganized'
      };
    }
    
    // Default: Unorganized
    return {
      contextType: 'default',
      priority: 1,
      routing: 'unorganized'
    };
  }

  /**
   * Path Resolution: Smart Routing zu korrekten Storage-Pfaden
   */
  private async resolveStoragePath(
    file: File,
    context: UploadContext,
    config: RoutingConfig
  ): Promise<StoragePathConfig> {
    const detectedContext = await this.detectUploadContext(context);
    const cleanFileName = this.sanitizeFileName(file.name);
    const timestamp = Date.now();
    
    // Basis-Pfad gemäß Multi-Tenancy Architektur
    const basePath = `organizations/${context.organizationId}/media`;
    
    // Sub-Pfad basierend auf Routing-Entscheidung
    let subPath: string;
    let fileName: string;
    let isOrganized: boolean;
    
    if (detectedContext.routing === 'organized' && config.preferOrganized) {
      // Organisierte Uploads: organizations/{organizationId}/media/Projekte/
      if (context.projectId) {
        // Projekt-spezifischer Pfad - Verwende Projekt-Namen wenn möglich
        const projectName = (context as any).projectName || context.projectId;
        subPath = `Projekte/${projectName}`;

        // Spezielle Behandlung für PDFs
        if (context.category === 'pdf' || (context as any).subFolder === 'Pressemeldungen') {
          subPath += `/Pressemeldungen`;
          if (context.campaignId) {
            subPath += `/Campaign-${context.campaignId}`;
            // Unterordner je nach PDF-Status
            if (context.phase === 'internal_approval') {
              subPath += `/Freigaben`;
            } else {
              subPath += `/Entwürfe`;
            }
          }
        } else if (context.campaignId) {
          // Andere Campaign-Medien (Bilder, Anhänge)
          subPath += `/Medien/Campaign-${context.campaignId}`;
          if (context.category === 'key-visuals') {
            subPath += `/Key-Visuals`;
          } else if (context.category === 'attachments') {
            subPath += `/Anhänge`;
          }
        } else if (context.phase) {
          subPath += `/${this.getPhaseFolderName(context.phase)}`;
        }
      } else if (context.folderId) {
        subPath = `Ordner/${context.folderId}`;
      } else {
        subPath = 'Kategorien';
      }
      
      isOrganized = true;
    } else {
      // Unorganisierte Uploads: organizations/{organizationId}/media/Unzugeordnet/

      // Spezielle Behandlung für Campaigns ohne Projekt
      if (context.campaignId && !context.projectId) {
        subPath = `Unzugeordnet/Campaigns/Campaign-${context.campaignId}`;

        // PDFs in separatem Ordner
        if (context.category === 'pdf') {
          subPath += `/PDFs`;
          if (context.phase === 'internal_approval') {
            subPath += `/Freigaben`;
          } else {
            subPath += `/Entwürfe`;
          }
        } else {
          // Medien-Organisation
          subPath += `/Medien`;
          if (context.category === 'key-visuals') {
            subPath += `/Key-Visuals`;
          } else if (context.category === 'attachments') {
            subPath += `/Anhänge`;
          }
        }
      } else {
        subPath = 'Unzugeordnet';
      }

      isOrganized = false;
    }
    
    // Dateiname gemäß Naming Convention
    fileName = this.generateFileName(cleanFileName, timestamp, context, config);
    
    return {
      basePath,
      subPath,
      fileName,
      isOrganized
    };
  }

  /**
   * Folder Resolution: Bestehende oder neue Folder finden/erstellen
   */
  private async resolveFolderContext(
    context: UploadContext,
    pathConfig: StoragePathConfig
  ): Promise<string | undefined> {
    if (context.folderId) {
      // Explizit angegebener Folder
      return context.folderId;
    }
    
    if (pathConfig.isOrganized && context.projectId) {
      // Versuche Projekt-spezifischen Folder zu finden oder zu erstellen
      try {
        const projectFolders = await mediaService.getFolders(context.organizationId);
        
        // Suche nach Projekt-Folder
        const projectFolder = projectFolders.find(folder => 
          folder.name.toLowerCase().includes(context.projectId!.toLowerCase()) ||
          (folder as any).projectId === context.projectId
        );
        
        if (projectFolder?.id) {
          return projectFolder.id;
        }
        
        // Erstelle neuen Projekt-Folder falls konfiguriert
        // (Vereinfacht für Phase 0 - vollständige Implementierung in späteren Phasen)
        
      } catch (error) {
        // Folder resolution failed, using root folder
      }
    }
    
    return undefined;
  }

  /**
   * Client Inheritance: Automatische Vererbung der Client-ID
   */
  private async resolveClientInheritance(
    context: UploadContext,
    folderId?: string
  ): Promise<string | undefined> {
    // Direkte Client-ID hat Priorität
    if (context.clientId) {
      return context.clientId;
    }
    
    // Client-Vererbung von Folder
    if (folderId) {
      try {
        const folder = await mediaService.getFolder(folderId);
        if (folder?.clientId) {
          return folder.clientId;
        }
      } catch (error) {
        // Client inheritance from folder failed
      }
    }
    
    // TODO: Client-Vererbung von Projekt (Phase 1)
    // TODO: Client-Vererbung von Kampagne (Phase 1)
    
    return undefined;
  }

  /**
   * Auto-Tagging: Kontextbasierte Tag-Generierung
   */
  private async generateAutoTags(
    context: UploadContext,
    file: File,
    config: RoutingConfig
  ): Promise<string[]> {
    if (!config.autoTagging) {
      return context.autoTags || [];
    }
    
    const autoTags: string[] = [...(context.autoTags || [])];
    
    // Upload-Type Tag
    autoTags.push(`upload:${context.uploadType}`);
    
    // File-Type Tag
    const fileTypeCategory = this.getFileTypeCategory(file.type);
    if (fileTypeCategory) {
      autoTags.push(`type:${fileTypeCategory}`);
    }
    
    // Context-Tags
    if (context.projectId) {
      autoTags.push(`project:${context.projectId}`);
    }
    
    if (context.campaignId) {
      autoTags.push(`campaign:${context.campaignId}`);
    }
    
    if (context.phase) {
      autoTags.push(`phase:${context.phase}`);
    }
    
    // Datum-Tag
    const currentDate = new Date().toISOString().split('T')[0];
    autoTags.push(`date:${currentDate}`);
    
    return autoTags;
  }

  /**
   * Service Delegation: Weiterleitung an bestehende Services
   */
  private async delegateUpload(
    file: File,
    context: UploadContext,
    pathConfig: StoragePathConfig,
    folderId?: string,
    clientId?: string,
    tags: string[] = [],
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {

    // Erweiterte Kontext-Informationen für Upload
    const uploadContext = {
      userId: context.userId,
      clientId: clientId
    };

    console.log('🔧 Smart Upload Router - Delegating to mediaService.uploadMedia:', {
      fileName: file.name,
      organizationId: context.organizationId,
      folderId: folderId,
      expectedPath: `${pathConfig.basePath}/${pathConfig.subPath}/${pathConfig.fileName}`,
      isOrganized: pathConfig.isOrganized
    });

    try {
      // Berechne vollständigen Storage-Pfad für mediaService
      const fullStoragePath = `${pathConfig.basePath}/${pathConfig.subPath}/${pathConfig.fileName}`;

      console.log('🔧 Smart Upload Router - Passing custom storage path to mediaService:', fullStoragePath);

      // Delegation an mediaService.uploadMedia (bestehender Service) mit custom path
      const asset = await mediaService.uploadMedia(
        file,
        context.organizationId,
        folderId,
        onProgress,
        3, // retry count
        uploadContext,
        fullStoragePath // NEW: Pass the calculated path
      );
      
      // Asset-Metadaten erweitern falls erforderlich
      if (tags.length > 0 || pathConfig.isOrganized) {
        await this.enhanceAssetMetadata(asset.id!, tags, context, pathConfig);
      }
      
      return {
        path: pathConfig.basePath + '/' + pathConfig.subPath,
        service: 'mediaService.uploadMedia (with custom path)',
        asset,
        uploadMethod: pathConfig.isOrganized ? 'organized' : 'unorganized'
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fallback Logic: Graceful Handling für unbekannte/legacy Kontexte
   */
  private async fallbackUpload(
    file: File,
    context: UploadContext,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    console.log('🚫 Smart Upload Router - Using fallback upload (legacy mode)');
    try {
      // Standard mediaService Upload ohne erweiterte Features
      const asset = await mediaService.uploadMedia(
        file,
        context.organizationId,
        context.folderId,
        onProgress,
        1, // single retry for fallback
        { userId: context.userId }
      );
      
      return {
        path: `organizations/${context.organizationId}/media`,
        service: 'mediaService.uploadMedia (fallback)',
        asset,
        uploadMethod: 'legacy'
      };
      
    } catch (error) {
      throw new Error(`Upload fehlgeschlagen: ${error}`);
    }
  }

  // =====================
  // HELPER METHODS
  // =====================

  /**
   * Dateinamen bereinigen
   */
  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Phasen-Ordnernamen generieren
   */
  private getPhaseFolderName(phase: string): string {
    const phaseNames: Record<string, string> = {
      'ideas_planning': 'Ideen-Planung',
      'creation': 'Erstellung',
      'internal_approval': 'Interne-Freigabe',
      'customer_approval': 'Kunden-Freigabe',
      'distribution': 'Distribution',
      'monitoring': 'Monitoring'
    };
    
    return phaseNames[phase] || phase;
  }

  /**
   * Dateiname gemäß Naming Convention generieren
   */
  private generateFileName(
    cleanFileName: string,
    timestamp: number,
    context: UploadContext,
    config: RoutingConfig
  ): string {
    const fileExtension = cleanFileName.split('.').pop() || '';
    const baseName = cleanFileName.replace(`.${fileExtension}`, '');
    
    switch (config.namingConvention) {
      case 'project':
        if (context.projectId) {
          return `${context.projectId}_${timestamp}_${baseName}.${fileExtension}`;
        }
        break;
        
      case 'campaign':
        if (context.campaignId) {
          return `${context.campaignId}_${timestamp}_${baseName}.${fileExtension}`;
        }
        break;
        
      case 'custom':
        // Placeholder für spätere Erweiterungen
        break;
        
      case 'timestamp':
      default:
        return `${timestamp}_${cleanFileName}`;
    }
    
    // Fallback: Timestamp
    return `${timestamp}_${cleanFileName}`;
  }

  /**
   * Dateityp-Kategorie bestimmen
   */
  private getFileTypeCategory(mimeType: string): string | null {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    
    return 'other';
  }

  /**
   * Asset-Metadaten erweitern
   */
  private async enhanceAssetMetadata(
    assetId: string,
    tags: string[],
    context: UploadContext,
    pathConfig: StoragePathConfig
  ): Promise<void> {
    try {
      const updates: any = {};
      
      if (tags.length > 0) {
        updates.tags = tags;
      }
      
      // Erweiterte Metadaten für Phase 1+
      if (context.category) {
        updates.description = `Kategorie: ${context.category}`;
      }
      
      if (Object.keys(updates).length > 0) {
        await mediaService.updateAsset(assetId, updates);
      }
    } catch (error) {
      // Nicht kritisch - Upload war erfolgreich
    }
  }

  // =====================
  // PUBLIC UTILITY METHODS
  // =====================

  /**
   * Context aus bestehenden Parametern erstellen
   */
  createUploadContext(params: {
    organizationId: string;
    userId: string;
    uploadType: UploadContext['uploadType'];
    projectId?: string;
    campaignId?: string;
    folderId?: string;
    clientId?: string;
    phase?: string;
    category?: string;
  }): UploadContext {
    return {
      organizationId: params.organizationId,
      userId: params.userId,
      uploadType: params.uploadType,
      projectId: params.projectId,
      campaignId: params.campaignId,
      folderId: params.folderId,
      clientId: params.clientId,
      phase: params.phase as 'ideas_planning' | 'creation' | 'internal_approval' | 'customer_approval' | 'distribution' | 'monitoring' | undefined,
      category: params.category,
      autoTags: []
    };
  }

  /**
   * Upload-Kontext validieren
   */
  validateUploadContext(context: UploadContext): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Pflichtfelder prüfen
    if (!context.organizationId) {
      errors.push('organizationId ist erforderlich');
    }
    
    if (!context.userId) {
      errors.push('userId ist erforderlich');
    }
    
    if (!context.uploadType) {
      errors.push('uploadType ist erforderlich');
    }

    // Logische Validierung
    if (context.uploadType === 'campaign' && !context.campaignId) {
      warnings.push('campaignId fehlt für campaign upload');
    }
    
    if (context.uploadType === 'project' && !context.projectId) {
      warnings.push('projectId fehlt für project upload');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Storage-Pfad Vorschau generieren
   */
  async previewStoragePath(
    fileName: string,
    context: UploadContext,
    config: Partial<RoutingConfig> = {}
  ): Promise<string> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
    const mockFile = { name: fileName } as File;
    
    try {
      const pathConfig = await this.resolveStoragePath(mockFile, context, mergedConfig);
      return `${pathConfig.basePath}/${pathConfig.subPath}/${pathConfig.fileName}`;
    } catch (error) {
      return `organizations/${context.organizationId}/media/Unzugeordnet/${Date.now()}_${fileName}`;
    }
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const smartUploadRouter = new SmartUploadRouterService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Vereinfachte Upload-Funktion für häufige Anwendungsfälle
 */
export async function uploadWithContext(
  file: File,
  organizationId: string,
  userId: string,
  uploadType: UploadContext['uploadType'],
  additionalContext: Partial<UploadContext> = {},
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const context = smartUploadRouter.createUploadContext({
    organizationId,
    userId,
    uploadType,
    ...additionalContext
  });

  return smartUploadRouter.smartUpload(file, context, onProgress);
}

/**
 * Media Library Upload (Unorganized)
 */
export async function uploadToMediaLibrary(
  file: File,
  organizationId: string,
  userId: string,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadWithContext(
    file,
    organizationId,
    userId,
    'media-library',
    { folderId },
    onProgress
  );
}

/**
 * Projekt Upload (Organized)
 */
export async function uploadToProject(
  file: File,
  organizationId: string,
  userId: string,
  projectId: string,
  phase?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadWithContext(
    file,
    organizationId,
    userId,
    'project',
    { 
      projectId, 
      phase: phase as 'ideas_planning' | 'creation' | 'internal_approval' | 'customer_approval' | 'distribution' | 'monitoring' | undefined
    },
    onProgress
  );
}

/**
 * Kampagnen Upload (Organized)
 */
export async function uploadToCampaign(
  file: File,
  organizationId: string,
  userId: string,
  campaignId: string,
  projectId?: string,
  phase?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadWithContext(
    file,
    organizationId,
    userId,
    'campaign',
    { 
      campaignId, 
      projectId, 
      phase: phase as 'ideas_planning' | 'creation' | 'internal_approval' | 'customer_approval' | 'distribution' | 'monitoring' | undefined
    },
    onProgress
  );
}

// =====================
// ERROR HANDLING
// =====================

export class SmartUploadError extends Error {
  constructor(
    message: string,
    public readonly context?: UploadContext,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SmartUploadError';
  }
}

// =====================
// LOGGING & DEBUGGING
// =====================

export const SmartUploadLogger = {
  logContextAnalysis: (context: UploadContext, detectedType: string) => {
    console.log('🔧 Smart Upload Router - Context Analysis:', {
      detectedType,
      campaignId: context.campaignId,
      projectId: context.projectId,
      uploadType: context.uploadType,
      category: context.category
    });
  },

  logRoutingDecision: (method: string, path: string) => {
    console.log('🔧 Smart Upload Router - Routing Decision:', {
      method,
      path
    });
  },

  logUploadResult: (result: UploadResult) => {
    console.log('🔧 Smart Upload Router - Upload Result:', {
      path: result.path,
      service: result.service,
      uploadMethod: result.uploadMethod,
      storagePath: result.metadata?.storagePath
    });
  }
};