'use client';

import React, { useState } from 'react';
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
 */
export default function FolderCreateDialog({
  isOpen,
  onClose,
  onCreateSuccess,
  parentFolderId,
  organizationId
}: FolderCreateDialogProps) {
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
        name: folderName.trim(),
        parentFolderId,
        description: `Unterordner erstellt von ${user.displayName || user.email}`
      }, { organizationId, userId: user.uid });

      setFolderName('');
      onCreateSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      showAlert('Fehler beim Erstellen des Ordners. Bitte versuchen Sie es erneut.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Neuen Ordner erstellen</DialogTitle>
      <DialogBody className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div>
          <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
            Ordnername
          </label>
          <input
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ordnername eingeben..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={creating}
            maxLength={50}
          />
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={creating}>
          Abbrechen
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!folderName.trim() || creating}
        >
          {creating ? 'Wird erstellt...' : 'Ordner erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
