/**
 * Chat-UI Komponenten für Marken-DNA KI-Chat
 *
 * Diese Komponenten implementieren ein ChatGPT-ähnliches Chat-Erlebnis
 * für die Marken-DNA Dokumenten-Erstellung.
 *
 * Verwendung:
 * ```tsx
 * import { AIChatInterface } from '@/components/marken-dna/chat';
 *
 * <AIChatInterface
 *   messages={messages}
 *   input={input}
 *   onInputChange={setInput}
 *   onSendMessage={handleSend}
 *   isLoading={isLoading}
 *   suggestedPrompts={suggestions}
 *   progress={progress}
 * />
 * ```
 */

export { AIChatInterface } from './AIChatInterface';
export { MessageList } from './MessageList';
export { AIMessage } from './AIMessage';
export { UserMessage } from './UserMessage';
export { ChatInput } from './ChatInput';
export { SuggestedPrompts } from './SuggestedPrompts';
export { ProgressIndicator } from './ProgressIndicator';

export type { ChatMessage } from './AIChatInterface';
