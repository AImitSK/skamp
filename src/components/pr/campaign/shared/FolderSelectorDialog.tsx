// src/components/pr/campaign/shared/FolderSelectorDialog.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  FolderIcon,
  HomeIcon,
  ChevronRightIcon
} from '@heroicons/react/20/solid';
import { mediaService } from '@/lib/firebase/media-service';
import { MediaFolder } from '@/types/media';

interface FolderSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect: (folderId?: string) => void;
  organizationId: string;
  clientId?: string;
}

/**
 * FolderSelectorDialog Component
 *
 * Ermöglicht die Navigation und Auswahl von Media-Ordnern für PDF-Export.
 *
 * Features:
 * - Breadcrumb-Navigation
 * - Client-Filter Support
 * - Hierarchische Ordner-Struktur
 *
 * Performance-Optimierung: Mit React.memo gewrappt für optimierte Re-Renders
 *
 * @param isOpen - Dialog-Sichtbarkeit
 * @param onClose - Callback beim Schließen
 * @param onFolderSelect - Callback bei Ordner-Auswahl
 * @param organizationId - Organisation ID für Folder-Abfrage
 * @param clientId - Optional: Client-Filter für Ordner
 */
const FolderSelectorDialog = React.memo(function FolderSelectorDialog({
  isOpen,
  onClose,
  onFolderSelect,
  organizationId,
  clientId
}: FolderSelectorDialogProps) {
  const t = useTranslations('pr.campaign.folderSelector');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id?: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, currentFolderId]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const foldersData = await mediaService.getFolders(organizationId, currentFolderId);

      // Filter für Client-Ordner wenn clientId vorhanden
      const filteredFolders = clientId
        ? foldersData.filter(f => f.clientId === clientId || !f.clientId)
        : foldersData;

      setFolders(filteredFolders);

      // Update breadcrumbs
      if (currentFolderId) {
        const crumbs = await mediaService.getBreadcrumbs(currentFolderId);
        setBreadcrumbs([
          { name: t('mediaLibrary') },
          ...crumbs.map(c => ({ id: c.id, name: c.name }))
        ]);
      } else {
        setBreadcrumbs([{ name: t('mediaLibrary') }]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folderId?: string) => {
    setCurrentFolderId(folderId);
  };

  const handleConfirm = () => {
    onFolderSelect(currentFolderId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4">{t('title')}</DialogTitle>
      <DialogBody className="px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
              <button
                onClick={() => handleNavigate(crumb.id)}
                className="text-[#005fab] hover:text-[#004a8c]"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <Text className="mt-4">{t('loading')}</Text>
          </div>
        ) : (
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
            {/* Current Folder Option */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {currentFolderId ? breadcrumbs[breadcrumbs.length - 1].name : t('mediaLibraryRoot')}
                    </p>
                    <p className="text-sm text-blue-700">{t('saveHereDescription')}</p>
                  </div>
                </div>
                <Button
                  onClick={handleConfirm}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  {t('saveHereButton')}
                </Button>
              </div>
            </div>

            {/* Subfolders */}
            {folders.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => handleNavigate(folder.id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border text-left transition-colors"
                  >
                    <FolderIcon
                      className="h-5 w-5 shrink-0"
                      style={{ color: folder.color || '#6B7280' }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{folder.name}</p>
                      {folder.description && (
                        <p className="text-sm text-gray-500">{folder.description}</p>
                      )}
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('noSubfolders')}</p>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>{t('cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
});

export default FolderSelectorDialog;
