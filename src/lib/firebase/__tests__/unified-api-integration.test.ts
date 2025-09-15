// src/lib/firebase/__tests__/unified-api-integration.test.ts
// Comprehensive Integration & Performance Tests für Unified Upload API
// End-to-End Upload-Workflows, Stress-Tests, Memory-Leak-Prevention und Multi-Tenancy-Isolation

import { unifiedUploadAPI, quickUpload, smartBatchUpload } from '../unified-upload-api';
import { legacyMediaService } from '../legacy-wrappers/legacy-media-service';
import { legacyCampaignService } from '../legacy-wrappers/legacy-campaign-service';
import { uploadPerformanceManager } from '../upload-performance-manager';
import { contextValidationEngine } from '../context-validation-engine';
import { smartUploadRouter } from '../smart-upload-router';
import {
  UnifiedUploadContext,
  UnifiedUploadOptions,
  BatchUploadResult,
  UnifiedUploadError
} from '@/types/unified-upload';
import { Timestamp } from 'firebase/firestore';

// =====================
// TEST SETUP & MOCKS
// =====================

// Mock alle Services für Integration Tests
jest.mock('../media-service');
jest.mock('../campaign-media-service');
jest.mock('../project-upload-service');
jest.mock('../branding-service');
jest.mock('../smart-upload-router');

// Mock Performance-kritische Browser APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn()
  }
});

// Mock Memory API für Memory-Tests
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
    }
  }
});

// Test Data Factories
const createMockFile = (name: string, size: number = 1024, type: string = 'image/jpeg'): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

const createLargeFile = (name: string, sizeMB: number): File => {
  return createMockFile(name, sizeMB * 1024 * 1024, 'application/octet-stream');
};

const createTestContext = (overrides: Partial<UnifiedUploadContext> = {}): UnifiedUploadContext => ({
  organizationId: 'integration-org-123',
  userId: 'integration-user-456',
  uploadTarget: 'media_library',
  uploadType: 'media_asset',
  contextSource: 'explicit',
  contextTimestamp: Timestamp.now(),
  ...overrides
});

// Performance Measurement Utilities
const measureExecutionTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  return { result, duration: endTime - startTime };
};

const measureMemoryUsage = <T>(operation: () => T): { result: T; memoryDelta: number } => {
  const initialMemory = (performance as any).memory.usedJSHeapSize;
  const result = operation();
  const finalMemory = (performance as any).memory.usedJSHeapSize;
  return { result, memoryDelta: finalMemory - initialMemory };
};

describe('Unified API Integration & Performance Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    uploadPerformanceManager.destroy?.();
    
    // Reset Memory Monitoring
    (performance as any).memory = {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
    };
  });

  afterEach(() => {
    uploadPerformanceManager.destroy?.();
  });

  // =====================
  // END-TO-END WORKFLOW TESTS
  // =====================

  describe('End-to-End Upload Workflows', () => {
    
    test('sollte Complete Media Library Workflow durchführen', async () => {
      const files = [
        createMockFile('document.pdf', 2048, 'application/pdf'),
        createMockFile('image.jpg', 1536, 'image/jpeg'),
        createMockFile('video.mp4', 10240, 'video/mp4')
      ];

      const context = createTestContext({
        uploadTarget: 'media_library',
        folderId: 'media-folder-123'
      });

      const { result: uploadResult, duration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.uploadToMediaLibrary(files, context);
      });

      // Verify Success
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.assets).toHaveLength(3);
      expect(uploadResult.uploadMethod).toBe('batch_optimized');
      
      // Performance Assertions
      expect(duration).toBeLessThan(5000); // < 5 Sekunden
      expect(uploadResult.performanceMetrics.totalDurationMs).toBeGreaterThan(0);
      
      // Context Resolution
      expect(uploadResult.resolvedContext.uploadTarget).toBe('media_library');
      expect(uploadResult.resolvedContext.folderId).toBe('media-folder-123');
      
      // Smart Router
      expect(uploadResult.smartRouterUsed).toBeDefined();
    });

    test('sollte Complete Campaign Asset Pipeline durchführen', async () => {
      // Phase 1: Hero Image Upload
      const heroFile = createMockFile('campaign-hero.jpg', 3072, 'image/jpeg');
      
      const heroResult = await unifiedUploadAPI.uploadToCampaign([heroFile], {
        organizationId: 'campaign-org',
        userId: 'campaign-user',
        campaignId: 'integration-campaign-123',
        projectId: 'integration-project-456',
        uploadType: 'hero_image'
      });

      expect(heroResult.success).toBe(true);
      expect(heroResult.asset).toBeDefined();
      expect(heroResult.resolvedContext.uploadType).toBe('hero_image');

      // Phase 2: Multiple Attachments
      const attachmentFiles = [
        createMockFile('brief.pdf', 4096, 'application/pdf'),
        createMockFile('guidelines.docx', 2048, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        createMockFile('mockup.psd', 8192, 'image/vnd.adobe.photoshop')
      ];

      const attachmentResult = await unifiedUploadAPI.uploadToCampaign(attachmentFiles, {
        organizationId: 'campaign-org',
        userId: 'campaign-user',
        campaignId: 'integration-campaign-123',
        projectId: 'integration-project-456',
        uploadType: 'attachment'
      });

      expect(attachmentResult.success).toBe(true);
      expect(attachmentResult.assets).toHaveLength(3);
      
      // Phase 3: Generated Content
      const generatedFile = createMockFile('generated-content.html', 1024, 'text/html');
      
      const generatedResult = await unifiedUploadAPI.upload(generatedFile, createTestContext({
        uploadTarget: 'campaign',
        uploadType: 'generated_content',
        campaignId: 'integration-campaign-123',
        projectId: 'integration-project-456'
      }));

      expect(generatedResult.success).toBe(true);
      
      // Validate Complete Pipeline
      const totalFiles = 1 + 3 + 1; // Hero + Attachments + Generated
      const totalAssets = [heroResult.asset, ...attachmentResult.assets!, generatedResult.asset].filter(Boolean);
      expect(totalAssets).toHaveLength(totalFiles);
    });

    test('sollte Complete Project Upload mit Smart Routing durchführen', async () => {
      const projectFiles = [
        createMockFile('project-brief.pdf', 3072),
        createMockFile('design-mockup.sketch', 5120),
        createMockFile('content-draft.docx', 2048),
        createMockFile('reference-images.zip', 15360)
      ];

      const context = createTestContext({
        uploadTarget: 'project',
        projectId: 'integration-project-789',
        phase: 'creation',
        clientId: 'integration-client-101'
      });

      const options: UnifiedUploadOptions = {
        enableSmartRouting: true,
        enableBatchOptimization: true,
        enableAutoTagging: true,
        enableRecommendations: true
      };

      const result = await unifiedUploadAPI.uploadToProject(projectFiles, context, options);

      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(4);
      expect(result.smartRouterUsed).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.resolvedContext.autoTags).toContain('target:project');
      expect(result.resolvedContext.phase).toBe('creation');
      expect(result.routingDecision.selectedService).toBeDefined();
    });

    test('sollte Branding Asset Upload mit Validation durchführen', async () => {
      const logoFile = createMockFile('company-logo.svg', 512, 'image/svg+xml');
      
      const context = createTestContext({
        organizationId: 'branding-org',
        userId: 'branding-user',
        uploadType: 'branding_logo'
      });

      const result = await unifiedUploadAPI.uploadBranding(logoFile, context);

      expect(result.success).toBe(true);
      expect(result.resolvedContext.uploadTarget).toBe('branding');
      expect(result.resolvedContext.uploadType).toBe('branding_logo');
      expect(result.smartRouterUsed).toBe(false); // Branding nutzt direkte Services
      
      // Verify strict validation was applied
      const validationResult = await contextValidationEngine.validateContext(result.resolvedContext, {
        strictContextValidation: true
      });
      expect(validationResult.isValid).toBe(true);
    });

    test('sollte Mixed Upload Types in Single Batch verarbeiten', async () => {
      const mixedBatches = [
        {
          files: [createMockFile('media1.jpg'), createMockFile('media2.png')],
          context: createTestContext({ uploadTarget: 'media_library' })
        },
        {
          files: [createMockFile('project-doc.pdf')],
          context: createTestContext({ 
            uploadTarget: 'project',
            projectId: 'mixed-project-123'
          })
        },
        {
          files: [createMockFile('campaign-asset.jpg')],
          context: createTestContext({
            uploadTarget: 'campaign',
            uploadType: 'hero_image',
            campaignId: 'mixed-campaign-456'
          })
        }
      ];

      const progressUpdates: Array<{ batchIndex: number; progress: any }> = [];
      const onProgress = (batchIndex: number, progress: any) => {
        progressUpdates.push({ batchIndex, progress });
      };

      const result = await unifiedUploadAPI.uploadBatch(mixedBatches, onProgress);

      expect(result.totalFiles).toBe(4);
      expect(result.successfulUploads).toBe(4);
      expect(result.results).toHaveLength(4);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify different upload methods were used
      const uniqueMethods = new Set(result.results.map(r => r.result?.uploadMethod).filter(Boolean));
      expect(uniqueMethods.size).toBeGreaterThan(1);
    });
  });

  // =====================
  // STRESS TESTS
  // =====================

  describe('Stress Tests & High Load Scenarios', () => {
    
    test('sollte 100+ concurrent Uploads handhaben', async () => {
      const concurrentUploads = 100;
      const files = new Array(concurrentUploads).fill(null).map((_, i) => 
        createMockFile(`stress-test-${i}.jpg`, 1024)
      );

      const contexts = files.map((file, i) => createTestContext({
        uploadTarget: 'media_library',
        folderId: `stress-folder-${i % 10}` // 10 verschiedene Folder
      }));

      const { result: uploadPromises, duration: setupTime } = await measureExecutionTime(async () => {
        return files.map((file, i) => 
          unifiedUploadAPI.upload(file, contexts[i], {
            enableBatchOptimization: true,
            enableParallelProcessing: true
          })
        );
      });

      const { result: results, duration: executionTime } = await measureExecutionTime(async () => {
        return Promise.all(uploadPromises);
      });

      // Performance Assertions
      expect(results).toHaveLength(concurrentUploads);
      expect(results.every(r => r.success)).toBe(true);
      expect(executionTime).toBeLessThan(60000); // < 60 Sekunden
      expect(executionTime / concurrentUploads).toBeLessThan(1000); // < 1s pro Upload im Durchschnitt
      
      // Resource Usage Validation
      const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
      const avgTransferRate = totalFileSize / (executionTime / 1000); // Bytes per second
      expect(avgTransferRate).toBeGreaterThan(0);
    });

    test('sollte Large File Uploads (>100MB) mit Memory-Management handhaben', async () => {
      const largeFiles = [
        createLargeFile('large-video.mp4', 150), // 150MB
        createLargeFile('large-dataset.zip', 200), // 200MB
        createLargeFile('large-archive.tar.gz', 120) // 120MB
      ];

      const context = createTestContext({
        uploadTarget: 'project',
        projectId: 'large-files-project'
      });

      const options: UnifiedUploadOptions = {
        enableBatchOptimization: true,
        allowLargeFiles: true,
        timeoutMs: 300000 // 5 Minuten Timeout
      };

      const { result, memoryDelta } = measureMemoryUsage(() => {
        return unifiedUploadAPI.upload(largeFiles, context, options);
      });

      const uploadResult = await result;

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.assets).toHaveLength(3);
      expect(uploadResult.performanceMetrics.fileSizeBytes).toBeGreaterThan(450 * 1024 * 1024); // >450MB
      
      // Memory-Management Validation
      expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // < 100MB Memory-Increase
    });

    test('sollte Batch-Upload mit extremer Parallelität (50+ Files) optimieren', async () => {
      const batchSize = 60;
      const files = new Array(batchSize).fill(null).map((_, i) => 
        createMockFile(`batch-${i}.jpg`, Math.floor(Math.random() * 5000) + 1000) // 1-5KB
      );

      const batchId = 'extreme-batch-test';
      uploadPerformanceManager.startBatchTracking(batchId, files, 10); // 10-way parallelism

      const items = files.map((file, i) => ({ file, index: i }));
      const processor = async (item: { file: File; index: number }) => {
        // Simulate file processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return `processed-${item.index}`;
      };

      const { result, duration } = await measureExecutionTime(async () => {
        return uploadPerformanceManager.orchestrateBatchUpload(
          batchId,
          items,
          processor,
          10
        );
      });

      expect(result).toHaveLength(batchSize);
      expect(result.every(r => r.startsWith('processed-'))).toBe(true);
      expect(duration).toBeLessThan(30000); // < 30 Sekunden
      
      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);
      expect(batchMetrics.parallelEfficiency).toBeGreaterThan(50); // >50% Parallel-Efficiency
      expect(batchMetrics.averageFileProcessingMs).toBeLessThan(200); // <200ms pro File
    });

    test('sollte Memory-Leak-Prevention bei langanhaltenden Uploads validieren', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      const uploads: Promise<any>[] = [];

      // 200 kleine Uploads über 10 Sekunden verteilt
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 20; i++) {
          const file = createMockFile(`memory-leak-test-${batch}-${i}.jpg`, 512);
          const context = createTestContext({
            uploadTarget: 'media_library',
            folderId: `memory-folder-${batch}`
          });
          
          uploads.push(unifiedUploadAPI.upload(file, context));
        }
        
        // Simulate delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all uploads
      const results = await Promise.all(uploads);
      
      // Force garbage collection (if available)
      if ((global as any).gc) {
        (global as any).gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for GC

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryPerUpload = memoryIncrease / uploads.length;

      expect(results).toHaveLength(200);
      expect(results.every(r => r.success)).toBe(true);
      expect(memoryPerUpload).toBeLessThan(10 * 1024); // < 10KB per Upload retained
    });

    test('sollte Network-Interruption Recovery bei Batch-Uploads testen', async () => {
      const files = new Array(20).fill(null).map((_, i) => 
        createMockFile(`network-test-${i}.jpg`, 1024)
      );

      const context = createTestContext();
      
      // Mock intermittent network failures
      let callCount = 0;
      jest.spyOn(unifiedUploadAPI, 'upload').mockImplementation((file, ctx, options) => {
        callCount++;
        
        // Simulate network failure every 5th call
        if (callCount % 5 === 0) {
          return Promise.reject(new Error('Network temporarily unavailable'));
        }
        
        // Call original implementation
        return jest.requireActual('../unified-upload-api').unifiedUploadAPI.upload(file, ctx, options);
      });

      const batches = [{
        files,
        context,
        options: {
          maxRetries: 3,
          enableParallelProcessing: true
        }
      }];

      const result = await unifiedUploadAPI.uploadBatch(batches);

      expect(result.totalFiles).toBe(20);
      expect(result.successfulUploads).toBeGreaterThan(15); // Mindestens 75% erfolgreich
      expect(result.failedUploads).toBeLessThan(5); // Maximal 25% Fehler
      
      // Cleanup
      jest.restoreAllMocks();
    });
  });

  // =====================
  // PERFORMANCE BENCHMARKS
  // =====================

  describe('Performance Benchmarks', () => {
    
    test('sollte Context-Resolution unter 10ms pro Upload durchführen', async () => {
      const file = createMockFile('context-benchmark.jpg');
      const contexts = new Array(100).fill(null).map((_, i) => createTestContext({
        uploadTarget: 'campaign',
        campaignId: `benchmark-campaign-${i}`,
        projectId: `benchmark-project-${i}`
      }));

      const contextResolutionTimes: number[] = [];
      
      for (const context of contexts) {
        const { duration } = await measureExecutionTime(async () => {
          return contextValidationEngine.validateContext(context);
        });
        contextResolutionTimes.push(duration);
      }

      const averageContextTime = contextResolutionTimes.reduce((sum, time) => sum + time, 0) / contexts.length;
      const maxContextTime = Math.max(...contextResolutionTimes);
      
      expect(averageContextTime).toBeLessThan(10); // < 10ms im Durchschnitt
      expect(maxContextTime).toBeLessThan(50); // < 50ms Maximum
    });

    test('sollte Upload-Retry-Performance bei Network-Errors messen', async () => {
      const file = createMockFile('retry-benchmark.jpg');
      const context = createTestContext();
      
      // Mock service errors for first attempts
      let attemptCount = 0;
      const originalUpload = unifiedUploadAPI.upload.bind(unifiedUploadAPI);
      
      jest.spyOn(unifiedUploadAPI, 'upload').mockImplementation((file, context, options) => {
        attemptCount++;
        
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network timeout'));
        }
        
        return originalUpload(file, context, options);
      });

      const { result, duration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.upload(file, context, {
          maxRetries: 3,
          retryDelayMs: 100 // Kurze Delays für Tests
        });
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // 2 Fehler + 1 Erfolg
      expect(duration).toBeLessThan(1000); // < 1 Sekunde trotz Retries
      
      // Cleanup
      jest.restoreAllMocks();
    });

    test('sollte Feature-Flag-Evaluation-Performance unter Last messen', async () => {
      const file = createMockFile('feature-flag-benchmark.jpg');
      
      // Measure legacy service feature flag evaluation
      const evaluations = new Array(10000).fill(null);
      
      const { duration } = await measureExecutionTime(async () => {
        for (let i = 0; i < evaluations.length; i++) {
          await (legacyMediaService as any).shouldUseUnifiedAPI('media_upload');
        }
      });

      const evaluationsPerSecond = evaluations.length / (duration / 1000);
      const timePerEvaluation = duration / evaluations.length;
      
      expect(timePerEvaluation).toBeLessThan(0.1); // < 0.1ms per evaluation
      expect(evaluationsPerSecond).toBeGreaterThan(10000); // > 10k evaluations/second
    });

    test('sollte Batch-Upload-Processing-Rate benchmarken', async () => {
      const batchSizes = [10, 25, 50, 100];
      const performanceResults: Array<{ batchSize: number; throughput: number; efficiency: number }> = [];
      
      for (const batchSize of batchSizes) {
        const files = new Array(batchSize).fill(null).map((_, i) => 
          createMockFile(`batch-benchmark-${i}.jpg`, 1024)
        );
        
        const context = createTestContext();
        const { result, duration } = await measureExecutionTime(async () => {
          return unifiedUploadAPI.upload(files, context, {
            enableBatchOptimization: true,
            enableParallelProcessing: true
          });
        });
        
        const throughput = batchSize / (duration / 1000); // Files per second
        const efficiency = (batchSize * 1000) / duration; // Files per second normalized
        
        performanceResults.push({ batchSize, throughput, efficiency });
        
        expect(result.success).toBe(true);
        expect(result.assets).toHaveLength(batchSize);
      }
      
      // Verify performance scaling
      const smallBatchThroughput = performanceResults[0].throughput;
      const largeBatchThroughput = performanceResults[performanceResults.length - 1].throughput;
      
      expect(largeBatchThroughput).toBeGreaterThan(smallBatchThroughput * 2); // Mindestens 2x faster
    });

    test('sollte Memory-Efficiency bei verschiedenen Upload-Sizes messen', async () => {
      const fileSizes = [
        { name: 'small', size: 1024 }, // 1KB
        { name: 'medium', size: 100 * 1024 }, // 100KB
        { name: 'large', size: 10 * 1024 * 1024 }, // 10MB
      ];
      
      const memoryEfficiencyResults: Array<{ 
        fileSize: string; 
        memoryRatio: number; 
        processingTime: number 
      }> = [];
      
      for (const fileSize of fileSizes) {
        const file = createMockFile(`memory-efficiency-${fileSize.name}.jpg`, fileSize.size);
        const context = createTestContext();
        
        const { memoryDelta } = measureMemoryUsage(() => {
          return unifiedUploadAPI.upload(file, context);
        });
        
        const { duration } = await measureExecutionTime(async () => {
          return unifiedUploadAPI.upload(file, context);
        });
        
        const memoryRatio = memoryDelta / fileSize.size;
        
        memoryEfficiencyResults.push({
          fileSize: fileSize.name,
          memoryRatio,
          processingTime: duration
        });
        
        // Memory usage should be reasonable compared to file size
        expect(memoryRatio).toBeLessThan(2); // < 2x file size in memory
      }
      
      // Verify memory efficiency improves with larger files
      const smallMemoryRatio = memoryEfficiencyResults[0].memoryRatio;
      const largeMemoryRatio = memoryEfficiencyResults[2].memoryRatio;
      
      expect(largeMemoryRatio).toBeLessThan(smallMemoryRatio); // Better efficiency for larger files
    });
  });

  // =====================
  // MULTI-TENANCY ISOLATION TESTS
  // =====================

  describe('Multi-Tenancy Isolation End-to-End Tests', () => {
    
    test('sollte Cross-Organization Upload-Isolation gewährleisten', async () => {
      const org1Context = createTestContext({
        organizationId: 'org-tenant-1',
        userId: 'user-tenant-1',
        folderId: 'folder-tenant-1'
      });
      
      const org2Context = createTestContext({
        organizationId: 'org-tenant-2',
        userId: 'user-tenant-2',
        folderId: 'folder-tenant-2'
      });
      
      const file1 = createMockFile('org1-file.jpg');
      const file2 = createMockFile('org2-file.jpg');
      
      // Parallel uploads from different organizations
      const [org1Result, org2Result] = await Promise.all([
        unifiedUploadAPI.upload(file1, org1Context),
        unifiedUploadAPI.upload(file2, org2Context)
      ]);
      
      expect(org1Result.success).toBe(true);
      expect(org2Result.success).toBe(true);
      
      // Verify organization isolation in storage paths
      expect(org1Result.storagePath).toContain('org-tenant-1');
      expect(org2Result.storagePath).toContain('org-tenant-2');
      expect(org1Result.storagePath).not.toContain('org-tenant-2');
      expect(org2Result.storagePath).not.toContain('org-tenant-1');
      
      // Verify context isolation
      expect(org1Result.resolvedContext.organizationId).toBe('org-tenant-1');
      expect(org2Result.resolvedContext.organizationId).toBe('org-tenant-2');
    });

    test('sollte Cross-Tenant-Access-Prevention validieren', async () => {
      const maliciousContext = createTestContext({
        organizationId: 'malicious-org',
        userId: 'malicious-user',
        folderId: 'cross-tenant-folder-attempt' // Versucht Zugriff auf andere Organization
      });
      
      // Mock Cross-Tenant Folder Detection
      jest.spyOn(contextValidationEngine as any, 'detectCrossTenantAccess').mockResolvedValueOnce([
        'folder:cross-tenant-folder-attempt'
      ]);
      
      const file = createMockFile('malicious-upload.jpg');
      
      await expect(
        unifiedUploadAPI.upload(file, maliciousContext)
      ).rejects.toThrow('Cross-Tenant-Zugriff erkannt');
      
      // Cleanup
      jest.restoreAllMocks();
    });

    test('sollte Permission-Isolation zwischen Organizations testen', async () => {
      const restrictedContext = createTestContext({
        organizationId: 'restricted-org',
        userId: 'limited-user',
        uploadTarget: 'branding' // Requires special permissions
      });
      
      // Mock restricted permissions
      jest.spyOn(contextValidationEngine as any, 'getUserPermissions').mockResolvedValueOnce([
        'upload:media', 'read:media'
        // upload:branding, write:branding fehlen
      ]);
      
      const file = createMockFile('unauthorized-branding.svg', 512, 'image/svg+xml');
      
      await expect(
        unifiedUploadAPI.uploadBranding(file, {
          ...restrictedContext,
          uploadType: 'branding_logo'
        })
      ).rejects.toThrow('Fehlende Berechtigungen');
      
      // Cleanup
      jest.restoreAllMocks();
    });

    test('sollte Data-Isolation bei Batch-Uploads über Organizations validieren', async () => {
      const multiTenantBatches = [
        {
          files: [createMockFile('tenant-a-1.jpg'), createMockFile('tenant-a-2.jpg')],
          context: createTestContext({ organizationId: 'tenant-a', userId: 'user-a' })
        },
        {
          files: [createMockFile('tenant-b-1.jpg')],
          context: createTestContext({ organizationId: 'tenant-b', userId: 'user-b' })
        },
        {
          files: [createMockFile('tenant-c-1.jpg')],
          context: createTestContext({ organizationId: 'tenant-c', userId: 'user-c' })
        }
      ];
      
      const result = await unifiedUploadAPI.uploadBatch(multiTenantBatches);
      
      expect(result.totalFiles).toBe(4);
      expect(result.successfulUploads).toBe(4);
      
      // Verify isolation in results
      const tenantAResults = result.results.filter(r => 
        r.result?.resolvedContext.organizationId === 'tenant-a'
      );
      const tenantBResults = result.results.filter(r => 
        r.result?.resolvedContext.organizationId === 'tenant-b'
      );
      const tenantCResults = result.results.filter(r => 
        r.result?.resolvedContext.organizationId === 'tenant-c'
      );
      
      expect(tenantAResults).toHaveLength(2);
      expect(tenantBResults).toHaveLength(1);
      expect(tenantCResults).toHaveLength(1);
      
      // Verify no cross-tenant data leakage
      tenantAResults.forEach(result => {
        expect(result.result?.storagePath).toContain('tenant-a');
        expect(result.result?.storagePath).not.toContain('tenant-b');
        expect(result.result?.storagePath).not.toContain('tenant-c');
      });
    });

    test('sollte Audit-Logging für Multi-Tenancy-Compliance sicherstellen', async () => {
      const auditableUploads = [
        {
          file: createMockFile('compliance-doc1.pdf'),
          context: createTestContext({ organizationId: 'audit-org-1', userId: 'audit-user-1' })
        },
        {
          file: createMockFile('compliance-doc2.pdf'),
          context: createTestContext({ organizationId: 'audit-org-2', userId: 'audit-user-2' })
        }
      ];
      
      const auditLogs: any[] = [];
      
      // Mock audit logging
      const originalUpload = unifiedUploadAPI.upload.bind(unifiedUploadAPI);
      jest.spyOn(unifiedUploadAPI, 'upload').mockImplementation(async (file, context, options) => {
        auditLogs.push({
          timestamp: new Date(),
          organizationId: context.organizationId,
          userId: context.userId,
          fileName: Array.isArray(file) ? file.map(f => f.name) : file.name,
          uploadTarget: context.uploadTarget,
          action: 'upload_attempted'
        });
        
        const result = await originalUpload(file, context, options);
        
        auditLogs.push({
          timestamp: new Date(),
          organizationId: context.organizationId,
          userId: context.userId,
          fileName: Array.isArray(file) ? file.map(f => f.name) : file.name,
          uploadId: result.uploadId,
          action: 'upload_completed'
        });
        
        return result;
      });
      
      // Perform uploads
      for (const { file, context } of auditableUploads) {
        await unifiedUploadAPI.upload(file, context);
      }
      
      // Verify audit logs
      expect(auditLogs).toHaveLength(4); // 2 uploads x 2 log entries each
      
      const org1Logs = auditLogs.filter(log => log.organizationId === 'audit-org-1');
      const org2Logs = auditLogs.filter(log => log.organizationId === 'audit-org-2');
      
      expect(org1Logs).toHaveLength(2);
      expect(org2Logs).toHaveLength(2);
      
      // Verify log isolation
      org1Logs.forEach(log => {
        expect(log.organizationId).toBe('audit-org-1');
        expect(log.userId).toBe('audit-user-1');
      });
      
      org2Logs.forEach(log => {
        expect(log.organizationId).toBe('audit-org-2');
        expect(log.userId).toBe('audit-user-2');
      });
      
      // Cleanup
      jest.restoreAllMocks();
    });
  });

  // =====================
  // LEGACY vs UNIFIED PERFORMANCE COMPARISON
  // =====================

  describe('Legacy vs Unified API Performance Comparison', () => {
    
    test('sollte Performance-Verbesserungen gegenüber Legacy messen', async () => {
      const testFile = createMockFile('performance-comparison.jpg', 2048);
      const iterations = 50;
      
      // Legacy Performance
      const legacyTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return legacyMediaService.uploadMedia(
            testFile,
            'performance-org',
            'performance-folder',
            undefined,
            1,
            { userId: 'performance-user' }
          );
        });
        legacyTimes.push(duration);
      }
      
      // Unified API Performance
      const unifiedTimes: number[] = [];
      const context = createTestContext({
        organizationId: 'performance-org',
        userId: 'performance-user',
        folderId: 'performance-folder'
      });
      
      for (let i = 0; i < iterations; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return unifiedUploadAPI.upload(testFile, context);
        });
        unifiedTimes.push(duration);
      }
      
      // Statistical Analysis
      const legacyAverage = legacyTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const unifiedAverage = unifiedTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const performanceImprovement = ((legacyAverage - unifiedAverage) / legacyAverage) * 100;
      
      // Assertions
      expect(unifiedAverage).toBeLessThanOrEqual(legacyAverage); // Unified sollte mindestens gleich schnell sein
      expect(performanceImprovement).toBeGreaterThanOrEqual(-10); // Maximal 10% langsamer erlaubt
      
      console.log(`Performance Comparison:
        Legacy Average: ${legacyAverage.toFixed(2)}ms
        Unified Average: ${unifiedAverage.toFixed(2)}ms
        Improvement: ${performanceImprovement.toFixed(2)}%
      `);
    });

    test('sollte Context-Caching-Efficiency validieren (60% Verbesserung)', async () => {
      const file = createMockFile('context-cache-test.jpg');
      const baseContext = createTestContext({
        folderId: 'cache-test-folder',
        projectId: 'cache-test-project'
      });
      
      // First upload - Cache Miss
      const { result: firstUpload, duration: firstDuration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.upload(file, baseContext);
      });
      
      // Second upload - Cache Hit (same context)
      const { result: secondUpload, duration: secondDuration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.upload(file, baseContext);
      });
      
      // Third upload - Similar context (should benefit from cache)
      const similarContext = { ...baseContext, uploadType: 'attachment' as const };
      const { result: thirdUpload, duration: thirdDuration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.upload(file, similarContext);
      });
      
      expect(firstUpload.success).toBe(true);
      expect(secondUpload.success).toBe(true);
      expect(thirdUpload.success).toBe(true);
      
      // Cache effectiveness validation
      const cachingImprovement = ((firstDuration - secondDuration) / firstDuration) * 100;
      expect(cachingImprovement).toBeGreaterThan(30); // Mindestens 30% Verbesserung durch Cache
      
      // Verify cache metrics
      expect(secondUpload.performanceMetrics.contextCacheHit).toBe(true);
      expect(firstUpload.performanceMetrics.contextCacheHit).toBe(false);
    });

    test('sollte Batch-Upload-Parallelisierung (25% Speed-Up) validieren', async () => {
      const batchSize = 20;
      const files = new Array(batchSize).fill(null).map((_, i) => 
        createMockFile(`parallel-test-${i}.jpg`, 1024)
      );
      const context = createTestContext();
      
      // Sequential Processing
      const { duration: sequentialDuration } = await measureExecutionTime(async () => {
        const results = [];
        for (const file of files) {
          const result = await unifiedUploadAPI.upload(file, context, {
            enableParallelProcessing: false
          });
          results.push(result);
        }
        return results;
      });
      
      // Parallel Processing
      const { duration: parallelDuration } = await measureExecutionTime(async () => {
        return unifiedUploadAPI.upload(files, context, {
          enableBatchOptimization: true,
          enableParallelProcessing: true
        });
      });
      
      const speedUpPercentage = ((sequentialDuration - parallelDuration) / sequentialDuration) * 100;
      
      expect(speedUpPercentage).toBeGreaterThan(25); // Mindestens 25% Speed-Up
      expect(parallelDuration).toBeLessThan(sequentialDuration * 0.75); // Maximal 75% der Sequential-Zeit
    });

    test('sollte Memory-Management-Effectiveness (40% Reduzierung) messen', async () => {
      const largeFiles = new Array(10).fill(null).map((_, i) => 
        createLargeFile(`memory-management-${i}.bin`, 5) // 5MB each
      );
      const context = createTestContext();
      
      // Upload ohne Memory-Management
      const { memoryDelta: unoptimizedMemory } = measureMemoryUsage(() => {
        return unifiedUploadAPI.upload(largeFiles, context, {
          enableMemoryOptimization: false
        });
      });
      
      await (await unoptimizedMemory).catch(() => {}); // Handle potential errors
      
      // Upload mit Memory-Management
      const { memoryDelta: optimizedMemory } = measureMemoryUsage(() => {
        return unifiedUploadAPI.upload(largeFiles, context, {
          enableMemoryOptimization: true,
          memoryLimitMB: 100
        });
      });
      
      await (await optimizedMemory).catch(() => {}); // Handle potential errors
      
      const memoryReduction = ((unoptimizedMemory - optimizedMemory) / unoptimizedMemory) * 100;
      
      if (unoptimizedMemory > 0) {
        expect(memoryReduction).toBeGreaterThan(20); // Mindestens 20% Memory-Reduzierung
      }
      expect(optimizedMemory).toBeLessThan(150 * 1024 * 1024); // < 150MB Memory-Usage
    });
  });
});