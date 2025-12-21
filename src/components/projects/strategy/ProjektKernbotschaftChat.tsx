'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import {
  ChatBubbleLeftIcon,
  BeakerIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';
import { Button } from '@/components/ui/button';

// TODO: Types aus types/project-strategy.ts importieren wenn vorhanden
interface MarkenSynthese {
  id: string;
  content: string;
  plainText?: string;
}

interface ProjektKernbotschaft {
  id: string;
  content: string;
  chatHistory?: ChatMessage[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProjektKernbotschaftChatProps {
  projectId: string;
  companyId: string;
  companyName: string;
  markenSynthese?: MarkenSynthese | null;
  existingKernbotschaft?: ProjektKernbotschaft | null;
  onSave?: (document: string, chatHistory: ChatMessage[]) => void;
}

export function ProjektKernbotschaftChat({
  projectId,
  companyId,
  companyName,
  markenSynthese,
  existingKernbotschaft,
  onSave,
}: ProjektKernbotschaftChatProps) {
  const locale = useLocale();

  // Genkit Chat Hook
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
    progress,
    suggestedPrompts,
  } = useGenkitChat({
    flowName: 'projectStrategyChat',
    projectId,
    companyId,
    companyName,
    dnaSynthese: markenSynthese?.plainText,
    existingChatHistory: existingKernbotschaft?.chatHistory,
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

  const handleSaveKernbotschaft = () => {
    if (document && onSave) {
      onSave(document, messages);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200">
        <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5 text-zinc-700" />
          Kernbotschaft erarbeiten
        </h3>
      </div>

      {/* DNA Synthese Hinweis */}
      {markenSynthese && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center gap-2 text-sm text-purple-700">
          <BeakerIcon className="h-4 w-4" />
          DNA Synthese wird als Kontext verwendet
        </div>
      )}

      {/* Chat-Nachrichten */}
      <div className="p-4 h-96 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-sm mb-4">
              Starte ein Gespräch, um die Kernbotschaft zu erarbeiten.
            </p>
            {/* Vorgeschlagene Prompts */}
            {suggestedPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      sendMessage(prompt);
                    }}
                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm
                             hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
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

      {/* Vorgeschlagene Prompts (nach Messages) */}
      {suggestedPrompts.length > 0 && messages.length > 0 && !isLoading && (
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-500">Vorschläge:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(prompt);
                  sendMessage(prompt);
                }}
                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm
                         hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fortschrittsanzeige */}
      {progress > 0 && progress < 100 && (
        <div className="px-4 py-2 border-t border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-600 font-medium">{progress}%</span>
          </div>
        </div>
      )}

      {/* Eingabe */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beschreiben Sie den Anlass, Ihre Ziele..."
            disabled={isLoading}
            className="flex-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm
                     placeholder:text-zinc-300
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                     resize-none h-20"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary-hover text-white h-20 px-4 rounded-lg font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {/* Kernbotschaft speichern Button */}
      {document && (
        <div className="p-4 border-t border-zinc-200 bg-gray-50">
          <Button
            onClick={handleSaveKernbotschaft}
            className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg font-medium transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Kernbotschaft speichern
          </Button>
        </div>
      )}
    </div>
  );
}
