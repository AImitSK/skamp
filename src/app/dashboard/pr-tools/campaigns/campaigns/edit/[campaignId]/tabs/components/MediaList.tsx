// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/MediaList.tsx
"use client";

import React from 'react';
import {
  FolderIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { CampaignAssetAttachment } from '@/types/pr';

interface MediaListProps {
  attachments: CampaignAssetAttachment[];
  onRemove: (assetId: string) => void;
}

/**
 * MediaList Komponente
 *
 * Zeigt eine Liste von angehängten Medien (Ordner und Dateien) an.
 * Unterstützt verschiedene Medientypen mit entsprechenden Icons und Vorschaubildern.
 *
 * @param attachments - Array von angehängten Assets (Ordner oder Dateien)
 * @param onRemove - Callback zum Entfernen eines Mediums (wird mit assetId/folderId aufgerufen)
 */
export function MediaList({ attachments, onRemove }: MediaListProps) {
  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        // Bestimme den eindeutigen Identifier für das Asset
        const assetId = attachment.assetId || attachment.folderId || '';

        return (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3">
              {/* Icon basierend auf Asset-Typ */}
              {attachment.type === 'folder' ? (
                <FolderIcon className="h-5 w-5 text-gray-400" />
              ) : attachment.metadata.fileType?.startsWith('image/') ? (
                <img
                  src={attachment.metadata.thumbnailUrl}
                  alt={attachment.metadata.fileName}
                  className="h-8 w-8 object-cover rounded"
                />
              ) : (
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              )}

              {/* Name und Badge */}
              <div>
                <p className="font-medium text-sm">
                  {attachment.metadata.fileName || attachment.metadata.folderName}
                </p>
                {attachment.type === 'folder' && (
                  <Badge color="blue" className="text-xs">Ordner</Badge>
                )}
              </div>
            </div>

            {/* Entfernen-Button */}
            <button
              type="button"
              onClick={() => onRemove(assetId)}
              className="text-red-600 hover:text-red-500"
              aria-label="Medium entfernen"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
