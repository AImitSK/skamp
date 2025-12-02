// src/app/dashboard/pr-tools/media-library/__tests__/setup/jest-setup.ts
// Jest Setup und Konfiguration für Media Library Smart Router Tests

import '@testing-library/jest-dom';

// Setup Firebase Mocks manually (mock file doesn't exist)
const setupFirebaseMocks = () => {
  // Mock Firebase services
  jest.mock('@/lib/firebase/client-init', () => ({
    db: {},
    storage: {},
    auth: {}
  }));
};

// Global Test Setup
beforeAll(() => {
  // Setup Firebase Mocks
  setupFirebaseMocks();

  // Mock console methods für cleaner Test-Output
  global.console = {
    ...console,
    // Unterdrücke console.log in Tests (außer explizit aktiviert)
    log: process.env.JEST_VERBOSE === 'true' ? console.log : jest.fn(),
    // Behalte Warnings und Errors für Debugging
    warn: console.warn,
    error: console.error,
    info: process.env.JEST_VERBOSE === 'true' ? console.info : jest.fn(),
    debug: process.env.JEST_VERBOSE === 'true' ? console.debug : jest.fn()
  };

  // Mock Environment Variables für konsistente Tests (using Object.defineProperty for read-only properties)
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-bucket';
});

// Setup für jeden Test
beforeEach(() => {
  // Reset Date.now() für konsistente Timestamps in Tests
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  
  // Reset Math.random() für deterministische Tests
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

// Cleanup nach jedem Test
afterEach(() => {
  // Restore timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Restore Math.random
  jest.restoreAllMocks();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Clear any intervals/timeouts
  jest.clearAllTimers();
});

// Global Cleanup
afterAll(() => {
  // Restore original console
  global.console = console;
  
  // Clean up environment
  delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
});

// Custom Matchers für bessere Test-Assertions
expect.extend({
  toHaveValidUploadContext(received: any) {
    const pass = 
      received &&
      typeof received === 'object' &&
      typeof received.organizationId === 'string' &&
      typeof received.userId === 'string' &&
      typeof received.uploadType === 'string' &&
      Array.isArray(received.autoTags);

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid upload context`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid upload context with organizationId, userId, uploadType, and autoTags`,
        pass: false
      };
    }
  },
  
  toHaveValidAsset(received: any) {
    const pass = 
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.organizationId === 'string' &&
      typeof received.url === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid asset`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid asset with id, name, organizationId, and url`,
        pass: false
      };
    }
  },

  toBeValidFileSize(received: number) {
    const pass = typeof received === 'number' && received > 0 && received <= 100 * 1024 * 1024; // Max 100MB

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid file size`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid file size (> 0 and <= 100MB)`,
        pass: false
      };
    }
  },

  toHaveProgressBetween(received: number, min: number, max: number) {
    const pass = typeof received === 'number' && received >= min && received <= max;

    if (pass) {
      return {
        message: () => `expected ${received} not to be between ${min} and ${max}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be between ${min} and ${max}`,
        pass: false
      };
    }
  }
});

// Global Test Utilities
(globalThis as any).testUtils = {
  // Warte auf Async Operations
  waitForAsyncOperations: async (timeout: number = 100) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },
  
  // Simuliere User Interactions
  simulateFileUpload: (fileCount: number = 1) => {
    return Array.from({ length: fileCount }, (_, i) => 
      new File(['test content'], `test-${i}.jpg`, { type: 'image/jpeg' })
    );
  },
  
  // Erstelle Mock Upload Progress Handler
  createMockProgressHandler: () => {
    const progressUpdates: number[] = [];
    const handler = (progress: number) => {
      progressUpdates.push(progress);
    };
    handler.getUpdates = () => progressUpdates;
    handler.getLatest = () => progressUpdates[progressUpdates.length - 1] || 0;
    return handler;
  },
  
  // Erwarte bestimmte Anzahl von Mock-Aufrufen
  expectMockCallCount: (mockFn: jest.Mock, expectedCount: number) => {
    expect(mockFn).toHaveBeenCalledTimes(expectedCount);
  },
  
  // Erwarte Mock-Aufruf mit partiellen Parametern
  expectMockCalledWithPartial: (mockFn: jest.Mock, partialArgs: any) => {
    expect(mockFn).toHaveBeenCalledWith(expect.objectContaining(partialArgs));
  }
};

// Type Declarations für Custom Matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidUploadContext(): R;
      toHaveValidAsset(): R;
      toBeValidFileSize(): R;
      toHaveProgressBetween(min: number, max: number): R;
    }
  }
  
  interface Global {
    testUtils: {
      waitForAsyncOperations: (timeout?: number) => Promise<void>;
      simulateFileUpload: (fileCount?: number) => File[];
      createMockProgressHandler: () => ((progress: number) => void) & {
        getUpdates: () => number[];
        getLatest: () => number;
      };
      expectMockCallCount: (mockFn: jest.Mock, expectedCount: number) => void;
      expectMockCalledWithPartial: (mockFn: jest.Mock, partialArgs: any) => void;
    };
  }
}

// Error Handling für unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In Tests sollten unhandled rejections Fehler verursachen
  throw reason;
});

// Performance Monitoring für Tests
const testPerformanceMonitor = {
  startTime: Date.now(),
  slowTests: [] as Array<{ testName: string; duration: number }>,
  
  recordTest: (testName: string, duration: number) => {
    if (duration > 1000) { // Tests länger als 1 Sekunde
      testPerformanceMonitor.slowTests.push({ testName, duration });
    }
  },
  
  reportSlowTests: () => {
    if (testPerformanceMonitor.slowTests.length > 0) {
      console.warn('Slow tests detected:', testPerformanceMonitor.slowTests);
    }
  }
};

// Hook für Performance Monitoring
let currentTestStart: number;

beforeEach(() => {
  currentTestStart = Date.now();
});

afterEach(() => {
  const duration = Date.now() - currentTestStart;
  const testName = expect.getState().currentTestName || 'unknown';
  testPerformanceMonitor.recordTest(testName, duration);
});

afterAll(() => {
  testPerformanceMonitor.reportSlowTests();
});

// Export für Verwendung in Tests
export { testPerformanceMonitor };

const jestSetupConfig = {
  setupFirebaseMocks,
  testPerformanceMonitor
};

export default jestSetupConfig;

// Dummy test to prevent Jest error
describe('Jest Setup', () => {
  it('should have test utilities available', () => {
    expect((globalThis as any).testUtils).toBeDefined();
    expect(typeof (globalThis as any).testUtils.waitForAsyncOperations).toBe('function');
  });
});