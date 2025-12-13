'use client';

import React, { useState, useEffect } from 'react';
import { FolderIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getFolders } from '@/lib/firebase/media-folders-service';
import { updateAsset } from '@/lib/firebase/media-assets-service';
import { useTranslations } from 'next-intl';
import Alert from './Alert';

interface MoveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoveSuccess: () => void;
  asset: any;
  availableFolders: any[];
  currentFolderId?: string;
  organizationId: string;
  rootFolder?: { id: string; name: string };
}

/**
 * MoveAssetModal Component
 *
 * FTP-Style Navigation zum Verschieben von Assets zwischen Ordnern
 * Optimiert mit React.memo
 */
const MoveAssetModal = React.memo(function MoveAssetModal({
  isOpen,
  onClose,
  onMoveSuccess,
  asset,
  availableFolders,
  currentFolderId,
  organizationId,
  rootFolder
}: MoveAssetModalProps) {
  const t = useTranslations('projects.folders.moveAssetModal');
  const [currentPath, setCurrentPath] = useState<{id: string, name: string}[]>([]);
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error'; message: string } | null>(null);

  // Modal zurücksetzen und Hauptordner laden wenn geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setCurrentPath([]);
      setSelectedFolderId(null);
      setAlert(null);

      if (rootFolder) {
        // Im Strategie-Tab: Zeige den Dokumente-Ordner als Root mit seinen Unterordnern
        setCurrentPath([{ id: rootFolder.id, name: rootFolder.name }]);
        setSelectedFolderId(rootFolder.id);
        setCurrentFolders(availableFolders || []);
      } else {
        // Im Daten-Tab: Lade die 3 Hauptordner (Medien, Dokumente, Pressemeldungen)
        setCurrentFolders(availableFolders || []);
      }
    }
  }, [isOpen, availableFolders, rootFolder]);

  const showAlert = (message: string) => {
    setAlert({ type: 'error', message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleFolderClick = async (folder: any) => {
    try {
      // Navigiere in den Ordner hinein
      const subfolders = await getFolders(organizationId, folder.id);
      setCurrentFolders(subfolders);
      setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
      setSelectedFolderId(folder.id); // Aktueller Ordner ist ausgewählt
    } catch (error) {
      console.error('Fehler beim Laden des Ordners:', error);
      showAlert(t('errors.loadFolder'));
    }
  };

  const handleBackClick = async () => {
    if (currentPath.length === 0) return;

    try {
      if (currentPath.length === 1) {
        if (rootFolder) {
          // Im Strategie-Tab: Kann nicht weiter zurück als zum Dokumente-Ordner
          return;
        } else {
          // Im Daten-Tab: Zurück zu den Hauptordnern
          setCurrentFolders(availableFolders || []);
          setCurrentPath([]);
          setSelectedFolderId(null);
        }
      } else {
        // Zurück zum vorherigen Ordner
        const parentFolder = currentPath[currentPath.length - 2];
        const subfolders = await getFolders(organizationId, parentFolder.id);
        setCurrentFolders(subfolders);
        setCurrentPath(currentPath.slice(0, -1));
        setSelectedFolderId(parentFolder.id);
      }
    } catch (error) {
      console.error('Fehler beim Zurücknavigieren:', error);
      showAlert(t('errors.navigate'));
    }
  };

  const handleMove = async () => {
    if (!asset?.id || selectedFolderId === null) return;

    setMoving(true);
    try {
      await updateAsset(asset.id, {
        folderId: selectedFolderId
      });

      onMoveSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Verschieben der Datei:', error);
      showAlert(t('errors.moveAsset'));
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen || !asset) return null;

  const getPathString = () => {
    if (currentPath.length === 0) return t('projectFolder');
    return t('projectFolder') + ' > ' + currentPath.map(p => p.name).join(' > ');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogBody className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* Zu verschiebende Datei anzeigen */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            <Text className="font-medium text-blue-900">{asset?.fileName}</Text>
          </div>
        </div>

        {/* Aktueller Pfad */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <Text className="text-sm font-medium text-gray-700">{t('currentPath')}</Text>
          <Text className="text-sm text-gray-600">{getPathString()}</Text>
        </div>

        {/* Ordner-Navigation */}
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {/* Zurück-Button */}
          {currentPath.length > 0 && (
            <div
              className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b"
              onClick={handleBackClick}
            >
              <FolderIcon className="w-5 h-5 text-gray-500" />
              <Text className="text-sm font-medium text-gray-700">{t('backButton')}</Text>
            </div>
          )}

          {/* Ordner-Liste */}
          {currentFolders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Text className="text-sm">{t('emptyState.noSubfolders')}</Text>
              {selectedFolderId && (
                <Text className="text-xs mt-1">{t('emptyState.canMoveHere')}</Text>
              )}
            </div>
          ) : (
            currentFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleFolderClick(folder)}
              >
                <FolderIcon className="w-5 h-5 text-blue-500" />
                <Text className="text-sm font-medium">{folder.name}</Text>
                <div className="ml-auto text-gray-400">{t('navigationArrow')}</div>
              </div>
            ))
          )}
        </div>

        {/* Zielordner-Info */}
        {selectedFolderId && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <Text className="text-sm font-medium text-green-800">
              {t('moveToTarget', { path: getPathString() })}
            </Text>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={moving}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleMove}
          disabled={moving || selectedFolderId === null}
        >
          {moving ? t('moving') : t('moveHere')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default MoveAssetModal;
