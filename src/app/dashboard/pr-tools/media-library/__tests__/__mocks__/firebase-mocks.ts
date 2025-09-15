// src/app/dashboard/pr-tools/media-library/__tests__/__mocks__/firebase-mocks.ts
// Umfassendes Firebase Mocking Setup für Media Library Smart Router Integration Tests

import { jest } from '@jest/globals';

/**
 * Firebase Firestore Mock
 * Vollständige Mock-Implementierung für alle Firestore-Operationen
 */
export const createFirestoreMock = () => {
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockQuery = jest.fn();
  const mockGetDoc = jest.fn();
  const mockGetDocs = jest.fn();
  const mockSetDoc = jest.fn();
  const mockUpdateDoc = jest.fn();
  const mockDeleteDoc = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();
  const mockStartAfter = jest.fn();
  const mockOnSnapshot = jest.fn();
  const mockBatch = jest.fn();
  const mockRunTransaction = jest.fn();

  // Mock Document Reference
  const createDocumentReference = (id: string, path: string) => ({
    id,
    path,
    parent: mockCollection,
    get: mockGetDoc,
    set: mockSetDoc,
    update: mockUpdateDoc,
    delete: mockDeleteDoc,
    onSnapshot: mockOnSnapshot,
    converter: null,
    firestore: {},
    withConverter: jest.fn()
  });

  // Mock Collection Reference
  const createCollectionReference = (id: string, path: string) => ({
    id,
    path,
    parent: mockDoc,
    doc: mockDoc,
    add: jest.fn(),
    get: mockGetDocs,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    onSnapshot: mockOnSnapshot,
    firestore: {},
    withConverter: jest.fn()
  });

  // Mock Document Snapshot
  const createDocumentSnapshot = (data: any, exists: boolean = true, id: string = 'mock-doc') => ({
    id,
    ref: createDocumentReference(id, `mock-collection/${id}`),
    exists: () => exists,
    data: () => data,
    get: (field: string) => data?.[field],
    metadata: {
      hasPendingWrites: false,
      fromCache: false
    }
  });

  // Mock Query Snapshot
  const createQuerySnapshot = (docs: any[] = [], empty: boolean = false) => ({
    docs: docs.map((doc, index) => createDocumentSnapshot(doc, true, `doc-${index}`)),
    empty,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((doc, index) => 
        callback(createDocumentSnapshot(doc, true, `doc-${index}`))
      );
    },
    metadata: {
      hasPendingWrites: false,
      fromCache: false
    }
  });

  // Setup default mock implementations
  mockDoc.mockImplementation((pathOrId?: string) => {
    const id = pathOrId || 'mock-doc-id';
    return createDocumentReference(id, `mock-collection/${id}`);
  });

  mockCollection.mockImplementation((path: string) => {
    return createCollectionReference(path.split('/').pop() || 'mock-collection', path);
  });

  mockGetDoc.mockResolvedValue(
    createDocumentSnapshot({ mockField: 'mockValue' }, true)
  );

  mockGetDocs.mockResolvedValue(
    createQuerySnapshot([
      { id: 'doc1', name: 'Test Document 1' },
      { id: 'doc2', name: 'Test Document 2' }
    ])
  );

  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);

  mockWhere.mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGetDocs,
    onSnapshot: mockOnSnapshot
  });

  mockOrderBy.mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGetDocs,
    onSnapshot: mockOnSnapshot
  });

  mockLimit.mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGetDocs,
    onSnapshot: mockOnSnapshot
  });

  mockOnSnapshot.mockImplementation((callback: (snapshot: any) => void) => {
    // Simuliere initial snapshot
    setTimeout(() => {
      callback(createQuerySnapshot([
        { id: 'real-time-doc', updatedAt: new Date().toISOString() }
      ]));
    }, 0);
    
    // Return unsubscribe function
    return () => {};
  });

  return {
    // Core functions
    collection: mockCollection,
    doc: mockDoc,
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    
    // Query functions
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    
    // Real-time functions
    onSnapshot: mockOnSnapshot,
    
    // Transaction functions
    writeBatch: mockBatch,
    runTransaction: mockRunTransaction,
    
    // Helper functions for tests
    createDocumentSnapshot,
    createQuerySnapshot,
    createDocumentReference,
    createCollectionReference,
    
    // Mock instances for direct access
    mocks: {
      collection: mockCollection,
      doc: mockDoc,
      getDoc: mockGetDoc,
      getDocs: mockGetDocs,
      setDoc: mockSetDoc,
      updateDoc: mockUpdateDoc,
      deleteDoc: mockDeleteDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      onSnapshot: mockOnSnapshot
    }
  };
};

/**
 * Firebase Storage Mock
 * Vollständige Mock-Implementierung für alle Storage-Operationen
 */
export const createStorageMock = () => {
  const mockRef = jest.fn();
  const mockUploadBytes = jest.fn();
  const mockUploadBytesResumable = jest.fn();
  const mockGetDownloadURL = jest.fn();
  const mockDeleteObject = jest.fn();
  const mockListAll = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockUpdateMetadata = jest.fn();

  // Mock Storage Reference
  const createStorageReference = (fullPath: string, name: string = 'mock-file.jpg') => ({
    bucket: 'mock-bucket',
    fullPath,
    name,
    parent: mockRef(),
    root: mockRef(),
    storage: {},
    toString: () => fullPath,
    child: (path: string) => createStorageReference(`${fullPath}/${path}`, path)
  });

  // Mock Upload Task
  const createUploadTask = (file: File, progress: number = 0) => {
    const task = {
      snapshot: {
        bytesTransferred: Math.floor(file.size * (progress / 100)),
        totalBytes: file.size,
        state: progress < 100 ? 'running' : 'success',
        ref: createStorageReference(`uploads/${file.name}`, file.name),
        metadata: {
          name: file.name,
          bucket: 'mock-bucket',
          generation: '1',
          metageneration: '1',
          fullPath: `uploads/${file.name}`,
          size: file.size,
          timeCreated: new Date().toISOString(),
          updated: new Date().toISOString(),
          contentType: file.type
        },
        task
      },
      cancel: jest.fn(),
      catch: jest.fn(),
      finally: jest.fn(),
      on: jest.fn((event: string, onProgress: any, onError: any, onComplete: any) => {
        // Simuliere Progress Updates
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += 20;
          if (currentProgress <= 100) {
            task.snapshot.bytesTransferred = Math.floor(file.size * (currentProgress / 100));
            task.snapshot.state = currentProgress < 100 ? 'running' : 'success';
            onProgress?.(task.snapshot);
            
            if (currentProgress >= 100) {
              clearInterval(progressInterval);
              onComplete?.(task.snapshot);
            }
          }
        }, 50);
        
        // Return unsubscribe function
        return () => clearInterval(progressInterval);
      }),
      pause: jest.fn(),
      resume: jest.fn(),
      then: jest.fn((onResolve) => {
        setTimeout(() => {
          task.snapshot.state = 'success';
          task.snapshot.bytesTransferred = file.size;
          onResolve?.(task.snapshot);
        }, 100);
        return Promise.resolve(task.snapshot);
      })
    };
    
    return task;
  };

  // Mock List Result
  const createListResult = (items: string[] = [], prefixes: string[] = []) => ({
    items: items.map(item => createStorageReference(item, item.split('/').pop())),
    prefixes: prefixes.map(prefix => createStorageReference(prefix, prefix.split('/').pop())),
    nextPageToken: null
  });

  // Setup default implementations
  mockRef.mockImplementation((path?: string) => {
    return createStorageReference(path || 'mock-path', path?.split('/').pop() || 'mock-file');
  });

  mockUploadBytes.mockImplementation((ref: any, data: File | Uint8Array, metadata?: any) => {
    const file = data instanceof File ? data : new File([data], 'uploaded-file.bin');
    return Promise.resolve({
      ref,
      metadata: {
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        fullPath: ref.fullPath,
        ...metadata
      }
    });
  });

  mockUploadBytesResumable.mockImplementation((ref: any, data: File | Uint8Array, metadata?: any) => {
    const file = data instanceof File ? data : new File([data], 'resumable-file.bin');
    return createUploadTask(file);
  });

  mockGetDownloadURL.mockImplementation((ref: any) => {
    return Promise.resolve(`https://mock-storage.googleapis.com/downloads/${ref.fullPath}?token=mock-token`);
  });

  mockDeleteObject.mockResolvedValue(undefined);

  mockListAll.mockImplementation((ref: any) => {
    return Promise.resolve(createListResult(
      [`${ref.fullPath}/file1.jpg`, `${ref.fullPath}/file2.png`],
      [`${ref.fullPath}/subfolder1`, `${ref.fullPath}/subfolder2`]
    ));
  });

  mockGetMetadata.mockImplementation((ref: any) => {
    return Promise.resolve({
      name: ref.name,
      bucket: 'mock-bucket',
      fullPath: ref.fullPath,
      size: 1024,
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      contentType: 'image/jpeg'
    });
  });

  mockUpdateMetadata.mockImplementation((ref: any, metadata: any) => {
    return Promise.resolve({
      name: ref.name,
      bucket: 'mock-bucket',
      fullPath: ref.fullPath,
      size: 1024,
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...metadata
    });
  });

  return {
    // Core functions
    ref: mockRef,
    uploadBytes: mockUploadBytes,
    uploadBytesResumable: mockUploadBytesResumable,
    getDownloadURL: mockGetDownloadURL,
    deleteObject: mockDeleteObject,
    listAll: mockListAll,
    getMetadata: mockGetMetadata,
    updateMetadata: mockUpdateMetadata,
    
    // Helper functions
    createStorageReference,
    createUploadTask,
    createListResult,
    
    // Mock instances
    mocks: {
      ref: mockRef,
      uploadBytes: mockUploadBytes,
      uploadBytesResumable: mockUploadBytesResumable,
      getDownloadURL: mockGetDownloadURL,
      deleteObject: mockDeleteObject,
      listAll: mockListAll,
      getMetadata: mockGetMetadata,
      updateMetadata: mockUpdateMetadata
    }
  };
};

/**
 * Media Service Mock
 * Mock für den Media Service mit allen relevanten Methoden
 */
export const createMediaServiceMock = () => {
  const mockUploadMedia = jest.fn();
  const mockUpdateAsset = jest.fn();
  const mockGetAsset = jest.fn();
  const mockDeleteAsset = jest.fn();
  const mockListMediaFiles = jest.fn();
  const mockGetMediaByFolder = jest.fn();
  const mockGetMediaByClient = jest.fn();
  const mockMoveAsset = jest.fn();
  const mockCopyAsset = jest.fn();
  const mockBulkUpdateAssets = jest.fn();

  // Default implementations
  mockUploadMedia.mockImplementation((
    file: File,
    organizationId: string,
    folderId?: string,
    onProgress?: (progress: number) => void,
    retryCount: number = 3,
    context?: any
  ) => {
    // Simuliere Progress Updates
    if (onProgress) {
      setTimeout(() => onProgress(25), 50);
      setTimeout(() => onProgress(50), 100);
      setTimeout(() => onProgress(75), 150);
      setTimeout(() => onProgress(100), 200);
    }

    return Promise.resolve({
      id: `asset-${Date.now()}`,
      name: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      organizationId,
      folderId: folderId || null,
      userId: context?.userId || 'mock-user',
      url: `https://mock-storage.com/${organizationId}/${file.name}`,
      thumbnailUrl: file.type.startsWith('image/') ? `https://mock-storage.com/thumbs/${organizationId}/${file.name}` : null,
      path: `organizations/${organizationId}/media/${folderId ? `${folderId}/` : ''}${file.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        uploadMethod: 'legacy',
        userAgent: 'Mock User Agent',
        originalWidth: file.type.startsWith('image/') ? 1920 : undefined,
        originalHeight: file.type.startsWith('image/') ? 1080 : undefined
      }
    });
  });

  mockUpdateAsset.mockImplementation((assetId: string, updates: any) => {
    return Promise.resolve({
      id: assetId,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  });

  mockGetAsset.mockImplementation((assetId: string, organizationId: string) => {
    return Promise.resolve({
      id: assetId,
      name: 'mock-asset.jpg',
      organizationId,
      url: `https://mock-storage.com/${organizationId}/mock-asset.jpg`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  mockDeleteAsset.mockImplementation((assetId: string, organizationId: string) => {
    return Promise.resolve(true);
  });

  mockListMediaFiles.mockImplementation((organizationId: string, options?: any) => {
    const count = options?.limit || 10;
    return Promise.resolve({
      assets: Array.from({ length: count }, (_, i) => ({
        id: `asset-${i}`,
        name: `media-file-${i}.jpg`,
        organizationId,
        url: `https://mock-storage.com/${organizationId}/media-file-${i}.jpg`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString() // i days ago
      })),
      hasMore: count === options?.limit,
      nextCursor: count === options?.limit ? `cursor-${count}` : null
    });
  });

  mockGetMediaByFolder.mockImplementation((organizationId: string, folderId: string) => {
    return Promise.resolve([
      {
        id: 'folder-asset-1',
        name: 'folder-image-1.jpg',
        organizationId,
        folderId,
        url: `https://mock-storage.com/${organizationId}/${folderId}/folder-image-1.jpg`
      },
      {
        id: 'folder-asset-2',
        name: 'folder-image-2.png',
        organizationId,
        folderId,
        url: `https://mock-storage.com/${organizationId}/${folderId}/folder-image-2.png`
      }
    ]);
  });

  mockGetMediaByClient.mockImplementation((organizationId: string, clientId: string) => {
    return Promise.resolve([
      {
        id: 'client-asset-1',
        name: 'client-logo.jpg',
        organizationId,
        clientId,
        url: `https://mock-storage.com/${organizationId}/clients/${clientId}/client-logo.jpg`
      },
      {
        id: 'client-asset-2',
        name: 'client-banner.png',
        organizationId,
        clientId,
        url: `https://mock-storage.com/${organizationId}/clients/${clientId}/client-banner.png`
      }
    ]);
  });

  return {
    uploadMedia: mockUploadMedia,
    updateAsset: mockUpdateAsset,
    getAsset: mockGetAsset,
    deleteAsset: mockDeleteAsset,
    listMediaFiles: mockListMediaFiles,
    getMediaByFolder: mockGetMediaByFolder,
    getMediaByClient: mockGetMediaByClient,
    moveAsset: mockMoveAsset,
    copyAsset: mockCopyAsset,
    bulkUpdateAssets: mockBulkUpdateAssets,
    
    // Mock instances for direct access
    mocks: {
      uploadMedia: mockUploadMedia,
      updateAsset: mockUpdateAsset,
      getAsset: mockGetAsset,
      deleteAsset: mockDeleteAsset,
      listMediaFiles: mockListMediaFiles,
      getMediaByFolder: mockGetMediaByFolder,
      getMediaByClient: mockGetMediaByClient,
      moveAsset: mockMoveAsset,
      copyAsset: mockCopyAsset,
      bulkUpdateAssets: mockBulkUpdateAssets
    }
  };
};

/**
 * Smart Upload Router Mock
 * Mock für den Smart Upload Router Service
 */
export const createSmartUploadRouterMock = () => {
  const mockPreviewStoragePath = jest.fn();
  const mockAnalyzeUploadContext = jest.fn();
  const mockRouteUpload = jest.fn();
  const mockValidateUploadContext = jest.fn();
  const mockUploadFile = jest.fn();

  // Default implementations
  mockPreviewStoragePath.mockImplementation((fileName: string, context: any) => {
    const { organizationId, clientId, folderId, uploadType } = context;
    
    if (uploadType === 'media-library') {
      if (clientId && folderId) {
        return Promise.resolve(`organizations/${organizationId}/media/Kunden/Client-${clientId}/Folder-${folderId}/`);
      } else if (clientId) {
        return Promise.resolve(`organizations/${organizationId}/media/Kunden/Client-${clientId}/`);
      } else if (folderId) {
        return Promise.resolve(`organizations/${organizationId}/media/Ordner/Folder-${folderId}/`);
      } else {
        return Promise.resolve(`organizations/${organizationId}/media/Allgemein/`);
      }
    }
    
    return Promise.resolve(`organizations/${organizationId}/uploads/`);
  });

  mockAnalyzeUploadContext.mockImplementation((context: any) => {
    const { clientId, folderId, autoTags } = context;
    
    let routing = 'unorganized';
    let confidence = 0.5;
    let targetFolder = 'Unzugeordnet';
    
    if (clientId && folderId) {
      routing = 'organized';
      confidence = 0.95;
      targetFolder = `Kunden/Client-${clientId}/Folder-${folderId}`;
    } else if (clientId) {
      routing = 'organized';
      confidence = 0.8;
      targetFolder = `Kunden/Client-${clientId}`;
    } else if (folderId) {
      routing = 'organized';
      confidence = 0.7;
      targetFolder = `Ordner/Folder-${folderId}`;
    }
    
    return Promise.resolve({
      routing,
      targetFolder,
      suggestedTags: autoTags || [],
      confidence,
      recommendations: [
        'Consider adding client information for better organization',
        'Use descriptive folder names for easier navigation'
      ]
    });
  });

  mockValidateUploadContext.mockImplementation((context: any) => {
    const errors = [];
    const warnings = [];
    
    if (!context.organizationId) {
      errors.push('Organization ID is required');
    }
    
    if (!context.userId) {
      errors.push('User ID is required');
    }
    
    if (context.folderId && !context.organizationId) {
      warnings.push('Folder ID provided without organization context');
    }
    
    return Promise.resolve({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  });

  mockRouteUpload.mockImplementation((file: File, context: any) => {
    const analysis = mockAnalyzeUploadContext.mockReturnValue;
    const path = mockPreviewStoragePath.mockReturnValue;
    
    return Promise.resolve({
      method: analysis?.routing === 'organized' ? 'organized' : 'unorganized',
      path,
      confidence: analysis?.confidence || 0.5
    });
  });

  return {
    previewStoragePath: mockPreviewStoragePath,
    analyzeUploadContext: mockAnalyzeUploadContext,
    routeUpload: mockRouteUpload,
    validateUploadContext: mockValidateUploadContext,
    uploadFile: mockUploadFile,
    
    mocks: {
      previewStoragePath: mockPreviewStoragePath,
      analyzeUploadContext: mockAnalyzeUploadContext,
      routeUpload: mockRouteUpload,
      validateUploadContext: mockValidateUploadContext,
      uploadFile: mockUploadFile
    }
  };
};

/**
 * Upload to Media Library Mock
 * Mock für die High-Level Upload Funktion
 */
export const createUploadToMediaLibraryMock = () => {
  const mockUploadToMediaLibrary = jest.fn();

  mockUploadToMediaLibrary.mockImplementation((
    file: File,
    organizationId: string,
    userId: string,
    folderId?: string,
    onProgress?: (progress: number) => void
  ) => {
    // Simuliere Progress Updates
    if (onProgress) {
      setTimeout(() => onProgress(20), 50);
      setTimeout(() => onProgress(40), 100);
      setTimeout(() => onProgress(60), 150);
      setTimeout(() => onProgress(80), 200);
      setTimeout(() => onProgress(100), 250);
    }

    const uploadMethod = folderId ? 'organized' : 'unorganized';
    const basePath = `organizations/${organizationId}/media`;
    const path = folderId ? `${basePath}/folders/${folderId}/` : `${basePath}/general/`;

    return Promise.resolve({
      uploadMethod,
      path,
      asset: {
        id: `smart-asset-${Date.now()}`,
        name: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        organizationId,
        folderId: folderId || null,
        userId,
        url: `https://smart-storage.com/${organizationId}/${file.name}`,
        path: `${path}${file.name}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          uploadMethod: 'smart-router',
          smartRouting: uploadMethod,
          confidence: folderId ? 0.95 : 0.5
        }
      }
    });
  });

  return mockUploadToMediaLibrary;
};

/**
 * Test Utilities
 * Hilfsfunktionen für Tests
 */
export const createTestFile = (
  name: string = 'test.jpg',
  size: number = 1024,
  type: string = 'image/jpeg',
  lastModified: number = Date.now()
): File => {
  const file = new File(['test file content'], name, { type, lastModified });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockAsset = (overrides: any = {}) => ({
  id: 'mock-asset-id',
  name: 'mock-asset.jpg',
  originalName: 'mock-asset.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  organizationId: 'mock-org',
  folderId: null,
  userId: 'mock-user',
  url: 'https://mock-storage.com/mock-asset.jpg',
  thumbnailUrl: 'https://mock-storage.com/thumbs/mock-asset.jpg',
  path: 'organizations/mock-org/media/mock-asset.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {},
  ...overrides
});

/**
 * Complete Firebase Mock Setup
 * Vollständiges Setup aller Firebase Mocks
 */
export const setupFirebaseMocks = () => {
  const firestoreMock = createFirestoreMock();
  const storageMock = createStorageMock();
  const mediaServiceMock = createMediaServiceMock();
  const smartUploadRouterMock = createSmartUploadRouterMock();
  const uploadToMediaLibraryMock = createUploadToMediaLibraryMock();

  // Setup Jest Mocks
  jest.mock('firebase/firestore', () => firestoreMock);
  jest.mock('firebase/storage', () => storageMock);
  jest.mock('@/lib/firebase/media-service', () => ({ mediaService: mediaServiceMock }));
  jest.mock('@/lib/firebase/smart-upload-router', () => ({
    smartUploadRouter: smartUploadRouterMock,
    uploadToMediaLibrary: uploadToMediaLibraryMock
  }));

  return {
    firestore: firestoreMock,
    storage: storageMock,
    mediaService: mediaServiceMock,
    smartUploadRouter: smartUploadRouterMock,
    uploadToMediaLibrary: uploadToMediaLibraryMock,
    
    // Utility functions
    createTestFile,
    createMockAsset,
    
    // Reset all mocks
    resetAll: () => {
      Object.values(firestoreMock.mocks).forEach(mock => mock.mockReset());
      Object.values(storageMock.mocks).forEach(mock => mock.mockReset());
      Object.values(mediaServiceMock.mocks).forEach(mock => mock.mockReset());
      Object.values(smartUploadRouterMock.mocks).forEach(mock => mock.mockReset());
      uploadToMediaLibraryMock.mockReset();
    },
    
    // Clear all mocks
    clearAll: () => {
      Object.values(firestoreMock.mocks).forEach(mock => mock.mockClear());
      Object.values(storageMock.mocks).forEach(mock => mock.mockClear());
      Object.values(mediaServiceMock.mocks).forEach(mock => mock.mockClear());
      Object.values(smartUploadRouterMock.mocks).forEach(mock => mock.mockClear());
      uploadToMediaLibraryMock.mockClear();
    }
  };
};

export default setupFirebaseMocks;

// Dummy test to prevent Jest error
describe('Firebase Mocks', () => {
  it('should be properly exported', () => {
    expect(typeof setupFirebaseMocks).toBe('function');
  });
});