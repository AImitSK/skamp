// src/components/mediathek/ConfirmDialog.tsx
"use client";

import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const t = useTranslations('mediathek.confirmDialog');

  const defaultCancelLabel = cancelLabel || t('cancel');
  const defaultConfirmLabel = confirmLabel || (type === 'danger' ? t('delete') : t('confirm'));

  return (
    <Dialog open={isOpen} onClose={onCancel} size="sm">
      <div className="p-6">
        <div className="sm:flex sm:items-start">
          <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
            type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            <ExclamationTriangleIcon className={`h-6 w-6 ${
              type === 'danger' ? 'text-red-600' : 'text-yellow-600'
            }`} />
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogBody className="mt-2">
              <Text className="text-sm text-zinc-600">{message}</Text>
            </DialogBody>
          </div>
        </div>
        <DialogActions className="mt-5 sm:mt-4">
          <Button
            plain
            onClick={onCancel}
          >
            {defaultCancelLabel}
          </Button>
          <Button
            color="zinc"
            onClick={onConfirm}
          >
            {defaultConfirmLabel}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
