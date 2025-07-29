// src/lib/email/thread-matcher-service.ts
// Am Anfang der thread-matcher-service.ts, ersetze die imports:

import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  getFirestore
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { 
  EmailThread,
  EmailAddressInfo,
  EmailMessage
} from '@/types/email-enhanced';

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialisiere Firebase App wenn noch nicht geschehen
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore Instanz
const db = getFirestore(app);

interface ThreadMatchingCriteria {
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  subject: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  organizationId: string;
}

interface ThreadMatchResult {
  success: boolean;
  thread?: EmailThread;
  isNew?: boolean;
  confidence?: number;
  strategy?: 'headers' | 'subject' | 'ai-semantic' | 'new';
}

export class ThreadMatcherService {
  private readonly collectionName = 'email_threads';
  
  /**
   * Findet oder erstellt einen Thread für eine eingehende E-Mail
   */
  async findOrCreateThread(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
    try {
      console.log('🔍 Matching thread for:', {
        subject: criteria.subject,
        inReplyTo: criteria.inReplyTo,
        hasReferences: !!criteria.references?.length
      });

      // 1. Header-basiertes Matching (höchste Priorität)
      if (criteria.inReplyTo || (criteria.references && criteria.references.length > 0)) {
        const headerMatch = await this.matchByHeaders(criteria);
        if (headerMatch.success && headerMatch.thread) {
          console.log('✅ Thread matched by headers');
          await this.updateThreadActivity(headerMatch.thread.id!, criteria);
          return headerMatch;
        }
      }

      // 2. Subject-basiertes Matching
      const subjectMatch = await this.matchBySubject(criteria);
      if (subjectMatch.success && subjectMatch.thread) {
        console.log('✅ Thread matched by subject');
        await this.updateThreadActivity(subjectMatch.thread.id!, criteria);
        return subjectMatch;
      }

      // 3. Neuen Thread erstellen
      console.log('📝 Creating new thread');
      const newThread = await this.createThread(criteria);
      return {
        success: true,
        thread: newThread,
        isNew: true,
        confidence: 100,
        strategy: 'new'
      };

    } catch (error) {
      console.error('❌ Thread matching error:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Header-basiertes Thread-Matching
   */
  private async matchByHeaders(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
    try {
      // Sammle alle Message-IDs die gesucht werden sollen
      const messageIdsToFind: string[] = [];
      
      if (criteria.inReplyTo) {
        messageIdsToFind.push(criteria.inReplyTo.replace(/^<|>$/g, ''));
      }
      
      if (criteria.references) {
        criteria.references.forEach(ref => {
          messageIdsToFind.push(ref.replace(/^<|>$/g, ''));
        });
      }

      if (messageIdsToFind.length === 0) {
        return { success: false };
      }

      // Suche nach E-Mails mit diesen Message-IDs
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', criteria.organizationId),
        where('messageId', 'in', messageIdsToFind.slice(0, 10)) // Firestore limit
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (!messagesSnapshot.empty) {
        // Thread-ID aus der ersten gefundenen Nachricht
        const message = messagesSnapshot.docs[0].data() as EmailMessage;
        if (message.threadId) {
          const thread = await this.getThread(message.threadId);
          if (thread) {
            return {
              success: true,
              thread,
              isNew: false,
              confidence: 100,
              strategy: 'headers'
            };
          }
        }
      }

      return { success: false };
    } catch (error) {
      console.error('Header matching error:', error);
      return { success: false };
    }
  }

  /**
   * Subject-basiertes Thread-Matching
   */
  private async matchBySubject(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
    try {
      // Normalisiere Subject (entferne Re:, Fwd:, etc.)
      const normalizedSubject = this.normalizeSubject(criteria.subject);
      
      if (!normalizedSubject || normalizedSubject.length < 3) {
        return { success: false };
      }

      // Suche nach Threads mit ähnlichem Subject
      // Hinweis: Firestore unterstützt kein LIKE, daher exakte Übereinstimmung
      const threadsQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', criteria.organizationId),
        where('subject', '==', normalizedSubject),
        orderBy('lastMessageAt', 'desc'),
        limit(5)
      );

      const threadsSnapshot = await getDocs(threadsQuery);
      
      if (!threadsSnapshot.empty) {
        // Prüfe Teilnehmer für besseres Matching
        for (const doc of threadsSnapshot.docs) {
          const thread = { ...doc.data(), id: doc.id } as EmailThread;
          
          if (this.participantsMatch(thread.participants, criteria)) {
            return {
              success: true,
              thread,
              isNew: false,
              confidence: 85,
              strategy: 'subject'
            };
          }
        }
      }

      // Alternative: Suche mit Original-Subject (mit Re:, etc.)
      const alternativeQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', criteria.organizationId),
        where('subject', '==', criteria.subject),
        orderBy('lastMessageAt', 'desc'),
        limit(1)
      );

      const altSnapshot = await getDocs(alternativeQuery);
      if (!altSnapshot.empty) {
        const thread = { ...altSnapshot.docs[0].data(), id: altSnapshot.docs[0].id } as EmailThread;
        return {
          success: true,
          thread,
          isNew: false,
          confidence: 75,
          strategy: 'subject'
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Subject matching error:', error);
      return { success: false };
    }
  }

  /**
   * Erstellt einen neuen Thread
   */
  private async createThread(criteria: ThreadMatchingCriteria): Promise<EmailThread> {
    try {
      // Sammle alle Teilnehmer
      const participants = this.extractParticipants(criteria);
      
      const threadData: Omit<EmailThread, 'id'> = {
        subject: criteria.subject,
        participants,
        lastMessageAt: serverTimestamp() as Timestamp,
        messageCount: 1,
        unreadCount: 1,
        
        organizationId: criteria.organizationId,
        userId: '', // Wird später durch Email Address userId gesetzt
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        
        contactIds: [], // TODO: Contact-Verknüpfung implementieren
        
        threadingStrategy: 'headers',
        confidence: 100,
        status: 'active',
        priority: 'normal'
      };

      const docRef = await addDoc(
        collection(db, this.collectionName),
        threadData
      );

      return { ...threadData, id: docRef.id } as EmailThread;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Thread-Aktivität
   */
  private async updateThreadActivity(
    threadId: string, 
    criteria: ThreadMatchingCriteria
  ): Promise<void> {
    try {
      // Aktualisiere Teilnehmer-Liste
      const thread = await this.getThread(threadId);
      if (!thread) return;

      const updatedParticipants = this.mergeParticipants(
        thread.participants,
        this.extractParticipants(criteria)
      );

      await updateDoc(doc(db, this.collectionName, threadId), {
        lastMessageAt: serverTimestamp(),
        messageCount: increment(1),
        unreadCount: increment(1),
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating thread activity:', error);
    }
  }

  /**
   * Holt einen Thread
   */
  async getThread(threadId: string): Promise<EmailThread | null> {
    try {
      const docRef = doc(db, this.collectionName, threadId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as EmailThread;
    } catch (error) {
      console.error('Error getting thread:', error);
      return null;
    }
  }

  /**
   * Aktualisiert Thread nach KI-Analyse
   */
  async updateThreadAnalysis(
    threadId: string,
    analysis: EmailThread['aiAnalysis']
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, threadId), {
        aiAnalysis: {
          ...analysis,
          analyzedAt: serverTimestamp() as Timestamp,
          generatedBy: 'gemini'
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating thread analysis:', error);
      throw error;
    }
  }

  /**
   * Markiert Thread als gelesen
   */
  async markThreadAsRead(threadId: string): Promise<void> {
    try {
      const thread = await this.getThread(threadId);
      if (!thread) return;

      await updateDoc(doc(db, this.collectionName, threadId), {
        unreadCount: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  }

  /**
   * Hilfsfunktionen
   */
  
  private normalizeSubject(subject: string): string {
    // Entferne Re:, Fwd:, AW:, WG: etc.
    let normalized = subject
      .replace(/^(Re:|Fwd:|AW:|WG:|RE:|FW:|Aw:|Wg:)\s*/gi, '')
      .trim();
    
    // Entferne mehrfache Spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Entferne Sonderzeichen am Anfang/Ende
    normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, '');
    
    return normalized;
  }

  private extractParticipants(criteria: ThreadMatchingCriteria): EmailAddressInfo[] {
    const participantMap = new Map<string, EmailAddressInfo>();
    
    // From
    participantMap.set(criteria.from.email, criteria.from);
    
    // To
    criteria.to.forEach(addr => {
      if (!participantMap.has(addr.email)) {
        participantMap.set(addr.email, addr);
      }
    });
    
    return Array.from(participantMap.values());
  }

  private mergeParticipants(
    existing: EmailAddressInfo[],
    newParticipants: EmailAddressInfo[]
  ): EmailAddressInfo[] {
    const participantMap = new Map<string, EmailAddressInfo>();
    
    // Existierende Teilnehmer
    existing.forEach(p => participantMap.set(p.email, p));
    
    // Neue Teilnehmer hinzufügen/aktualisieren
    newParticipants.forEach(p => {
      const existing = participantMap.get(p.email);
      if (!existing || !existing.name && p.name) {
        // Überschreibe wenn neuer Eintrag einen Namen hat
        participantMap.set(p.email, p);
      }
    });
    
    return Array.from(participantMap.values());
  }

  private participantsMatch(
    threadParticipants: EmailAddressInfo[],
    criteria: ThreadMatchingCriteria
  ): boolean {
    // Prüfe ob mindestens ein Teilnehmer übereinstimmt
    const criteriaEmails = new Set<string>();
    criteriaEmails.add(criteria.from.email);
    criteria.to.forEach(addr => criteriaEmails.add(addr.email));
    
    const threadEmails = new Set(threadParticipants.map(p => p.email));
    
    // Mindestens 2 gemeinsame Teilnehmer für Match
    let matches = 0;
    for (const email of criteriaEmails) {
      if (threadEmails.has(email)) {
        matches++;
        if (matches >= 2) return true;
      }
    }
    
    return false;
  }
}

// Singleton Export
export const threadMatcherService = new ThreadMatcherService();