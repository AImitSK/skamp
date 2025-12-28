// src/components/marken-dna/DocumentEditorModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MarkenDNADocumentType } from '@/components/marken-dna/StatusCircles';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: MarkenDNADocumentType;
  content: string;
  onSave: (content: string, status: 'draft' | 'completed') => Promise<void>;
}

/**
 * Modal zum manuellen Bearbeiten eines Marken-DNA Dokuments
 */
export function DocumentEditorModal({
  isOpen,
  onClose,
  documentType,
  content,
  onSave,
}: DocumentEditorModalProps) {
  const t = useTranslations('markenDNA');
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  // Content bei Öffnen aktualisieren
  useEffect(() => {
    if (isOpen) {
      setEditedContent(content);
    }
  }, [isOpen, content]);

  const handleSave = async (status: 'draft' | 'completed') => {
    setIsSaving(true);
    try {
      await onSave(editedContent, status);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>
        {t(`documents.${documentType}`)} bearbeiten
      </DialogTitle>
      <DialogBody>
        {/* Beschreibung */}
        <p className="text-sm text-zinc-500 mb-4">
          {t(`descriptions.${documentType}`)}
        </p>

        {/* Markdown Editor */}
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-[400px] p-4 font-mono text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          placeholder={t('modal.editPlaceholder')}
        />

        <p className="mt-2 text-xs text-zinc-500">
          Markdown-Format: **fett**, *kursiv*, - Listen, ## Überschriften
        </p>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={isSaving}>
          Abbrechen
        </Button>
        <Button
          onClick={() => handleSave('draft')}
          disabled={isSaving}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          Als Entwurf speichern
        </Button>
        <Button
          onClick={() => handleSave('completed')}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSaving ? 'Speichern...' : 'Abschließen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DocumentEditorModal;
