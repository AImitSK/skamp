'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages, ChatMessage } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { ActionBubbles } from './components/ActionBubbles';
import { DocumentSidebar } from './components/DocumentSidebar';
import { useAgenticChat } from '@/hooks/agentic-chat/useAgenticChat';
import { getSpecialistForDocument } from '@/lib/ai/agentic/specialist-mapping';
import {
  RoadmapBox,
  TodoList,
  SuggestionBubbles,
  ConfirmBox,
} from '@/components/agentic-chat/toolbox';
import type { MarkenDNADocumentType as AgenticDocType } from '@/lib/ai/agentic/specialist-mapping';
import { MarkenDNADocumentType } from '@/types/marken-dna';
import { toastService } from '@/lib/utils/toast';

interface MarkenDNAChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
  existingDocument?: string;
  existingChatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onSave: (content: string, status: 'draft' | 'completed') => Promise<void>;
}

/**
 * Fullscreen Chat-Modal im Claude.ai-Stil für die Marken-DNA Erstellung
 *
 * Layout:
 * - Fullscreen Modal (fixed inset-0)
 * - Header: Titel, Company, Close-Button, Sidebar-Toggle
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
  existingDocument,
  existingChatHistory,
  onSave,
}: MarkenDNAChatModalProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // useAgenticChat Hook Integration (Agentic Architecture)
  const specialistType = getSpecialistForDocument(documentType as AgenticDocType);

  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    document: currentDocument,
    documentStatus,
    toolbox,
    sendSuggestion,
    confirmAction,
    adjustAction,
  } = useAgenticChat({
    initialSpecialist: specialistType,
    companyId,
    companyName,
    documentType,
    existingChatHistory,
    onDocumentComplete: (doc) => {
      // Dokument wurde finalisiert
      toastService.success('Dokument fertiggestellt!');
    },
  });

  // Dokumenttyp-Titel Mapping
  const documentTitles: Record<MarkenDNADocumentType, string> = {
    briefing: 'Briefing-Check',
    swot: 'SWOT-Analyse',
    audience: 'Zielgruppen-Radar',
    positioning: 'Positionierungs-Designer',
    goals: 'Ziele-Setzer',
    messages: 'Botschaften-Baukasten',
  };

  // Automatisch Sidebar öffnen wenn Status 'completed' wird
  useEffect(() => {
    if (documentStatus === 'completed' && currentDocument && !sidebarOpen) {
      setSidebarOpen(true);
      toastService.success('Dokument fertiggestellt! Bitte prüfen und speichern.');
    }
  }, [documentStatus, currentDocument, sidebarOpen]);

  // Messages in ChatMessages-Format konvertieren
  const chatMessages: ChatMessage[] = messages.map((msg, idx) => ({
    id: `${msg.role}-${idx}`,
    role: msg.role,
    content: msg.content,
  }));

  // Keyboard-Shortcut: Escape = Modal schließen (mit Warnung wenn ungespeichert)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleCloseWithWarning();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, messages]);

  const handleCloseWithWarning = () => {
    if (messages.length > 0 && currentDocument) {
      // Es gibt ungespeicherte Änderungen - Dialog anzeigen
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleShowDocument = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleRestart = () => {
    setShowRestartConfirm(true);
  };

  const confirmRestart = () => {
    // Chat zurücksetzen
    window.location.reload(); // Einfachste Variante um State komplett zurückzusetzen
    setShowRestartConfirm(false);
  };

  const handleSave = async () => {
    if (!currentDocument) {
      toastService.error('Kein Dokument vorhanden zum Speichern');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(currentDocument, documentStatus);
      toastService.success('Dokument gespeichert');
      onClose();
    } catch (error) {
      toastService.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCloseWithWarning}>
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
            <Dialog.Panel className="fixed inset-0 bg-zinc-50 flex flex-row">
              {/* Chat-Bereich */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <ChatHeader
                  title={documentTitles[documentType]}
                  companyName={companyName}
                  onClose={handleCloseWithWarning}
                  onToggleSidebar={handleShowDocument}
                  sidebarOpen={sidebarOpen}
                />

                {/* Chat Messages Area */}
                <ChatMessages messages={chatMessages} isLoading={isLoading} />

                {/* Toolbox Components - Agentic UI */}
                <div className="max-w-3xl mx-auto px-6 space-y-3">
                  {/* Roadmap anzeigen */}
                  {toolbox.roadmap && (
                    <RoadmapBox
                      phases={toolbox.roadmap.phases}
                      currentPhaseIndex={toolbox.roadmap.currentPhaseIndex}
                      completedPhases={toolbox.roadmap.completedPhases}
                    />
                  )}

                  {/* Todo-Liste anzeigen */}
                  {toolbox.todos.length > 0 && (
                    <TodoList items={toolbox.todos} />
                  )}

                  {/* Suggestions anzeigen */}
                  {toolbox.suggestions.length > 0 && (
                    <SuggestionBubbles
                      prompts={toolbox.suggestions}
                      onSelect={sendSuggestion}
                    />
                  )}

                  {/* Confirm-Box anzeigen */}
                  {toolbox.confirmBox && toolbox.confirmBox.isVisible && (
                    <ConfirmBox
                      title={toolbox.confirmBox.title}
                      summaryItems={toolbox.confirmBox.summaryItems}
                      onConfirm={confirmAction}
                      onAdjust={adjustAction}
                    />
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-zinc-50">
                  <div className="max-w-3xl mx-auto px-6 py-4">
                    <form onSubmit={handleSendMessage}>
                      <ChatInput
                        value={input}
                        onChange={setInput}
                        isLoading={isLoading}
                        placeholder="Nachricht eingeben..."
                      />
                    </form>

                    {/* Action Bubbles */}
                    <ActionBubbles
                      onShowDocument={handleShowDocument}
                      onRestart={handleRestart}
                      onSave={handleSave}
                      isSaving={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Dokument-Sidebar */}
              <DocumentSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title={documentTitles[documentType]}
                content={currentDocument || ''}
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

        {/* Bestätigungs-Dialog: Schließen mit ungespeicherten Änderungen */}
        <Transition appear show={showCloseConfirm} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowCloseConfirm(false)}
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
                      Änderungen verwerfen?
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600">
                        Möchtest du wirklich schließen? Nicht gespeicherte
                        Änderungen gehen verloren.
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
                        onClick={() => setShowCloseConfirm(false)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center
                                   bg-red-600 hover:bg-red-700 text-white
                                   font-medium
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                                   h-10 px-6 rounded-lg transition-colors"
                        onClick={confirmClose}
                      >
                        Verwerfen
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
