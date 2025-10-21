/**
 * Communication Components - Barrel Exports
 *
 * Backward Compatibility für bestehende Imports
 */

// Re-export TeamChat (default + named)
export { TeamChat } from './TeamChat';
export { default } from './TeamChat';

// Re-export Sub-Komponenten falls woanders gebraucht
export { MessageInput } from './TeamChat/MessageInput';
export { MessageList } from './TeamChat/MessageList';
export { MessageItem } from './TeamChat/MessageItem';
export { ReactionBar } from './TeamChat/ReactionBar';
export { UnreadIndicator } from './TeamChat/UnreadIndicator';

// Re-export Types
export type { TeamMessage, MessageReaction, TeamMember } from './TeamChat/types';

// CommunicationModal + Sub-Komponenten
export { CommunicationModal, type CommunicationModalProps, type ProjectMessage } from './CommunicationModal';
export { MessageFilters } from './CommunicationModal/MessageFilters';
export { MessageFeed } from './CommunicationModal/MessageFeed';
export { MessageComposer } from './CommunicationModal/MessageComposer';

// Andere Communication Components
export { FloatingChat } from './FloatingChat';
export { MentionDropdown } from './MentionDropdown';
export { AssetPickerModal, type SelectedAsset } from './AssetPickerModal';
export { AssetPreview } from './AssetPreview';
