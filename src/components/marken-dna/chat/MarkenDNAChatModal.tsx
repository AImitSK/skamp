'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { ActionBubbles } from './components/ActionBubbles';

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
    // TODO: In Phase 3 - Sidebar öffnen
    console.log('Show document sidebar');
    setSidebarOpen(true);
  };

  const handleRestart = () => {
    // TODO: In Phase 3 - Bestätigung + Chat zurücksetzen
    console.log('Restart chat');
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
            <Dialog.Panel className="fixed inset-0 bg-white flex flex-col">
              {/* Header */}
              <ChatHeader
                title={documentTitles[documentType]}
                companyName={companyName}
                onClose={onClose}
                onToggleSidebar={handleShowDocument}
                sidebarOpen={sidebarOpen}
                sidebarDisabled={true} // Phase 1: Sidebar-Toggle disabled
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
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
