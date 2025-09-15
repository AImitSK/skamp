// src/lib/firebase/project-upload-service.ts
// Dedizierter Service für Project Folder Uploads mit Smart Router Integration

import { smartUploadRouter, UploadContext, UploadResult } from './smart-upload-router';
import { mediaService } from './media-service';
import { projectFolderContextBuilder, ProjectFolderContext, FolderRoutingRecommendation } from '@/components/projects/utils/project-folder-context-builder';
import { projectFolderFeatureFlags, getUploadFeatureConfig } from '@/components/projects/config/project-folder-feature-flags';
import { PipelineStage } from '@/types/project';

// =====================
// PROJECT UPLOAD INTERFACES
// =====================

/**
 * Project Upload Konfiguration
 */
export interface ProjectUploadConfig {
  projectId: string;
  projectTitle: string;
  projectCompany?: string;
  currentStage: PipelineStage;
  organizationId: string;
  clientId?: string;
  userId: string;
  
  // Ordner-Kontext
  currentFolderId?: string;
  folderName?: string;
  availableFolders: Array<{ id: string; name: string; type?: string }>;
  
  // Upload-Optionen
  useSmartRouting?: boolean;
  allowBatchOptimization?: boolean;
  enableRecommendations?: boolean;
}

/**
 * Project Upload Ergebnis
 */
export interface ProjectUploadResult extends UploadResult {
  // Smart Router Ergebnis
  smartRouterUsed: boolean;
  recommendation?: FolderRoutingRecommendation;
  finalTargetFolder: string;
  
  // Pipeline-Kontext
  pipelineStage: PipelineStage;
  pipelineWarnings: string[];
  
  // Upload-Metadaten
  uploadDuration: number;
  fileProcessingTime: number;
  routingDecisionTime: number;
}

/**
 * Batch Upload Ergebnis
 */
export interface BatchUploadResult {
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  uploads: Array<{
    file: File;
    result?: ProjectUploadResult;
    error?: string;
    batchGroup: string;
  }>;
  totalDuration: number;
  averageFileSize: number;
  routingOptimizations: number;
}

/**
 * Upload-Validation Ergebnis
 */
export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  canProceed: boolean;
}

// =====================
// PROJECT UPLOAD SERVICE
// =====================

class ProjectUploadService {
  
  /**
   * Haupt-Upload-Methode: Einzelne Datei mit Smart Routing
   */
  async uploadToProject(
    file: File,
    config: ProjectUploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<ProjectUploadResult> {
    const startTime = Date.now();
    
    try {
      // 1. Feature Flags prüfen
      const featureConfig = getUploadFeatureConfig(config.userId, config.organizationId);
      
      // 2. Upload validieren
      const validation = await this.validateUpload(file, config);
      if (!validation.isValid) {
        throw new Error(`Upload-Validation fehlgeschlagen: ${validation.errors.join(', ')}`);
      }
      
      // 3. Context aufbauen
      const routingStartTime = Date.now();
      const context = this.buildProjectContext(config);
      
      // 4. Smart Routing (falls aktiviert)
      let recommendation: FolderRoutingRecommendation | undefined;
      let targetFolderId = config.currentFolderId;
      
      if (featureConfig.useSmartRouter && config.useSmartRouting !== false) {
        recommendation = await this.getSmartRecommendation(file, context, config.availableFolders);
        
        // Verwende Empfehlung falls kein spezifischer Ordner angegeben
        if (!targetFolderId && recommendation.confidence > 70) {
          targetFolderId = recommendation.targetFolderId;
        }
      }
      
      const routingDecisionTime = Date.now() - routingStartTime;
      
      // 5. Upload durchführen
      let uploadResult: UploadResult;
      
      if (featureConfig.useSmartRouter) {
        // Smart Router Upload
        const enhancedContext: UploadContext = {
          ...context,
          folderId: targetFolderId
        };
        
        uploadResult = await smartUploadRouter.smartUpload(
          file,
          enhancedContext,
          onProgress
        );
      } else {
        // Fallback: Standard Upload
        uploadResult = await this.fallbackUpload(file, config, targetFolderId, onProgress);
      }
      
      const totalDuration = Date.now() - startTime;
      const fileProcessingTime = totalDuration - routingDecisionTime;
      
      // 6. Pipeline-Warnings prüfen
      const pipelineWarnings = this.checkPipelineWarnings(context);
      
      return {
        ...uploadResult,
        smartRouterUsed: featureConfig.useSmartRouter,
        recommendation,
        finalTargetFolder: targetFolderId || 'root',
        pipelineStage: config.currentStage,
        pipelineWarnings,
        uploadDuration: totalDuration,
        fileProcessingTime,
        routingDecisionTime
      };
      
    } catch (error) {
      throw new Error(`Project Upload fehlgeschlagen: ${error}`);
    }
  }
  
  /**
   * Batch Upload: Mehrere Dateien optimiert hochladen
   */
  async uploadBatchToProject(
    files: File[],
    config: ProjectUploadConfig,
    onProgress?: (fileIndex: number, fileProgress: number) => void,
    onFileComplete?: (file: File, result?: ProjectUploadResult, error?: string) => void
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const results: BatchUploadResult['uploads'] = [];
    
    try {
      // Feature Flags prüfen
      const featureConfig = getUploadFeatureConfig(config.userId, config.organizationId);
      
      // Context aufbauen
      const context = this.buildProjectContext(config);
      
      // Batch-Optimierung (falls aktiviert)
      let batchGroups: Array<{ file: File; recommendation: FolderRoutingRecommendation; batchGroup: string }> = [];
      
      if (featureConfig.enableBatchOptimization && config.allowBatchOptimization !== false) {
        batchGroups = projectFolderContextBuilder.optimizeBatchUploadRouting(
          files,
          context,
          config.availableFolders
        );
      } else {
        // Standard: Jede Datei einzeln
        batchGroups = files.map(file => ({
          file,
          recommendation: { targetFolderId: config.currentFolderId || '', folderName: '', folderType: 'Dokumente', confidence: 50, reasoning: [], alternativeOptions: [] },
          batchGroup: 'standard'
        }));
      }
      
      // Upload-Processing
      const parallelProcessing = featureConfig.enableBatchOptimization && 
                                projectFolderFeatureFlags.isEnabled('PARALLEL_UPLOAD_PROCESSING');
      
      if (parallelProcessing) {
        // Parallel Upload (nur für kleinere Batches)
        await this.processParallelUploads(batchGroups, config, results, onProgress, onFileComplete);
      } else {
        // Sequenzieller Upload
        await this.processSequentialUploads(batchGroups, config, results, onProgress, onFileComplete);
      }
      
      const totalDuration = Date.now() - startTime;
      const successfulUploads = results.filter(r => r.result && !r.error).length;
      const failedUploads = results.length - successfulUploads;
      const averageFileSize = files.reduce((sum, file) => sum + file.size, 0) / files.length;
      const routingOptimizations = batchGroups.filter(bg => bg.recommendation.confidence > 80).length;
      
      return {
        totalFiles: files.length,
        successfulUploads,
        failedUploads,
        uploads: results,
        totalDuration,
        averageFileSize,
        routingOptimizations
      };
      
    } catch (error) {
      throw new Error(`Batch Upload fehlgeschlagen: ${error}`);
    }
  }
  
  /**
   * Upload-Validation vor dem eigentlichen Upload
   */
  async validateUpload(file: File, config: ProjectUploadConfig): Promise<UploadValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Basis-Validierung
    if (!file || file.size === 0) {
      errors.push('Datei ist leer oder ungültig');
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB Limit
      errors.push('Datei ist zu groß (Maximum: 100MB)');
    }
    
    // Pipeline-Validierung
    const context = this.buildProjectContext(config);
    const pipelineValidation = projectFolderContextBuilder.validatePipelineUpload(context);
    
    warnings.push(...pipelineValidation.warnings);
    if (pipelineValidation.restrictions.length > 0) {
      recommendations.push(...pipelineValidation.restrictions);
    }
    
    // Ordner-Validierung
    if (config.currentFolderId && !config.availableFolders.find(f => f.id === config.currentFolderId)) {
      warnings.push('Angegebener Ziel-Ordner nicht gefunden');
    }
    
    // Dateiname-Validierung
    if (file.name.length > 255) {
      errors.push('Dateiname ist zu lang (Maximum: 255 Zeichen)');
    }
    
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.name)) {
      warnings.push('Dateiname enthält problematische Zeichen');
      recommendations.push('Dateiname vor Upload bereinigen');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      canProceed: errors.length === 0
    };
  }
  
  /**
   * Smart Folder Recommendation abrufen
   */
  async getSmartRecommendation(
    file: File,
    context: ProjectFolderContext,
    availableFolders: Array<{ id: string; name: string; type?: string }>
  ): Promise<FolderRoutingRecommendation> {
    return projectFolderContextBuilder.generateFolderRecommendation(
      file,
      context,
      availableFolders
    );
  }
  
  /**
   * Upload-Preview: Zeigt Routing-Entscheidungen vor Upload an
   */
  async previewUploadRouting(
    files: File[],
    config: ProjectUploadConfig
  ): Promise<Array<{
    file: File;
    recommendation: FolderRoutingRecommendation;
    warnings: string[];
    canUpload: boolean;
  }>> {
    const context = this.buildProjectContext(config);
    
    return Promise.all(files.map(async (file) => {
      const validation = await this.validateUpload(file, config);
      const recommendation = await this.getSmartRecommendation(file, context, config.availableFolders);
      
      return {
        file,
        recommendation,
        warnings: validation.warnings,
        canUpload: validation.canProceed
      };
    }));
  }
  
  // =====================
  // PRIVATE HELPER METHODS
  // =====================
  
  /**
   * Project Context aufbauen
   */
  private buildProjectContext(config: ProjectUploadConfig): ProjectFolderContext {
    return projectFolderContextBuilder.buildProjectFolderContext({
      projectId: config.projectId,
      projectTitle: config.projectTitle,
      projectCompany: config.projectCompany,
      currentStage: config.currentStage,
      currentFolderId: config.currentFolderId,
      folderName: config.folderName,
      organizationId: config.organizationId,
      clientId: config.clientId,
      userId: config.userId
    });
  }
  
  /**
   * Fallback Upload ohne Smart Router
   */
  private async fallbackUpload(
    file: File,
    config: ProjectUploadConfig,
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const asset = await mediaService.uploadClientMedia(
      file,
      config.organizationId,
      config.clientId || '',
      folderId,
      onProgress,
      { userId: config.userId }
    );
    
    return {
      path: `organizations/${config.organizationId}/media/projects/${config.projectId}`,
      service: 'mediaService.uploadClientMedia',
      asset,
      uploadMethod: 'legacy'
    };
  }
  
  /**
   * Pipeline-Warnings prüfen
   */
  private checkPipelineWarnings(context: ProjectFolderContext): string[] {
    const warnings: string[] = [];
    
    if (context.isPipelineLocked) {
      warnings.push(`Upload in gesperrter Pipeline-Phase: ${context.currentStage}`);
    }
    
    if (context.isApprovalPhase) {
      warnings.push('Upload während Freigabe-Phase kann Prozess beeinträchtigen');
    }
    
    return warnings;
  }
  
  /**
   * Parallele Upload-Verarbeitung
   */
  private async processParallelUploads(
    batchGroups: Array<{ file: File; recommendation: FolderRoutingRecommendation; batchGroup: string }>,
    config: ProjectUploadConfig,
    results: BatchUploadResult['uploads'],
    onProgress?: (fileIndex: number, fileProgress: number) => void,
    onFileComplete?: (file: File, result?: ProjectUploadResult, error?: string) => void
  ): Promise<void> {
    // Batch-Size für parallele Verarbeitung begrenzen
    const batchSize = 3;
    const batches: typeof batchGroups[] = [];
    
    for (let i = 0; i < batchGroups.length; i += batchSize) {
      batches.push(batchGroups.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (item, index) => {
        try {
          const fileConfig = {
            ...config,
            currentFolderId: item.recommendation.targetFolderId
          };
          
          const result = await this.uploadToProject(
            item.file,
            fileConfig,
            (progress) => onProgress?.(index, progress)
          );
          
          const uploadResult = {
            file: item.file,
            result,
            batchGroup: item.batchGroup
          };
          
          results.push(uploadResult);
          onFileComplete?.(item.file, result);
          
        } catch (error) {
          const errorResult = {
            file: item.file,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            batchGroup: item.batchGroup
          };
          
          results.push(errorResult);
          onFileComplete?.(item.file, undefined, errorResult.error);
        }
      });
      
      await Promise.all(promises);
    }
  }
  
  /**
   * Sequenzielle Upload-Verarbeitung
   */
  private async processSequentialUploads(
    batchGroups: Array<{ file: File; recommendation: FolderRoutingRecommendation; batchGroup: string }>,
    config: ProjectUploadConfig,
    results: BatchUploadResult['uploads'],
    onProgress?: (fileIndex: number, fileProgress: number) => void,
    onFileComplete?: (file: File, result?: ProjectUploadResult, error?: string) => void
  ): Promise<void> {
    for (let i = 0; i < batchGroups.length; i++) {
      const item = batchGroups[i];
      
      try {
        const fileConfig = {
          ...config,
          currentFolderId: item.recommendation.targetFolderId
        };
        
        const result = await this.uploadToProject(
          item.file,
          fileConfig,
          (progress) => onProgress?.(i, progress)
        );
        
        const uploadResult = {
          file: item.file,
          result,
          batchGroup: item.batchGroup
        };
        
        results.push(uploadResult);
        onFileComplete?.(item.file, result);
        
      } catch (error) {
        const errorResult = {
          file: item.file,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          batchGroup: item.batchGroup
        };
        
        results.push(errorResult);
        onFileComplete?.(item.file, undefined, errorResult.error);
      }
    }
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const projectUploadService = new ProjectUploadService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Quick Project Upload für häufige Anwendungsfälle
 */
export async function quickProjectUpload(
  file: File,
  projectId: string,
  projectTitle: string,
  currentStage: PipelineStage,
  organizationId: string,
  userId: string,
  currentFolderId?: string,
  onProgress?: (progress: number) => void
): Promise<ProjectUploadResult> {
  const config: ProjectUploadConfig = {
    projectId,
    projectTitle,
    currentStage,
    organizationId,
    userId,
    currentFolderId,
    availableFolders: [] // Wird vom Service ermittelt
  };
  
  return projectUploadService.uploadToProject(file, config, onProgress);
}

/**
 * Smart Batch Upload für mehrere Dateien
 */
export async function smartBatchUpload(
  files: File[],
  projectConfig: Omit<ProjectUploadConfig, 'availableFolders'>,
  availableFolders: Array<{ id: string; name: string; type?: string }>,
  onProgress?: (fileIndex: number, fileProgress: number) => void
): Promise<BatchUploadResult> {
  const config: ProjectUploadConfig = {
    ...projectConfig,
    availableFolders,
    useSmartRouting: true,
    allowBatchOptimization: true
  };
  
  return projectUploadService.uploadBatchToProject(files, config, onProgress);
}

/**
 * Upload-Preview für UI
 */
export async function previewProjectUpload(
  files: File[],
  projectConfig: ProjectUploadConfig
): Promise<Array<{
  file: File;
  recommendation: FolderRoutingRecommendation;
  warnings: string[];
  canUpload: boolean;
}>> {
  return projectUploadService.previewUploadRouting(files, projectConfig);
}