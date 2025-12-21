'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './AIChatInterface';
import { AIMessage } from './AIMessage';
import { UserMessage } from './UserMessage';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

/**
 * Scrollbarer Container für Chat-Nachrichten
 *
 * Features:
 * - Auto-Scroll zu neuesten Nachrichten
 * - Unterschiedliche Rendering für User/AI Messages
 * - Loading-State für AI-Antwort
 */
export function MessageList({
  messages,
  isLoading,
  onRegenerate,
  onCopy,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zu neuer Nachricht
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((message, index) => (
        <div key={index}>
          {message.role === 'user' ? (
            <UserMessage content={message.content} />
          ) : (
            <AIMessage
              content={message.content}
              onRegenerate={
                index === messages.length - 1 ? onRegenerate : undefined
              }
              onCopy={index === messages.length - 1 ? onCopy : undefined}
            />
          )}
        </div>
      ))}

      {/* Loading Indicator */}
      {isLoading && (
        <AIMessage
          content="..."
          isLoading={true}
        />
      )}

      {/* Scroll-Anker */}
      <div ref={messagesEndRef} />
    </div>
  );
}
