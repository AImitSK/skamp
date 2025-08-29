/**
 * Globaler Firebase Mock Setup für alle Tests
 */

// Mock Firebase modules bevor sie importiert werden
jest.mock('firebase/app', () => require('./__mocks__/firebase/app'));
jest.mock('firebase/firestore', () => require('./__mocks__/firebase/firestore'));
jest.mock('firebase/storage', () => require('./__mocks__/firebase/storage'));
jest.mock('@/lib/firebase/config', () => require('./__mocks__/firebase/config'));

// Mock Firebase Auth (falls benötigt)
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn(); // unsubscribe function
    })
  })),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
    user: { uid: 'test-user-id', email: 'test@example.com' }
  })),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn()
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  }),
  useSearchParams: () => ({
    get: jest.fn()
  }),
  usePathname: () => '/'
}));

// Globale Test-Utilities
const mockFirestoreData = (data: any) => {
  const { getDoc, getDocs } = require('./__mocks__/firebase/firestore');
  
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => data,
    id: data.id || 'mock-id'
  });
  
  getDocs.mockResolvedValue({
    docs: Array.isArray(data) ? data.map(d => ({
      id: d.id || 'mock-id',
      data: () => d
    })) : [],
    empty: false,
    size: Array.isArray(data) ? data.length : 0
  });
};

// Export als globale Utility
(globalThis as any).mockFirestoreData = mockFirestoreData;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});