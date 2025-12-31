// src/components/projects/strategy/KernbotschaftEditorModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface KernbotschaftEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (content: string) => Promise<void>;
}

/**
 * Modal zum manuellen Bearbeiten der Kernbotschaft
 */
export function KernbotschaftEditorModal({
  isOpen,
  onClose,
  content,
  onSave,
}: KernbotschaftEditorModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  // Content bei Oeffnen aktualisieren
  useEffect(() => {
    if (isOpen) {
      setEditedContent(content);
    }
  }, [isOpen, content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedContent);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>Kernbotschaft bearbeiten</DialogTitle>
      <DialogBody>
        {/* Warnung */}
        <div className="mb-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Hinweis:</strong> Manuelle Aenderungen werden bei einer Neugenerierung ueberschrieben.
          </p>
        </div>

        {/* Markdown Editor */}
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-[500px] p-4 font-mono text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Kernbotschaft im Markdown-Format..."
        />

        <p className="mt-2 text-xs text-zinc-500">
          Markdown-Format: **fett**, *kursiv*, - Listen, ## Ueberschriften
        </p>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={isSaving}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default KernbotschaftEditorModal;
