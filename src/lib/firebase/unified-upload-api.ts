// src/lib/firebase/unified-upload-api.ts
// Unified Upload API Core für Phase 4 des Media Multi-Tenancy Masterplans
// Zentrale API für alle Upload-Operationen mit Performance-Optimierung und Legacy-Kompatibilität

import {
  UnifiedUploadContext,
  UnifiedUploadOptions,
  UnifiedUploadResult,
  UnifiedUploadTarget,
  UnifiedUploadType,
  BatchUploadContext,
  BatchUploadResult,
  LegacyUploadParams,
  LegacyUploadResult,
  PathPreview,
  UploadRecommendation,
  ContextValidationResult,
  ValidationError,
  UnifiedUploadError,
  UploadProgress,
  UploadPerformanceMetrics
} from '@/types/unified-upload';
import { MediaAsset } from '@/types/media';
import { Timestamp } from 'firebase/firestore';

// Service Imports
import { mediaService } from './media-service';
import { campaignMediaService } from './campaign-media-service';
import { projectUploadService } from './project-upload-service';
import { brandingService } from './branding-service';
import { smartUploadRouter } from './smart-upload-router';

// Utilities
import { uploadPerformanceManager } from './upload-performance-manager';
import { contextValidationEngine } from './context-validation-engine';

// =====================
// UNIFIED UPLOAD API CORE
// =====================

/**
 * Unified Upload API Service - Zentraler Service für alle Upload-Operationen
 */
class UnifiedUploadAPIService {

  // =====================
  // CORE UPLOAD METHODS
  // =====================

  /**
   * Haupt-Upload-Methode - Intelligente Weiterleitung basierend auf Context
   */
  async upload(
    files: File | File[],
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions = {}
  ): Promise<UnifiedUploadResult> {
    const startTime = Date.now();
    const filesArray = Array.isArray(files) ? files : [files];
    const uploadId = this.generateUploadId();

    try {
      // 1. Performance Manager initialisieren
      const performanceTracker = uploadPerformanceManager.startTracking(uploadId, filesArray);

      // 2. Context validieren
      const validationResult = await this.validateContext(context, options);
      if (!validationResult.isValid && !options.skipValidation) {
        throw new UnifiedUploadError(
          `Context-Validation fehlgeschlagen: ${validationResult.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_FAILED',
          context,
          undefined,
          false
        );
      }

      // 3. Context erweitern und optimieren
      const enhancedContext = await this.enhanceContext(context, filesArray, options);
      performanceTracker.recordContextResolution();

      // 4. Service Selection & Routing
      const routingDecision = await this.selectOptimalService(enhancedContext, filesArray, options);
      performanceTracker.recordRoutingDecision();

      // 5. Upload durchführen
      let result: UnifiedUploadResult;
      if (filesArray.length > 1) {
        // Batch Upload
        result = await this.executeBatchUpload(filesArray, enhancedContext, options, routingDecision);
      } else {
        // Single File Upload
        result = await this.executeSingleUpload(filesArray[0], enhancedContext, options, routingDecision);
      }

      // 6. Performance-Metriken finalisieren
      const finalMetrics = performanceTracker.finalize();
      result.performanceMetrics = finalMetrics;

      // 7. Recommendations generieren
      result.recommendations = await this.generateRecommendations(result, enhancedContext, options);

      return result;

    } catch (error) {
      // Error Handling mit Performance-Tracking
      const metrics = uploadPerformanceManager.getMetrics(uploadId) || this.getDefaultMetrics(startTime);
      
      if (error instanceof UnifiedUploadError) {
        throw error;
      }
      
      throw new UnifiedUploadError(
        `Upload fehlgeschlagen: ${error}`,
        'UPLOAD_FAILED',
        context,
        error as Error,
        true
      );
    }
  }

  /**
   * Media Library Upload - Optimiert für unorganisierte Medien
   */
  async uploadToMediaLibrary(
    files: File[],
    context: Omit<UnifiedUploadContext, 'uploadTarget' | 'uploadType'>
  ): Promise<UnifiedUploadResult> {
    const mediaLibraryContext: UnifiedUploadContext = {
      ...context,
      uploadTarget: 'media_library',
      uploadType: 'media_asset',
      contextSource: 'explicit',
      contextTimestamp: Timestamp.now()
    };

    return this.upload(files, mediaLibraryContext, {
      enableSmartRouting: false, // Media Library verwendet direkte Uploads
      enableAutoTagging: true,
      useLegacyFallback: true
    });
  }

  /**
   * Campaign Upload - Optimiert für Campaign-Assets
   */
  async uploadToCampaign(
    files: File[],
    context: Omit<UnifiedUploadContext, 'uploadTarget'> & { 
      campaignId: string;
      uploadType: 'hero_image' | 'attachment' | 'generated_content';
    }
  ): Promise<UnifiedUploadResult> {
    const campaignContext: UnifiedUploadContext = {
      ...context,
      uploadTarget: 'campaign',
      contextSource: 'explicit',
      contextTimestamp: Timestamp.now()
    };

    return this.upload(files, campaignContext, {
      enableSmartRouting: true,
      enableBatchOptimization: true,
      enableRecommendations: true
    });
  }

  /**
   * Project Upload - Optimiert für organisierte Project-Assets
   */
  async uploadToProject(
    files: File[],
    context: Omit<UnifiedUploadContext, 'uploadTarget' | 'uploadType'> & { 
      projectId: string;
    },
    options: UnifiedUploadOptions = {}
  ): Promise<UnifiedUploadResult> {
    const projectContext: UnifiedUploadContext = {
      ...context,
      uploadTarget: 'project',
      uploadType: 'media_asset',
      contextSource: 'explicit',
      contextTimestamp: Timestamp.now()
    };

    return this.upload(files, projectContext, {
      enableSmartRouting: true,
      enableBatchOptimization: true,
      enableAutoTagging: true,
      ...options
    });
  }

  /**
   * Branding Upload - Speziell für Brand Assets (Logo, etc.)
   */
  async uploadBranding(
    file: File,
    context: Omit<UnifiedUploadContext, 'uploadTarget'> & {
      uploadType: 'branding_logo' | 'branding_asset';
    }
  ): Promise<UnifiedUploadResult> {
    const brandingContext: UnifiedUploadContext = {
      ...context,
      uploadTarget: 'branding',
      contextSource: 'explicit',
      contextTimestamp: Timestamp.now()
    };

    return this.upload(file, brandingContext, {
      enableSmartRouting: false, // Branding verwendet direkte Service-Calls
      strictContextValidation: true,
      allowLargeFiles: false
    });
  }

  // =====================
  // UTILITY METHODS
  // =====================

  /**
   * Preview Upload Paths - Zeigt Routing-Entscheidungen vor Upload
   */
  async previewPaths(
    files: File[],
    context: UnifiedUploadContext
  ): Promise<PathPreview[]> {
    const previews: PathPreview[] = [];

    for (const file of files) {
      try {
        // Context für Preview erweitern
        const enhancedContext = await this.enhanceContext(context, [file], {});
        
        // Routing-Entscheidung simulieren
        const routingDecision = await this.selectOptimalService(enhancedContext, [file], {});
        
        // Preview-Path generieren
        const previewPath = await this.generatePreviewPath(file, enhancedContext, routingDecision);
        const recommendedPath = await this.generateRecommendedPath(file, enhancedContext);

        previews.push({
          file,
          previewPath,
          recommendedPath,
          pathDiffers: previewPath !== recommendedPath,
          recommendation: previewPath !== recommendedPath ? {
            type: 'BETTER_FOLDER',
            message: `Empfohlener Pfad: ${recommendedPath}`,
            confidence: 80,
            autoApplicable: true,
            impact: 'medium',
            category: 'organization'
          } : undefined,
          warnings: []
        });
      } catch (error) {
        previews.push({
          file,
          previewPath: 'Fehler bei Path-Generierung',
          recommendedPath: 'N/A',
          pathDiffers: false,
          warnings: [{
            code: 'CONTEXT_MISMATCH',
            message: `Path-Preview fehlgeschlagen: ${error}`,
            severity: 'medium',
            autoResolvable: false
          }]
        });
      }
    }

    return previews;
  }

  /**
   * Context Validation
   */
  async validateContext(
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions = {}
  ): Promise<ContextValidationResult> {
    return contextValidationEngine.validateContext(context, options);
  }

  /**
   * Upload Recommendations basierend auf Files und Context
   */
  async getRecommendations(
    files: File[],
    context: UnifiedUploadContext
  ): Promise<UploadRecommendation[]> {
    const recommendations: UploadRecommendation[] = [];

    // File Size Recommendations
    const largeFiles = files.filter(f => f.size > 10 * 1024 * 1024); // > 10MB
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'OPTIMIZE_FILE_SIZE',
        message: `${largeFiles.length} große Dateien erkannt. Komprimierung empfohlen.`,
        confidence: 85,
        autoApplicable: false,
        impact: 'medium',
        category: 'performance'
      });
    }

    // Batch Upload Recommendations
    if (files.length > 5 && !context.uploadTarget.includes('batch')) {
      recommendations.push({
        type: 'USE_BATCH_UPLOAD',
        message: 'Batch-Upload für bessere Performance empfohlen.',
        confidence: 90,
        autoApplicable: true,
        impact: 'high',
        category: 'performance'
      });
    }

    // Context-based Recommendations
    if (context.uploadTarget === 'media_library' && context.projectId) {
      recommendations.push({
        type: 'BETTER_FOLDER',
        message: 'Upload zu Projekt-spezifischem Ordner empfohlen.',
        confidence: 75,
        autoApplicable: true,
        impact: 'medium',
        category: 'organization'
      });
    }

    return recommendations;
  }

  /**
   * Batch Upload - Optimierte Mehrfach-Uploads
   */
  async uploadBatch(
    batches: Array<{
      files: File[];
      context: UnifiedUploadContext;
      options?: UnifiedUploadOptions;
    }>,
    onProgress?: (batchIndex: number, progress: UploadProgress) => void
  ): Promise<BatchUploadResult> {
    const batchId = this.generateBatchId();
    const results: BatchUploadResult['results'] = [];
    const startTime = Date.now();

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Batch-Context erweitern
        const batchContext: BatchUploadContext = {
          ...batch.context,
          batchId,
          batchSize: batch.files.length,
          parallelism: batch.options?.enableParallelProcessing ? 3 : 1,
          groupingStrategy: 'optimal'
        };

        // Progress Callback
        const progressCallback = (progress: UploadProgress) => {
          onProgress?.(batchIndex, progress);
        };

        // Batch Upload ausführen
        const batchResult = await this.upload(
          batch.files,
          batchContext,
          { ...batch.options, onProgress: progressCallback }
        );

        // Einzelne Ergebnisse extrahieren
        if (batchResult.assets) {
          batch.files.forEach((file, fileIndex) => {
            const asset = batchResult.assets?.[fileIndex];
            if (asset) {
              results.push({
                file,
                result: {
                  ...batchResult,
                  asset,
                  assets: undefined // Entferne assets array für einzelne Results
                },
                batchGroup: `batch_${batchIndex}`
              });
              successCount++;
            } else {
              results.push({
                file,
                error: 'Asset nicht in Batch-Result gefunden',
                batchGroup: `batch_${batchIndex}`
              });
              failCount++;
            }
          });
        } else if (batchResult.asset) {
          // Single Result
          results.push({
            file: batch.files[0],
            result: batchResult,
            batchGroup: `batch_${batchIndex}`
          });
          successCount++;
        }

      } catch (error) {
        // Batch komplett fehlgeschlagen
        batch.files.forEach(file => {
          results.push({
            file,
            error: error instanceof Error ? error.message : 'Unbekannter Batch-Fehler',
            batchGroup: `batch_${batchIndex}`
          });
          failCount++;
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalFiles = batches.reduce((sum, batch) => sum + batch.files.length, 0);

    return {
      batchId,
      totalFiles,
      successfulUploads: successCount,
      failedUploads: failCount,
      skippedUploads: skipCount,
      results,
      batchPerformanceMetrics: {
        // Performance Metrics für Batch
        totalDurationMs: totalDuration,
        contextResolutionMs: 0, // Aggregiert
        validationMs: 0,
        uploadMs: totalDuration * 0.8, // Schätzung
        postProcessingMs: totalDuration * 0.1,
        fileSizeBytes: batches.reduce((sum, batch) => 
          sum + batch.files.reduce((fileSum, file) => fileSum + file.size, 0), 0
        ),
        transferredBytes: 0, // Würde von Performance Manager kommen
        serviceLatencyMs: 0,
        retryCount: 0,
        cacheHits: 0,
        routingDecisionMs: totalDuration * 0.1,
        contextCacheHit: false,
        recommendationGenerated: true,
        // Batch-specific
        batchOptimizationMs: 0,
        parallelEfficiency: 0,
        contextReuseCount: 0,
        averageFileProcessingMs: totalFiles > 0 ? totalDuration / totalFiles : 0,
        peakMemoryUsageMB: 0,
        memoryEfficiency: 0,
        garbageCollectionEvents: 0
      },
      optimizationsSaved: 0,
      parallelProcessingUsed: batches.some(b => b.options?.enableParallelProcessing),
      contextCacheEfficiency: 0
    };
  }

  /**
   * Legacy Upload - Kompatibilitäts-Layer für bestehende Services
   */
  async legacyUpload(
    file: File,
    legacyParams: LegacyUploadParams
  ): Promise<LegacyUploadResult> {
    try {
      // Legacy Service Call
      let originalResult: any;
      
      switch (legacyParams.originalService) {
        case 'mediaService':
          originalResult = await this.callLegacyMediaService(file, legacyParams);
          break;
        case 'campaignMediaService':
          originalResult = await this.callLegacyCampaignService(file, legacyParams);
          break;
        case 'projectUploadService':
          originalResult = await this.callLegacyProjectService(file, legacyParams);
          break;
        case 'brandingService':
          originalResult = await this.callLegacyBrandingService(file, legacyParams);
          break;
        default:
          throw new Error(`Unbekannter Legacy-Service: ${legacyParams.originalService}`);
      }

      return {
        originalFormat: originalResult,
        serviceUsed: legacyParams.originalService,
        methodUsed: legacyParams.originalMethod,
        migrationAvailable: true,
        migrationBenefits: [
          'Bessere Performance durch Unified API',
          'Smart Routing und Recommendations',
          'Einheitliche Error-Behandlung',
          'Batch-Upload-Optimierung'
        ],
        deprecationWarning: `${legacyParams.originalService}.${legacyParams.originalMethod} ist deprecated. Migration zur Unified API empfohlen.`
      };

    } catch (error) {
      throw new UnifiedUploadError(
        `Legacy Upload fehlgeschlagen: ${error}`,
        'LEGACY_SERVICE_ERROR',
        undefined,
        error as Error,
        true
      );
    }
  }

  // =====================
  // PRIVATE IMPLEMENTATION METHODS
  // =====================

  /**
   * Context Enhancement - Erweitere Context mit Smart Router Informationen
   */
  private async enhanceContext(
    context: UnifiedUploadContext,
    files: File[],
    options: UnifiedUploadOptions
  ): Promise<UnifiedUploadContext> {
    const enhanced = { ...context };

    // Client ID Inheritance
    if (options.enableSmartRouting && !enhanced.clientId && enhanced.folderId) {
      try {
        const folder = await mediaService.getFolder(enhanced.folderId);
        if (folder?.clientId) {
          enhanced.clientId = folder.clientId;
          enhanced.contextSource = 'inherited';
        }
      } catch (error) {
        // Nicht kritisch
      }
    }

    // Auto-Tags generieren
    if (options.enableAutoTagging) {
      const autoTags = files.map(file => {
        const tags = [];
        
        // File-Type Tags
        if (file.type.startsWith('image/')) tags.push('type:image');
        if (file.type.startsWith('video/')) tags.push('type:video');
        if (file.type === 'application/pdf') tags.push('type:pdf');
        
        // Upload-Target Tag
        tags.push(`target:${enhanced.uploadTarget}`);
        
        // Date Tag
        tags.push(`uploaded:${new Date().toISOString().split('T')[0]}`);
        
        return tags;
      }).flat();
      
      enhanced.autoTags = [...(enhanced.autoTags || []), ...autoTags];
    }

    return enhanced;
  }

  /**
   * Service Selection - Wähle optimalen Service basierend auf Context
   */
  private async selectOptimalService(
    context: UnifiedUploadContext,
    files: File[],
    options: UnifiedUploadOptions
  ): Promise<{
    service: string;
    method: string;
    confidence: number;
    reasoning: string[];
  }> {
    // Smart Router entscheidet basierend auf Context
    if (options.enableSmartRouting && context.uploadTarget !== 'branding') {
      return {
        service: 'smartUploadRouter',
        method: 'smartUpload',
        confidence: 95,
        reasoning: ['Smart Router aktiviert', 'Context unterstützt intelligentes Routing']
      };
    }

    // Service-spezifische Entscheidungen
    switch (context.uploadTarget) {
      case 'campaign':
        return {
          service: 'campaignMediaService',
          method: 'uploadCampaignMedia',
          confidence: 90,
          reasoning: ['Campaign-spezifischer Upload', 'Optimiert für Campaign-Assets']
        };
      
      case 'project':
        return {
          service: 'projectUploadService',
          method: 'uploadToProject',
          confidence: 85,
          reasoning: ['Project-spezifischer Upload', 'Batch-Optimierung verfügbar']
        };
      
      case 'branding':
        return {
          service: 'brandingService',
          method: 'updateBrandingSettings',
          confidence: 80,
          reasoning: ['Branding-spezifischer Upload', 'Direkte Service-Integration']
        };
      
      case 'media_library':
      default:
        return {
          service: 'mediaService',
          method: 'uploadMedia',
          confidence: 70,
          reasoning: ['Standard Media Upload', 'Bewährte Implementierung']
        };
    }
  }

  /**
   * Single File Upload Execution
   */
  private async executeSingleUpload(
    file: File,
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions,
    routingDecision: any
  ): Promise<UnifiedUploadResult> {
    const uploadId = this.generateUploadId();
    const startTime = Date.now();

    // Service Call basierend auf Routing-Entscheidung
    let asset: MediaAsset | undefined;
    let servicePath: string;

    if (routingDecision.service === 'smartUploadRouter') {
      const smartResult = await smartUploadRouter.smartUpload(
        file,
        {
          organizationId: context.organizationId,
          userId: context.userId,
          uploadType: this.mapUploadTargetToSmartRouter(context.uploadTarget),
          projectId: context.projectId,
          campaignId: context.campaignId,
          folderId: context.folderId,
          clientId: context.clientId,
          phase: context.phase === 'archived' ? 'monitoring' : context.phase,
          autoTags: context.autoTags
        },
        options.onProgress ? (progress) => {
          options.onProgress!({
            phase: 'uploading',
            overallProgress: progress,
            currentPhaseProgress: progress,
            phaseDescription: 'Smart Router Upload',
            fileName: file.name,
            bytesTransferred: (file.size * progress) / 100,
            totalBytes: file.size,
            transferRate: 0,
            estimatedRemainingMs: 0,
            startedAt: Timestamp.fromMillis(startTime)
          });
        } : undefined
      );
      
      asset = smartResult.asset;
      servicePath = smartResult.path;
    } else {
      // Direkte Service-Calls (Legacy oder spezifisch)
      asset = await this.executeDirectServiceCall(file, context, routingDecision, options);
      servicePath = `organizations/${context.organizationId}/media`;
    }

    return {
      success: true,
      uploadId,
      asset,
      uploadMethod: 'smart_router',
      serviceUsed: routingDecision.service,
      storagePath: servicePath,
      performanceMetrics: this.getDefaultMetrics(startTime),
      resolvedContext: context,
      contextInheritance: {
        inheritanceSource: 'none',
        inheritanceChain: []
      },
      recommendations: [],
      warnings: [],
      smartRouterUsed: routingDecision.service === 'smartUploadRouter',
      routingDecision: {
        selectedService: routingDecision.service,
        routingReason: routingDecision.reasoning.join(', '),
        confidence: routingDecision.confidence,
        alternativeOptions: [],
        routingPath: servicePath,
        optimizations: []
      }
    };
  }

  /**
   * Batch Upload Execution
   */
  private async executeBatchUpload(
    files: File[],
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions,
    routingDecision: any
  ): Promise<UnifiedUploadResult> {
    const uploadId = this.generateUploadId();
    const assets: MediaAsset[] = [];
    
    // TODO: Implementiere Batch-optimierte Uploads basierend auf Service
    // Für jetzt: Sequenziell verarbeiten
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const singleResult = await this.executeSingleUpload(file, context, {
        ...options,
        onProgress: options.onProgress ? (progress) => {
          options.onProgress!({
            ...progress,
            fileIndex: i,
            totalFiles: files.length,
            overallProgress: ((i / files.length) * 100) + (progress.overallProgress / files.length)
          });
        } : undefined
      }, routingDecision);
      
      if (singleResult.asset) {
        assets.push(singleResult.asset);
      }
    }

    return {
      success: true,
      uploadId,
      assets,
      uploadMethod: 'batch_optimized',
      serviceUsed: routingDecision.service,
      storagePath: `organizations/${context.organizationId}/media/batch`,
      performanceMetrics: this.getDefaultMetrics(Date.now()),
      resolvedContext: context,
      contextInheritance: {
        inheritanceSource: 'none',
        inheritanceChain: []
      },
      recommendations: [],
      warnings: [],
      smartRouterUsed: routingDecision.service === 'smartUploadRouter',
      routingDecision: {
        selectedService: routingDecision.service,
        routingReason: routingDecision.reasoning.join(', '),
        confidence: routingDecision.confidence,
        alternativeOptions: [],
        routingPath: `organizations/${context.organizationId}/media/batch`,
        optimizations: ['batch_processing']
      }
    };
  }

  // Helper Methods
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultMetrics(startTime: number): UploadPerformanceMetrics {
    const duration = Date.now() - startTime;
    return {
      totalDurationMs: duration,
      contextResolutionMs: duration * 0.1,
      validationMs: duration * 0.05,
      uploadMs: duration * 0.8,
      postProcessingMs: duration * 0.05,
      fileSizeBytes: 0,
      transferredBytes: 0,
      serviceLatencyMs: duration * 0.1,
      retryCount: 0,
      cacheHits: 0,
      routingDecisionMs: duration * 0.1,
      contextCacheHit: false,
      recommendationGenerated: false
    };
  }

  private mapUploadTargetToSmartRouter(target: UnifiedUploadTarget): any {
    const mapping: Record<string, string> = {
      'media_library': 'media-library',
      'project': 'project',
      'campaign': 'campaign',
      'branding': 'branding',
      'folder': 'media-library',
      'legacy': 'media-library'
    };
    return mapping[target] || 'media-library';
  }

  // Legacy Service Calls (Placeholder - würde echte Service-Integration erfordern)
  private async callLegacyMediaService(file: File, params: LegacyUploadParams): Promise<any> {
    // Vereinfachte Legacy-Integration
    return mediaService.uploadMedia(
      file,
      params.originalParams.organizationId,
      params.originalParams.folderId,
      undefined,
      3,
      { userId: params.originalParams.userId }
    );
  }

  private async callLegacyCampaignService(file: File, params: LegacyUploadParams): Promise<any> {
    // Placeholder für Campaign Service Legacy Call
    throw new Error('Campaign Service Legacy Call nicht implementiert');
  }

  private async callLegacyProjectService(file: File, params: LegacyUploadParams): Promise<any> {
    // Placeholder für Project Service Legacy Call  
    throw new Error('Project Service Legacy Call nicht implementiert');
  }

  private async callLegacyBrandingService(file: File, params: LegacyUploadParams): Promise<any> {
    // Placeholder für Branding Service Legacy Call
    throw new Error('Branding Service Legacy Call nicht implementiert');
  }

  private async executeDirectServiceCall(
    file: File,
    context: UnifiedUploadContext,
    routingDecision: any,
    options: UnifiedUploadOptions
  ): Promise<MediaAsset> {
    // Vereinfachte direkte Service-Calls
    return mediaService.uploadMedia(
      file,
      context.organizationId,
      context.folderId,
      undefined,
      3,
      { 
        userId: context.userId,
        clientId: context.clientId
      }
    );
  }

  private async generatePreviewPath(file: File, context: UnifiedUploadContext, routingDecision: any): Promise<string> {
    return `organizations/${context.organizationId}/media/preview/${file.name}`;
  }

  private async generateRecommendedPath(file: File, context: UnifiedUploadContext): Promise<string> {
    return `organizations/${context.organizationId}/media/recommended/${file.name}`;
  }

  private async generateRecommendations(
    result: UnifiedUploadResult,
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions
  ): Promise<UploadRecommendation[]> {
    return []; // TODO: Implementiere Recommendation-Engine
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const unifiedUploadAPI = new UnifiedUploadAPIService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Quick Upload für häufige Anwendungsfälle
 */
export async function quickUpload(
  file: File,
  organizationId: string,
  userId: string,
  target: UnifiedUploadTarget = 'media_library',
  options: UnifiedUploadOptions = {}
): Promise<UnifiedUploadResult> {
  const context: UnifiedUploadContext = {
    organizationId,
    userId,
    uploadTarget: target,
    uploadType: 'media_asset',
    contextSource: 'explicit',
    contextTimestamp: Timestamp.now()
  };

  return unifiedUploadAPI.upload(file, context, options);
}

/**
 * Smart Batch Upload
 */
export async function smartBatchUpload(
  files: File[],
  organizationId: string,
  userId: string,
  target: UnifiedUploadTarget = 'media_library',
  onProgress?: (batchIndex: number, progress: UploadProgress) => void
): Promise<BatchUploadResult> {
  const context: UnifiedUploadContext = {
    organizationId,
    userId,
    uploadTarget: target,
    uploadType: 'media_asset',
    contextSource: 'explicit',
    contextTimestamp: Timestamp.now()
  };

  return unifiedUploadAPI.uploadBatch([{
    files,
    context,
    options: {
      enableBatchOptimization: true,
      enableSmartRouting: true,
      enableParallelProcessing: files.length <= 10
    }
  }], onProgress);
}