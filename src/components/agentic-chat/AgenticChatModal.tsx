'use client';

// src/components/agentic-chat/AgenticChatModal.tsx
// Modal für das Agentic Chat System mit Split-View

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Markdown from 'react-markdown';
import { useAgenticChat } from '@/hooks/agentic-chat';
import { AgenticChatInterface } from './AgenticChatInterface';
import type { SpecialistType, ChatMessage } from '@/lib/ai/agentic/types';

// ============================================================================
// TYPES
// ============================================================================

export interface AgenticChatModalProps {
  /** Modal offen */
  open: boolean;
  /** Schließen-Handler */
  onClose: () => void;
  /** Firmen-ID */
  companyId: string;
  /** Firmenname */
  companyName: string;
  /** Initialer Agent (Default: orchestrator) */
  initialAgent?: SpecialistType;
  /** Optionaler Document-Type für direkte Spezialisten */
  documentType?: string;
  /** Modal-Titel */
  title?: string;
  /** Bestehendes Dokument (für Fortsetzung) */
  existingDocument?: string;
  /** Bestehende Chat-History */
  existingChatHistory?: ChatMessage[];
  /** Speichern-Handler */
  onSave?: (content: string, status: 'draft' | 'completed') => Promise<void>;
  /** Callback bei Dokument-Abschluss */
  onDocumentComplete?: (document: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AgenticChatModal({
  open,
  onClose,
  companyId,
  companyName,
  initialAgent = 'orchestrator',
  documentType,
  title,
  existingDocument,
  existingChatHistory,
  onSave,
  onDocumentComplete,
}: AgenticChatModalProps) {
  const t = useTranslations('agenticChat');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState('');

  // Agentic Chat Hook
  const chat = useAgenticChat({
    initialSpecialist: initialAgent,
    companyId,
    companyName,
    documentType,
    existingChatHistory,
    onDocumentComplete: (doc) => {
      setEditedDocument(doc);
      onDocumentComplete?.(doc);
    },
    onAgentChange: (agent) => {
      // Optional: Agent-Wechsel tracken
    },
  });

  // Sync document content
  useEffect(() => {
    if (chat.document) {
      setEditedDocument(chat.document);
    } else if (existingDocument) {
      setEditedDocument(existingDocument);
    }
  }, [chat.document, existingDocument]);

  // Reset beim Schließen
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedDocument('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!onSave) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedDocument, chat.documentStatus);
      onClose();
    } catch (error) {
      // Fehler wird im Hook behandelt
    } finally {
      setIsSaving(false);
    }
  };

  // Modal-Titel bestimmen
  const modalTitle = title || t('modal.title');

  return (
    <Dialog open={open} onClose={onClose} size="5xl">
      {/* Title */}
      <DialogTitle>
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <span>{modalTitle}</span>
          <span className="text-zinc-500">{t('modal.for')} {companyName}</span>
        </div>
      </DialogTitle>

      {/* Split-View Body */}
      <DialogBody className="p-0 h-[600px] overflow-hidden">
        <div className="flex h-full divide-x divide-zinc-200">
          {/* Left: Chat Interface */}
          <div className="w-1/2 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-900">
                    {t('modal.aiAssistant')}
                  </span>
                </div>
                {/* Agent Indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {t('modal.currentAgent')}:
                  </span>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {getAgentLabel(chat.currentAgent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-hidden">
              <AgenticChatInterface chat={chat} />
            </div>
          </div>

          {/* Right: Document Preview */}
          <div className="w-1/2 flex flex-col">
            {/* Document Header */}
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-900">
                    {t('modal.document')}
                  </span>
                  {/* Status Badge */}
                  {editedDocument && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      chat.documentStatus === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {chat.documentStatus === 'completed' ? t('status.completed') : t('status.draft')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    plain
                    className="h-8 px-3"
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={!editedDocument}
                  >
                    {isEditing ? (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {t('actions.preview')}
                      </>
                    ) : (
                      <>
                        <PencilIcon className="h-4 w-4 mr-1" />
                        {t('actions.edit')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Document Preview/Edit Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {isEditing ? (
                <textarea
                  className="w-full h-full min-h-[500px] p-3 text-sm font-mono border border-zinc-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={editedDocument}
                  onChange={(e) => setEditedDocument(e.target.value)}
                  placeholder={t('modal.editPlaceholder')}
                />
              ) : editedDocument ? (
                <div className="prose prose-sm max-w-none prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-strong:text-zinc-900 prose-li:text-zinc-700">
                  <Markdown>{editedDocument}</Markdown>
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
        {onSave && (
          <Button onClick={handleSave} disabled={isSaving || !editedDocument}>
            {isSaving ? t('actions.saving') : t('actions.save')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getAgentLabel(agent: SpecialistType): string {
  const labels: Record<SpecialistType, string> = {
    orchestrator: 'Orchestrator',
    briefing_specialist: 'Briefing',
    swot_specialist: 'SWOT',
    audience_specialist: 'Zielgruppen',
    positioning_specialist: 'Positionierung',
    goals_specialist: 'Ziele',
    messages_specialist: 'Botschaften',
    project_wizard: 'Projekt-Wizard',
  };
  return labels[agent] || agent;
}
