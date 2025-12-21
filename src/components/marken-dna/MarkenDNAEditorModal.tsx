'use client';

import { useTranslations } from 'next-intl';
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
import { AIChatInterface } from './AIChatInterface';

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
  const t = useTranslations('markenDNA');
  const [isSaving, setIsSaving] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const documentMetadata = MARKEN_DNA_DOCUMENTS[documentType];

  const handleDocumentUpdate = (newDocument: string) => {
    setDocumentContent(newDocument);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(documentContent);
      onClose();
    } catch (error) {
      // Error handling is done in useGenkitChat via toastService
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
          <span className="text-zinc-500">{t('modal.for')} {company.name}</span>
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
                <span className="text-sm font-medium text-zinc-900">{t('modal.aiAssistant')}</span>
              </div>
            </div>

            {/* AI Chat Integration */}
            <AIChatInterface
              documentType={documentType}
              companyId={company.id || ''}
              companyName={company.name}
              onDocumentUpdate={handleDocumentUpdate}
            />
          </div>

          {/* Right: Document Preview */}
          <div className="w-1/2 flex flex-col">
            {/* Document Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-900">{t('modal.document')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button plain className="h-8 px-3">
                    <PencilIcon className="h-4 w-4 mr-1" />
                    {t('actions.edit')}
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
                      {t('modal.noContent')}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {t('modal.noContentDescription')}
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
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('actions.saving') : t('actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
