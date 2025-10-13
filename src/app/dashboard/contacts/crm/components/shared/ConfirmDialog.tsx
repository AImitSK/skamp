// src/app/dashboard/contacts/crm/components/shared/ConfirmDialog.tsx
"use client";

import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  type?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Confirm Dialog Component
 *
 * Zeigt einen Bestätigungsdialog für kritische Aktionen wie Löschen.
 *
 * @component
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={true}
 *   title="Firma löschen"
 *   message="Möchten Sie diese Firma wirklich löschen?"
 *   type="danger"
 *   onConfirm={() => handleDelete()}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
  type = 'warning',
  confirmLabel,
  cancelLabel = 'Abbrechen'
}: ConfirmDialogProps) {
  const defaultConfirmLabel = type === 'danger' ? 'Löschen' : 'Bestätigen';

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="sm:flex sm:items-start">
          <div
            className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}
          >
            <ExclamationTriangleIcon
              className={`h-6 w-6 ${
                type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`}
            />
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogBody className="mt-2">
              <Text>{message}</Text>
            </DialogBody>
          </div>
        </div>
        <DialogActions className="mt-5 sm:mt-4">
          <Button plain onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            color="zinc"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {confirmLabel || defaultConfirmLabel}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
