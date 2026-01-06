'use client';

// src/hooks/agentic-chat/useAgenticChat.ts
// React Hook für das Agentic Chat System mit Tool-Call Verarbeitung

import { useLocale, useTranslations } from 'next-intl';
import { useState, useCallback, useReducer, useRef, useEffect } from 'react';
import { toastService } from '@/lib/utils/toast';
import { auth } from '@/lib/firebase/client-init';
import type {
  ChatMessage,
  ToolCall,
  SpecialistType
} from '@/lib/ai/agentic/types';
import {
  toolboxReducer,
  INITIAL_TOOLBOX_STATE,
  type ToolboxState,
} from '@/components/agentic-chat/toolbox';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAgenticChatOptions {
  /** Initialer Spezialist */
  initialSpecialist: SpecialistType;
  /** Firmen-ID */
  companyId: string;
  /** Firmenname für Prompts */
  companyName: string;
  /** Optionaler Document-Type für Spezialisten */
  documentType?: string;
  /** Bestehende Chat-History (z.B. bei Fortsetzung) */
  existingChatHistory?: ChatMessage[];
  /** Bestehendes Dokument (z.B. bei Fortsetzung) */
  existingDocument?: string;
  /** Callback wenn ein Dokument finalisiert wird */
  onDocumentComplete?: (document: string) => void;
  /** Callback wenn Agent wechselt */
  onAgentChange?: (agent: SpecialistType) => void;
}

export interface AgenticChatState {
  /** Alle Chat-Nachrichten */
  messages: ChatMessage[];
  /** Aktueller Input-Text */
  input: string;
  /** Lädt gerade eine Antwort */
  isLoading: boolean;
  /** Aktueller Agent */
  currentAgent: SpecialistType;
  /** Fehler-State */
  error: Error | null;
  /** Toolbox-State für UI-Komponenten */
  toolbox: ToolboxState;
}

interface AgenticChatResponse {
  response: string;
  toolCalls: ToolCall[];
  nextAgent?: SpecialistType;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAgenticChat(options: UseAgenticChatOptions) {
  const locale = useLocale() as 'de' | 'en';
  const tToast = useTranslations('toasts');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(
    options.existingChatHistory || []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<SpecialistType>(
    options.initialSpecialist
  );
  const [error, setError] = useState<Error | null>(null);

  // Toolbox State (Reducer für UI-Komponenten)
  const [toolbox, dispatchToolbox] = useReducer(toolboxReducer, INITIAL_TOOLBOX_STATE);

  // Refs für aktuelle Callbacks
  const onDocumentCompleteRef = useRef(options.onDocumentComplete);
  const onAgentChangeRef = useRef(options.onAgentChange);

  useEffect(() => {
    onDocumentCompleteRef.current = options.onDocumentComplete;
    onAgentChangeRef.current = options.onAgentChange;
  }, [options.onDocumentComplete, options.onAgentChange]);

  // Reset bei Optionsänderungen
  useEffect(() => {
    setMessages(options.existingChatHistory || []);
    setCurrentAgent(options.initialSpecialist);
    setInput('');
    setError(null);
    dispatchToolbox({ type: 'RESET' });

    // Bestehendes Dokument initialisieren
    if (options.existingDocument) {
      dispatchToolbox({
        type: 'INIT_DOCUMENT',
        content: options.existingDocument,
        status: 'draft',
      });
    }
  }, [options.companyId, options.initialSpecialist, options.existingChatHistory, options.existingDocument]);

  // ============================================================================
  // NACHRICHT SENDEN
  // ============================================================================

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage
    };
    const updatedMessages = [...messages, newUserMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Firebase Auth Token holen
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }
      const token = await user.getIdToken();

      // API-Call
      const response = await fetch('/api/ai-chat/agentic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          specialistType: currentAgent,
          companyId: options.companyId,
          companyName: options.companyName,
          documentType: options.documentType,
          language: locale,
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: AgenticChatResponse = await response.json();
      console.log('[useAgenticChat] API Response:', {
        response: data.response?.substring(0, 50),
        toolCallsCount: data.toolCalls?.length,
        toolCallNames: data.toolCalls?.map(tc => tc.name),
      });

      // AI-Antwort mit Tool-Calls hinzufügen
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        toolCalls: data.toolCalls,
      };
      setMessages([...updatedMessages, aiMessage]);

      // Tool-Calls verarbeiten für UI-State
      if (data.toolCalls.length > 0) {
        dispatchToolbox({
          type: 'PROCESS_TOOL_CALLS',
          toolCalls: data.toolCalls
        });

        // Check für finalisiertes Dokument
        const sidebarCall = data.toolCalls.find(
          tc => tc.name === 'skill_sidebar' &&
                tc.args.action === 'finalizeDocument'
        );
        if (sidebarCall && typeof sidebarCall.args.content === 'string') {
          onDocumentCompleteRef.current?.(sidebarCall.args.content);
        }
      }

      // Agent-Handoff
      if (data.nextAgent && data.nextAgent !== currentAgent) {
        setCurrentAgent(data.nextAgent);
        onAgentChangeRef.current?.(data.nextAgent);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unbekannter Fehler');
      setError(error);
      toastService.error(tToast('agenticChat.error', { error: error.message }));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, currentAgent, options, locale, tToast]);

  // ============================================================================
  // HELPER ACTIONS
  // ============================================================================

  /** Suggestion als Nachricht senden */
  const sendSuggestion = useCallback((prompt: string) => {
    sendMessage(prompt);
    // Suggestions zurücksetzen nach Auswahl
    dispatchToolbox({ type: 'SET_SUGGESTIONS', suggestions: [] });
  }, [sendMessage]);

  /** Confirm-Box bestätigen */
  const confirmAction = useCallback(() => {
    dispatchToolbox({ type: 'DISMISS_CONFIRM' });
    // Hier könnte eine Bestätigungs-Nachricht gesendet werden
    sendMessage('Ja, bitte abschließen.');
  }, [sendMessage]);

  /** Confirm-Box ablehnen (Anpassen) */
  const adjustAction = useCallback(() => {
    dispatchToolbox({ type: 'DISMISS_CONFIRM' });
    // User kann dann selbst weitere Eingaben machen
  }, []);

  /** Letzte AI-Antwort kopieren */
  const copyLastResponse = useCallback(async () => {
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAI) {
      await navigator.clipboard.writeText(lastAI.content);
      toastService.success(tToast('copySuccess'));
    }
  }, [messages, tToast]);

  /** Letzte Nachricht neu generieren */
  const regenerate = useCallback(async () => {
    // Letzte User-Message finden
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    const lastUserMessage = userMessages[userMessages.length - 1];

    // Letzte AI-Antwort entfernen
    const messagesWithoutLastAI = messages.slice(0, -1);
    setMessages(messagesWithoutLastAI);

    // Neu generieren
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /** Agent manuell wechseln */
  const switchAgent = useCallback((agent: SpecialistType) => {
    setCurrentAgent(agent);
    onAgentChangeRef.current?.(agent);
  }, []);

  /** Chat zurücksetzen */
  const resetChat = useCallback(() => {
    setMessages([]);
    setInput('');
    setError(null);
    setCurrentAgent(options.initialSpecialist);
    dispatchToolbox({ type: 'RESET' });
  }, [options.initialSpecialist]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Chat State
    messages,
    input,
    setInput,
    isLoading,
    error,
    currentAgent,

    // Toolbox State für UI-Komponenten
    toolbox,

    // Actions
    sendMessage,
    sendSuggestion,
    confirmAction,
    adjustAction,
    copyLastResponse,
    regenerate,
    switchAgent,
    resetChat,

    // Computed
    hasMessages: messages.length > 0,
    document: toolbox.document?.content ?? null,
    documentStatus: toolbox.document?.status ?? 'draft',
  };
}

export type UseAgenticChatReturn = ReturnType<typeof useAgenticChat>;
