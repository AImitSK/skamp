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
  reactions?: MessageReaction[];
  organizationId: string;
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
