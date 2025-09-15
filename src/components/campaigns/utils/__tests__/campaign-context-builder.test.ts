// src/components/campaigns/utils/__tests__/campaign-context-builder.test.ts
import { 
  campaignContextBuilder,
  createHeroImageContext,
  createAttachmentContext,
  resolveCampaignStoragePath,
  validateCampaignUpload
} from '../campaign-context-builder';

describe('CampaignContextBuilder', () => {
  
  describe('buildCampaignContext', () => {
    it('sollte Campaign Context mit Projekt erstellen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Test Campaign',
        selectedProjectId: 'project123',
        selectedProjectName: 'Test Project',
        uploadType: 'hero-image',
        clientId: 'client123'
      });

      expect(context.organizationId).toBe('org123');
      expect(context.userId).toBe('user123');
      expect(context.campaignId).toBe('campaign123');
      expect(context.selectedProjectId).toBe('project123');
      expect(context.uploadSubType).toBe('hero-image');
      expect(context.isHybridStorage).toBe(true);
      expect(context.autoTags).toContain('campaign:campaign123');
      expect(context.autoTags).toContain('upload-type:hero-image');
      expect(context.autoTags).toContain('storage:organized');
    });

    it('sollte Campaign Context ohne Projekt erstellen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'attachment'
      });

      expect(context.isHybridStorage).toBe(false);
      expect(context.selectedProjectId).toBeUndefined();
      expect(context.autoTags).toContain('storage:unorganized');
    });
  });

  describe('buildStorageConfig', () => {
    it('sollte organisierte Storage-Konfiguration erstellen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Test Campaign',
        selectedProjectId: 'project123',
        selectedProjectName: 'Test Project',
        uploadType: 'hero-image'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(storageConfig.basePath).toBe('organizations/org123/media');
      expect(storageConfig.subPath).toBe('Projekte/Test Project/Kampagnen/Test Campaign/Hero-Images');
      expect(storageConfig.isOrganized).toBe(true);
      expect(storageConfig.storageType).toBe('organized');
    });

    it('sollte unorganisierte Storage-Konfiguration erstellen', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: 'Test Campaign',
        uploadType: 'attachment'
      });

      const storageConfig = campaignContextBuilder.buildStorageConfig(context);

      expect(storageConfig.basePath).toBe('organizations/org123/media');
      expect(storageConfig.subPath).toBe('Unzugeordnet/Kampagnen/Test Campaign/Attachments');
      expect(storageConfig.isOrganized).toBe(false);
      expect(storageConfig.storageType).toBe('unorganized');
    });
  });

  describe('validateCampaignContext', () => {
    it('sollte validen Context akzeptieren', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        uploadType: 'hero-image'
      });

      const validation = campaignContextBuilder.validateCampaignContext(context);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('sollte fehlende Pflichtfelder erkennen', () => {
      const context = {
        organizationId: '',
        userId: 'user123',
        campaignId: '',
        uploadType: 'campaign' as const,
        autoTags: []
      };

      const validation = campaignContextBuilder.validateCampaignContext(context as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('organizationId ist erforderlich');
      expect(validation.errors).toContain('campaignId ist erforderlich');
    });
  });

  describe('Convenience Functions', () => {
    it('sollte Hero Image Context erstellen', () => {
      const context = createHeroImageContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123'
      });

      expect(context.uploadSubType).toBe('hero-image');
      expect(context.autoTags).toContain('upload-type:hero-image');
    });

    it('sollte Attachment Context erstellen', () => {
      const context = createAttachmentContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123'
      });

      expect(context.uploadSubType).toBe('attachment');
      expect(context.autoTags).toContain('upload-type:attachment');
    });

    it('sollte Storage-Pfad auflösen', () => {
      const context = createHeroImageContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        selectedProjectId: 'project123'
      });

      const path = resolveCampaignStoragePath(context, 'test.jpg');

      expect(path).toContain('organizations/org123/media');
      expect(path).toContain('test.jpg');
    });
  });

  describe('Upload Type Configuration', () => {
    it('sollte Hero Image Konfiguration zurückgeben', () => {
      const config = campaignContextBuilder.getUploadTypeConfig('hero-image');

      expect(config.displayName).toBe('Hero Image');
      expect(config.acceptedFileTypes).toContain('image/jpeg');
      expect(config.requiresProject).toBe(false);
    });

    it('sollte Generated Content Konfiguration zurückgeben', () => {
      const config = campaignContextBuilder.getUploadTypeConfig('generated-content');

      expect(config.displayName).toBe('Generierter Inhalt');
      expect(config.requiresProject).toBe(true);
    });
  });
});