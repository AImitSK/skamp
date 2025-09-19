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
  type: 'asset' | 'folder';
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
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folderPath, setFolderPath] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lade Projekt-Ordner-Struktur beim Öffnen
  useEffect(() => {
    if (isOpen && projectId && organizationId) {
      loadProjectFolders();
    }
  }, [isOpen, projectId, organizationId]);

  const loadProjectFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const structure = await projectService.getProjectFolderStructure(projectId, {
        organizationId
      });
      setFolderStructure(structure);
      setCurrentFolder(structure.mainFolder);
      setFolderPath([structure.mainFolder]);

      // Lade Assets für Haupt-Ordner
      if (structure.mainFolder?.id) {
        await loadAssetsForFolder(structure.mainFolder.id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Ordner:', error);
      setError('Fehler beim Laden der Ordner-Struktur');
    } finally {
      setLoading(false);
    }
  };

  const loadAssetsForFolder = async (folderId: string) => {
    try {
      const folderAssets = await mediaService.getMediaAssets(organizationId, folderId);
      setAssets(folderAssets);
    } catch (error) {
      console.error('Fehler beim Laden der Assets:', error);
      setAssets([]);
    }
  };

  const handleFolderClick = async (folder: any) => {
    setCurrentFolder(folder);
    setFolderPath([...folderPath, folder]);
    await loadAssetsForFolder(folder.id);
  };

  const handleBackClick = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]);
      loadAssetsForFolder(newPath[newPath.length - 1].id);
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
      folderPath: folderPath.map(f => f.name)
    };
    onSelectAsset(selectedAsset);
    onClose();
  };

  const handleFolderSelect = (folder: any) => {
    const selectedAsset: SelectedAsset = {
      id: folder.id,
      type: 'folder',
      name: folder.name,
      folderId: folder.id,
      folderPath: folderPath.map(f => f.name)
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

  const getSubfolders = () => {
    if (!folderStructure) return [];

    // Wenn wir im Haupt-Ordner sind, zeige Unterordner
    if (currentFolder?.id === folderStructure.mainFolder?.id) {
      return folderStructure.subfolders || [];
    }

    // Sonst keine weiteren Unterordner (vereinfacht)
    return [];
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        Asset auswählen
      </DialogTitle>

      <DialogBody className="space-y-4">
        {/* Breadcrumb Navigation */}
        {folderPath.length > 1 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Button
              outline
              onClick={handleBackClick}
              className="p-1"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center space-x-1">
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <span className={index === folderPath.length - 1 ? 'font-medium text-gray-900' : ''}>
                    {folder.name}
                  </span>
                  {index < folderPath.length - 1 && (
                    <ChevronRightIcon className="size-4 text-gray-400" />
                  )}
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
            {/* Unterordner */}
            {getSubfolders().length > 0 && (
              <div>
                <Subheading className="mb-2">Ordner</Subheading>
                <div className="grid grid-cols-1 gap-2">
                  {getSubfolders().map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group"
                    >
                      <div
                        className="flex items-center flex-1"
                        onClick={() => handleFolderClick(folder)}
                      >
                        <FolderIcon className="size-5 text-blue-600 mr-3" />
                        <div>
                          <Text className="font-medium">{folder.name}</Text>
                          <Text className="text-sm text-gray-500">
                            {folderStructure?.statistics.folderSizes[folder.id] || 0} Dateien
                          </Text>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          outline
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderSelect(folder);
                          }}
                        >
                          Ordner auswählen
                        </Button>
                        <ChevronRightIcon className="size-5 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {assets.length > 0 ? (
              <div>
                <Subheading className="mb-2">Dateien</Subheading>
                <div className="grid grid-cols-1 gap-2">
                  {assets.map((asset) => {
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
            ) : !loading && getSubfolders().length === 0 && (
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