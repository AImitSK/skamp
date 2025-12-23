'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { ActionBubbles } from './components/ActionBubbles';
import { DocumentSidebar } from './components/DocumentSidebar';

export type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';

interface MarkenDNAChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
}

/**
 * Fullscreen Chat-Modal im Claude.ai-Stil für die Marken-DNA Erstellung
 *
 * Layout:
 * - Fullscreen Modal (fixed inset-0)
 * - Header: Titel, Company, Close-Button, Sidebar-Toggle (disabled in Phase 1)
 * - Chat-Area: Scrollbarer Bereich für Messages
 * - Input-Area: Große Input-Box + 3 Action-Bubbles
 *
 * Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 */
export function MarkenDNAChatModal({
  isOpen,
  onClose,
  documentType,
  companyId,
  companyName,
}: MarkenDNAChatModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Temporäres Mock-Dokument für Phase 3 (später aus Chat-State)
  const [documentContent, setDocumentContent] = useState(
    '# Briefing-Check\n\n## Phase 1: Unternehmensprofil\n\n**Branche:** Noch nicht ausgefüllt\n\n**Geschäftsmodell:** Noch nicht ausgefüllt'
  );

  // Dokumenttyp-Titel Mapping
  const documentTitles: Record<MarkenDNADocumentType, string> = {
    briefing: 'Briefing-Check',
    swot: 'SWOT-Analyse',
    audience: 'Zielgruppen-Radar',
    positioning: 'Positionierungs-Designer',
    goals: 'Ziele-Setzer',
    messages: 'Botschaften-Baukasten',
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // TODO: In Phase 2 - Message an KI senden
    console.log('Send message:', inputValue);
    setInputValue('');
  };

  const handleShowDocument = () => {
    // Toggle Sidebar
    setSidebarOpen(!sidebarOpen);
  };

  const handleRestart = () => {
    // Zeige Bestätigungs-Dialog
    setShowRestartConfirm(true);
  };

  const confirmRestart = () => {
    // Chat zurücksetzen (später: Messages leeren, State zurücksetzen)
    setInputValue('');
    setDocumentContent(
      '# Briefing-Check\n\n## Phase 1: Unternehmensprofil\n\n**Branche:** Noch nicht ausgefüllt\n\n**Geschäftsmodell:** Noch nicht ausgefüllt'
    );
    setShowRestartConfirm(false);
  };

  const handleSave = () => {
    // TODO: In Phase 3 - Dokument speichern + Modal schließen
    console.log('Save and close');
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        {/* Fullscreen Modal */}
        <div className="fixed inset-0 overflow-hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="fixed inset-0 bg-white flex flex-row">
              {/* Chat-Bereich */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <ChatHeader
                  title={documentTitles[documentType]}
                  companyName={companyName}
                  onClose={onClose}
                  onToggleSidebar={handleShowDocument}
                  sidebarOpen={sidebarOpen}
                />

                {/* Chat Messages Area */}
                <ChatMessages messages={[]} isLoading={isLoading} />

                {/* Input Area */}
                <div className="border-t border-zinc-200 bg-white">
                  <div className="max-w-3xl mx-auto px-6 py-4">
                    <form onSubmit={handleSendMessage}>
                      <ChatInput
                        value={inputValue}
                        onChange={setInputValue}
                        isLoading={isLoading}
                        placeholder="Nachricht eingeben..."
                      />
                    </form>

                    {/* Action Bubbles */}
                    <ActionBubbles
                      onShowDocument={handleShowDocument}
                      onRestart={handleRestart}
                      onSave={handleSave}
                    />
                  </div>
                </div>
              </div>

              {/* Dokument-Sidebar */}
              <DocumentSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title={documentTitles[documentType]}
                content={documentContent}
              />
            </Dialog.Panel>
          </Transition.Child>
        </div>

        {/* Bestätigungs-Dialog: Neu starten */}
        <Transition appear show={showRestartConfirm} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowRestartConfirm(false)}
          >
            {/* Backdrop */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            {/* Dialog */}
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-zinc-900"
                    >
                      Chat neu starten?
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600">
                        Möchtest du wirklich von vorne beginnen? Der aktuelle
                        Chat-Verlauf geht verloren, wenn du nicht vorher
                        gespeichert hast.
                      </p>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center
                                   border border-zinc-300 bg-white text-zinc-700
                                   hover:bg-zinc-50 font-medium
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                   h-10 px-6 rounded-lg transition-colors"
                        onClick={() => setShowRestartConfirm(false)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center
                                   bg-primary hover:bg-primary-hover text-white
                                   font-medium
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                   h-10 px-6 rounded-lg transition-colors"
                        onClick={confirmRestart}
                      >
                        Neu starten
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </Dialog>
    </Transition>
  );
}
