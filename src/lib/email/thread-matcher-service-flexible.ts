// src/lib/email/thread-matcher-service-flexible.ts
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
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  EmailThread,
  EmailAddressInfo,
  EmailMessage
} from '@/types/email-enhanced';
import { nanoid } from 'nanoid';

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
  threadId?: string; // Kann auch nur eine ID sein für Server-Side
  isNew?: boolean;
  confidence?: number;
  strategy?: 'headers' | 'subject' | 'ai-semantic' | 'new' | 'deferred';
}

// Erweitere EmailThread Interface für zusätzliche Felder
interface ExtendedEmailThread extends EmailThread {
  normalizedSubject?: string;
  wasDeferred?: boolean;
}

export class FlexibleThreadMatcherService {
  private readonly collectionName = 'email_threads';
  private readonly isServerSide: boolean;
  
  constructor(isServerSide: boolean = false) {
    this.isServerSide = isServerSide;
  }
  
  /**
   * Findet oder erstellt einen Thread für eine eingehende E-Mail
   * Server-Side: Gibt nur Thread-ID zurück (erstellt keinen Thread in Firestore)
   * Client-Side: Erstellt vollständigen Thread in Firestore
   */
  async findOrCreateThread(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
    try {
      console.log('🔍 Matching thread for:', {
        subject: criteria.subject,
        inReplyTo: criteria.inReplyTo,
        hasReferences: !!criteria.references?.length,
        isServerSide: this.isServerSide
      });

      // Server-Side: Vereinfachtes Matching ohne Firestore-Zugriff
      if (this.isServerSide) {
        return this.serverSideThreadMatching(criteria);
      }

      // Client-Side: Vollständiges Matching mit Firestore
      return this.clientSideThreadMatching(criteria);

    } catch (error) {
      console.error('❌ Thread matching error:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Server-Side Thread Matching
   * Erstellt nur eine Thread-ID, keine Firestore-Operationen
   */
  private async serverSideThreadMatching(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
    // Generiere eine deterministische Thread-ID basierend auf Subject und Teilnehmern
    const threadId = this.generateThreadId(criteria);
    
    console.log('📝 Server-side thread ID generated:', threadId);
    
    return {
      success: true,
      threadId,
      isNew: true, // Server-side weiß nicht, ob Thread existiert
      confidence: 50, // Niedrigere Confidence, da keine Verifizierung möglich
      strategy: 'deferred' // Kennzeichnet dass Thread-Erstellung verzögert wird
    };
  }

  /**
   * Client-Side Thread Matching (Original-Logik)
   */
  private async clientSideThreadMatching(criteria: ThreadMatchingCriteria): Promise<ThreadMatchResult> {
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

    // 3. Prüfe ob es bereits einen "deferred" Thread mit dieser ID gibt
    const deferredThreadId = this.generateThreadId(criteria);
    const existingThread = await this.checkDeferredThread(deferredThreadId, criteria);
    if (existingThread) {
      console.log('✅ Found deferred thread, converting to full thread');
      return {
        success: true,
        thread: existingThread,
        isNew: false,
        confidence: 100,
        strategy: 'deferred'
      };
    }

    // 4. Neuen Thread erstellen
    console.log('📝 Creating new thread');
    const newThread = await this.createThread(criteria, deferredThreadId);
    return {
      success: true,
      thread: newThread,
      isNew: true,
      confidence: 100,
      strategy: 'new'
    };
  }

  /**
   * Generiert eine deterministische Thread-ID
   */
  private generateThreadId(criteria: ThreadMatchingCriteria): string {
    // Normalisiere Subject für konsistente IDs
    const normalizedSubject = this.normalizeSubject(criteria.subject);
    
    // Sortiere Teilnehmer-Emails für konsistente IDs
    const participantEmails = [
      criteria.from.email,
      ...criteria.to.map(t => t.email)
    ].sort().join(',');
    
    // Erstelle einen Hash aus Subject und Teilnehmern
    const hashInput = `${normalizedSubject}|${participantEmails}|${criteria.organizationId}`;
    
    // Vereinfachter Hash (in Produktion würde man einen echten Hash verwenden)
    const hash = hashInput
      .split('')
      .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
      .toString(36)
      .replace('-', '');
    
    return `thread_${hash}_${nanoid(8)}`;
  }

  /**
   * Prüft ob ein deferred Thread bereits existiert
   */
  private async checkDeferredThread(
    threadId: string, 
    criteria: ThreadMatchingCriteria
  ): Promise<EmailThread | null> {
    try {
      // Suche nach E-Mails mit dieser Thread-ID
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('threadId', '==', threadId),
        where('organizationId', '==', criteria.organizationId),
        limit(1)
      );

      const snapshot = await getDocs(messagesQuery);
      
      if (!snapshot.empty) {
        // Thread existiert implizit - erstelle ihn jetzt explizit
        const thread = await this.createThread(criteria, threadId);
        
        // Zähle alle Messages für diesen Thread
        const allMessagesQuery = query(
          collection(db, 'email_messages'),
          where('threadId', '==', threadId),
          where('organizationId', '==', criteria.organizationId)
        );
        
        const allMessages = await getDocs(allMessagesQuery);
        const unreadCount = allMessages.docs.filter(doc => 
          !(doc.data() as EmailMessage).isRead
        ).length;
        
        // Update Thread mit korrekten Counts
        await updateDoc(doc(db, this.collectionName, thread.id!), {
          messageCount: allMessages.size,
          unreadCount: unreadCount
        });
        
        thread.messageCount = allMessages.size;
        thread.unreadCount = unreadCount;
        
        return thread;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking deferred thread:', error);
      return null;
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
      const threadsQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', criteria.organizationId),
        where('normalizedSubject', '==', normalizedSubject), // Neues Feld
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

      return { success: false };
    } catch (error) {
      console.error('Subject matching error:', error);
      return { success: false };
    }
  }

  /**
   * Erstellt einen neuen Thread
   */
  private async createThread(
    criteria: ThreadMatchingCriteria,
    threadId?: string
  ): Promise<EmailThread> {
    try {
      // Sammle alle Teilnehmer
      const participants = this.extractParticipants(criteria);
      const normalizedSubject = this.normalizeSubject(criteria.subject);
      
      const threadData: ExtendedEmailThread = {
        subject: criteria.subject,
        normalizedSubject, // Für besseres Subject-Matching
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
        priority: 'normal',
        
        // Wenn es ein deferred Thread war, markieren
        wasDeferred: !!threadId
      };

      // Wenn threadId vorgegeben, verwende diese als Document ID
      if (threadId) {
        const docRef = doc(db, this.collectionName, threadId);
        await setDoc(docRef, threadData, { merge: true });
        return { ...threadData, id: threadId } as EmailThread;
      } else {
        const docRef = await addDoc(
          collection(db, this.collectionName),
          threadData
        );
        return { ...threadData, id: docRef.id } as EmailThread;
      }
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
    if (this.isServerSide) {
      // Server-side kann keine Updates machen
      return;
    }

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
    if (this.isServerSide) {
      // Server-side kann keine Threads lesen
      return null;
    }

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
    if (this.isServerSide) {
      return;
    }

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
    if (this.isServerSide) {
      return;
    }

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
   * Resolves deferred threads
   * Wird von der Inbox UI aufgerufen um fehlende Threads zu erstellen
   */
  async resolveDeferredThreads(organizationId: string): Promise<number> {
    if (this.isServerSide) {
      return 0;
    }

    try {
      console.log('🔄 Resolving deferred threads...');
      
      // Finde alle E-Mails ohne zugehörigen Thread
      const orphanedMessages = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', organizationId),
        where('threadId', '!=', null)
      );
      
      const snapshot = await getDocs(orphanedMessages);
      const threadIds = new Set<string>();
      const messagesByThread = new Map<string, EmailMessage[]>();
      
      // Gruppiere Messages nach Thread-ID
      snapshot.forEach(doc => {
        const message = { ...doc.data(), id: doc.id } as EmailMessage;
        if (message.threadId) {
          threadIds.add(message.threadId);
          const messages = messagesByThread.get(message.threadId) || [];
          messages.push(message);
          messagesByThread.set(message.threadId, messages);
        }
      });
      
      // Prüfe welche Threads fehlen
      const missingThreadIds: string[] = [];
      for (const threadId of threadIds) {
        const threadDoc = await getDoc(doc(db, this.collectionName, threadId));
        if (!threadDoc.exists()) {
          missingThreadIds.push(threadId);
        }
      }
      
      console.log(`📊 Found ${missingThreadIds.length} missing threads`);
      
      // Erstelle fehlende Threads
      for (const threadId of missingThreadIds) {
        const messages = messagesByThread.get(threadId) || [];
        if (messages.length === 0) continue;
        
        // Verwende die erste Message für Thread-Informationen
        const firstMessage = messages.sort((a, b) => 
          (a.receivedAt?.toMillis() || 0) - (b.receivedAt?.toMillis() || 0)
        )[0];
        
        const lastMessage = messages[messages.length - 1];
        
        // Sammle alle Teilnehmer
        const participants = new Map<string, EmailAddressInfo>();
        messages.forEach(msg => {
          participants.set(msg.from.email, msg.from);
          msg.to.forEach(to => participants.set(to.email, to));
        });
        
        // Erstelle Thread
        await this.createThread({
          messageId: firstMessage.messageId,
          subject: firstMessage.subject,
          from: firstMessage.from,
          to: firstMessage.to,
          organizationId: organizationId,
          inReplyTo: firstMessage.inReplyTo,
          references: firstMessage.references
        }, threadId);
        
        console.log(`✅ Created deferred thread: ${threadId}`);
      }
      
      return missingThreadIds.length;
    } catch (error) {
      console.error('Error resolving deferred threads:', error);
      return 0;
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

// Singleton Exports für Client und Server
export const threadMatcherService = new FlexibleThreadMatcherService(false); // Client-side
export const serverThreadMatcherService = new FlexibleThreadMatcherService(true); // Server-side