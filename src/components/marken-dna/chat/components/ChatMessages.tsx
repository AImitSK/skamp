'use client';

import { useEffect, useRef } from 'react';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { LoadingIndicator } from './LoadingIndicator';

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
 * Features:
 * - Scrollbarer Bereich für Messages
 * - Auto-Scroll zu neuen Nachrichten
 * - AIMessage und UserMessage Komponenten
 * - LoadingIndicator während KI generiert
 * - Copy & Regenerate Actions (in AIMessage)
 */
export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zu neuen Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // TODO: Toast-Notification "Kopiert!"
  };

  const handleRegenerate = (messageId: string) => {
    // TODO: Message neu generieren
    console.log('Regenerate message:', messageId);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-500">
              Willkommen! Beginne das Gespräch, um das Dokument zu erstellen.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => {
          if (message.role === 'user') {
            return <UserMessage key={message.id} content={message.content} />;
          } else {
            return (
              <AIMessage
                key={message.id}
                content={message.content}
                onCopy={() => handleCopy(message.content)}
                onRegenerate={() => handleRegenerate(message.id)}
              />
            );
          }
        })}

        {/* Loading Indicator */}
        {isLoading && <LoadingIndicator />}

        {/* Auto-Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
