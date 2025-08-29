/**
 * Mock für Firebase Config
 * Stellt Mock-Implementierungen für Firebase Services bereit
 */

// Mock Firebase App
export const app = {
  name: 'test-app',
  options: {},
  automaticDataCollectionEnabled: false
};

// Mock Firestore
export const db = {
  collection: jest.fn(),
  doc: jest.fn(),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  })),
  runTransaction: jest.fn((callback) => callback({
    get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
};

// Mock Storage
export const storage = {
  ref: jest.fn(() => ({
    child: jest.fn(() => ({
      put: jest.fn(() => Promise.resolve({
        ref: {
          getDownloadURL: jest.fn(() => Promise.resolve('https://mock-url.com/file'))
        }
      })),
      getDownloadURL: jest.fn(() => Promise.resolve('https://mock-url.com/file')),
      delete: jest.fn(() => Promise.resolve())
    }))
  }))
};

// Mock Auth (falls benötigt)
export const auth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn()
};