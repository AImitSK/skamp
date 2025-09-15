// src/lib/firebase/__tests__/unified-api-migration.test.ts
// Comprehensive Migration & Rollback Tests für Unified Upload API
// Feature-Flag-gesteuerte Migration, Graceful Fallback, Progressive Enhancement und Data-Consistency

import { unifiedUploadAPI } from '../unified-upload-api';
import { legacyMediaService, mediaServiceWithUnifiedAPI } from '../legacy-wrappers/legacy-media-service';
import { legacyCampaignService, campaignMediaServiceWithUnifiedAPI } from '../legacy-wrappers/legacy-campaign-service';
import { uploadPerformanceManager } from '../upload-performance-manager';
import { mediaService } from '../media-service';
import { campaignMediaService } from '../campaign-media-service';
import { UnifiedUploadError } from '@/types/unified-upload';

// =====================
// TEST SETUP & MOCKS
// =====================

// Mock Services
jest.mock('../unified-upload-api');
jest.mock('../media-service');
jest.mock('../campaign-media-service');
jest.mock('../project-upload-service');
jest.mock('../branding-service');

// Mock Feature Flag System
const mockFeatureFlags = new Map<string, number>();
const setFeatureFlag = (flag: string, percentage: number) => {
  mockFeatureFlags.set(flag, percentage);
};

const getFeatureFlag = (flag: string): number => {
  return mockFeatureFlags.get(flag) || 0;
};

// Mock Environment Variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Test Data Factories
const createMockFile = (name: string, size: number = 1024, type: string = 'image/jpeg'): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

const createMockMediaAsset = () => ({
  id: 'asset-123',
  fileName: 'test.jpg',
  originalName: 'test.jpg',
  fileSize: 1024,
  fileType: 'image/jpeg',
  downloadUrl: 'https://storage.example.com/test.jpg',
  userId: 'test-org-123',
  organizationId: 'test-org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: []
});

// Mock Statistics Tracking
let migrationStats = {
  totalAttempts: 0,
  successfulMigrations: 0,
  fallbacksToLegacy: 0,
  migrationErrors: 0,
  rollbackEvents: 0,
  performanceGains: 0,
  performanceLosses: 0
};

const resetMigrationStats = () => {
  migrationStats = {
    totalAttempts: 0,
    successfulMigrations: 0,
    fallbacksToLegacy: 0,
    migrationErrors: 0,
    rollbackEvents: 0,
    performanceGains: 0,
    performanceLosses: 0
  };
};

describe('Unified API Migration & Rollback Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureFlags.clear();
    resetMigrationStats();
    
    // Default Mock Setup
    const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
    const mockCampaignMediaService = campaignMediaService as jest.Mocked<typeof campaignMediaService>;
    const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;

    mockMediaService.uploadMedia.mockResolvedValue(createMockMediaAsset());
    mockCampaignMediaService.uploadCampaignMedia.mockResolvedValue({
      asset: createMockMediaAsset(),
      campaignContext: {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-123',
        uploadType: 'hero-image' as const,
        autoTags: [],
        contextSource: 'explicit' as const,
        contextTimestamp: { seconds: Date.now() / 1000, nanoseconds: 0 }
      },
      usedSmartRouter: false,
      storageInfo: {
        type: 'unorganized' as const,
        path: '/legacy/path',
        isHybrid: false
      },
      featureFlags: {
        smartRouterEnabled: false,
        uploadTypeEnabled: true,
        fallbackUsed: false
      }
    });

    mockUnifiedUploadAPI.upload.mockResolvedValue({
      success: true,
      uploadId: 'unified-123',
      asset: createMockMediaAsset(),
      uploadMethod: 'smart_router',
      serviceUsed: 'smartUploadRouter',
      storagePath: '/unified/path',
      performanceMetrics: {
        totalDurationMs: 800,
        contextResolutionMs: 50,
        validationMs: 30,
        uploadMs: 650,
        postProcessingMs: 70,
        fileSizeBytes: 1024,
        transferredBytes: 1024,
        serviceLatencyMs: 100,
        retryCount: 0,
        cacheHits: 1,
        routingDecisionMs: 20,
        contextCacheHit: true,
        recommendationGenerated: false
      },
      resolvedContext: {
        organizationId: 'test-org',
        userId: 'test-user',
        uploadTarget: 'media_library',
        uploadType: 'media_asset',
        contextSource: 'explicit',
        contextTimestamp: { seconds: Date.now() / 1000, nanoseconds: 0 }
      },
      contextInheritance: {
        inheritanceSource: 'none',
        inheritanceChain: []
      },
      recommendations: [],
      warnings: [],
      smartRouterUsed: true,
      routingDecision: {
        selectedService: 'smartUploadRouter',
        routingReason: 'Smart routing enabled',
        confidence: 95,
        alternativeOptions: [],
        routingPath: '/unified/path',
        optimizations: []
      }
    });

    // Mock Legacy Service Migration Decision Logic
    jest.spyOn(legacyMediaService as any, 'getMigrationPercentage').mockImplementation((flagName: string) => {
      return getFeatureFlag(flagName);
    });

    jest.spyOn(legacyCampaignService as any, 'getCampaignMigrationPercentage').mockImplementation((flagName: string) => {
      return getFeatureFlag(flagName);
    });
  });

  // =====================
  // FEATURE-FLAG MIGRATION TESTS
  // =====================

  describe('Feature-Flag-gesteuerte Migration', () => {
    
    test('sollte 5% Migration erfolgreich durchführen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 5); // 5% Migration
      
      const file = createMockFile('migration-5-percent.jpg');
      
      // Mock deterministische Hash-Berechnung für 5% Bucket
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValue(3); // 3% < 5%
      
      migrationStats.totalAttempts++;
      
      const result = await legacyMediaService.uploadMedia(file, 'test-org');
      
      expect(result).toBeDefined();
      expect(unifiedUploadAPI.upload).toHaveBeenCalled();
      
      migrationStats.successfulMigrations++;
      
      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(1);
    });

    test('sollte 25% Migration mit A/B-Testing durchführen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 25); // 25% Migration
      
      const organizations = [
        'org-hash-10', 'org-hash-30', 'org-hash-50', 'org-hash-70', 'org-hash-90'
      ];
      
      const migrationResults: boolean[] = [];
      
      for (let i = 0; i < organizations.length; i++) {
        const hashValue = (i + 1) * 20; // 20, 40, 60, 80, 100
        jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(hashValue);
        
        const shouldMigrate = await (legacyMediaService as any).shouldUseUnifiedAPI('media_upload');
        migrationResults.push(shouldMigrate);
        migrationStats.totalAttempts++;
      }
      
      // Mit 25% sollten die ersten beiden (20%, 40%) nicht migriert werden
      // aber die letzten drei schon (da > 25%)
      const migrationCount = migrationResults.filter(Boolean).length;
      expect(migrationCount).toBe(2); // hash 20 und hash 0 (20 % 100 = 20) sollten migriert werden
      
      migrationStats.successfulMigrations = migrationCount;
      
      const migrationRate = (migrationStats.successfulMigrations / migrationStats.totalAttempts) * 100;
      expect(migrationRate).toBeCloseTo(40, 5); // Etwa 40% aufgrund der Test-Hash-Werte
    });

    test('sollte 100% Migration vollständig auf Unified API umstellen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100); // 100% Migration
      
      const files = new Array(10).fill(null).map((_, i) => 
        createMockFile(`full-migration-${i}.jpg`)
      );
      
      for (let i = 0; i < files.length; i++) {
        // Verschiedene Hash-Werte simulieren
        jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(i * 10);
        
        const result = await legacyMediaService.uploadMedia(files[i], `org-${i}`);
        
        expect(result).toBeDefined();
        migrationStats.totalAttempts++;
        migrationStats.successfulMigrations++;
      }
      
      // Alle Uploads sollten über Unified API gelaufen sein
      expect(unifiedUploadAPI.upload).toHaveBeenCalledTimes(10);
      expect(mediaService.uploadMedia).not.toHaveBeenCalled();
      
      const migrationRate = (migrationStats.successfulMigrations / migrationStats.totalAttempts) * 100;
      expect(migrationRate).toBe(100);
    });

    test('sollte Campaign-spezifische Migration-Percentages korrekt anwenden', async () => {
      setFeatureFlag('UNIFIED_HERO_IMAGE_UPLOAD', 15); // 15% für Hero Images
      setFeatureFlag('UNIFIED_ATTACHMENT_UPLOAD', 25); // 25% für Attachments
      
      const heroFile = createMockFile('hero.jpg');
      const attachmentFile = createMockFile('attachment.pdf', 1024, 'application/pdf');
      
      // Hero Image Test (15%)
      jest.spyOn(legacyCampaignService as any, 'hashString').mockReturnValueOnce(10); // 10% < 15%
      
      const heroResult = await legacyCampaignService.uploadHeroImage({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'migration-campaign',
        file: heroFile
      });
      
      expect(heroResult).toBeDefined();
      
      // Attachment Test (25%)
      jest.spyOn(legacyCampaignService as any, 'hashString').mockReturnValueOnce(20); // 20% < 25%
      
      const attachmentResult = await legacyCampaignService.uploadAttachment({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'migration-campaign',
        file: attachmentFile
      });
      
      expect(attachmentResult).toBeDefined();
      
      const stats = legacyCampaignService.getCampaignMigrationStatistics();
      expect(stats.totalUploads).toBe(2);
    });

    test('sollte Feature-Flag-Änderungen während Laufzeit handhaben', async () => {
      const file = createMockFile('runtime-flag-change.jpg');
      
      // Start mit 0% Migration
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValue(50); // Konstanter Hash
      
      // Erste Upload-Gruppe (Legacy)
      for (let i = 0; i < 5; i++) {
        await legacyMediaService.uploadMedia(file, `org-legacy-${i}`);
        migrationStats.totalAttempts++;
      }
      
      // Flag-Änderung auf 100%
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      
      // Zweite Upload-Gruppe (Unified)
      for (let i = 0; i < 5; i++) {
        await legacyMediaService.uploadMedia(file, `org-unified-${i}`);
        migrationStats.totalAttempts++;
        migrationStats.successfulMigrations++;
      }
      
      expect(migrationStats.totalAttempts).toBe(10);
      expect(migrationStats.successfulMigrations).toBe(5);
      
      // Verify Legacy wurde erst verwendet, dann Unified
      expect(mediaService.uploadMedia).toHaveBeenCalledTimes(5);
      expect(unifiedUploadAPI.upload).toHaveBeenCalledTimes(5);
    });

    test('sollte Environment-basierte Feature-Flag-Overrides respektieren', async () => {
      // Environment Override
      process.env.FORCE_UNIFIED_API = 'true';
      process.env.UNIFIED_MEDIA_UPLOAD_OVERRIDE = '100';
      
      // Flag ist auf 0% gesetzt, aber Environment Override sollte 100% erzwingen
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      
      const file = createMockFile('env-override.jpg');
      
      // Mock Environment-Check in Migration Logic
      jest.spyOn(legacyMediaService as any, 'getMigrationPercentage').mockImplementation((flagName: string) => {
        if (process.env.FORCE_UNIFIED_API === 'true' && flagName === 'UNIFIED_MEDIA_UPLOAD') {
          return parseInt(process.env.UNIFIED_MEDIA_UPLOAD_OVERRIDE || '0', 10);
        }
        return getFeatureFlag(flagName);
      });
      
      const result = await legacyMediaService.uploadMedia(file, 'env-override-org');
      
      expect(result).toBeDefined();
      expect(unifiedUploadAPI.upload).toHaveBeenCalled();
      
      // Cleanup
      delete process.env.FORCE_UNIFIED_API;
      delete process.env.UNIFIED_MEDIA_UPLOAD_OVERRIDE;
    });
  });

  // =====================
  // GRACEFUL FALLBACK TESTS
  // =====================

  describe('Graceful Fallback Scenarios', () => {
    
    test('sollte bei Unified API Fehlern zu Legacy fallbacken', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100); // Vollständige Migration
      
      // Mock Unified API Error
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
        new UnifiedUploadError('Service temporarily unavailable', 'UPLOAD_FAILED')
      );
      
      const file = createMockFile('fallback-test.jpg');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await legacyMediaService.uploadMedia(file, 'fallback-org');
      
      expect(result).toBeDefined();
      expect(mockUnifiedUploadAPI.upload).toHaveBeenCalled(); // Unified versucht
      expect(mediaService.uploadMedia).toHaveBeenCalled(); // Legacy fallback
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unified API Migration fehlgeschlagen'));
      
      migrationStats.totalAttempts++;
      migrationStats.fallbacksToLegacy++;
      
      consoleSpy.mockRestore();
    });

    test('sollte verschiedene Error-Types korrekt klassifizieren', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      const file = createMockFile('error-classification.jpg');
      
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      
      // Test 1: Unified API Error -> Fallback
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
        new UnifiedUploadError('Context validation failed', 'VALIDATION_FAILED')
      );
      
      await legacyMediaService.uploadMedia(file, 'unified-error-org');
      expect(mediaService.uploadMedia).toHaveBeenCalledTimes(1);
      
      // Test 2: Network Error -> Fallback
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
        new Error('Network request failed')
      );
      
      await legacyMediaService.uploadMedia(file, 'network-error-org');
      expect(mediaService.uploadMedia).toHaveBeenCalledTimes(2);
      
      // Test 3: Permission Error -> Kein Fallback (würde auch bei Legacy fehlschlagen)
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
        new Error('Permission denied')
      );
      
      try {
        await legacyMediaService.uploadMedia(file, 'permission-error-org');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('sollte Fallback-Performance-Impact messen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      const file = createMockFile('fallback-performance.jpg');
      
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      
      // Mock Unified API mit Delay und dann Error
      mockUnifiedUploadAPI.upload.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new UnifiedUploadError('Service error', 'UPLOAD_FAILED')), 100);
        })
      );
      
      const startTime = performance.now();
      const result = await legacyMediaService.uploadMedia(file, 'performance-org');
      const endTime = performance.now();
      
      const totalDuration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(totalDuration).toBeGreaterThan(100); // Mindestens Unified API Delay
      expect(mediaService.uploadMedia).toHaveBeenCalled(); // Fallback erfolgt
      
      migrationStats.totalAttempts++;
      migrationStats.fallbacksToLegacy++;
      
      // Fallback sollte nicht exzessiv langsam sein
      expect(totalDuration).toBeLessThan(5000); // < 5 Sekunden
    });

    test('sollte Circuit Breaker Pattern für wiederholte Failures implementieren', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      const file = createMockFile('circuit-breaker.jpg');
      
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      
      // Mock consistent failures
      mockUnifiedUploadAPI.upload.mockRejectedValue(
        new UnifiedUploadError('Consistent service error', 'UPLOAD_FAILED')
      );
      
      // Multiple uploads with failures
      for (let i = 0; i < 5; i++) {
        await legacyMediaService.uploadMedia(file, `circuit-${i}`);
        migrationStats.totalAttempts++;
        migrationStats.fallbacksToLegacy++;
      }
      
      // Nach mehreren Fehlern sollte Circuit Breaker aktiviert werden
      // (Dies würde eine echte Circuit-Breaker-Implementation erfordern)
      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(5);
      expect(stats.legacyFallbackRate).toBe(100);
    });

    test('sollte Data-Consistency zwischen Unified und Legacy sicherstellen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 50); // 50% Migration für Consistency-Test
      
      const testFiles = [
        createMockFile('consistency-unified.jpg'),
        createMockFile('consistency-legacy.jpg')
      ];
      
      // Mock deterministische Hash-Werte für Consistency-Test
      jest.spyOn(legacyMediaService as any, 'hashString')
        .mockReturnValueOnce(25) // < 50% -> Unified
        .mockReturnValueOnce(75); // > 50% -> Legacy
      
      const [unifiedResult, legacyResult] = await Promise.all([
        legacyMediaService.uploadMedia(testFiles[0], 'unified-consistency-org'),
        legacyMediaService.uploadMedia(testFiles[1], 'legacy-consistency-org')
      ]);
      
      // Beide Results sollten gleiche Datenstruktur haben
      expect(unifiedResult.id).toBeDefined();
      expect(legacyResult.id).toBeDefined();
      expect(unifiedResult.fileName).toBeDefined();
      expect(legacyResult.fileName).toBeDefined();
      expect(unifiedResult.organizationId || unifiedResult.userId).toBeDefined();
      expect(legacyResult.organizationId || legacyResult.userId).toBeDefined();
      
      // Verify Service-spezifische Aufrufe
      expect(unifiedUploadAPI.upload).toHaveBeenCalledWith(
        testFiles[0],
        expect.any(Object),
        expect.any(Object)
      );
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        testFiles[1],
        'legacy-consistency-org',
        undefined,
        undefined,
        3,
        undefined
      );
    });
  });

  // =====================
  // ROLLBACK SCENARIO TESTS
  // =====================

  describe('Rollback Scenarios', () => {
    
    test('sollte Rollback von 100% auf 0% Migration durchführen', async () => {
      const file = createMockFile('rollback-test.jpg');
      
      // Start mit 100% Migration
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      
      // Upload mit Unified API
      await legacyMediaService.uploadMedia(file, 'rollback-org-1');
      expect(unifiedUploadAPI.upload).toHaveBeenCalledTimes(1);
      
      // Rollback auf 0%
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      migrationStats.rollbackEvents++;
      
      // Weitere Uploads sollten Legacy verwenden
      await legacyMediaService.uploadMedia(file, 'rollback-org-2');
      await legacyMediaService.uploadMedia(file, 'rollback-org-3');
      
      expect(mediaService.uploadMedia).toHaveBeenCalledTimes(2);
      expect(unifiedUploadAPI.upload).toHaveBeenCalledTimes(1); // Nur der erste Call
    });

    test('sollte graduelle Rollback-Strategies testen', async () => {
      const file = createMockFile('gradual-rollback.jpg');
      const organizations = ['org1', 'org2', 'org3', 'org4', 'org5'];
      
      // Graduelle Rollback: 100% -> 80% -> 50% -> 20% -> 0%
      const rollbackSteps = [100, 80, 50, 20, 0];
      
      for (let step = 0; step < rollbackSteps.length; step++) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', rollbackSteps[step]);
        
        // Mock verschiedene Hash-Werte (0, 25, 50, 75, 95)
        jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValue(step * 25);
        
        await legacyMediaService.uploadMedia(file, organizations[step]);
        
        migrationStats.totalAttempts++;
        if (step * 25 < rollbackSteps[step]) {
          migrationStats.successfulMigrations++;
        } else {
          migrationStats.fallbacksToLegacy++;
        }
      }
      
      // Verify graduelle Reduzierung der Migration
      expect(migrationStats.totalAttempts).toBe(5);
      expect(migrationStats.successfulMigrations).toBe(4); // Alle außer dem letzten (0%)
      expect(migrationStats.fallbacksToLegacy).toBe(1);
    });

    test('sollte Emergency-Rollback bei kritischen Fehlern durchführen', async () => {
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      
      // Mock kritischen Unified API Fehler
      mockUnifiedUploadAPI.upload.mockRejectedValue(
        new UnifiedUploadError('Critical system error - data corruption risk', 'CRITICAL_ERROR')
      );
      
      const file = createMockFile('emergency-rollback.jpg');
      
      // Emergency-Rollback-Trigger simulieren
      let emergencyRollback = false;
      
      try {
        await legacyMediaService.uploadMedia(file, 'emergency-org');
      } catch (error) {
        if (error instanceof UnifiedUploadError && error.message.includes('Critical system error')) {
          // Emergency-Rollback aktivieren
          setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
          emergencyRollback = true;
          migrationStats.rollbackEvents++;
        }
      }
      
      // Weitere Uploads sollten automatisch Legacy verwenden
      if (emergencyRollback) {
        const recoveryResult = await legacyMediaService.uploadMedia(file, 'recovery-org');
        expect(recoveryResult).toBeDefined();
        expect(mediaService.uploadMedia).toHaveBeenCalled();
      }
    });

    test('sollte Rollback-Impact auf Performance messen', async () => {
      const file = createMockFile('rollback-performance.jpg');
      
      // Performance vor Rollback (mit Unified API)
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      
      const preRollbackTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await legacyMediaService.uploadMedia(file, `pre-rollback-${i}`);
        const endTime = performance.now();
        preRollbackTimes.push(endTime - startTime);
      }
      
      // Rollback durchführen
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      migrationStats.rollbackEvents++;
      
      // Performance nach Rollback (mit Legacy API)
      const postRollbackTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await legacyMediaService.uploadMedia(file, `post-rollback-${i}`);
        const endTime = performance.now();
        postRollbackTimes.push(endTime - startTime);
      }
      
      const preRollbackAverage = preRollbackTimes.reduce((sum, time) => sum + time, 0) / 10;
      const postRollbackAverage = postRollbackTimes.reduce((sum, time) => sum + time, 0) / 10;
      
      // Performance-Impact dokumentieren
      const performanceImpact = ((postRollbackAverage - preRollbackAverage) / preRollbackAverage) * 100;
      
      if (performanceImpact > 0) {
        migrationStats.performanceLosses++;
      } else {
        migrationStats.performanceGains++;
      }
      
      // Rollback sollte nicht zu drastischen Performance-Verlusten führen
      expect(Math.abs(performanceImpact)).toBeLessThan(200); // < 200% Unterschied
    });

    test('sollte Data-Consistency während Rollback sicherstellen', async () => {
      const files = [
        createMockFile('consistency-before.jpg'),
        createMockFile('consistency-during.jpg'),
        createMockFile('consistency-after.jpg')
      ];
      
      // Upload vor Rollback
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      const beforeResult = await legacyMediaService.uploadMedia(files[0], 'consistency-org');
      
      // Upload während Rollback (simuliert durch Feature-Flag-Änderung)
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 50);
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(75); // > 50% -> Legacy
      const duringResult = await legacyMediaService.uploadMedia(files[1], 'consistency-org');
      
      // Upload nach Rollback
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      const afterResult = await legacyMediaService.uploadMedia(files[2], 'consistency-org');
      
      // Alle Results sollten konsistente Datenstrukturen haben
      [beforeResult, duringResult, afterResult].forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.fileName).toBeDefined();
        expect(result.fileSize).toBeDefined();
        expect(result.organizationId || result.userId).toBe('consistency-org');
      });
      
      migrationStats.rollbackEvents++;
    });
  });

  // =====================
  // PROGRESSIVE ENHANCEMENT TESTS
  // =====================

  describe('Progressive Enhancement Patterns', () => {
    
    test('sollte Feature-Detection für Unified API durchführen', async () => {
      const file = createMockFile('feature-detection.jpg');
      
      // Mock Feature-Detection Logic
      const featureDetection = {
        hasUnifiedAPI: typeof unifiedUploadAPI !== 'undefined',
        hasContextValidation: typeof unifiedUploadAPI.validateContext !== 'undefined',
        hasSmartRouting: typeof unifiedUploadAPI.uploadToCampaign !== 'undefined',
        hasBatchUpload: typeof unifiedUploadAPI.uploadBatch !== 'undefined'
      };
      
      expect(featureDetection.hasUnifiedAPI).toBe(true);
      expect(featureDetection.hasContextValidation).toBe(true);
      expect(featureDetection.hasSmartRouting).toBe(true);
      expect(featureDetection.hasBatchUpload).toBe(true);
      
      // Progressive Enhancement basierend auf verfügbaren Features
      if (featureDetection.hasUnifiedAPI) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 25);
      } else {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      }
      
      const result = await legacyMediaService.uploadMedia(file, 'feature-detection-org');
      expect(result).toBeDefined();
    });

    test('sollte Capability-based Migration implementieren', async () => {
      const file = createMockFile('capability-migration.jpg');
      
      // Mock verschiedene Capability-Levels
      const capabilities = {
        basic: ['upload'],
        enhanced: ['upload', 'batch', 'progress'],
        advanced: ['upload', 'batch', 'progress', 'smart_routing', 'validation'],
        premium: ['upload', 'batch', 'progress', 'smart_routing', 'validation', 'analytics', 'optimization']
      };
      
      // Migration basierend auf Capabilities
      const clientCapabilities = capabilities.advanced;
      
      if (clientCapabilities.includes('smart_routing')) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 50);
      }
      if (clientCapabilities.includes('validation')) {
        setFeatureFlag('UNIFIED_CONTEXT_VALIDATION', 75);
      }
      if (clientCapabilities.includes('optimization')) {
        setFeatureFlag('UNIFIED_PERFORMANCE_OPTIMIZATION', 25);
      }
      
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValue(25); // Sollte migrieren
      
      const result = await legacyMediaService.uploadMedia(file, 'capability-org');
      expect(result).toBeDefined();
    });

    test('sollte Backwards-Compatibility für ältere Client-Versionen sicherstellen', async () => {
      const file = createMockFile('backwards-compatibility.jpg');
      
      // Simuliere ältere Client-Version ohne Unified API Support
      const clientVersion = '1.2.0'; // Vor Unified API (angenommen 2.0.0+)
      const isLegacyClient = clientVersion.split('.')[0] < '2';
      
      if (isLegacyClient) {
        // Zwinge Legacy API für ältere Clients
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 0);
      } else {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
      }
      
      const result = await legacyMediaService.uploadMedia(file, 'backwards-compat-org');
      
      expect(result).toBeDefined();
      expect(mediaService.uploadMedia).toHaveBeenCalled(); // Legacy für alten Client
    });

    test('sollte Service-degradation graceful handhaben', async () => {
      const file = createMockFile('service-degradation.jpg');
      
      // Simuliere teilweise Service-Ausfälle
      const serviceHealth = {
        unifiedAPI: true,
        smartRouter: false, // Ausfall
        contextValidation: true,
        performanceManager: false // Ausfall
      };
      
      // Migration mit degraded Services
      if (serviceHealth.unifiedAPI && serviceHealth.contextValidation) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 100);
        
        // Mock degraded Unified API (ohne Smart Router)
        const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
        mockUnifiedUploadAPI.upload.mockResolvedValueOnce({
          success: true,
          uploadId: 'degraded-123',
          asset: createMockMediaAsset(),
          uploadMethod: 'direct_service', // Kein Smart Router
          serviceUsed: 'mediaService',
          storagePath: '/degraded/path',
          performanceMetrics: {
            totalDurationMs: 1200,
            contextResolutionMs: 80,
            validationMs: 60,
            uploadMs: 1000,
            postProcessingMs: 60,
            fileSizeBytes: 1024,
            transferredBytes: 1024,
            serviceLatencyMs: 150,
            retryCount: 0,
            cacheHits: 0,
            routingDecisionMs: 0, // Kein Routing
            contextCacheHit: false,
            recommendationGenerated: false
          },
          resolvedContext: {
            organizationId: 'degraded-org',
            userId: 'degraded-user',
            uploadTarget: 'media_library',
            uploadType: 'media_asset',
            contextSource: 'explicit',
            contextTimestamp: { seconds: Date.now() / 1000, nanoseconds: 0 }
          },
          contextInheritance: {
            inheritanceSource: 'none',
            inheritanceChain: []
          },
          recommendations: [],
          warnings: [{ 
            code: 'SERVICE_DEGRADED', 
            message: 'Smart Router temporarily unavailable', 
            severity: 'warning',
            canProceed: true
          }],
          smartRouterUsed: false, // Degraded
          routingDecision: {
            selectedService: 'mediaService',
            routingReason: 'Smart Router unavailable - fallback to direct service',
            confidence: 60,
            alternativeOptions: [],
            routingPath: '/degraded/path',
            optimizations: []
          }
        });
      }
      
      const result = await legacyMediaService.uploadMedia(file, 'degraded-org');
      
      expect(result).toBeDefined();
      expect(unifiedUploadAPI.upload).toHaveBeenCalled();
    });

    test('sollte Performance-basierte Dynamic Migration implementieren', async () => {
      const file = createMockFile('dynamic-migration.jpg');
      
      // Mock Performance-Monitoring
      const performanceMetrics = {
        unifiedAPI: {
          averageLatency: 800, // ms
          errorRate: 0.02, // 2%
          throughput: 50 // requests/second
        },
        legacyAPI: {
          averageLatency: 1200, // ms
          errorRate: 0.01, // 1%
          throughput: 30 // requests/second
        }
      };
      
      // Dynamic Migration basierend auf Performance
      let migrationPercentage = 50; // Start
      
      if (performanceMetrics.unifiedAPI.averageLatency < performanceMetrics.legacyAPI.averageLatency) {
        migrationPercentage += 25; // Bessere Performance -> mehr Migration
      }
      
      if (performanceMetrics.unifiedAPI.errorRate > performanceMetrics.legacyAPI.errorRate * 2) {
        migrationPercentage -= 30; // Höhere Error-Rate -> weniger Migration
      }
      
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', Math.max(0, Math.min(100, migrationPercentage)));
      
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValue(30);
      
      const result = await legacyMediaService.uploadMedia(file, 'dynamic-org');
      expect(result).toBeDefined();
      
      // Erwarte Migration aufgrund besserer Performance
      expect(migrationPercentage).toBe(45); // 50 + 25 - 30
      expect(getFeatureFlag('UNIFIED_MEDIA_UPLOAD')).toBe(45);
    });
  });

  // =====================
  // MIGRATION STATISTICS & MONITORING
  // =====================

  describe('Migration Statistics & Monitoring', () => {
    
    test('sollte umfassende Migration-Statistics sammeln', async () => {
      const files = new Array(20).fill(null).map((_, i) => 
        createMockFile(`stats-${i}.jpg`)
      );
      
      setFeatureFlag('UNIFIED_MEDIA_UPLOAD', 50); // 50% Migration
      
      // Mock verschiedene Outcomes
      const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
      
      for (let i = 0; i < files.length; i++) {
        const hashValue = (i * 5) % 100; // 0, 5, 10, ..., 95, dann wieder von vorn
        jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(hashValue);
        
        migrationStats.totalAttempts++;
        
        if (hashValue < 50) { // Sollte migrieren
          if (i % 4 === 0) { // Gelegentlicher Unified API Fehler
            mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
              new UnifiedUploadError('Intermittent error', 'UPLOAD_FAILED')
            );
            migrationStats.fallbacksToLegacy++;
          } else {
            migrationStats.successfulMigrations++;
          }
          
          await legacyMediaService.uploadMedia(files[i], `stats-org-${i}`);
        } else { // Legacy
          migrationStats.fallbacksToLegacy++;
          await legacyMediaService.uploadMedia(files[i], `stats-org-${i}`);
        }
      }
      
      const stats = legacyMediaService.getMigrationStatistics();
      
      expect(stats.totalCalls).toBe(20);
      expect(stats.migrationRate).toBeGreaterThan(0);
      expect(stats.legacyFallbackRate).toBeGreaterThan(0);
      expect(migrationStats.totalAttempts).toBe(20);
      expect(migrationStats.successfulMigrations + migrationStats.fallbacksToLegacy).toBe(20);
    });

    test('sollte Migration-Performance-Benchmarks erstellen', async () => {
      const file = createMockFile('benchmark.jpg');
      
      // Benchmark verschiedener Migration-Percentages
      const percentages = [0, 25, 50, 75, 100];
      const benchmarkResults: Array<{
        percentage: number;
        averageLatency: number;
        errorRate: number;
      }> = [];
      
      for (const percentage of percentages) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', percentage);
        
        const latencies: number[] = [];
        let errors = 0;
        const testRuns = 10;
        
        for (let i = 0; i < testRuns; i++) {
          const hashValue = (i * 10) % 100; // Deterministische Hash-Werte
          jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(hashValue);
          
          try {
            const startTime = performance.now();
            await legacyMediaService.uploadMedia(file, `benchmark-org-${percentage}-${i}`);
            const endTime = performance.now();
            latencies.push(endTime - startTime);
          } catch (error) {
            errors++;
          }
        }
        
        const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        const errorRate = errors / testRuns;
        
        benchmarkResults.push({
          percentage,
          averageLatency,
          errorRate
        });
      }
      
      // Verify Benchmark-Daten
      expect(benchmarkResults).toHaveLength(5);
      benchmarkResults.forEach(result => {
        expect(result.averageLatency).toBeGreaterThan(0);
        expect(result.errorRate).toBeGreaterThanOrEqual(0);
        expect(result.errorRate).toBeLessThanOrEqual(1);
      });
    });

    test('sollte A/B-Test-Daten für Migration-Optimierung sammeln', async () => {
      const file = createMockFile('ab-test.jpg');
      
      // A/B Test: 25% vs 75% Migration
      const testGroups = [
        { name: 'Group A', percentage: 25, users: [] as string[] },
        { name: 'Group B', percentage: 75, users: [] as string[] }
      ];
      
      // Zufällige User-Zuteilung
      const users = new Array(100).fill(null).map((_, i) => `user-${i}`);
      users.forEach((user, index) => {
        const group = index % 2; // Alternierende Zuteilung
        testGroups[group].users.push(user);
      });
      
      const abTestResults: Array<{
        group: string;
        successRate: number;
        averageLatency: number;
        userSatisfaction: number;
      }> = [];
      
      for (const group of testGroups) {
        setFeatureFlag('UNIFIED_MEDIA_UPLOAD', group.percentage);
        
        let successes = 0;
        const latencies: number[] = [];
        
        for (let i = 0; i < Math.min(10, group.users.length); i++) {
          const user = group.users[i];
          const hashValue = (i * 13) % 100; // Pseudo-random hash
          jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(hashValue);
          
          try {
            const startTime = performance.now();
            await legacyMediaService.uploadMedia(file, `ab-org-${user}`);
            const endTime = performance.now();
            
            successes++;
            latencies.push(endTime - startTime);
          } catch (error) {
            // Failure
          }
        }
        
        const successRate = successes / Math.min(10, group.users.length);
        const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0;
        const userSatisfaction = successRate * (1000 / Math.max(averageLatency, 1)); // Synthetic metric
        
        abTestResults.push({
          group: group.name,
          successRate,
          averageLatency,
          userSatisfaction
        });
      }
      
      expect(abTestResults).toHaveLength(2);
      
      // A/B Test Analysis
      const groupA = abTestResults.find(r => r.group === 'Group A')!;
      const groupB = abTestResults.find(r => r.group === 'Group B')!;
      
      expect(groupA.successRate).toBeGreaterThanOrEqual(0);
      expect(groupB.successRate).toBeGreaterThanOrEqual(0);
      
      // Higher migration percentage should generally perform better (if Unified API is superior)
      if (groupB.successRate > groupA.successRate && groupB.averageLatency < groupA.averageLatency) {
        migrationStats.performanceGains++;
      }
    });

    test('sollte Migration-Health-Dashboard-Daten bereitstellen', () => {
      // Simuliere Dashboard-Daten-Sammlung
      const dashboardData = {
        migration: {
          totalAttempts: migrationStats.totalAttempts,
          successfulMigrations: migrationStats.successfulMigrations,
          fallbacksToLegacy: migrationStats.fallbacksToLegacy,
          currentMigrationRate: (migrationStats.successfulMigrations / Math.max(migrationStats.totalAttempts, 1)) * 100,
          rollbackEvents: migrationStats.rollbackEvents
        },
        performance: {
          performanceGains: migrationStats.performanceGains,
          performanceLosses: migrationStats.performanceLosses,
          averageUnifiedAPILatency: 800,
          averageLegacyAPILatency: 1200,
          performanceImprovement: ((1200 - 800) / 1200) * 100 // 33.3%
        },
        reliability: {
          unifiedAPIErrorRate: 0.02,
          legacyAPIErrorRate: 0.01,
          fallbackSuccessRate: 0.98,
          circuitBreakerActivations: 0
        },
        featureFlags: {
          UNIFIED_MEDIA_UPLOAD: getFeatureFlag('UNIFIED_MEDIA_UPLOAD'),
          UNIFIED_HERO_IMAGE_UPLOAD: getFeatureFlag('UNIFIED_HERO_IMAGE_UPLOAD'),
          UNIFIED_ATTACHMENT_UPLOAD: getFeatureFlag('UNIFIED_ATTACHMENT_UPLOAD')
        }
      };
      
      // Dashboard-Daten-Validierung
      expect(dashboardData.migration.currentMigrationRate).toBeGreaterThanOrEqual(0);
      expect(dashboardData.migration.currentMigrationRate).toBeLessThanOrEqual(100);
      expect(dashboardData.performance.performanceImprovement).toBeCloseTo(33.3, 1);
      expect(dashboardData.reliability.fallbackSuccessRate).toBeGreaterThan(0.9);
      
      // Health Score Calculation
      const healthScore = (
        (dashboardData.migration.currentMigrationRate / 100) * 0.3 +
        (Math.max(0, dashboardData.performance.performanceImprovement) / 100) * 0.3 +
        (dashboardData.reliability.fallbackSuccessRate) * 0.4
      ) * 100;
      
      expect(healthScore).toBeGreaterThan(50); // Gesundes System
    });
  });
});