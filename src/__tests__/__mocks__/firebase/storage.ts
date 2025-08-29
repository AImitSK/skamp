/**
 * Mock für Firebase Storage
 */

const mockStorageRef: any = {
  child: jest.fn((path: string) => ({
    ...mockStorageRef,
    fullPath: path
  })),
  put: jest.fn(),
  putString: jest.fn(),
  getDownloadURL: jest.fn(),
  delete: jest.fn(),
  listAll: jest.fn(),
  getMetadata: jest.fn(),
  fullPath: '/mock/path'
};

export const getStorage = jest.fn(() => ({
  ref: jest.fn(() => mockStorageRef)
}));

export const ref = jest.fn(() => mockStorageRef);

export const uploadBytes = jest.fn(() => Promise.resolve({
  metadata: {
    fullPath: '/mock/path/file.jpg',
    name: 'file.jpg',
    size: 1024
  },
  ref: mockStorageRef
}));

export const uploadString = jest.fn(() => Promise.resolve({
  metadata: {
    fullPath: '/mock/path/file.txt',
    name: 'file.txt'
  },
  ref: mockStorageRef
}));

export const getDownloadURL = jest.fn(() => 
  Promise.resolve('https://mock-storage.com/file.jpg')
);

export const deleteObject = jest.fn(() => Promise.resolve());

export const listAll = jest.fn(() => Promise.resolve({
  items: [],
  prefixes: []
}));

export const getMetadata = jest.fn(() => Promise.resolve({
  name: 'file.jpg',
  size: 1024,
  contentType: 'image/jpeg',
  timeCreated: new Date().toISOString()
}));

// Aktualisiere die Referenzen auf die echten Mock-Funktionen
mockStorageRef.put = uploadBytes;
mockStorageRef.putString = uploadString;
mockStorageRef.getDownloadURL = getDownloadURL;
mockStorageRef.delete = deleteObject;
mockStorageRef.listAll = listAll;
mockStorageRef.getMetadata = getMetadata;

export const storageRef = mockStorageRef;