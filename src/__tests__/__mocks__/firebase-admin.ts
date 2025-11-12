/**
 * Mock für Firebase Admin SDK
 * Wird in Server-Side API-Route-Tests verwendet
 */

// Mock für Firestore Query-Chain
const createMockQuery = () => {
  const mockQuery: any = {
    where: jest.fn(() => mockQuery),
    orderBy: jest.fn(() => mockQuery),
    limit: jest.fn(() => mockQuery),
    get: jest.fn(() => Promise.resolve({
      docs: [],
      empty: true,
      size: 0
    })),
    count: jest.fn(() => Promise.resolve({
      data: () => ({ count: 0 })
    }))
  };
  return mockQuery;
};

// Mock für Firestore Document Reference
const createMockDocRef = () => ({
  get: jest.fn(() => Promise.resolve({
    exists: false,
    data: () => null,
    id: 'mock-doc-id'
  })),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve())
});

// Mock für Firestore Collection Reference
const createMockCollectionRef = () => ({
  doc: jest.fn((docId?: string) => createMockDocRef()),
  where: jest.fn(() => createMockQuery()),
  orderBy: jest.fn(() => createMockQuery()),
  limit: jest.fn(() => createMockQuery()),
  get: jest.fn(() => Promise.resolve({
    docs: [],
    empty: true,
    size: 0
  })),
  add: jest.fn((data) => Promise.resolve({
    id: 'mock-new-doc-id',
    ...createMockDocRef()
  }))
});

// Haupt-Mock: adminDb
export const adminDb = {
  collection: jest.fn((collectionName: string) => createMockCollectionRef())
};

// Mock für Firebase Admin FieldValue
export const FieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
  increment: jest.fn((n: number) => n),
  arrayUnion: jest.fn((...items: any[]) => items),
  arrayRemove: jest.fn((...items: any[]) => items),
  delete: jest.fn(() => null)
};

// Mock für Firebase Admin Timestamp
export const Timestamp = {
  now: jest.fn(() => ({
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toDate: () => new Date()
  })),
  fromDate: jest.fn((date: Date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date
  }))
};

// Helper-Funktion: Mock-Daten für Collection setzen
export const mockCollectionData = (collectionName: string, docs: any[]) => {
  (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
    if (name === collectionName) {
      const mockCollectionRef = createMockCollectionRef();
      mockCollectionRef.get.mockResolvedValue({
        docs: docs.map(doc => ({
          id: doc.id || 'mock-id',
          data: () => doc,
          exists: true
        })),
        empty: docs.length === 0,
        size: docs.length
      });
      return mockCollectionRef;
    }
    return createMockCollectionRef();
  });
};

// Helper-Funktion: Mock-Daten für einzelnes Dokument setzen
export const mockDocumentData = (collectionName: string, docId: string, data: any) => {
  (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
    if (name === collectionName) {
      const mockCollectionRef = createMockCollectionRef();
      (mockCollectionRef.doc as jest.Mock).mockImplementation((id: string) => {
        if (id === docId) {
          const mockDocRef = createMockDocRef();
          mockDocRef.get.mockResolvedValue({
            exists: !!data,
            data: () => data,
            id: docId
          });
          return mockDocRef;
        }
        return createMockDocRef();
      });
      return mockCollectionRef;
    }
    return createMockCollectionRef();
  });
};

// Helper-Funktion: Alle Mocks zurücksetzen
export const resetAdminMocks = () => {
  jest.clearAllMocks();
  (adminDb.collection as jest.Mock).mockImplementation(() => createMockCollectionRef());
};

// Default Export für einfachen Import
export default {
  adminDb,
  FieldValue,
  Timestamp,
  mockCollectionData,
  mockDocumentData,
  resetAdminMocks
};
