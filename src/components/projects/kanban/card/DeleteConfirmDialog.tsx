// src/components/projects/kanban/card/DeleteConfirmDialog.tsx
'use client';

import React, { memo } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  projectTitle: string;
  isDeleting: boolean;
  hasError: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = memo(({
  isOpen,
  onClose,
  onConfirm,
  projectTitle,
  isDeleting,
  hasError
}) => {
  const t = useTranslations('projects.kanban.card.deleteDialog');
  const tCommon = useTranslations('common');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Dialog Header */}
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {t('title')}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {t('message', { projectTitle })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {hasError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{t('error')}</p>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            color="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            {tCommon('cancel')}
          </Button>
          <button
            type="button"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {t('deleting')}
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4 mr-2" />
                {tCommon('delete')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';
