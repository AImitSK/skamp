// src/lib/email/email-message-service.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  EmailMessage,
  EmailThread,
  EmailAddressInfo 
} from '@/types/email-enhanced';

interface EmailQueryOptions {
  folder?: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  threadId?: string;
  emailAccountId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  labels?: string[];
  searchQuery?: string;
  limit?: number;
  startAfter?: DocumentData;
  orderBy?: 'receivedAt' | 'sentAt';
  orderDirection?: 'asc' | 'desc';
}

interface EmailListResult {
  messages: EmailMessage[];
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export class EmailMessageService {
  private readonly collectionName = 'email_messages';

  /**
   * Erstellt eine neue E-Mail-Nachricht
   */
  async create(messageData: Partial<EmailMessage>): Promise<EmailMessage> {
    try {
      // Validierung
      if (!messageData.messageId || !messageData.organizationId || !messageData.emailAccountId) {
        throw new Error('Fehlende Pflichtfelder: messageId, organizationId, emailAccountId');
      }

      // Setze Timestamps
      const now = serverTimestamp() as Timestamp;
      const data = {
        ...messageData,
        createdAt: now,
        updatedAt: now,
        receivedAt: messageData.receivedAt || now
      };

      const docRef = await addDoc(
        collection(db, this.collectionName),
        data
      );

      return { ...data, id: docRef.id } as EmailMessage;
    } catch (error) {
      console.error('Fehler beim Erstellen der E-Mail-Nachricht:', error);
      throw error;
    }
  }

  /**
   * Holt eine E-Mail-Nachricht
   */
  async get(id: string): Promise<EmailMessage | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as EmailMessage;
    } catch (error) {
      console.error('Fehler beim Abrufen der E-Mail-Nachricht:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine E-Mail-Nachricht
   */
  async update(id: string, updates: Partial<EmailMessage>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der E-Mail-Nachricht:', error);
      throw error;
    }
  }

  /**
   * Löscht eine E-Mail-Nachricht (soft delete - verschiebt in Papierkorb)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.update(id, {
        folder: 'trash'
        // deletedAt existiert nicht in EmailMessage Type
        // Verwende updatedAt als Indikator für Löschzeitpunkt
      });
    } catch (error) {
      console.error('Fehler beim Löschen der E-Mail-Nachricht:', error);
      throw error;
    }
  }

  /**
   * Löscht eine E-Mail-Nachricht endgültig
   */
  async permanentDelete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim endgültigen Löschen der E-Mail-Nachricht:', error);
      throw error;
    }
  }

  /**
   * Holt E-Mail-Nachrichten mit Filteroptionen
   */
  async getMessages(
    organizationId: string,
    options: EmailQueryOptions = {}
  ): Promise<EmailListResult> {
    try {
      let q: Query = collection(db, this.collectionName);
      const constraints: any[] = [
        where('organizationId', '==', organizationId)
      ];

      // Folder Filter
      if (options.folder) {
        constraints.push(where('folder', '==', options.folder));
      }

      // Thread Filter
      if (options.threadId) {
        constraints.push(where('threadId', '==', options.threadId));
      }

      // Email Account Filter
      if (options.emailAccountId) {
        constraints.push(where('emailAccountId', '==', options.emailAccountId));
      }

      // Read Status Filter
      if (options.isRead !== undefined) {
        constraints.push(where('isRead', '==', options.isRead));
      }

      // Starred Filter
      if (options.isStarred !== undefined) {
        constraints.push(where('isStarred', '==', options.isStarred));
      }

      // Labels Filter (Firestore erlaubt nur array-contains für ein Element)
      if (options.labels && options.labels.length > 0) {
        constraints.push(where('labels', 'array-contains', options.labels[0]));
      }

      // Sortierung
      const orderField = options.orderBy || 'receivedAt';
      const orderDirection = options.orderDirection || 'desc';
      constraints.push(orderBy(orderField, orderDirection));

      // Pagination
      const queryLimit = (options.limit || 20) + 1; // +1 um hasMore zu prüfen
      constraints.push(limit(queryLimit));

      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      // Query ausführen
      q = query(q as any, ...constraints);
      const querySnapshot = await getDocs(q);

      const messages: EmailMessage[] = [];
      querySnapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id } as EmailMessage);
      });

      // Prüfen ob es mehr Nachrichten gibt
      const hasMore = messages.length === queryLimit;
      if (hasMore) {
        messages.pop(); // Entferne das extra Element
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

      // Suche implementieren (client-seitig für bessere Flexibilität)
      let filteredMessages = messages;
      if (options.searchQuery) {
        const searchLower = options.searchQuery.toLowerCase();
        filteredMessages = messages.filter(msg => 
          msg.subject.toLowerCase().includes(searchLower) ||
          msg.from.email.toLowerCase().includes(searchLower) ||
          msg.from.name?.toLowerCase().includes(searchLower) ||
          msg.textContent.toLowerCase().includes(searchLower) ||
          msg.to.some(addr => 
            addr.email.toLowerCase().includes(searchLower) ||
            addr.name?.toLowerCase().includes(searchLower)
          )
        );
      }

      return {
        messages: filteredMessages,
        hasMore,
        lastDoc
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der E-Mail-Nachrichten:', error);
      throw error;
    }
  }

  /**
   * Holt alle E-Mails eines Threads
   */
  async getThreadMessages(threadId: string): Promise<EmailMessage[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('threadId', '==', threadId),
        orderBy('receivedAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const messages: EmailMessage[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id } as EmailMessage);
      });

      return messages;
    } catch (error) {
      console.error('Fehler beim Abrufen der Thread-Nachrichten:', error);
      throw error;
    }
  }

  /**
   * Markiert eine E-Mail als gelesen/ungelesen
   */
  async markAsRead(id: string, isRead: boolean = true): Promise<void> {
    await this.update(id, { isRead });
  }

  /**
   * Markiert eine E-Mail mit Stern
   */
  async toggleStar(id: string): Promise<void> {
    const message = await this.get(id);
    if (message) {
      await this.update(id, { isStarred: !message.isStarred });
    }
  }

  /**
   * Verschiebt eine E-Mail in einen anderen Ordner
   */
  async moveToFolder(
    id: string, 
    folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'
  ): Promise<void> {
    await this.update(id, { folder });
  }

  /**
   * Archiviert eine E-Mail
   */
  async archive(id: string): Promise<void> {
    await this.update(id, { 
      isArchived: true,
      folder: 'inbox' // Bleibt in Inbox aber ist archiviert
    });
  }

  /**
   * Fügt Labels hinzu
   */
  async addLabels(id: string, labels: string[]): Promise<void> {
    const message = await this.get(id);
    if (message) {
      const existingLabels = message.labels || [];
      const newLabels = Array.from(new Set([...existingLabels, ...labels]));
      await this.update(id, { labels: newLabels });
    }
  }

  /**
   * Entfernt Labels
   */
  async removeLabels(id: string, labels: string[]): Promise<void> {
    const message = await this.get(id);
    if (message) {
      const existingLabels = message.labels || [];
      const newLabels = existingLabels.filter(l => !labels.includes(l));
      await this.update(id, { labels: newLabels });
    }
  }

  /**
   * Bulk-Operationen
   */
  async bulkUpdate(
    ids: string[], 
    updates: Partial<EmailMessage>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      ids.forEach(id => {
        const docRef = doc(db, this.collectionName, id);
        batch.update(docRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Fehler bei Bulk-Update:', error);
      throw error;
    }
  }

  /**
   * Statistiken für einen Ordner
   */
  async getFolderStats(
    organizationId: string,
    emailAccountId?: string
  ): Promise<Record<string, number>> {
    try {
      const folders = ['inbox', 'sent', 'draft', 'trash', 'spam'];
      const stats: Record<string, number> = {};

      for (const folder of folders) {
        const constraints: any[] = [
          where('organizationId', '==', organizationId),
          where('folder', '==', folder),
          where('isRead', '==', false)
        ];

        if (emailAccountId) {
          constraints.push(where('emailAccountId', '==', emailAccountId));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        stats[folder] = snapshot.size;
      }

      return stats;
    } catch (error) {
      console.error('Fehler beim Abrufen der Ordner-Statistiken:', error);
      throw error;
    }
  }

  /**
   * Sucht nach E-Mails mit bestimmten Message-IDs (für Thread-Matching)
   */
  async findByMessageIds(
    messageIds: string[],
    organizationId: string
  ): Promise<EmailMessage[]> {
    try {
      if (messageIds.length === 0) return [];

      // Firestore IN query limit ist 10
      const chunks = [];
      for (let i = 0; i < messageIds.length; i += 10) {
        chunks.push(messageIds.slice(i, i + 10));
      }

      const allMessages: EmailMessage[] = [];

      for (const chunk of chunks) {
        const q = query(
          collection(db, this.collectionName),
          where('organizationId', '==', organizationId),
          where('messageId', 'in', chunk)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          allMessages.push({ ...doc.data(), id: doc.id } as EmailMessage);
        });
      }

      return allMessages;
    } catch (error) {
      console.error('Fehler beim Suchen nach Message-IDs:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen Entwurf
   */
  async createDraft(
    draftData: Partial<EmailMessage>,
    organizationId: string,
    emailAccountId: string
  ): Promise<EmailMessage> {
    const draft = await this.create({
      ...draftData,
      organizationId,
      emailAccountId,
      folder: 'draft',
      isDraft: true,
      isRead: true, // Eigene Entwürfe sind "gelesen"
      messageId: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    return draft;
  }

  /**
   * Sendet eine E-Mail (verschiebt von draft zu sent)
   */
  async markAsSent(
    id: string,
    messageId: string,
    sentAt?: Timestamp
  ): Promise<void> {
    await this.update(id, {
      folder: 'sent',
      isDraft: false,
      messageId, // Aktualisiere mit echter SendGrid Message-ID
      sentAt: sentAt || (serverTimestamp() as Timestamp)
    });
  }
}

// Singleton Export
export const emailMessageService = new EmailMessageService();