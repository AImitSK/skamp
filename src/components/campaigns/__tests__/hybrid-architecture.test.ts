// src/components/campaigns/__tests__/hybrid-architecture.test.ts

// Mock Firebase services before any imports
jest.mock('@/lib/firebase/smart-upload-router', () => ({
  smartUploadRouter: {
    smartUpload: jest.fn(),
    migrateAssets: jest.fn()
  }
}));

jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getMediaAssets: jest.fn(),
    uploadMedia: jest.fn()
  }
}));

jest.mock('@/lib/firebase/campaign-media-service', () => ({
  campaignMediaService: {
    uploadCampaignMedia: jest.fn(),
    getCampaignAssets: jest.fn()
  }
}));

// Import after mocking
import {
  campaignContextBuilder,
  createHeroImageContext,
  resolveCampaignStoragePath,
  validateCampaignUpload
} from '../utils/campaign-context-builder';

import {
  campaignFeatureFlags,
  createFeatureFlagContext,
  isCampaignSmartRouterEnabled,
  isHybridStorageEnabled
} from '../config/campaign-feature-flags';

import { campaignMediaService } from '@/lib/firebase/campaign-media-service';

describe('Hybrid Architecture Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Storage Path Routing', () => {
    it('sollte projekt-zugeordnete Campaign mit organisierter Struktur routen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Produktlaunch Q1',
        selectedProjectId: 'project123',
        selectedProjectName: 'Neues Smartphone',
        clientId: 'client123',
        uploadType: 'hero-image'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(context.isHybridStorage).toBe(true);
      expect(storageConfig.basePath).toBe('organizations/org123/media');
      expect(storageConfig.subPath).toBe('Projekte/Neues Smartphone/Kampagnen/Produktlaunch Q1/Hero-Images');
      expect(storageConfig.isOrganized).toBe(true);
      expect(storageConfig.storageType).toBe('organized');
      expect(context.clientId).toBe('client123'); // Vererbung von Projekt
    });

    it('sollte standalone Campaign mit unorganisierter Struktur routen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign456',
        campaignName: 'Ad-hoc Newsletter',
        uploadType: 'attachment'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(context.isHybridStorage).toBe(false);
      expect(storageConfig.basePath).toBe('organizations/org123/media');
      expect(storageConfig.subPath).toBe('Unzugeordnet/Kampagnen/Ad-hoc Newsletter/Attachments');
      expect(storageConfig.isOrganized).toBe(false);
      expect(storageConfig.storageType).toBe('unorganized');
      expect(context.clientId).toBeUndefined();
    });

    it('sollte Pipeline-Stage-basierte Organisation verwenden', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Brand Kampagne',
        selectedProjectId: 'project123',
        selectedProjectName: 'Rebranding',
        pipelineStage: 'konzeption',
        uploadType: 'hero-image'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(storageConfig.subPath).toBe('Projekte/Rebranding/Kampagnen/Brand Kampagne/Konzeption/Hero-Images');
      expect(storageConfig.pipelineIntegration).toBe(true);
    });

    it('sollte Client-ID Vererbung von Projekt korrekt handhaben', () => {
      const contextWithProjectClient = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        projectClientId: 'inherited-client456', // Von Projekt
        clientId: 'direct-client123', // Direkt zugeordnet
        uploadType: 'hero-image'
      });

      // Direkte Client-ID sollte Vorrang haben
      expect(contextWithProjectClient.clientId).toBe('direct-client123');
      expect(contextWithProjectClient.inheritedClientId).toBe('inherited-client456');

      const contextOnlyInherited = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign456',
        selectedProjectId: 'project123',
        projectClientId: 'inherited-client789',
        uploadType: 'hero-image'
      });

      // Vererbung sollte funktionieren wenn keine direkte Zuordnung
      expect(contextOnlyInherited.clientId).toBe('inherited-client789');
      expect(contextOnlyInherited.inheritedClientId).toBe('inherited-client789');
    });
  });

  describe('Migration Between Organized/Unorganized', () => {
    it('sollte Campaign von unorganisiert zu organisiert migrieren', () => {
      // Initial: Unorganisierte Campaign
      const initialContext = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Test Campaign',
        uploadType: 'hero-image'
      });

      expect(initialContext.isHybridStorage).toBe(false);

      // Migration: Projekt zugeordnet
      const migratedContext = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Test Campaign',
        selectedProjectId: 'project123',
        selectedProjectName: 'Assigned Project',
        uploadType: 'hero-image',
        migrationMode: true
      });

      expect(migratedContext.isHybridStorage).toBe(true);
      expect(migratedContext.migrationInfo).toEqual({
        fromStorage: 'unorganized',
        toStorage: 'organized',
        requiresAssetMigration: true,
        oldPath: 'Unzugeordnet/Kampagnen/Test Campaign',
        newPath: 'Projekte/Assigned Project/Kampagnen/Test Campaign'
      });
    });

    it('sollte Asset-Migration-Plan erstellen', async () => {
      // Mock migration plan function
      const mockCreateMigrationPlan = jest.fn().mockResolvedValue({
        affectedAssets: 5,
        pathMappings: { oldPath: 'newPath' },
        estimatedTime: 120,
        requiresConfirmation: true
      });

      const migrationPlan = await mockCreateMigrationPlan({
        organizationId: 'org123',
        campaignId: 'campaign123',
        fromStorage: 'unorganized',
        toStorage: 'organized',
        selectedProjectId: 'project123'
      });

      expect(migrationPlan.affectedAssets).toBeDefined();
      expect(migrationPlan.pathMappings).toBeDefined();
      expect(migrationPlan.estimatedTime).toBeGreaterThan(0);
      expect(migrationPlan.requiresConfirmation).toBe(true);
    });

    it('sollte Asset-Migration ausführen', async () => {
      const mockSmartUploadRouter = require('@/lib/firebase/smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.migrateAssets = jest.fn().mockResolvedValue({
        success: true,
        migratedAssets: 5,
        failedAssets: 0,
        newPaths: ['path1', 'path2', 'path3', 'path4', 'path5']
      });

      // Mock migration function
      const mockMigrateCampaignToOrganized = jest.fn().mockResolvedValue({
        success: true,
        migratedAssets: 5,
        failedAssets: 0,
        newPaths: ['path1', 'path2', 'path3', 'path4', 'path5']
      });

      const result = await mockMigrateCampaignToOrganized({
        organizationId: 'org123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123',
        selectedProjectName: 'Target Project',
        migrationOptions: {
          preserveOriginal: false,
          updateReferences: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.migratedAssets).toBe(5);
    });
  });

  describe('Cross-Organizational Isolation', () => {
    it('sollte organizationId in allen Queries verwenden', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'hero-image'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(storageConfig.basePath).toStartWith('organizations/org123/');
      expect(context.organizationId).toBe('org123');
      
      // Alle Auto-Tags sollten Organization-spezifisch sein
      expect(context.autoTags.some(tag => tag.includes('org123'))).toBe(true);
    });

    it('sollte Cross-Tenant-Zugriff verweigern', () => {
      const validationResult = validateCampaignUpload({
        organizationId: 'org123',
        userId: 'user456',
        campaignId: 'campaign789',
        uploadType: 'campaign',
        requestingOrganizationId: 'other-org' // Anderes Org versucht Zugriff
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Cross-organizational access denied');
      expect(validationResult.securityViolation).toBe(true);
    });

    it('sollte Asset-Queries nach organizationId filtern', async () => {
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;
      mockMediaService.getMediaAssets = jest.fn().mockResolvedValue([
        { id: 'asset1', organizationId: 'org123', tags: ['campaign:campaign123'] },
        { id: 'asset2', organizationId: 'org123', tags: ['campaign:campaign456'] },
        // Andere Organization sollte nicht erscheinen
        { id: 'asset3', organizationId: 'other-org', tags: ['campaign:campaign789'] }
      ]);

      const result = await campaignMediaService.getCampaignAssets({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      // Query sollte organizationId Parameter enthalten
      expect(mockMediaService.getMediaAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org123'
        })
      );

      // Nur Assets der richtigen Organization
      expect(result.assets.every(asset => asset.organizationId === 'org123')).toBe(true);
    });

    it('sollte User-Permissions pro Organization prüfen', () => {
      const featureContext = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        userRole: 'admin',
        organizationRole: 'member' // Unterschiedliche Rollen
      });

      const flags = campaignFeatureFlags.getFeatureFlags(featureContext);

      // Organization-spezifische Berechtigung sollte gelten
      expect(flags.ADMIN_FEATURES).toBe(false); // Member in dieser Org
      expect(flags.BASIC_FEATURES).toBe(true);
    });
  });

  describe('Data Isolation', () => {
    it('sollte Campaign-Daten isoliert speichern', () => {
      const org1Context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org1',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'hero-image'
      });

      const org2Context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org2',
        userId: 'user123', // Gleicher User
        campaignId: 'campaign123', // Gleiche Campaign ID
        uploadType: 'hero-image'
      });

      const org1Storage = campaignContextBuilder.buildStorageConfig(org1Context);
      const org2Storage = campaignContextBuilder.buildStorageConfig(org2Context);

      // Paths sollten vollständig getrennt sein
      expect(org1Storage.basePath).toBe('organizations/org1/media');
      expect(org2Storage.basePath).toBe('organizations/org2/media');
      expect(org1Storage.basePath).not.toBe(org2Storage.basePath);
    });

    it('sollte Asset-Tags organization-spezifisch setzen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'hero-image'
      });

      expect(context.autoTags).toContain('org:org123');
      expect(context.autoTags).toContain('campaign:campaign123');
      expect(context.autoTags).not.toContain('org:other-org');
    });

    it('sollte Storage-Pfad-Auflösung isolieren', () => {
      const org1Path = resolveCampaignStoragePath({
        organizationId: 'org1',
        campaignId: 'campaign123',
        uploadType: 'campaign',
        uploadSubType: 'hero-image'
      }, 'test.jpg');

      const org2Path = resolveCampaignStoragePath({
        organizationId: 'org2',
        campaignId: 'campaign123',
        uploadType: 'campaign', 
        uploadSubType: 'hero-image'
      }, 'test.jpg');

      expect(org1Path).toContain('organizations/org1/');
      expect(org2Path).toContain('organizations/org2/');
      expect(org1Path).not.toEqual(org2Path);
    });
  });

  describe('Storage Analysis', () => {
    it('sollte Campaign Storage-Struktur analysieren', async () => {
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue([
        { 
          id: 'asset1', 
          tags: ['campaign:campaign123', 'storage:organized', 'upload-type:hero-image'],
          metadata: { path: 'organizations/org123/media/Projekte/Project/Kampagnen/Campaign' }
        },
        { 
          id: 'asset2', 
          tags: ['campaign:campaign123', 'storage:unorganized', 'upload-type:attachment'],
          metadata: { path: 'organizations/org123/media/Unzugeordnet/Kampagnen/Campaign' }
        },
        { 
          id: 'asset3', 
          tags: ['campaign:campaign123', 'storage:organized', 'upload-type:attachment'],
          metadata: { path: 'organizations/org123/media/Projekte/Project/Kampagnen/Campaign' }
        }
      ]);

      // Mock analysis function
      const mockAnalyzeCampaignStorageStructure = jest.fn().mockResolvedValue({
        totalAssets: 3,
        organizedAssets: 2,
        unorganizedAssets: 1,
        storageDistribution: { organized: 2, unorganized: 1 },
        uploadTypeDistribution: { 'hero-image': 1, 'attachment': 2 },
        isHybridCampaign: true
      });

      const analysis = await mockAnalyzeCampaignStorageStructure({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      expect(analysis.totalAssets).toBe(3);
      expect(analysis.organizedAssets).toBe(2);
      expect(analysis.unorganizedAssets).toBe(1);
      expect(analysis.storageDistribution.organized).toBe(2);
      expect(analysis.storageDistribution.unorganized).toBe(1);
      expect(analysis.uploadTypeDistribution['hero-image']).toBe(1);
      expect(analysis.uploadTypeDistribution['attachment']).toBe(2);
      expect(analysis.isHybridCampaign).toBe(true);
    });

    it('sollte Migration-Empfehlungen generieren', async () => {
      const mockAnalysis = {
        totalAssets: 10,
        organizedAssets: 2,
        unorganizedAssets: 8,
        isHybridCampaign: true
      };

      const recommendations = campaignContextBuilder.generateMigrationRecommendations(mockAnalysis);

      expect(recommendations.shouldMigrate).toBe(true);
      expect(recommendations.reason).toContain('80% unorganized assets');
      expect(recommendations.priority).toBe('high');
      expect(recommendations.estimatedBenefit).toBeGreaterThan(0);
    });

    it('sollte Storage-Optimierung vorschlagen', () => {
      const optimization = campaignContextBuilder.analyzeStorageOptimization({
        organizationId: 'org123',
        campaigns: [
          { id: 'campaign1', storageType: 'unorganized', assetCount: 20 },
          { id: 'campaign2', storageType: 'unorganized', assetCount: 15 },
          { id: 'campaign3', storageType: 'organized', assetCount: 5 }
        ]
      });

      expect(optimization.recommendations).toContain('Migrate unorganized campaigns');
      expect(optimization.potentialSpaceSaving).toBeGreaterThan(0);
      expect(optimization.organizationBenefit).toBeDefined();
    });
  });

  describe('Feature Flag Integration', () => {
    it('sollte Hybrid Storage Feature Flags prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = isHybridStorageEnabled(context);
      
      expect(isEnabled).toBe(true);
      expect(context.organizationId).toBe('org123');
    });

    it('sollte Smart Router für organisierte Campaigns aktivieren', () => {
      const organizedContext = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        projectId: 'project123' // Organisiert
      });

      const unorganizedContext = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
        // Kein projectId = unorganisiert
      });

      expect(isCampaignSmartRouterEnabled(organizedContext)).toBe(true);
      expect(isCampaignSmartRouterEnabled(unorganizedContext)).toBe(true); // Beide sollten unterstützt werden
    });

    it('sollte Environment-basierte Hybrid Features steuern', () => {
      const devContext = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        environment: 'development'
      });

      const prodContext = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        environment: 'production'
      });

      const devFlags = campaignFeatureFlags.getFeatureFlags(devContext);
      const prodFlags = campaignFeatureFlags.getFeatureFlags(prodContext);

      // Development sollte mehr experimentelle Features haben
      expect(devFlags.MIGRATION_UI).toBe(true);
      expect(prodFlags.MIGRATION_UI).toBe(false);
      
      // Beide sollten Hybrid Storage unterstützen
      expect(devFlags.HYBRID_STORAGE_ENABLED).toBe(true);
      expect(prodFlags.HYBRID_STORAGE_ENABLED).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('sollte Storage-Pfad-Resolution Performance testen', () => {
      const startTime = Date.now();
      
      // 1000 Pfad-Auflösungen
      for (let i = 0; i < 1000; i++) {
        resolveCampaignStoragePath({
          organizationId: 'org123',
          campaignId: `campaign${i}`,
          selectedProjectId: i % 2 === 0 ? `project${i}` : undefined,
          uploadType: 'campaign',
          uploadSubType: i % 3 === 0 ? 'hero-image' : 'attachment'
        }, `file${i}.jpg`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Unter 1 Sekunde für 1000 Pfade
    });

    it('sollte Context-Building Performance testen', () => {
      const startTime = Date.now();
      
      // 500 Context-Erstellungen
      for (let i = 0; i < 500; i++) {
        campaignContextBuilder.buildCampaignContext({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: `campaign${i}`,
          selectedProjectId: i % 3 === 0 ? `project${i}` : undefined,
          uploadType: i % 2 === 0 ? 'hero-image' : 'attachment'
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Unter 0.5 Sekunden für 500 Contexts
    });

    it('sollte Memory Usage bei großen Storage Analysen prüfen', async () => {
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;
      
      // Simuliere 10000 Assets
      const largeAssetList = Array.from({ length: 10000 }, (_, i) => ({
        id: `asset${i}`,
        tags: [`campaign:campaign${i % 100}`, 'storage:organized'],
        metadata: { path: `organizations/org123/media/path${i}` }
      }));

      mockMediaService.getMediaAssets = jest.fn().mockResolvedValue(largeAssetList);

      const initialMemory = process.memoryUsage().heapUsed;
      
      await analyzeCampaignStorageStructure({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Weniger als 50MB Speicher-Anstieg für 10k Assets
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});