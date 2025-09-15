/**
 * Project Folder Feature Flags Tests
 * Test-Suite für 15+ Feature-Flags mit Rollout-Management und Umgebungs-Konfigurationen
 */

import { jest } from '@jest/globals';

// Mock Environment Variables
const mockEnv = {
  NODE_ENV: 'test',
  PROJECT_FOLDER_ROLLOUT_PERCENTAGE: '100',
  FEATURE_FLAG_OVERRIDE: 'false',
  ORGANIZATION_TIER: 'enterprise'
};

Object.assign(process.env, mockEnv);

import { ProjectFolderFeatureFlags } from '../project-folder-feature-flags';

describe('ProjectFolderFeatureFlags', () => {
  let featureFlags: ProjectFolderFeatureFlags;
  let mockUser: any;
  let mockOrganization: any;

  beforeEach(() => {
    featureFlags = new ProjectFolderFeatureFlags();
    
    mockUser = {
      id: 'user-123',
      organizationId: 'org-789',
      tier: 'enterprise',
      betaParticipant: false,
      featureFlags: []
    };

    mockOrganization = {
      id: 'org-789',
      tier: 'enterprise',
      features: ['project_folders', 'smart_upload', 'advanced_routing'],
      rolloutPercentage: 100
    };

    jest.clearAllMocks();
  });

  describe('Core Feature Flags', () => {
    it('sollte smart_upload_routing Feature korrekt aktivieren/deaktivieren', async () => {
      // Aktiviert
      const enabledResult = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        mockOrganization
      );
      expect(enabledResult).toBe(true);

      // Deaktiviert für Basic Tier
      const basicOrg = { ...mockOrganization, tier: 'basic' };
      const disabledResult = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        basicOrg
      );
      expect(disabledResult).toBe(false);
    });

    it('sollte pipeline_phase_routing mit Pipeline-Status validieren', async () => {
      const pipelineContext = {
        projectId: 'proj-123',
        currentPhase: 'creation',
        phaseRestrictions: ['ideas_planning', 'creation', 'internal_approval']
      };

      const isEnabled = await featureFlags.isFeatureEnabled(
        'pipeline_phase_routing',
        mockUser,
        mockOrganization,
        pipelineContext
      );

      expect(isEnabled).toBe(true);
      expect(featureFlags.getFeatureContext('pipeline_phase_routing')).toMatchObject({
        supportedPhases: expect.arrayContaining(['ideas_planning', 'creation']),
        restrictedPhases: []
      });
    });

    it('sollte batch_upload_optimization für große Dateien aktivieren', async () => {
      const batchContext = {
        fileCount: 25,
        totalSize: 1024 * 1024 * 500, // 500MB
        fileTypes: ['image/jpeg', 'video/mp4']
      };

      const isEnabled = await featureFlags.isFeatureEnabled(
        'batch_upload_optimization',
        mockUser,
        mockOrganization,
        batchContext
      );

      expect(isEnabled).toBe(true);
      expect(featureFlags.getBatchOptimizationConfig()).toMatchObject({
        maxParallelUploads: 5,
        chunkSize: 50,
        sequentialThreshold: 1024 * 1024 * 100 // 100MB
      });
    });

    it('sollte auto_folder_creation basierend auf Berechtigung aktivieren', async () => {
      const folderContext = {
        projectId: 'proj-123',
        missingFolders: ['media', 'press_releases'],
        userPermissions: ['create_folders', 'manage_project_structure']
      };

      const isEnabled = await featureFlags.isFeatureEnabled(
        'auto_folder_creation',
        mockUser,
        mockOrganization,
        folderContext
      );

      expect(isEnabled).toBe(true);
    });

    it('sollte smart_recommendations mit Konfidenz-Schwellwerten arbeiten', async () => {
      const recommendationContext = {
        confidence: 0.85,
        fileTypes: ['image/jpeg', 'application/pdf'],
        pipelinePhase: 'creation'
      };

      const config = await featureFlags.getSmartRecommendationConfig(
        mockUser,
        mockOrganization,
        recommendationContext
      );

      expect(config).toMatchObject({
        enabled: true,
        confidenceThreshold: 0.7,
        autoAcceptThreshold: 0.9,
        showAlternatives: true
      });
    });
  });

  describe('Advanced Feature Flags', () => {
    it('sollte drag_drop_preview mit Performance-Optimierung konfigurieren', async () => {
      const dragDropContext = {
        fileCount: 15,
        previewQuality: 'high',
        devicePerformance: 'high'
      };

      const config = await featureFlags.getDragDropPreviewConfig(
        mockUser,
        mockOrganization,
        dragDropContext
      );

      expect(config.enabled).toBe(true);
      expect(config.maxPreviews).toBe(10);
      expect(config.thumbnailQuality).toBe('medium'); // Optimiert für Performance
    });

    it('sollte file_type_validation mit Custom Rules unterstützen', async () => {
      mockOrganization.customFileRules = [
        { extension: '.ai', allowed: true, folder: 'media' },
        { extension: '.sketch', allowed: false, reason: 'Nicht unterstützt' }
      ];

      const validationConfig = await featureFlags.getFileValidationConfig(
        mockUser,
        mockOrganization
      );

      expect(validationConfig.enabled).toBe(true);
      expect(validationConfig.customRules).toHaveLength(2);
      expect(validationConfig.defaultBehavior).toBe('allow');
    });

    it('sollte parallel_uploads basierend auf Netzwerk-Qualität optimieren', async () => {
      const networkContext = {
        connectionType: 'wifi',
        bandwidth: 'high',
        latency: 'low'
      };

      const uploadConfig = await featureFlags.getParallelUploadConfig(
        mockUser,
        mockOrganization,
        networkContext
      );

      expect(uploadConfig.maxParallel).toBe(8);
      expect(uploadConfig.adaptiveScaling).toBe(true);
    });

    it('sollte upload_progress_tracking mit detailliertem Monitoring aktivieren', async () => {
      const progressConfig = await featureFlags.getProgressTrackingConfig(
        mockUser,
        mockOrganization
      );

      expect(progressConfig).toMatchObject({
        enabled: true,
        granularity: 'per_file',
        showTimeEstimate: true,
        showNetworkStats: true,
        persistProgress: true
      });
    });

    it('sollte folder_color_coding für bessere UX aktivieren', async () => {
      const colorConfig = await featureFlags.getFolderColorConfig(
        mockUser,
        mockOrganization
      );

      expect(colorConfig.enabled).toBe(true);
      expect(colorConfig.colorScheme).toBe('semantic');
      expect(colorConfig.colors).toMatchObject({
        documents: '#3B82F6', // Blue
        media: '#10B981',     // Green  
        press_releases: '#F59E0B' // Yellow
      });
    });

    it('sollte enhanced_error_messages mit Context-Information aktivieren', async () => {
      const errorConfig = await featureFlags.getErrorMessagingConfig(
        mockUser,
        mockOrganization
      );

      expect(errorConfig).toMatchObject({
        enabled: true,
        showContextualHelp: true,
        suggestRecoveryActions: true,
        trackErrorPatterns: true
      });
    });
  });

  describe('Beta und Experimental Features', () => {
    it('sollte ai_powered_suggestions nur für Beta-Teilnehmer aktivieren', async () => {
      const betaUser = { ...mockUser, betaParticipant: true };

      const isEnabledBeta = await featureFlags.isFeatureEnabled(
        'ai_powered_suggestions',
        betaUser,
        mockOrganization
      );

      const isEnabledRegular = await featureFlags.isFeatureEnabled(
        'ai_powered_suggestions',
        mockUser,
        mockOrganization
      );

      expect(isEnabledBeta).toBe(true);
      expect(isEnabledRegular).toBe(false);
    });

    it('sollte predictive_routing als Experimental Feature behandeln', async () => {
      const experimentalContext = {
        experimentGroup: 'treatment',
        userConsent: true
      };

      const isEnabled = await featureFlags.isFeatureEnabled(
        'predictive_routing',
        mockUser,
        mockOrganization,
        experimentalContext
      );

      expect(isEnabled).toBe(true);
      expect(featureFlags.isExperimentalFeature('predictive_routing')).toBe(true);
    });

    it('sollte advanced_analytics nur für Enterprise-Tier aktivieren', async () => {
      const enterpriseConfig = await featureFlags.getAdvancedAnalyticsConfig(
        mockUser,
        mockOrganization
      );

      expect(enterpriseConfig.enabled).toBe(true);

      // Test für Professional Tier
      const proOrg = { ...mockOrganization, tier: 'professional' };
      const proConfig = await featureFlags.getAdvancedAnalyticsConfig(
        mockUser,
        proOrg
      );

      expect(proConfig.enabled).toBe(false);
    });
  });

  describe('Rollout-Management', () => {
    it('sollte Feature-Rollout basierend auf Prozentzahl steuern', async () => {
      // Mock für 50% Rollout
      const partialRolloutOrg = { 
        ...mockOrganization, 
        rolloutPercentage: 50 
      };

      // Simuliere deterministische User-ID Hash
      const mockHashFunction = jest.spyOn(featureFlags, 'getUserHash')
        .mockReturnValue(0.3); // 30% - sollte aktiviert sein

      const isEnabled = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        partialRolloutOrg
      );

      expect(isEnabled).toBe(true);

      // Test für User außerhalb des Rollouts
      mockHashFunction.mockReturnValue(0.7); // 70% - sollte deaktiviert sein

      const isDisabled = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        partialRolloutOrg
      );

      expect(isDisabled).toBe(false);

      mockHashFunction.mockRestore();
    });

    it('sollte Canary-Releases für spezifische User-Gruppen unterstützen', async () => {
      const canaryUsers = ['user-123', 'user-456'];
      
      const canaryConfig = await featureFlags.getCanaryConfig('batch_upload_optimization');
      expect(canaryConfig.enabled).toBe(true);
      
      const isCanaryUser = await featureFlags.isCanaryUser(mockUser.id, canaryUsers);
      expect(isCanaryUser).toBe(true);
    });

    it('sollte A/B-Tests für Feature-Varianten unterstützen', async () => {
      const abTestContext = {
        feature: 'smart_recommendations',
        variant: 'algorithm_v2',
        testGroup: 'B'
      };

      const abConfig = await featureFlags.getABTestConfig(
        mockUser,
        mockOrganization,
        abTestContext
      );

      expect(abConfig).toMatchObject({
        isTestActive: true,
        variant: 'algorithm_v2',
        trackingEnabled: true
      });
    });
  });

  describe('Umgebungs-spezifische Konfigurationen', () => {
    it('sollte Development-Environment Features aktivieren', async () => {
      process.env.NODE_ENV = 'development';
      
      const devFlags = new ProjectFolderFeatureFlags();
      
      expect(await devFlags.isFeatureEnabled('debug_mode', mockUser, mockOrganization)).toBe(true);
      expect(await devFlags.isFeatureEnabled('performance_metrics', mockUser, mockOrganization)).toBe(true);
      
      process.env.NODE_ENV = 'test';
    });

    it('sollte Production-Environment Sicherheitsfeatures aktivieren', async () => {
      process.env.NODE_ENV = 'production';
      
      const prodFlags = new ProjectFolderFeatureFlags();
      
      expect(await prodFlags.isFeatureEnabled('enhanced_logging', mockUser, mockOrganization)).toBe(true);
      expect(await prodFlags.isFeatureEnabled('debug_mode', mockUser, mockOrganization)).toBe(false);
      
      process.env.NODE_ENV = 'test';
    });

    it('sollte Custom Environment Variables respektieren', async () => {
      process.env.FEATURE_FLAG_OVERRIDE = 'true';
      process.env.OVERRIDE_FEATURE_smart_upload_routing = 'false';
      
      const overrideFlags = new ProjectFolderFeatureFlags();
      
      const isOverridden = await overrideFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        mockOrganization
      );
      
      expect(isOverridden).toBe(false);
      
      // Cleanup
      delete process.env.FEATURE_FLAG_OVERRIDE;
      delete process.env.OVERRIDE_FEATURE_smart_upload_routing;
    });
  });

  describe('Feature-Abhängigkeiten und Validierung', () => {
    it('sollte Feature-Abhängigkeiten korrekt validieren', async () => {
      const dependencies = await featureFlags.getFeatureDependencies('ai_powered_suggestions');
      
      expect(dependencies).toEqual([
        'smart_recommendations',
        'advanced_analytics',
        'beta_program_access'
      ]);

      const canEnable = await featureFlags.canEnableFeature(
        'ai_powered_suggestions',
        mockUser,
        mockOrganization
      );

      expect(canEnable.allowed).toBe(false); // Beta nicht aktiviert
      expect(canEnable.missingDependencies).toContain('beta_program_access');
    });

    it('sollte zirkuläre Abhängigkeiten erkennen', async () => {
      const circularTest = await featureFlags.validateFeatureDependencies([
        'feature_a_depends_on_b',
        'feature_b_depends_on_a'
      ]);

      expect(circularTest.hasCircularDependency).toBe(true);
      expect(circularTest.circularChain).toHaveLength(2);
    });

    it('sollte Feature-Kompatibilität zwischen Versionen prüfen', async () => {
      const compatibility = await featureFlags.checkVersionCompatibility(
        'smart_upload_routing',
        '2.1.0'
      );

      expect(compatibility).toMatchObject({
        compatible: true,
        minVersion: '2.0.0',
        deprecationWarning: false
      });
    });
  });

  describe('Metrics und Analytics', () => {
    it('sollte Feature-Usage-Metriken sammeln', async () => {
      const metrics = featureFlags.getFeatureMetrics();
      
      expect(metrics).toMatchObject({
        totalFeatures: expect.any(Number),
        enabledFeatures: expect.any(Number),
        usageStats: expect.any(Object),
        performanceImpact: expect.any(Object)
      });
    });

    it('sollte Feature-Toggle-Events tracken', async () => {
      const trackingSpy = jest.spyOn(featureFlags, 'trackFeatureToggle');
      
      await featureFlags.isFeatureEnabled('smart_upload_routing', mockUser, mockOrganization);
      
      expect(trackingSpy).toHaveBeenCalledWith({
        feature: 'smart_upload_routing',
        userId: 'user-123',
        organizationId: 'org-789',
        enabled: true,
        timestamp: expect.any(Date)
      });
      
      trackingSpy.mockRestore();
    });
  });

  describe('Cache und Performance', () => {
    it('sollte Feature-Flag-Ergebnisse cachen', async () => {
      const performanceSpy = jest.spyOn(performance, 'now');
      
      // Erster Aufruf
      await featureFlags.isFeatureEnabled('smart_upload_routing', mockUser, mockOrganization);
      const firstCallTime = performance.now();
      
      // Zweiter Aufruf (sollte Cache nutzen)
      await featureFlags.isFeatureEnabled('smart_upload_routing', mockUser, mockOrganization);
      const secondCallTime = performance.now();
      
      expect(secondCallTime - firstCallTime).toBeLessThan(1); // Sehr schnell durch Cache
      
      performanceSpy.mockRestore();
    });

    it('sollte Cache-Invalidierung korrekt handhaben', async () => {
      // Feature aktivieren
      await featureFlags.isFeatureEnabled('smart_upload_routing', mockUser, mockOrganization);
      
      // Cache invalidieren
      await featureFlags.invalidateCache(mockUser.id, mockOrganization.id);
      
      // Organisationsänderung
      const updatedOrg = { ...mockOrganization, tier: 'basic' };
      const result = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        updatedOrg
      );
      
      expect(result).toBe(false); // Neue Berechnung nach Cache-Invalidierung
    });
  });

  describe('Error Handling', () => {
    it('sollte unbekannte Features graceful handhaben', async () => {
      const result = await featureFlags.isFeatureEnabled(
        'non_existent_feature' as any,
        mockUser,
        mockOrganization
      );

      expect(result).toBe(false);
      expect(featureFlags.getLastError()).toContain('Unknown feature');
    });

    it('sollte Netzwerkfehler bei Remote-Feature-Flags abfangen', async () => {
      const networkErrorSpy = jest.spyOn(featureFlags, 'fetchRemoteFlags')
        .mockRejectedValue(new Error('Network timeout'));

      const result = await featureFlags.isFeatureEnabled(
        'smart_upload_routing',
        mockUser,
        mockOrganization
      );

      // Sollte auf lokale Defaults zurückfallen
      expect(result).toBe(true); // Default für Enterprise
      
      networkErrorSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('sollte vollständigen Feature-Flag-Flow mit allen Dependencies testen', async () => {
      const fullFlowResult = await featureFlags.evaluateAllFeatures(
        mockUser,
        mockOrganization,
        {
          context: 'project_folder_upload',
          projectPhase: 'creation',
          fileCount: 10,
          batchUpload: true
        }
      );

      expect(fullFlowResult).toMatchObject({
        smart_upload_routing: true,
        pipeline_phase_routing: true,
        batch_upload_optimization: true,
        auto_folder_creation: true,
        smart_recommendations: true
      });

      expect(fullFlowResult.evaluationTime).toBeLessThan(50); // Performance
    });
  });
});

// Mock Helper Functions
jest.mock('@/lib/firebase/services/user', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve(mockUser))
}));

jest.mock('@/lib/firebase/services/organization', () => ({
  getOrganization: jest.fn(() => Promise.resolve(mockOrganization))
}));