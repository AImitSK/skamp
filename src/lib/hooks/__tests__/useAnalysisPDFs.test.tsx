import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useAnalysisPDFs } from '../useAnalysisPDFs';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';

jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/media-service');

const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;

describe('useAnalysisPDFs', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful PDF loading', () => {
    it('should load PDFs from Analysen folder', async () => {
      const mockFolderStructure = {
        subfolders: [
          { id: 'folder-1', name: 'Analysen' },
          { id: 'folder-2', name: 'Other' },
        ],
      };

      const mockAssets = [
        { id: 'pdf-1', fileName: 'Report 1.pdf', fileType: 'application/pdf', downloadUrl: 'url-1' },
        { id: 'pdf-2', fileName: 'Report 2.pdf', fileType: 'application/pdf', downloadUrl: 'url-2' },
        { id: 'img-1', fileName: 'Image.png', fileType: 'image/png', downloadUrl: 'url-3' },
      ];

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue(mockAssets as any);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toHaveLength(2);
      expect(result.current.data?.pdfs[0].fileType).toBe('application/pdf');
      expect(result.current.data?.folderLink).toBe('/dashboard/projects/project-1?tab=daten&folder=folder-1');
    });

    it('should filter only PDFs from assets', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      const mockAssets = [
        { id: 'pdf-1', fileName: 'Report.pdf', fileType: 'application/pdf' },
        { id: 'img-1', fileName: 'Image.png', fileType: 'image/png' },
        { id: 'doc-1', fileName: 'Doc.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      ];

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue(mockAssets as any);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toHaveLength(1);
      expect(result.current.data?.pdfs[0].id).toBe('pdf-1');
    });

    it('should generate correct folder link', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'analysen-folder-123', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-xyz'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.folderLink).toBe('/dashboard/projects/project-xyz?tab=daten&folder=analysen-folder-123');
    });
  });

  describe('conditional loading', () => {
    it('should not fetch when enabled is false', () => {
      renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1', false),
        { wrapper: createWrapper() }
      );

      expect(mockProjectService.getProjectFolderStructure).not.toHaveBeenCalled();
      expect(mockMediaService.getMediaAssets).not.toHaveBeenCalled();
    });

    it('should fetch when enabled is true', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1', true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockProjectService.getProjectFolderStructure).toHaveBeenCalled();
    });

    it('should not fetch when campaignId is missing', () => {
      renderHook(
        () => useAnalysisPDFs(undefined, 'org-1', 'project-1', true),
        { wrapper: createWrapper() }
      );

      expect(mockProjectService.getProjectFolderStructure).not.toHaveBeenCalled();
    });

    it('should not fetch when projectId is missing', () => {
      renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', undefined, true),
        { wrapper: createWrapper() }
      );

      expect(mockProjectService.getProjectFolderStructure).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing subfolders', async () => {
      mockProjectService.getProjectFolderStructure.mockResolvedValue({} as any);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toEqual([]);
      expect(result.current.data?.folderLink).toBeNull();
    });

    it('should handle missing Analysen folder', async () => {
      const mockFolderStructure = {
        subfolders: [
          { id: 'folder-1', name: 'Other' },
          { id: 'folder-2', name: 'Documents' },
        ],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toEqual([]);
      expect(result.current.data?.folderLink).toBeNull();
      expect(mockMediaService.getMediaAssets).not.toHaveBeenCalled();
    });

    it('should handle empty PDF list', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toEqual([]);
      expect(result.current.data?.folderLink).toBe('/dashboard/projects/project-1?tab=daten&folder=folder-1');
    });
  });

  describe('error handling', () => {
    it('should handle error from projectService gracefully', async () => {
      mockProjectService.getProjectFolderStructure.mockRejectedValue(new Error('Failed to load folders'));

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toEqual([]);
      expect(result.current.data?.folderLink).toBeNull();
    });

    it('should handle error from mediaService gracefully', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockRejectedValue(new Error('Failed to load assets'));

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pdfs).toEqual([]);
    });
  });

  describe('cache behavior', () => {
    it('should use correct queryKey for caching', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(['analysisPDFs', 'campaign-1', 'org-1', 'project-1']);
      expect(cachedData).toBeDefined();
    });

    it('should use different cache for different projects', async () => {
      const mockFolderStructure = {
        subfolders: [{ id: 'folder-1', name: 'Analysen' }],
      };

      mockProjectService.getProjectFolderStructure.mockResolvedValue(mockFolderStructure as any);
      mockMediaService.getMediaAssets.mockResolvedValue([]);

      const { result: result1 } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const { result: result2 } = renderHook(
        () => useAnalysisPDFs('campaign-1', 'org-1', 'project-2'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      const cache1 = queryClient.getQueryData(['analysisPDFs', 'campaign-1', 'org-1', 'project-1']);
      const cache2 = queryClient.getQueryData(['analysisPDFs', 'campaign-1', 'org-1', 'project-2']);

      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
    });
  });
});
