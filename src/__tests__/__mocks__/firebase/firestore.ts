/**
 * Mock für Firebase Firestore
 */

export const Timestamp = {
  now: () => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0
  }),
  fromDate: (date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0
  })
};

export const FieldValue = {
  serverTimestamp: () => Timestamp.now(),
  arrayUnion: (...args: any[]) => ({ arrayUnion: args }),
  arrayRemove: (...args: any[]) => ({ arrayRemove: args }),
  increment: (n: number) => ({ increment: n }),
  delete: () => ({ delete: true })
};

export const getFirestore = jest.fn(() => ({
  collection: jest.fn(),
  doc: jest.fn(),
  batch: jest.fn(),
  runTransaction: jest.fn()
}));

export const collection = jest.fn();
export const doc = jest.fn(() => ({
  id: 'mock-doc-id',
  get: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ id: 'mock-doc-id' }),
    id: 'mock-doc-id'
  })),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve())
}));

export const getDoc = jest.fn(() => Promise.resolve({
  exists: () => true,
  data: () => ({ id: 'mock-doc-id' }),
  id: 'mock-doc-id'
}));

export const getDocs = jest.fn(() => Promise.resolve({
  docs: [],
  empty: true,
  size: 0,
  forEach: jest.fn()
}));

export const addDoc = jest.fn(() => Promise.resolve({ id: 'new-doc-id' }));
export const updateDoc = jest.fn(() => Promise.resolve());
export const deleteDoc = jest.fn(() => Promise.resolve());
export const setDoc = jest.fn(() => Promise.resolve());

export const query = jest.fn((...args) => args);
export const where = jest.fn((...args) => args);
export const orderBy = jest.fn((...args) => args);
export const limit = jest.fn((...args) => args);
export const startAfter = jest.fn((...args) => args);
export const endBefore = jest.fn((...args) => args);

export const onSnapshot = jest.fn((query, callback) => {
  // Simuliere einen leeren Snapshot
  callback({
    docs: [],
    empty: true,
    size: 0,
    forEach: jest.fn()
  });
  // Return unsubscribe function
  return jest.fn();
});

export const serverTimestamp = () => Timestamp.now();

export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve())
}));

export const runTransaction = jest.fn();