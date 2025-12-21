'use client';

import { useTranslations } from 'next-intl';
import { useState, FormEvent } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ProgressIndicator } from './ProgressIndicator';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestedPrompts?: string[];
  progress?: number;
  onRegenerate?: () => void;
  onCopy?: () => void;
  placeholder?: string;
}

/**
 * Haupt-Chat-Container für KI-gestützte Marken-DNA Erstellung
 *
 * Verwendet von MarkenDNAEditorModal für:
 * - Marken-DNA Dokumenten-Chats (6 Typen)
 * - Projekt-Strategie Chat
 * - Kernbotschaft Chat
 */
export function AIChatInterface({
  messages,
  input,
  onInputChange,
  onSendMessage,
  isLoading,
  suggestedPrompts = [],
  progress = 0,
  onRegenerate,
  onCopy,
  placeholder,
}: AIChatInterfaceProps) {
  const t = useTranslations('markenDNA.chat');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onInputChange(suggestion);
    onSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onRegenerate={onRegenerate}
        onCopy={onCopy}
      />

      {/* Suggested Prompts */}
      {suggestedPrompts.length > 0 && !isLoading && (
        <SuggestedPrompts
          prompts={suggestedPrompts}
          onSelect={handleSuggestionClick}
        />
      )}

      {/* Progress Bar */}
      {progress > 0 && <ProgressIndicator progress={progress} />}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-zinc-200">
        <ChatInput
          value={input}
          onChange={onInputChange}
          isLoading={isLoading}
          placeholder={placeholder || t('inputPlaceholder')}
        />
      </form>
    </div>
  );
}
