import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

export interface TeamMessage {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  timestamp: Timestamp | any;
  mentions: string[];
  edited?: boolean;
  editedAt?: Timestamp;
  projectId: string;
  organizationId: string;
}

export class TeamChatService {
  private getMessagesCollection(projectId: string) {
    return collection(db, 'projects', projectId, 'teamMessages');
  }

  async sendMessage(
    projectId: string,
    message: Omit<TeamMessage, 'id' | 'timestamp' | 'projectId'>
  ): Promise<string> {
    try {
      const messagesRef = this.getMessagesCollection(projectId);
      const docRef = await addDoc(messagesRef, {
        ...message,
        projectId,
        timestamp: serverTimestamp(),
        edited: false
      });

      console.log('Team-Chat Nachricht gesendet:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      throw error;
    }
  }

  async getMessages(
    projectId: string,
    limitCount: number = 50
  ): Promise<TeamMessage[]> {
    try {
      const messagesRef = this.getMessagesCollection(projectId);
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const messages: TeamMessage[] = [];

      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as TeamMessage);
      });

      // Nachrichten in chronologischer Reihenfolge zurückgeben
      return messages.reverse();
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      throw error;
    }
  }

  subscribeToMessages(
    projectId: string,
    callback: (messages: TeamMessage[]) => void,
    limitCount: number = 50
  ): () => void {
    const messagesRef = this.getMessagesCollection(projectId);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: TeamMessage[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data
        } as TeamMessage);
      });

      // Nachrichten in chronologischer Reihenfolge
      callback(messages.reverse());
    }, (error) => {
      console.error('Fehler beim Abonnieren der Nachrichten:', error);
    });

    return unsubscribe;
  }

  async editMessage(
    projectId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);
      await updateDoc(messageRef, {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
      });

      console.log('Nachricht bearbeitet:', messageId);
    } catch (error) {
      console.error('Fehler beim Bearbeiten der Nachricht:', error);
      throw error;
    }
  }

  async deleteMessage(
    projectId: string,
    messageId: string
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);
      await deleteDoc(messageRef);

      console.log('Nachricht gelöscht:', messageId);
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht:', error);
      throw error;
    }
  }

  extractMentions(text: string): string[] {
    const mentionPattern = /@(\w+)/g;
    const matches = text.match(mentionPattern);
    return matches ? matches.map(m => m.substring(1)) : [];
  }

  async searchMessages(
    projectId: string,
    searchTerm: string
  ): Promise<TeamMessage[]> {
    try {
      const messagesRef = this.getMessagesCollection(projectId);
      const q = query(messagesRef, orderBy('timestamp', 'desc'));

      const snapshot = await getDocs(q);
      const messages: TeamMessage[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as TeamMessage;
        // Client-seitige Filterung
        if (data.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            data.authorName.toLowerCase().includes(searchTerm.toLowerCase())) {
          messages.push({
            id: doc.id,
            ...data
          });
        }
      });

      return messages.reverse();
    } catch (error) {
      console.error('Fehler beim Durchsuchen der Nachrichten:', error);
      throw error;
    }
  }
}

export const teamChatService = new TeamChatService();