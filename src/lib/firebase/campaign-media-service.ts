// src/lib/firebase/campaign-media-service.ts
// Campaign Media Service für Smart Upload Router Integration Phase 2
// Dedizierter Service für Campaign Media Management mit Smart Router Integration

import { smartUploadRouter, UploadResult } from './smart-upload-router';
import { 
  campaignContextBuilder, 
  CampaignUploadContext,
  CampaignUploadType,
  createHeroImageContext,
  createAttachmentContext
} from '@/components/campaigns/utils/campaign-context-builder';
import {
  campaignFeatureFlags,
  isCampaignSmartRouterEnabled,
  isUploadTypeSmartRouterEnabled,
  createFeatureFlagContext,
  getMigrationStatus
} from '@/components/campaigns/config/campaign-feature-flags';
import { mediaService } from './media-service';
import { MediaAsset } from '@/types/media';

// =====================
// SERVICE INTERFACES
// =====================

/**
 * Campaign Upload Parameter
 */
export interface CampaignUploadParams {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType: CampaignUploadType;
  clientId?: string;
  file: File;
  onProgress?: (progress: number) => void;
}

/**
 * Campaign Upload Result mit erweiterten Informationen
 */
export interface CampaignUploadResult extends UploadResult {
  campaignContext: CampaignUploadContext;
  usedSmartRouter: boolean;
  storageInfo: {
    type: 'organized' | 'unorganized' | 'legacy';
    path: string;
    isHybrid: boolean;
  };
  featureFlags: {
    smartRouterEnabled: boolean;
    uploadTypeEnabled: boolean;
    fallbackUsed: boolean;
  };
}

/**
 * Campaign Asset-Verwaltung Parameter
 */
export interface CampaignAssetParams {
  organizationId: string;
  campaignId: string;
  selectedProjectId?: string;
  uploadType?: CampaignUploadType;
}

// =====================
// CAMPAIGN MEDIA SERVICE
// =====================

class CampaignMediaService {

  /**
   * Haupt-Upload-Methode für Campaign Media mit Smart Router Integration
   */
  async uploadCampaignMedia(params: CampaignUploadParams): Promise<CampaignUploadResult> {
    try {
      // 1. Feature-Flag-Context erstellen
      const featureFlagContext = createFeatureFlagContext({
        organizationId: params.organizationId,
        userId: params.userId,
        campaignId: params.campaignId,
        projectId: params.selectedProjectId
      });

      // 2. Feature-Flags prüfen
      const smartRouterEnabled = isCampaignSmartRouterEnabled(featureFlagContext);
      // Map Campaign Upload Types zu Feature Flag Types
      const uploadTypeMapping = {
        'hero-image': 'hero-image' as const,
        'attachment': 'attachment' as const,
        'boilerplate-asset': 'boilerplate' as const,
        'generated-content': 'generated-content' as const
      };
      const mappedUploadType = uploadTypeMapping[params.uploadType] || 'attachment' as const;
      const uploadTypeEnabled = isUploadTypeSmartRouterEnabled(mappedUploadType, featureFlagContext);
      const migrationStatus = getMigrationStatus(featureFlagContext);

      // 3. Campaign Context erstellen
      const campaignContext = campaignContextBuilder.buildCampaignContext({
        organizationId: params.organizationId,
        userId: params.userId,
        campaignId: params.campaignId,
        campaignName: params.campaignName,
        selectedProjectId: params.selectedProjectId,
        selectedProjectName: params.selectedProjectName,
        uploadType: params.uploadType,
        clientId: params.clientId
      });

      // 4. Upload-Strategie entscheiden
      let uploadResult: UploadResult;
      let usedSmartRouter = false;

      if (smartRouterEnabled && uploadTypeEnabled) {
        // Smart Router Upload
        uploadResult = await this.executeSmartRouterUpload(
          params.file,
          campaignContext,
          params.onProgress
        );
        usedSmartRouter = true;
        
      } else if (migrationStatus.useLegacyFallback) {
        // Legacy Fallback Upload
        uploadResult = await this.executeLegacyUpload(
          params.file,
          campaignContext,
          params.onProgress
        );
        usedSmartRouter = false;
        
      } else {
        throw new Error('Upload nicht möglich: Smart Router deaktiviert und kein Fallback erlaubt');
      }

      // 5. Storage-Info bestimmen
      const storageConfig = campaignContextBuilder.buildStorageConfig(campaignContext);
      
      // 6. Erweiterte Upload-Result erstellen
      return {
        ...uploadResult,
        campaignContext,
        usedSmartRouter,
        storageInfo: {
          type: storageConfig.storageType,
          path: `${storageConfig.basePath}/${storageConfig.subPath}`,
          isHybrid: storageConfig.isOrganized
        },
        featureFlags: {
          smartRouterEnabled,
          uploadTypeEnabled,
          fallbackUsed: !usedSmartRouter
        }
      };

    } catch (error) {
      throw new Error(`Campaign Media Upload fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Hero Image Upload (spezialisierte Methode)
   */
  async uploadHeroImage(params: {
    organizationId: string;
    userId: string;
    campaignId: string;
    campaignName?: string;
    selectedProjectId?: string;
    selectedProjectName?: string;
    clientId?: string;
    file: File;
    onProgress?: (progress: number) => void;
  }): Promise<CampaignUploadResult> {
    
    // Validierung für Hero Images
    if (!params.file.type.startsWith('image/')) {
      throw new Error('Hero Image muss eine Bilddatei sein');
    }

    return this.uploadCampaignMedia({
      ...params,
      uploadType: 'hero-image'
    });
  }

  /**
   * Attachment Upload (spezialisierte Methode)
   */
  async uploadAttachment(params: {
    organizationId: string;
    userId: string;
    campaignId: string;
    campaignName?: string;
    selectedProjectId?: string;
    selectedProjectName?: string;
    clientId?: string;
    file: File;
    onProgress?: (progress: number) => void;
  }): Promise<CampaignUploadResult> {
    
    return this.uploadCampaignMedia({
      ...params,
      uploadType: 'attachment'
    });
  }

  /**
   * Campaign Assets abrufen (mit Hybrid-Support)
   */
  async getCampaignAssets(params: CampaignAssetParams): Promise<{
    assets: MediaAsset[];
    storageInfo: {
      organized: MediaAsset[];
      unorganized: MediaAsset[];
      total: number;
    };
  }> {
    try {
      // Alle Assets für die Organisation abrufen
      const allAssets = await mediaService.getMediaAssets(params.organizationId);
      
      // Campaign-spezifische Assets filtern
      const campaignAssets = allAssets.filter(asset => {
        // Tags-basierte Filterung
        const hasCampaignTag = asset.tags?.some(tag => 
          tag.includes(`campaign:${params.campaignId}`)
        );
        
        // Beschreibung-basierte Filterung (Fallback)
        const hasDescriptionRef = asset.description?.includes(params.campaignId);
        
        return hasCampaignTag || hasDescriptionRef;
      });

      // Nach Storage-Type kategorisieren
      const organized = campaignAssets.filter(asset => 
        asset.tags?.includes('storage:organized')
      );
      
      const unorganized = campaignAssets.filter(asset => 
        !asset.tags?.includes('storage:organized')
      );

      return {
        assets: campaignAssets,
        storageInfo: {
          organized,
          unorganized,
          total: campaignAssets.length
        }
      };

    } catch (error) {
      throw new Error(`Campaign Assets abrufen fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Campaign Hero Image abrufen
   */
  async getCampaignHeroImage(params: CampaignAssetParams): Promise<MediaAsset | null> {
    try {
      const { assets } = await this.getCampaignAssets(params);
      
      // Hero Image suchen (Tag-basiert)
      const heroImage = assets.find(asset => 
        asset.tags?.some(tag => tag.includes('upload-type:hero-image'))
      );

      return heroImage || null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Campaign Attachments abrufen
   */
  async getCampaignAttachments(params: CampaignAssetParams): Promise<MediaAsset[]> {
    try {
      const { assets } = await this.getCampaignAssets(params);
      
      // Attachments filtern
      const attachments = assets.filter(asset => 
        asset.tags?.some(tag => tag.includes('upload-type:attachment'))
      );

      return attachments;

    } catch (error) {
      return [];
    }
  }

  /**
   * Storage-Pfad Vorschau für UI
   */
  async previewCampaignStoragePath(params: {
    organizationId: string;
    userId: string;
    campaignId: string;
    campaignName?: string;
    selectedProjectId?: string;
    selectedProjectName?: string;
    uploadType: CampaignUploadType;
    fileName?: string;
  }): Promise<{
    path: string;
    storageType: 'organized' | 'unorganized';
    isHybrid: boolean;
    recommendation?: string;
  }> {
    
    const campaignContext = campaignContextBuilder.buildCampaignContext(params);
    const storageConfig = campaignContextBuilder.buildStorageConfig(campaignContext);
    
    const fullPath = params.fileName 
      ? campaignContextBuilder.generateStoragePreview(campaignContext, params.fileName)
      : `${storageConfig.basePath}/${storageConfig.subPath}/`;

    let recommendation: string | undefined;
    if (!params.selectedProjectId && params.uploadType === 'hero-image') {
      recommendation = 'Empfehlung: Projekt zuordnen für bessere Organisation';
    } else if (params.selectedProjectId) {
      recommendation = 'Organisierte Ablage aktiv - optimale Struktur';
    }

    return {
      path: fullPath,
      storageType: storageConfig.storageType,
      isHybrid: storageConfig.isOrganized,
      recommendation
    };
  }

  // =====================
  // PRIVATE METHODS
  // =====================

  /**
   * Smart Router Upload ausführen
   */
  private async executeSmartRouterUpload(
    file: File,
    context: CampaignUploadContext,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    
    // Upload Context für Smart Router konvertieren
    // Phase Mapping zwischen Campaign und Smart Upload Router
    const phaseMapping = {
      'draft': 'ideas_planning' as const,
      'review': 'internal_approval' as const,
      'approved': 'customer_approval' as const,
      'published': 'distribution' as const,
      'archived': 'monitoring' as const
    };
    
    const mappedPhase = context.pipelineStage ? phaseMapping[context.pipelineStage] : undefined;
    
    const uploadContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: context.selectedProjectId,
      campaignId: context.campaignId,
      uploadType: context.uploadType,
      clientId: context.clientId,
      phase: mappedPhase,
      autoTags: context.autoTags
    };

    return smartUploadRouter.smartUpload(file, uploadContext, onProgress);
  }

  /**
   * Legacy Upload ausführen
   */
  private async executeLegacyUpload(
    file: File,
    context: CampaignUploadContext,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    
    try {
      // Standard mediaService Upload
      const asset = await mediaService.uploadMedia(
        file,
        context.organizationId,
        undefined, // Kein folderId für Legacy
        onProgress,
        3,
        { 
          userId: context.userId,
          clientId: context.clientId 
        }
      );

      // Legacy Upload Result
      return {
        path: `organizations/${context.organizationId}/media`,
        service: 'mediaService.uploadMedia (legacy)',
        asset,
        uploadMethod: 'legacy'
      };

    } catch (error) {
      throw new Error(`Legacy Upload fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Asset-Metadaten für Campaign-Kontext erweitern
   */
  async enhanceCampaignAssetMetadata(
    assetId: string,
    context: CampaignUploadContext
  ): Promise<void> {
    try {
      const updates: any = {};

      // Campaign-spezifische Beschreibung
      if (context.campaignName) {
        updates.description = `Kampagne: ${context.campaignName}`;
        if (context.selectedProjectName) {
          updates.description += ` (Projekt: ${context.selectedProjectName})`;
        }
      }

      // Tags erweitern falls nicht bereits gesetzt
      if (context.autoTags && context.autoTags.length > 0) {
        updates.tags = context.autoTags;
      }

      if (Object.keys(updates).length > 0) {
        await mediaService.updateAsset(assetId, updates);
      }

    } catch (error) {
      // Nicht kritisch - Upload war erfolgreich
    }
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const campaignMediaService = new CampaignMediaService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Schneller Hero Image Upload
 */
export async function uploadCampaignHeroImage(params: {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  clientId?: string;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<CampaignUploadResult> {
  return campaignMediaService.uploadHeroImage(params);
}

/**
 * Schneller Attachment Upload
 */
export async function uploadCampaignAttachment(params: {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  clientId?: string;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<CampaignUploadResult> {
  return campaignMediaService.uploadAttachment(params);
}

/**
 * Campaign Storage Vorschau
 */
export async function previewCampaignStorage(params: {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType: CampaignUploadType;
  fileName?: string;
}): Promise<string> {
  const preview = await campaignMediaService.previewCampaignStoragePath(params);
  return preview.path;
}

/**
 * Feature-Status für Campaign Uploads prüfen
 */
export function getCampaignUploadFeatureStatus(params: {
  organizationId: string;
  userId: string;
  campaignId?: string;
  projectId?: string;
}): {
  smartRouterAvailable: boolean;
  hybridStorageAvailable: boolean;
  uploadTypesEnabled: Record<CampaignUploadType, boolean>;
} {
  const featureFlagContext = createFeatureFlagContext(params);
  
  return {
    smartRouterAvailable: isCampaignSmartRouterEnabled(featureFlagContext),
    hybridStorageAvailable: campaignFeatureFlags.isFeatureEnabled('HYBRID_STORAGE_ROUTING', featureFlagContext).isEnabled,
    uploadTypesEnabled: {
      'hero-image': isUploadTypeSmartRouterEnabled('hero-image', featureFlagContext),
      'attachment': isUploadTypeSmartRouterEnabled('attachment', featureFlagContext),
      'boilerplate-asset': isUploadTypeSmartRouterEnabled('boilerplate', featureFlagContext),
      'generated-content': isUploadTypeSmartRouterEnabled('generated-content', featureFlagContext)
    }
  };
}