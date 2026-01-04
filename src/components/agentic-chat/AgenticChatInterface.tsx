'use client';

// src/components/agentic-chat/AgenticChatInterface.tsx
// Chat-Interface mit Tool-Call Rendering für das Agentic System

import { useEffect, useRef, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import Markdown from 'react-markdown';
import type { UseAgenticChatReturn } from '@/hooks/agentic-chat';
import {
  RoadmapBox,
  TodoList,
  SuggestionBubbles,
  ConfirmBox,
} from './toolbox';

// ============================================================================
// TYPES
// ============================================================================

interface AgenticChatInterfaceProps {
  /** Chat-Hook Return */
  chat: UseAgenticChatReturn;
  /** Optionaler Placeholder */
  placeholder?: string;
  /** Zeigt Agent-Wechsel an */
  showAgentIndicator?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AgenticChatInterface({
  chat,
  placeholder,
  showAgentIndicator = true,
}: AgenticChatInterfaceProps) {
  const t = useTranslations('agenticChat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    currentAgent,
    toolbox,
    sendSuggestion,
    confirmAction,
    adjustAction,
    copyLastResponse,
    regenerate,
  } = chat;

  // Auto-scroll bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolbox]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
    }
  };

  // Agent-Name für Anzeige
  const getAgentDisplayName = () => {
    const agentNames: Record<string, string> = {
      orchestrator: 'CeleroPress',
      briefing_specialist: 'Briefing-Spezialist',
      swot_specialist: 'SWOT-Spezialist',
      audience_specialist: 'Zielgruppen-Spezialist',
      positioning_specialist: 'Positionierungs-Spezialist',
      goals_specialist: 'Ziel-Spezialist',
      messages_specialist: 'Botschaften-Spezialist',
      project_wizard: 'Projekt-Assistent',
    };
    return agentNames[currentAgent] || 'CeleroPress';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <p className="text-sm text-zinc-500 mb-2">
                {t('emptyState.title')}
              </p>
              <p className="text-xs text-zinc-400">
                {t('emptyState.description')}
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
                    <span className="font-medium text-zinc-900">
                      {getAgentDisplayName()}
                    </span>
                    {showAgentIndicator && currentAgent !== 'orchestrator' && (
                      <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        Spezialist
                      </span>
                    )}
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
                  <div className="prose prose-sm max-w-none prose-zinc prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-strong:text-zinc-900 prose-li:text-zinc-700">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">
                    <span className="text-sm text-zinc-500">{t('loading')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toolbox Elements */}
      <div className="px-4 space-y-3">
        {/* Roadmap */}
        {toolbox.roadmap && (
          <RoadmapBox
            phases={toolbox.roadmap.phases}
            currentPhaseIndex={toolbox.roadmap.currentPhaseIndex}
            completedPhases={toolbox.roadmap.completedPhases}
          />
        )}

        {/* ToDo List */}
        {toolbox.todos.length > 0 && (
          <TodoList items={toolbox.todos} />
        )}

        {/* Confirm Box */}
        {toolbox.confirmBox?.isVisible && (
          <ConfirmBox
            title={toolbox.confirmBox.title}
            summary={toolbox.confirmBox.summary}
            onConfirm={confirmAction}
            onAdjust={adjustAction}
            isLoading={isLoading}
          />
        )}

        {/* Suggestion Bubbles */}
        {toolbox.suggestions.length > 0 && !isLoading && (
          <SuggestionBubbles
            prompts={toolbox.suggestions}
            onSelect={sendSuggestion}
            disabled={isLoading}
          />
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder || t('inputPlaceholder')}
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
