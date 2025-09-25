// src/app/dashboard/pr-tools/media-library/utils/__tests__/context-builder.test.ts
// Tests für Media Library Context Builder - Smart Upload Router Integration

import { mediaLibraryContextBuilder, MediaLibraryUploadParams, UploadContextInfo } from '../context-builder';

// Mock Smart Upload Router Service
jest.mock('@/lib/firebase/smart-upload-router', () => ({
  smartUploadRouter: {
    previewStoragePath: jest.fn()
  }
}));

// Mock für dynamischen Import
const mockSmartUploadRouter = {
  previewStoragePath: jest.fn()
};

jest.doMock('@/lib/firebase/smart-upload-router', () => ({
  smartUploadRouter: mockSmartUploadRouter
}));

describe('MediaLibraryContextBuilder', () => {
  const mockParams: MediaLibraryUploadParams = {
    organizationId: 'org-123',
    userId: 'user-456',
    currentFolderId: 'folder-789',
    preselectedClientId: 'client-abc',
    folderName: 'Test Folder',
    uploadSource: 'dialog',
    referrerPage: '/projects/123',
    userAgent: 'Jest Test User Agent'
  };

  const mockCompanies = [
    { id: 'client-abc', name: 'Test Company' },
    { id: 'client-def', name: 'Another Company' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSmartUploadRouter.previewStoragePath.mockReset();
  });

  describe('buildUploadContext', () => {
    it('sollte korrekten Upload-Kontext erstellen', () => {
      const context = mediaLibraryContextBuilder.buildUploadContext(mockParams);
      
      expect(context).toEqual({
        organizationId: 'org-123',
        userId: 'user-456',
        uploadType: 'media-library',
        folderId: 'folder-789',
        clientId: 'client-abc',
        autoTags: expect.arrayContaining([
          'source:dialog',
          'folder:media-library',
          'folder-name:test-folder',
          'client:preselected',
          'media-library:true'
        ])
      });
    });

    it('sollte korrekte Tags für Root-Upload generieren', () => {
      const params = { ...mockParams, currentFolderId: undefined, folderName: undefined };
      const context = mediaLibraryContextBuilder.buildUploadContext(params);
      
      expect(context.autoTags).toContain('folder:root');
      expect(context.autoTags).not.toContain('folder:media-library');
    });

    it('sollte alle Upload-Source Varianten handhaben', () => {
      const testSources: Array<MediaLibraryUploadParams['uploadSource']> = [
        'dialog', 'drag-drop', 'url-parameter'
      ];
      
      testSources.forEach(source => {
        const params = { ...mockParams, uploadSource: source };
        const context = mediaLibraryContextBuilder.buildUploadContext(params);
        
        expect(context.autoTags).toContain(`source:${source}`);
      });
    });

    it('sollte Folder-Name korrekt normalisieren', () => {
      const specialCharsFolder = { ...mockParams, folderName: 'Test Folder! @#$%^&*()' };
      const context = mediaLibraryContextBuilder.buildUploadContext(specialCharsFolder);
      
      expect(context.autoTags).toContain('folder-name:test-folder-----------');
    });

    it('sollte aktuelles Datum-Tag generieren', () => {
      const context = mediaLibraryContextBuilder.buildUploadContext(mockParams);
      const today = new Date().toISOString().split('T')[0];
      
      expect(context.autoTags).toContain(`upload-date:${today}`);
    });

    it('sollte ohne optionale Parameter funktionieren', () => {
      const minimalParams: MediaLibraryUploadParams = {
        organizationId: 'org-123',
        userId: 'user-456'
      };
      
      const context = mediaLibraryContextBuilder.buildUploadContext(minimalParams);
      
      expect(context.organizationId).toBe('org-123');
      expect(context.userId).toBe('user-456');
      expect(context.uploadType).toBe('media-library');
      expect(context.autoTags).toContain('folder:root');
      expect(context.autoTags).toContain('media-library:true');
    });
  });

  describe('buildContextInfo', () => {
    beforeEach(() => {
      mockSmartUploadRouter.previewStoragePath.mockResolvedValue(
        'organizations/org-123/media/Kunden/Test-Company/test-folder/'
      );
    });

    it('sollte Context-Info mit Client-Vererbung erstellen', async () => {
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        mockParams,
        mockCompanies
      );
      
      expect(contextInfo.uploadMethod).toBe('smart');
      expect(contextInfo.clientInheritance).toEqual({
        source: 'preselected',
        clientId: 'client-abc',
        clientName: 'Test Company'
      });
      expect(contextInfo.routing.type).toBe('organized');
      expect(contextInfo.targetPath).toBe('organizations/org-123/media/Kunden/Test-Company/test-folder/');
      expect(mockSmartUploadRouter.previewStoragePath).toHaveBeenCalledWith(
        'beispiel-datei.jpg',
        expect.objectContaining({
          organizationId: 'org-123',
          userId: 'user-456',
          uploadType: 'media-library'
        })
      );
    });

    it('sollte unorganized routing für Root-Upload wählen', async () => {
      const params = { ...mockParams, currentFolderId: undefined };
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        params,
        mockCompanies
      );
      
      expect(contextInfo.routing.type).toBe('unorganized');
      expect(contextInfo.routing.reason).toBe('Upload mit Kunden-Zuordnung (Root-Ebene)');
    });

    it('sollte Fallback-Pfad bei Smart Router Fehler verwenden', async () => {
      mockSmartUploadRouter.previewStoragePath.mockRejectedValue(new Error('Service unavailable'));
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        mockParams,
        mockCompanies
      );
      
      expect(contextInfo.targetPath).toBe('organizations/org-123/media/Unzugeordnet/');
    });

    it('sollte alle Expected Tags generieren', async () => {
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        mockParams,
        mockCompanies
      );
      
      expect(contextInfo.expectedTags).toEqual(
        expect.arrayContaining([
          'source:dialog',
          'folder:media-library',
          'folder-name:test-folder',
          'client:preselected',
          'media-library:true',
          expect.stringMatching(/^upload-date:\d{4}-\d{2}-\d{2}$/)
        ])
      );
    });

    it('sollte Context-Info ohne Companies erstellen', async () => {
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        mockParams
      );
      
      expect(contextInfo.clientInheritance).toEqual({
        source: 'preselected',
        clientId: 'client-abc',
        clientName: 'Unbekannter Kunde'
      });
    });

    it('sollte "none" Client-Vererbung ohne preselected Client setzen', async () => {
      const params = { ...mockParams, preselectedClientId: undefined };
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        params,
        mockCompanies
      );
      
      expect(contextInfo.clientInheritance).toEqual({
        source: 'none'
      });
    });

    it('sollte Standard Media Library Upload routing bestimmen', async () => {
      const params = {
        ...mockParams,
        currentFolderId: undefined,
        preselectedClientId: undefined
      };
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        params,
        mockCompanies
      );
      
      expect(contextInfo.routing).toEqual({
        type: 'unorganized',
        reason: 'Standard Media Library Upload'
      });
    });
  });

  describe('validateUploadParams', () => {
    it('sollte gültige Parameter akzeptieren', () => {
      const validation = mediaLibraryContextBuilder.validateUploadParams(mockParams);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('sollte fehlende Organization ID erkennen', () => {
      const params = { ...mockParams, organizationId: '' };
      const validation = mediaLibraryContextBuilder.validateUploadParams(params);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Organization ID ist erforderlich');
    });

    it('sollte fehlende User ID erkennen', () => {
      const params = { ...mockParams, userId: '' };
      const validation = mediaLibraryContextBuilder.validateUploadParams(params);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('User ID ist erforderlich');
    });

    it('sollte Warnung für fehlenden Folder Name ausgeben', () => {
      const params = { ...mockParams, folderName: undefined };
      const validation = mediaLibraryContextBuilder.validateUploadParams(params);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Folder ID ohne Folder Name - Display könnte unvollständig sein');
    });

    it('sollte mehrere Fehler gleichzeitig erkennen', () => {
      const params = { ...mockParams, organizationId: '', userId: '' };
      const validation = mediaLibraryContextBuilder.validateUploadParams(params);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          'Organization ID ist erforderlich',
          'User ID ist erforderlich'
        ])
      );
    });

    it('sollte mit minimalen Parametern validieren', () => {
      const minimalParams: MediaLibraryUploadParams = {
        organizationId: 'org-123',
        userId: 'user-456'
      };
      
      const validation = mediaLibraryContextBuilder.validateUploadParams(minimalParams);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('shouldUseSmartRouter', () => {
    it('sollte Smart Router bei aktiviertem Feature Flag verwenden', () => {
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        mockParams,
        { USE_SMART_ROUTER: true }
      );
      
      expect(shouldUse).toBe(true);
    });

    it('sollte Smart Router bei deaktiviertem Feature Flag nicht verwenden', () => {
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        mockParams,
        { USE_SMART_ROUTER: false }
      );
      
      expect(shouldUse).toBe(false);
    });

    it('sollte bei fehlender Organization ID nicht verwenden', () => {
      const params = { ...mockParams, organizationId: '' };
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        params,
        { USE_SMART_ROUTER: true }
      );
      
      expect(shouldUse).toBe(false);
    });

    it('sollte bei fehlender User ID nicht verwenden', () => {
      const params = { ...mockParams, userId: '' };
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        params,
        { USE_SMART_ROUTER: true }
      );
      
      expect(shouldUse).toBe(false);
    });

    it('sollte bei undefined Feature Flags false zurückgeben', () => {
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        mockParams
      );
      
      expect(shouldUse).toBe(false);
    });

    it('sollte bei leeren Feature Flags false zurückgeben', () => {
      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        mockParams,
        {}
      );
      
      expect(shouldUse).toBe(false);
    });
  });

  describe('buildLegacyContext', () => {
    it('sollte Legacy-Kontext erstellen', () => {
      const legacyContext = mediaLibraryContextBuilder.buildLegacyContext(mockParams);
      
      expect(legacyContext).toEqual({
        organizationId: 'org-123',
        userId: 'user-456',
        folderId: 'folder-789',
        clientId: 'client-abc'
      });
    });

    it('sollte Legacy-Kontext ohne optionale Parameter erstellen', () => {
      const minimalParams: MediaLibraryUploadParams = {
        organizationId: 'org-123',
        userId: 'user-456'
      };
      
      const legacyContext = mediaLibraryContextBuilder.buildLegacyContext(minimalParams);
      
      expect(legacyContext).toEqual({
        organizationId: 'org-123',
        userId: 'user-456',
        folderId: undefined,
        clientId: undefined
      });
    });
  });
});

describe('Convenience Functions', () => {
  describe('createMediaLibraryUploadContext', () => {
    it('sollte Standard-Kontext erstellen', async () => {
      const { createMediaLibraryUploadContext } = await import('../context-builder');
      
      const context = createMediaLibraryUploadContext(
        'org-123',
        'user-456',
        'folder-789',
        'client-abc'
      );
      
      expect(context.organizationId).toBe('org-123');
      expect(context.uploadType).toBe('media-library');
      expect(context.autoTags).toContain('source:dialog');
    });

    it('sollte ohne optionale Parameter funktionieren', async () => {
      const { createMediaLibraryUploadContext } = await import('../context-builder');
      
      const context = createMediaLibraryUploadContext(
        'org-123',
        'user-456'
      );
      
      expect(context.organizationId).toBe('org-123');
      expect(context.userId).toBe('user-456');
      expect(context.folderId).toBeUndefined();
      expect(context.clientId).toBeUndefined();
    });
  });

  describe('createDragDropUploadContext', () => {
    it('sollte Drag & Drop Kontext erstellen', async () => {
      const { createDragDropUploadContext } = await import('../context-builder');
      
      const context = createDragDropUploadContext(
        'org-123',
        'user-456',
        'folder-789'
      );
      
      expect(context.autoTags).toContain('source:drag-drop');
      expect(context.folderId).toBe('folder-789');
    });

    it('sollte ohne Folder ID funktionieren', async () => {
      const { createDragDropUploadContext } = await import('../context-builder');
      
      const context = createDragDropUploadContext(
        'org-123',
        'user-456'
      );
      
      expect(context.autoTags).toContain('source:drag-drop');
      expect(context.autoTags).toContain('folder:root');
      expect(context.folderId).toBeUndefined();
    });
  });

  describe('createUrlParameterUploadContext', () => {
    it('sollte URL-Parameter Kontext erstellen', async () => {
      const { createUrlParameterUploadContext } = await import('../context-builder');
      
      const context = createUrlParameterUploadContext(
        'org-123',
        'user-456',
        'client-abc',
        '/projects/123'
      );
      
      expect(context.autoTags).toContain('source:url-parameter');
      expect(context.clientId).toBe('client-abc');
    });

    it('sollte ohne Referrer Page funktionieren', async () => {
      const { createUrlParameterUploadContext } = await import('../context-builder');
      
      const context = createUrlParameterUploadContext(
        'org-123',
        'user-456',
        'client-abc'
      );
      
      expect(context.autoTags).toContain('source:url-parameter');
      expect(context.clientId).toBe('client-abc');
    });
  });
});

// Edge Cases und Error Handling Tests
describe('Edge Cases und Error Handling', () => {
  const minimalParams: MediaLibraryUploadParams = {
    organizationId: 'org-123',
    userId: 'user-456'
  };

  describe('generateAutoTags Edge Cases', () => {
    it('sollte mit leeren String-Werten umgehen', () => {
      const params = {
        ...minimalParams,
        folderName: '',
        uploadSource: undefined
      };
      
      const context = mediaLibraryContextBuilder.buildUploadContext(params);
      
      expect(context.autoTags).toContain('folder:root');
      expect(context.autoTags).toContain('media-library:true');
      expect(context.autoTags).not.toContain('source:');
    });

    it('sollte mit sehr langen Folder-Namen umgehen', () => {
      const longFolderName = 'A'.repeat(500);
      const params = {
        ...minimalParams,
        currentFolderId: 'folder-123',
        folderName: longFolderName
      };
      
      const context = mediaLibraryContextBuilder.buildUploadContext(params);
      
      expect(context.autoTags).toContain(`folder-name:${'a'.repeat(500)}`);
    });

    it('sollte mit Unicode-Zeichen in Folder-Namen umgehen', () => {
      const unicodeFolder = 'Test Folder 🚀 äöü';
      const params = {
        ...minimalParams,
        currentFolderId: 'folder-123',
        folderName: unicodeFolder
      };
      
      const context = mediaLibraryContextBuilder.buildUploadContext(params);
      
      expect(context.autoTags).toContain('folder-name:test-folder-------');
    });
  });

  describe('analyzeClientInheritance Edge Cases', () => {
    it('sollte mit nicht-existierendem Client ID umgehen', async () => {
      const params = {
        ...minimalParams,
        preselectedClientId: 'non-existent-client'
      };
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        params,
        [{ id: 'other-client', name: 'Other Company' }]
      );
      
      expect(contextInfo.clientInheritance).toEqual({
        source: 'preselected',
        clientId: 'non-existent-client',
        clientName: 'Unbekannter Kunde'
      });
    });

    it('sollte mit leerer Companies-Liste umgehen', async () => {
      const params = {
        ...minimalParams,
        preselectedClientId: 'client-123'
      };
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        params,
        []
      );
      
      expect(contextInfo.clientInheritance?.clientName).toBe('Unbekannter Kunde');
    });
  });

  describe('buildContextInfo Error Handling', () => {
    beforeEach(() => {
      mockSmartUploadRouter.previewStoragePath.mockReset();
    });

    it('sollte Smart Router Network-Fehler handhaben', async () => {
      mockSmartUploadRouter.previewStoragePath.mockRejectedValue(
        new Error('ECONNREFUSED')
      );
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        minimalParams
      );
      
      expect(contextInfo.targetPath).toBe('organizations/org-123/media/Unzugeordnet/');
    });

    it('sollte Smart Router Timeout handhaben', async () => {
      mockSmartUploadRouter.previewStoragePath.mockRejectedValue(
        new Error('Request timeout')
      );
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        minimalParams
      );
      
      expect(contextInfo.targetPath).toBe('organizations/org-123/media/Unzugeordnet/');
    });

    it('sollte Promise rejection handhaben', async () => {
      mockSmartUploadRouter.previewStoragePath.mockImplementation(() => {
        return Promise.reject(new Error('Service temporarily unavailable'));
      });
      
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(
        minimalParams
      );
      
      expect(contextInfo.targetPath).toBe('organizations/org-123/media/Unzugeordnet/');
    });
  });

  describe('Multi-Tenancy Isolation Tests', () => {
    it('sollte organizationId in allen Kontexten isolieren', () => {
      const org1Params = { ...minimalParams, organizationId: 'org-1' };
      const org2Params = { ...minimalParams, organizationId: 'org-2' };
      
      const context1 = mediaLibraryContextBuilder.buildUploadContext(org1Params);
      const context2 = mediaLibraryContextBuilder.buildUploadContext(org2Params);
      
      expect(context1.organizationId).toBe('org-1');
      expect(context2.organizationId).toBe('org-2');
      expect(context1.organizationId).not.toBe(context2.organizationId);
    });

    it('sollte Legacy-Kontext organizationId isolieren', () => {
      const org1Params = { ...minimalParams, organizationId: 'org-1' };
      const org2Params = { ...minimalParams, organizationId: 'org-2' };
      
      const legacy1 = mediaLibraryContextBuilder.buildLegacyContext(org1Params);
      const legacy2 = mediaLibraryContextBuilder.buildLegacyContext(org2Params);
      
      expect(legacy1.organizationId).toBe('org-1');
      expect(legacy2.organizationId).toBe('org-2');
    });

    it('sollte Smart Router Pfad-Vorschau mit korrekter organizationId aufrufen', async () => {
      await mediaLibraryContextBuilder.buildContextInfo(
        { ...minimalParams, organizationId: 'org-test-123' }
      );
      
      expect(mockSmartUploadRouter.previewStoragePath).toHaveBeenCalledWith(
        'beispiel-datei.jpg',
        expect.objectContaining({
          organizationId: 'org-test-123'
        })
      );
    });
  });
});

// Performance und Memory Tests
describe('Performance Tests', () => {
  const minimalParams: MediaLibraryUploadParams = {
    organizationId: 'org-123',
    userId: 'user-456'
  };

  it('sollte große Mengen von Kontexten effizient erstellen', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      const params = { ...minimalParams, currentFolderId: `folder-${i}` };
      mediaLibraryContextBuilder.buildUploadContext(params);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Sollte weniger als 1 Sekunde dauern
    expect(duration).toBeLessThan(1000);
  });

  it('sollte Memory-effizient bei vielen Validierungen sein', () => {
    const validations = [];
    
    for (let i = 0; i < 100; i++) {
      const params = { ...minimalParams, currentFolderId: `folder-${i}` };
      validations.push(
        mediaLibraryContextBuilder.validateUploadParams(params)
      );
    }
    
    // Alle Validierungen sollten erfolgreich sein
    validations.forEach(validation => {
      expect(validation.isValid).toBe(true);
    });
  });
});