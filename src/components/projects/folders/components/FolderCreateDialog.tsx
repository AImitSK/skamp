'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createFolder } from '@/lib/firebase/media-folders-service';
import { useAuth } from '@/context/AuthContext';
import Alert from './Alert';
import type { FolderCreateDialogProps } from '../types';

/**
 * FolderCreateDialog Component
 *
 * Modal zum Erstellen neuer Unterordner
 * Optimiert mit React.memo
 */
const FolderCreateDialog = React.memo(function FolderCreateDialog({
  isOpen,
  onClose,
  onCreateSuccess,
  parentFolderId,
  organizationId
}: FolderCreateDialogProps) {
  const t = useTranslations('projects.folders.createDialog');
  const { user } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error'; message: string } | null>(null);

  const showAlert = (message: string) => {
    setAlert({ type: 'error', message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleCreate = async () => {
    if (!folderName.trim() || !user?.uid) return;

    setCreating(true);
    try {
      await createFolder({
        userId: user.uid,
        organizationId, // Erforderlich für MediaFolder
        name: folderName.trim(),
        parentFolderId,
        description: t('description', { userName: user.displayName || user.email || t('unknownUser') })
      }, { organizationId, userId: user.uid });

      setFolderName('');
      onCreateSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      showAlert(t('error'));
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogBody className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div>
          <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
            {t('label')}
          </label>
          <input
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={t('placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={creating}
            maxLength={50}
          />
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={creating}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!folderName.trim() || creating}
        >
          {creating ? t('creating') : t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default FolderCreateDialog;
