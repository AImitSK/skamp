import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFolders } from '@/lib/firebase/media-folders-service';
import { getMediaAssets } from '@/lib/firebase/media-assets-service';

interface UseFolderNavigationProps {
  organizationId: string;
  projectFolders: any;
  filterByFolder?: 'all' | 'Dokumente';
  initialFolderId?: string;
  onFolderChange?: (folderId: string) => void;
}

/**
 * useFolderNavigation Hook
 *
 * Verwaltet die Ordner-Navigation (Breadcrumbs, Stack, Current Folder)
 */
export function useFolderNavigation({
  organizationId,
  projectFolders,
  filterByFolder = 'all',
  initialFolderId,
  onFolderChange
}: UseFolderNavigationProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [currentAssets, setCurrentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);
  const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);
  const [allFolders, setAllFolders] = useState<any[]>([]);

  // Load all folders recursively (optimized with useCallback)
  const loadAllFolders = useCallback(async () => {
    if (!projectFolders?.subfolders) return;

    try {
      const allFoldersFlat: any[] = [];

      const collectFolders = async (folders: any[], level = 0) => {
        for (const folder of folders) {
          if (level > 0) {
            allFoldersFlat.push({
              ...folder,
              level,
              displayName: '  '.repeat(level - 1) + folder.name
            });
          }

          try {
            const subfolders = await getFolders(organizationId, folder.id);
            if (subfolders.length > 0) {
              await collectFolders(subfolders, level + 1);
            }
          } catch (error) {
            console.error(`Fehler beim Laden der Unterordner für ${folder.id}:`, error);
          }
        }
      };

      await collectFolders(projectFolders.subfolders, 0);
      setAllFolders(allFoldersFlat);
    } catch (error) {
      console.error('Fehler beim Laden aller Ordner:', error);
    }
  }, [organizationId, projectFolders]);

  // Initial load
  useEffect(() => {
    if (projectFolders?.subfolders) {
      setCurrentFolders(projectFolders.subfolders);
      setCurrentAssets(projectFolders.assets || []);
      setBreadcrumbs([]);

      // Initialer Ordner basierend auf Props
      if (initialFolderId) {
        setSelectedFolderId(initialFolderId);
        onFolderChange?.(initialFolderId);
      } else if (projectFolders.assets && projectFolders.mainFolder?.id) {
        setSelectedFolderId(projectFolders.mainFolder.id);
        onFolderChange?.(projectFolders.mainFolder.id);
      }

      loadAllFolders();
    }
  }, [projectFolders, initialFolderId, loadAllFolders]);

  // Load folder content with breadcrumb stack (optimized with useCallback)
  const loadFolderContentWithStack = useCallback(async (folderId: string, stack: {id: string, name: string}[]) => {
    setLoading(true);
    try {
      const [folders, assets] = await Promise.all([
        getFolders(organizationId, folderId),
        getMediaAssets(organizationId, folderId)
      ]);
      setCurrentFolders(folders);
      setCurrentAssets(assets);
      setBreadcrumbs([...stack]);
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Load folder content (optimized with useCallback)
  const loadFolderContent = useCallback(async (folderId?: string) => {
    setLoading(true);
    try {
      if (folderId) {
        const [folders, assets] = await Promise.all([
          getFolders(organizationId, folderId),
          getMediaAssets(organizationId, folderId)
        ]);
        setCurrentFolders(folders);
        setCurrentAssets(assets);
        setBreadcrumbs([...navigationStack]);
      } else {
        setCurrentFolders(projectFolders?.subfolders || []);
        setCurrentAssets([]);
        setBreadcrumbs([]);
        setNavigationStack([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, navigationStack, projectFolders]);

  // Handle folder click (optimized with useCallback)
  const handleFolderClick = useCallback((folderId: string) => {
    const folder = currentFolders.find(f => f.id === folderId) ||
                   projectFolders?.subfolders?.find((f: any) => f.id === folderId);
    if (folder) {
      const newStack = [...navigationStack, { id: folder.id, name: folder.name }];
      setNavigationStack(newStack);
      setSelectedFolderId(folderId);
      loadFolderContentWithStack(folderId, newStack);

      // Callback aufrufen
      onFolderChange?.(folderId);
    }
  }, [currentFolders, projectFolders, navigationStack, loadFolderContentWithStack, onFolderChange]);

  // Handle go to root (optimized with useCallback)
  const handleGoToRoot = useCallback(() => {
    if (projectFolders.assets && projectFolders.mainFolder?.id) {
      setSelectedFolderId(projectFolders.mainFolder.id);
      setNavigationStack([]);
      setCurrentFolders(projectFolders.subfolders || []);
      setCurrentAssets(projectFolders.assets || []);
      setBreadcrumbs([]);
    } else {
      setSelectedFolderId(undefined);
      setNavigationStack([]);
      loadFolderContent();
    }
  }, [projectFolders, loadFolderContent]);

  // Handle breadcrumb click (optimized with useCallback)
  const handleBreadcrumbClick = useCallback((clickedIndex: number) => {
    const targetStack = navigationStack.slice(0, clickedIndex + 1);
    const targetFolder = targetStack[targetStack.length - 1];

    setNavigationStack(targetStack);
    setSelectedFolderId(targetFolder.id);
    loadFolderContentWithStack(targetFolder.id, targetStack);
  }, [navigationStack, loadFolderContentWithStack]);

  // Handle back click (optimized with useCallback)
  const handleBackClick = useCallback(() => {
    if (navigationStack.length > 0) {
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);

      if (newStack.length > 0) {
        const previousFolder = newStack[newStack.length - 1];
        setSelectedFolderId(previousFolder.id);
        loadFolderContent(previousFolder.id);
      } else {
        setSelectedFolderId(undefined);
        loadFolderContent();
      }
    } else {
      setSelectedFolderId(undefined);
      loadFolderContent();
    }
  }, [navigationStack, loadFolderContent]);

  return {
    selectedFolderId,
    setSelectedFolderId,
    currentFolders,
    currentAssets,
    setCurrentAssets,
    loading,
    breadcrumbs,
    allFolders,
    handleFolderClick,
    handleGoToRoot,
    handleBreadcrumbClick,
    handleBackClick,
    loadFolderContent,
    loadAllFolders
  };
}
