/**
 * Chat UI Komponenten (Claude-Style)
 *
 * Phase 1 Komponenten:
 * - ChatHeader: Header mit Titel, Close-Button, Sidebar-Toggle
 * - ChatMessages: Scroll-Container für Messages
 * - ChatInput: Große mehrzeilige Input-Box
 * - ActionBubbles: 3 feste Buttons (Zwischenstand, Neu starten, Speichern)
 *
 * Phase 2 Komponenten:
 * - UserMessage: Rechts ausgerichtete User-Nachricht
 * - AIMessage: AI-Nachricht mit Markdown, Icon-Buttons, ResultBox
 * - ResultBox: Formatierte Phasen-Ergebnis Box
 * - LoadingIndicator: Typing-Animation (3 Punkte)
 */

export { ChatHeader } from './ChatHeader';
export { ChatMessages } from './ChatMessages';
export type { ChatMessage } from './ChatMessages';
export { ChatInput } from './ChatInput';
export { ActionBubbles } from './ActionBubbles';
export { UserMessage } from './UserMessage';
export { AIMessage } from './AIMessage';
export { ResultBox } from './ResultBox';
export { LoadingIndicator } from './LoadingIndicator';
