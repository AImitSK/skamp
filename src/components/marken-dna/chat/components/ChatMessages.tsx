'use client';

import { useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

/**
 * Scroll-Container für Chat-Messages
 *
 * Layout (gemäß 08-CHAT-UI-KONZEPT.md):
 * - flex-1 overflow-y-auto (nimmt verfügbaren Platz)
 * - max-w-3xl zentriert (wie Claude.ai)
 * - Auto-Scroll zu neuen Messages
 *
 * Features (Phase 1):
 * - Scrollbarer Bereich für Messages
 * - Auto-Scroll zu neuen Nachrichten
 * - Loading-Indicator (später)
 *
 * In Phase 2:
 * - AIMessage und UserMessage Komponenten
 * - Typing-Animation
 * - Message-Actions (Copy, Regenerate)
 */
export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zu neuen Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Messages werden in Phase 2 gerendert */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-500">
              Willkommen! Beginne das Gespräch, um das Dokument zu erstellen.
            </p>
          </div>
        )}

        {/* Messages Container (Phase 2) */}
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="text-sm text-zinc-700">
              <strong>{message.role}:</strong> {message.content}
            </div>
          ))}
        </div>

        {/* Loading Indicator (Phase 2) */}
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
            <div className="flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>
                .
              </span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>
                .
              </span>
            </div>
            <span>KI denkt nach...</span>
          </div>
        )}

        {/* Auto-Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
