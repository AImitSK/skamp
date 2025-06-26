// src/components/mediathek/FolderModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { MediaFolder } from "@/types/media";

interface FolderModalProps {
  folder?: MediaFolder; // Wenn gesetzt, Edit-Modus
  parentFolderId?: string;
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
      alert('Bitte geben Sie einen Ordnernamen ein.');
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
      console.error('Fehler beim Speichern des Ordners:', error);
      alert('Fehler beim Speichern des Ordners. Bitte versuchen Sie es erneut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle className="px-6 py-4 text-base font-semibold">
        {isEdit ? 'Ordner bearbeiten' : 'Neuen Ordner erstellen'}
      </DialogTitle>
      
      <DialogBody className="p-6">
        <FieldGroup>
          <Field>
            <Label>Ordnername *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Kunde XYZ, Kampagne 2024, Produktfotos..."
              className="mt-2"
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
              className="mt-2"
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
                      ? 'border-gray-400 scale-110 shadow-md' 
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

      <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
        <Button plain onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button 
          color="indigo" 
          onClick={handleSave} 
          disabled={!name.trim() || saving}
        >
          {saving ? 'Speichern...' : (isEdit ? 'Speichern' : 'Ordner erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}