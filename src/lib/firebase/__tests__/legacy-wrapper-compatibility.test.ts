// src/lib/firebase/__tests__/legacy-wrapper-compatibility.test.ts
// Comprehensive Tests für Legacy Wrapper Compatibility
// 100% API-Kompatibilität, Migration-Scenarios, Feature-Flag-gesteuerte Rollouts und Service-Integration

import { legacyMediaService, mediaServiceWithUnifiedAPI, MediaServiceMigrationHelper } from '../legacy-wrappers/legacy-media-service';
import { legacyCampaignService, campaignMediaServiceWithUnifiedAPI } from '../legacy-wrappers/legacy-campaign-service';
import { unifiedUploadAPI } from '../unified-upload-api';
import { mediaService } from '../media-service';
import { campaignMediaService } from '../campaign-media-service';
import { UnifiedUploadError } from '@/types/unified-upload';
import { MediaAsset } from '@/types/media';

// =====================
// TEST SETUP & MOCKS
// =====================

// Mock alle Service Dependencies
jest.mock('../unified-upload-api');
jest.mock('../media-service');
jest.mock('../campaign-media-service');
jest.mock('../project-upload-service');
jest.mock('../branding-service');

// Mock Implementations
const mockUnifiedUploadAPI = unifiedUploadAPI as jest.Mocked<typeof unifiedUploadAPI>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockCampaignMediaService = campaignMediaService as jest.Mocked<typeof campaignMediaService>;

// Test Data Factory
const createMockFile = (name: string, size: number = 1024, type: string = 'image/jpeg'): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

const createMockMediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
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
  tags: [],
  ...overrides
});

const createMockCampaignUploadResult = () => ({
  asset: createMockMediaAsset(),
  campaignContext: {
    organizationId: 'test-org',
    userId: 'test-user',
    campaignId: 'campaign-123',
    campaignName: 'Test Campaign',
    uploadType: 'hero-image' as const,
    autoTags: ['campaign:test'],
    contextSource: 'explicit' as const,
    contextTimestamp: { seconds: Date.now() / 1000, nanoseconds: 0 }
  },
  usedSmartRouter: true,
  storageInfo: {
    type: 'organized' as const,
    path: '/campaigns/test/hero.jpg',
    isHybrid: false
  },
  featureFlags: {
    smartRouterEnabled: true,
    uploadTypeEnabled: true,
    fallbackUsed: false
  }
});

describe('Legacy Wrapper Compatibility', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default Mock Setup
    mockMediaService.uploadMedia.mockResolvedValue(createMockMediaAsset());
    mockMediaService.uploadClientMedia.mockResolvedValue(createMockMediaAsset());
    mockMediaService.uploadBuffer.mockResolvedValue({
      downloadUrl: 'https://storage.example.com/buffer.jpg',
      filePath: '/uploads/buffer.jpg',
      fileSize: 2048
    });

    mockCampaignMediaService.uploadCampaignMedia.mockResolvedValue(createMockCampaignUploadResult());
    mockCampaignMediaService.getCampaignAssets.mockResolvedValue({
      assets: [createMockMediaAsset()],
      storageInfo: {
        organized: [createMockMediaAsset()],
        unorganized: [],
        total: 1
      }
    });

    mockUnifiedUploadAPI.upload.mockResolvedValue({
      success: true,
      uploadId: 'unified-123',
      asset: createMockMediaAsset(),
      uploadMethod: 'smart_router',
      serviceUsed: 'smartUploadRouter',
      storagePath: '/unified/test.jpg',
      performanceMetrics: {
        totalDurationMs: 1500,
        contextResolutionMs: 100,
        validationMs: 50,
        uploadMs: 1200,
        postProcessingMs: 150,
        fileSizeBytes: 1024,
        transferredBytes: 1024,
        serviceLatencyMs: 200,
        retryCount: 0,
        cacheHits: 1,
        routingDecisionMs: 50,
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
        routingPath: '/unified/test.jpg',
        optimizations: []
      }
    });

    // Reset Migration Statistics
    legacyMediaService.resetMigrationStatistics();
    legacyCampaignService.resetCampaignMigrationStatistics();
  });

  // =====================
  // LEGACY MEDIA SERVICE WRAPPER TESTS
  // =====================

  describe('Legacy Media Service Wrapper', () => {
    
    test('sollte uploadMedia API-Kompatibilität zu 100% beibehalten', async () => {
      const file = createMockFile('legacy-test.jpg');
      const organizationId = 'test-org-123';
      const folderId = 'folder-456';
      const progressCallback = jest.fn();
      const retryCount = 3;
      const context = { userId: 'user-789', clientId: 'client-101' };

      const result = await legacyMediaService.uploadMedia(
        file,
        organizationId,
        folderId,
        progressCallback,
        retryCount,
        context
      );

      expect(result).toBeDefined();
      expect(result.fileName).toBe('test.jpg');
      expect(result.organizationId || result.userId).toBe(organizationId);
      
      // Verify Legacy Service wurde aufgerufen ODER Unified API Migration
      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith(
        file,
        organizationId,
        folderId,
        progressCallback,
        retryCount,
        context
      );
    });

    test('sollte uploadClientMedia API-Kompatibilität beibehalten', async () => {
      const file = createMockFile('client-media.png');
      const organizationId = 'test-org-123';
      const clientId = 'client-456';
      const folderId = 'folder-789';
      const progressCallback = jest.fn();
      const context = { userId: 'user-101' };

      const result = await legacyMediaService.uploadClientMedia(
        file,
        organizationId,
        clientId,
        folderId,
        progressCallback,
        context
      );

      expect(result).toBeDefined();
      expect(result.fileName).toBe('client-media.png');
      expect(mockMediaService.uploadClientMedia).toHaveBeenCalledWith(
        file,
        organizationId,
        clientId,
        folderId,
        progressCallback,
        context
      );
    });

    test('sollte uploadBuffer direkt an Legacy Service weiterleiten', async () => {
      const buffer = Buffer.from('test buffer content');
      const fileName = 'buffer-test.jpg';
      const contentType = 'image/jpeg';
      const organizationId = 'test-org-123';
      const folder = 'uploads';
      const context = { userId: 'user-456', clientId: 'client-789' };

      const result = await legacyMediaService.uploadBuffer(
        buffer,
        fileName,
        contentType,
        organizationId,
        folder,
        context
      );

      expect(result).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);
      
      expect(mockMediaService.uploadBuffer).toHaveBeenCalledWith(
        buffer,
        fileName,
        contentType,
        organizationId,
        folder,
        context
      );
    });

    test('sollte Migration zur Unified API basierend auf Feature-Flags durchführen', async () => {
      // Mock Feature Flag für Migration aktivieren
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValueOnce(true);

      const file = createMockFile('migration-test.jpg');
      const organizationId = 'test-org-123';

      const result = await legacyMediaService.uploadMedia(file, organizationId);

      expect(mockUnifiedUploadAPI.upload).toHaveBeenCalled();
      expect(result.fileName).toBe('test.jpg');
      
      // Migration Statistics sollten erhöht werden
      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(1);
    });

    test('sollte Graceful Fallback bei Unified API Fehlern durchführen', async () => {
      // Mock Feature Flag für Migration aktivieren
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValueOnce(true);
      
      // Mock Unified API Error
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(
        new UnifiedUploadError('Unified API temporarily unavailable', 'UPLOAD_FAILED')
      );

      const file = createMockFile('fallback-test.jpg');
      const organizationId = 'test-org-123';

      // Console warning sollte nicht das Test crashen
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await legacyMediaService.uploadMedia(file, organizationId);

      expect(result).toBeDefined();
      expect(mockUnifiedUploadAPI.upload).toHaveBeenCalled(); // Unified API versucht
      expect(mockMediaService.uploadMedia).toHaveBeenCalled(); // Fallback zu Legacy
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unified API Migration fehlgeschlagen'));
      
      consoleSpy.mockRestore();
    });

    test('sollte Migration Statistics korrekt verfolgen', async () => {
      const file = createMockFile('stats-test.jpg');
      
      // Test ohne Migration
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValueOnce(false);
      await legacyMediaService.uploadMedia(file, 'org1');

      // Test mit erfolgreicher Migration
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValueOnce(true);
      await legacyMediaService.uploadMedia(file, 'org2');

      // Test mit fehlgeschlagener Migration
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValueOnce(true);
      mockUnifiedUploadAPI.upload.mockRejectedValueOnce(new UnifiedUploadError('Test error', 'UPLOAD_FAILED'));
      await legacyMediaService.uploadMedia(file, 'org3');

      const stats = legacyMediaService.getMigrationStatistics();
      
      expect(stats.totalCalls).toBe(3);
      expect(stats.legacyFallbackRate).toBeGreaterThan(0);
      expect(stats.migrationRate).toBeGreaterThanOrEqual(0);
    });

    test('sollte Feature-Flag-basierte graduelle Migration implementieren', () => {
      const organizationIds = ['org-1', 'org-2', 'org-3', 'org-4', 'org-5'];
      
      // Mock verschiedene Migration-Percentages
      jest.spyOn(legacyMediaService as any, 'getMigrationPercentage').mockImplementation((flagName: string) => {
        const percentages: Record<string, number> = {
          'UNIFIED_MEDIA_UPLOAD': 40, // 40% Migration
          'UNIFIED_CLIENT_MEDIA_UPLOAD': 10 // 10% Migration
        };
        return percentages[flagName] || 0;
      });

      // Mock Context für deterministische Hash-Berechnung
      jest.spyOn(legacyMediaService as any, 'getCurrentContext').mockReturnValue({
        organizationId: 'test-org'
      });

      const migrationDecisions = organizationIds.map(orgId => {
        jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(
          parseInt(orgId.split('-')[1]) * 20 // 0, 20, 40, 60, 80
        );
        return (legacyMediaService as any).shouldUseUnifiedAPI('media_upload');
      });

      Promise.all(migrationDecisions).then(decisions => {
        // Mit 40% Migration sollten etwa 40% der Buckets migrated werden
        const migrationCount = decisions.filter(Boolean).length;
        expect(migrationCount).toBeGreaterThanOrEqual(1);
        expect(migrationCount).toBeLessThanOrEqual(4);
      });
    });

    test('sollte Hash-basierte deterministische Migration gewährleisten', () => {
      const organizationId = 'test-org-consistent';
      
      const hash1 = (legacyMediaService as any).hashString(organizationId);
      const hash2 = (legacyMediaService as any).hashString(organizationId);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThan(0);
    });

    test('sollte Migration Statistics Reset korrekt durchführen', () => {
      // Generate some statistics
      legacyMediaService.getMigrationStatistics(); // Initialize
      
      const initialStats = legacyMediaService.getMigrationStatistics();
      expect(initialStats.totalCalls).toBe(0);
      
      legacyMediaService.resetMigrationStatistics();
      
      const resetStats = legacyMediaService.getMigrationStatistics();
      expect(resetStats.totalCalls).toBe(0);
      expect(resetStats.migrationRate).toBe(0);
      expect(resetStats.legacyFallbackRate).toBe(0);
    });
  });

  // =====================
  // LEGACY CAMPAIGN SERVICE WRAPPER TESTS
  // =====================

  describe('Legacy Campaign Service Wrapper', () => {
    
    test('sollte uploadCampaignMedia API-Kompatibilität zu 100% beibehalten', async () => {
      const file = createMockFile('campaign-hero.jpg');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        uploadType: 'hero-image' as const,
        file,
        onProgress: jest.fn()
      };

      const result = await legacyCampaignService.uploadCampaignMedia(params);

      expect(result).toBeDefined();
      expect(result.campaignContext.campaignId).toBe('campaign-123');
      expect(result.campaignContext.uploadType).toBe('hero-image');
      expect(result.usedSmartRouter).toBeDefined();
      expect(result.storageInfo).toBeDefined();
      expect(result.featureFlags).toBeDefined();
    });

    test('sollte uploadHeroImage spezialisierte Method korrekt wrappen', async () => {
      const file = createMockFile('hero.png');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-456',
        file
      };

      const result = await legacyCampaignService.uploadHeroImage(params);

      expect(result.campaignContext.uploadType).toBe('hero-image');
      expect(mockCampaignMediaService.uploadCampaignMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadType: 'hero-image'
        })
      );
    });

    test('sollte uploadAttachment spezialisierte Method korrekt wrappen', async () => {
      const file = createMockFile('attachment.pdf', 2048, 'application/pdf');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-789',
        file
      };

      const result = await legacyCampaignService.uploadAttachment(params);

      expect(result.campaignContext.uploadType).toBe('attachment');
      expect(mockCampaignMediaService.uploadCampaignMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadType: 'attachment'
        })
      );
    });

    test('sollte Campaign Upload Migration zur Unified API durchführen', async () => {
      // Mock Migration aktivieren
      jest.spyOn(legacyCampaignService as any, 'shouldMigrateToCampaignUpload').mockResolvedValueOnce(true);

      const file = createMockFile('migration-campaign.jpg');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'migration-campaign-123',
        uploadType: 'hero-image' as const,
        file
      };

      const result = await legacyCampaignService.uploadCampaignMedia(params);

      expect(mockUnifiedUploadAPI.uploadToCampaign).toHaveBeenCalled();
      expect(result.campaignContext.campaignId).toBe('migration-campaign-123');
      
      const stats = legacyCampaignService.getCampaignMigrationStatistics();
      expect(stats.totalUploads).toBeGreaterThan(0);
    });

    test('sollte Campaign-spezifische Migration-Percentages korrekt handhaben', () => {
      const migrationPercentages = {
        'UNIFIED_HERO_IMAGE_UPLOAD': 15,
        'UNIFIED_ATTACHMENT_UPLOAD': 25,
        'UNIFIED_BOILERPLATE_UPLOAD': 10,
        'UNIFIED_GENERATED_CONTENT_UPLOAD': 5
      };

      Object.entries(migrationPercentages).forEach(([flagName, expectedPercentage]) => {
        const actualPercentage = (legacyCampaignService as any).getCampaignMigrationPercentage(flagName);
        expect(actualPercentage).toBe(expectedPercentage);
      });
    });

    test('sollte Legacy Upload Type zu Unified Upload Type Mapping korrekt durchführen', () => {
      const mappingTests = [
        { legacy: 'hero-image', unified: 'hero_image' },
        { legacy: 'attachment', unified: 'attachment' },
        { legacy: 'boilerplate-asset', unified: 'template' },
        { legacy: 'generated-content', unified: 'generated_content' }
      ];

      mappingTests.forEach(({ legacy, unified }) => {
        const result = (legacyCampaignService as any).mapLegacyUploadType(legacy);
        expect(result).toBe(unified);
      });
    });

    test('sollte Unified Result zu Legacy Campaign Result korrekt konvertieren', () => {
      const unifiedResult = {
        success: true,
        uploadId: 'unified-456',
        asset: createMockMediaAsset(),
        uploadMethod: 'smart_router',
        smartRouterUsed: true,
        resolvedContext: {
          organizationId: 'test-org',
          autoTags: ['unified:test']
        },
        storagePath: '/unified/campaign/test.jpg'
      };

      const originalParams = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'campaign-convert',
        campaignName: 'Conversion Test',
        uploadType: 'hero-image' as const,
        file: createMockFile('convert.jpg')
      };

      const legacyResult = (legacyCampaignService as any).convertUnifiedResultToCampaignResult(
        unifiedResult,
        originalParams
      );

      expect(legacyResult.campaignContext.campaignId).toBe('campaign-convert');
      expect(legacyResult.campaignContext.uploadType).toBe('hero-image');
      expect(legacyResult.usedSmartRouter).toBe(true);
      expect(legacyResult.storageInfo.path).toBe('/unified/campaign/test.jpg');
      expect(legacyResult.featureFlags.smartRouterEnabled).toBe(true);
    });

    test('sollte Campaign Upload Statistics korrekt verfolgen', async () => {
      const heroFile = createMockFile('hero-stats.jpg');
      const attachmentFile = createMockFile('attachment-stats.pdf', 1024, 'application/pdf');

      // Mock keine Migration für deterministische Tests
      jest.spyOn(legacyCampaignService as any, 'shouldMigrateToCampaignUpload').mockResolvedValue(false);

      // Hero Image Upload
      await legacyCampaignService.uploadHeroImage({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'stats-campaign',
        file: heroFile
      });

      // Attachment Upload
      await legacyCampaignService.uploadAttachment({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'stats-campaign',
        file: attachmentFile
      });

      const stats = legacyCampaignService.getCampaignMigrationStatistics();
      
      expect(stats.totalUploads).toBe(2);
      expect(stats.uploadTypeBreakdown.heroImages).toBe(1);
      expect(stats.uploadTypeBreakdown.attachments).toBe(1);
      expect(stats.migrationRate).toBe(0); // Keine Migration in diesem Test
    });

    test('sollte Asset-Retrieval-Methods unverändert weiterleiten', async () => {
      const params = {
        organizationId: 'test-org',
        campaignId: 'campaign-assets'
      };

      // getCampaignAssets
      const assetsResult = await legacyCampaignService.getCampaignAssets(params);
      expect(mockCampaignMediaService.getCampaignAssets).toHaveBeenCalledWith(params);
      expect(assetsResult.assets).toBeDefined();
      expect(assetsResult.storageInfo).toBeDefined();

      // getCampaignHeroImage
      mockCampaignMediaService.getCampaignHeroImage.mockResolvedValueOnce(createMockMediaAsset());
      const heroResult = await legacyCampaignService.getCampaignHeroImage(params);
      expect(mockCampaignMediaService.getCampaignHeroImage).toHaveBeenCalledWith(params);
      expect(heroResult).toBeDefined();

      // getCampaignAttachments
      mockCampaignMediaService.getCampaignAttachments.mockResolvedValueOnce([createMockMediaAsset()]);
      const attachmentsResult = await legacyCampaignService.getCampaignAttachments(params);
      expect(mockCampaignMediaService.getCampaignAttachments).toHaveBeenCalledWith(params);
      expect(attachmentsResult).toHaveLength(1);

      // previewCampaignStoragePath
      const previewParams = {
        ...params,
        userId: 'test-user',
        uploadType: 'hero-image' as const
      };
      mockCampaignMediaService.previewCampaignStoragePath.mockResolvedValueOnce({
        path: '/preview/path',
        storageType: 'organized',
        isHybrid: false
      });
      const previewResult = await legacyCampaignService.previewCampaignStoragePath(previewParams);
      expect(mockCampaignMediaService.previewCampaignStoragePath).toHaveBeenCalledWith(previewParams);
      expect(previewResult.path).toBeDefined();
    });

    test('sollte Hash-String-Utility für deterministische Migration verwenden', () => {
      const testStrings = ['campaign-123', 'campaign-456', 'campaign-789'];
      
      testStrings.forEach(str => {
        const hash1 = (legacyCampaignService as any).hashString(str);
        const hash2 = (legacyCampaignService as any).hashString(str);
        
        expect(hash1).toBe(hash2); // Deterministic
        expect(hash1).toBeGreaterThanOrEqual(0); // Positive
        expect(hash1 % 100).toBeLessThan(100); // Valid bucket
      });
    });
  });

  // =====================
  // API COMPATIBILITY LAYER TESTS
  // =====================

  describe('API Compatibility Layers', () => {
    
    test('sollte mediaServiceWithUnifiedAPI alle Original-Methods beibehalten', () => {
      // Verify alle Original-Methods sind verfügbar
      expect(typeof mediaServiceWithUnifiedAPI.uploadMedia).toBe('function');
      expect(typeof mediaServiceWithUnifiedAPI.uploadClientMedia).toBe('function');
      expect(typeof mediaServiceWithUnifiedAPI.uploadBuffer).toBe('function');
      
      // Verify Migration Utilities sind verfügbar
      expect(typeof mediaServiceWithUnifiedAPI.getMigrationStatistics).toBe('function');
      expect(typeof mediaServiceWithUnifiedAPI.resetMigrationStatistics).toBe('function');
      
      // Verify andere Original-Methods sind durchgereicht
      expect(mediaServiceWithUnifiedAPI).toHaveProperty('getMedia');
      expect(mediaServiceWithUnifiedAPI).toHaveProperty('deleteMedia');
    });

    test('sollte campaignMediaServiceWithUnifiedAPI alle Original-Methods beibehalten', () => {
      // Verify Upload-Methods sind überschrieben
      expect(typeof campaignMediaServiceWithUnifiedAPI.uploadCampaignMedia).toBe('function');
      expect(typeof campaignMediaServiceWithUnifiedAPI.uploadHeroImage).toBe('function');
      expect(typeof campaignMediaServiceWithUnifiedAPI.uploadAttachment).toBe('function');
      
      // Verify Migration Statistics sind verfügbar
      expect(typeof campaignMediaServiceWithUnifiedAPI.getCampaignMigrationStatistics).toBe('function');
      expect(typeof campaignMediaServiceWithUnifiedAPI.resetCampaignMigrationStatistics).toBe('function');
      
      // Verify andere Original-Methods sind durchgereicht
      expect(campaignMediaServiceWithUnifiedAPI).toHaveProperty('getCampaignAssets');
      expect(campaignMediaServiceWithUnifiedAPI).toHaveProperty('getCampaignHeroImage');
    });

    test('sollte Drop-in Replacement ohne Code-Änderungen funktionieren', async () => {
      const file = createMockFile('drop-in-test.jpg');
      
      // Test Media Service Drop-in Replacement
      const mediaResult = await mediaServiceWithUnifiedAPI.uploadMedia(
        file,
        'test-org',
        'folder-123'
      );
      expect(mediaResult).toBeDefined();

      // Test Campaign Service Drop-in Replacement
      const campaignResult = await campaignMediaServiceWithUnifiedAPI.uploadCampaignMedia({
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'drop-in-campaign',
        uploadType: 'hero-image',
        file
      });
      expect(campaignResult).toBeDefined();
    });
  });

  // =====================
  // CONVENIENCE FUNCTIONS TESTS
  // =====================

  describe('Convenience Functions', () => {
    
    test('sollte uploadCampaignHeroImageUnified korrekt funktionieren', async () => {
      const { uploadCampaignHeroImageUnified } = require('../legacy-wrappers/legacy-campaign-service');
      
      const file = createMockFile('convenience-hero.jpg');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'convenience-campaign',
        file
      };

      const result = await uploadCampaignHeroImageUnified(params);

      expect(result).toBeDefined();
      expect(result.campaignContext.uploadType).toBe('hero-image');
    });

    test('sollte uploadCampaignAttachmentUnified korrekt funktionieren', async () => {
      const { uploadCampaignAttachmentUnified } = require('../legacy-wrappers/legacy-campaign-service');
      
      const file = createMockFile('convenience-attachment.pdf', 1024, 'application/pdf');
      const params = {
        organizationId: 'test-org',
        userId: 'test-user',
        campaignId: 'convenience-campaign',
        file
      };

      const result = await uploadCampaignAttachmentUnified(params);

      expect(result).toBeDefined();
      expect(result.campaignContext.uploadType).toBe('attachment');
    });
  });

  // =====================
  // MIGRATION HELPER TESTS
  // =====================

  describe('Migration Helper Utilities', () => {
    
    test('sollte Migration-Readiness korrekt validieren', () => {
      const readiness = MediaServiceMigrationHelper.validateMigrationReadiness();
      
      expect(readiness).toBeDefined();
      expect(readiness.isReady).toBeDefined();
      expect(readiness.blockers).toBeDefined();
      expect(readiness.recommendations).toBeDefined();
      expect(Array.isArray(readiness.blockers)).toBe(true);
      expect(Array.isArray(readiness.recommendations)).toBe(true);
    });

    test('sollte Codebase Migration Placeholder bereitstellen', async () => {
      const migrationResult = await MediaServiceMigrationHelper.migrateCodebase(
        ['file1.ts', 'file2.ts'],
        'safe'
      );
      
      expect(migrationResult).toBeDefined();
      expect(migrationResult.migratedFiles).toBe(0); // Placeholder Implementation
      expect(migrationResult.totalReplacements).toBe(0);
      expect(Array.isArray(migrationResult.warnings)).toBe(true);
    });
  });

  // =====================
  // ERROR HANDLING & EDGE CASES
  // =====================

  describe('Error Handling & Edge Cases', () => {
    
    test('sollte Non-Unified-API-Errors normal propagieren', async () => {
      const file = createMockFile('error-test.jpg');
      
      // Mock normaler Service Error
      mockMediaService.uploadMedia.mockRejectedValueOnce(new Error('Storage service unavailable'));

      await expect(
        legacyMediaService.uploadMedia(file, 'test-org')
      ).rejects.toThrow('Storage service unavailable');
    });

    test('sollte Unified API Error Detection korrekt funktionieren', () => {
      const unifiedError = new UnifiedUploadError('Test unified error', 'UPLOAD_FAILED');
      const normalError = new Error('Normal error');
      const stringError = { message: 'Contains Unified API text' };
      const codeError = { code: 'UNIFIED_VALIDATION_ERROR' };

      expect((legacyMediaService as any).isUnifiedAPIError(unifiedError)).toBe(true);
      expect((legacyCampaignService as any).isUnifiedAPIError(unifiedError)).toBe(true);
      expect((legacyMediaService as any).isUnifiedAPIError(normalError)).toBe(false);
      expect((legacyMediaService as any).isUnifiedAPIError(stringError)).toBe(true); // Contains "Unified API"
      expect((legacyMediaService as any).isUnifiedAPIError(codeError)).toBe(true); // Starts with "UNIFIED_"
    });

    test('sollte Migration Statistics bei hohem Durchsatz korrekt verfolgen', async () => {
      const file = createMockFile('throughput-test.jpg');
      
      // Mock keine Migration für Performance-Test
      jest.spyOn(legacyMediaService as any, 'shouldUseUnifiedAPI').mockResolvedValue(false);

      // 100 parallele Uploads
      const uploads = new Array(100).fill(null).map((_, i) =>
        legacyMediaService.uploadMedia(file, `org-${i}`)
      );

      await Promise.all(uploads);

      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(100);
      expect(stats.migrationRate).toBe(0); // Alle Legacy
    });

    test('sollte Feature-Flag-Evaluation bei fehlender Context handhaben', async () => {
      jest.spyOn(legacyMediaService as any, 'getCurrentContext').mockReturnValueOnce(null);

      const shouldMigrate = await (legacyMediaService as any).shouldUseUnifiedAPI('media_upload');
      
      // Sollte deterministic fallback haben
      expect(typeof shouldMigrate).toBe('boolean');
    });

    test('sollte Memory-Leaks bei vielen Migration-Calls vermeiden', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const file = createMockFile('memory-test.jpg');
      
      // 500 Uploads mit verschiedenen Organizations für verschiedene Hash-Buckets
      for (let i = 0; i < 500; i++) {
        await legacyMediaService.uploadMedia(file, `memory-org-${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryPerCall = memoryIncrease / 500;

      // Memory-Increase sollte minimal sein (< 1KB pro Call)
      expect(memoryPerCall).toBeLessThan(1024);
    });

    test('sollte Concurrent Migration Decisions korrekt handhaben', async () => {
      const file = createMockFile('concurrent-test.jpg');
      
      // 50 parallele Migration-Decisions
      const decisions = new Array(50).fill(null).map((_, i) => 
        legacyMediaService.uploadMedia(file, `concurrent-org-${i}`)
      );

      const results = await Promise.all(decisions);
      
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.fileName).toBe('concurrent-test.jpg');
      });
      
      const stats = legacyMediaService.getMigrationStatistics();
      expect(stats.totalCalls).toBe(50);
    });

    test('sollte Migration Percentage Edge Cases korrekt handhaben', () => {
      // Test 0% Migration
      jest.spyOn(legacyMediaService as any, 'getMigrationPercentage').mockReturnValueOnce(0);
      jest.spyOn(legacyMediaService as any, 'hashString').mockReturnValueOnce(50);
      
      const noMigration = (legacyMediaService as any).shouldUseUnifiedAPI('test_operation');
      Promise.resolve(noMigration).then(result => expect(result).toBe(false));

      // Test 100% Migration
      jest.spyOn(legacyMediaService as any, 'getMigrationPercentage').mockReturnValueOnce(100);
      
      const fullMigration = (legacyMediaService as any).shouldUseUnifiedAPI('test_operation');
      Promise.resolve(fullMigration).then(result => expect(result).toBe(true));
    });
  });

  // =====================
  // PERFORMANCE & BENCHMARKS
  // =====================

  describe('Performance & Benchmarks', () => {
    
    test('sollte Migration-Decision unter 1ms durchführen', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        await (legacyMediaService as any).shouldUseUnifiedAPI('media_upload');
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 1000;
      
      expect(averageTime).toBeLessThan(1); // < 1ms per decision
    });

    test('sollte Hash-Berechnung Performance optimiert haben', () => {
      const testStrings = new Array(10000).fill(null).map((_, i) => `org-${i}-performance-test`);
      
      const startTime = performance.now();
      
      testStrings.forEach(str => {
        (legacyMediaService as any).hashString(str);
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const timePerHash = totalTime / testStrings.length;
      
      expect(timePerHash).toBeLessThan(0.01); // < 0.01ms per hash
    });

    test('sollte Migration Statistics Overhead minimal halten', async () => {
      const file = createMockFile('overhead-test.jpg');
      
      const startTime = performance.now();
      
      // 1000 Uploads für Overhead-Messung
      for (let i = 0; i < 1000; i++) {
        await legacyMediaService.uploadMedia(file, `overhead-org-${i}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const timePerUpload = totalTime / 1000;
      
      // Statistics-Overhead sollte minimal sein
      expect(timePerUpload).toBeLessThan(10); // < 10ms per upload including statistics
    });

    test('sollte Memory-Usage bei Migration Statistics konstant halten', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate lots of statistics
      for (let i = 0; i < 10000; i++) {
        (legacyMediaService as any).trackMigrationCall('uploadMedia');
      }
      
      const afterStatsMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterStatsMemory - initialMemory;
      
      // Memory increase should be minimal for statistics
      expect(memoryIncrease).toBeLessThan(100 * 1024); // < 100KB for 10k stat entries
    });
  });
});