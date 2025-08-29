/**
 * Mock für Firebase App
 */

const mockApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    authDomain: 'mock.firebaseapp.com',
    projectId: 'mock-project',
    storageBucket: 'mock.appspot.com',
    messagingSenderId: '123456789',
    appId: 'mock-app-id'
  },
  automaticDataCollectionEnabled: false
};

export const initializeApp = jest.fn(() => mockApp);

export const getApps = jest.fn(() => [mockApp]);

export const getApp = jest.fn(() => mockApp);

export const deleteApp = jest.fn(() => Promise.resolve());