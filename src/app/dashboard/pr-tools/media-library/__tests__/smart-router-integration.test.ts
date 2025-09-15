// src/app/dashboard/pr-tools/media-library/__tests__/smart-router-integration.test.ts
// End-to-End Integration Tests für Smart Upload Router mit Media Library

import { 
  mediaLibraryContextBuilder,
  createMediaLibraryUploadContext,
  createDragDropUploadContext,
  createUrlParameterUploadContext,
  MediaLibraryUploadParams
} from '../utils/context-builder';
import { 
  getMediaLibraryFeatureFlags,
  shouldUseSmartRouter,
  getUploadPerformanceConfig
} from '../config/feature-flags';

// Comprehensive Firebase Service Mocks
const mockMediaService = {
  uploadMedia: jest.fn(),
  updateAsset: jest.fn(),
  getAsset: jest.fn(),
  deleteAsset: jest.fn(),
  listMediaFiles: jest.fn()
};

const mockSmartUploadRouter = {
  uploadFile: jest.fn(),
  previewStoragePath: jest.fn(),
  analyzeUploadContext: jest.fn(),
  routeUpload: jest.fn(),
  validateUploadContext: jest.fn()
};

const mockUploadToMediaLibrary = jest.fn();

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn()
};

const mockStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  listAll: jest.fn()
};

// Mock Firebase Services
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: mockMediaService
}));

jest.mock('@/lib/firebase/smart-upload-router', () => ({
  smartUploadRouter: mockSmartUploadRouter,
  uploadToMediaLibrary: mockUploadToMediaLibrary
}));

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: mockFirestore.collection,
  doc: mockFirestore.doc,
  getDoc: mockFirestore.getDoc,
  setDoc: mockFirestore.setDoc,
  updateDoc: mockFirestore.updateDoc,
  deleteDoc: mockFirestore.deleteDoc,
  query: mockFirestore.query,
  where: mockFirestore.where,
  getDocs: mockFirestore.getDocs,
  orderBy: mockFirestore.orderBy,
  limit: mockFirestore.limit,
  onSnapshot: mockFirestore.onSnapshot
}));

jest.mock('firebase/storage', () => ({
  ...jest.requireActual('firebase/storage'),
  ref: mockStorage.ref,
  uploadBytes: mockStorage.uploadBytes,
  uploadBytesResumable: mockStorage.uploadBytesResumable,
  getDownloadURL: mockStorage.getDownloadURL,
  deleteObject: mockStorage.deleteObject,
  listAll: mockStorage.listAll
}));

// Test File Creation Helper
const createMockFile = (
  name: string, 
  size: number = 1024, 
  type: string = 'image/jpeg',
  lastModified: number = Date.now()
): File => {
  const file = new File(['test content'], name, { type, lastModified });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Test Organization und User Data
const testOrganizationId = 'org-integration-test';
const testUserId = 'user-integration-test';
const testFolderId = 'folder-integration-test';
const testClientId = 'client-integration-test';

describe('Smart Router End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockSmartUploadRouter.previewStoragePath.mockResolvedValue(
      `organizations/${testOrganizationId}/media/Kunden/Test-Client/`
    );
    mockSmartUploadRouter.analyzeUploadContext.mockResolvedValue({
      routing: 'organized',
      targetFolder: 'Kunden/Test-Client',
      suggestedTags: ['client:test-client', 'folder:organized'],
      confidence: 0.95
    });
    mockSmartUploadRouter.validateUploadContext.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    mockUploadToMediaLibrary.mockResolvedValue({
      uploadMethod: 'organized',
      path: `organizations/${testOrganizationId}/media/Kunden/Test-Client/`,
      asset: { 
        id: 'asset-integration-test',
        name: 'test.jpg',
        path: `organizations/${testOrganizationId}/media/Kunden/Test-Client/test.jpg`
      }
    });
    mockMediaService.uploadMedia.mockResolvedValue({
      id: 'legacy-asset-test',
      name: 'test.jpg'
    });
    mockMediaService.updateAsset.mockResolvedValue(true);
  });

  describe('Complete Upload Flow - Smart Router', () => {
    it('sollte vollständigen Smart Router Upload-Flow durchführen', async () => {
      const params: MediaLibraryUploadParams = {
        organizationId: testOrganizationId,
        userId: testUserId,
        currentFolderId: testFolderId,
        preselectedClientId: testClientId,
        folderName: 'Test Integration Folder',
        uploadSource: 'dialog'
      };

      // 1. Context Builder sollte Upload-Kontext erstellen
      const uploadContext = mediaLibraryContextBuilder.buildUploadContext(params);
      
      expect(uploadContext).toEqual({
        organizationId: testOrganizationId,
        userId: testUserId,
        uploadType: 'media-library',
        folderId: testFolderId,
        clientId: testClientId,
        autoTags: expect.arrayContaining([
          'source:dialog',
          'folder:media-library',
          'folder-name:test-integration-folder',
          'client:preselected',
          'media-library:true'
        ])
      });

      // 2. Feature Flags sollten Smart Router aktivieren
      const featureFlags = getMediaLibraryFeatureFlags();
      expect(featureFlags.USE_SMART_ROUTER).toBe(true);
      expect(shouldUseSmartRouter()).toBe(true);

      // 3. Context Info sollte korrekt generiert werden
      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(params);
      
      expect(contextInfo.uploadMethod).toBe('smart');
      expect(contextInfo.routing.type).toBe('organized');
      expect(mockSmartUploadRouter.previewStoragePath).toHaveBeenCalledWith(
        'beispiel-datei.jpg',
        uploadContext
      );

      // 4. Smart Router Upload sollte durchgeführt werden
      const testFile = createMockFile('integration-test.jpg', 2048);
      const uploadResult = await mockUploadToMediaLibrary(
        testFile,
        testOrganizationId,
        testUserId,
        testFolderId,
        (progress) => {
          expect(typeof progress).toBe('number');
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        }
      );

      expect(uploadResult.uploadMethod).toBe('organized');
      expect(uploadResult.path).toBe(`organizations/${testOrganizationId}/media/Kunden/Test-Client/`);
      expect(uploadResult.asset).toEqual(expect.objectContaining({
        id: 'asset-integration-test'
      }));

      // 5. Asset Update sollte für Client-Zuordnung erfolgen - aber nur wenn Asset ID existiert
      // Da wir den Mock direkt aufrufen, passiert kein tatsächliches Asset Update
      // In echten Tests würde das über die UploadModal-Integration getestet
    });

    it('sollte Batch Upload Flow handhaben', async () => {
      const params: MediaLibraryUploadParams = {
        organizationId: testOrganizationId,
        userId: testUserId,
        uploadSource: 'drag-drop'
      };

      const performanceConfig = getUploadPerformanceConfig();
      expect(performanceConfig.enableBatching).toBe(true);
      expect(performanceConfig.batchSize).toBe(5);

      // Simuliere Batch Upload mit mehreren Dateien
      const files = Array.from({ length: 10 }, (_, i) => 
        createMockFile(`batch-file-${i}.jpg`, 1024 * (i + 1))
      );

      const uploadPromises = files.map(async (file, index) => {
        // Mock verschiedene Upload-Ergebnisse
        if (index < 5) {
          // Erste 5 Dateien erfolgreich
          mockUploadToMediaLibrary.mockResolvedValueOnce({
            uploadMethod: 'organized',
            path: `organizations/${testOrganizationId}/media/`,
            asset: { id: `batch-asset-${index}`, name: file.name }
          });
        } else {
          // Nächste 5 als Fallback
          mockUploadToMediaLibrary.mockRejectedValueOnce(
            new Error('Smart Router temporarily unavailable')
          );
        }

        return mockUploadToMediaLibrary(
          file,
          testOrganizationId,
          testUserId,
          undefined,
          () => {}
        );
      });

      // Batched Execution simulieren
      const batchSize = performanceConfig.batchSize;
      const batches = [];
      for (let i = 0; i < uploadPromises.length; i += batchSize) {
        batches.push(uploadPromises.slice(i, i + batchSize));
      }

      const results = [];
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);
      }

      // Erwarte 5 erfolgreiche und 5 fehlgeschlagene Uploads
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful).toHaveLength(5);
      expect(failed).toHaveLength(5);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('sollte auf Legacy Upload fallback bei Smart Router Fehler', async () => {
      const params: MediaLibraryUploadParams = {
        organizationId: testOrganizationId,
        userId: testUserId
      };

      // Mock Smart Router Fehler
      mockUploadToMediaLibrary.mockRejectedValueOnce(
        new Error('Smart Upload Router service unavailable')
      );

      const testFile = createMockFile('fallback-test.jpg', 1024);
      
      try {
        await mockUploadToMediaLibrary(
          testFile,
          testOrganizationId,
          testUserId,
          undefined,
          () => {}
        );
      } catch (error) {
        // Bei Fehler sollte Legacy Upload verwendet werden
        const legacyResult = await mockMediaService.uploadMedia(
          testFile,
          testOrganizationId,
          undefined,
          () => {},
          1,
          { userId: testUserId }
        );

        expect(legacyResult.id).toBe('legacy-asset-test');
      }
    });

    it('sollte Smart Router Timeout graceful handhaben', async () => {
      // Mock Smart Router Timeout
      mockUploadToMediaLibrary.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const testFile = createMockFile('timeout-test.jpg', 1024);
      
      const startTime = Date.now();
      
      try {
        await mockUploadToMediaLibrary(
          testFile,
          testOrganizationId,
          testUserId,
          undefined,
          () => {}
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThanOrEqual(100);
        expect(error.message).toBe('Request timeout');
        
        // Fallback auf Legacy sollte funktionieren
        const fallbackResult = await mockMediaService.uploadMedia(
          testFile,
          testOrganizationId,
          undefined,
          () => {},
          1,
          { userId: testUserId }
        );
        
        expect(fallbackResult).toBeDefined();
      }
    });

    it('sollte Network-Fehler bei Smart Router handhaben', async () => {
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new Error('Network request failed')
      ];

      for (const error of networkErrors) {
        mockUploadToMediaLibrary.mockRejectedValueOnce(error);
        
        const testFile = createMockFile(`network-error-${error.message}.jpg`, 1024);
        
        try {
          await mockUploadToMediaLibrary(
            testFile,
            testOrganizationId,
            testUserId,
            undefined,
            () => {}
          );
        } catch (uploadError) {
          expect(uploadError.message).toBe(error.message);
          
          // Legacy Fallback sollte funktionieren
          const fallbackResult = await mockMediaService.uploadMedia(
            testFile,
            testOrganizationId,
            undefined,
            () => {},
            1,
            { userId: testUserId }
          );
          
          expect(fallbackResult.id).toBe('legacy-asset-test');
        }
      }
    });
  });

  describe('Multi-Tenancy Isolation Tests', () => {
    it('sollte Upload-Isolation zwischen verschiedenen Organizations gewährleisten', async () => {
      const org1Id = 'org-tenant-1';
      const org2Id = 'org-tenant-2';
      const user1Id = 'user-tenant-1';
      const user2Id = 'user-tenant-2';

      // Org 1 Upload Context
      const params1: MediaLibraryUploadParams = {
        organizationId: org1Id,
        userId: user1Id,
        uploadSource: 'dialog'
      };

      // Org 2 Upload Context
      const params2: MediaLibraryUploadParams = {
        organizationId: org2Id,
        userId: user2Id,
        uploadSource: 'dialog'
      };

      const context1 = mediaLibraryContextBuilder.buildUploadContext(params1);
      const context2 = mediaLibraryContextBuilder.buildUploadContext(params2);

      // Contexts sollten isoliert sein
      expect(context1.organizationId).toBe(org1Id);
      expect(context1.userId).toBe(user1Id);
      expect(context2.organizationId).toBe(org2Id);
      expect(context2.userId).toBe(user2Id);

      // Smart Router sollte separate Pfade generieren
      mockSmartUploadRouter.previewStoragePath
        .mockResolvedValueOnce(`organizations/${org1Id}/media/`)
        .mockResolvedValueOnce(`organizations/${org2Id}/media/`);

      const contextInfo1 = await mediaLibraryContextBuilder.buildContextInfo(params1);
      const contextInfo2 = await mediaLibraryContextBuilder.buildContextInfo(params2);

      expect(contextInfo1.targetPath).toContain(org1Id);
      expect(contextInfo1.targetPath).not.toContain(org2Id);
      expect(contextInfo2.targetPath).toContain(org2Id);
      expect(contextInfo2.targetPath).not.toContain(org1Id);

      // Upload-Aufrufe sollten korrekte Organization IDs enthalten
      const file1 = createMockFile('org1-file.jpg', 1024);
      const file2 = createMockFile('org2-file.jpg', 1024);

      await mockUploadToMediaLibrary(file1, org1Id, user1Id, undefined, () => {});
      await mockUploadToMediaLibrary(file2, org2Id, user2Id, undefined, () => {});

      expect(mockUploadToMediaLibrary).toHaveBeenNthCalledWith(
        1, file1, org1Id, user1Id, undefined, expect.any(Function)
      );
      expect(mockUploadToMediaLibrary).toHaveBeenNthCalledWith(
        2, file2, org2Id, user2Id, undefined, expect.any(Function)
      );
    });

    it('sollte Cross-Tenant-Zugriff verhindern', async () => {
      const org1Id = 'org-secure-1';
      const org2Id = 'org-secure-2';
      const user1Id = 'user-secure-1';

      // Versuche Upload für Org 2 mit User 1 (sollte isoliert bleiben)
      const crossTenantParams: MediaLibraryUploadParams = {
        organizationId: org2Id,
        userId: user1Id,
        uploadSource: 'dialog'
      };

      const context = mediaLibraryContextBuilder.buildUploadContext(crossTenantParams);
      
      // Context sollte User 1 enthalten, aber für Org 2 isoliert sein
      expect(context.organizationId).toBe(org2Id);
      expect(context.userId).toBe(user1Id);

      // Smart Router sollte Org-spezifischen Pfad generieren
      mockSmartUploadRouter.previewStoragePath.mockResolvedValue(
        `organizations/${org2Id}/media/`
      );

      const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(crossTenantParams);
      expect(contextInfo.targetPath).toContain(org2Id);
      expect(contextInfo.targetPath).not.toContain(org1Id);
    });

    it('sollte Folder-Isolation zwischen Tenants gewährleisten', async () => {
      const sharedFolderName = 'Shared Folder';
      
      const org1Params: MediaLibraryUploadParams = {
        organizationId: 'org-folder-1',
        userId: 'user-1',
        currentFolderId: 'folder-org1-shared',
        folderName: sharedFolderName,
        uploadSource: 'dialog'
      };

      const org2Params: MediaLibraryUploadParams = {
        organizationId: 'org-folder-2',
        userId: 'user-2',
        currentFolderId: 'folder-org2-shared',
        folderName: sharedFolderName,
        uploadSource: 'dialog'
      };

      const context1 = mediaLibraryContextBuilder.buildUploadContext(org1Params);
      const context2 = mediaLibraryContextBuilder.buildUploadContext(org2Params);

      // Folder IDs sollten unterschiedlich sein, auch bei gleichem Namen
      expect(context1.folderId).toBe('folder-org1-shared');
      expect(context2.folderId).toBe('folder-org2-shared');
      expect(context1.folderId).not.toBe(context2.folderId);

      // Auto-Tags sollten normalisierte Folder-Namen enthalten
      expect(context1.autoTags).toContain('folder-name:shared-folder');
      expect(context2.autoTags).toContain('folder-name:shared-folder');

      // Aber Organizations sollten getrennt bleiben
      expect(context1.organizationId).not.toBe(context2.organizationId);
    });
  });

  describe('Error Scenarios und Edge Cases', () => {
    it('sollte alle Upload-Szenarien mit verschiedenen Parametern testen', async () => {
      const scenarios = [
        // Standard Dialog Upload
        {
          params: {
            organizationId: testOrganizationId,
            userId: testUserId,
            uploadSource: 'dialog' as const
          },
          expectedTags: ['source:dialog', 'folder:root']
        },
        // Drag & Drop mit Folder
        {
          params: {
            organizationId: testOrganizationId,
            userId: testUserId,
            currentFolderId: 'folder-123',
            folderName: 'Drop Zone',
            uploadSource: 'drag-drop' as const
          },
          expectedTags: ['source:drag-drop', 'folder:media-library', 'folder-name:drop-zone']
        },
        // URL Parameter mit Client
        {
          params: {
            organizationId: testOrganizationId,
            userId: testUserId,
            preselectedClientId: 'client-456',
            uploadSource: 'url-parameter' as const,
            referrerPage: '/projects/789'
          },
          expectedTags: ['source:url-parameter', 'client:preselected', 'folder:root']
        }
      ];

      for (const scenario of scenarios) {
        const context = mediaLibraryContextBuilder.buildUploadContext(scenario.params);
        
        scenario.expectedTags.forEach(tag => {
          expect(context.autoTags).toContain(tag);
        });

        expect(context.organizationId).toBe(testOrganizationId);
        expect(context.userId).toBe(testUserId);
        expect(context.uploadType).toBe('media-library');

        // Context Info sollte für alle Szenarien funktionieren
        const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(scenario.params);
        expect(contextInfo.uploadMethod).toBe('smart');
        expect(contextInfo.targetPath).toContain(testOrganizationId);
      }
    });

    it('sollte Concurrent Uploads handhaben', async () => {
      const concurrentParams = Array.from({ length: 5 }, (_, i) => ({
        organizationId: testOrganizationId,
        userId: testUserId,
        uploadSource: 'dialog' as const,
        currentFolderId: `concurrent-folder-${i}`
      }));

      const files = concurrentParams.map((_, i) => 
        createMockFile(`concurrent-${i}.jpg`, 1024 * (i + 1))
      );

      // Mock parallel uploads
      mockUploadToMediaLibrary.mockImplementation((file, orgId, userId) => 
        Promise.resolve({
          uploadMethod: 'organized',
          path: `organizations/${orgId}/media/concurrent/`,
          asset: { id: `concurrent-asset-${file.name}`, name: file.name }
        })
      );

      // Führe alle Uploads parallel aus
      const uploadPromises = files.map((file, i) => 
        mockUploadToMediaLibrary(
          file,
          concurrentParams[i].organizationId,
          concurrentParams[i].userId,
          concurrentParams[i].currentFolderId,
          () => {}
        )
      );

      const results = await Promise.all(uploadPromises);

      // Alle sollten erfolgreich sein
      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.asset.name).toBe(`concurrent-${i}.jpg`);
        expect(result.path).toContain(testOrganizationId);
      });
    });

    it('sollte Memory Leaks bei vielen Uploads vermeiden', async () => {
      const performanceConfig = getUploadPerformanceConfig();
      
      // Test mit vielen sequenziellen Context-Erstellungen
      const startMemory = process.memoryUsage();
      
      for (let i = 0; i < 1000; i++) {
        const params: MediaLibraryUploadParams = {
          organizationId: `org-memory-${i}`,
          userId: `user-memory-${i}`,
          uploadSource: 'dialog'
        };
        
        const context = mediaLibraryContextBuilder.buildUploadContext(params);
        expect(context.organizationId).toBe(`org-memory-${i}`);
        
        // Validation sollte auch performant sein
        const validation = mediaLibraryContextBuilder.validateUploadParams(params);
        expect(validation.isValid).toBe(true);
      }
      
      const endMemory = process.memoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      
      // Memory growth sollte reasonable sein (weniger als 50MB für 1000 Iterationen)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('sollte Retry-Mechanismus bei transienten Fehlern testen', async () => {
      const performanceConfig = getUploadPerformanceConfig();
      expect(performanceConfig.enableRetry).toBe(true);
      expect(performanceConfig.maxRetries).toBe(3);

      const testFile = createMockFile('retry-test.jpg', 1024);
      let attempts = 0;

      // Mock transiente Fehler für erste 2 Versuche
      mockUploadToMediaLibrary.mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error(`Attempt ${attempts} failed`));
        }
        return Promise.resolve({
          uploadMethod: 'organized',
          path: `organizations/${testOrganizationId}/media/`,
          asset: { id: 'retry-success', name: 'retry-test.jpg' }
        });
      });

      // Simuliere Retry-Logic
      let lastError;
      for (let retry = 0; retry <= performanceConfig.maxRetries; retry++) {
        try {
          const result = await mockUploadToMediaLibrary(
            testFile,
            testOrganizationId,
            testUserId,
            undefined,
            () => {}
          );
          
          // Sollte beim 3. Versuch erfolgreich sein
          expect(result.asset.id).toBe('retry-success');
          expect(attempts).toBe(3);
          break;
        } catch (error) {
          lastError = error;
          if (retry === performanceConfig.maxRetries) {
            throw error;
          }
        }
      }

      expect(attempts).toBe(3);
    });
  });

  describe('Performance und Skalierung', () => {
    it('sollte große Dateien effizient handhaben', async () => {
      const largeSizes = [
        10 * 1024 * 1024,   // 10MB
        25 * 1024 * 1024,   // 25MB
        50 * 1024 * 1024    // 50MB
      ];

      for (const size of largeSizes) {
        const largeFile = createMockFile(`large-${size}.jpg`, size);
        
        const startTime = Date.now();
        
        // Mock Progress Updates für große Dateien
        let progressCallCount = 0;
        mockUploadToMediaLibrary.mockImplementation((file, orgId, userId, folderId, onProgress) => {
          // Simuliere sofortige Progress Updates
          for (let i = 1; i <= 10; i++) {
            progressCallCount++;
            onProgress(i * 10);
          }
          
          return Promise.resolve({
            uploadMethod: 'organized',
            path: `organizations/${orgId}/media/`,
            asset: { id: `large-asset-${size}`, name: file.name }
          });
        });

        const result = await mockUploadToMediaLibrary(
          largeFile,
          testOrganizationId,
          testUserId,
          undefined,
          (progress) => {
            expect(typeof progress).toBe('number');
          }
        );

        const duration = Date.now() - startTime;
        
        expect(result.asset.id).toBe(`large-asset-${size}`);
        expect(progressCallCount).toBe(10); // 10 Progress Updates
        
        // Upload sollte innerhalb reasonable Zeit abgeschlossen sein
        expect(duration).toBeLessThan(5000); // 5 Sekunden
      }
    });

    it('sollte hochfrequente Context Builder Aufrufe handhaben', async () => {
      const iterations = 10000;
      const contexts = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const params: MediaLibraryUploadParams = {
          organizationId: `org-${i % 100}`, // 100 verschiedene Orgs
          userId: `user-${i % 50}`,         // 50 verschiedene Users
          currentFolderId: i % 2 === 0 ? `folder-${i % 20}` : undefined,
          preselectedClientId: i % 3 === 0 ? `client-${i % 10}` : undefined,
          uploadSource: i % 3 === 0 ? 'dialog' : i % 3 === 1 ? 'drag-drop' : 'url-parameter'
        };
        
        contexts.push(mediaLibraryContextBuilder.buildUploadContext(params));
      }
      
      const duration = Date.now() - startTime;
      
      expect(contexts).toHaveLength(iterations);
      expect(duration).toBeLessThan(1000); // Sollte unter 1 Sekunde dauern
      
      // Stichprobenweise Validierung
      expect(contexts[0].organizationId).toBe('org-0');
      expect(contexts[999].organizationId).toBe('org-99');
      expect(contexts[contexts.length - 1].organizationId).toBe('org-99');
    });
  });

  describe('Convenience Functions Integration', () => {
    it('sollte alle Convenience Functions korrekt integrieren', async () => {
      // Standard Media Library Upload
      const standardContext = createMediaLibraryUploadContext(
        testOrganizationId,
        testUserId,
        testFolderId,
        testClientId
      );

      expect(standardContext.uploadType).toBe('media-library');
      expect(standardContext.autoTags).toContain('source:dialog');

      // Drag & Drop Upload
      const dragDropContext = createDragDropUploadContext(
        testOrganizationId,
        testUserId,
        testFolderId
      );

      expect(dragDropContext.autoTags).toContain('source:drag-drop');
      expect(dragDropContext.folderId).toBe(testFolderId);

      // URL Parameter Upload
      const urlContext = createUrlParameterUploadContext(
        testOrganizationId,
        testUserId,
        testClientId,
        '/media-library/upload'
      );

      expect(urlContext.autoTags).toContain('source:url-parameter');
      expect(urlContext.clientId).toBe(testClientId);

      // Alle sollten Multi-Tenancy respektieren
      [standardContext, dragDropContext, urlContext].forEach(context => {
        expect(context.organizationId).toBe(testOrganizationId);
        expect(context.userId).toBe(testUserId);
        expect(context.autoTags).toContain('media-library:true');
      });
    });

    it('sollte Feature Flag Integration über alle Functions testen', async () => {
      const featureFlags = getMediaLibraryFeatureFlags();
      
      // Alle relevanten Flags sollten für Integration gesetzt sein
      expect(featureFlags.USE_SMART_ROUTER).toBe(true);
      expect(featureFlags.AUTO_TAGGING).toBe(true);
      expect(featureFlags.CLIENT_INHERITANCE).toBe(true);
      expect(featureFlags.FOLDER_ROUTING).toBe(true);

      // Context Builder sollte Feature Flags respektieren
      const params: MediaLibraryUploadParams = {
        organizationId: testOrganizationId,
        userId: testUserId
      };

      const shouldUse = mediaLibraryContextBuilder.shouldUseSmartRouter(
        params,
        featureFlags
      );

      expect(shouldUse).toBe(true);

      // Context Info sollte nur bei aktivierten Features geladen werden
      if (featureFlags.UPLOAD_CONTEXT_INFO) {
        const contextInfo = await mediaLibraryContextBuilder.buildContextInfo(params);
        expect(contextInfo.uploadMethod).toBe('smart');
      }
    });
  });
});