// src/components/campaigns/config/campaign-feature-flags.ts
// Campaign Feature Flags für Smart Upload Router Integration Phase 2
// Graduelle Rollout-Kontrolle und Upload-Type-spezifische Feature-Flags

// =====================
// FEATURE FLAG INTERFACES
// =====================

/**
 * Campaign-spezifische Feature-Flags
 */
export interface CampaignFeatureFlags {
  // Haupt-Feature-Flags
  USE_CAMPAIGN_SMART_ROUTER: boolean;
  CAMPAIGN_CONTEXT_INFO: boolean;
  HYBRID_STORAGE_ROUTING: boolean;
  PIPELINE_INTEGRATION: boolean;

  // Upload-Type-spezifische Flags
  HERO_IMAGE_SMART_ROUTER: boolean;
  ATTACHMENT_SMART_ROUTER: boolean;
  BOILERPLATE_SMART_ROUTER: boolean;
  GENERATED_CONTENT_SMART_ROUTER: boolean;

  // UI/UX Enhancement Flags
  STORAGE_TYPE_DISPLAY: boolean;
  UPLOAD_METHOD_BADGES: boolean;
  CONTEXT_PREVIEW_PANEL: boolean;
  PATH_SUGGESTION_UI: boolean;

  // Migration und Rollout Flags
  GRADUAL_MIGRATION_MODE: boolean;
  FALLBACK_TO_LEGACY: boolean;
  FEATURE_TOGGLE_UI: boolean;
  DEBUG_MODE: boolean;

  // Erweiterte Features
  AUTO_TAGGING_ENABLED: boolean;
  CLIENT_INHERITANCE: boolean;
  PROJECT_AUTO_ASSIGNMENT: boolean;
  PIPELINE_STAGE_ROUTING: boolean;
}

/**
 * Feature-Flag-Kontext für bedingte Aktivierung
 */
export interface FeatureFlagContext {
  organizationId: string;
  userId: string;
  campaignId?: string;
  projectId?: string;
  userRole?: string;
  betaUser?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

/**
 * Feature-Flag-Validation-Result
 */
export interface FeatureFlagValidation {
  isEnabled: boolean;
  reason: string;
  fallbackBehavior: 'legacy' | 'disabled' | 'limited';
  dependencies: string[];
}

// =====================
// CAMPAIGN FEATURE FLAG SERVICE
// =====================

class CampaignFeatureFlagService {
  private readonly DEFAULT_FLAGS: CampaignFeatureFlags = {
    // Haupt-Features: Vorsichtige Aktivierung
    USE_CAMPAIGN_SMART_ROUTER: true,
    CAMPAIGN_CONTEXT_INFO: true,
    HYBRID_STORAGE_ROUTING: true,
    PIPELINE_INTEGRATION: false, // Später aktivieren

    // Upload-Type Features: Schrittweise Aktivierung
    HERO_IMAGE_SMART_ROUTER: true,
    ATTACHMENT_SMART_ROUTER: true,
    BOILERPLATE_SMART_ROUTER: false, // Phase 3
    GENERATED_CONTENT_SMART_ROUTER: false, // Pipeline-abhängig

    // UI Enhancements: User Experience Features
    STORAGE_TYPE_DISPLAY: true,
    UPLOAD_METHOD_BADGES: true,
    CONTEXT_PREVIEW_PANEL: true,
    PATH_SUGGESTION_UI: false, // Später für bessere UX

    // Migration: Sanfte Einführung
    GRADUAL_MIGRATION_MODE: true,
    FALLBACK_TO_LEGACY: true,
    FEATURE_TOGGLE_UI: false, // Nur für Admins
    DEBUG_MODE: false, // Nur Development

    // Erweiterte Features: Nach Hauptfeatures
    AUTO_TAGGING_ENABLED: true,
    CLIENT_INHERITANCE: true,
    PROJECT_AUTO_ASSIGNMENT: false, // Komplex, später
    PIPELINE_STAGE_ROUTING: false // Pipeline-abhängig
  };

  private readonly DEVELOPMENT_FLAGS: CampaignFeatureFlags = {
    ...this.DEFAULT_FLAGS,
    // Development: Alle Features aktiviert für Testing
    PIPELINE_INTEGRATION: true,
    BOILERPLATE_SMART_ROUTER: true,
    GENERATED_CONTENT_SMART_ROUTER: true,
    PATH_SUGGESTION_UI: true,
    FEATURE_TOGGLE_UI: true,
    DEBUG_MODE: true,
    PROJECT_AUTO_ASSIGNMENT: true,
    PIPELINE_STAGE_ROUTING: true
  };

  private readonly PRODUCTION_FLAGS: CampaignFeatureFlags = {
    ...this.DEFAULT_FLAGS,
    // Production: Nur stabile Features
    DEBUG_MODE: false,
    FEATURE_TOGGLE_UI: false,
    GRADUAL_MIGRATION_MODE: true,
    FALLBACK_TO_LEGACY: true
  };

  /**
   * Feature-Flag-Status abrufen mit Kontext-Berücksichtigung
   */
  getFeatureFlags(context: FeatureFlagContext): CampaignFeatureFlags {
    let baseFlags = this.DEFAULT_FLAGS;

    // Environment-basierte Flags
    if (context.environment === 'development') {
      baseFlags = this.DEVELOPMENT_FLAGS;
    } else if (context.environment === 'production') {
      baseFlags = this.PRODUCTION_FLAGS;
    }

    // Kontext-spezifische Anpassungen
    const contextualFlags = { ...baseFlags };

    // Beta-User Features
    if (context.betaUser) {
      contextualFlags.PATH_SUGGESTION_UI = true;
      contextualFlags.PROJECT_AUTO_ASSIGNMENT = true;
      contextualFlags.FEATURE_TOGGLE_UI = true;
    }

    // Role-basierte Features
    if (context.userRole === 'admin') {
      contextualFlags.FEATURE_TOGGLE_UI = true;
      contextualFlags.DEBUG_MODE = true;
    }

    // Organization-spezifische Features (später implementieren)
    // Hier könnten org-spezifische Overrides kommen

    return contextualFlags;
  }

  /**
   * Einzelne Feature-Flag prüfen mit Validierung
   */
  isFeatureEnabled(
    flagName: keyof CampaignFeatureFlags,
    context: FeatureFlagContext
  ): FeatureFlagValidation {
    const flags = this.getFeatureFlags(context);
    const isEnabled = flags[flagName];

    // Abhängigkeiten prüfen
    const dependencies = this.getFeatureDependencies(flagName);
    const missingDependencies = dependencies.filter(dep => !flags[dep as keyof CampaignFeatureFlags]);

    // Validation Result erstellen
    let reason: string;
    let fallbackBehavior: 'legacy' | 'disabled' | 'limited';

    if (!isEnabled) {
      reason = `Feature ${flagName} ist deaktiviert`;
      fallbackBehavior = 'legacy';
    } else if (missingDependencies.length > 0) {
      reason = `Abhängigkeiten fehlen: ${missingDependencies.join(', ')}`;
      fallbackBehavior = 'limited';
    } else {
      reason = `Feature ${flagName} ist aktiv`;
      fallbackBehavior = 'disabled'; // No fallback needed
    }

    return {
      isEnabled: isEnabled && missingDependencies.length === 0,
      reason,
      fallbackBehavior,
      dependencies
    };
  }

  /**
   * Feature-Abhängigkeiten definieren
   */
  private getFeatureDependencies(flagName: keyof CampaignFeatureFlags): string[] {
    const dependencies: Record<string, string[]> = {
      // Smart Router Dependencies
      HERO_IMAGE_SMART_ROUTER: ['USE_CAMPAIGN_SMART_ROUTER'],
      ATTACHMENT_SMART_ROUTER: ['USE_CAMPAIGN_SMART_ROUTER'],
      BOILERPLATE_SMART_ROUTER: ['USE_CAMPAIGN_SMART_ROUTER'],
      GENERATED_CONTENT_SMART_ROUTER: ['USE_CAMPAIGN_SMART_ROUTER', 'PIPELINE_INTEGRATION'],

      // UI Dependencies
      STORAGE_TYPE_DISPLAY: ['HYBRID_STORAGE_ROUTING'],
      UPLOAD_METHOD_BADGES: ['USE_CAMPAIGN_SMART_ROUTER'],
      CONTEXT_PREVIEW_PANEL: ['CAMPAIGN_CONTEXT_INFO'],
      PATH_SUGGESTION_UI: ['CONTEXT_PREVIEW_PANEL', 'HYBRID_STORAGE_ROUTING'],

      // Advanced Dependencies
      PROJECT_AUTO_ASSIGNMENT: ['HYBRID_STORAGE_ROUTING', 'CLIENT_INHERITANCE'],
      PIPELINE_STAGE_ROUTING: ['PIPELINE_INTEGRATION', 'USE_CAMPAIGN_SMART_ROUTER']
    };

    return dependencies[flagName] || [];
  }

  /**
   * Upload-Type-spezifische Feature-Prüfung
   */
  isUploadTypeEnabled(
    uploadType: 'hero-image' | 'attachment' | 'boilerplate' | 'generated-content',
    context: FeatureFlagContext
  ): boolean {
    const flagMapping = {
      'hero-image': 'HERO_IMAGE_SMART_ROUTER',
      'attachment': 'ATTACHMENT_SMART_ROUTER',
      'boilerplate': 'BOILERPLATE_SMART_ROUTER',
      'generated-content': 'GENERATED_CONTENT_SMART_ROUTER'
    } as const;

    const flagName = flagMapping[uploadType];
    const validation = this.isFeatureEnabled(flagName, context);
    
    return validation.isEnabled;
  }

  /**
   * Feature-Flag-Status für UI-Anzeige
   */
  getFeatureFlagStatus(context: FeatureFlagContext): {
    [K in keyof CampaignFeatureFlags]: {
      enabled: boolean;
      status: 'active' | 'disabled' | 'limited';
      dependencies: string[];
    }
  } {
    const flags = this.getFeatureFlags(context);
    const status = {} as any;

    Object.keys(flags).forEach(flagName => {
      const validation = this.isFeatureEnabled(
        flagName as keyof CampaignFeatureFlags,
        context
      );

      status[flagName] = {
        enabled: validation.isEnabled,
        status: validation.isEnabled ? 'active' : 
                validation.fallbackBehavior === 'limited' ? 'limited' : 'disabled',
        dependencies: validation.dependencies
      };
    });

    return status;
  }

  /**
   * Migration-Modus prüfen
   */
  isMigrationMode(context: FeatureFlagContext): {
    isActive: boolean;
    allowLegacyFallback: boolean;
    showFeatureToggles: boolean;
  } {
    const flags = this.getFeatureFlags(context);

    return {
      isActive: flags.GRADUAL_MIGRATION_MODE,
      allowLegacyFallback: flags.FALLBACK_TO_LEGACY,
      showFeatureToggles: flags.FEATURE_TOGGLE_UI
    };
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const campaignFeatureFlags = new CampaignFeatureFlagService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Campaign Smart Router aktiviert prüfen
 */
export function isCampaignSmartRouterEnabled(context: FeatureFlagContext): boolean {
  return campaignFeatureFlags.isFeatureEnabled('USE_CAMPAIGN_SMART_ROUTER', context).isEnabled;
}

/**
 * Hybrid Storage aktiviert prüfen
 */
export function isHybridStorageEnabled(context: FeatureFlagContext): boolean {
  return campaignFeatureFlags.isFeatureEnabled('HYBRID_STORAGE_ROUTING', context).isEnabled;
}

/**
 * Upload-Type Smart Router prüfen
 */
export function isUploadTypeSmartRouterEnabled(
  uploadType: 'hero-image' | 'attachment' | 'boilerplate' | 'generated-content',
  context: FeatureFlagContext
): boolean {
  return campaignFeatureFlags.isUploadTypeEnabled(uploadType, context);
}

/**
 * UI Enhancement Features prüfen
 */
export function getUIEnhancements(context: FeatureFlagContext): {
  showStorageType: boolean;
  showUploadMethodBadges: boolean;
  showContextPreview: boolean;
  showPathSuggestions: boolean;
} {
  const flags = campaignFeatureFlags.getFeatureFlags(context);

  return {
    showStorageType: flags.STORAGE_TYPE_DISPLAY,
    showUploadMethodBadges: flags.UPLOAD_METHOD_BADGES,
    showContextPreview: flags.CONTEXT_PREVIEW_PANEL,
    showPathSuggestions: flags.PATH_SUGGESTION_UI
  };
}

/**
 * Migration und Fallback Status
 */
export function getMigrationStatus(context: FeatureFlagContext): {
  useLegacyFallback: boolean;
  showMigrationUI: boolean;
  isDebugMode: boolean;
} {
  const migration = campaignFeatureFlags.isMigrationMode(context);
  const flags = campaignFeatureFlags.getFeatureFlags(context);

  return {
    useLegacyFallback: migration.allowLegacyFallback,
    showMigrationUI: migration.showFeatureToggles,
    isDebugMode: flags.DEBUG_MODE
  };
}

/**
 * Context aus Standard-Props erstellen
 */
export function createFeatureFlagContext(params: {
  organizationId: string;
  userId: string;
  campaignId?: string;
  projectId?: string;
  userRole?: string;
  betaUser?: boolean;
}): FeatureFlagContext {
  return {
    ...params,
    environment: process.env.NODE_ENV === 'development' ? 'development' : 'production'
  };
}