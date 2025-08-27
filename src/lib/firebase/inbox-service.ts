// src/lib/firebase/inbox-service.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './client-init';
import { BaseService } from './service-base';
import { nanoid } from 'nanoid';

// ========================================
// Inbox Communication für Freigabe-System
// ========================================

export interface InboxThread {
  id: string;
  organizationId: string;
  subject: string;
  participants: InboxParticipant[];
  type: 'approval_feedback' | 'general' | 'support';
  relatedEntityType?: 'approval' | 'campaign';
  relatedEntityId?: string;
  status: 'active' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  unreadCount: Record<string, number>; // userId -> unread count
  metadata?: {
    campaignTitle?: string;
    clientName?: string;
    approvalStatus?: string;
    [key: string]: any;
  };
}

export interface InboxMessage {
  id: string;
  threadId: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderType: 'internal' | 'customer' | 'system';
  content: string;
  messageType: 'text' | 'approval_decision' | 'status_change' | 'system_notification';
  attachments?: InboxAttachment[];
  inlineComments?: InlineComment[];
  isRead: Record<string, boolean>; // userId -> read status
  createdAt: Timestamp;
  editedAt?: Timestamp;
  metadata?: {
    approvalDecision?: 'approved' | 'rejected' | 'changes_requested';
    statusChange?: {
      from: string;
      to: string;
    };
    [key: string]: any;
  };
}

export interface InboxParticipant {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'customer';
  joinedAt: Timestamp;
  lastReadAt?: Timestamp;
}

export interface InboxAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface InlineComment {
  id: string;
  quote: string;
  text: string;
  position?: {
    x: number;
    y: number;
  };
}

class InboxService extends BaseService<InboxThread> {
  private messagesCollection = 'inbox_messages';

  constructor() {
    super('inbox_threads');
  }

  /**
   * Erstellt einen neuen Thread für Freigabe-Feedback
   */
  async createApprovalThread(data: {
    organizationId: string;
    approvalId: string;
    campaignTitle: string;
    clientName: string;
    customerEmail?: string;
    customerName?: string;
    createdBy: {
      userId: string;
      name: string;
      email: string;
    };
    initialMessage?: string;
  }): Promise<string> {
    try {
      const participants: InboxParticipant[] = [
        // Ersteller (interner User)
        {
          userId: data.createdBy.userId,
          name: data.createdBy.name,
          email: data.createdBy.email,
          role: 'admin',
          joinedAt: serverTimestamp() as Timestamp
        }
      ];

      // Kunde als Teilnehmer hinzufügen falls verfügbar
      if (data.customerEmail && data.customerName) {
        participants.push({
          userId: `customer_${nanoid(10)}`, // Temp ID für externe Kunden
          name: data.customerName,
          email: data.customerEmail,
          role: 'customer',
          joinedAt: serverTimestamp() as Timestamp
        });
      }

      const threadData: Omit<InboxThread, 'id'> = {
        organizationId: data.organizationId,
        subject: `Freigabe: ${data.campaignTitle}`,
        participants,
        type: 'approval_feedback',
        relatedEntityType: 'approval',
        relatedEntityId: data.approvalId,
        status: 'active',
        priority: 'normal',
        tags: ['freigabe', 'feedback'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        lastMessageAt: serverTimestamp() as Timestamp,
        unreadCount: participants.reduce((acc, p) => {
          acc[p.userId] = 0;
          return acc;
        }, {} as Record<string, number>),
        metadata: {
          campaignTitle: data.campaignTitle,
          clientName: data.clientName,
          approvalStatus: 'pending'
        }
      };

      const docRef = await addDoc(collection(db, this.collectionName), threadData);
      const threadId = docRef.id;

      // Initiale Nachricht hinzufügen falls vorhanden
      if (data.initialMessage) {
        await this.addMessage({
          threadId,
          organizationId: data.organizationId,
          senderId: data.createdBy.userId,
          senderName: data.createdBy.name,
          senderEmail: data.createdBy.email,
          senderType: 'internal',
          content: data.initialMessage,
          messageType: 'text'
        });
      }

      return threadId;
    } catch (error) {
      throw new Error('Fehler beim Erstellen des Inbox-Threads');
    }
  }

  /**
   * Fügt eine Nachricht zu einem Thread hinzu
   */
  async addMessage(data: {
    threadId: string;
    organizationId: string;
    senderId: string;
    senderName: string;
    senderEmail?: string;
    senderType: 'internal' | 'customer' | 'system';
    content: string;
    messageType: 'text' | 'approval_decision' | 'status_change' | 'system_notification';
    attachments?: InboxAttachment[];
    inlineComments?: InlineComment[];
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      // Thread laden um Participants zu bekommen
      const thread = await this.getById(data.threadId, data.organizationId);
      if (!thread) throw new Error('Thread nicht gefunden');

      const isReadStatus = thread.participants.reduce((acc, p) => {
        acc[p.userId] = p.userId === data.senderId; // Sender hat automatisch gelesen
        return acc;
      }, {} as Record<string, boolean>);

      const messageData: Omit<InboxMessage, 'id'> = {
        threadId: data.threadId,
        organizationId: data.organizationId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType,
        attachments: data.attachments || [],
        inlineComments: data.inlineComments || [],
        isRead: isReadStatus,
        createdAt: serverTimestamp() as Timestamp,
        metadata: data.metadata || {}
      };

      const messageRef = await addDoc(collection(db, this.messagesCollection), messageData);

      // Thread-Update (lastMessageAt, unreadCount)
      const unreadUpdate: Record<string, number> = {};
      thread.participants.forEach(p => {
        if (p.userId !== data.senderId) {
          unreadUpdate[p.userId] = (thread.unreadCount[p.userId] || 0) + 1;
        }
      });

      await updateDoc(doc(db, this.collectionName, data.threadId), {
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: unreadUpdate
      });

      return messageRef.id;
    } catch (error) {
      throw new Error('Fehler beim Hinzufügen der Nachricht');
    }
  }

  /**
   * Fügt Approval-Decision als spezielle Nachricht hinzu
   */
  async addApprovalDecisionMessage(data: {
    threadId: string;
    organizationId: string;
    approvalId: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    comment?: string;
    inlineComments?: InlineComment[];
    decidedBy: {
      userId: string;
      name: string;
      email: string;
      type: 'internal' | 'customer';
    };
  }): Promise<string> {
    try {
      const decisionLabels = {
        approved: '✅ Freigegeben',
        rejected: '❌ Abgelehnt',
        changes_requested: '🔄 Änderungen angefordert'
      };

      let content = `${decisionLabels[data.decision]}`;
      if (data.comment) {
        content += `\n\n${data.comment}`;
      }

      const messageId = await this.addMessage({
        threadId: data.threadId,
        organizationId: data.organizationId,
        senderId: data.decidedBy.userId,
        senderName: data.decidedBy.name,
        senderEmail: data.decidedBy.email,
        senderType: data.decidedBy.type,
        content,
        messageType: 'approval_decision',
        inlineComments: data.inlineComments,
        metadata: {
          approvalDecision: data.decision,
          approvalId: data.approvalId
        }
      });

      // Thread-Metadata updaten
      await updateDoc(doc(db, this.collectionName, data.threadId), {
        'metadata.approvalStatus': data.decision,
        status: data.decision === 'approved' ? 'resolved' : 'active'
      });

      return messageId;
    } catch (error) {
      throw new Error('Fehler beim Hinzufügen der Approval-Decision');
    }
  }

  /**
   * Lädt alle Nachrichten eines Threads
   */
  async getThreadMessages(threadId: string, organizationId: string): Promise<InboxMessage[]> {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        where('threadId', '==', threadId),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InboxMessage));
    } catch (error) {
      throw new Error('Fehler beim Laden der Thread-Nachrichten');
    }
  }

  /**
   * Markiert Thread als gelesen für einen User
   */
  async markThreadAsRead(threadId: string, userId: string, organizationId: string): Promise<void> {
    try {
      const thread = await this.getById(threadId, organizationId);
      if (!thread) return;

      const updates: any = {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      };

      // Update participant lastReadAt
      const updatedParticipants = thread.participants.map(p => 
        p.userId === userId 
          ? { ...p, lastReadAt: serverTimestamp() as Timestamp }
          : p
      );
      updates.participants = updatedParticipants;

      await updateDoc(doc(db, this.collectionName, threadId), updates);

      // Markiere alle Nachrichten als gelesen
      await this.markThreadMessagesAsRead(threadId, userId, organizationId);
    } catch (error) {
      throw new Error('Fehler beim Markieren als gelesen');
    }
  }

  /**
   * Markiert alle Nachrichten eines Threads als gelesen
   */
  private async markThreadMessagesAsRead(threadId: string, userId: string, organizationId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        where('threadId', '==', threadId),
        where('organizationId', '==', organizationId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(docSnapshot => {
        const messageData = docSnapshot.data();
        if (messageData.isRead && !messageData.isRead[userId]) {
          batch.update(docSnapshot.ref, {
            [`isRead.${userId}`]: true
          });
        }
      });

      await batch.commit();
    } catch (error) {
      // Silent fail - nicht kritisch
    }
  }

  /**
   * Lädt alle Threads einer Organisation mit Filtern
   */
  async getThreads(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      relatedEntityId?: string;
      priority?: string;
    }
  ): Promise<InboxThread[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('lastMessageAt', 'desc')
      );

      // TODO: Weitere Filter implementieren
      const snapshot = await getDocs(q);
      let threads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InboxThread));

      // Client-seitige Filterung
      if (filters?.type) {
        threads = threads.filter(t => t.type === filters.type);
      }
      if (filters?.status) {
        threads = threads.filter(t => t.status === filters.status);
      }
      if (filters?.relatedEntityId) {
        threads = threads.filter(t => t.relatedEntityId === filters.relatedEntityId);
      }
      if (filters?.priority) {
        threads = threads.filter(t => t.priority === filters.priority);
      }

      return threads;
    } catch (error) {
      throw new Error('Fehler beim Laden der Threads');
    }
  }

  /**
   * Lädt Thread für bestimmte Approval
   */
  async getApprovalThread(approvalId: string, organizationId: string): Promise<InboxThread | null> {
    try {
      const threads = await this.getThreads(organizationId, {
        type: 'approval_feedback',
        relatedEntityId: approvalId
      });
      return threads.length > 0 ? threads[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Schließt einen Thread
   */
  async closeThread(threadId: string, organizationId: string, closedBy: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, threadId), {
        status: 'closed',
        updatedAt: serverTimestamp()
      });

      // System-Nachricht hinzufügen
      await this.addMessage({
        threadId,
        organizationId,
        senderId: 'system',
        senderName: 'System',
        senderType: 'system',
        content: `Thread wurde geschlossen.`,
        messageType: 'system_notification',
        metadata: {
          closedBy,
          closedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      throw new Error('Fehler beim Schließen des Threads');
    }
  }
}

// Export singleton instance
export const inboxService = new InboxService();