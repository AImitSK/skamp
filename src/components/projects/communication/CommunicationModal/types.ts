/**
 * CommunicationModal Types
 *
 * Shared types für CommunicationModal Komponenten
 * Extrahiert aus CommunicationModal.tsx:30-60
 */

export interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  messageType: 'general' | 'planning' | 'feedback' | 'file_upload';
  planningContext?: 'strategy' | 'briefing' | 'inspiration' | 'research';
  content: string;
  author: string;
  authorName: string;
  mentions: string[];
  attachments: { id: string; name: string; url?: string }[];
  timestamp: Date;
  organizationId: string;
}

export interface CommunicationItem {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  content: string;
  participants: string[];
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status: 'unread' | 'read' | 'replied';
}
