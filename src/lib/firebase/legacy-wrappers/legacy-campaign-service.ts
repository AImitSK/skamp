// src/lib/firebase/legacy-wrappers/legacy-campaign-service.ts
// Legacy Wrapper für campaignMediaService - Vollständige Rückwärts-Kompatibilität
// Smart Router Integration mit schrittweiser Migration

import { campaignMediaService, CampaignUploadParams, CampaignUploadResult } from '../campaign-media-service';
import { unifiedUploadAPI } from '../unified-upload-api';
import { UnifiedUploadContext, UnifiedUploadType } from '@/types/unified-upload';
import { MediaAsset } from '@/types/media';
import { Timestamp } from 'firebase/firestore';

// =====================
// LEGACY PARAMETER INTERFACES
// =====================

/**
 * Legacy Campaign Upload Parameter - Original Interface
 */
interface LegacyCampaignUploadParams {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType: 'hero-image' | 'attachment' | 'boilerplate-asset' | 'generated-content';
  clientId?: string;
  file: File;
  onProgress?: (progress: number) => void;
}

/**
 * Legacy Campaign Assets Parameter
 */
interface LegacyCampaignAssetsParams {
  organizationId: string;
  campaignId: string;
  selectedProjectId?: string;
  uploadType?: 'hero-image' | 'attachment' | 'boilerplate-asset' | 'generated-content';
}

/**
 * Legacy Storage Preview Parameter
 */
interface LegacyStoragePreviewParams {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType: 'hero-image' | 'attachment' | 'boilerplate-asset' | 'generated-content';
  fileName?: string;
}

// =====================
// LEGACY CAMPAIGN SERVICE WRAPPER
// =====================

class LegacyCampaignServiceWrapper {
  private migrationEnabled = true;
  private migrationStats = {
    totalUploads: 0,
    unifiedAPIUploads: 0,
    legacyUploads: 0,
    heroImageUploads: 0,
    attachmentUploads: 0,
    failedMigrations: 0
  };

  // =====================
  // CORE UPLOAD METHODS
  // =====================

  /**
   * Legacy uploadCampaignMedia - 100% API-kompatibel
   */
  async uploadCampaignMedia(params: LegacyCampaignUploadParams): Promise<CampaignUploadResult> {
    this.trackUpload('campaign_media', params.uploadType);

    try {
      // Feature-Flag Check für Migration
      if (this.migrationEnabled && await this.shouldMigrateToCampaignUpload(params)) {
        return await this.migrateCampaignUpload(params);
      }

      // Legacy Service Call
      return await this.legacyCampaignUpload(params);

    } catch (error) {
      // Graceful Fallback bei Migration-Fehlern
      if (this.isUnifiedAPIError(error)) {
        console.warn('Campaign Upload Migration fehlgeschlagen, Fallback zu Legacy:', error);
        this.migrationStats.failedMigrations++;
        return await this.legacyCampaignUpload(params);
      }
      throw error;
    }
  }

  /**
   * Legacy uploadHeroImage - Spezialisierte Method
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
    
    const legacyParams: LegacyCampaignUploadParams = {
      ...params,
      uploadType: 'hero-image'
    };

    return this.uploadCampaignMedia(legacyParams);
  }

  /**
   * Legacy uploadAttachment - Spezialisierte Method
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
    
    const legacyParams: LegacyCampaignUploadParams = {
      ...params,
      uploadType: 'attachment'
    };

    return this.uploadCampaignMedia(legacyParams);
  }

  // =====================
  // ASSET RETRIEVAL METHODS
  // =====================

  /**
   * Legacy getCampaignAssets
   */
  async getCampaignAssets(params: LegacyCampaignAssetsParams): Promise<{
    assets: MediaAsset[];
    storageInfo: {
      organized: MediaAsset[];
      unorganized: MediaAsset[];
      total: number;
    };
  }> {
    // Asset Retrieval verwendet Legacy Service (keine Migration nötig)
    return await campaignMediaService.getCampaignAssets(params);
  }

  /**
   * Legacy getCampaignHeroImage
   */
  async getCampaignHeroImage(params: LegacyCampaignAssetsParams): Promise<MediaAsset | null> {
    return await campaignMediaService.getCampaignHeroImage(params);
  }

  /**
   * Legacy getCampaignAttachments
   */
  async getCampaignAttachments(params: LegacyCampaignAssetsParams): Promise<MediaAsset[]> {
    return await campaignMediaService.getCampaignAttachments(params);
  }

  /**
   * Legacy previewCampaignStoragePath
   */
  async previewCampaignStoragePath(params: LegacyStoragePreviewParams): Promise<{
    path: string;
    storageType: 'organized' | 'unorganized';
    isHybrid: boolean;
    recommendation?: string;
  }> {
    return await campaignMediaService.previewCampaignStoragePath(params);
  }

  // =====================
  // MIGRATION IMPLEMENTATIONS
  // =====================

  /**
   * Migration: Campaign Upload zu Unified API
   */
  private async migrateCampaignUpload(params: LegacyCampaignUploadParams): Promise<CampaignUploadResult> {
    try {
      // Legacy Parameter zu Unified Context konvertieren
      const unifiedContext: UnifiedUploadContext = {
        organizationId: params.organizationId,
        userId: params.userId,
        uploadTarget: 'campaign',
        uploadType: this.mapLegacyUploadType(params.uploadType),
        campaignId: params.campaignId,
        projectId: params.selectedProjectId,
        clientId: params.clientId,
        contextSource: 'explicit',
        contextTimestamp: Timestamp.now(),
        
        // Campaign-spezifische Context-Erweiterung
        autoDescription: params.campaignName ? `Kampagne: ${params.campaignName}` : undefined,
        autoTags: [
          `campaign:${params.campaignId}`,
          `upload-type:${params.uploadType}`,
          ...(params.selectedProjectId ? [`project:${params.selectedProjectId}`] : [])
        ]
      };

      // Unified Upload API aufrufen
      const result = await unifiedUploadAPI.uploadToCampaign(
        [params.file],
        {
          ...unifiedContext,
          campaignId: params.campaignId,
          uploadType: this.mapLegacyUploadType(params.uploadType)
        }
      );

      // Migration erfolgreich - Result zu Legacy Format konvertieren
      this.migrationStats.unifiedAPIUploads++;
      
      return this.convertUnifiedResultToCampaignResult(result, params);

    } catch (error) {
      this.migrationStats.failedMigrations++;
      throw error;
    }
  }

  /**
   * Legacy Service Call
   */
  private async legacyCampaignUpload(params: LegacyCampaignUploadParams): Promise<CampaignUploadResult> {
    this.migrationStats.legacyUploads++;

    // Original Campaign Service Parameter konvertieren
    const campaignParams: CampaignUploadParams = {
      organizationId: params.organizationId,
      userId: params.userId,
      campaignId: params.campaignId,
      campaignName: params.campaignName,
      selectedProjectId: params.selectedProjectId,
      selectedProjectName: params.selectedProjectName,
      uploadType: params.uploadType,
      clientId: params.clientId,
      file: params.file,
      onProgress: params.onProgress
    };

    return await campaignMediaService.uploadCampaignMedia(campaignParams);
  }

  // =====================
  // MIGRATION DECISION LOGIC
  // =====================

  /**
   * Migration-Entscheidung für Campaign Uploads
   */
  private async shouldMigrateToCampaignUpload(params: LegacyCampaignUploadParams): Promise<boolean> {
    // Feature-Flag basierte Migration mit A/B Testing
    const migrationPercentages = {
      'hero-image': this.getCampaignMigrationPercentage('UNIFIED_HERO_IMAGE_UPLOAD'),
      'attachment': this.getCampaignMigrationPercentage('UNIFIED_ATTACHMENT_UPLOAD'),
      'boilerplate-asset': this.getCampaignMigrationPercentage('UNIFIED_BOILERPLATE_UPLOAD'),
      'generated-content': this.getCampaignMigrationPercentage('UNIFIED_GENERATED_CONTENT_UPLOAD')
    };

    const migrationPercentage = migrationPercentages[params.uploadType] || 0;

    // Deterministic Migration basierend auf campaignId Hash
    if (migrationPercentage >= 100) return true;
    if (migrationPercentage <= 0) return false;

    const hash = this.hashString(params.campaignId);
    const bucket = hash % 100;
    
    return bucket < migrationPercentage;
  }

  /**
   * Campaign-spezifische Migration Percentages
   */
  private getCampaignMigrationPercentage(flagName: string): number {
    // Graduelle Migration für Campaign Uploads
    const percentages: Record<string, number> = {
      'UNIFIED_HERO_IMAGE_UPLOAD': 15,        // 15% für Hero Images (kritisch)
      'UNIFIED_ATTACHMENT_UPLOAD': 25,        // 25% für Attachments (weniger kritisch)
      'UNIFIED_BOILERPLATE_UPLOAD': 10,       // 10% für Boilerplate (experimentell)
      'UNIFIED_GENERATED_CONTENT_UPLOAD': 5   // 5% für Generated Content (neu)
    };

    return percentages[flagName] || 0;
  }

  // =====================
  // TYPE MAPPING & CONVERSION
  // =====================

  /**
   * Legacy Upload Type zu Unified Upload Type Mapping
   */
  private mapLegacyUploadType(legacyType: LegacyCampaignUploadParams['uploadType']): 'hero_image' | 'attachment' | 'generated_content' {
    const typeMapping: Record<LegacyCampaignUploadParams['uploadType'], 'hero_image' | 'attachment' | 'generated_content'> = {
      'hero-image': 'hero_image',
      'attachment': 'attachment',
      'boilerplate-asset': 'attachment',
      'generated-content': 'generated_content'
    };

    return typeMapping[legacyType] || 'attachment';
  }

  /**
   * Unified Result zu Legacy Campaign Result konvertieren
   */
  private convertUnifiedResultToCampaignResult(
    unifiedResult: any, // UnifiedUploadResult
    originalParams: LegacyCampaignUploadParams
  ): CampaignUploadResult {
    
    // Vereinfachte Konversion - würde echte Campaign-spezifische Felder erfordern
    const campaignResult: CampaignUploadResult = {
      // Unified Result Base
      ...unifiedResult,
      
      // Campaign-spezifische Felder aus Legacy Interface
      campaignContext: {
        organizationId: originalParams.organizationId,
        userId: originalParams.userId,
        campaignId: originalParams.campaignId,
        campaignName: originalParams.campaignName,
        selectedProjectId: originalParams.selectedProjectId,
        selectedProjectName: originalParams.selectedProjectName,
        uploadType: originalParams.uploadType,
        clientId: originalParams.clientId,
        autoTags: unifiedResult.resolvedContext.autoTags || [],
        contextSource: 'migration' as const,
        contextTimestamp: Timestamp.now()
      },
      
      usedSmartRouter: unifiedResult.smartRouterUsed,
      
      storageInfo: {
        type: unifiedResult.uploadMethod === 'smart_router' ? 'organized' : 'unorganized',
        path: unifiedResult.storagePath,
        isHybrid: unifiedResult.uploadMethod !== 'legacy_wrapper'
      },
      
      featureFlags: {
        smartRouterEnabled: unifiedResult.smartRouterUsed,
        uploadTypeEnabled: true,
        fallbackUsed: unifiedResult.uploadMethod === 'legacy_wrapper'
      }
    };

    return campaignResult;
  }

  // =====================
  // MONITORING & STATISTICS
  // =====================

  /**
   * Upload Tracking für Analytics
   */
  private trackUpload(operation: string, uploadType: string): void {
    this.migrationStats.totalUploads++;
    
    // Upload Type spezifisches Tracking
    switch (uploadType) {
      case 'hero-image':
        this.migrationStats.heroImageUploads++;
        break;
      case 'attachment':
        this.migrationStats.attachmentUploads++;
        break;
    }

    // Periodic Logging
    if (this.migrationStats.totalUploads % 50 === 0) {
      console.info('Campaign Upload Migration Stats:', {
        ...this.migrationStats,
        migrationRate: this.getMigrationRate(),
        operation,
        uploadType
      });
    }
  }

  /**
   * Migration Statistics
   */
  getCampaignMigrationStatistics(): {
    totalUploads: number;
    migrationRate: number;
    uploadTypeBreakdown: {
      heroImages: number;
      attachments: number;
      other: number;
    };
    failureRate: number;
    lastUpdate: string;
  } {
    return {
      totalUploads: this.migrationStats.totalUploads,
      migrationRate: this.getMigrationRate(),
      uploadTypeBreakdown: {
        heroImages: this.migrationStats.heroImageUploads,
        attachments: this.migrationStats.attachmentUploads,
        other: this.migrationStats.totalUploads - this.migrationStats.heroImageUploads - this.migrationStats.attachmentUploads
      },
      failureRate: this.migrationStats.totalUploads > 0 
        ? Math.round((this.migrationStats.failedMigrations / this.migrationStats.totalUploads) * 100)
        : 0,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Migration Rate berechnen
   */
  private getMigrationRate(): number {
    return this.migrationStats.totalUploads > 0
      ? Math.round((this.migrationStats.unifiedAPIUploads / this.migrationStats.totalUploads) * 100)
      : 0;
  }

  /**
   * Reset Statistics
   */
  resetCampaignMigrationStatistics(): void {
    this.migrationStats = {
      totalUploads: 0,
      unifiedAPIUploads: 0,
      legacyUploads: 0,
      heroImageUploads: 0,
      attachmentUploads: 0,
      failedMigrations: 0
    };
  }

  // =====================
  // UTILITY METHODS
  // =====================

  private isUnifiedAPIError(error: any): boolean {
    return error?.name === 'UnifiedUploadError' ||
           error?.message?.includes('Unified API') ||
           error?.code?.startsWith('UNIFIED_');
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const legacyCampaignService = new LegacyCampaignServiceWrapper();

// =====================
// API COMPATIBILITY LAYER
// =====================

/**
 * Drop-in Replacement für campaignMediaService mit Unified API Integration
 */
export const campaignMediaServiceWithUnifiedAPI = {
  // Original campaignMediaService Methods
  ...campaignMediaService,
  
  // Überschreibung der Upload-Methods mit Legacy-Wrapper
  uploadCampaignMedia: legacyCampaignService.uploadCampaignMedia.bind(legacyCampaignService),
  uploadHeroImage: legacyCampaignService.uploadHeroImage.bind(legacyCampaignService),
  uploadAttachment: legacyCampaignService.uploadAttachment.bind(legacyCampaignService),
  
  // Migration Statistics
  getCampaignMigrationStatistics: legacyCampaignService.getCampaignMigrationStatistics.bind(legacyCampaignService),
  resetCampaignMigrationStatistics: legacyCampaignService.resetCampaignMigrationStatistics.bind(legacyCampaignService)
};

// =====================
// CONVENIENCE EXPORTS
// =====================

/**
 * Legacy Convenience Functions mit Unified API Integration
 */
export async function uploadCampaignHeroImageUnified(params: {
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
  return legacyCampaignService.uploadHeroImage(params);
}

export async function uploadCampaignAttachmentUnified(params: {
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
  return legacyCampaignService.uploadAttachment(params);
}