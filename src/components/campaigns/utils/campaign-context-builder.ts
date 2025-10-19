// src/components/campaigns/utils/campaign-context-builder.ts
// Campaign Context Builder für Campaign Upload Context
// Intelligent Campaign Upload Context Detection und Hybrid-Architektur-Support

// =====================
// CAMPAIGN CONTEXT INTERFACES
// =====================

/**
 * Campaign-spezifischer Upload-Kontext
 */
export interface CampaignUploadContext {
  // Base Context Properties
  organizationId: string;
  userId: string;
  uploadType: string;
  folderId?: string;
  clientId?: string;
  autoTags?: string[];
  projectId?: string; // Project Context

  // Campaign-specific Properties
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadSubType?: CampaignUploadType;
  pipelineStage?: CampaignPipelineStage;
  isHybridStorage?: boolean;
}

/**
 * Campaign Upload Types
 */
export type CampaignUploadType = 
  | 'hero-image'
  | 'attachment'
  | 'boilerplate-asset'
  | 'generated-content';

/**
 * Campaign Pipeline Stages
 */
export type CampaignPipelineStage = 
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived';

/**
 * Storage-Pfad-Konfiguration für Campaign Uploads
 */
export interface CampaignStorageConfig {
  basePath: string;
  subPath: string;
  isOrganized: boolean;
  storageType: 'organized' | 'unorganized';
  pathComponents: {
    organization: string;
    media: string;
    category: 'Projekte' | 'Unzugeordnet';
    project?: string;
    campaign: string;
    type?: string;
  };
}

/**
 * Context Validation Result
 */
export interface CampaignContextValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendedAction?: string;
  storagePreview?: string;
}

// =====================
// CAMPAIGN CONTEXT BUILDER SERVICE
// =====================

class CampaignContextBuilderService {
  
  /**
   * Smart Context-Erkennung für Campaign Uploads
   * Automatische Entscheidung zwischen organisierter und unorganisierter Ablage
   */
  buildCampaignContext(params: {
    organizationId: string;
    userId: string;
    campaignId: string;
    campaignName?: string;
    selectedProjectId?: string;
    selectedProjectName?: string;
    uploadType: CampaignUploadType;
    pipelineStage?: CampaignPipelineStage;
    clientId?: string;
  }): CampaignUploadContext {
    
    // Basis-Kontext erstellen
    const baseContext: CampaignUploadContext = {
      organizationId: params.organizationId,
      userId: params.userId,
      campaignId: params.campaignId,
      campaignName: params.campaignName,
      selectedProjectId: params.selectedProjectId,
      selectedProjectName: params.selectedProjectName,
      uploadType: 'campaign', // Haupt-Upload-Type
      uploadSubType: params.uploadType, // Campaign-spezifischer Sub-Type
      pipelineStage: params.pipelineStage || 'draft',
      clientId: params.clientId,
      isHybridStorage: !!params.selectedProjectId, // Hybrid wenn Projekt vorhanden
      
      // Auto-Tagging basierend auf Campaign-Kontext
      autoTags: this.generateCampaignTags({
        campaignId: params.campaignId,
        campaignName: params.campaignName,
        uploadType: params.uploadType,
        pipelineStage: params.pipelineStage,
        projectId: params.selectedProjectId,
        projectName: params.selectedProjectName
      })
    };

    // Projekt-Context setzen falls vorhanden (für organisierte Ablage)
    if (params.selectedProjectId) {
      baseContext.projectId = params.selectedProjectId;
    }

    return baseContext;
  }

  /**
   * Storage-Pfad-Konfiguration für Campaign Uploads generieren
   * Implementiert Hybrid-Architektur (Mit/Ohne Projekt)
   */
  buildStorageConfig(context: CampaignUploadContext): CampaignStorageConfig {
    const basePath = `organizations/${context.organizationId}/media`;
    
    let subPath: string;
    let isOrganized: boolean;
    let storageType: 'organized' | 'unorganized';
    
    if (context.isHybridStorage && context.selectedProjectId) {
      // ORGANISIERTE ABLAGE: Mit Projekt-Zuordnung
      // organizations/{organizationId}/media/Projekte/{ProjectName}/Kampagnen/{CampaignName}/
      const projectFolder = context.selectedProjectName || context.selectedProjectId;
      const campaignFolder = context.campaignName || context.campaignId;
      
      subPath = `Projekte/${projectFolder}/Kampagnen/${campaignFolder}`;
      
      // Upload-Type-spezifische Unterordner
      if (context.uploadSubType) {
        const typeFolder = this.getUploadTypeFolder(context.uploadSubType);
        subPath += `/${typeFolder}`;
      }
      
      isOrganized = true;
      storageType = 'organized';
      
    } else {
      // UNORGANISIERTE ABLAGE: Ohne Projekt-Zuordnung
      // organizations/{organizationId}/media/Unzugeordnet/Kampagnen/{CampaignName}/
      const campaignFolder = context.campaignName || context.campaignId;
      
      subPath = `Unzugeordnet/Kampagnen/${campaignFolder}`;
      
      // Upload-Type-spezifische Unterordner nur für bestimmte Types
      if (context.uploadSubType && this.requiresTypeFolder(context.uploadSubType)) {
        const typeFolder = this.getUploadTypeFolder(context.uploadSubType);
        subPath += `/${typeFolder}`;
      }
      
      isOrganized = false;
      storageType = 'unorganized';
    }

    return {
      basePath,
      subPath,
      isOrganized,
      storageType,
      pathComponents: {
        organization: context.organizationId,
        media: 'media',
        category: isOrganized ? 'Projekte' : 'Unzugeordnet',
        project: context.selectedProjectName || context.selectedProjectId,
        campaign: context.campaignName || context.campaignId,
        type: context.uploadSubType ? this.getUploadTypeFolder(context.uploadSubType) : undefined
      }
    };
  }

  /**
   * Campaign-spezifische Auto-Tags generieren
   */
  private generateCampaignTags(params: {
    campaignId: string;
    campaignName?: string;
    uploadType: CampaignUploadType;
    pipelineStage?: CampaignPipelineStage;
    projectId?: string;
    projectName?: string;
  }): string[] {
    const tags: string[] = [];

    // Campaign-Basis-Tags
    tags.push(`campaign:${params.campaignId}`);
    
    if (params.campaignName) {
      tags.push(`campaign-name:${params.campaignName}`);
    }

    // Upload-Type-Tags
    tags.push(`upload-type:${params.uploadType}`);
    
    switch (params.uploadType) {
      case 'hero-image':
        tags.push('content-type:visual', 'priority:high');
        break;
      case 'attachment':
        tags.push('content-type:media', 'purpose:attachment');
        break;
      case 'boilerplate-asset':
        tags.push('content-type:template', 'purpose:boilerplate');
        break;
      case 'generated-content':
        tags.push('content-type:generated', 'source:pipeline');
        break;
    }

    // Pipeline-Stage-Tags
    if (params.pipelineStage) {
      tags.push(`stage:${params.pipelineStage}`);
    }

    // Projekt-Tags (falls organisiert)
    if (params.projectId) {
      tags.push(`project:${params.projectId}`);
      tags.push('storage:organized');
      
      if (params.projectName) {
        tags.push(`project-name:${params.projectName}`);
      }
    } else {
      tags.push('storage:unorganized');
    }

    // Zeitstempel-Tag
    const currentDate = new Date().toISOString().split('T')[0];
    tags.push(`date:${currentDate}`);

    return tags;
  }

  /**
   * Upload-Type zu Folder-Namen Mapping
   */
  private getUploadTypeFolder(uploadType: CampaignUploadType): string {
    const folderMapping: Record<CampaignUploadType, string> = {
      'hero-image': 'Hero-Images',
      'attachment': 'Attachments',
      'boilerplate-asset': 'Boilerplate-Assets',
      'generated-content': 'Generated-Content'
    };

    return folderMapping[uploadType] || 'Sonstige';
  }

  /**
   * Prüft ob Upload-Type einen eigenen Ordner benötigt
   */
  private requiresTypeFolder(uploadType: CampaignUploadType): boolean {
    // Hero-Images und Attachments benötigen eigene Ordner
    return ['hero-image', 'attachment'].includes(uploadType);
  }

  /**
   * Context-Validierung für Campaign Uploads
   */
  validateCampaignContext(context: CampaignUploadContext): CampaignContextValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Pflichtfelder prüfen
    if (!context.organizationId) {
      errors.push('organizationId ist erforderlich');
    }

    if (!context.userId) {
      errors.push('userId ist erforderlich');
    }

    if (!context.campaignId) {
      errors.push('campaignId ist erforderlich');
    }

    if (!context.uploadSubType) {
      warnings.push('uploadSubType nicht spezifiziert - verwendet Standard-Ablage');
    }

    // Hybrid-Storage Validierung
    if (context.isHybridStorage && !context.selectedProjectId) {
      errors.push('selectedProjectId erforderlich für organisierte Ablage');
    }

    // Pipeline-Stage Validierung
    if (context.pipelineStage === 'published' && !context.selectedProjectId) {
      warnings.push('Veröffentlichte Kampagnen sollten einem Projekt zugeordnet sein');
    }

    // Storage-Pfad Vorschau generieren
    let storagePreview: string | undefined;
    try {
      const storageConfig = this.buildStorageConfig(context);
      storagePreview = `${storageConfig.basePath}/${storageConfig.subPath}/`;
    } catch (error) {
      errors.push('Storage-Pfad-Generierung fehlgeschlagen');
    }

    // Empfehlungen generieren
    let recommendedAction: string | undefined;
    if (warnings.length > 0 || errors.length === 0) {
      if (!context.selectedProjectId && context.uploadSubType === 'hero-image') {
        recommendedAction = 'Erwägen Sie die Zuordnung zu einem Projekt für bessere Organisation';
      } else if (context.isHybridStorage) {
        recommendedAction = 'Organisierte Ablage wird verwendet - Assets werden strukturiert gespeichert';
      } else {
        recommendedAction = 'Unorganisierte Ablage wird verwendet - Assets sind direkt verfügbar';
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendedAction,
      storagePreview
    };
  }

  /**
   * Storage-Pfad Vorschau für UI-Anzeige
   */
  generateStoragePreview(context: CampaignUploadContext, fileName?: string): string {
    try {
      const storageConfig = this.buildStorageConfig(context);
      const preview = `${storageConfig.basePath}/${storageConfig.subPath}/`;
      
      if (fileName) {
        const timestamp = Date.now();
        return `${preview}${timestamp}_${fileName}`;
      }
      
      return preview;
    } catch (error) {
      return `organizations/${context.organizationId}/media/Unzugeordnet/`;
    }
  }

  /**
   * Upload-Type-spezifische Konfiguration abrufen
   */
  getUploadTypeConfig(uploadType: CampaignUploadType): {
    displayName: string;
    description: string;
    acceptedFileTypes: string[];
    maxFileSize: number;
    requiresProject: boolean;
  } {
    const configs = {
      'hero-image': {
        displayName: 'Hero Image',
        description: 'Hauptbild für die Kampagne (Key Visual)',
        acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        requiresProject: false
      },
      'attachment': {
        displayName: 'Media Attachment',
        description: 'Medien-Anhang für Pressemeldungen',
        acceptedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        requiresProject: false
      },
      'boilerplate-asset': {
        displayName: 'Textbaustein Asset',
        description: 'Asset für Textbausteine',
        acceptedFileTypes: ['image/*', 'application/pdf'],
        maxFileSize: 20 * 1024 * 1024, // 20MB
        requiresProject: false
      },
      'generated-content': {
        displayName: 'Generierter Inhalt',
        description: 'Pipeline-generierte Inhalte',
        acceptedFileTypes: ['*/*'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        requiresProject: true
      }
    };

    return configs[uploadType] || configs['attachment'];
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const campaignContextBuilder = new CampaignContextBuilderService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Campaign Hero Image Upload Context erstellen
 */
export function createHeroImageContext(params: {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  clientId?: string;
}): CampaignUploadContext {
  return campaignContextBuilder.buildCampaignContext({
    ...params,
    uploadType: 'hero-image'
  });
}

/**
 * Campaign Attachment Upload Context erstellen
 */
export function createAttachmentContext(params: {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  clientId?: string;
}): CampaignUploadContext {
  return campaignContextBuilder.buildCampaignContext({
    ...params,
    uploadType: 'attachment'
  });
}

/**
 * Context-basierte Storage-Pfad-Ermittlung
 */
export function resolveCampaignStoragePath(
  context: CampaignUploadContext,
  fileName?: string
): string {
  return campaignContextBuilder.generateStoragePreview(context, fileName);
}

/**
 * Context-Validierung mit User-freundlichen Meldungen
 */
export function validateCampaignUpload(
  context: CampaignUploadContext
): CampaignContextValidation {
  return campaignContextBuilder.validateCampaignContext(context);
}