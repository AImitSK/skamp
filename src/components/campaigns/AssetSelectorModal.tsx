// src/components/campaigns/AssetSelectorModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { 
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon
} from "@heroicons/react/20/solid";
import Link from "next/link";
import dynamic from 'next/dynamic';

// Lazy load UploadModal to avoid circular dependencies
const UploadModal = dynamic(() => import('@/app/dashboard/pr-tools/media-library/UploadModal'), {
  ssr: false
});
import { serverTimestamp } from 'firebase/firestore';
import { mediaService } from "@/lib/firebase/media-service";
import { MediaAsset, MediaFolder } from "@/types/media";
import { CampaignAssetAttachment } from "@/types/pr";
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER } from "@/constants/ui";

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
  organizationId: string;
  legacyUserId?: string;
  selectionMode?: 'multiple' | 'single'; // Für Key Visual nur single selection
  onUploadSuccess?: () => void; // Callback nach erfolgreichem Upload
}

export function AssetSelectorModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onAssetsSelected,
  organizationId,
  legacyUserId,
  selectionMode = 'multiple',
  onUploadSuccess
}: AssetSelectorModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      loadClientMedia();
    } else {
      // Reset state when modal closes
      setSelectedItems(new Set());
      setSearchTerm('');
    }
  }, [isOpen, clientId]);

  const loadClientMedia = async () => {
    setLoading(true);
    try {
      const { assets: clientAssets, folders: clientFolders } = await mediaService.getMediaByClientId(
        organizationId,
        clientId,
        false,
        legacyUserId
      );
      setAssets(clientAssets);
      setFolders(clientFolders);
    } catch (error) {
      // Error loading media - could show toast notification here
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const search = searchTerm.toLowerCase();
    return assets.filter(a =>
      a.fileName.toLowerCase().includes(search) ||
      a.description?.toLowerCase().includes(search)
    );
  }, [assets, searchTerm]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    
    if (selectionMode === 'single') {
      // Bei single mode: Nur ein Item kann ausgewählt werden
      if (checked) {
        newSelection.clear();
        newSelection.add(itemId);
      } else {
        newSelection.delete(itemId);
      }
    } else {
      // Bei multiple mode: Normale Mehrfachauswahl
      if (checked) {
        newSelection.add(itemId);
      } else {
        newSelection.delete(itemId);
      }
    }
    
    setSelectedItems(newSelection);
  };

  const handleConfirm = () => {
    const attachments: CampaignAssetAttachment[] = [];
    
    // Process selected assets
    assets.forEach(asset => {
      if (selectedItems.has(asset.id!)) {
        attachments.push({
          id: `asset-${asset.id}`,
          type: 'asset',
          assetId: asset.id,
          metadata: {
            fileName: asset.fileName,
            fileType: asset.fileType,
            description: asset.description || '',
            thumbnailUrl: asset.downloadUrl
          },
          attachedAt: serverTimestamp() as any,
          attachedBy: organizationId
        });
      }
    });

    // Process selected folders
    folders.forEach(folder => {
      if (selectedItems.has(folder.id!)) {
        attachments.push({
          id: `folder-${folder.id}`,
          type: 'folder',
          folderId: folder.id,
          metadata: {
            folderName: folder.name,
            description: folder.description || ''
          },
          attachedAt: serverTimestamp() as any,
          attachedBy: organizationId
        });
      }
    });

    onAssetsSelected(attachments);
    onClose();
  };

  if (!isOpen) return null;

  const handleUploadSuccess = async () => {
    // Nach erfolgreichem Upload: Modal schließen
    setShowUploadModal(false);
    
    // Längeres Warten bevor neu laden (Firebase braucht Zeit für Konsistenz)
    setTimeout(async () => {
      await loadClientMedia();
    }, 2000); // Erhöht von 1000ms auf 2000ms
    
    // Optional: Callback für Parent Component
    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="3xl">
        <DialogTitle className="px-6 py-4 flex items-center justify-between">
          <span>
            {selectionMode === 'single' ? 'Key Visual' : 'Medien'} auswählen
            {clientName && ` für ${clientName}`}
          </span>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white px-4 py-2"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Neue Datei hochladen
          </Button>
        </DialogTitle>
      
      <DialogBody className="px-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Medien suchen..."
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
            <Text className="mt-4">Lade Medien...</Text>
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Ordner</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {folders.map(folder => (
                    <label
                      key={folder.id}
                      className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedItems.has(folder.id!)}
                        onChange={(checked) => handleItemToggle(folder.id!, checked)}
                        className="mr-3 shrink-0"
                      />
                      <FolderIcon className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        {folder.description && (
                          <p className="text-sm text-gray-500 truncate">{folder.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {filteredAssets.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Dateien</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAssets.map(asset => (
                    <label
                      key={asset.id}
                      className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedItems.has(asset.id!)}
                        onChange={(checked) => handleItemToggle(asset.id!, checked)}
                        className="mr-3 shrink-0"
                      />
                      {asset.fileType?.startsWith('image/') ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="h-10 w-10 object-cover rounded mr-3 shrink-0"
                        />
                      ) : (
                        <DocumentTextIcon className="h-10 w-10 text-gray-400 mr-3 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {assets.length === 0 && folders.length === 0 && !loading && (
              <div className="text-center py-12">
                <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Text>Keine Medien für diesen Kunden gefunden</Text>
                <Link
                  href={`/dashboard/pr-tools/media-library?uploadFor=${clientId}`}
                  target="_blank"
                  className="inline-flex items-center mt-4 text-primary hover:text-primary-hover"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                  Medien hochladen
                </Link>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={selectedItems.size === 0}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {selectionMode === 'single' 
            ? 'Als Key Visual verwenden'
            : `${selectedItems.size} Medien übernehmen`
          }
        </Button>
      </DialogActions>
    </Dialog>

    {/* Upload Modal */}
    {showUploadModal && (
      <UploadModal
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        preselectedClientId={clientId}
        organizationId={organizationId}
        userId={legacyUserId || ''}
      />
    )}
    </>
  );
}