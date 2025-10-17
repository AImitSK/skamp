// src/components/mediathek/FolderModal.tsx
"use client";

import { useState } from "react";
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
  onClose, 
  onSave
}: FolderModalProps) {
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
        {isEdit ? 'Ordner bearbeiten' : 'Neuen Ordner erstellen'}
      </DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
        <FieldGroup>
            <Field>
              <Label>Ordnername *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Kunde XYZ, Kampagne 2024, Produktfotos..."
                autoFocus
              />
            </Field>

            <Field>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Ordnerinhalts..."
                rows={3}
              />
            </Field>

            <Field>
              <Label>Ordnerfarbe</Label>
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
                    title={`Farbe: ${color}`}
                  />
                ))}
              </div>
            </Field>
        </FieldGroup>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {saving ? 'Speichern...' : (isEdit ? 'Speichern' : 'Ordner erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}