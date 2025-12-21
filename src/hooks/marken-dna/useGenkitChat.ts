import { useLocale, useTranslations } from 'next-intl';
import { useState, useCallback, useMemo } from 'react';
import { toastService } from '@/lib/utils/toast';
import { MarkenDNADocumentType } from '@/types/marken-dna';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseGenkitChatOptions {
  flowName: 'markenDNAChat' | 'projectStrategyChat';
  documentType?: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
  projectId?: string;
  dnaSynthese?: string;
  existingDocument?: string;
  existingChatHistory?: ChatMessage[];
  onDocumentUpdate?: (document: string) => void;
}

interface GenkitChatResponse {
  response: string;
  document?: string;
  progress?: number;
  suggestions?: string[];
}

export function useGenkitChat(options: UseGenkitChatOptions) {
  const locale = useLocale();
  const tToast = useTranslations('toasts');

  const [messages, setMessages] = useState<ChatMessage[]>(
    options.existingChatHistory || []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [document, setDocument] = useState<string | null>(
    options.existingDocument || null
  );
  const [progress, setProgress] = useState(0);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // API-Endpunkt basierend auf flowName
  const apiEndpoint = useMemo(() => {
    switch (options.flowName) {
      case 'markenDNAChat':
        return '/api/ai-chat/marken-dna';
      case 'projectStrategyChat':
        return '/api/ai-chat/project-strategy';
      default:
        return '/api/ai-chat/marken-dna';
    }
  }, [options.flowName]);

  // Nachricht senden
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];

    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: options.documentType,
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          dnaSynthese: options.dnaSynthese,
          existingDocument: options.existingDocument,
          language: locale,
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GenkitChatResponse = await response.json();

      // AI-Antwort hinzufügen
      const aiMessage: ChatMessage = { role: 'assistant', content: data.response };
      setMessages([...updatedMessages, aiMessage]);

      // Dokument aktualisieren
      if (data.document) {
        setDocument(data.document);
        options.onDocumentUpdate?.(data.document);
      }

      // Progress aktualisieren
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      // Vorschläge aktualisieren
      if (data.suggestions) {
        setSuggestedPrompts(data.suggestions);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toastService.error(tToast('markenDNA.chatError', { error: error.message }));
    } finally {
      setIsLoading(false);
    }
  }, [messages, apiEndpoint, options, locale, tToast]);

  // Vorschlag als Nachricht senden
  const sendSuggestion = useCallback((prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  }, [sendMessage]);

  // Letzte AI-Antwort kopieren
  const copyLastResponse = useCallback(async () => {
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAI) {
      await navigator.clipboard.writeText(lastAI.content);
      toastService.success(tToast('copySuccess'));
    }
  }, [messages, tToast]);

  // Letzte Nachricht neu generieren
  const regenerate = useCallback(async () => {
    // Letzte User-Message finden und nochmal senden
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[messages.length - 1 - lastUserIndex];

    // Letzte AI-Antwort entfernen
    setMessages(prev => prev.slice(0, prev.length - 1));

    // Neu generieren
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  return {
    // Chat State
    messages,
    input,
    setInput,
    isLoading,
    error,

    // Actions
    sendMessage,
    sendSuggestion,
    copyLastResponse,
    regenerate,

    // Extracted Data
    document,
    progress,
    suggestedPrompts,
  };
}
