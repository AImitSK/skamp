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
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
    <>
      {/* Minimales Asset - nur Bild/Icon mit Hover-Overlay */}
      <div className="relative inline-block group cursor-pointer" onClick={() => setShowPreviewModal(true)}>
        {isImage && asset.downloadUrl ? (
          /* Bild Asset mit eigenem Overlay */
          <div className="relative inline-block overflow-hidden rounded-lg">
            <img
              src={asset.downloadUrl}
              alt={asset.fileName}
              className="max-w-[450px] max-h-[450px] object-contain rounded-lg transition-transform group-hover:scale-105"
              style={{ width: 'auto', height: 'auto' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Auge-Overlay für Bilder */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <EyeIcon
                className="h-8 w-8 text-white"
                title={asset.fileName}
              />
            </div>
          </div>
        ) : (
          /* Icon für andere Dateitypen */
          <div className="relative w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden">
            <FileIcon className="h-12 w-12 text-gray-400" />
            {/* Auge-Overlay für Icons */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <EyeIcon
                className="h-8 w-8 text-white"
                title={asset.fileName}
              />
            </div>
          </div>
        )}
      </div>

      {/* Zoom-Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowPreviewModal(false)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-2 right-2 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Asset Content */}
            {isImage && asset.downloadUrl ? (
              <img
                src={asset.downloadUrl}
                alt={asset.fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className="bg-white rounded-lg p-8 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <FileIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <Text className="text-lg font-medium mb-2">{asset.fileName}</Text>
                <Text className="text-gray-600 mb-4">{getFileTypeLabel(asset.fileType)}</Text>
                {asset.metadata?.fileSize && (
                  <Text className="text-sm text-gray-500 mb-4">{formatFileSize(asset.metadata.fileSize)}</Text>
                )}
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleView} className="flex items-center gap-2">
                    <EyeIcon className="h-4 w-4" />
                    Öffnen
                  </Button>
                  <Button onClick={handleDownload} outline className="flex items-center gap-2">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {/* Filename Overlay für Bilder */}
            {isImage && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded">
                {asset.fileName}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AssetPreview;