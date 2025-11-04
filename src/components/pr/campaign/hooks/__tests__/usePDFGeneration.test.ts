// src/components/pr/campaign/hooks/__tests__/usePDFGeneration.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePDFGeneration } from '../usePDFGeneration';
import { toastService } from '@/lib/utils/toast';

// Mock toastService
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('usePDFGeneration Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePDFGeneration());

    expect(result.current.generatingPdf).toBe(false);
    expect(result.current.pdfDownloadUrl).toBeNull();
    expect(result.current.showFolderSelector).toBe(false);
  });

  describe('handlePdfExport', () => {
    it('should show error toast when title is empty', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.handlePdfExport('');
      });

      expect(toastService.error).toHaveBeenCalledWith(
        'Bitte geben Sie einen Titel für die Pressemitteilung ein.'
      );
      expect(result.current.showFolderSelector).toBe(false);
    });

    it('should accept title with only whitespace (implementation does not trim)', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.handlePdfExport('   ');
      });

      // Current implementation does not check for whitespace-only titles
      expect(toastService.error).not.toHaveBeenCalled();
      expect(result.current.showFolderSelector).toBe(true);
    });

    it('should open folder selector when valid title is provided', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.handlePdfExport('Valid Title');
      });

      expect(toastService.error).not.toHaveBeenCalled();
      expect(result.current.showFolderSelector).toBe(true);
    });

    it('should open folder selector with long title', () => {
      const { result } = renderHook(() => usePDFGeneration());
      const longTitle = 'This is a very long title that could potentially cause issues with PDF generation but should still work correctly';

      act(() => {
        result.current.handlePdfExport(longTitle);
      });

      expect(toastService.error).not.toHaveBeenCalled();
      expect(result.current.showFolderSelector).toBe(true);
    });

    it('should handle special characters in title', () => {
      const { result } = renderHook(() => usePDFGeneration());
      const specialTitle = 'Titel mit Ümläuten & Sonderzeichen: @#$%';

      act(() => {
        result.current.handlePdfExport(specialTitle);
      });

      expect(toastService.error).not.toHaveBeenCalled();
      expect(result.current.showFolderSelector).toBe(true);
    });
  });

  describe('setShowFolderSelector', () => {
    it('should update showFolderSelector state', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setShowFolderSelector(true);
      });

      expect(result.current.showFolderSelector).toBe(true);

      act(() => {
        result.current.setShowFolderSelector(false);
      });

      expect(result.current.showFolderSelector).toBe(false);
    });

    it('should toggle showFolderSelector multiple times', () => {
      const { result } = renderHook(() => usePDFGeneration());

      // Toggle on
      act(() => {
        result.current.setShowFolderSelector(true);
      });
      expect(result.current.showFolderSelector).toBe(true);

      // Toggle off
      act(() => {
        result.current.setShowFolderSelector(false);
      });
      expect(result.current.showFolderSelector).toBe(false);

      // Toggle on again
      act(() => {
        result.current.setShowFolderSelector(true);
      });
      expect(result.current.showFolderSelector).toBe(true);
    });
  });

  describe('generatePdf', () => {
    it('should set generatingPdf to false immediately (currently disabled)', async () => {
      const { result } = renderHook(() => usePDFGeneration());

      await act(async () => {
        await result.current.generatePdf('test-folder-id');
      });

      expect(result.current.generatingPdf).toBe(false);
    });

    it('should handle generatePdf without folder id', async () => {
      const { result } = renderHook(() => usePDFGeneration());

      await act(async () => {
        await result.current.generatePdf();
      });

      expect(result.current.generatingPdf).toBe(false);
    });
  });
});
