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

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Fix for React 18 Testing Library createRoot issue in JSDOM
// This is a known issue with React 18 + JSDOM + Testing Library
// For now, we'll handle this in individual test files if needed

// Mock Firebase completely for tests
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' }))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn()),
  connectFunctionsEmulator: jest.fn()
}));

// Mock nanoid to prevent ES module issues
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-12345'),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useParams: jest.fn(() => ({
    campaignId: 'test-campaign-123',
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
    has: jest.fn(() => false),
  })),
  usePathname: jest.fn(() => '/dashboard/pr-tools/campaigns'),
}));

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };