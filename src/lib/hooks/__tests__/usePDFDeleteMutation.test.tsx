import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { usePDFDeleteMutation } from '../usePDFDeleteMutation';
import { mediaService } from '@/lib/firebase/media-service';
import { toastService } from '@/lib/utils/toast';

jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/utils/toast');

const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockToastService = toastService as jest.Mocked<typeof toastService>;

describe('usePDFDeleteMutation', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful deletion', () => {
    it('should delete PDF successfully', async () => {
      const mockPDF = {
        id: 'pdf-1',
        fileName: 'Report.pdf',
        downloadUrl: 'url-1',
      };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      expect(mockMediaService.deleteMediaAsset).toHaveBeenCalledWith(mockPDF);
      expect(mockToastService.success).toHaveBeenCalledWith('PDF erfolgreich gelöscht');
    });

    it('should invalidate PDF query after successful deletion', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      queryClient.setQueryData(['analysisPDFs', 'campaign-1', 'org-1', 'project-1'], {
        pdfs: [mockPDF],
        folderLink: '/link',
      });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['analysisPDFs', 'campaign-1', 'org-1', 'project-1'],
      });
    });

    it('should show success toast on successful deletion', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      expect(mockToastService.success).toHaveBeenCalledTimes(1);
      expect(mockToastService.success).toHaveBeenCalledWith('PDF erfolgreich gelöscht');
    });
  });

  describe('error handling', () => {
    it('should handle deletion error', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };
      const error = new Error('Failed to delete');

      mockMediaService.deleteMediaAsset.mockRejectedValue(error);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(mockPDF);
        } catch (e) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should show error toast on deletion failure', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(mockPDF);
        } catch (e) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastService.error).toHaveBeenCalledWith('Fehler beim Löschen des PDFs');
      });
    });

    it('should log error to console on failure', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };
      const error = new Error('Delete failed');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockMediaService.deleteMediaAsset.mockRejectedValue(error);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(mockPDF);
        } catch (e) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Fehler beim Löschen des PDFs:', error);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('mutation states', () => {
    it('should track pending state during deletion', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };
      let resolveFn: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveFn = resolve;
      });

      mockMediaService.deleteMediaAsset.mockReturnValue(deletePromise as any);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate(mockPDF);
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      act(() => {
        resolveFn!();
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should reset mutation state after successful deletion', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => usePDFDeleteMutation('campaign-1', 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('parameter handling', () => {
    it('should handle undefined campaignId', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => usePDFDeleteMutation(undefined, 'org-1', 'project-1'),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      expect(mockMediaService.deleteMediaAsset).toHaveBeenCalledWith(mockPDF);
    });

    it('should invalidate with correct queryKey even with undefined params', async () => {
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };

      mockMediaService.deleteMediaAsset.mockResolvedValue(undefined);

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => usePDFDeleteMutation(undefined, undefined, undefined),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(mockPDF);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['analysisPDFs', undefined, undefined, undefined],
      });
    });
  });
});
