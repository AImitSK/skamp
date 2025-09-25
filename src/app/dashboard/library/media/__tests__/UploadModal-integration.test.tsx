// src/app/dashboard/pr-tools/media-library/__tests__/UploadModal-integration.test.tsx
// Integration Tests für UploadModal mit Smart Upload Router und React Testing Library

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock CRM Data Context first
const mockCompanies = [
  { id: 'company-1', name: 'Test Company 1' },
  { id: 'company-2', name: 'Test Company 2' },
  { id: 'company-3', name: 'Test Company 3' }
];

jest.mock('@/context/CrmDataContext', () => ({
  useCrmData: () => ({
    companies: mockCompanies
  })
}));

// Mock Firebase Services - Setup mocks with proper structure
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    uploadMedia: jest.fn(),
    updateAsset: jest.fn()
  }
}));

jest.mock('@/lib/firebase/smart-upload-router', () => ({
  smartUploadRouter: {
    previewStoragePath: jest.fn(),
    analyzeUploadContext: jest.fn(),
    routeUpload: jest.fn(),
    validateUploadContext: jest.fn()
  },
  uploadToMediaLibrary: jest.fn()
}));

// Mock Feature Flags
const mockFeatureFlags = {
  USE_SMART_ROUTER: true,
  SMART_ROUTER_FALLBACK: true,
  SMART_ROUTER_LOGGING: true,
  AUTO_TAGGING: true,
  CLIENT_INHERITANCE: true,
  FOLDER_ROUTING: true,
  UPLOAD_CONTEXT_INFO: true,
  UPLOAD_METHOD_TOGGLE: true,
  UPLOAD_RESULTS_DISPLAY: true,
  BATCH_UPLOADS: true,
  PARALLEL_UPLOADS: true,
  UPLOAD_RETRY: true
};

jest.mock('../config/feature-flags', () => ({
  getMediaLibraryFeatureFlags: () => mockFeatureFlags,
  shouldUseSmartRouter: () => mockFeatureFlags.USE_SMART_ROUTER,
  getUIFeatureConfig: () => ({
    showContextInfo: mockFeatureFlags.UPLOAD_CONTEXT_INFO,
    allowMethodToggle: mockFeatureFlags.UPLOAD_METHOD_TOGGLE,
    showUploadResults: mockFeatureFlags.UPLOAD_RESULTS_DISPLAY
  })
}));

// Mock Context Builder
const mockContextInfo = {
  uploadMethod: 'smart' as const,
  targetPath: 'organizations/org-123/media/Kunden/Test-Company-1/',
  expectedTags: ['source:dialog', 'folder:media-library', 'client:preselected', 'media-library:true'],
  clientInheritance: {
    source: 'preselected' as const,
    clientId: 'company-1',
    clientName: 'Test Company 1'
  },
  routing: {
    type: 'organized' as const,
    reason: 'Upload in spezifischen Ordner'
  }
};

jest.mock('../utils/context-builder', () => ({
  mediaLibraryContextBuilder: {
    buildContextInfo: jest.fn(),
    buildUploadContext: jest.fn(),
    validateUploadParams: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  },
  MediaLibraryContextBuilder: jest.fn()
}));

// Import UploadModal after setting up mocks
import UploadModal from '../UploadModal';

// Get mocked instances for test setup
const { mediaService } = require('@/lib/firebase/media-service');
const { uploadToMediaLibrary } = require('@/lib/firebase/smart-upload-router');
const { mediaLibraryContextBuilder } = require('../utils/context-builder');

// Test File Creation Helper
const createMockFile = (name: string, size: number = 1024, type: string = 'image/jpeg'): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('UploadModal Integration Tests', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onUploadSuccess: jest.fn(),
    organizationId: 'org-123',
    userId: 'user-456'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mediaService.uploadMedia.mockResolvedValue({ id: 'asset-123' });
    mediaService.updateAsset.mockResolvedValue(true);
    uploadToMediaLibrary.mockResolvedValue({
      uploadMethod: 'organized',
      path: 'organizations/org-123/media/Kunden/Test-Company-1/',
      asset: { id: 'asset-456' }
    });
    
    // Setup context builder mock with the context info
    mediaLibraryContextBuilder.buildContextInfo.mockResolvedValue(mockContextInfo);
    mediaLibraryContextBuilder.buildUploadContext.mockReturnValue({
      organizationId: 'org-123',
      userId: 'user-456',
      uploadType: 'media-library',
      autoTags: ['source:dialog', 'media-library:true']
    });
  });

  describe('Component Rendering', () => {
    it('sollte Modal mit Grundelementen rendern', () => {
      render(<UploadModal {...defaultProps} />);
      
      expect(screen.getByText('Medien hochladen')).toBeInTheDocument();
      expect(screen.getByText('Dateien auswählen')).toBeInTheDocument();
      expect(screen.getByLabelText('Kunde zuordnen (optional)')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    it('sollte Drag & Drop Area rendern', () => {
      render(<UploadModal {...defaultProps} />);
      
      expect(screen.getByText('Dateien auswählen')).toBeInTheDocument();
      expect(screen.getByText('oder per Drag & Drop')).toBeInTheDocument();
      expect(screen.getByText('PNG, JPG, GIF, MP4, PDF bis 10MB')).toBeInTheDocument();
    });
  });

  describe('Smart Router Context Info Display', () => {
    it('sollte Smart Router Context Info anzeigen', async () => {
      render(<UploadModal {...defaultProps} currentFolderId="folder-123" folderName="Test Folder" />);
      
      await waitFor(() => {
        expect(screen.getByText('Smart Upload Routing')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Aktiviert')).toBeInTheDocument();
      expect(screen.getByText('📁 Organisiert')).toBeInTheDocument();
      expect(screen.getByText('(Upload in spezifischen Ordner)')).toBeInTheDocument();
    });

    it('sollte Auto-Tags anzeigen', async () => {
      render(<UploadModal {...defaultProps} currentFolderId="folder-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Auto-Tags:')).toBeInTheDocument();
      });
      
      expect(screen.getByText('source:dialog')).toBeInTheDocument();
      expect(screen.getByText('folder:media-library')).toBeInTheDocument();
      expect(screen.getByText('media-library:true')).toBeInTheDocument();
    });
  });

  describe('File Selection und Management', () => {
    it('sollte Datei-Upload über Input handhaben', async () => {
      const user = userEvent.setup();
      render(<UploadModal {...defaultProps} />);
      
      const file = createMockFile('test.jpg', 2048);
      const input = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('Ausgewählte Dateien (1)')).toBeInTheDocument();
      });
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('2 KB')).toBeInTheDocument();
    });

    it('sollte mehrere Dateien handhaben', async () => {
      const user = userEvent.setup();
      render(<UploadModal {...defaultProps} />);
      
      const files = [
        createMockFile('test1.jpg', 1024),
        createMockFile('test2.png', 2048),
        createMockFile('test3.pdf', 3072)
      ];
      
      const input = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      await user.upload(input, files);
      
      await waitFor(() => {
        expect(screen.getByText('Ausgewählte Dateien (3)')).toBeInTheDocument();
      });
      
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.png')).toBeInTheDocument();
      expect(screen.getByText('test3.pdf')).toBeInTheDocument();
    });
  });

  describe('Upload Process - Smart Router', () => {
    it('sollte Smart Router Upload erfolgreich durchführen', async () => {
      const user = userEvent.setup();
      const mockOnUploadSuccess = jest.fn();
      const mockOnClose = jest.fn();
      
      render(<UploadModal 
        {...defaultProps} 
        onUploadSuccess={mockOnUploadSuccess}
        onClose={mockOnClose}
      />);
      
      // File auswählen
      const file = createMockFile('test.jpg', 1024);
      const input = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      await user.upload(input, file);
      
      // Upload starten
      const uploadButton = screen.getByText('1 Datei(en) hochladen');
      await user.click(uploadButton);
      
      // Erwarte Smart Router Aufruf
      await waitFor(() => {
        expect(uploadToMediaLibrary).toHaveBeenCalledWith(
          file,
          'org-123',
          'user-456',
          undefined,
          expect.any(Function)
        );
      });
      
      // Erfolgreicher Upload
      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Process - Legacy Fallback', () => {
    it('sollte auf Legacy fallback bei Smart Router Fehler', async () => {
      const user = userEvent.setup();
      
      // Mock Smart Router Fehler
      uploadToMediaLibrary.mockRejectedValueOnce(new Error('Smart Router Service unavailable'));
      
      render(<UploadModal {...defaultProps} />);
      
      // File auswählen und uploaden
      const file = createMockFile('test.jpg', 1024);
      const input = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      await user.upload(input, file);
      
      const uploadButton = screen.getByText('1 Datei(en) hochladen');
      await user.click(uploadButton);
      
      // Smart Router Aufruf
      await waitFor(() => {
        expect(uploadToMediaLibrary).toHaveBeenCalled();
      });
      
      // Legacy Fallback Aufruf
      await waitFor(() => {
        expect(mediaService.uploadMedia).toHaveBeenCalledWith(
          file,
          'org-123',
          undefined,
          expect.any(Function),
          1,
          { userId: 'user-456' }
        );
      });
    });
  });

  describe('Multi-Tenancy und Isolation', () => {
    it('sollte organizationId korrekt an alle Services weiterleiten', async () => {
      const user = userEvent.setup();
      
      render(<UploadModal 
        {...defaultProps} 
        organizationId="org-specific-123"
      />);
      
      const file = createMockFile('test.jpg', 1024);
      const input = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      await user.upload(input, file);
      
      const uploadButton = screen.getByText('1 Datei(en) hochladen');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(uploadToMediaLibrary).toHaveBeenCalledWith(
          file,
          'org-specific-123',
          'user-456',
          undefined,
          expect.any(Function)
        );
      });
    });

    it('sollte Context Builder mit korrekter organizationId aufrufen', async () => {
      render(<UploadModal 
        {...defaultProps} 
        organizationId="org-isolation-test"
        userId="user-isolation-test"
      />);
      
      await waitFor(() => {
        expect(mediaLibraryContextBuilder.buildContextInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-isolation-test',
            userId: 'user-isolation-test'
          }),
          mockCompanies
        );
      });
    });
  });

  describe('Error Handling und Edge Cases', () => {
    it('sollte Context Builder Fehler graceful handhaben', async () => {
      mediaLibraryContextBuilder.buildContextInfo.mockRejectedValue(
        new Error('Context Builder Error')
      );
      
      // Mock console.warn to avoid noise in tests
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      render(<UploadModal {...defaultProps} />);
      
      // Component sollte trotzdem rendern
      expect(screen.getByText('Medien hochladen')).toBeInTheDocument();
      
      mockConsoleWarn.mockRestore();
    });

    it('sollte mit leeren File Lists umgehen', async () => {
      const user = userEvent.setup();
      
      render(<UploadModal {...defaultProps} />);
      
      // Versuche Upload ohne Dateien
      const uploadButton = screen.getByText('0 Datei(en) hochladen');
      expect(uploadButton).toBeDisabled();
      
      // Button sollte nicht anklickbar sein
      await user.click(uploadButton);
      expect(uploadToMediaLibrary).not.toHaveBeenCalled();
    });
  });
});