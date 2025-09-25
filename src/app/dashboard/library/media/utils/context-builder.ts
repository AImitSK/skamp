// src/app/dashboard/pr-tools/media-library/utils/context-builder.ts
// Context Builder Utility für Smart Upload Router Integration
// Erstellt intelligenten Upload-Kontext basierend auf verfügbaren Informationen

import { UploadContext } from '@/lib/firebase/smart-upload-router';

/**
 * Media Library Upload Context Parameter
 */
export interface MediaLibraryUploadParams {
  organizationId: string;
  userId: string;
  currentFolderId?: string;
  preselectedClientId?: string;
  folderName?: string;
  
  // Zusätzliche Kontext-Informationen
  uploadSource?: 'drag-drop' | 'dialog' | 'url-parameter';
  referrerPage?: string;
  userAgent?: string;
}

/**
 * Upload Context Info für UI-Anzeige
 */
export interface UploadContextInfo {
  uploadMethod: 'smart' | 'legacy';
  targetPath: string;
  expectedTags: string[];
  clientInheritance?: {
    source: 'folder' | 'preselected' | 'none';
    clientId?: string;
    clientName?: string;
  };
  routing: {
    type: 'organized' | 'unorganized';
    reason: string;
  };
}

/**
 * Context Builder für Media Library Uploads
 */
export class MediaLibraryContextBuilder {
  
  /**
   * Hauptmethode: Erstellt Upload-Kontext für Media Library
   */
  buildUploadContext(params: MediaLibraryUploadParams): UploadContext {
    const context: UploadContext = {
      organizationId: params.organizationId,
      userId: params.userId,
      uploadType: 'media-library',
      folderId: params.currentFolderId,
      clientId: params.preselectedClientId,
      autoTags: this.generateAutoTags(params)
    };

    return context;
  }

  /**
   * Generiert automatische Tags basierend auf Kontext
   */
  private generateAutoTags(params: MediaLibraryUploadParams): string[] {
    const tags: string[] = [];

    // Source-Tag
    if (params.uploadSource) {
      tags.push(`source:${params.uploadSource}`);
    }

    // Folder-Tag
    if (params.currentFolderId) {
      tags.push(`folder:media-library`);
      if (params.folderName) {
        const cleanFolderName = params.folderName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        tags.push(`folder-name:${cleanFolderName}`);
      }
    } else {
      tags.push(`folder:root`);
    }

    // Client-Tag
    if (params.preselectedClientId) {
      tags.push(`client:preselected`);
    }

    // Datum-Tag
    const currentDate = new Date().toISOString().split('T')[0];
    tags.push(`upload-date:${currentDate}`);

    // Media Library spezifisch
    tags.push(`media-library:true`);

    return tags;
  }

  /**
   * Erstellt Context-Info für UI-Anzeige
   */
  async buildContextInfo(
    params: MediaLibraryUploadParams,
    companies: Array<{ id: string; name: string }> = []
  ): Promise<UploadContextInfo> {
    // Smart Router Pfad-Vorschau
    const { smartUploadRouter } = await import('@/lib/firebase/smart-upload-router');
    const context = this.buildUploadContext(params);

    let targetPath = '';
    try {
      targetPath = await smartUploadRouter.previewStoragePath(
        'beispiel-datei.jpg',
        context
      );
    } catch (error) {
      targetPath = `organizations/${params.organizationId}/media/Unzugeordnet/`;
    }

    // Client-Vererbung analysieren
    const clientInheritance = this.analyzeClientInheritance(params, companies);

    // Routing-Entscheidung
    const routing = this.determineRouting(params);

    // Expected Tags
    const expectedTags = this.generateAutoTags(params);

    return {
      uploadMethod: 'smart',
      targetPath,
      expectedTags,
      clientInheritance,
      routing
    };
  }

  /**
   * Analysiert Client-Vererbung
   */
  private analyzeClientInheritance(
    params: MediaLibraryUploadParams,
    companies: Array<{ id: string; name: string }>
  ): UploadContextInfo['clientInheritance'] {
    if (params.preselectedClientId) {
      const client = companies.find(c => c.id === params.preselectedClientId);
      return {
        source: 'preselected',
        clientId: params.preselectedClientId,
        clientName: client?.name || 'Unbekannter Kunde'
      };
    }

    // TODO: Folder-basierte Vererbung (Phase 1)
    // if (params.currentFolderId) {
    //   return {
    //     source: 'folder',
    //     clientId: undefined,
    //     clientName: undefined
    //   };
    // }

    return {
      source: 'none'
    };
  }

  /**
   * Bestimmt Routing-Strategie
   */
  private determineRouting(params: MediaLibraryUploadParams): UploadContextInfo['routing'] {
    if (params.currentFolderId) {
      return {
        type: 'organized',
        reason: 'Upload in spezifischen Ordner'
      };
    }

    if (params.preselectedClientId) {
      return {
        type: 'unorganized',
        reason: 'Upload mit Kunden-Zuordnung (Root-Ebene)'
      };
    }

    return {
      type: 'unorganized',
      reason: 'Standard Media Library Upload'
    };
  }

  /**
   * Validiert Upload-Parameter
   */
  validateUploadParams(params: MediaLibraryUploadParams): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Pflichtfelder prüfen
    if (!params.organizationId) {
      errors.push('Organization ID ist erforderlich');
    }

    if (!params.userId) {
      errors.push('User ID ist erforderlich');
    }

    // Logische Validierung
    if (params.currentFolderId && !params.folderName) {
      warnings.push('Folder ID ohne Folder Name - Display könnte unvollständig sein');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Legacy Upload Context (Fallback)
   */
  buildLegacyContext(params: MediaLibraryUploadParams): {
    organizationId: string;
    userId: string;
    folderId?: string;
    clientId?: string;
  } {
    return {
      organizationId: params.organizationId,
      userId: params.userId,
      folderId: params.currentFolderId,
      clientId: params.preselectedClientId
    };
  }

  /**
   * Feature-Flag Helper
   */
  shouldUseSmartRouter(
    params: MediaLibraryUploadParams,
    featureFlags: { USE_SMART_ROUTER?: boolean } = {}
  ): boolean {
    // Feature-Flag Check
    if (!featureFlags.USE_SMART_ROUTER) {
      return false;
    }

    // Basis-Voraussetzungen prüfen
    if (!params.organizationId || !params.userId) {
      return false;
    }

    // Für Media Library ist Smart Router immer geeignet
    return true;
  }
}

// Singleton Instance
export const mediaLibraryContextBuilder = new MediaLibraryContextBuilder();

/**
 * Convenience-Funktionen für häufige Anwendungsfälle
 */

/**
 * Standard Media Library Upload Context
 */
export function createMediaLibraryUploadContext(
  organizationId: string,
  userId: string,
  currentFolderId?: string,
  preselectedClientId?: string
): UploadContext {
  return mediaLibraryContextBuilder.buildUploadContext({
    organizationId,
    userId,
    currentFolderId,
    preselectedClientId,
    uploadSource: 'dialog'
  });
}

/**
 * Drag & Drop Upload Context
 */
export function createDragDropUploadContext(
  organizationId: string,
  userId: string,
  currentFolderId?: string
): UploadContext {
  return mediaLibraryContextBuilder.buildUploadContext({
    organizationId,
    userId,
    currentFolderId,
    uploadSource: 'drag-drop'
  });
}

/**
 * URL-Parameter Upload Context (für direkte Links)
 */
export function createUrlParameterUploadContext(
  organizationId: string,
  userId: string,
  preselectedClientId: string,
  referrerPage?: string
): UploadContext {
  return mediaLibraryContextBuilder.buildUploadContext({
    organizationId,
    userId,
    preselectedClientId,
    uploadSource: 'url-parameter',
    referrerPage
  });
}

/**
 * Debugging und Logging
 */
export const MediaLibraryContextLogger = {
  logContextCreation: (params: MediaLibraryUploadParams, context: UploadContext) => {
    // Development: Console logs für Debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Media Library Context Builder:', {
        params,
        context,
        timestamp: new Date().toISOString()
      });
    }
  },

  logSmartRouterDecision: (useSmartRouter: boolean, reason: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 Smart Router Decision: ${useSmartRouter ? 'ENABLED' : 'DISABLED'}`, {
        reason,
        timestamp: new Date().toISOString()
      });
    }
  },

  logContextInfo: (contextInfo: UploadContextInfo) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ Upload Context Info:', {
        contextInfo,
        timestamp: new Date().toISOString()
      });
    }
  }
};