import { DownloadHandler } from '../../delivery/download-handler';
import { mediaService } from '@/lib/firebase/media-service';

// Mock Firestore BEFORE imports
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collection, id) => ({ _path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  getFirestore: jest.fn(() => ({}))
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

jest.mock('@/lib/firebase/media-service');

const mockFirestore = require('firebase/firestore');

describe('DownloadHandler', () => {
  let handler: DownloadHandler;
  const testCampaignId = 'campaign-123';
  const testOrganizationId = 'org-456';
  const testUserId = 'user-789';

  beforeEach(() => {
    handler = new DownloadHandler();
    jest.clearAllMocks();
  });

  const createMockFile = (name: string, size: number = 1024): File => {
    const blob = new Blob(['test content'], { type: 'application/pdf' });
    return new File([blob], name, { type: 'application/pdf' });
  };

  describe('upload', () => {
    it('sollte zu Client-Media uploaden wenn Campaign mit Project verknüpft ist', async () => {
      const mockCampaignData = {
        id: testCampaignId,
        projectId: 'project-123',
        clientId: 'client-456'
      };

      const mockCampaignDoc = {
        exists: () => true,
        data: () => mockCampaignData
      };

      const mockProjectDoc = {
        exists: () => true,
        data: () => ({ title: 'Test Project' })
      };

      const mockFolders = [
        {
          id: 'folder-project',
          name: 'P-Test Project',
          parentFolderId: null
        },
        {
          id: 'folder-analysen',
          name: 'Analysen',
          parentFolderId: 'folder-project'
        }
      ];

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      mockFirestore.getDoc
        .mockResolvedValueOnce(mockCampaignDoc)
        .mockResolvedValueOnce(mockProjectDoc);

      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);
      (mediaService.uploadClientMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf', 1024);
      const result = await handler.upload(
        pdfFile,
        testCampaignId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual({
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: pdfFile.size
      });

      expect(mediaService.uploadClientMedia).toHaveBeenCalledWith(
        pdfFile,
        testOrganizationId,
        'client-456',
        'folder-analysen',
        undefined,
        { userId: testUserId },
        true
      );
    });

    it('sollte Pressemeldungen-Ordner als Fallback verwenden wenn Analysen fehlt', async () => {
      const mockCampaignData = {
        id: testCampaignId,
        projectId: 'project-123',
        clientId: 'client-456'
      };

      const mockCampaignDoc = {
        exists: () => true,
        data: () => mockCampaignData
      };

      const mockProjectDoc = {
        exists: () => true,
        data: () => ({ title: 'Test Project' })
      };

      const mockFolders = [
        {
          id: 'folder-project',
          name: 'P-Test Project',
          parentFolderId: null
        },
        {
          id: 'folder-pressemeldungen',
          name: 'Pressemeldungen',
          parentFolderId: 'folder-project'
        }
      ];

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      mockFirestore.getDoc
        .mockResolvedValueOnce(mockCampaignDoc)
        .mockResolvedValueOnce(mockProjectDoc);

      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);
      (mediaService.uploadClientMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf');
      await handler.upload(pdfFile, testCampaignId, testOrganizationId, testUserId);

      expect(mediaService.uploadClientMedia).toHaveBeenCalledWith(
        pdfFile,
        testOrganizationId,
        'client-456',
        'folder-pressemeldungen',
        undefined,
        { userId: testUserId },
        true
      );
    });

    it('sollte Projekt-Ordner als letzten Fallback verwenden', async () => {
      const mockCampaignData = {
        id: testCampaignId,
        projectId: 'project-123',
        clientId: 'client-456'
      };

      const mockCampaignDoc = {
        exists: () => true,
        data: () => mockCampaignData
      };

      const mockProjectDoc = {
        exists: () => true,
        data: () => ({ title: 'Test Project' })
      };

      const mockFolders = [
        {
          id: 'folder-project',
          name: 'P-Test Project',
          parentFolderId: null
        }
      ];

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      mockFirestore.getDoc
        .mockResolvedValueOnce(mockCampaignDoc)
        .mockResolvedValueOnce(mockProjectDoc);

      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);
      (mediaService.uploadClientMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf');
      await handler.upload(pdfFile, testCampaignId, testOrganizationId, testUserId);

      expect(mediaService.uploadClientMedia).toHaveBeenCalledWith(
        pdfFile,
        testOrganizationId,
        'client-456',
        'folder-project',
        undefined,
        { userId: testUserId },
        true
      );
    });

    it('sollte Fehler werfen wenn Projekt-Ordner nicht gefunden', async () => {
      const mockCampaignData = {
        id: testCampaignId,
        projectId: 'project-123',
        clientId: 'client-456'
      };

      const mockCampaignDoc = {
        exists: () => true,
        data: () => mockCampaignData
      };

      const mockProjectDoc = {
        exists: () => true,
        data: () => ({ title: 'Test Project' })
      };

      const mockFolders = [
        {
          id: 'folder-other',
          name: 'Other Folder',
          parentFolderId: null
        }
      ];

      mockFirestore.getDoc
        .mockResolvedValueOnce(mockCampaignDoc)
        .mockResolvedValueOnce(mockProjectDoc);

      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);

      const pdfFile = createMockFile('test.pdf');

      await expect(
        handler.upload(pdfFile, testCampaignId, testOrganizationId, testUserId)
      ).rejects.toThrow('Projekt-Ordner nicht gefunden');
    });

    it('sollte zu Organization-Media uploaden wenn Campaign ohne Project', async () => {
      const mockCampaignData = {
        id: testCampaignId,
        projectId: undefined,
        clientId: undefined
      };

      const mockCampaignDoc = {
        exists: () => true,
        data: () => mockCampaignData
      };

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/org-report.pdf',
        fileSize: 2048
      };

      mockFirestore.getDoc.mockResolvedValueOnce(mockCampaignDoc);
      (mediaService.uploadMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf', 2048);
      const result = await handler.upload(
        pdfFile,
        testCampaignId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual({
        pdfUrl: 'https://example.com/org-report.pdf',
        fileSize: pdfFile.size
      });

      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        pdfFile,
        testOrganizationId,
        undefined,
        undefined,
        3,
        { userId: testUserId },
        true
      );
    });

    it('sollte zu Organization-Media uploaden wenn Campaign-Doc nicht existiert', async () => {
      const mockCampaignDoc = {
        exists: () => false,
        data: () => null
      };

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/org-report.pdf',
        fileSize: 1024
      };

      mockFirestore.getDoc.mockResolvedValueOnce(mockCampaignDoc);
      (mediaService.uploadMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf');
      const result = await handler.upload(
        pdfFile,
        testCampaignId,
        testOrganizationId,
        testUserId
      );

      expect(result.pdfUrl).toBe('https://example.com/org-report.pdf');
      expect(mediaService.uploadMedia).toHaveBeenCalled();
    });

    it('sollte skipLimitCheck=true für Storage-Upload verwenden', async () => {
      const mockCampaignDoc = {
        exists: () => false,
        data: () => null
      };

      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      mockFirestore.getDoc.mockResolvedValueOnce(mockCampaignDoc);
      (mediaService.uploadMedia as jest.Mock).mockResolvedValue(mockAsset);

      const pdfFile = createMockFile('test.pdf');
      await handler.upload(pdfFile, testCampaignId, testOrganizationId, testUserId);

      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        expect.any(File),
        testOrganizationId,
        undefined,
        undefined,
        3,
        { userId: testUserId },
        true
      );
    });
  });
});
