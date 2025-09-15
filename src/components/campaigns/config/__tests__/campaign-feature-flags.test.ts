// src/components/campaigns/config/__tests__/campaign-feature-flags.test.ts
import {
  campaignFeatureFlags,
  isCampaignSmartRouterEnabled,
  isHybridStorageEnabled,
  isUploadTypeSmartRouterEnabled,
  getUIEnhancements,
  getMigrationStatus,
  createFeatureFlagContext
} from '../campaign-feature-flags';

describe('CampaignFeatureFlags', () => {
  
  describe('getFeatureFlags', () => {
    it('sollte Development Flags zurückgeben', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        environment: 'development'
      });

      const flags = campaignFeatureFlags.getFeatureFlags(context);

      expect(flags.USE_CAMPAIGN_SMART_ROUTER).toBe(true);
      expect(flags.DEBUG_MODE).toBe(true); // Development-spezifisch aktiviert
      expect(flags.PIPELINE_INTEGRATION).toBe(true); // Development-spezifisch
      expect(flags.FEATURE_TOGGLE_UI).toBe(true); // Development-spezifisch
    });

    it('sollte Production Flags zurückgeben', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        environment: 'production'
      });

      const flags = campaignFeatureFlags.getFeatureFlags(context);

      expect(flags.USE_CAMPAIGN_SMART_ROUTER).toBe(true);
      expect(flags.DEBUG_MODE).toBe(false);
      expect(flags.FEATURE_TOGGLE_UI).toBe(false);
    });

    it('sollte Beta User Features aktivieren', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        betaUser: true
      });

      const flags = campaignFeatureFlags.getFeatureFlags(context);

      expect(flags.PATH_SUGGESTION_UI).toBe(true);
      expect(flags.PROJECT_AUTO_ASSIGNMENT).toBe(true);
    });

    it('sollte Admin Features aktivieren', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        userRole: 'admin'
      });

      const flags = campaignFeatureFlags.getFeatureFlags(context);

      expect(flags.FEATURE_TOGGLE_UI).toBe(true);
      expect(flags.DEBUG_MODE).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('sollte aktivierte Features erkennen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const validation = campaignFeatureFlags.isFeatureEnabled('USE_CAMPAIGN_SMART_ROUTER', context);

      expect(validation.isEnabled).toBe(true);
      expect(validation.fallbackBehavior).toBe('disabled');
    });

    it('sollte deaktivierte Features erkennen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const validation = campaignFeatureFlags.isFeatureEnabled('PIPELINE_INTEGRATION', context);

      expect(validation.isEnabled).toBe(false);
      expect(validation.fallbackBehavior).toBe('legacy');
    });

    it('sollte Abhängigkeiten prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const validation = campaignFeatureFlags.isFeatureEnabled('HERO_IMAGE_SMART_ROUTER', context);

      expect(validation.dependencies).toContain('USE_CAMPAIGN_SMART_ROUTER');
    });
  });

  describe('isUploadTypeEnabled', () => {
    it('sollte Hero Image Upload als aktiviert erkennen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = campaignFeatureFlags.isUploadTypeEnabled('hero-image', context);

      expect(isEnabled).toBe(true);
    });

    it('sollte Generated Content Upload als deaktiviert erkennen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = campaignFeatureFlags.isUploadTypeEnabled('generated-content', context);

      expect(isEnabled).toBe(false);
    });
  });

  describe('Convenience Functions', () => {
    it('sollte Smart Router Status prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = isCampaignSmartRouterEnabled(context);

      expect(isEnabled).toBe(true);
    });

    it('sollte Hybrid Storage Status prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = isHybridStorageEnabled(context);

      expect(isEnabled).toBe(true);
    });

    it('sollte Upload Type Status prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const isEnabled = isUploadTypeSmartRouterEnabled('hero-image', context);

      expect(isEnabled).toBe(true);
    });

    it('sollte UI Enhancements zurückgeben', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const ui = getUIEnhancements(context);

      expect(ui.showStorageType).toBe(true);
      expect(ui.showUploadMethodBadges).toBe(true);
      expect(ui.showContextPreview).toBe(true);
    });

    it('sollte Migration Status zurückgeben', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const migration = getMigrationStatus(context);

      expect(migration.useLegacyFallback).toBe(true);
      expect(migration.showMigrationUI).toBe(false);
    });
  });

  describe('createFeatureFlagContext', () => {
    it('sollte Standard Context erstellen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      expect(context.organizationId).toBe('org123');
      expect(context.userId).toBe('user123');
      expect(context.environment).toBeDefined();
    });

    it('sollte erweiterten Context erstellen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        projectId: 'project123',
        userRole: 'admin',
        betaUser: true
      });

      expect(context.campaignId).toBe('campaign123');
      expect(context.projectId).toBe('project123');
      expect(context.userRole).toBe('admin');
      expect(context.betaUser).toBe(true);
    });
  });

  describe('Migration Mode', () => {
    it('sollte Migration Modus prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123'
      });

      const migration = campaignFeatureFlags.isMigrationMode(context);

      expect(migration.isActive).toBe(true);
      expect(migration.allowLegacyFallback).toBe(true);
      expect(migration.showFeatureToggles).toBe(false);
    });

    it('sollte Admin Migration Modus prüfen', () => {
      const context = createFeatureFlagContext({
        organizationId: 'org123',
        userId: 'user123',
        userRole: 'admin'
      });

      const migration = campaignFeatureFlags.isMigrationMode(context);

      expect(migration.showFeatureToggles).toBe(true);
    });
  });
});