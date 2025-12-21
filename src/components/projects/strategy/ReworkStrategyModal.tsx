'use client';

import React from 'react';
import {
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';
import { Button } from '@/components/ui/button';

interface ReworkStrategyModalProps {
  isOpen: boolean;
  projectId: string;
  companyId: string;
  companyName: string;
  existingDocument: string;
  onClose: () => void;
  onSave: (document: string) => void;
}

export function ReworkStrategyModal({
  isOpen,
  projectId,
  companyId,
  companyName,
  existingDocument,
  onClose,
  onSave,
}: ReworkStrategyModalProps) {
  // Genkit Chat Hook mit bestehendem Dokument als Kontext
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
  } = useGenkitChat({
    flowName: 'projectStrategyChat',
    projectId,
    companyId,
    companyName,
    existingDocument, // Text-Matrix wird als Kontext übergeben
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSave = () => {
    if (document) {
      onSave(document);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* Modal Container */}
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            Text-Matrix mit KI umarbeiten
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-5 w-5 text-zinc-700" />
          </button>
        </div>

        {/* Chat-Nachrichten (Scrollbar) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 py-8">
              <p className="text-sm">
                Beschreiben Sie, wie die Text-Matrix umgearbeitet werden soll.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                // User Message
                <div className="max-w-[85%] bg-primary text-white rounded-lg px-4 py-2">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                // AI Message
                <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
                    <span className="font-medium text-sm text-zinc-900">CeleroPress</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="prose prose-sm max-w-none prose-zinc">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
                  <span className="font-medium text-sm text-zinc-900">CeleroPress</span>
                  <span className="text-xs text-zinc-500 animate-pulse">Schreibt...</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-zinc-500">Generiert Antwort...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Eingabe */}
        <div className="px-6 py-4 border-t border-zinc-200">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Beschreiben Sie die gewünschten Änderungen..."
              disabled={isLoading}
              className="flex-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm
                       placeholder:text-zinc-300
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                       resize-none h-20"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary-hover text-white h-20 px-4 rounded-lg font-medium transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Footer mit Buttons */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-gray-50 flex items-center justify-end gap-3">
          <Button
            color="secondary"
            onClick={onClose}
            className="h-10 px-6"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!document}
            className="h-10 px-6"
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
