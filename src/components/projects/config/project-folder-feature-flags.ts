// src/components/projects/config/project-folder-feature-flags.ts
// Feature Flag System für Project Folder Smart Router - Phase 3 Media Multi-Tenancy

// =====================
// FEATURE FLAG INTERFACES
// =====================

/**
 * Project Folder Feature Flags Konfiguration
 */
export interface ProjectFolderFeatureFlags {
  // Haupt-Smart-Router Features
  USE_PROJECT_SMART_ROUTER: boolean;
  PIPELINE_AWARE_ROUTING: boolean;
  FILE_TYPE_ROUTING: boolean;
  SMART_FOLDER_SUGGESTIONS: boolean;
  
  // Upload-Optimierungen
  BATCH_UPLOAD_OPTIMIZATION: boolean;
  PARALLEL_UPLOAD_PROCESSING: boolean;
  UPLOAD_PROGRESS_ENHANCEMENT: boolean;
  
  // UI-Enhancements
  SMART_DRAG_DROP_FEEDBACK: boolean;
  UPLOAD_CONTEXT_DISPLAY: boolean;
  FOLDER_RECOMMENDATION_UI: boolean;
  BATCH_UPLOAD_PREVIEW: boolean;
  
  // Pipeline-Integration
  PIPELINE_LOCK_AWARENESS: boolean;
  APPROVAL_PHASE_RESTRICTIONS: boolean;
  STAGE_TRANSITION_INTEGRATION: boolean;
  
  // Erweiterte Features
  AUTO_TAGGING_SYSTEM: boolean;
  CLIENT_INHERITANCE_LOGIC: boolean;
  CONFLICT_RESOLUTION_UI: boolean;
  UPLOAD_ANALYTICS: boolean;
  
  // Debugging & Development
  SMART_ROUTER_DEBUG_MODE: boolean;
  UPLOAD_LOGGING: boolean;
  PERFORMANCE_MONITORING: boolean;
}

/**
 * Feature Flag Konfiguration nach Umgebung
 */
interface EnvironmentConfig {
  development: Partial<ProjectFolderFeatureFlags>;
  staging: Partial<ProjectFolderFeatureFlags>;
  production: Partial<ProjectFolderFeatureFlags>;
}

/**
 * Graduelle Rollout-Konfiguration
 */
interface RolloutConfig {
  organizationId?: string[];
  userPercentage?: number;
  userIds?: string[];
  enabledSince?: Date;
  rolloutPhase: 'alpha' | 'beta' | 'stable';
}

// =====================
// DEFAULT CONFIGURATIONS
// =====================

/**
 * Basis-Feature-Flags (Conservative Approach)
 */
const BASE_FEATURE_FLAGS: ProjectFolderFeatureFlags = {
  // Haupt-Features: Zunächst konservativ
  USE_PROJECT_SMART_ROUTER: true,
  PIPELINE_AWARE_ROUTING: true,
  FILE_TYPE_ROUTING: true,
  SMART_FOLDER_SUGGESTIONS: true,
  
  // Upload-Optimierungen: Basis-Features
  BATCH_UPLOAD_OPTIMIZATION: true,
  PARALLEL_UPLOAD_PROCESSING: false, // Zunächst sequenziell
  UPLOAD_PROGRESS_ENHANCEMENT: true,
  
  // UI-Enhancements: Grundlegende Verbesserungen
  SMART_DRAG_DROP_FEEDBACK: true,
  UPLOAD_CONTEXT_DISPLAY: true,
  FOLDER_RECOMMENDATION_UI: true,
  BATCH_UPLOAD_PREVIEW: false, // Zunächst einfach
  
  // Pipeline-Integration: Core Features
  PIPELINE_LOCK_AWARENESS: true,
  APPROVAL_PHASE_RESTRICTIONS: true,
  STAGE_TRANSITION_INTEGRATION: false, // Später hinzufügen
  
  // Erweiterte Features: Schrittweise aktivieren
  AUTO_TAGGING_SYSTEM: true,
  CLIENT_INHERITANCE_LOGIC: true,
  CONFLICT_RESOLUTION_UI: false, // V2 Feature
  UPLOAD_ANALYTICS: false, // V2 Feature
  
  // Debugging: Nur Development
  SMART_ROUTER_DEBUG_MODE: false,
  UPLOAD_LOGGING: false,
  PERFORMANCE_MONITORING: false
};

/**
 * Umgebungs-spezifische Konfigurationen
 */
const ENVIRONMENT_CONFIGS: EnvironmentConfig = {
  development: {
    // Development: Alle Features aktiviert für Testing
    SMART_ROUTER_DEBUG_MODE: true,
    UPLOAD_LOGGING: true,
    PERFORMANCE_MONITORING: true,
    PARALLEL_UPLOAD_PROCESSING: true,
    BATCH_UPLOAD_PREVIEW: true,
    CONFLICT_RESOLUTION_UI: true,
    UPLOAD_ANALYTICS: true,
    STAGE_TRANSITION_INTEGRATION: true
  },
  
  staging: {
    // Staging: Fast alle Features für finales Testing
    UPLOAD_LOGGING: true,
    PERFORMANCE_MONITORING: true,
    PARALLEL_UPLOAD_PROCESSING: true,
    BATCH_UPLOAD_PREVIEW: true,
    CONFLICT_RESOLUTION_UI: true,
    STAGE_TRANSITION_INTEGRATION: true
  },
  
  production: {
    // Production: Nur stabile Features
    PERFORMANCE_MONITORING: true,
    UPLOAD_ANALYTICS: true
  }
};

/**
 * Rollout-Konfigurationen für stufenweise Einführung
 */
const ROLLOUT_CONFIGS: Record<string, RolloutConfig> = {
  SMART_ROUTER_CORE: {
    rolloutPhase: 'stable',
    userPercentage: 100
  },
  
  PARALLEL_UPLOAD: {
    rolloutPhase: 'beta',
    userPercentage: 50,
    enabledSince: new Date('2024-12-01')
  },
  
  ADVANCED_UI: {
    rolloutPhase: 'alpha',
    userPercentage: 20,
    enabledSince: new Date('2024-12-15')
  },
  
  ANALYTICS_FEATURES: {
    rolloutPhase: 'alpha',
    userPercentage: 10,
    enabledSince: new Date('2025-01-01')
  }
};

// =====================
// FEATURE FLAG SERVICE
// =====================

class ProjectFolderFeatureFlagService {
  private config: ProjectFolderFeatureFlags;
  private environment: 'development' | 'staging' | 'production';
  
  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.buildConfiguration();
  }
  
  /**
   * Haupt-Feature-Flag-Check
   */
  isEnabled(feature: keyof ProjectFolderFeatureFlags): boolean {
    return this.config[feature] || false;
  }
  
  /**
   * Erweiterte Feature-Check mit Rollout-Logik
   */
  isEnabledForUser(
    feature: keyof ProjectFolderFeatureFlags,
    userId?: string,
    organizationId?: string
  ): boolean {
    // Basis-Check
    if (!this.isEnabled(feature)) {
      return false;
    }
    
    // Rollout-Logic für spezielle Features
    return this.checkRolloutEligibility(feature, userId, organizationId);
  }
  
  /**
   * Batch-Feature-Check für Performance
   */
  getEnabledFeatures(
    features: Array<keyof ProjectFolderFeatureFlags>,
    userId?: string,
    organizationId?: string
  ): Record<string, boolean> {
    return features.reduce((enabled, feature) => {
      enabled[feature] = this.isEnabledForUser(feature, userId, organizationId);
      return enabled;
    }, {} as Record<string, boolean>);
  }
  
  /**
   * Feature-Gruppen für verwandte Features
   */
  getFeatureGroup(group: 'core' | 'ui' | 'advanced' | 'debug'): Record<string, boolean> {
    switch (group) {
      case 'core':
        return {
          USE_PROJECT_SMART_ROUTER: this.isEnabled('USE_PROJECT_SMART_ROUTER'),
          PIPELINE_AWARE_ROUTING: this.isEnabled('PIPELINE_AWARE_ROUTING'),
          FILE_TYPE_ROUTING: this.isEnabled('FILE_TYPE_ROUTING'),
          BATCH_UPLOAD_OPTIMIZATION: this.isEnabled('BATCH_UPLOAD_OPTIMIZATION')
        };
        
      case 'ui':
        return {
          SMART_FOLDER_SUGGESTIONS: this.isEnabled('SMART_FOLDER_SUGGESTIONS'),
          SMART_DRAG_DROP_FEEDBACK: this.isEnabled('SMART_DRAG_DROP_FEEDBACK'),
          UPLOAD_CONTEXT_DISPLAY: this.isEnabled('UPLOAD_CONTEXT_DISPLAY'),
          FOLDER_RECOMMENDATION_UI: this.isEnabled('FOLDER_RECOMMENDATION_UI')
        };
        
      case 'advanced':
        return {
          PARALLEL_UPLOAD_PROCESSING: this.isEnabled('PARALLEL_UPLOAD_PROCESSING'),
          CONFLICT_RESOLUTION_UI: this.isEnabled('CONFLICT_RESOLUTION_UI'),
          UPLOAD_ANALYTICS: this.isEnabled('UPLOAD_ANALYTICS'),
          STAGE_TRANSITION_INTEGRATION: this.isEnabled('STAGE_TRANSITION_INTEGRATION')
        };
        
      case 'debug':
        return {
          SMART_ROUTER_DEBUG_MODE: this.isEnabled('SMART_ROUTER_DEBUG_MODE'),
          UPLOAD_LOGGING: this.isEnabled('UPLOAD_LOGGING'),
          PERFORMANCE_MONITORING: this.isEnabled('PERFORMANCE_MONITORING')
        };
        
      default:
        return {};
    }
  }
  
  /**
   * Feature-Abhängigkeiten prüfen
   */
  checkFeatureDependencies(feature: keyof ProjectFolderFeatureFlags): {
    canEnable: boolean;
    missingDependencies: string[];
    recommendations: string[];
  } {
    const dependencies = this.getFeatureDependencies();
    const featureDeps = dependencies[feature] || [];
    
    const missingDependencies = featureDeps.filter(dep => !this.isEnabled(dep));
    
    return {
      canEnable: missingDependencies.length === 0,
      missingDependencies,
      recommendations: this.getRecommendations(feature, missingDependencies)
    };
  }
  
  /**
   * Debug-Informationen für Entwicklung
   */
  getDebugInfo(): {
    environment: string;
    activeFeatures: string[];
    rolloutStatus: Record<string, any>;
    performance: Record<string, any>;
  } {
    const activeFeatures = Object.entries(this.config)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
    
    return {
      environment: this.environment,
      activeFeatures,
      rolloutStatus: this.getRolloutStatus(),
      performance: this.getPerformanceMetrics()
    };
  }
  
  // =====================
  // PRIVATE METHODS
  // =====================
  
  /**
   * Umgebung erkennen
   */
  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (typeof window === 'undefined') return 'production';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('staging') || hostname.includes('test')) {
      return 'staging';
    }
    
    return 'production';
  }
  
  /**
   * Konfiguration zusammenbauen
   */
  private buildConfiguration(): ProjectFolderFeatureFlags {
    const envConfig = ENVIRONMENT_CONFIGS[this.environment] || {};
    
    return {
      ...BASE_FEATURE_FLAGS,
      ...envConfig
    };
  }
  
  /**
   * Rollout-Berechtigung prüfen
   */
  private checkRolloutEligibility(
    feature: keyof ProjectFolderFeatureFlags,
    userId?: string,
    organizationId?: string
  ): boolean {
    // Einfache Implementierung - kann erweitert werden für A/B Testing
    
    // Entwicklungsumgebung: Immer aktiviert
    if (this.environment === 'development') {
      return true;
    }
    
    // Spezielle Rollout-Regeln für bestimmte Features
    if (feature === 'PARALLEL_UPLOAD_PROCESSING') {
      const config = ROLLOUT_CONFIGS.PARALLEL_UPLOAD;
      return this.isInRollout(config, userId);
    }
    
    if (feature === 'CONFLICT_RESOLUTION_UI' || feature === 'BATCH_UPLOAD_PREVIEW') {
      const config = ROLLOUT_CONFIGS.ADVANCED_UI;
      return this.isInRollout(config, userId);
    }
    
    if (feature === 'UPLOAD_ANALYTICS') {
      const config = ROLLOUT_CONFIGS.ANALYTICS_FEATURES;
      return this.isInRollout(config, userId);
    }
    
    // Standard: Feature ist aktiviert
    return true;
  }
  
  /**
   * Rollout-Check
   */
  private isInRollout(config: RolloutConfig, userId?: string): boolean {
    if (!userId) return false;
    
    // Prozent-basiertes Rollout
    if (config.userPercentage) {
      const hash = this.simpleHash(userId);
      return (hash % 100) < config.userPercentage;
    }
    
    // Spezifische User-IDs
    if (config.userIds) {
      return config.userIds.includes(userId);
    }
    
    return true;
  }
  
  /**
   * Feature-Abhängigkeiten definieren
   */
  private getFeatureDependencies(): Record<string, Array<keyof ProjectFolderFeatureFlags>> {
    return {
      PIPELINE_AWARE_ROUTING: ['USE_PROJECT_SMART_ROUTER'],
      FILE_TYPE_ROUTING: ['USE_PROJECT_SMART_ROUTER'],
      SMART_FOLDER_SUGGESTIONS: ['USE_PROJECT_SMART_ROUTER', 'FILE_TYPE_ROUTING'],
      BATCH_UPLOAD_OPTIMIZATION: ['USE_PROJECT_SMART_ROUTER'],
      PARALLEL_UPLOAD_PROCESSING: ['BATCH_UPLOAD_OPTIMIZATION'],
      SMART_DRAG_DROP_FEEDBACK: ['SMART_FOLDER_SUGGESTIONS'],
      FOLDER_RECOMMENDATION_UI: ['SMART_FOLDER_SUGGESTIONS'],
      CONFLICT_RESOLUTION_UI: ['SMART_FOLDER_SUGGESTIONS'],
      UPLOAD_ANALYTICS: ['USE_PROJECT_SMART_ROUTER', 'PERFORMANCE_MONITORING'],
      STAGE_TRANSITION_INTEGRATION: ['PIPELINE_AWARE_ROUTING']
    };
  }
  
  /**
   * Empfehlungen für Feature-Aktivierung
   */
  private getRecommendations(
    feature: keyof ProjectFolderFeatureFlags,
    missingDeps: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (missingDeps.includes('USE_PROJECT_SMART_ROUTER')) {
      recommendations.push('Aktiviere zunächst den Smart Upload Router als Basis');
    }
    
    if (missingDeps.includes('PERFORMANCE_MONITORING')) {
      recommendations.push('Performance Monitoring für bessere Überwachung aktivieren');
    }
    
    return recommendations;
  }
  
  /**
   * Rollout-Status abrufen
   */
  private getRolloutStatus(): Record<string, any> {
    return Object.entries(ROLLOUT_CONFIGS).reduce((status, [key, config]) => {
      status[key] = {
        phase: config.rolloutPhase,
        percentage: config.userPercentage || 100,
        since: config.enabledSince?.toISOString()
      };
      return status;
    }, {} as Record<string, any>);
  }
  
  /**
   * Performance-Metriken abrufen
   */
  private getPerformanceMetrics(): Record<string, any> {
    return {
      featuresEnabled: Object.values(this.config).filter(Boolean).length,
      totalFeatures: Object.keys(this.config).length,
      environment: this.environment,
      lastUpdate: new Date().toISOString()
    };
  }
  
  /**
   * Einfacher Hash für User-ID
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const projectFolderFeatureFlags = new ProjectFolderFeatureFlagService();

// =====================
// CONVENIENCE HOOKS & FUNCTIONS
// =====================

/**
 * React Hook für Feature Flags (falls React Context verwendet wird)
 */
export function useProjectFolderFeatures(userId?: string, organizationId?: string) {
  const isEnabled = (feature: keyof ProjectFolderFeatureFlags) => {
    return projectFolderFeatureFlags.isEnabledForUser(feature, userId, organizationId);
  };
  
  const getFeatureGroup = (group: 'core' | 'ui' | 'advanced' | 'debug') => {
    return projectFolderFeatureFlags.getFeatureGroup(group);
  };
  
  return {
    isEnabled,
    getFeatureGroup,
    coreFeatures: getFeatureGroup('core'),
    uiFeatures: getFeatureGroup('ui'),
    advancedFeatures: getFeatureGroup('advanced'),
    debugFeatures: getFeatureGroup('debug')
  };
}

/**
 * Quick-Check für Haupt-Features
 */
export function isSmartRouterEnabled(userId?: string): boolean {
  return projectFolderFeatureFlags.isEnabledForUser('USE_PROJECT_SMART_ROUTER', userId);
}

export function isPipelineRoutingEnabled(userId?: string): boolean {
  return projectFolderFeatureFlags.isEnabledForUser('PIPELINE_AWARE_ROUTING', userId);
}

export function isSmartUIEnabled(userId?: string): boolean {
  const flags = projectFolderFeatureFlags;
  return flags.isEnabledForUser('SMART_FOLDER_SUGGESTIONS', userId) &&
         flags.isEnabledForUser('FOLDER_RECOMMENDATION_UI', userId);
}

/**
 * Feature-Konfiguration für Upload-Komponenten
 */
export function getUploadFeatureConfig(userId?: string, organizationId?: string): {
  useSmartRouter: boolean;
  showRecommendations: boolean;
  enableBatchOptimization: boolean;
  showProgress: boolean;
  enableDragDropFeedback: boolean;
} {
  const flags = projectFolderFeatureFlags;
  
  return {
    useSmartRouter: flags.isEnabledForUser('USE_PROJECT_SMART_ROUTER', userId, organizationId),
    showRecommendations: flags.isEnabledForUser('SMART_FOLDER_SUGGESTIONS', userId, organizationId),
    enableBatchOptimization: flags.isEnabledForUser('BATCH_UPLOAD_OPTIMIZATION', userId, organizationId),
    showProgress: flags.isEnabledForUser('UPLOAD_PROGRESS_ENHANCEMENT', userId, organizationId),
    enableDragDropFeedback: flags.isEnabledForUser('SMART_DRAG_DROP_FEEDBACK', userId, organizationId)
  };
}

// =====================
// FEATURE FLAG CONSTANTS
// =====================

/**
 * Konstanten für Feature-Namen (Type-Safe)
 */
export const PROJECT_FOLDER_FEATURES = {
  SMART_ROUTER: 'USE_PROJECT_SMART_ROUTER',
  PIPELINE_ROUTING: 'PIPELINE_AWARE_ROUTING',
  FILE_TYPE_ROUTING: 'FILE_TYPE_ROUTING',
  SMART_SUGGESTIONS: 'SMART_FOLDER_SUGGESTIONS',
  BATCH_OPTIMIZATION: 'BATCH_UPLOAD_OPTIMIZATION',
  UI_ENHANCEMENTS: 'FOLDER_RECOMMENDATION_UI',
  DEBUG_MODE: 'SMART_ROUTER_DEBUG_MODE'
} as const;