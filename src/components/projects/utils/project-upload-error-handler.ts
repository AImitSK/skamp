// src/components/projects/utils/project-upload-error-handler.ts
// Error Handling und Fallback-Logik für Project Upload Smart Router

import { mediaService } from '@/lib/firebase/media-service';
import { projectFolderFeatureFlags } from '../config/project-folder-feature-flags';
import type { ProjectUploadConfig } from '@/lib/firebase/project-upload-service';

// =====================
// ERROR TYPES & INTERFACES
// =====================

export interface UploadError {
  type: 'validation' | 'network' | 'permissions' | 'storage' | 'smart_router' | 'unknown';
  code: string;
  message: string;
  file?: File;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  fallbackAvailable: boolean;
}

export interface ErrorRecoveryResult {
  success: boolean;
  method: 'retry' | 'fallback' | 'user_intervention' | 'abort';
  message: string;
  newConfig?: Partial<ProjectUploadConfig>;
}

export interface FallbackUploadResult {
  success: boolean;
  assetId?: string;
  warnings: string[];
  method: 'standard_upload' | 'direct_upload' | 'manual_folder_selection';
}

// =====================
// ERROR CLASSIFICATION
// =====================

const ERROR_PATTERNS = {
  validation: [
    /file.*too.*large/i,
    /invalid.*file.*type/i,
    /file.*name.*invalid/i,
    /missing.*required.*field/i
  ],
  network: [
    /network.*error/i,
    /connection.*failed/i,
    /timeout/i,
    /fetch.*failed/i
  ],
  permissions: [
    /permission.*denied/i,
    /unauthorized/i,
    /access.*denied/i,
    /insufficient.*permissions/i
  ],
  storage: [
    /storage.*quota/i,
    /disk.*full/i,
    /file.*exists/i,
    /path.*not.*found/i
  ],
  smart_router: [
    /smart.*router.*failed/i,
    /context.*building.*failed/i,
    /recommendation.*error/i,
    /pipeline.*validation.*failed/i
  ]
};

// =====================
// ERROR HANDLER SERVICE
// =====================

class ProjectUploadErrorHandler {
  
  /**
   * Klassifiziert und verarbeitet Upload-Fehler
   */
  analyzeError(error: any, file?: File, context?: Record<string, any>): UploadError {
    const errorMessage = this.extractErrorMessage(error);
    const errorType = this.classifyError(errorMessage);
    
    return {
      type: errorType,
      code: this.generateErrorCode(errorType, errorMessage),
      message: this.humanizeErrorMessage(errorMessage, errorType),
      file,
      context,
      recoverable: this.isRecoverable(errorType, errorMessage),
      retryable: this.isRetryable(errorType, errorMessage),
      fallbackAvailable: this.hasFallbackOption(errorType, context)
    };
  }
  
  /**
   * Versucht automatische Fehler-Recovery
   */
  async attemptRecovery(
    uploadError: UploadError,
    config: ProjectUploadConfig
  ): Promise<ErrorRecoveryResult> {
    
    // Smart Router spezifische Fehler
    if (uploadError.type === 'smart_router') {
      return this.handleSmartRouterError(uploadError, config);
    }
    
    // Netzwerk-Fehler: Retry mit exponential backoff
    if (uploadError.type === 'network' && uploadError.retryable) {
      return {
        success: true,
        method: 'retry',
        message: 'Netzwerkfehler - Automatischer Retry wird versucht',
        newConfig: {
          ...config,
          useSmartRouting: false // Fallback auf Standard-Upload
        }
      };
    }
    
    // Permissions-Fehler: Fallback auf andere Upload-Methode
    if (uploadError.type === 'permissions') {
      return this.handlePermissionsError(uploadError, config);
    }
    
    // Storage-Fehler: Fallback-Strategien
    if (uploadError.type === 'storage') {
      return this.handleStorageError(uploadError, config);
    }
    
    // Validation-Fehler: User intervention erforderlich
    if (uploadError.type === 'validation') {
      return {
        success: false,
        method: 'user_intervention',
        message: 'Datei-Validierung fehlgeschlagen - Manuelle Korrektur erforderlich'
      };
    }
    
    // Default: Fallback auf Standard-Upload
    return {
      success: true,
      method: 'fallback',
      message: 'Fallback auf Standard-Upload-Methode',
      newConfig: {
        ...config,
        useSmartRouting: false,
        allowBatchOptimization: false
      }
    };
  }
  
  /**
   * Fallback Upload ohne Smart Router
   */
  async executeeFallbackUpload(
    file: File,
    config: ProjectUploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<FallbackUploadResult> {
    const warnings: string[] = [];
    
    try {
      // Deaktiviere alle Smart Router Features
      warnings.push('Smart Router deaktiviert - Standard Upload wird verwendet');
      
      // Standard Media Service Upload
      const asset = await mediaService.uploadClientMedia(
        file,
        config.organizationId,
        config.clientId || '',
        config.currentFolderId,
        onProgress,
        { userId: config.userId }
      );
      
      return {
        success: true,
        assetId: asset.id,
        warnings,
        method: 'standard_upload'
      };
      
    } catch (fallbackError) {
      // Auch Fallback fehlgeschlagen - letzte Rettung
      warnings.push('Standard Upload fehlgeschlagen - Manuelle Intervention erforderlich');
      
      return {
        success: false,
        warnings: [...warnings, this.humanizeErrorMessage(fallbackError, 'unknown')],
        method: 'manual_folder_selection'
      };
    }
  }
  
  /**
   * Batch Upload mit Error Recovery
   */
  async executeBatchUploadWithRecovery(
    files: File[],
    config: ProjectUploadConfig,
    onProgress?: (fileIndex: number, progress: number) => void,
    onFileError?: (file: File, error: UploadError) => void
  ): Promise<{
    successful: Array<{ file: File; assetId: string }>;
    failed: Array<{ file: File; error: UploadError; recovered: boolean }>;
    warnings: string[];
  }> {
    
    const successful: Array<{ file: File; assetId: string }> = [];
    const failed: Array<{ file: File; error: UploadError; recovered: boolean }> = [];
    const warnings: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Versuche Smart Upload
        if (config.useSmartRouting && projectFolderFeatureFlags.isEnabled('USE_PROJECT_SMART_ROUTER')) {
          
          // TODO: Integration mit projectUploadService
          // const result = await projectUploadService.uploadToProject(file, config, (progress) => onProgress?.(i, progress));
          // successful.push({ file, assetId: result.asset?.id || '' });
          
          // Temporärer Fallback
          const fallbackResult = await this.executeeFallbackUpload(file, config, (progress) => onProgress?.(i, progress));
          
          if (fallbackResult.success && fallbackResult.assetId) {
            successful.push({ file, assetId: fallbackResult.assetId });
            warnings.push(...fallbackResult.warnings);
          } else {
            throw new Error('Fallback Upload fehlgeschlagen');
          }
          
        } else {
          // Standard Upload
          const fallbackResult = await this.executeeFallbackUpload(file, config, (progress) => onProgress?.(i, progress));
          
          if (fallbackResult.success && fallbackResult.assetId) {
            successful.push({ file, assetId: fallbackResult.assetId });
            warnings.push(...fallbackResult.warnings);
          } else {
            throw new Error('Standard Upload fehlgeschlagen');
          }
        }
        
      } catch (error) {
        const uploadError = this.analyzeError(error, file, { fileIndex: i });
        
        // Versuche Recovery
        const recoveryResult = await this.attemptRecovery(uploadError, config);
        
        if (recoveryResult.success && recoveryResult.method === 'fallback') {
          try {
            const fallbackResult = await this.executeeFallbackUpload(file, recoveryResult.newConfig || config);
            
            if (fallbackResult.success && fallbackResult.assetId) {
              successful.push({ file, assetId: fallbackResult.assetId });
              warnings.push(recoveryResult.message, ...fallbackResult.warnings);
              failed.push({ file, error: uploadError, recovered: true });
            } else {
              failed.push({ file, error: uploadError, recovered: false });
            }
          } catch (fallbackError) {
            failed.push({ file, error: uploadError, recovered: false });
          }
        } else {
          failed.push({ file, error: uploadError, recovered: false });
        }
        
        onFileError?.(file, uploadError);
      }
    }
    
    return { successful, failed, warnings };
  }
  
  // =====================
  // PRIVATE HELPER METHODS
  // =====================
  
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'Unbekannter Fehler aufgetreten';
  }
  
  private classifyError(message: string): UploadError['type'] {
    for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return type as UploadError['type'];
      }
    }
    return 'unknown';
  }
  
  private generateErrorCode(type: string, message: string): string {
    const typeCode = type.toUpperCase().substring(0, 3);
    const messageHash = Math.abs(message.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));
    return `${typeCode}_${messageHash.toString(16).substring(0, 4).toUpperCase()}`;
  }
  
  private humanizeErrorMessage(message: string, type: UploadError['type']): string {
    const humanizedMessages: Record<UploadError['type'], string> = {
      validation: 'Die Datei entspricht nicht den Anforderungen',
      network: 'Netzwerkverbindung unterbrochen',
      permissions: 'Keine Berechtigung für diesen Upload',
      storage: 'Speicherplatz-Problem aufgetreten',
      smart_router: 'Smart Router Fehler - Fallback wird verwendet',
      unknown: 'Ein unerwarteter Fehler ist aufgetreten'
    };
    
    return humanizedMessages[type] || message;
  }
  
  private isRecoverable(type: UploadError['type'], message: string): boolean {
    const recoverableTypes: UploadError['type'][] = ['network', 'smart_router', 'storage'];
    return recoverableTypes.includes(type) || message.includes('retry');
  }
  
  private isRetryable(type: UploadError['type'], message: string): boolean {
    const retryableTypes: UploadError['type'][] = ['network', 'smart_router'];
    return retryableTypes.includes(type) && !message.includes('permission');
  }
  
  private hasFallbackOption(type: UploadError['type'], context?: Record<string, any>): boolean {
    // Validation errors meist nicht fallback-fähig
    if (type === 'validation') return false;
    
    // Permissions errors schwierig zu umgehen
    if (type === 'permissions') return context?.hasAlternativeFolder || false;
    
    // Alle anderen haben Standard-Upload als Fallback
    return true;
  }
  
  private async handleSmartRouterError(
    error: UploadError,
    config: ProjectUploadConfig
  ): Promise<ErrorRecoveryResult> {
    
    // Deaktiviere Smart Router Features schrittweise
    const newConfig: Partial<ProjectUploadConfig> = {
      ...config,
      useSmartRouting: false
    };
    
    // Bei schweren Smart Router Fehlern auch Batch-Optimierung deaktivieren
    if (error.message.includes('context') || error.message.includes('pipeline')) {
      newConfig.allowBatchOptimization = false;
    }
    
    return {
      success: true,
      method: 'fallback',
      message: 'Smart Router deaktiviert - Standard Upload wird verwendet',
      newConfig
    };
  }
  
  private async handlePermissionsError(
    error: UploadError,
    config: ProjectUploadConfig
  ): Promise<ErrorRecoveryResult> {
    
    // Versuche Upload ohne spezifischen Ordner
    if (config.currentFolderId) {
      return {
        success: true,
        method: 'fallback',
        message: 'Upload in Hauptordner statt spezifischem Unterordner',
        newConfig: {
          ...config,
          currentFolderId: undefined,
          useSmartRouting: false
        }
      };
    }
    
    return {
      success: false,
      method: 'user_intervention',
      message: 'Keine Upload-Berechtigung - Bitte Administrator kontaktieren'
    };
  }
  
  private async handleStorageError(
    error: UploadError,
    config: ProjectUploadConfig
  ): Promise<ErrorRecoveryResult> {
    
    // Storage-Quota Problem
    if (error.message.includes('quota') || error.message.includes('space')) {
      return {
        success: false,
        method: 'user_intervention',
        message: 'Speicherplatz-Limit erreicht - Bitte Dateien löschen oder Speicher erweitern'
      };
    }
    
    // Ordner existiert nicht
    if (error.message.includes('path') || error.message.includes('folder')) {
      return {
        success: true,
        method: 'fallback',
        message: 'Zielordner nicht verfügbar - Upload in Hauptordner',
        newConfig: {
          ...config,
          currentFolderId: undefined
        }
      };
    }
    
    return {
      success: false,
      method: 'user_intervention',
      message: 'Speicher-Problem - Bitte später erneut versuchen'
    };
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const projectUploadErrorHandler = new ProjectUploadErrorHandler();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Quick Error Analysis für Standard-Anwendungsfälle
 */
export function quickErrorAnalysis(error: any, file?: File): UploadError {
  return projectUploadErrorHandler.analyzeError(error, file);
}

/**
 * Safe Upload mit automatischem Error Handling
 */
export async function safeUploadWithFallback(
  file: File,
  config: ProjectUploadConfig,
  onProgress?: (progress: number) => void
): Promise<{
  success: boolean;
  assetId?: string;
  error?: UploadError;
  warnings: string[];
  method: string;
}> {
  
  try {
    // TODO: Hier würde der echte Smart Upload Service integriert
    // const result = await projectUploadService.uploadToProject(file, config, onProgress);
    
    // Temporärer Fallback
    const fallbackResult = await projectUploadErrorHandler.executeeFallbackUpload(file, config, onProgress);
    
    return {
      success: fallbackResult.success,
      assetId: fallbackResult.assetId,
      warnings: fallbackResult.warnings,
      method: fallbackResult.method
    };
    
  } catch (error) {
    const uploadError = projectUploadErrorHandler.analyzeError(error, file);
    
    // Versuche Recovery
    const recoveryResult = await projectUploadErrorHandler.attemptRecovery(uploadError, config);
    
    if (recoveryResult.success && recoveryResult.newConfig) {
      try {
        const fallbackResult = await projectUploadErrorHandler.executeeFallbackUpload(
          file, 
          recoveryResult.newConfig as ProjectUploadConfig, 
          onProgress
        );
        
        return {
          success: fallbackResult.success,
          assetId: fallbackResult.assetId,
          error: uploadError,
          warnings: [recoveryResult.message, ...fallbackResult.warnings],
          method: `${fallbackResult.method}_with_recovery`
        };
        
      } catch (fallbackError) {
        return {
          success: false,
          error: uploadError,
          warnings: [recoveryResult.message, 'Fallback Upload ebenfalls fehlgeschlagen'],
          method: 'failed_with_recovery_attempt'
        };
      }
    }
    
    return {
      success: false,
      error: uploadError,
      warnings: [recoveryResult.message],
      method: 'failed_no_recovery'
    };
  }
}

/**
 * Batch Upload mit Error Recovery
 */
export async function safeBatchUpload(
  files: File[],
  config: ProjectUploadConfig,
  onProgress?: (fileIndex: number, progress: number) => void,
  onFileError?: (file: File, error: UploadError) => void
) {
  return projectUploadErrorHandler.executeBatchUploadWithRecovery(
    files, 
    config, 
    onProgress, 
    onFileError
  );
}