'use client';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { PaperClipIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ToggleBox } from './ToggleBox';
import { MediaToggleBoxProps, MediaItem } from '@/types/customer-review';

/**
 * Media-Toggle-Box für die Anzeige von angehängten Medien
 * Zeigt Medien-Thumbnails und ermöglicht Vollbild-Ansicht
 * OPTIMIERT: Mit React.memo und useMemo für bessere Performance
 */
function MediaToggleBoxComponent({
  id,
  title,
  isExpanded,
  onToggle,
  organizationId,
  mediaItems = [],
  onMediaSelect,
  selectedMediaIds = [],
  maxDisplayCount,
  className = '',
  ...props
}: MediaToggleBoxProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handleMediaClick = useCallback((mediaItem: MediaItem) => {
    setSelectedMedia(mediaItem);
    onMediaSelect?.(mediaItem.id);
  }, [onMediaSelect]);

  const handleDownload = useCallback((e: React.MouseEvent, mediaItem: MediaItem) => {
    e.stopPropagation();
    // Download logic here
    const link = document.createElement('a');
    link.href = mediaItem.url;
    link.download = mediaItem.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // PERFORMANCE: Memoized Berechnungen
  const displayItems = useMemo(() => 
    maxDisplayCount ? mediaItems.slice(0, maxDisplayCount) : mediaItems, 
    [mediaItems, maxDisplayCount]
  );
  
  const subtitle = undefined;

  return (
    <>
      <ToggleBox
        id={id}
        title={title}
        subtitle={subtitle}
        count={mediaItems.length}
        icon={PaperClipIcon}
        iconColor="text-blue-600"
        isExpanded={isExpanded}
        onToggle={onToggle}
        organizationId={organizationId}
        className={className}
        {...props}
      >
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <PaperClipIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Medien angehängt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info-Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>Hinweis:</strong> Diese Medien werden nach Ihrer Freigabe automatisch 
                    mit der Pressemitteilung an die Medien-Verteiler gesendet.
                  </p>
                </div>
              </div>
            </div>

            {/* Medien-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayItems.map((mediaItem) => {
                // Null-Safety für korrupte Daten
                if (!mediaItem || !mediaItem.id) return null;

                const mimeType = mediaItem.mimeType || 'application/octet-stream';
                const filename = mediaItem.filename || 'Unknown file';

                return (
                <div
                  key={mediaItem.id}
                  className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors duration-150 cursor-pointer"
                  onClick={() => handleMediaClick(mediaItem)}
                  data-testid={`media-item-${mediaItem.id}`}
                >
                  {/* Media-Vorschau */}
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {mimeType.startsWith('image/') && mediaItem.thumbnailUrl ? (
                      <img
                        src={mediaItem.thumbnailUrl}
                        alt={filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl" role="img" aria-label={mimeType}>
                        {getFileTypeIcon(mimeType)}
                      </span>
                    )}
                    
                    {/* Hover-Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-150 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex space-x-2">
                        <button
                          className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          title="Vollbild anzeigen"
                          aria-label={`${filename} in Vollbild anzeigen`}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(e, mediaItem)}
                          className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          title="Herunterladen"
                          aria-label={`${filename} herunterladen`}
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Media-Info */}
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {filename}
                    </h4>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{formatFileSize(mediaItem.size || 0)}</span>
                      {mediaItem.metadata?.dimensions && (
                        <span>{mediaItem.metadata.dimensions.width}×{mediaItem.metadata.dimensions.height}</span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </ToggleBox>

      {/* Vollbild-Modal (einfache Implementierung) */}
      {selectedMedia && selectedMedia.mimeType && selectedMedia.mimeType.startsWith('image/') && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={selectedMedia.url}
              alt={selectedMedia.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

// PERFORMANCE: Memoized Export mit optimiertem Vergleich
export const MediaToggleBox = memo(MediaToggleBoxComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.mediaItems.length === nextProps.mediaItems.length &&
    prevProps.maxDisplayCount === nextProps.maxDisplayCount
  );
});

export default MediaToggleBox;