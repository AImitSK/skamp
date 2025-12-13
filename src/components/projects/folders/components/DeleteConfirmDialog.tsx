'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { DeleteConfirmDialogProps } from '../types';

/**
 * DeleteConfirmDialog Component
 *
 * Bestätigungsdialog für Lösch-Operationen (Files/Folders)
 * Optimiert mit React.memo
 *
 * @example
 * ```tsx
 * <DeleteConfirmDialog
 *   isOpen={showDialog}
 *   title="Datei löschen"
 *   message="Möchten Sie die Datei wirklich löschen?"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDialog(false)}
 * />
 * ```
 */
const DeleteConfirmDialog = React.memo(function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  const t = useTranslations('projects.folders.deleteConfirm');

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogBody>
        <Text>{message}</Text>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
          {t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default DeleteConfirmDialog;
