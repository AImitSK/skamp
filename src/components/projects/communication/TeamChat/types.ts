import { Timestamp } from 'firebase/firestore';

/**
 * Team Chat Types
 *
 * Shared types für TeamChat Komponenten
 */

export interface TeamMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  timestamp: Timestamp | Date;
  mentions?: string[];
  edited?: boolean;
  editedAt?: Timestamp | Date;
  editHistory?: EditHistoryEntry[];
  reactions?: MessageReaction[];
  organizationId: string;
  deleted?: boolean;
  deletedAt?: Timestamp | Date;
  deletedBy?: string;
}

export interface EditHistoryEntry {
  previousContent: string;
  editedAt: Timestamp | Date;
  editedBy: string;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  userNames: string[];
  count: number;
}

export interface TeamMember {
  id: string;
  userId?: string;
  displayName: string;
  email: string;
  photoUrl?: string;
}
