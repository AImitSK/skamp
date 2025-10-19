import { renderHook, act } from '@testing-library/react';
import { useFolderNavigation } from '../useFolderNavigation';
import { getFolders } from '@/lib/firebase/media-folders-service';
import { getMediaAssets } from '@/lib/firebase/media-assets-service';

// Mock Firebase services
jest.mock('@/lib/firebase/media-folders-service');
jest.mock('@/lib/firebase/media-assets-service');

const mockGetFolders = getFolders as jest.MockedFunction<typeof getFolders>;
const mockGetMediaAssets = getMediaAssets as jest.MockedFunction<typeof getMediaAssets>;

describe('useFolderNavigation Hook', () => {
  const mockOrganizationId = 'org-123';
  const mockProjectFolders = {
    subfolders: [
      { id: 'folder-1', name: 'Medien' },
      { id: 'folder-2', name: 'Dokumente' },
    ],
    assets: [],
    mainFolder: { id: 'root-folder', name: 'Projekt-Ordner' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: return empty arrays to avoid recursive calls
    mockGetFolders.mockResolvedValue([]);
    mockGetMediaAssets.mockResolvedValue([]);
  });

  describe('Initial Load', () => {
    it('sollte currentFolders beim Mount setzen', () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
        })
      );

      expect(result.current.currentFolders).toEqual(mockProjectFolders.subfolders);
    });

    it('sollte selectedFolderId setzen wenn initialFolderId gegeben', () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
          initialFolderId: 'folder-1',
        })
      );

      expect(result.current.selectedFolderId).toBe('folder-1');
    });

    it('sollte onFolderChange callback aufrufen', () => {
      const mockOnFolderChange = jest.fn();

      renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
          initialFolderId: 'folder-1',
          onFolderChange: mockOnFolderChange,
        })
      );

      expect(mockOnFolderChange).toHaveBeenCalledWith('folder-1');
    });
  });

  describe('handleFolderClick', () => {
    it('sollte zu Ordner navigieren', async () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
        })
      );

      await act(async () => {
        result.current.handleFolderClick('folder-1');
      });

      expect(result.current.selectedFolderId).toBe('folder-1');
    });

    it('sollte onFolderChange callback aufrufen', async () => {
      const mockOnFolderChange = jest.fn();

      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
          onFolderChange: mockOnFolderChange,
        })
      );

      mockOnFolderChange.mockClear();

      await act(async () => {
        result.current.handleFolderClick('folder-1');
      });

      expect(mockOnFolderChange).toHaveBeenCalledWith('folder-1');
    });
  });

  describe('handleGoToRoot', () => {
    it('sollte zu Root zurückkehren', () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
        })
      );

      act(() => {
        result.current.handleGoToRoot();
      });

      expect(result.current.selectedFolderId).toBe('root-folder');
      expect(result.current.breadcrumbs).toEqual([]);
    });
  });

  describe('handleBackClick', () => {
    it('sollte zurück navigieren', async () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
        })
      );

      // Navigiere vorwärts
      await act(async () => {
        result.current.handleFolderClick('folder-1');
      });

      // Navigiere zurück
      await act(async () => {
        result.current.handleBackClick();
      });

      expect(result.current.selectedFolderId).toBeUndefined();
    });
  });

  describe('setSelectedFolderId', () => {
    it('sollte selectedFolderId manuell setzen können', () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
        })
      );

      act(() => {
        result.current.setSelectedFolderId('folder-2');
      });

      expect(result.current.selectedFolderId).toBe('folder-2');
    });
  });

  describe('filterByFolder', () => {
    it('sollte filterByFolder prop akzeptieren', () => {
      const { result } = renderHook(() =>
        useFolderNavigation({
          organizationId: mockOrganizationId,
          projectFolders: mockProjectFolders,
          filterByFolder: 'all',
        })
      );

      expect(result.current.currentFolders).toBeDefined();
    });
  });
});
