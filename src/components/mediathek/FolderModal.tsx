// src/components/mediathek/FolderModal.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MediaFolder } from "@/types/media";

interface FolderModalProps {
  folder?: MediaFolder;
  parentFolderId?: string;
  allFolders?: MediaFolder[];
  organizationId: string; // Erforderlich für MediaFolder
  onClose: () => void;
  onSave: (folderData: Omit<MediaFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#84cc16', // Lime
];

export default function FolderModal({
  folder,
  parentFolderId,
  allFolders = [],
  organizationId,
  onClose,
  onSave
}: FolderModalProps) {
  const t = useTranslations('mediathek.folderModal');
  const [name, setName] = useState(folder?.name || '');
  const [description, setDescription] = useState(folder?.description || '');
  const [selectedColor, setSelectedColor] = useState(folder?.color || FOLDER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const isEdit = !!folder;

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        parentFolderId,
        organizationId, // Erforderlich für MediaFolder
      });
      onClose();
    } catch (error) {
      // Error handling could be improved with proper user feedback
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>
        {isEdit ? t('editTitle') : t('createTitle')}
      </DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
        <FieldGroup>
            <Field>
              <Label>{t('nameLabel')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                autoFocus
              />
            </Field>

            <Field>
              <Label>{t('descriptionLabel')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </Field>

            <Field>
              <Label>{t('colorLabel')}</Label>
              <div className="mt-3 flex flex-wrap gap-3">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-gray-400 scale-110' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={t('colorTitle', { color })}
                  />
                ))}
              </div>
            </Field>
        </FieldGroup>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={saving}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {saving ? t('saving') : (isEdit ? t('save') : t('create'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
}