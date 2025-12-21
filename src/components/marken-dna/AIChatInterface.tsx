'use client';

import { useEffect, useRef } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useGenkitChat } from '@/hooks/marken-dna/useGenkitChat';
import { MarkenDNADocumentType } from '@/types/marken-dna';

interface AIChatInterfaceProps {
  documentType: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
  existingDocument?: string;
  existingChatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onDocumentUpdate?: (document: string) => void;
}

export function AIChatInterface({
  documentType,
  companyId,
  companyName,
  existingDocument,
  existingChatHistory,
  onDocumentUpdate,
}: AIChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    suggestedPrompts,
    regenerate,
    copyLastResponse,
    sendSuggestion,
  } = useGenkitChat({
    flowName: 'markenDNAChat',
    documentType,
    companyId,
    companyName,
    existingDocument,
    existingChatHistory,
    onDocumentUpdate,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const cleanContent = (content: string) => {
    return content
      .replace(/\[DOCUMENT\][\s\S]*?\[\/DOCUMENT\]/g, '')
      .replace(/\[PROGRESS:\d+\]/g, '')
      .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
      .trim();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <p className="text-sm text-zinc-500 mb-2">
                Starte einen Chat, um das Dokument zu erstellen.
              </p>
              <p className="text-xs text-zinc-400">
                Die KI führt dich durch den Prozess und stellt gezielte Fragen.
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'user' ? (
              /* User Message */
              <div className="max-w-[85%] bg-primary text-white rounded-lg px-4 py-2">
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            ) : (
              /* AI Message */
              <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
                {/* AI Message Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">CeleroPress</span>
                  </div>
                  {!isLoading && index === messages.length - 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={copyLastResponse}
                        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                        title="Kopieren"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4 text-zinc-700" />
                      </button>
                      <button
                        onClick={regenerate}
                        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                        title="Neu generieren"
                      >
                        <ArrowPathIcon className="h-4 w-4 text-zinc-700" />
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Message Content */}
                <div className="px-4 py-3">
                  <div className="prose prose-sm max-w-none prose-zinc">
                    <div className="text-sm text-zinc-700 whitespace-pre-wrap">
                      {cleanContent(message.content)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">
                    <span className="text-sm text-zinc-500">Schreibt...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {suggestedPrompts.length > 0 && !isLoading && (
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => sendSuggestion(prompt)}
                className="px-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-full
                           hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nachricht eingeben..."
            disabled={isLoading}
            className="flex-1 block rounded-lg border border-zinc-300 bg-white
                       px-3 py-2 text-sm placeholder:text-zinc-400
                       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                       disabled:bg-zinc-50 disabled:cursor-not-allowed
                       h-10"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-10 px-4 rounded-lg bg-primary text-white
                       hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
