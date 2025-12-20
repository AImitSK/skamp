'use client';

import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { MARKEN_DNA_DOCUMENTS, type MarkenDNADocumentType } from '@/types/marken-dna';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { useState } from 'react';

interface MarkenDNAEditorModalProps {
  open: boolean;
  onClose: () => void;
  company: CompanyEnhanced;
  documentType: MarkenDNADocumentType;
  onSave: (content: string) => Promise<void>;
}

export function MarkenDNAEditorModal({
  open,
  onClose,
  company,
  documentType,
  onSave,
}: MarkenDNAEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const documentMetadata = MARKEN_DNA_DOCUMENTS[documentType];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(documentContent);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="5xl">
      {/* Title */}
      <DialogTitle>
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary" />
          <span>{documentMetadata.title}</span>
          <span className="text-zinc-500">für {company.name}</span>
        </div>
      </DialogTitle>

      {/* Split-View Body */}
      <DialogBody className="p-0 h-[600px] overflow-hidden">
        <div className="flex h-full divide-x divide-zinc-200">
          {/* Left: Chat Interface */}
          <div className="w-1/2 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-zinc-700" />
                <span className="text-sm font-medium text-zinc-900">KI-Assistent</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                  <p className="text-sm text-zinc-500 mb-2">
                    KI-Chat wird in Phase 3 implementiert
                  </p>
                  <p className="text-xs text-zinc-400">
                    Hier können Sie später mit dem KI-Assistenten das {documentMetadata.title} Dokument
                    erarbeiten.
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-zinc-200">
              <input
                type="text"
                placeholder="Nachricht eingeben..."
                disabled
                className="block w-full rounded-lg border border-zinc-300 bg-zinc-50
                           px-3 py-2 text-sm placeholder:text-zinc-300
                           cursor-not-allowed
                           h-10"
              />
            </div>
          </div>

          {/* Right: Document Preview */}
          <div className="w-1/2 flex flex-col">
            {/* Document Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-900">Dokument</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button plain className="h-8 px-3">
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              </div>
            </div>

            {/* Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {documentContent ? (
                <div className="prose prose-sm max-w-none">
                  {/* TODO: TipTap Editor Preview in Phase 3 */}
                  <div className="text-sm text-zinc-700 whitespace-pre-wrap">
                    {documentContent}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <DocumentTextIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <p className="text-sm text-zinc-500 mb-2">
                      Noch kein Inhalt vorhanden
                    </p>
                    <p className="text-xs text-zinc-400">
                      Nutzen Sie den KI-Chat, um das Dokument zu erstellen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogBody>

      {/* Actions */}
      <DialogActions>
        <Button color="secondary" onClick={onClose} disabled={isSaving}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Speichert...' : 'Speichern & Schließen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
