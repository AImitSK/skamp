// src/lib/firebase/__tests__/smart-upload-router.test.ts

// Mock Firebase modules bevor sie importiert werden
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromMillis: jest.fn((millis: number) => ({ 
      seconds: millis / 1000, 
      nanoseconds: 0,
      toMillis: () => millis 
    }))
  }
}));

jest.mock('../media-service', () => ({
  mediaService: {
    uploadMedia: jest.fn(),
    updateAsset: jest.fn(),
    getFolder: jest.fn(),
    getFolders: jest.fn()
  }
}));

import { 
  smartUploadRouter, 
  uploadWithContext, 
  uploadToMediaLibrary, 
  uploadToProject, 
  uploadToCampaign,
  UploadContext,
  UploadResult
} from '../smart-upload-router';
import { MediaAsset } from '../../../types/media';
import { mediaService } from '../media-service';

const mockedMediaService = mediaService as jest.Mocked<typeof mediaService>;

describe('Smart Upload Router', () => {
  const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
  const mockAsset: MediaAsset = {
    id: 'asset-123',
    userId: 'user-456',
    fileName: 'test.jpg',
    fileType: 'image/jpeg',
    storagePath: 'organizations/org-123/media/12345_test.jpg',
    downloadUrl: 'https://storage.googleapis.com/test.jpg',
    createdAt: { seconds: Date.now() / 1000 } as any,
    updatedAt: { seconds: Date.now() / 1000 } as any,
  };

  const baseContext: UploadContext = {
    organizationId: 'org-123',
    userId: 'user-456',
    uploadType: 'media-library'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedMediaService.uploadMedia.mockResolvedValue(mockAsset);
    mockedMediaService.updateAsset.mockResolvedValue();
    mockedMediaService.getFolder.mockResolvedValue(null);
    mockedMediaService.getFolders.mockResolvedValue([]);
  });

  describe('Context Creation and Validation', () => {
    it('should create upload context correctly', () => {
      const context = smartUploadRouter.createUploadContext({
        organizationId: 'org-123',
        userId: 'user-456',
        uploadType: 'media-library',
        projectId: 'project-789',
        phase: 'creation'
      });

      expect(context).toMatchObject({
        organizationId: 'org-123',
        userId: 'user-456',
        uploadType: 'media-library',
        projectId: 'project-789',
        phase: 'creation',
        autoTags: []
      });
    });

    it('should validate upload context', () => {
      const validation = smartUploadRouter.validateUploadContext(baseContext);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid context', () => {
      const invalidContext = {
        organizationId: '',
        userId: 'user-456',
        uploadType: 'media-library' as const
      };

      const validation = smartUploadRouter.validateUploadContext(invalidContext);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('organizationId ist erforderlich');
    });
  });

  describe('Smart Upload Logic', () => {
    it('should perform basic media library upload', async () => {
      const result = await smartUploadRouter.smartUpload(mockFile, baseContext);

      expect(result).toMatchObject({
        service: 'mediaService.uploadMedia',
        uploadMethod: 'unorganized',
        asset: mockAsset
      });

      expect(mockedMediaService.uploadMedia).toHaveBeenCalledWith(
        mockFile,
        'org-123',
        undefined,
        undefined,
        3,
        { userId: 'user-456' }
      );
    });

    it('should handle project context upload', async () => {
      const projectContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789',
        phase: 'creation'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, projectContext);

      expect(result.uploadMethod).toBe('organized');
      expect(result.metadata?.storagePath).toContain('Projekte/project-789');
    });

    it('should handle campaign context upload', async () => {
      const campaignContext: UploadContext = {
        ...baseContext,
        uploadType: 'campaign',
        projectId: 'project-789',
        campaignId: 'campaign-456',
        phase: 'internal_approval'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, campaignContext);

      expect(result.uploadMethod).toBe('organized');
      expect(result.metadata?.storagePath).toContain('Kampagnen/campaign-456');
    });

    it('should generate auto-tags based on context', async () => {
      const taggedContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789',
        phase: 'creation',
        autoTags: ['custom-tag']
      };

      await smartUploadRouter.smartUpload(mockFile, taggedContext);

      expect(mockedMediaService.updateAsset).toHaveBeenCalledWith(
        'asset-123',
        expect.objectContaining({
          tags: expect.arrayContaining([
            'custom-tag',
            'upload:project',
            'type:image',
            'project:project-789',
            'phase:creation'
          ])
        })
      );
    });

    it('should handle client inheritance from folder', async () => {
      const mockFolder = {
        id: 'folder-123',
        name: 'Test Folder',
        userId: 'user-456',
        clientId: 'client-789'
      };

      mockedMediaService.getFolder.mockResolvedValue(mockFolder as any);

      const folderContext: UploadContext = {
        ...baseContext,
        folderId: 'folder-123'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, folderContext);

      expect(result.metadata?.inheritedClientId).toBe('client-789');
      expect(mockedMediaService.uploadMedia).toHaveBeenCalledWith(
        mockFile,
        'org-123',
        'folder-123',
        undefined,
        3,
        { userId: 'user-456', clientId: 'client-789' }
      );
    });
  });

  describe('Storage Path Preview', () => {
    it('should preview storage path for media library upload', async () => {
      const path = await smartUploadRouter.previewStoragePath(
        'test.jpg',
        baseContext
      );

      expect(path).toMatch(/organizations\/org-123\/media\/Unzugeordnet\/\d+_test\.jpg/);
    });

    it('should preview storage path for project upload', async () => {
      const projectContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789'
      };

      const path = await smartUploadRouter.previewStoragePath(
        'presentation.pptx',
        projectContext
      );

      expect(path).toMatch(/organizations\/org-123\/media\/Projekte\/project-789\/\d+_presentation\.pptx/);
    });
  });

  describe('Fallback Handling', () => {
    it('should use fallback upload on error', async () => {
      mockedMediaService.uploadMedia.mockRejectedValueOnce(new Error('Upload failed'));
      mockedMediaService.uploadMedia.mockResolvedValueOnce(mockAsset);

      const result = await smartUploadRouter.smartUpload(mockFile, baseContext);

      expect(result.uploadMethod).toBe('legacy');
      expect(result.service).toBe('mediaService.uploadMedia (fallback)');
    });

    it('should throw SmartUploadError on complete failure', async () => {
      mockedMediaService.uploadMedia.mockRejectedValue(new Error('Complete failure'));

      await expect(
        smartUploadRouter.smartUpload(mockFile, baseContext)
      ).rejects.toThrow('Upload fehlgeschlagen');
    });
  });

  describe('Convenience Functions', () => {
    it('should handle uploadWithContext', async () => {
      const result = await uploadWithContext(
        mockFile,
        'org-123',
        'user-456',
        'media-library',
        { folderId: 'folder-123' }
      );

      expect(result).toMatchObject({
        service: 'mediaService.uploadMedia',
        asset: mockAsset
      });
    });

    it('should handle uploadToMediaLibrary', async () => {
      const result = await uploadToMediaLibrary(
        mockFile,
        'org-123',
        'user-456',
        'folder-123'
      );

      expect(result.asset).toEqual(mockAsset);
      expect(mockedMediaService.uploadMedia).toHaveBeenCalledWith(
        mockFile,
        'org-123',
        'folder-123',
        undefined,
        3,
        { userId: 'user-456' }
      );
    });

    it('should handle uploadToProject', async () => {
      const result = await uploadToProject(
        mockFile,
        'org-123',
        'user-456',
        'project-789',
        'creation'
      );

      expect(result.uploadMethod).toBe('organized');
    });

    it('should handle uploadToCampaign', async () => {
      const result = await uploadToCampaign(
        mockFile,
        'org-123',
        'user-456',
        'campaign-456',
        'project-789',
        'distribution'
      );

      expect(result.uploadMethod).toBe('organized');
    });
  });

  describe('File Name Processing', () => {
    it('should handle special characters in file names', async () => {
      const specialFile = new File(['content'], 'spëcïal-fïlé@#$.jpg', { 
        type: 'image/jpeg' 
      });

      const result = await smartUploadRouter.smartUpload(specialFile, baseContext);

      expect(result.metadata?.storagePath).toMatch(/\d+_sp_c_al-f_l____\.jpg/);
    });

    it('should generate timestamps correctly', async () => {
      const result = await smartUploadRouter.smartUpload(mockFile, baseContext);
      
      expect(result.metadata?.storagePath).toMatch(/\d+_test\.jpg/);
    });
  });

  describe('Context Detection', () => {
    it('should detect campaign context as highest priority', async () => {
      const multiContext: UploadContext = {
        ...baseContext,
        uploadType: 'campaign',
        projectId: 'project-789',
        campaignId: 'campaign-456',
        folderId: 'folder-123'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, multiContext);
      
      expect(result.uploadMethod).toBe('organized');
      expect(result.metadata?.storagePath).toContain('Kampagnen');
    });

    it('should detect project context when no campaign', async () => {
      const projectContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789',
        folderId: 'folder-123'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, projectContext);
      
      expect(result.uploadMethod).toBe('organized');
      expect(result.metadata?.storagePath).toContain('Projekte');
    });
  });

  describe('Phase Handling', () => {
    const phases = [
      'ideas_planning',
      'creation', 
      'internal_approval',
      'customer_approval',
      'distribution',
      'monitoring'
    ] as const;

    phases.forEach(phase => {
      it(`should handle ${phase} phase correctly`, async () => {
        const phaseContext: UploadContext = {
          ...baseContext,
          uploadType: 'project',
          projectId: 'project-789',
          phase
        };

        const result = await smartUploadRouter.smartUpload(mockFile, phaseContext);
        
        expect(result.metadata?.storagePath).toContain('Projekte/project-789');
        expect(result.metadata?.appliedTags).toContain(`phase:${phase}`);
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle missing mediaService gracefully', async () => {
      mockedMediaService.uploadMedia.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await expect(
        smartUploadRouter.smartUpload(mockFile, baseContext)
      ).rejects.toThrow('Upload fehlgeschlagen');
    });

    it('should handle folder resolution failure gracefully', async () => {
      mockedMediaService.getFolder.mockRejectedValue(new Error('Folder not found'));

      const folderContext: UploadContext = {
        ...baseContext,
        folderId: 'non-existent-folder'
      };

      const result = await smartUploadRouter.smartUpload(mockFile, folderContext);
      
      // Should still complete upload without folder resolution
      expect(result.asset).toEqual(mockAsset);
    });

    it('should handle asset metadata enhancement failure gracefully', async () => {
      mockedMediaService.updateAsset.mockRejectedValue(new Error('Update failed'));

      const taggedContext: UploadContext = {
        ...baseContext,
        autoTags: ['test-tag']
      };

      // Should not throw - metadata enhancement is not critical
      const result = await smartUploadRouter.smartUpload(mockFile, taggedContext);
      
      expect(result.asset).toEqual(mockAsset);
    });
  });

  describe('Configuration and Routing', () => {
    it('should respect preferOrganized configuration', async () => {
      const projectContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789'
      };

      const result = await smartUploadRouter.smartUpload(
        mockFile, 
        projectContext, 
        undefined,
        { preferOrganized: false }
      );

      expect(result.uploadMethod).toBe('unorganized');
    });

    it('should handle autoTagging configuration', async () => {
      await smartUploadRouter.smartUpload(
        mockFile, 
        baseContext, 
        undefined,
        { autoTagging: false }
      );

      // Should not call updateAsset when autoTagging is disabled
      expect(mockedMediaService.updateAsset).not.toHaveBeenCalled();
    });

    it('should respect naming convention configuration', async () => {
      const projectContext: UploadContext = {
        ...baseContext,
        uploadType: 'project',
        projectId: 'project-789'
      };

      const result = await smartUploadRouter.smartUpload(
        mockFile, 
        projectContext, 
        undefined,
        { namingConvention: 'project' }
      );

      expect(result.metadata?.storagePath).toMatch(/project-789_\d+_test\.jpg/);
    });
  });
});