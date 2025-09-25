// src/app/dashboard/pr-tools/media-library/config/feature-flags.ts
// Feature Flags für Media Library Smart Upload Router Integration

/**
 * Media Library Feature Flags
 */
export interface MediaLibraryFeatureFlags {
  // Smart Upload Router
  USE_SMART_ROUTER: boolean;
  SMART_ROUTER_FALLBACK: boolean;
  SMART_ROUTER_LOGGING: boolean;
  
  // Context Features
  AUTO_TAGGING: boolean;
  CLIENT_INHERITANCE: boolean;
  FOLDER_ROUTING: boolean;
  
  // UI Features
  UPLOAD_CONTEXT_INFO: boolean;
  UPLOAD_METHOD_TOGGLE: boolean;
  UPLOAD_RESULTS_DISPLAY: boolean;
  
  // Performance
  BATCH_UPLOADS: boolean;
  PARALLEL_UPLOADS: boolean;
  UPLOAD_RETRY: boolean;
}

/**
 * Standard Feature Flag Konfiguration
 */
const DEFAULT_FEATURE_FLAGS: MediaLibraryFeatureFlags = {
  // Smart Upload Router - Schrittweise Aktivierung
  USE_SMART_ROUTER: true,
  SMART_ROUTER_FALLBACK: true,
  SMART_ROUTER_LOGGING: process.env.NODE_ENV === 'development',
  
  // Context Features - Alle aktiv für Phase 1
  AUTO_TAGGING: true,
  CLIENT_INHERITANCE: true,
  FOLDER_ROUTING: true,
  
  // UI Features - Alle aktiv für bessere UX
  UPLOAD_CONTEXT_INFO: true,
  UPLOAD_METHOD_TOGGLE: process.env.NODE_ENV === 'development',
  UPLOAD_RESULTS_DISPLAY: true,
  
  // Performance Features
  BATCH_UPLOADS: true,
  PARALLEL_UPLOADS: true,
  UPLOAD_RETRY: true
};

/**
 * Environment-basierte Feature Flag Overrides
 */
function getEnvironmentOverrides(): Partial<MediaLibraryFeatureFlags> {
  const overrides: Partial<MediaLibraryFeatureFlags> = {};
  
  // Production: Konservativere Einstellungen
  if (process.env.NODE_ENV === 'production') {
    overrides.SMART_ROUTER_LOGGING = false;
    overrides.UPLOAD_METHOD_TOGGLE = false;
  }
  
  // Development: Alle Features aktiv
  if (process.env.NODE_ENV === 'development') {
    overrides.SMART_ROUTER_LOGGING = true;
    overrides.UPLOAD_METHOD_TOGGLE = true;
  }
  
  // Specific Environment Variables
  if (process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER === 'true') {
    overrides.USE_SMART_ROUTER = false;
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING === 'true') {
    overrides.SMART_ROUTER_LOGGING = true;
    overrides.UPLOAD_METHOD_TOGGLE = true;
    overrides.UPLOAD_RESULTS_DISPLAY = true;
  }
  
  return overrides;
}

/**
 * Aktuelle Feature Flag Konfiguration laden
 */
export function getMediaLibraryFeatureFlags(): MediaLibraryFeatureFlags {
  const environmentOverrides = getEnvironmentOverrides();
  
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...environmentOverrides
  };
}

/**
 * Einzelne Feature Flag prüfen
 */
export function isFeatureEnabled(flag: keyof MediaLibraryFeatureFlags): boolean {
  const flags = getMediaLibraryFeatureFlags();
  return flags[flag];
}

/**
 * Feature Flag für Komponente erstellen
 */
export function useMediaLibraryFeatureFlags(): MediaLibraryFeatureFlags {
  return getMediaLibraryFeatureFlags();
}

/**
 * Smart Router Aktivierung prüfen
 */
export function shouldUseSmartRouter(): boolean {
  const flags = getMediaLibraryFeatureFlags();
  return flags.USE_SMART_ROUTER;
}

/**
 * Debugging/Logging Features prüfen
 */
export function isDebuggingEnabled(): boolean {
  const flags = getMediaLibraryFeatureFlags();
  return flags.SMART_ROUTER_LOGGING || flags.UPLOAD_METHOD_TOGGLE;
}

/**
 * Performance Features Konfiguration
 */
export function getUploadPerformanceConfig(): {
  enableBatching: boolean;
  enableParallel: boolean;
  enableRetry: boolean;
  maxRetries: number;
  batchSize: number;
} {
  const flags = getMediaLibraryFeatureFlags();
  
  return {
    enableBatching: flags.BATCH_UPLOADS,
    enableParallel: flags.PARALLEL_UPLOADS,
    enableRetry: flags.UPLOAD_RETRY,
    maxRetries: flags.UPLOAD_RETRY ? 3 : 0,
    batchSize: flags.BATCH_UPLOADS ? 5 : 1
  };
}

/**
 * UI Features Konfiguration
 */
export function getUIFeatureConfig(): {
  showContextInfo: boolean;
  allowMethodToggle: boolean;
  showUploadResults: boolean;
} {
  const flags = getMediaLibraryFeatureFlags();
  
  return {
    showContextInfo: flags.UPLOAD_CONTEXT_INFO,
    allowMethodToggle: flags.UPLOAD_METHOD_TOGGLE,
    showUploadResults: flags.UPLOAD_RESULTS_DISPLAY
  };
}

/**
 * Development Helper: Feature Flag Status loggen
 */
export function logFeatureFlagStatus(): void {
  if (process.env.NODE_ENV === 'development') {
    const flags = getMediaLibraryFeatureFlags();
    console.log('🚩 Media Library Feature Flags:', {
      smartRouter: flags.USE_SMART_ROUTER,
      fallback: flags.SMART_ROUTER_FALLBACK,
      autoTagging: flags.AUTO_TAGGING,
      clientInheritance: flags.CLIENT_INHERITANCE,
      contextInfo: flags.UPLOAD_CONTEXT_INFO,
      methodToggle: flags.UPLOAD_METHOD_TOGGLE,
      logging: flags.SMART_ROUTER_LOGGING
    });
  }
}

/**
 * Feature Flag Middleware für Components
 */
export function withFeatureFlag<T>(
  flag: keyof MediaLibraryFeatureFlags,
  component: T,
  fallback?: T
): T | null {
  if (isFeatureEnabled(flag)) {
    return component;
  }
  return fallback || null;
}

// Development: Auto-log beim Import
if (process.env.NODE_ENV === 'development') {
  logFeatureFlagStatus();
}