/**
 * Globaler Firebase Mock Setup für alle Tests
 */

// Mock Firebase modules bevor sie importiert werden
// Note: Inline implementation to avoid circular dependency with require()
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    now: jest.fn(),
    fromDate: jest.fn()
  },
  FieldValue: {
    serverTimestamp: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    increment: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {},
  storage: {},
  app: {}
}));

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