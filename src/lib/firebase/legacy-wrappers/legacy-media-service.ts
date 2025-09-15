// src/lib/firebase/legacy-wrappers/legacy-media-service.ts
// Legacy Wrapper für mediaService.uploadMedia - Vollständige Rückwärts-Kompatibilität
// Wrapper für die Unified Upload API Integration

import { mediaService } from '../media-service';
import { unifiedUploadAPI } from '../unified-upload-api';
import { UnifiedUploadContext } from '@/types/unified-upload';
import { MediaAsset } from '@/types/media';
import { Timestamp } from 'firebase/firestore';

// =====================
// LEGACY INTERFACE MAPPING
// =====================

/**
 * Legacy Media Service Interface - Original Parameter
 */
interface LegacyMediaUploadParams {
  file: File;
  organizationId: string;
  folderId?: string;
  onProgress?: (progress: number) => void;
  retryCount?: number;
  context?: { userId: string; clientId?: string };
}

/**
 * Legacy Client Media Upload Interface
 */
interface LegacyClientMediaUploadParams {
  file: File;
  organizationId: string;
  clientId: string;
  folderId?: string;
  onProgress?: (progress: number) => void;
  context?: { userId: string };
}

/**
 * Legacy Buffer Upload Interface
 */
interface LegacyBufferUploadParams {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  organizationId: string;
  folder?: string;
  context?: { userId?: string; clientId?: string };
}

// =====================
// LEGACY MEDIA SERVICE WRAPPER
// =====================

class LegacyMediaServiceWrapper {
  private migrationTrackingEnabled = true;
  private migrationStats = {
    totalCalls: 0,
    unifiedAPICalls: 0,
    legacyFallbackCalls: 0,
    successfulMigrations: 0,
    failedMigrations: 0
  };

  // =====================
  // LEGACY UPLOAD METHODS
  // =====================

  /**
   * Legacy uploadMedia Method - 100% API-kompatibel
   */
  async uploadMedia(
    file: File,
    organizationId: string,
    folderId?: string,
    onProgress?: (progress: number) => void,
    retryCount = 3,
    context?: { userId: string; clientId?: string }
  ): Promise<MediaAsset> {
    this.trackMigrationCall('uploadMedia');

    try {
      // Migration zur Unified API (Feature-Flag gesteuert)
      if (await this.shouldUseUnifiedAPI('media_upload')) {
        return await this.migrateUploadMedia({
          file,
          organizationId,
          folderId,
          onProgress,
          retryCount,
          context
        });
      }

      // Legacy Fallback
      return await this.legacyUploadMedia({
        file,
        organizationId,
        folderId,
        onProgress,
        retryCount,
        context
      });

    } catch (error) {
      // Graceful Fallback bei Migration-Fehlern
      if (this.isUnifiedAPIError(error)) {
        console.warn('Unified API Migration fehlgeschlagen, Fallback zu Legacy Service:', error);
        return await this.legacyUploadMedia({
          file,
          organizationId,
          folderId,
          onProgress,
          retryCount,
          context
        });
      }
      throw error;
    }
  }

  /**
   * Legacy uploadClientMedia Method
   */
  async uploadClientMedia(
    file: File,
    organizationId: string,
    clientId: string,
    folderId?: string,
    onProgress?: (progress: number) => void,
    context?: { userId: string }
  ): Promise<MediaAsset> {
    this.trackMigrationCall('uploadClientMedia');

    try {
      // Migration zur Unified API
      if (await this.shouldUseUnifiedAPI('client_media_upload')) {
        return await this.migrateClientMediaUpload({
          file,
          organizationId,
          clientId,
          folderId,
          onProgress,
          context
        });
      }

      // Legacy Fallback
      return await this.legacyClientMediaUpload({
        file,
        organizationId,
        clientId,
        folderId,
        onProgress,
        context
      });

    } catch (error) {
      if (this.isUnifiedAPIError(error)) {
        console.warn('Client Media Migration fehlgeschlagen, Fallback zu Legacy:', error);
        return await this.legacyClientMediaUpload({
          file,
          organizationId,
          clientId,
          folderId,
          onProgress,
          context
        });
      }
      throw error;
    }
  }

  /**
   * Legacy uploadBuffer Method
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    organizationId: string,
    folder: string = 'uploads',
    context?: { userId?: string; clientId?: string }
  ): Promise<{ downloadUrl: string; filePath: string; fileSize: number }> {
    this.trackMigrationCall('uploadBuffer');

    try {
      // Für Buffer-Uploads: Unified API noch nicht implementiert
      // Direkt Legacy Service verwenden
      return await mediaService.uploadBuffer(
        buffer,
        fileName,
        contentType,
        organizationId,
        folder,
        context
      );

    } catch (error) {
      throw error;
    }
  }

  // =====================
  // MIGRATION IMPLEMENTATIONS
  // =====================

  /**
   * Migration: uploadMedia zu Unified API
   */
  private async migrateUploadMedia(params: LegacyMediaUploadParams): Promise<MediaAsset> {
    try {
      // Legacy Parameter zu Unified Context konvertieren
      const unifiedContext: UnifiedUploadContext = {
        organizationId: params.organizationId,
        userId: params.context?.userId || params.organizationId,
        uploadTarget: params.folderId ? 'folder' : 'media_library',
        uploadType: 'media_asset',
        folderId: params.folderId,
        clientId: params.context?.clientId,
        contextSource: 'explicit',
        contextTimestamp: Timestamp.now()
      };

      // Unified Upload API aufrufen
      const result = await unifiedUploadAPI.upload(params.file, unifiedContext, {
        onProgress: params.onProgress ? (progress) => {
          params.onProgress!(progress.overallProgress);
        } : undefined,
        maxRetries: params.retryCount,
        enableSmartRouting: true,
        useLegacyFallback: true
      });

      // Migration erfolgreich
      this.migrationStats.successfulMigrations++;
      
      if (!result.asset) {
        throw new Error('Unified API Result enthält kein Asset');
      }

      return result.asset;

    } catch (error) {
      this.migrationStats.failedMigrations++;
      throw error;
    }
  }

  /**
   * Migration: uploadClientMedia zu Unified API
   */
  private async migrateClientMediaUpload(params: LegacyClientMediaUploadParams): Promise<MediaAsset> {
    try {
      const unifiedContext: UnifiedUploadContext = {
        organizationId: params.organizationId,
        userId: params.context?.userId || params.organizationId,
        uploadTarget: 'client_media',
        uploadType: 'media_asset',
        clientId: params.clientId,
        folderId: params.folderId,
        contextSource: 'explicit',
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.upload(params.file, unifiedContext, {
        onProgress: params.onProgress ? (progress) => {
          params.onProgress!(progress.overallProgress);
        } : undefined,
        enableSmartRouting: true
      });

      this.migrationStats.successfulMigrations++;

      if (!result.asset) {
        throw new Error('Client Media Upload: Asset nicht in Result');
      }

      return result.asset;

    } catch (error) {
      this.migrationStats.failedMigrations++;
      throw error;
    }
  }

  // =====================
  // LEGACY FALLBACK IMPLEMENTATIONS
  // =====================

  /**
   * Legacy Fallback: Original mediaService.uploadMedia
   */
  private async legacyUploadMedia(params: LegacyMediaUploadParams): Promise<MediaAsset> {
    this.migrationStats.legacyFallbackCalls++;

    return await mediaService.uploadMedia(
      params.file,
      params.organizationId,
      params.folderId,
      params.onProgress,
      params.retryCount || 3,
      params.context
    );
  }

  /**
   * Legacy Fallback: Original mediaService.uploadClientMedia
   */
  private async legacyClientMediaUpload(params: LegacyClientMediaUploadParams): Promise<MediaAsset> {
    this.migrationStats.legacyFallbackCalls++;

    return await mediaService.uploadClientMedia(
      params.file,
      params.organizationId,
      params.clientId,
      params.folderId,
      params.onProgress,
      params.context
    );
  }

  // =====================
  // MIGRATION CONTROL & MONITORING
  // =====================

  /**
   * Feature Flag Check für Migration
   */
  private async shouldUseUnifiedAPI(operation: string): Promise<boolean> {
    // Feature-Flag-basierte Migration (5% → 25% → 100%)
    const migrationFlags = {
      'media_upload': this.getMigrationPercentage('UNIFIED_MEDIA_UPLOAD'),
      'client_media_upload': this.getMigrationPercentage('UNIFIED_CLIENT_MEDIA_UPLOAD'),
      'buffer_upload': 0 // Noch nicht migriert
    };

    const migrationPercentage = migrationFlags[operation as keyof typeof migrationFlags] || 0;
    
    // Deterministische Migration basierend auf organizationId Hash
    if (migrationPercentage >= 100) return true;
    if (migrationPercentage <= 0) return false;
    
    // Graduelle Migration
    const hash = this.hashString(this.getCurrentContext()?.organizationId || 'default');
    const bucket = hash % 100;
    
    return bucket < migrationPercentage;
  }

  /**
   * Migration Percentage aus Environment/Config
   */
  private getMigrationPercentage(flagName: string): number {
    // TODO: Echte Feature-Flag-Integration
    // Für Demo: Feste Prozentsätze
    const percentages: Record<string, number> = {
      'UNIFIED_MEDIA_UPLOAD': 25, // 25% Migration
      'UNIFIED_CLIENT_MEDIA_UPLOAD': 5 // 5% Migration
    };

    return percentages[flagName] || 0;
  }

  /**
   * Unified API Error Detection
   */
  private isUnifiedAPIError(error: any): boolean {
    return error?.name === 'UnifiedUploadError' ||
           error?.message?.includes('Unified API') ||
           error?.code?.startsWith('UNIFIED_');
  }

  /**
   * Migration Call Tracking
   */
  private trackMigrationCall(method: string): void {
    if (this.migrationTrackingEnabled) {
      this.migrationStats.totalCalls++;
      
      // Logging für Monitoring
      if (this.migrationStats.totalCalls % 100 === 0) {
        console.info('Legacy Wrapper Migration Stats:', {
          ...this.migrationStats,
          migrationRate: Math.round((this.migrationStats.unifiedAPICalls / this.migrationStats.totalCalls) * 100),
          method
        });
      }
    }
  }

  /**
   * Migration Statistics
   */
  getMigrationStatistics(): {
    totalCalls: number;
    migrationRate: number;
    successRate: number;
    legacyFallbackRate: number;
    lastReset: string;
  } {
    return {
      totalCalls: this.migrationStats.totalCalls,
      migrationRate: this.migrationStats.totalCalls > 0 
        ? Math.round((this.migrationStats.unifiedAPICalls / this.migrationStats.totalCalls) * 100)
        : 0,
      successRate: this.migrationStats.unifiedAPICalls > 0
        ? Math.round((this.migrationStats.successfulMigrations / this.migrationStats.unifiedAPICalls) * 100)
        : 0,
      legacyFallbackRate: this.migrationStats.totalCalls > 0
        ? Math.round((this.migrationStats.legacyFallbackCalls / this.migrationStats.totalCalls) * 100)
        : 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Migration Statistics zurücksetzen
   */
  resetMigrationStatistics(): void {
    this.migrationStats = {
      totalCalls: 0,
      unifiedAPICalls: 0,
      legacyFallbackCalls: 0,
      successfulMigrations: 0,
      failedMigrations: 0
    };
  }

  // =====================
  // DEPRECATION WARNINGS
  // =====================

  /**
   * Deprecation Warning für Legacy-Methods
   */
  private warnDeprecation(method: string, recommendedAlternative: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 DEPRECATION WARNING: mediaService.${method} ist deprecated.`);
      console.warn(`📈 Empfohlene Alternative: ${recommendedAlternative}`);
      console.warn(`🔧 Migration Guide: https://docs.celeropress.com/unified-upload-api`);
    }
  }

  // =====================
  // UTILITY METHODS
  // =====================

  private getCurrentContext(): { organizationId?: string } | null {
    // TODO: Context aus aktueller Session/Request extrahieren
    return null;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const legacyMediaService = new LegacyMediaServiceWrapper();

// =====================
// API COMPATIBILITY LAYER
// =====================

/**
 * Drop-in Replacement für mediaService mit Unified API Integration
 * Bietet 100% API-Kompatibilität mit schrittweiser Migration
 */
export const mediaServiceWithUnifiedAPI = {
  // Original mediaService Methods durchreichen
  ...mediaService,
  
  // Überschreibung der Upload-Methods mit Legacy-Wrapper
  uploadMedia: legacyMediaService.uploadMedia.bind(legacyMediaService),
  uploadClientMedia: legacyMediaService.uploadClientMedia.bind(legacyMediaService),
  uploadBuffer: legacyMediaService.uploadBuffer.bind(legacyMediaService),
  
  // Migration Utilities
  getMigrationStatistics: legacyMediaService.getMigrationStatistics.bind(legacyMediaService),
  resetMigrationStatistics: legacyMediaService.resetMigrationStatistics.bind(legacyMediaService)
};

// =====================
// MIGRATION UTILITIES
// =====================

/**
 * Migration Helper für graduelle Umstellung
 */
export class MediaServiceMigrationHelper {
  
  /**
   * Migriere existierenden Code schrittweise
   */
  static async migrateCodebase(
    files: string[],
    migrationLevel: 'safe' | 'aggressive' = 'safe'
  ): Promise<{
    migratedFiles: number;
    totalReplacements: number;
    warnings: string[];
  }> {
    // TODO: Code Migration Logic
    return {
      migratedFiles: 0,
      totalReplacements: 0,
      warnings: []
    };
  }
  
  /**
   * Validiere Migration-Readiness
   */
  static validateMigrationReadiness(): {
    isReady: boolean;
    blockers: string[];
    recommendations: string[];
  } {
    const blockers: string[] = [];
    const recommendations: string[] = [];
    
    // TODO: Migration-Readiness Checks
    
    return {
      isReady: blockers.length === 0,
      blockers,
      recommendations
    };
  }
}