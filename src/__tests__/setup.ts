// Test setup file for Jest
import 'jest-environment-jsdom';

// Mock fetch for Firebase Auth
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock Response for Firebase
global.Response = class {
  ok = true;
  status = 200;
  statusText = 'OK';
  constructor(public body?: any, options?: any) {}
  json() { return Promise.resolve(this.body); }
  text() { return Promise.resolve(String(this.body)); }
} as any;

// Mock crypto for sharing IDs
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-12345678',
  },
});

// Mock window.location (simplified)
try {
  delete (window as any).location;
  (window as any).location = { 
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000'
  };
} catch (e) {
  // Location bereits definiert, ignorieren
}

// Mock Image for asset validation
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  set src(value: string) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };