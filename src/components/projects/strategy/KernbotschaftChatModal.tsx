'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { ChatHeader } from '@/components/marken-dna/chat/components/ChatHeader';
import { ChatMessages, ChatMessage } from '@/components/marken-dna/chat/components/ChatMessages';
import { ChatInput } from '@/components/marken-dna/chat/components/ChatInput';
import { ActionBubbles } from '@/components/marken-dna/chat/components/ActionBubbles';
import { DocumentSidebar } from '@/components/marken-dna/chat/components/DocumentSidebar';
import { useAgenticChat } from '@/hooks/agentic-chat/useAgenticChat';
import { toastService } from '@/lib/utils/toast';

interface KernbotschaftChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  companyId: string;
  companyName: string;
  dnaSynthese?: string;
  existingKernbotschaft?: string;
  existingChatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onSave: (content: string, status: 'draft' | 'completed', chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<void>;
}

/**
 * Fullscreen Chat-Modal für die Projekt-Kernbotschaft Erstellung
 *
 * Verwendet das gleiche Design wie MarkenDNAChatModal
 *
 * Features:
 * - Fullscreen Modal im Claude.ai-Stil
 * - DNA Synthese als Kontext für die KI
 * - Chat-Messages mit Fortschrittsanzeige
 * - Dokument-Sidebar zum Prüfen und Speichern
 */
export function KernbotschaftChatModal({
  isOpen,
  onClose,
  projectId,
  companyId,
  companyName,
  dnaSynthese,
  existingKernbotschaft,
  existingChatHistory,
  onSave,
}: KernbotschaftChatModalProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // useAgenticChat Hook für Project Strategy Chat (Agentic Architecture)
  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    document: currentDocument,
    documentStatus,
  } = useAgenticChat({
    initialSpecialist: 'project_wizard',
    companyId,
    companyName,
    projectId,
    documentType: 'kernbotschaft',
    existingChatHistory,
    onDocumentComplete: (doc) => {
      // Kernbotschaft wurde finalisiert
      toastService.success('Kernbotschaft fertiggestellt!');
    },
  });

  // Automatisch Sidebar öffnen wenn Status 'completed' wird
  useEffect(() => {
    if (documentStatus === 'completed' && currentDocument && !sidebarOpen) {
      setSidebarOpen(true);
      toastService.success('Kernbotschaft fertiggestellt! Bitte prüfen und speichern.');
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
    window.location.reload();
    setShowRestartConfirm(false);
  };

  const handleSave = async () => {
    if (!currentDocument) {
      toastService.error('Kein Dokument vorhanden zum Speichern');
      return;
    }

    setIsSaving(true);
    try {
      // Chat-Historie aus messages extrahieren (nur role und content)
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      await onSave(currentDocument, documentStatus, chatHistory);
      toastService.success('Kernbotschaft gespeichert');
      onClose();
    } catch (error) {
      toastService.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  // Toolbox-Callbacks für Phase-Bestätigung
  const handleConfirmResult = (phase: number, content: string) => {
    // User bestätigt Phase-Ergebnis → Sende Bestätigung an Chat
    sendMessage(`Ja, Phase ${phase} ist korrekt. Weiter zur nächsten Phase.`);
    toastService.success(`Phase ${phase} bestätigt`);
  };

  const handleAdjustResult = (phase: number) => {
    // User will Ergebnis anpassen → Frage was geändert werden soll
    sendMessage(`Ich möchte Phase ${phase} anpassen.`);
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
                  title="Projekt-Kernbotschaft"
                  companyName={companyName}
                  onClose={handleCloseWithWarning}
                  onToggleSidebar={handleShowDocument}
                  sidebarOpen={sidebarOpen}
                />

                {/* DNA Synthese Kontext-Hinweis */}
                {dnaSynthese && (
                  <div className="px-6 py-2 bg-purple-50 border-b border-purple-200 flex items-center gap-2 text-sm text-purple-700">
                    <span className="text-purple-500">🧪</span>
                    DNA Synthese wird als Kontext verwendet
                  </div>
                )}

                {/* Chat Messages Area */}
                <ChatMessages
                  messages={chatMessages}
                  isLoading={isLoading}
                  onConfirmResult={handleConfirmResult}
                  onAdjustResult={handleAdjustResult}
                />

                {/* Input Area */}
                <div className="bg-zinc-50">
                  <div className="max-w-3xl mx-auto px-6 py-4">
                    <form onSubmit={handleSendMessage}>
                      <ChatInput
                        value={input}
                        onChange={setInput}
                        isLoading={isLoading}
                        placeholder="Beschreibe den Anlass, das Ziel oder die Kernbotschaft..."
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
                title="Projekt-Kernbotschaft"
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
                    <Dialog.Title as="h3" className="text-lg font-semibold text-zinc-900">
                      Chat neu starten?
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600">
                        Möchtest du wirklich von vorne beginnen? Der aktuelle
                        Chat-Verlauf geht verloren, wenn du nicht vorher gespeichert hast.
                      </p>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium h-10 px-6 rounded-lg transition-colors"
                        onClick={() => setShowRestartConfirm(false)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-medium h-10 px-6 rounded-lg transition-colors"
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
                    <Dialog.Title as="h3" className="text-lg font-semibold text-zinc-900">
                      Änderungen verwerfen?
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600">
                        Möchtest du wirklich schließen? Nicht gespeicherte Änderungen gehen verloren.
                      </p>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium h-10 px-6 rounded-lg transition-colors"
                        onClick={() => setShowCloseConfirm(false)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-medium h-10 px-6 rounded-lg transition-colors"
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
