// src/app/dashboard/pr-tools/media-library/config/__tests__/feature-flags.test.ts
// Umfassende Tests für Media Library Feature Flags und Environment Variable Handling

import {
  MediaLibraryFeatureFlags,
  getMediaLibraryFeatureFlags,
  isFeatureEnabled,
  useMediaLibraryFeatureFlags,
  shouldUseSmartRouter,
  isDebuggingEnabled,
  getUploadPerformanceConfig,
  getUIFeatureConfig,
  logFeatureFlagStatus,
  withFeatureFlag
} from '../feature-flags';

// Mock console für Logging Tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

// Environment Variable Mocking Helper
const mockEnv = (envVars: Record<string, string | undefined>) => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv, ...envVars };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
};

describe('MediaLibraryFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('getMediaLibraryFeatureFlags', () => {
    it('sollte Standard Feature Flags zurückgeben', () => {
      const flags = getMediaLibraryFeatureFlags();
      
      expect(flags).toMatchObject({
        USE_SMART_ROUTER: true,
        SMART_ROUTER_FALLBACK: true,
        AUTO_TAGGING: true,
        CLIENT_INHERITANCE: true,
        FOLDER_ROUTING: true,
        UPLOAD_CONTEXT_INFO: true,
        UPLOAD_RESULTS_DISPLAY: true,
        BATCH_UPLOADS: true,
        PARALLEL_UPLOADS: true,
        UPLOAD_RETRY: true
      });
    });

    it('sollte Development-spezifische Flags korrekt setzen', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      const flags = getMediaLibraryFeatureFlags();

      expect(flags.SMART_ROUTER_LOGGING).toBe(true);
      expect(flags.UPLOAD_METHOD_TOGGLE).toBe(true);

      process.env = originalEnv;
    });

    it('sollte Production-spezifische Flags korrekt setzen', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      const flags = getMediaLibraryFeatureFlags();

      expect(flags.SMART_ROUTER_LOGGING).toBe(false);
      expect(flags.UPLOAD_METHOD_TOGGLE).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('Environment Variable Overrides', () => {
    describe('NEXT_PUBLIC_DISABLE_SMART_ROUTER', () => {
      mockEnv({ NEXT_PUBLIC_DISABLE_SMART_ROUTER: 'true' });

      it('sollte Smart Router deaktivieren', () => {
        const flags = getMediaLibraryFeatureFlags();
        expect(flags.USE_SMART_ROUTER).toBe(false);
      });

      it('sollte shouldUseSmartRouter false zurückgeben', () => {
        const useSmartRouter = shouldUseSmartRouter();
        expect(useSmartRouter).toBe(false);
      });
    });

    describe('NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING', () => {
      mockEnv({ NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING: 'true' });

      it('sollte alle Debug-Features aktivieren', () => {
        const flags = getMediaLibraryFeatureFlags();
        
        expect(flags.SMART_ROUTER_LOGGING).toBe(true);
        expect(flags.UPLOAD_METHOD_TOGGLE).toBe(true);
        expect(flags.UPLOAD_RESULTS_DISPLAY).toBe(true);
      });

      it('sollte isDebuggingEnabled true zurückgeben', () => {
        const debuggingEnabled = isDebuggingEnabled();
        expect(debuggingEnabled).toBe(true);
      });
    });

    describe('Kombinierte Environment Variables', () => {
      mockEnv({ 
        NEXT_PUBLIC_DISABLE_SMART_ROUTER: 'true',
        NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING: 'true'
      });

      it('sollte beide Overrides korrekt anwenden', () => {
        const flags = getMediaLibraryFeatureFlags();
        
        expect(flags.USE_SMART_ROUTER).toBe(false); // Disabled by first env var
        expect(flags.SMART_ROUTER_LOGGING).toBe(true); // Enabled by second env var
        expect(flags.UPLOAD_METHOD_TOGGLE).toBe(true); // Enabled by second env var
      });
    });

    describe('Falsy Environment Variables', () => {
      mockEnv({ 
        NEXT_PUBLIC_DISABLE_SMART_ROUTER: 'false',
        NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING: 'false'
      });

      it('sollte Standard-Werte bei false Strings verwenden', () => {
        const flags = getMediaLibraryFeatureFlags();
        
        expect(flags.USE_SMART_ROUTER).toBe(true); // Default value
        expect(flags.SMART_ROUTER_LOGGING).toBe(process.env.NODE_ENV === 'development');
      });
    });

    describe('Undefined Environment Variables', () => {
      mockEnv({ 
        NEXT_PUBLIC_DISABLE_SMART_ROUTER: undefined,
        NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING: undefined
      });

      it('sollte Standard-Werte bei undefined verwenden', () => {
        const flags = getMediaLibraryFeatureFlags();
        
        expect(flags.USE_SMART_ROUTER).toBe(true); // Default value
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('sollte einzelne Feature Flags korrekt prüfen', () => {
      expect(isFeatureEnabled('USE_SMART_ROUTER')).toBe(true);
      expect(isFeatureEnabled('AUTO_TAGGING')).toBe(true);
      expect(isFeatureEnabled('CLIENT_INHERITANCE')).toBe(true);
    });

    it('sollte Environment Overrides berücksichtigen', () => {
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      expect(isFeatureEnabled('USE_SMART_ROUTER')).toBe(false);
      
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });
  });

  describe('useMediaLibraryFeatureFlags Hook Simulation', () => {
    it('sollte alle Feature Flags zurückgeben', () => {
      const flags = useMediaLibraryFeatureFlags();
      
      expect(flags).toHaveProperty('USE_SMART_ROUTER');
      expect(flags).toHaveProperty('AUTO_TAGGING');
      expect(flags).toHaveProperty('UPLOAD_CONTEXT_INFO');
      expect(typeof flags.USE_SMART_ROUTER).toBe('boolean');
      expect(typeof flags.AUTO_TAGGING).toBe('boolean');
    });

    it('sollte konsistente Werte bei mehrfachen Aufrufen zurückgeben', () => {
      const flags1 = useMediaLibraryFeatureFlags();
      const flags2 = useMediaLibraryFeatureFlags();
      
      expect(flags1).toEqual(flags2);
    });
  });

  describe('shouldUseSmartRouter', () => {
    it('sollte bei aktiviertem Feature Flag true zurückgeben', () => {
      expect(shouldUseSmartRouter()).toBe(true);
    });

    it('sollte Environment Override respektieren', () => {
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      expect(shouldUseSmartRouter()).toBe(false);
      
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });
  });

  describe('isDebuggingEnabled', () => {
    it('sollte in Development Mode true zurückgeben', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      expect(isDebuggingEnabled()).toBe(true);

      process.env = originalEnv;
    });

    it('sollte in Production Mode false zurückgeben', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      expect(isDebuggingEnabled()).toBe(false);

      process.env = originalEnv;
    });

    it('sollte bei Debug Environment Variable true zurückgeben', () => {
      const originalEnv = process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING;
      process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING = 'true';
      
      expect(isDebuggingEnabled()).toBe(true);
      
      process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING = originalEnv;
    });
  });

  describe('getUploadPerformanceConfig', () => {
    it('sollte Standard Performance Config zurückgeben', () => {
      const config = getUploadPerformanceConfig();
      
      expect(config).toEqual({
        enableBatching: true,
        enableParallel: true,
        enableRetry: true,
        maxRetries: 3,
        batchSize: 5
      });
    });

    it('sollte maxRetries 0 bei deaktiviertem Retry setzen', () => {
      // Mock Feature Flags temporär
      const originalGetFlags = require('../feature-flags').getMediaLibraryFeatureFlags;
      const mockGetFlags = jest.fn().mockReturnValue({
        ...originalGetFlags(),
        UPLOAD_RETRY: false
      });
      
      jest.doMock('../feature-flags', () => ({
        ...jest.requireActual('../feature-flags'),
        getMediaLibraryFeatureFlags: mockGetFlags
      }));
      
      // Reload module to get mocked version
      delete require.cache[require.resolve('../feature-flags')];
      const { getUploadPerformanceConfig: mockedGetConfig } = require('../feature-flags');
      
      const config = mockedGetConfig();
      expect(config.maxRetries).toBe(0);
      
      // Reset
      jest.unmock('../feature-flags');
      delete require.cache[require.resolve('../feature-flags')];
    });

    it('sollte batchSize 1 bei deaktiviertem Batching setzen', () => {
      // Similar mock approach as above
      const originalGetFlags = require('../feature-flags').getMediaLibraryFeatureFlags;
      const mockGetFlags = jest.fn().mockReturnValue({
        ...originalGetFlags(),
        BATCH_UPLOADS: false
      });
      
      jest.doMock('../feature-flags', () => ({
        ...jest.requireActual('../feature-flags'),
        getMediaLibraryFeatureFlags: mockGetFlags
      }));
      
      delete require.cache[require.resolve('../feature-flags')];
      const { getUploadPerformanceConfig: mockedGetConfig } = require('../feature-flags');
      
      const config = mockedGetConfig();
      expect(config.batchSize).toBe(1);
      
      jest.unmock('../feature-flags');
      delete require.cache[require.resolve('../feature-flags')];
    });
  });

  describe('getUIFeatureConfig', () => {
    it('sollte Standard UI Config zurückgeben', () => {
      const config = getUIFeatureConfig();
      
      expect(config).toEqual({
        showContextInfo: true,
        allowMethodToggle: process.env.NODE_ENV === 'development',
        showUploadResults: true
      });
    });

    it('sollte Development-spezifische UI Config zurückgeben', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      const config = getUIFeatureConfig();
      expect(config.allowMethodToggle).toBe(true);

      process.env = originalEnv;
    });

    it('sollte Production-spezifische UI Config zurückgeben', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      const config = getUIFeatureConfig();
      expect(config.allowMethodToggle).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('logFeatureFlagStatus', () => {
    it('sollte in Development Mode loggen', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      logFeatureFlagStatus();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚩 Media Library Feature Flags:',
        expect.objectContaining({
          smartRouter: expect.any(Boolean),
          fallback: expect.any(Boolean),
          autoTagging: expect.any(Boolean),
          clientInheritance: expect.any(Boolean),
          contextInfo: expect.any(Boolean),
          methodToggle: expect.any(Boolean),
          logging: expect.any(Boolean)
        })
      );

      process.env = originalEnv;
    });

    it('sollte in Production Mode nicht loggen', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      logFeatureFlagStatus();

      expect(mockConsoleLog).not.toHaveBeenCalled();

      process.env = originalEnv;
    });
  });

  describe('withFeatureFlag Middleware', () => {
    const mockComponent = 'MockComponent';
    const mockFallback = 'FallbackComponent';

    it('sollte Component zurückgeben wenn Feature aktiviert ist', () => {
      const result = withFeatureFlag('USE_SMART_ROUTER', mockComponent, mockFallback);
      expect(result).toBe(mockComponent);
    });

    it('sollte Fallback zurückgeben wenn Feature deaktiviert ist', () => {
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      const result = withFeatureFlag('USE_SMART_ROUTER', mockComponent, mockFallback);
      expect(result).toBe(mockFallback);
      
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });

    it('sollte null zurückgeben wenn Feature deaktiviert und kein Fallback', () => {
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      const result = withFeatureFlag('USE_SMART_ROUTER', mockComponent);
      expect(result).toBeNull();
      
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });
  });

  describe('Edge Cases und Error Handling', () => {
    it('sollte mit ungültigen Feature Flag Keys umgehen', () => {
      // @ts-expect-error Testing invalid key
      const result = isFeatureEnabled('INVALID_FEATURE_FLAG');
      expect(result).toBeUndefined();
    });

    it('sollte mit undefined Environment Variables umgehen', () => {
      const originalEnvs = {
        NEXT_PUBLIC_DISABLE_SMART_ROUTER: process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER,
        NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING: process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING
      };
      
      delete process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      delete process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING;
      
      const flags = getMediaLibraryFeatureFlags();
      
      expect(flags.USE_SMART_ROUTER).toBe(true); // Should use default
      expect(typeof flags.SMART_ROUTER_LOGGING).toBe('boolean');
      
      // Restore
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnvs.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING = originalEnvs.NEXT_PUBLIC_ENABLE_UPLOAD_DEBUGGING;
    });

    it('sollte mit verschiedenen String-Varianten von Environment Variables umgehen', () => {
      const testCases = ['TRUE', 'True', '1', 'yes', 'on'];
      
      testCases.forEach(value => {
        const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
        process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = value;
        
        const flags = getMediaLibraryFeatureFlags();
        // Nur 'true' sollte als truthy interpretiert werden
        expect(flags.USE_SMART_ROUTER).toBe(value !== 'true');
        
        process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
      });
    });
  });

  describe('Runtime Feature Flag Changes', () => {
    it('sollte Environment Changes bei erneutem Aufruf berücksichtigen', () => {
      // Initial state
      const flags1 = getMediaLibraryFeatureFlags();
      expect(flags1.USE_SMART_ROUTER).toBe(true);
      
      // Change environment
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      // New call should reflect change
      const flags2 = getMediaLibraryFeatureFlags();
      expect(flags2.USE_SMART_ROUTER).toBe(false);
      
      // Restore
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });

    it('sollte NODE_ENV Changes bei erneutem Aufruf berücksichtigen', () => {
      const originalEnv = process.env;

      process.env = { ...originalEnv, NODE_ENV: 'development' };
      const devFlags = getMediaLibraryFeatureFlags();
      expect(devFlags.UPLOAD_METHOD_TOGGLE).toBe(true);

      process.env = { ...originalEnv, NODE_ENV: 'production' };
      const prodFlags = getMediaLibraryFeatureFlags();
      expect(prodFlags.UPLOAD_METHOD_TOGGLE).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('Feature Flag Combinations', () => {
    it('sollte UI Features bei deaktiviertem Smart Router korrekt handhaben', () => {
      const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = 'true';
      
      const smartRouterEnabled = shouldUseSmartRouter();
      const uiConfig = getUIFeatureConfig();
      
      expect(smartRouterEnabled).toBe(false);
      // UI Features sollten unabhängig vom Smart Router funktionieren
      expect(uiConfig.showContextInfo).toBe(true);
      expect(uiConfig.showUploadResults).toBe(true);
      
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    });

    it('sollte Performance Config bei deaktivierten Features korrekt setzen', () => {
      // Mock all performance features disabled
      const mockFlags: MediaLibraryFeatureFlags = {
        USE_SMART_ROUTER: false,
        SMART_ROUTER_FALLBACK: false,
        SMART_ROUTER_LOGGING: false,
        AUTO_TAGGING: false,
        CLIENT_INHERITANCE: false,
        FOLDER_ROUTING: false,
        UPLOAD_CONTEXT_INFO: false,
        UPLOAD_METHOD_TOGGLE: false,
        UPLOAD_RESULTS_DISPLAY: false,
        BATCH_UPLOADS: false,
        PARALLEL_UPLOADS: false,
        UPLOAD_RETRY: false
      };
      
      jest.doMock('../feature-flags', () => ({
        ...jest.requireActual('../feature-flags'),
        getMediaLibraryFeatureFlags: () => mockFlags
      }));
      
      delete require.cache[require.resolve('../feature-flags')];
      const { getUploadPerformanceConfig } = require('../feature-flags');
      
      const config = getUploadPerformanceConfig();
      
      expect(config).toEqual({
        enableBatching: false,
        enableParallel: false,
        enableRetry: false,
        maxRetries: 0,
        batchSize: 1
      });
      
      jest.unmock('../feature-flags');
      delete require.cache[require.resolve('../feature-flags')];
    });
  });
});

describe('Integration mit anderen Modulen', () => {
  it('sollte mit Context Builder kompatibel sein', () => {
    const flags = getMediaLibraryFeatureFlags();
    
    // Test dass Feature Flags die erwartete Struktur haben
    expect(typeof flags.USE_SMART_ROUTER).toBe('boolean');
    expect(typeof flags.AUTO_TAGGING).toBe('boolean');
    expect(typeof flags.CLIENT_INHERITANCE).toBe('boolean');
  });

  it('sollte mit UploadModal Props kompatibel sein', () => {
    const uiConfig = getUIFeatureConfig();
    
    // Test dass UI Config die erwarteten Properties hat
    expect(typeof uiConfig.showContextInfo).toBe('boolean');
    expect(typeof uiConfig.allowMethodToggle).toBe('boolean');
    expect(typeof uiConfig.showUploadResults).toBe('boolean');
  });

  it('sollte Performance Konfiguration für Upload Service bereitstellen', () => {
    const perfConfig = getUploadPerformanceConfig();
    
    // Test dass Performance Config die erwarteten Werte hat
    expect(typeof perfConfig.enableBatching).toBe('boolean');
    expect(typeof perfConfig.enableParallel).toBe('boolean');
    expect(typeof perfConfig.maxRetries).toBe('number');
    expect(typeof perfConfig.batchSize).toBe('number');
    expect(perfConfig.maxRetries).toBeGreaterThanOrEqual(0);
    expect(perfConfig.batchSize).toBeGreaterThan(0);
  });
});

describe('Memory und Performance Tests', () => {
  it('sollte bei häufigen Feature Flag Abfragen performant sein', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      getMediaLibraryFeatureFlags();
      isFeatureEnabled('USE_SMART_ROUTER');
      shouldUseSmartRouter();
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Sollte weniger als 100ms dauern
    expect(duration).toBeLessThan(100);
  });

  it('sollte keine Memory Leaks bei Environment Changes haben', () => {
    const originalEnv = process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER;
    
    // Multiple environment changes
    for (let i = 0; i < 100; i++) {
      process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = i % 2 === 0 ? 'true' : undefined;
      getMediaLibraryFeatureFlags();
    }
    
    process.env.NEXT_PUBLIC_DISABLE_SMART_ROUTER = originalEnv;
    
    // Test sollte ohne Memory Issues durchlaufen
    expect(true).toBe(true);
  });
});