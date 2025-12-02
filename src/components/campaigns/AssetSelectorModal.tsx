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
  FolderOpenIcon,
  DocumentTextIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import dynamic from 'next/dynamic';

// ✅ ERSETZT: Media Library UploadModal durch Project-Style Upload
import SimpleProjectUploadModal from './SimpleProjectUploadModal';
import { serverTimestamp } from 'firebase/firestore';
import { mediaService } from "@/lib/firebase/media-service";
import { 
  campaignMediaService, 
  uploadCampaignAttachment,
  getCampaignUploadFeatureStatus 
} from "@/lib/firebase/campaign-media-service";
import { 
  createAttachmentContext,
  CampaignUploadType 
} from "@/components/campaigns/utils/campaign-context-builder";
import { 
  createFeatureFlagContext,
  getUIEnhancements,
  getMigrationStatus 
} from "@/components/campaigns/config/campaign-feature-flags";
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
  
  // Campaign Smart Router Integration Props
  campaignId?: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType?: CampaignUploadType;
  enableSmartRouter?: boolean;
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
  onUploadSuccess,
  
  // Campaign Smart Router Props
  campaignId,
  campaignName,
  selectedProjectId,
  selectedProjectName,
  uploadType = 'attachment',
  enableSmartRouter = false
}: AssetSelectorModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [navigationStack, setNavigationStack] = useState<Array<{ id: string; name: string }>>([]);
  const [baseFolderId, setBaseFolderId] = useState<string | undefined>(undefined); // Medien-Ordner als ROOT

  useEffect(() => {
    if (isOpen && clientId) {
      loadClientMedia();
    } else {
      // Reset state when modal closes
      setSelectedItems(new Set());
      setSearchTerm('');
      setCurrentFolderId(undefined);
      setNavigationStack([]);
      setBaseFolderId(undefined);
    }
  }, [isOpen, clientId]);

  const loadClientMedia = async () => {
    setLoading(true);
    try {
      // ✅ NEUE LOGIK: Wenn Projekt vorhanden, lade aus Projekt-Medien-Ordner
      if (selectedProjectId && selectedProjectName) {

        // 1. Alle Ordner der Organisation laden
        const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

        // 2. Projekt-Hauptordner finden
        const projectFolder = allFolders.find(folder =>
          folder.name.includes('P-') && folder.name.includes(selectedProjectName || 'Dan dann')
        );

        if (projectFolder) {
          // 3. Medien-Unterordner finden
          const medienFolder = allFolders.find(folder =>
            folder.parentFolderId === projectFolder.id && folder.name === 'Medien'
          );

          if (medienFolder) {
            // 4. Lade Assets und Unterordner aus dem Medien-Ordner (als neuer ROOT)
            const [medienAssets, medienSubFolders] = await Promise.all([
              mediaService.getMediaAssets(organizationId, medienFolder.id),
              mediaService.getFolders(organizationId, medienFolder.id)
            ]);

            setAssets(medienAssets);
            setFolders(medienSubFolders);
            setCurrentFolderId(medienFolder.id); // ✅ SET UPLOAD TARGET FOLDER
            setBaseFolderId(medienFolder.id); // ✅ SET BASE FOLDER FOR NAVIGATION
            setNavigationStack([]); // Reset navigation when loading
          } else {
            // Fallback: Standard Client-Medien
            const result = await mediaService.getMediaByClientId(organizationId, clientId, false, legacyUserId);
            setAssets(result.assets);
            setFolders(result.folders);
            setCurrentFolderId(undefined); // No specific folder for fallback
          }
        } else {
          // Fallback: Standard Client-Medien
          const result = await mediaService.getMediaByClientId(organizationId, clientId, false, legacyUserId);
          setAssets(result.assets);
          setFolders(result.folders);
          setCurrentFolderId(undefined); // No specific folder for fallback
        }
      } else {
        // ✅ ALTE LOGIK: Kein Projekt, verwende Standard Client-Filter
        // Zeige nur client-spezifische Medien
        const result = await mediaService.getMediaByClientId(organizationId, clientId, false, legacyUserId);
        setAssets(result.assets);
        setFolders(result.folders);
        setCurrentFolderId(undefined); // No specific folder for client-only view
      }
    } catch (error) {
      setAssets([]);
      setFolders([]);
      setCurrentFolderId(undefined); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ORDNER-NAVIGATION
  // ══════════════════════════════════════════════════════════════

  const navigateToFolder = async (folder: MediaFolder) => {
    setLoading(true);
    try {
      // Lade Assets und Unterordner des angeklickten Ordners
      const [folderAssets, subFolders] = await Promise.all([
        mediaService.getMediaAssets(organizationId, folder.id!),
        mediaService.getFolders(organizationId, folder.id!)
      ]);

      setAssets(folderAssets);
      setFolders(subFolders);
      setCurrentFolderId(folder.id!);

      // Füge aktuellen Ordner zum Navigation Stack hinzu
      setNavigationStack(prev => [...prev, { id: folder.id!, name: folder.name }]);
    } catch (error) {
      console.error('Fehler beim Navigieren in Ordner:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = async () => {
    if (navigationStack.length === 0) return;

    setLoading(true);
    try {
      // Gehe einen Ordner zurück
      const newStack = [...navigationStack];
      newStack.pop();

      // Bestimme den Ziel-Ordner
      const targetFolderId = newStack.length > 0
        ? newStack[newStack.length - 1].id
        : baseFolderId;

      if (targetFolderId) {
        const [folderAssets, subFolders] = await Promise.all([
          mediaService.getMediaAssets(organizationId, targetFolderId),
          mediaService.getFolders(organizationId, targetFolderId)
        ]);

        setAssets(folderAssets);
        setFolders(subFolders);
        setCurrentFolderId(targetFolderId);
        setNavigationStack(newStack);
      }
    } catch (error) {
      console.error('Fehler beim Zurück-Navigieren:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRoot = async () => {
    if (!baseFolderId) return;

    setLoading(true);
    try {
      const [folderAssets, subFolders] = await Promise.all([
        mediaService.getMediaAssets(organizationId, baseFolderId),
        mediaService.getFolders(organizationId, baseFolderId)
      ]);

      setAssets(folderAssets);
      setFolders(subFolders);
      setCurrentFolderId(baseFolderId);
      setNavigationStack([]);
    } catch (error) {
      console.error('Fehler beim Navigieren zum Root:', error);
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

    // Process selected assets (nur Assets, keine Ordner mehr!)
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

    // Ordner-Auswahl entfernt - nur Assets können ausgewählt werden

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
        <DialogTitle className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span>
              {selectionMode === 'single' ? 'Key Visual' : 'Medien'} auswählen
              {clientName && ` für ${clientName}`}
            </span>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white px-4 py-2 mr-8"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Neue Datei hochladen
            </Button>
          </div>
        </DialogTitle>
      
      <DialogBody className="px-6">
        {/* Search */}
        <div className="mb-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Medien suchen..."
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
            <Text className="mt-4">Lade Medien...</Text>
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Breadcrumb Navigation */}
            {navigationStack.length > 0 && (
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-4">
                <button
                  onClick={navigateToRoot}
                  className="flex items-center text-sm text-gray-600 hover:text-[#005fab] transition-colors"
                >
                  <HomeIcon className="h-4 w-4 mr-1" />
                  Medien
                </button>
                {navigationStack.map((item, index) => (
                  <div key={item.id} className="flex items-center">
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-1" />
                    {index === navigationStack.length - 1 ? (
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    ) : (
                      <button
                        onClick={async () => {
                          // Navigiere zu diesem Ordner
                          const targetStack = navigationStack.slice(0, index + 1);
                          setLoading(true);
                          try {
                            const [folderAssets, subFolders] = await Promise.all([
                              mediaService.getMediaAssets(organizationId, item.id),
                              mediaService.getFolders(organizationId, item.id)
                            ]);
                            setAssets(folderAssets);
                            setFolders(subFolders);
                            setCurrentFolderId(item.id);
                            setNavigationStack(targetStack);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-sm text-gray-600 hover:text-[#005fab] transition-colors"
                      >
                        {item.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Zurück-Button */}
            {navigationStack.length > 0 && (
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#005fab] mb-4 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Zurück
              </button>
            )}

            {/* Folders - Klickbar für Navigation, KEINE Auswahl möglich */}
            {folders.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Ordner</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => navigateToFolder(folder)}
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-[#005fab] hover:bg-blue-50 cursor-pointer transition-colors text-left group"
                    >
                      <FolderIcon className="h-5 w-5 text-amber-500 mr-3 shrink-0 group-hover:hidden" />
                      <FolderOpenIcon className="h-5 w-5 text-amber-600 mr-3 shrink-0 hidden group-hover:block" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        {folder.description && (
                          <p className="text-sm text-gray-500 truncate">{folder.description}</p>
                        )}
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-[#005fab] shrink-0" />
                    </button>
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
                <Text>
                  Keine Medien für diesen Kunden gefunden
                </Text>
                <Text className="text-sm text-gray-500 mt-2">
                  Laden Sie Medien für diesen Kunden hoch
                </Text>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center mt-4 text-primary hover:text-primary-hover bg-transparent border-0 p-0"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                  Medien hochladen
                </Button>
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

    {/* ✅ NEUES UPLOAD MODAL: Verwendet Project-Upload-System */}
    {showUploadModal && (
      <SimpleProjectUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        currentFolderId={currentFolderId} // ✅ UPLOAD DIREKT in Projekt-Medien-Ordner
        folderName={currentFolderId ? 'Medien' : undefined}
        clientId={clientId}
        organizationId={organizationId}
      />
    )}
    </>
  );
}