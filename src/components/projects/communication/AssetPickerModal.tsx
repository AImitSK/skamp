'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import {
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  ChevronRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { MediaAsset } from '@/types/media';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: SelectedAsset) => void;
  projectId: string;
  organizationId: string;
}

export interface SelectedAsset {
  id: string;
  type: 'asset';
  name: string;
  url?: string;
  fileType?: string;
  folderId?: string;
  folderPath?: string[];
}

interface FolderStructure {
  mainFolder: any;
  subfolders: any[];
  statistics: {
    totalFiles: number;
    lastActivity: any;
    folderSizes: Record<string, number>;
  };
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  projectId,
  organizationId
}) => {
  const [loading, setLoading] = useState(false);
  // Exakt wie im funktionierenden ProjectFoldersView
  const [projectFolders, setProjectFolders] = useState<FolderStructure | null>(null);
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [currentAssets, setCurrentAssets] = useState<MediaAsset[]>([]);
  const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lade Projekt-Ordner-Struktur beim Öffnen - genau wie im Daten-Tab
  useEffect(() => {
    if (isOpen && projectId && organizationId) {
      loadProjectFolders();
    }
  }, [isOpen, projectId, organizationId]);

  const loadProjectFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const folderStructure = await projectService.getProjectFolderStructure(projectId, {
        organizationId
      });
      setProjectFolders(folderStructure);

      // Starte mit den Unterordnern des Projekts (genau wie ProjectFoldersView)
      setCurrentFolders(folderStructure?.subfolders || []);
      setCurrentAssets([]);
      setBreadcrumbs([]);
      setNavigationStack([]);
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Ordner:', error);
      setError('Fehler beim Laden der Ordner-Struktur');
    } finally {
      setLoading(false);
    }
  };

  // Exakt kopiert aus ProjectFoldersView
  const loadFolderContent = async (folderId?: string) => {
    setLoading(true);
    try {
      if (folderId) {
        // Lade Inhalte des spezifischen Ordners
        const [folders, assets] = await Promise.all([
          mediaService.getFolders(organizationId, folderId),
          mediaService.getMediaAssets(organizationId, folderId)
        ]);
        setCurrentFolders(folders);
        setCurrentAssets(assets);

        // Breadcrumbs immer aus navigationStack setzen
        setBreadcrumbs([...navigationStack]);
      } else {
        // Zurück zur Hauptansicht (Unterordner des Projektordners)
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
  };

  const handleFolderClick = async (folder: any) => {
    // Navigation in Ordner - genau wie ProjectFoldersView
    const newStack = [...navigationStack, { id: folder.id, name: folder.name }];
    setNavigationStack(newStack);
    await loadFolderContent(folder.id);
  };

  const handleBackClick = async () => {
    if (navigationStack.length === 0) return;

    if (navigationStack.length === 1) {
      // Zurück zur Hauptansicht
      await loadFolderContent();
    } else {
      // Zurück zum vorherigen Ordner
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);
      const parentFolder = newStack[newStack.length - 1];
      await loadFolderContent(parentFolder.id);
    }
  };

  const handleAssetSelect = (asset: MediaAsset) => {
    const selectedAsset: SelectedAsset = {
      id: asset.id!,
      type: 'asset',
      name: asset.fileName,
      url: asset.downloadUrl,
      fileType: asset.fileType,
      folderId: asset.folderId,
      folderPath: breadcrumbs.map(f => f.name)
    };
    onSelectAsset(selectedAsset);
    onClose();
  };


  const getFileIcon = (fileType?: string) => {
    if (!fileType) return DocumentIcon;

    if (fileType.startsWith('image/')) return PhotoIcon;
    if (fileType.startsWith('video/')) return VideoCameraIcon;
    if (fileType.includes('pdf')) return DocumentTextIcon;
    return DocumentIcon;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Entfernt - wir verwenden jetzt currentFolders direkt

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        Asset auswählen
      </DialogTitle>

      <DialogBody className="space-y-4">
        {/* Breadcrumb Navigation */}
        {navigationStack.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Button
              outline
              onClick={handleBackClick}
              className="p-1"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center space-x-1">
              <span>Projekt-Ordner</span>
              {breadcrumbs.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <ChevronRightIcon className="size-4 text-gray-400" />
                  <span className={index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : ''}>
                    {folder.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <Text className="ml-3 text-gray-600">Lade Assets...</Text>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Text className="text-red-600">{error}</Text>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">

            {/* Assets */}
            {currentAssets.length > 0 ? (
              <div>
                <Subheading className="mb-2">Dateien</Subheading>
                <div className="grid grid-cols-1 gap-2">
                  {currentAssets.map((asset) => {
                    const FileIcon = getFileIcon(asset.fileType);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => handleAssetSelect(asset)}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center">
                          <FileIcon className="size-5 text-gray-600 mr-3" />
                          <div>
                            <Text className="font-medium">{asset.fileName}</Text>
                            <Text className="text-sm text-gray-500">
                              {asset.fileType}
                              {asset.metadata?.fileSize && ` • ${formatFileSize(asset.metadata.fileSize)}`}
                            </Text>
                          </div>
                        </div>
                        <Button size="sm" color="blue">
                          Auswählen
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !loading && currentFolders.length === 0 && currentAssets.length === 0 && (
              <div className="text-center py-8">
                <Text className="text-gray-500">Keine Assets in diesem Ordner gefunden</Text>
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button outline onClick={onClose}>
          Abbrechen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetPickerModal;