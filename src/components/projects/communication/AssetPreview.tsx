'use client';

import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  DocumentIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { MediaAsset } from '@/types/media';
import { mediaService } from '@/lib/firebase/media-service';

interface AssetPreviewProps {
  assetId: string;
  assetType: 'asset' | 'folder';
  linkText: string;
  projectId: string;
  organizationId: string;
  isOwnMessage: boolean;
  onAssetClick: () => void;
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({
  assetId,
  assetType,
  linkText,
  projectId,
  organizationId,
  isOwnMessage,
  onAssetClick
}) => {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assetType === 'asset') {
      loadAsset();
    } else {
      setLoading(false);
    }
  }, [assetId, assetType]);

  const loadAsset = async () => {
    try {
      setLoading(true);
      const assetData = await mediaService.getMediaAssetById(assetId);
      setAsset(assetData);
    } catch (error) {
      console.error('Fehler beim Laden des Assets:', error);
      setError('Asset konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return DocumentIcon;

    if (fileType.startsWith('image/')) return PhotoIcon;
    if (fileType.startsWith('video/')) return VideoCameraIcon;
    if (fileType.includes('pdf')) return DocumentTextIcon;
    return DocumentIcon;
  };

  const getFileTypeLabel = (fileType?: string): string => {
    if (!fileType) return 'Datei';

    if (fileType.startsWith('image/')) return 'Bild';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('document')) return 'Dokument';
    return 'Datei';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset?.downloadUrl) {
      const link = document.createElement('a');
      link.href = asset.downloadUrl;
      link.download = asset.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset?.downloadUrl) {
      window.open(asset.downloadUrl, '_blank');
    }
  };

  // Ordner-Preview
  if (assetType === 'folder') {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
          isOwnMessage
            ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-400'
            : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
        }`}
        onClick={onAssetClick}
        title="Ordner im Daten-Tab öffnen"
      >
        <FolderIcon className="h-4 w-4" />
        <Text className={`text-sm font-medium ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
          {linkText}
        </Text>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${
          isOwnMessage
            ? 'bg-blue-500 border-blue-400 text-white'
            : 'bg-gray-50 border-gray-200 text-gray-900'
        }`}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        <Text className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
          Lade Asset...
        </Text>
      </div>
    );
  }

  // Error State
  if (error || !asset) {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${
          isOwnMessage
            ? 'bg-red-500 border-red-400 text-white'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}
      >
        <DocumentIcon className="h-4 w-4" />
        <Text className={`text-sm ${isOwnMessage ? 'text-white' : 'text-red-900'}`}>
          {linkText} (nicht verfügbar)
        </Text>
      </div>
    );
  }

  const FileIcon = getFileIcon(asset.fileType);
  const isImage = asset.fileType?.startsWith('image/');

  return (
    <div
      className={`inline-block max-w-sm rounded-lg border overflow-hidden transition-all ${
        isOwnMessage
          ? 'bg-blue-500 border-blue-400'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Thumbnail für Bilder */}
      {isImage && asset.downloadUrl && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={asset.downloadUrl}
            alt={asset.fileName}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleView}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Asset Info */}
      <div className="p-3">
        <div className="flex items-start space-x-2">
          <FileIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            isOwnMessage ? 'text-blue-200' : 'text-gray-600'
          }`} />

          <div className="flex-1 min-w-0">
            <Text className={`text-sm font-medium truncate ${
              isOwnMessage ? 'text-white' : 'text-gray-900'
            }`}>
              {asset.fileName}
            </Text>

            <div className={`flex items-center space-x-2 mt-1 text-xs ${
              isOwnMessage ? 'text-blue-200' : 'text-gray-500'
            }`}>
              <span>{getFileTypeLabel(asset.fileType)}</span>
              {asset.metadata?.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(asset.metadata.fileSize)}</span>
                </>
              )}
            </div>

            {/* Beschreibung falls vorhanden */}
            {asset.description && (
              <Text className={`text-xs mt-1 line-clamp-2 ${
                isOwnMessage ? 'text-blue-100' : 'text-gray-600'
              }`}>
                {asset.description}
              </Text>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            size="sm"
            outline={!isOwnMessage}
            color={isOwnMessage ? "white" : "gray"}
            onClick={handleView}
            className="flex-1"
          >
            <EyeIcon className="h-3 w-3 mr-1" />
            Öffnen
          </Button>

          <Button
            size="sm"
            outline={!isOwnMessage}
            color={isOwnMessage ? "white" : "gray"}
            onClick={handleDownload}
            className="flex-1"
          >
            <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssetPreview;