import { renderHook, act } from '@testing-library/react';
import { useFileActions } from '../useFileActions';
import { getMediaAssets, deleteMediaAsset } from '@/lib/firebase/media-assets-service';

// Mock Firebase services
jest.mock('@/lib/firebase/media-assets-service');

const mockGetMediaAssets = getMediaAssets as jest.MockedFunction<typeof getMediaAssets>;
const mockDeleteMediaAsset = deleteMediaAsset as jest.MockedFunction<typeof deleteMediaAsset>;

describe('useFileActions Hook', () => {
  const mockOrganizationId = 'org-123';
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte initial state korrekt setzen', () => {
    const { result } = renderHook(() =>
      useFileActions({
        organizationId: mockOrganizationId,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    expect(result.current.confirmDialog).toBeNull();
  });

  it('sollte Delete Confirmation Dialog öffnen', () => {
    const { result } = renderHook(() =>
      useFileActions({
        organizationId: mockOrganizationId,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.handleDeleteAsset('asset-1', 'test.pdf');
    });

    expect(result.current.confirmDialog).not.toBeNull();
    expect(result.current.confirmDialog?.title).toBe('Datei löschen');
    expect(result.current.confirmDialog?.message).toContain('test.pdf');
  });

  it('sollte Confirmation Dialog schließen', () => {
    const { result } = renderHook(() =>
      useFileActions({
        organizationId: mockOrganizationId,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.handleDeleteAsset('asset-1', 'test.pdf');
    });

    act(() => {
      result.current.setConfirmDialog(null);
    });

    expect(result.current.confirmDialog).toBeNull();
  });

  it('sollte handleAssetClick celero-doc öffnen im Editor', () => {
    const mockOnEdit = jest.fn();
    const mockAsset = {
      id: 'asset-1',
      fileType: 'celero-doc',
      fileName: 'test.celero-doc',
    };

    const { result } = renderHook(() =>
      useFileActions({
        organizationId: mockOrganizationId,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.handleAssetClick(mockAsset, mockOnEdit);
    });

    expect(mockOnEdit).toHaveBeenCalledWith(mockAsset);
  });

  it('sollte handleAssetClick andere Files in neuem Tab öffnen', () => {
    const mockOnEdit = jest.fn();
    const mockAsset = {
      id: 'asset-1',
      fileType: 'application/pdf',
      fileName: 'test.pdf',
      downloadUrl: 'https://example.com/test.pdf',
    };

    // Mock window.open
    const mockWindowOpen = jest.fn();
    global.window.open = mockWindowOpen;

    const { result } = renderHook(() =>
      useFileActions({
        organizationId: mockOrganizationId,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.handleAssetClick(mockAsset, mockOnEdit);
    });

    expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/test.pdf', '_blank');
    expect(mockOnEdit).not.toHaveBeenCalled();
  });
});
