// src/lib/firebase/__tests__/unified-upload-api.test.ts
// Integration Tests für Unified Upload API Phase 4
// Comprehensive Testing für alle Upload-Services und Legacy-Compatibility

import { unifiedUploadAPI, quickUpload, smartBatchUpload } from '../unified-upload-api';
import { legacyMediaService } from '../legacy-wrappers/legacy-media-service';
import { legacyCampaignService } from '../legacy-wrappers/legacy-campaign-service';
import { contextValidationEngine } from '../context-validation-engine';
import { uploadPerformanceManager } from '../upload-performance-manager';
import {
  UnifiedUploadContext,
  UnifiedUploadOptions,
  UnifiedUploadResult,
  BatchUploadResult,
  UnifiedUploadError
} from '@/types/unified-upload';
import { Timestamp } from 'firebase/firestore';

// =====================
// TEST SETUP & MOCKS
// =====================

// Mock Services
jest.mock('../media-service');
jest.mock('../campaign-media-service');
jest.mock('../project-upload-service');
jest.mock('../branding-service');
jest.mock('../smart-upload-router');

// Mock File für Tests
const createMockFile = (name: string, size: number = 1024, type: string = 'image/jpeg'): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

// Base Test Context
const createTestContext = (overrides: Partial<UnifiedUploadContext> = {}): UnifiedUploadContext => ({
  organizationId: 'test-org-123',
  userId: 'test-user-456',
  uploadTarget: 'media_library',
  uploadType: 'media_asset',
  contextSource: 'explicit',
  contextTimestamp: Timestamp.now(),
  ...overrides
});

// =====================
// CORE API TESTS
// =====================

describe('Unified Upload API Core', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    uploadPerformanceManager.resetMigrationStatistics = jest.fn();
  });

  describe('upload() - Core Upload Method', () => {
    
    test('should upload single file to media library successfully', async () => {
      const file = createMockFile('test-image.jpg', 2048, 'image/jpeg');
      const context = createTestContext({
        uploadTarget: 'media_library',
        uploadType: 'media_asset'
      });

      const result = await unifiedUploadAPI.upload(file, context);

      expect(result.success).toBe(true);
      expect(result.uploadId).toBeDefined();
      expect(result.asset).toBeDefined();
      expect(result.uploadMethod).toEqual(expect.any(String));
      expect(result.performanceMetrics).toBeDefined();
      expect(result.resolvedContext).toEqual(expect.objectContaining(context));
    });

    test('should handle batch upload for multiple files', async () => {
      const files = [
        createMockFile('file1.jpg', 1024),
        createMockFile('file2.png', 2048),
        createMockFile('file3.pdf', 4096, 'application/pdf')
      ];
      const context = createTestContext();

      const result = await unifiedUploadAPI.upload(files, context);

      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(3);
      expect(result.uploadMethod).toBe('batch_optimized');
      expect(result.performanceMetrics.fileSizeBytes).toBeGreaterThan(0);
    });

    test('should validate context before upload', async () => {
      const file = createMockFile('test.jpg');
      const invalidContext = createTestContext({
        organizationId: '', // Invalid - leer
        uploadTarget: 'project',
        // projectId fehlt für project upload
      });

      await expect(
        unifiedUploadAPI.upload(file, invalidContext)
      ).rejects.toThrow(UnifiedUploadError);
    });

    test('should apply smart routing when enabled', async () => {
      const file = createMockFile('smart-routed.jpg');
      const context = createTestContext({
        uploadTarget: 'campaign',
        uploadType: 'hero_image',
        campaignId: 'campaign-789',
        projectId: 'project-101'
      });
      
      const options: UnifiedUploadOptions = {
        enableSmartRouting: true,
        enableRecommendations: true
      };

      const result = await unifiedUploadAPI.upload(file, context, options);

      expect(result.smartRouterUsed).toBe(true);
      expect(result.routingDecision.selectedService).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle upload errors gracefully', async () => {
      const file = createMockFile('error-test.jpg');
      const context = createTestContext();

      // Mock Service Error
      const mockError = new Error('Service temporarily unavailable');
      jest.spyOn(unifiedUploadAPI as any, 'executeSingleUpload').mockRejectedValue(mockError);

      await expect(
        unifiedUploadAPI.upload(file, context)
      ).rejects.toThrow(UnifiedUploadError);
    });
  });

  describe('uploadToMediaLibrary()', () => {
    
    test('should upload to media library with correct context', async () => {
      const files = [createMockFile('media1.jpg'), createMockFile('media2.png')];
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        folderId: 'folder-123',
        contextSource: 'explicit' as const,
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.uploadToMediaLibrary(files, context);

      expect(result.resolvedContext.uploadTarget).toBe('media_library');
      expect(result.resolvedContext.uploadType).toBe('media_asset');
      expect(result.resolvedContext.folderId).toBe('folder-123');
    });
  });

  describe('uploadToCampaign()', () => {
    
    test('should upload campaign hero image', async () => {
      const files = [createMockFile('hero.jpg', 3072, 'image/jpeg')];
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-456',
        projectId: 'project-789',
        uploadType: 'hero_image' as const,
        contextSource: 'explicit' as const,
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.uploadToCampaign(files, context);

      expect(result.resolvedContext.uploadTarget).toBe('campaign');
      expect(result.resolvedContext.uploadType).toBe('hero_image');
      expect(result.resolvedContext.campaignId).toBe('campaign-456');
      expect(result.smartRouterUsed).toBe(true);
    });

    test('should upload campaign attachments with batch optimization', async () => {
      const files = [
        createMockFile('attachment1.pdf', 2048, 'application/pdf'),
        createMockFile('attachment2.docx', 3072, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      ];
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-456',
        uploadType: 'attachment' as const,
        contextSource: 'explicit' as const,
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.uploadToCampaign(files, context);

      expect(result.assets).toHaveLength(2);
      expect(result.uploadMethod).toBe('batch_optimized');
    });
  });

  describe('uploadToProject()', () => {
    
    test('should upload project assets with smart routing', async () => {
      const files = [createMockFile('project-doc.pdf', 4096, 'application/pdf')];
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        projectId: 'project-123',
        phase: 'creation' as const,
        clientId: 'client-456',
        contextSource: 'explicit' as const,
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.uploadToProject(files, context);

      expect(result.resolvedContext.uploadTarget).toBe('project');
      expect(result.resolvedContext.projectId).toBe('project-123');
      expect(result.resolvedContext.phase).toBe('creation');
    });
  });

  describe('uploadBranding()', () => {
    
    test('should upload branding logo with strict validation', async () => {
      const file = createMockFile('logo.png', 1536, 'image/png');
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        uploadType: 'branding_logo' as const,
        contextSource: 'explicit' as const,
        contextTimestamp: Timestamp.now()
      };

      const result = await unifiedUploadAPI.uploadBranding(file, context);

      expect(result.resolvedContext.uploadTarget).toBe('branding');
      expect(result.resolvedContext.uploadType).toBe('branding_logo');
      expect(result.smartRouterUsed).toBe(false); // Branding nutzt direkte Services
    });
  });
});

// =====================
// UTILITY METHODS TESTS
// =====================

describe('Unified Upload API Utilities', () => {
  
  describe('previewPaths()', () => {
    
    test('should generate path previews for files', async () => {
      const files = [
        createMockFile('document1.pdf'),
        createMockFile('image1.jpg')
      ];
      const context = createTestContext({
        uploadTarget: 'project',
        projectId: 'project-123'
      });

      const previews = await unifiedUploadAPI.previewPaths(files, context);

      expect(previews).toHaveLength(2);
      expect(previews[0].file.name).toBe('document1.pdf');
      expect(previews[0].previewPath).toBeDefined();
      expect(previews[0].recommendedPath).toBeDefined();
      expect(previews[1].file.name).toBe('image1.jpg');
    });

    test('should detect path differences and provide recommendations', async () => {
      const files = [createMockFile('misplaced-file.jpg')];
      const context = createTestContext({
        uploadTarget: 'media_library', // Suboptimal für organisierten Upload
        projectId: 'project-123' // Projekt vorhanden, aber nicht verwendet
      });

      const previews = await unifiedUploadAPI.previewPaths(files, context);

      expect(previews[0].pathDiffers).toBe(true);
      expect(previews[0].recommendation).toBeDefined();
      expect(previews[0].recommendation?.type).toBe('BETTER_FOLDER');
    });
  });

  describe('validateContext()', () => {
    
    test('should validate valid context successfully', async () => {
      const context = createTestContext({
        uploadTarget: 'campaign',
        uploadType: 'hero_image',
        campaignId: 'campaign-123'
      });

      const result = await unifiedUploadAPI.validateContext(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.canProceed).toBe(true);
    });

    test('should detect context validation errors', async () => {
      const context = createTestContext({
        organizationId: '', // Fehler: leer
        uploadTarget: 'project', // Fehler: projectId fehlt
        uploadType: 'media_asset'
      });

      const result = await unifiedUploadAPI.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.canProceed).toBe(false);
    });

    test('should provide warnings for suboptimal context', async () => {
      const context = createTestContext({
        uploadTarget: 'media_library',
        projectId: 'project-123' // Warning: Projekt vorhanden aber nicht genutzt
      });

      const result = await unifiedUploadAPI.validateContext(context);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('getRecommendations()', () => {
    
    test('should recommend batch upload for multiple files', async () => {
      const files = new Array(10).fill(null).map((_, i) => createMockFile(`file${i}.jpg`));
      const context = createTestContext();

      const recommendations = await unifiedUploadAPI.getRecommendations(files, context);

      const batchRecommendation = recommendations.find(r => r.type === 'USE_BATCH_UPLOAD');
      expect(batchRecommendation).toBeDefined();
      expect(batchRecommendation?.confidence).toBeGreaterThan(80);
    });

    test('should recommend file optimization for large files', async () => {
      const files = [createMockFile('large-image.jpg', 15 * 1024 * 1024)]; // 15MB
      const context = createTestContext();

      const recommendations = await unifiedUploadAPI.getRecommendations(files, context);

      const sizeRecommendation = recommendations.find(r => r.type === 'OPTIMIZE_FILE_SIZE');
      expect(sizeRecommendation).toBeDefined();
      expect(sizeRecommendation?.impact).toBe('medium');
    });

    test('should recommend better organization for media library uploads', async () => {
      const files = [createMockFile('project-file.jpg')];
      const context = createTestContext({
        uploadTarget: 'media_library',
        projectId: 'project-123' // Projekt verfügbar aber nicht genutzt
      });

      const recommendations = await unifiedUploadAPI.getRecommendations(files, context);

      const organizationRecommendation = recommendations.find(r => r.type === 'BETTER_FOLDER');
      expect(organizationRecommendation).toBeDefined();
      expect(organizationRecommendation?.category).toBe('organization');
    });
  });

  describe('uploadBatch()', () => {
    
    test('should handle multiple batches efficiently', async () => {
      const batch1Files = [createMockFile('batch1-1.jpg'), createMockFile('batch1-2.png')];
      const batch2Files = [createMockFile('batch2-1.pdf', 2048, 'application/pdf')];
      
      const batches = [
        {
          files: batch1Files,
          context: createTestContext({ uploadTarget: 'media_library' })
        },
        {
          files: batch2Files,
          context: createTestContext({ uploadTarget: 'project', projectId: 'project-123' })
        }
      ];

      const progressUpdates: Array<{ batchIndex: number; progress: any }> = [];
      const onProgress = (batchIndex: number, progress: any) => {
        progressUpdates.push({ batchIndex, progress });
      };

      const result = await unifiedUploadAPI.uploadBatch(batches, onProgress);

      expect(result.totalFiles).toBe(3);
      expect(result.successfulUploads).toBe(3);
      expect(result.failedUploads).toBe(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(result.batchPerformanceMetrics).toBeDefined();
    });

    test('should handle partial batch failures gracefully', async () => {
      const files = [
        createMockFile('valid-file.jpg'),
        createMockFile('invalid-file.xyz', 1024, 'application/unknown') // Problematischer Typ
      ];
      
      const batches = [{
        files,
        context: createTestContext()
      }];

      // Mock einen Fehler für die zweite Datei
      const originalUpload = unifiedUploadAPI.upload.bind(unifiedUploadAPI);
      jest.spyOn(unifiedUploadAPI, 'upload').mockImplementation((file, context, options) => {
        if (Array.isArray(file)) {
          // Für Batch: ersten Upload erfolgreich, zweiten fehlschlagen lassen
          if (file.some(f => f.name.includes('invalid'))) {
            return Promise.reject(new Error('Unsupported file type'));
          }
        } else if (file.name.includes('invalid')) {
          return Promise.reject(new Error('Unsupported file type'));
        }
        return originalUpload(file, context, options);
      });

      const result = await unifiedUploadAPI.uploadBatch(batches);

      expect(result.totalFiles).toBe(2);
      expect(result.successfulUploads).toBeLessThan(2);
      expect(result.failedUploads).toBeGreaterThan(0);
      
      // Cleanup Mock
      jest.restoreAllMocks();
    });
  });
});

// =====================
// LEGACY COMPATIBILITY TESTS
// =====================

describe('Legacy Service Compatibility', () => {
  
  describe('Legacy Media Service Wrapper', () => {
    
    test('should maintain API compatibility for uploadMedia', async () => {
      const file = createMockFile('legacy-test.jpg');
      
      // Legacy Parameter Format
      const result = await legacyMediaService.uploadMedia(
        file,
        'test-org-123',
        'folder-456',
        (progress) => { /* progress callback */ },
        3,
        { userId: 'user-789', clientId: 'client-101' }
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.fileName).toBe('legacy-test.jpg');
      expect(result.organizationId || result.userId).toBe('test-org-123');
    });

    test('should track migration statistics', async () => {
      const file = createMockFile('stats-test.jpg');
      
      // Reset stats vor Test
      legacyMediaService.resetMigrationStatistics();
      
      await legacyMediaService.uploadMedia(file, 'test-org', undefined, undefined, 1, { userId: 'user' });
      
      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(1);
      expect(stats.migrationRate).toBeGreaterThanOrEqual(0);
    });

    test('should fallback gracefully on unified API errors', async () => {
      const file = createMockFile('fallback-test.jpg');
      
      // Mock Unified API Error
      jest.spyOn(unifiedUploadAPI, 'upload').mockRejectedValueOnce(
        new UnifiedUploadError('Test error', 'UPLOAD_FAILED')
      );

      // Should not throw - should fallback to legacy
      const result = await legacyMediaService.uploadMedia(
        file,
        'test-org',
        undefined,
        undefined,
        1,
        { userId: 'user' }
      );

      expect(result).toBeDefined();
      
      // Cleanup
      jest.restoreAllMocks();
    });
  });

  describe('Legacy Campaign Service Wrapper', () => {
    
    test('should maintain API compatibility for campaign uploads', async () => {
      const file = createMockFile('campaign-hero.jpg', 2048, 'image/jpeg');
      
      const result = await legacyCampaignService.uploadCampaignMedia({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        uploadType: 'hero-image',
        file,
        onProgress: (progress) => { /* progress */ }
      });

      expect(result).toBeDefined();
      expect(result.campaignContext.campaignId).toBe('campaign-123');
      expect(result.usedSmartRouter).toBeDefined();
      expect(result.featureFlags).toBeDefined();
    });

    test('should handle hero image uploads specifically', async () => {
      const file = createMockFile('hero.png', 1536, 'image/png');
      
      const result = await legacyCampaignService.uploadHeroImage({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-456',
        file
      });

      expect(result.campaignContext.uploadType).toBe('hero-image');
    });

    test('should track campaign-specific migration stats', async () => {
      legacyCampaignService.resetCampaignMigrationStatistics();
      
      const file = createMockFile('campaign-attachment.pdf', 1024, 'application/pdf');
      
      await legacyCampaignService.uploadAttachment({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-789',
        file
      });

      const stats = legacyCampaignService.getCampaignMigrationStatistics();
      expect(stats.totalUploads).toBe(1);
      expect(stats.uploadTypeBreakdown).toBeDefined();
    });
  });
});

// =====================
// PERFORMANCE & ERROR HANDLING TESTS
// =====================

describe('Performance & Error Handling', () => {
  
  describe('Performance Tracking', () => {
    
    test('should track upload performance metrics', async () => {
      const file = createMockFile('performance-test.jpg', 2048);
      const context = createTestContext();

      const result = await unifiedUploadAPI.upload(file, context);

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.totalDurationMs).toBeGreaterThan(0);
      expect(result.performanceMetrics.fileSizeBytes).toBe(2048);
      expect(result.performanceMetrics.contextResolutionMs).toBeDefined();
      expect(result.performanceMetrics.uploadMs).toBeDefined();
    });

    test('should track batch performance with memory metrics', async () => {
      const files = new Array(5).fill(null).map((_, i) => createMockFile(`batch-${i}.jpg`, 1024));
      
      const batches = [{
        files,
        context: createTestContext(),
        options: { enableParallelProcessing: true }
      }];

      const result = await unifiedUploadAPI.uploadBatch(batches);

      expect(result.batchPerformanceMetrics).toBeDefined();
      expect(result.batchPerformanceMetrics.averageFileProcessingMs).toBeGreaterThan(0);
      expect(result.parallelProcessingUsed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    
    test('should handle validation errors properly', async () => {
      const file = createMockFile('validation-test.jpg');
      const invalidContext = createTestContext({
        organizationId: '', // Invalid
        uploadTarget: 'project' // Requires projectId
      });

      await expect(
        unifiedUploadAPI.upload(file, invalidContext)
      ).rejects.toThrow(UnifiedUploadError);
      
      try {
        await unifiedUploadAPI.upload(file, invalidContext);
      } catch (error) {
        expect(error).toBeInstanceOf(UnifiedUploadError);
        expect((error as UnifiedUploadError).code).toBe('VALIDATION_FAILED');
        expect((error as UnifiedUploadError).retryable).toBe(false);
      }
    });

    test('should provide detailed error information', async () => {
      const file = createMockFile('error-test.jpg');
      const context = createTestContext();

      // Mock Service Error
      jest.spyOn(unifiedUploadAPI as any, 'executeSingleUpload').mockRejectedValueOnce(
        new Error('Network timeout')
      );

      try {
        await unifiedUploadAPI.upload(file, context);
      } catch (error) {
        expect(error).toBeInstanceOf(UnifiedUploadError);
        expect((error as UnifiedUploadError).message).toContain('Upload fehlgeschlagen');
        expect((error as UnifiedUploadError).originalError).toBeDefined();
      }
      
      // Cleanup
      jest.restoreAllMocks();
    });

    test('should handle context validation engine errors', async () => {
      const file = createMockFile('context-error-test.jpg');
      const context = createTestContext();

      // Mock Context Validation Engine Error
      jest.spyOn(contextValidationEngine, 'validateContext').mockRejectedValueOnce(
        new Error('Context validation service unavailable')
      );

      await expect(
        unifiedUploadAPI.upload(file, context)
      ).rejects.toThrow(UnifiedUploadError);
      
      // Cleanup
      jest.restoreAllMocks();
    });
  });

  describe('Timeout & Retry Logic', () => {
    
    test('should respect timeout options', async () => {
      const file = createMockFile('timeout-test.jpg');
      const context = createTestContext();
      const options: UnifiedUploadOptions = {
        timeoutMs: 1000, // 1 Sekunde
        maxRetries: 0
      };

      // Mock slow service
      jest.spyOn(unifiedUploadAPI as any, 'executeSingleUpload').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000)) // 2 Sekunden
      );

      const startTime = Date.now();
      
      try {
        await unifiedUploadAPI.upload(file, context, options);
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1500); // Sollte vor 1.5 Sekunden abbrechen
      }
      
      // Cleanup
      jest.restoreAllMocks();
    });
  });
});

// =====================
// CONVENIENCE FUNCTIONS TESTS
// =====================

describe('Convenience Functions', () => {
  
  describe('quickUpload()', () => {
    
    test('should provide simple upload interface', async () => {
      const file = createMockFile('quick-test.jpg');
      
      const result = await quickUpload(
        file,
        'test-org',
        'test-user',
        'media_library'
      );

      expect(result.success).toBe(true);
      expect(result.resolvedContext.organizationId).toBe('test-org');
      expect(result.resolvedContext.uploadTarget).toBe('media_library');
    });
  });

  describe('smartBatchUpload()', () => {
    
    test('should handle batch uploads with smart optimization', async () => {
      const files = [
        createMockFile('batch1.jpg'),
        createMockFile('batch2.png')
      ];

      const progressUpdates: Array<{ batchIndex: number; progress: any }> = [];
      
      const result = await smartBatchUpload(
        files,
        'test-org',
        'test-user',
        'project',
        (batchIndex, progress) => {
          progressUpdates.push({ batchIndex, progress });
        }
      );

      expect(result.totalFiles).toBe(2);
      expect(result.optimizationsSaved).toBeGreaterThanOrEqual(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });
});

// =====================
// INTEGRATION TEST SCENARIOS
// =====================

describe('End-to-End Integration Scenarios', () => {
  
  test('Complete Campaign Asset Upload Flow', async () => {
    // 1. Upload Hero Image
    const heroFile = createMockFile('hero-image.jpg', 3072, 'image/jpeg');
    const heroResult = await unifiedUploadAPI.uploadToCampaign([heroFile], {
      organizationId: 'test-org',
      userId: 'test-user',
      campaignId: 'campaign-integration-test',
      projectId: 'project-integration-test',
      uploadType: 'hero_image',
      contextSource: 'explicit' as const,
      contextTimestamp: Timestamp.now()
    });

    expect(heroResult.success).toBe(true);
    expect(heroResult.asset).toBeDefined();

    // 2. Upload Multiple Attachments
    const attachmentFiles = [
      createMockFile('brief.pdf', 2048, 'application/pdf'),
      createMockFile('guidelines.docx', 1536, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ];

    const attachmentResult = await unifiedUploadAPI.uploadToCampaign(attachmentFiles, {
      organizationId: 'test-org',
      userId: 'test-user',
      campaignId: 'campaign-integration-test',
      projectId: 'project-integration-test',
      uploadType: 'attachment',
      contextSource: 'explicit' as const,
      contextTimestamp: Timestamp.now()
    });

    expect(attachmentResult.success).toBe(true);
    expect(attachmentResult.assets).toHaveLength(2);

    // 3. Validate Complete Flow Performance
    expect(heroResult.performanceMetrics.totalDurationMs).toBeGreaterThan(0);
    expect(attachmentResult.performanceMetrics.totalDurationMs).toBeGreaterThan(0);
    
    // 4. Check Smart Router Usage
    expect(heroResult.smartRouterUsed || attachmentResult.smartRouterUsed).toBe(true);
  });

  test('Legacy Service Migration Compatibility', async () => {
    // Test nahtlose Migration von Legacy zu Unified API
    const file = createMockFile('migration-test.jpg');

    // 1. Legacy Upload via Wrapper
    const legacyResult = await legacyMediaService.uploadMedia(
      file,
      'test-org',
      'folder-123',
      undefined,
      3,
      { userId: 'test-user', clientId: 'client-456' }
    );

    // 2. Direct Unified API Upload
    const unifiedResult = await unifiedUploadAPI.upload(file, createTestContext({
      folderId: 'folder-123',
      clientId: 'client-456'
    }));

    // 3. Verify Compatibility
    expect(legacyResult.organizationId || legacyResult.userId).toBe('test-org');
    expect(unifiedResult.resolvedContext.organizationId).toBe('test-org');
    expect(legacyResult.fileName).toBe(file.name);
    expect(unifiedResult.asset?.fileName).toBe(file.name);
  });

  test('Performance Degradation Prevention', async () => {
    // Test mit vielen gleichzeitigen Uploads
    const numberOfFiles = 20;
    const files = new Array(numberOfFiles).fill(null).map((_, i) => 
      createMockFile(`performance-${i}.jpg`, 1024)
    );

    const startTime = Date.now();

    const result = await unifiedUploadAPI.upload(files, createTestContext({
      uploadTarget: 'media_library'
    }), {
      enableBatchOptimization: true,
      enableParallelProcessing: true
    });

    const duration = Date.now() - startTime;
    const averageTimePerFile = duration / numberOfFiles;

    expect(result.success).toBe(true);
    expect(result.assets).toHaveLength(numberOfFiles);
    expect(averageTimePerFile).toBeLessThan(1000); // < 1 Sekunde pro Datei im Durchschnitt
    expect(result.performanceMetrics.totalDurationMs).toBeLessThan(30000); // < 30 Sekunden total
  });
});

// =====================
// TEST CLEANUP
// =====================

afterAll(() => {
  // Cleanup any persistent state
  uploadPerformanceManager.destroy?.();
  jest.restoreAllMocks();
});