'use client';

import { useEffect, useRef, useMemo } from 'react';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { CrawlerLoadingIndicator } from './CrawlerLoadingIndicator';
import type { ToolCall } from '@/lib/ai/agentic/types';

/**
 * Extrahiert die erste URL aus einem Text
 */
function extractUrlFromText(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onConfirmResult?: (phase: number, content: string) => void;
  onAdjustResult?: (phase: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
  onConfirmAction?: () => void;
  onAdjustAction?: () => void;
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
export function ChatMessages({
  messages,
  isLoading,
  onConfirmResult,
  onAdjustResult,
  onSuggestionSelect,
  onConfirmAction,
  onAdjustAction,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zu neuen Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prüfe ob die letzte User-Nachricht eine URL enthält (für Crawler-Anzeige)
  const lastUserMessageUrl = useMemo(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return null;
    const lastUserMessage = userMessages[userMessages.length - 1];
    return extractUrlFromText(lastUserMessage.content);
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="py-8">
            {/* Begrüßung */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-zinc-900">Willkommen!</h1>
              <p className="text-base text-zinc-500 mt-2">Beginne das Gespräch, um das Dokument zu erstellen.</p>
            </div>

            {/* Tipps-Box */}
            <div className="bg-white border border-zinc-200 rounded-lg p-8">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">Tipps für das Arbeiten mit dem Chat</h2>

              {/* Kommunikation steuern */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Kommunikation steuern</h3>
                <ul className="space-y-1.5 text-sm text-zinc-700">
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Mehr Details anfordern:</strong> Sagen Sie <em>&quot;Erkläre mir das genauer&quot;</em> wenn Sie eine ausführlichere Erläuterung benötigen</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Weniger auf einmal:</strong> Sagen Sie <em>&quot;Das ist mir zu viel auf einmal&quot;</em> und ich stelle nur noch eine Frage pro Nachricht</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Korrigieren:</strong> Sie können jederzeit sagen <em>&quot;Das stimmt so nicht&quot;</em> oder <em>&quot;Ich meinte etwas anderes&quot;</em></span>
                  </li>
                </ul>
              </div>

              {/* Inhalte bereitstellen */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Inhalte bereitstellen</h3>
                <ul className="space-y-1.5 text-sm text-zinc-700">
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Webseiten analysieren:</strong> Geben Sie eine URL an und der Chat liest und analysiert die Webseite für Sie</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Texte extrahieren:</strong> Fügen Sie längere Texte ein - der Chat extrahiert die relevanten Informationen daraus</span>
                  </li>
                </ul>
              </div>

              {/* Oberfläche nutzen */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Oberfläche nutzen</h3>
                <ul className="space-y-1.5 text-sm text-zinc-700">
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Schnellantworten:</strong> Klicken Sie auf die Vorschläge unter den Nachrichten für schnelle Antworten</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Fortschritt verfolgen:</strong> Die Checkliste zeigt Ihnen, welche Informationen noch benötigt werden</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span><strong>Dokument-Vorschau:</strong> In der Seitenleiste sehen Sie das entstehende Dokument in Echtzeit</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          if (message.role === 'user') {
            return <UserMessage key={message.id} content={message.content} />;
          } else {
            // Prüfe ob es die erste AI-Antwort ist (keine Quick Replies bei erster Antwort)
            const aiMessagesBeforeThis = messages.slice(0, index).filter(m => m.role === 'assistant').length;
            const isFirstResponse = aiMessagesBeforeThis === 0;

            return (
              <AIMessage
                key={message.id}
                content={message.content}
                toolCalls={message.toolCalls}
                isFirstResponse={isFirstResponse}
                onConfirmResult={onConfirmResult}
                onAdjustResult={onAdjustResult}
                onSuggestionSelect={onSuggestionSelect}
                onConfirmAction={onConfirmAction}
                onAdjustAction={onAdjustAction}
              />
            );
          }
        })}

        {/* Loading Indicator */}
        {isLoading && lastUserMessageUrl && (
          <CrawlerLoadingIndicator url={lastUserMessageUrl} />
        )}
        {isLoading && !lastUserMessageUrl && (
          <LoadingIndicator />
        )}

        {/* Auto-Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
