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
  Query,
  increment,
  Firestore
} from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase/client-init';
import { serverDb, isServerSide } from '@/lib/firebase/server-init';
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
  private readonly threadsCollectionName = 'email_threads';
  
  // Dynamisch die richtige DB-Instanz verwenden
  private get db(): Firestore {
    return isServerSide() ? serverDb : clientDb;
  }

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
        collection(this.db, this.collectionName),
        data
      );

      return { ...data, id: docRef.id } as EmailMessage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Holt eine E-Mail-Nachricht
   */
  async get(id: string): Promise<EmailMessage | null> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as EmailMessage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualisiert eine E-Mail-Nachricht
   */
  async update(id: string, updates: Partial<EmailMessage>): Promise<void> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Löscht eine E-Mail-Nachricht (soft delete - verschiebt in Papierkorb)
   */
  async delete(id: string): Promise<void> {
    try {
      
      // Hole die E-Mail für Thread-Informationen
      const email = await this.get(id);
      if (!email) {
        throw new Error('E-Mail nicht gefunden');
      }

      // Verschiebe in Trash
      await this.update(id, {
        folder: 'trash'
      });

      // Update Thread wenn die E-Mail zu einem Thread gehört
      if (email.threadId) {
        await this.updateThreadAfterDelete(email.threadId, email);
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualisiert Thread-Statistiken nach dem Löschen einer E-Mail
   */
  private async updateThreadAfterDelete(threadId: string, deletedEmail: EmailMessage): Promise<void> {
    try {
      
      const batch = writeBatch(this.db);
      const threadRef = doc(this.db, this.threadsCollectionName, threadId);
      
      // Hole aktuelle Thread-Daten
      const threadSnap = await getDoc(threadRef);
      if (!threadSnap.exists()) {
        return;
      }

      const threadData = threadSnap.data() as EmailThread;

      // Zähle verbleibende E-Mails im Thread (ohne Trash)
      const remainingEmailsQuery = query(
        collection(this.db, this.collectionName),
        where('threadId', '==', threadId),
        where('folder', '!=', 'trash')
      );
      
      const remainingSnapshot = await getDocs(remainingEmailsQuery);
      const remainingCount = remainingSnapshot.size;


      if (remainingCount === 0) {
        // Keine E-Mails mehr im Thread (außer Trash) - Thread löschen oder archivieren
        batch.update(threadRef, {
          status: 'archived',
          updatedAt: serverTimestamp()
        });
      } else {
        // Aktualisiere Thread-Counts
        const updates: any = {
          messageCount: remainingCount,
          updatedAt: serverTimestamp()
        };

        // Wenn die gelöschte E-Mail ungelesen war, reduziere unreadCount
        if (!deletedEmail.isRead && threadData.unreadCount > 0) {
          updates.unreadCount = Math.max(0, threadData.unreadCount - 1);
        }

        // Finde die neueste verbleibende E-Mail für lastMessageAt
        const latestEmailQuery = query(
          collection(this.db, this.collectionName),
          where('threadId', '==', threadId),
          where('folder', '!=', 'trash'),
          orderBy('receivedAt', 'desc'),
          limit(1)
        );

        const latestSnapshot = await getDocs(latestEmailQuery);
        if (!latestSnapshot.empty) {
          const latestEmail = latestSnapshot.docs[0].data() as EmailMessage;
          updates.lastMessageAt = latestEmail.receivedAt;
          updates.lastMessageId = latestSnapshot.docs[0].id;
        }

        batch.update(threadRef, updates);
      }

      await batch.commit();
    } catch (error) {
      // Fehler nicht werfen, da das Löschen selbst erfolgreich war
    }
  }

  /**
   * Löscht eine E-Mail-Nachricht endgültig
   */
  async permanentDelete(id: string): Promise<void> {
    try {
      // Hole E-Mail für Thread-Update
      const email = await this.get(id);
      
      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);

      // Update Thread nach permanentem Löschen
      if (email && email.threadId) {
        await this.updateThreadAfterDelete(email.threadId, email);
      }
    } catch (error) {
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
      let q: Query = collection(this.db, this.collectionName);
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
      throw error;
    }
  }

  /**
   * Holt alle E-Mails eines Threads (ohne Trash)
   */
  async getThreadMessages(threadId: string): Promise<EmailMessage[]> {
    try {
      
      const q = query(
        collection(this.db, this.collectionName),
        where('threadId', '==', threadId),
        where('folder', '!=', 'trash'), // Ausschluss von gelöschten E-Mails
        orderBy('folder'), // Notwendig für != Query
        orderBy('receivedAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const messages: EmailMessage[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id } as EmailMessage);
      });

      return messages;
    } catch (error) {
      
      // Fallback ohne folder Filter wenn Index fehlt
      try {
        const fallbackQuery = query(
          collection(this.db, this.collectionName),
          where('threadId', '==', threadId),
          orderBy('receivedAt', 'asc')
        );
        
        const snapshot = await getDocs(fallbackQuery);
        const messages: EmailMessage[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as EmailMessage;
          // Manuell Trash-Emails filtern
          if (data.folder !== 'trash') {
            messages.push({ ...data, id: doc.id });
          }
        });
        
        return messages;
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  /**
   * Markiert eine E-Mail als gelesen/ungelesen
   */
  async markAsRead(id: string, isRead: boolean = true): Promise<void> {
    try {
      // Hole E-Mail für Thread-Update
      const email = await this.get(id);
      if (!email) return;

      await this.update(id, { isRead });

      // Update Thread unreadCount
      if (email.threadId && email.isRead !== isRead) {
        const threadRef = doc(this.db, this.threadsCollectionName, email.threadId);
        const change = isRead ? -1 : 1;
        await updateDoc(threadRef, {
          unreadCount: increment(change),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      throw error;
    }
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
    try {
      const email = await this.get(id);
      if (!email) return;

      await this.update(id, { folder });

      // Bei Verschiebung in/aus Trash: Thread aktualisieren
      if ((email.folder === 'trash' || folder === 'trash') && email.threadId) {
        await this.updateThreadAfterDelete(email.threadId, email);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Archiviert eine E-Mail
   */
  async archive(id: string): Promise<void> {
    try {
      
      const email = await this.get(id);
      if (!email) {
        throw new Error('E-Mail nicht gefunden');
      }

      await this.update(id, { 
        isArchived: true,
        folder: 'inbox' // Bleibt in Inbox aber ist archiviert
      });

      // Update Thread counts wenn nötig
      if (email.threadId && !email.isRead) {
        const threadRef = doc(this.db, this.threadsCollectionName, email.threadId);
        await updateDoc(threadRef, {
          unreadCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

    } catch (error) {
      throw error;
    }
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
      const batch = writeBatch(this.db);
      
      ids.forEach(id => {
        const docRef = doc(this.db, this.collectionName, id);
        batch.update(docRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
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

        const q = query(collection(this.db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        stats[folder] = snapshot.size;
      }

      return stats;
    } catch (error) {
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
          collection(this.db, this.collectionName),
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