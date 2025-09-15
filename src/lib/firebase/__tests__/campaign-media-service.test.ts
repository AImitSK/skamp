// src/lib/firebase/__tests__/campaign-media-service.test.ts
import {
  campaignMediaService,
  uploadCampaignHeroImage,
  uploadCampaignAttachment,
  previewCampaignStorage,
  getCampaignUploadFeatureStatus
} from '../campaign-media-service';

// Mock dependencies
jest.mock('../smart-upload-router');
jest.mock('../media-service');
jest.mock('../../components/campaigns/utils/campaign-context-builder');
jest.mock('../../components/campaigns/config/campaign-feature-flags');

describe('CampaignMediaService', () => {
  
  const mockUploadParams = {
    organizationId: 'org123',
    userId: 'user123',
    campaignId: 'campaign123',
    campaignName: 'Test Campaign',
    selectedProjectId: 'project123',
    selectedProjectName: 'Test Project',
    clientId: 'client123',
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadCampaignMedia', () => {
    it('sollte Campaign Media mit Smart Router hochladen', async () => {
      // Mock Feature Flags als aktiviert
      const mockCreateFeatureFlagContext = require('../../components/campaigns/config/campaign-feature-flags').createFeatureFlagContext;
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      const mockIsUploadTypeSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isUploadTypeSmartRouterEnabled;
      const mockGetMigrationStatus = require('../../components/campaigns/config/campaign-feature-flags').getMigrationStatus;

      mockCreateFeatureFlagContext.mockReturnValue({});
      mockIsCampaignSmartRouterEnabled.mockReturnValue(true);
      mockIsUploadTypeSmartRouterEnabled.mockReturnValue(true);
      mockGetMigrationStatus.mockReturnValue({ useLegacyFallback: true });

      // Mock Context Builder
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'campaign',
        uploadSubType: 'hero-image',
        autoTags: ['campaign:campaign123']
      });
      
      mockCampaignContextBuilder.buildStorageConfig.mockReturnValue({
        basePath: 'organizations/org123/media',
        subPath: 'Projekte/Test Project/Kampagnen/Test Campaign',
        storageType: 'organized',
        isOrganized: true
      });

      // Mock Smart Upload Router
      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'organizations/org123/media/Projekte/Test Project',
        service: 'smartUploadRouter',
        asset: { id: 'asset123', downloadUrl: 'https://test.com/asset.jpg' },
        uploadMethod: 'organized'
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      });

      expect(result.usedSmartRouter).toBe(true);
      expect(result.storageInfo.type).toBe('organized');
      expect(result.featureFlags.smartRouterEnabled).toBe(true);
      expect(mockSmartUploadRouter.smartUpload).toHaveBeenCalled();
    });

    it('sollte auf Legacy Upload zurückfallen', async () => {
      // Mock Feature Flags als deaktiviert
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      const mockIsUploadTypeSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isUploadTypeSmartRouterEnabled;
      const mockGetMigrationStatus = require('../../components/campaigns/config/campaign-feature-flags').getMigrationStatus;

      mockIsCampaignSmartRouterEnabled.mockReturnValue(false);
      mockIsUploadTypeSmartRouterEnabled.mockReturnValue(false);
      mockGetMigrationStatus.mockReturnValue({ useLegacyFallback: true });

      // Mock Media Service
      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.uploadMedia.mockResolvedValue({
        id: 'asset123',
        downloadUrl: 'https://test.com/asset.jpg'
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      });

      expect(result.usedSmartRouter).toBe(false);
      expect(result.featureFlags.fallbackUsed).toBe(true);
      expect(mockMediaService.uploadMedia).toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn weder Smart Router noch Fallback verfügbar', async () => {
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      const mockIsUploadTypeSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isUploadTypeSmartRouterEnabled;
      const mockGetMigrationStatus = require('../../components/campaigns/config/campaign-feature-flags').getMigrationStatus;

      mockIsCampaignSmartRouterEnabled.mockReturnValue(false);
      mockIsUploadTypeSmartRouterEnabled.mockReturnValue(false);
      mockGetMigrationStatus.mockReturnValue({ useLegacyFallback: false });

      await expect(campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      })).rejects.toThrow('Upload nicht möglich');
    });
  });

  describe('uploadHeroImage', () => {
    it('sollte Hero Image Upload ausführen', async () => {
      // Setup mocks
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      mockIsCampaignSmartRouterEnabled.mockReturnValue(true);

      const result = await uploadCampaignHeroImage(mockUploadParams);

      expect(result).toBeDefined();
    });

    it('sollte Validierung für Hero Images durchführen', async () => {
      const nonImageFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(campaignMediaService.uploadHeroImage({
        ...mockUploadParams,
        file: nonImageFile
      })).rejects.toThrow('Hero Image muss eine Bilddatei sein');
    });
  });

  describe('uploadAttachment', () => {
    it('sollte Attachment Upload ausführen', async () => {
      const result = await uploadCampaignAttachment(mockUploadParams);

      expect(result).toBeDefined();
    });
  });

  describe('getCampaignAssets', () => {
    it('sollte Campaign Assets abrufen und kategorisieren', async () => {
      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue([
        {
          id: 'asset1',
          tags: ['campaign:campaign123', 'storage:organized']
        },
        {
          id: 'asset2',
          tags: ['campaign:campaign123']
        },
        {
          id: 'asset3',
          tags: ['campaign:other123']
        }
      ]);

      const result = await campaignMediaService.getCampaignAssets({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      expect(result.assets).toHaveLength(2);
      expect(result.storageInfo.organized).toHaveLength(1);
      expect(result.storageInfo.unorganized).toHaveLength(1);
    });
  });

  describe('getCampaignHeroImage', () => {
    it('sollte Campaign Hero Image finden', async () => {
      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue([
        {
          id: 'asset1',
          tags: ['campaign:campaign123', 'upload-type:hero-image']
        }
      ]);

      const result = await campaignMediaService.getCampaignHeroImage({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('asset1');
    });

    it('sollte null zurückgeben wenn kein Hero Image gefunden', async () => {
      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const result = await campaignMediaService.getCampaignHeroImage({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      expect(result).toBeNull();
    });
  });

  describe('previewCampaignStoragePath', () => {
    it('sollte Storage Pfad Vorschau generieren', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({});
      mockCampaignContextBuilder.buildStorageConfig.mockReturnValue({
        basePath: 'organizations/org123/media',
        subPath: 'Projekte/Test Project',
        storageType: 'organized',
        isOrganized: true
      });
      mockCampaignContextBuilder.generateStoragePreview.mockReturnValue('organizations/org123/media/Projekte/Test Project/test.jpg');

      const result = await campaignMediaService.previewCampaignStoragePath({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'hero-image',
        fileName: 'test.jpg'
      });

      expect(result.path).toContain('organizations/org123/media');
      expect(result.storageType).toBe('organized');
      expect(result.isHybrid).toBe(true);
    });
  });

  describe('getCampaignUploadFeatureStatus', () => {
    it('sollte Feature Status zurückgeben', () => {
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      const mockCampaignFeatureFlags = require('../../components/campaigns/config/campaign-feature-flags').campaignFeatureFlags;
      const mockIsUploadTypeSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isUploadTypeSmartRouterEnabled;

      mockIsCampaignSmartRouterEnabled.mockReturnValue(true);
      mockCampaignFeatureFlags.isFeatureEnabled.mockReturnValue({ isEnabled: true });
      mockIsUploadTypeSmartRouterEnabled.mockReturnValue(true);

      const result = getCampaignUploadFeatureStatus({
        organizationId: 'org123',
        userId: 'user123'
      });

      expect(result.smartRouterAvailable).toBe(true);
      expect(result.hybridStorageAvailable).toBe(true);
      expect(result.uploadTypesEnabled['hero-image']).toBe(true);
    });
  });

  describe('Hybrid Architecture Tests', () => {
    it('sollte Projekt-zugeordnete Campaign mit organisierter Struktur handhaben', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        clientId: 'client123',
        isHybridStorage: true,
        uploadSubType: 'hero-image',
        autoTags: ['campaign:campaign123', 'storage:organized', 'project:project123']
      });

      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'organizations/org123/media/Projekte/Test Project/Kampagnen/Test Campaign',
        service: 'smartUploadRouter',
        uploadMethod: 'organized'
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image',
        selectedProjectId: 'project123'
      });

      expect(result.storageInfo.type).toBe('organized');
      expect(result.storageInfo.isHybridArchitecture).toBe(true);
      expect(result.uploadContext.autoTags).toContain('storage:organized');
    });

    it('sollte Standalone Campaign mit unorganisierter Struktur handhaben', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        campaignId: 'campaign123',
        isHybridStorage: false,
        uploadSubType: 'attachment',
        autoTags: ['campaign:campaign123', 'storage:unorganized']
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'attachment',
        selectedProjectId: undefined
      });

      expect(result.storageInfo.type).toBe('unorganized');
      expect(result.storageInfo.isHybridArchitecture).toBe(false);
      expect(result.uploadContext.autoTags).toContain('storage:unorganized');
    });

    it('sollte Migration zwischen organisiert/unorganisiert handhaben', async () => {
      // Erst unorganisiert
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValueOnce({
        organizationId: 'org123',
        campaignId: 'campaign123',
        isHybridStorage: false,
        uploadSubType: 'hero-image'
      });

      await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      });

      // Dann organisiert nach Projekt-Zuordnung
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValueOnce({
        organizationId: 'org123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        isHybridStorage: true,
        uploadSubType: 'hero-image'
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image',
        selectedProjectId: 'project123'
      });

      expect(result.storageInfo.type).toBe('organized');
      expect(result.storageInfo.migrationInfo).toBeDefined();
    });

    it('sollte Cross-Tenant-Isolation sicherstellen', async () => {
      const otherOrgParams = {
        ...mockUploadParams,
        organizationId: 'other-org',
        campaignId: 'other-campaign'
      };

      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.validateCampaignContext.mockReturnValue({
        isValid: false,
        errors: ['Cross-tenant access nicht erlaubt']
      });

      await expect(campaignMediaService.uploadCampaignMedia({
        ...otherOrgParams,
        uploadType: 'hero-image'
      })).rejects.toThrow('Cross-tenant access');
    });
  });

  describe('Upload Type Tests', () => {
    it('sollte Boilerplate Asset Upload handhaben', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        campaignId: 'campaign123',
        uploadSubType: 'boilerplate-asset',
        autoTags: ['campaign:campaign123', 'upload-type:boilerplate-asset']
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'boilerplate-asset'
      });

      expect(result.uploadContext.uploadSubType).toBe('boilerplate-asset');
      expect(result.uploadContext.autoTags).toContain('upload-type:boilerplate-asset');
    });

    it('sollte Generated Content Upload handhaben', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        uploadSubType: 'generated-content',
        autoTags: ['campaign:campaign123', 'upload-type:generated-content']
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'generated-content',
        selectedProjectId: 'project123'
      });

      expect(result.uploadContext.uploadSubType).toBe('generated-content');
      expect(result.uploadContext.requiresProject).toBe(true);
    });

    it('sollte Multi-File Upload handhaben', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['test3'], 'test3.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      ];

      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'organizations/org123/media',
        service: 'smartUploadRouter',
        assets: files.map((f, i) => ({ id: `asset${i}`, downloadUrl: `https://test.com/${f.name}` }))
      });

      const result = await campaignMediaService.uploadMultipleCampaignAssets({
        ...mockUploadParams,
        files: files,
        uploadType: 'attachment'
      });

      expect(result.uploadResults).toHaveLength(3);
      expect(result.uploadResults.every(r => r.success)).toBe(true);
    });
  });

  describe('Pipeline Integration Tests', () => {
    it('sollte Pipeline-Stage-basierte Ordner-Organisation verwenden', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.buildCampaignContext.mockReturnValue({
        organizationId: 'org123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        pipelineStage: 'konzeption',
        uploadSubType: 'hero-image'
      });

      mockCampaignContextBuilder.buildStorageConfig.mockReturnValue({
        basePath: 'organizations/org123/media',
        subPath: 'Projekte/Test Project/Kampagnen/Test Campaign/Konzeption',
        storageType: 'organized',
        pipelineIntegration: true
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image',
        pipelineStage: 'konzeption'
      });

      expect(result.storageInfo.subPath).toContain('Konzeption');
      expect(result.storageInfo.pipelineIntegration).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('sollte Network-Fehler elegant behandeln', async () => {
      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockRejectedValue(new Error('Network Error'));

      const mockGetMigrationStatus = require('../../components/campaigns/config/campaign-feature-flags').getMigrationStatus;
      mockGetMigrationStatus.mockReturnValue({ useLegacyFallback: true });

      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.uploadMedia.mockResolvedValue({
        id: 'fallback-asset123',
        downloadUrl: 'https://test.com/fallback.jpg'
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      });

      expect(result.usedSmartRouter).toBe(false);
      expect(result.featureFlags.fallbackUsed).toBe(true);
      expect(result.errorInfo.originalError).toBe('Network Error');
    });

    it('sollte Storage-Quota-Überschreitung behandeln', async () => {
      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      })).rejects.toThrow('Storage quota exceeded');
    });

    it('sollte Campaign-Validierungs-Fehler behandeln', async () => {
      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.validateCampaignContext.mockReturnValue({
        isValid: false,
        errors: ['Campaign ID ist erforderlich', 'Organization ID ist erforderlich']
      });

      await expect(campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        campaignId: '',
        organizationId: ''
      })).rejects.toThrow('Campaign ID ist erforderlich');
    });
  });

  describe('Edge Cases Tests', () => {
    it('sollte leere Campaign Assets handhaben', async () => {
      const mockMediaService = require('../media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const result = await campaignMediaService.getCampaignAssets({
        organizationId: 'org123',
        campaignId: 'empty-campaign'
      });

      expect(result.assets).toHaveLength(0);
      expect(result.storageInfo.organized).toHaveLength(0);
      expect(result.storageInfo.unorganized).toHaveLength(0);
    });

    it('sollte extreme Dateinamen handhaben', async () => {
      const extremeFileName = 'ä'.repeat(255) + '.jpg';
      const file = new File(['test'], extremeFileName, { type: 'image/jpeg' });

      const mockCampaignContextBuilder = require('../../components/campaigns/utils/campaign-context-builder').campaignContextBuilder;
      mockCampaignContextBuilder.sanitizeFileName = jest.fn().mockReturnValue('sanitized-filename.jpg');

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        file: file,
        uploadType: 'hero-image'
      });

      expect(mockCampaignContextBuilder.sanitizeFileName).toHaveBeenCalledWith(extremeFileName);
    });

    it('sollte concurrent Uploads handhaben', async () => {
      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          path: 'test-path',
          service: 'smartUploadRouter',
          asset: { id: 'concurrent-asset', downloadUrl: 'https://test.com/concurrent.jpg' }
        }), 100))
      );

      const uploadPromises = Array.from({ length: 5 }, (_, i) => 
        campaignMediaService.uploadCampaignMedia({
          ...mockUploadParams,
          file: new File(['test' + i], `test${i}.jpg`, { type: 'image/jpeg' }),
          uploadType: 'attachment'
        })
      );

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('sollte Feature-Flag-Änderungen während Upload handhaben', async () => {
      let smartRouterEnabled = true;
      const mockIsCampaignSmartRouterEnabled = require('../../components/campaigns/config/campaign-feature-flags').isCampaignSmartRouterEnabled;
      mockIsCampaignSmartRouterEnabled.mockImplementation(() => smartRouterEnabled);

      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockImplementation(() => {
        smartRouterEnabled = false; // Feature Flag während Upload deaktiviert
        return Promise.resolve({
          path: 'test-path',
          service: 'smartUploadRouter',
          asset: { id: 'feature-toggle-asset', downloadUrl: 'https://test.com/toggle.jpg' }
        });
      });

      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        uploadType: 'hero-image'
      });

      expect(result.usedSmartRouter).toBe(true); // Upload wurde mit aktiviertem Feature gestartet
      expect(result.featureFlags.changedDuringUpload).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('sollte große Dateien effizient handhaben', async () => {
      const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' }); // 50MB

      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'test-path',
        service: 'smartUploadRouter',
        asset: { id: 'large-asset', downloadUrl: 'https://test.com/large.jpg' },
        processingTime: 5000
      });

      const startTime = Date.now();
      const result = await campaignMediaService.uploadCampaignMedia({
        ...mockUploadParams,
        file: largeFile,
        uploadType: 'hero-image'
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.performanceMetrics.uploadTime).toBeLessThan(10000);
      expect(endTime - startTime).toBeLessThan(15000);
    });

    it('sollte Memory Management bei Multi-Upload testen', async () => {
      const files = Array.from({ length: 20 }, (_, i) => 
        new File(['x'.repeat(1024 * 1024)], `file${i}.jpg`, { type: 'image/jpeg' }) // 1MB pro Datei
      );

      const mockSmartUploadRouter = require('../smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'test-path',
        service: 'smartUploadRouter',
        assets: files.map((_, i) => ({ id: `memory-asset-${i}`, downloadUrl: `https://test.com/memory${i}.jpg` }))
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await campaignMediaService.uploadMultipleCampaignAssets({
        ...mockUploadParams,
        files: files,
        uploadType: 'attachment'
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.uploadResults).toHaveLength(20);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Weniger als 100MB Speicher-Anstieg
    });
  });
});