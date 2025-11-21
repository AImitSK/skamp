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
  // PLAN 7/9: Projekt-Context hinzugefügt
  projectContext?: ProjectContext;
}

// ============================================
// PLAN 7/9: PROJEKT-CONTEXT INTERFACES
// ============================================
interface ProjectContext {
  projectId: string;
  projectTitle?: string;
  contextType: 'campaign' | 'approval' | 'media' | 'general' | 'ai-detected';
  contextId: string;
  confidence: number;
  detectionMethod?: string;
  evidence?: string;
}

interface IncomingEmailData {
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  subject: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  organizationId: string;
  headers?: Record<string, string>;
  textContent?: string;
  campaignId?: string;
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
   * 
   * PLAN 7/9: ERWEITERT um Projekt-Erkennung
   */
  async findOrCreateThread(criteria: ThreadMatchingCriteria | IncomingEmailData): Promise<ThreadMatchResult> {
    try {

      // Server-Side: Vereinfachtes Matching ohne Firestore-Zugriff
      if (this.isServerSide) {
        return this.serverSideThreadMatching(criteria);
      }

      // Client-Side: Vollständiges Matching mit Firestore
      return this.clientSideThreadMatching(criteria);

    } catch (error) {
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
   * PLAN 7/9: ERWEITERT um Projekt-Erkennung
   */
  private async clientSideThreadMatching(criteria: ThreadMatchingCriteria | IncomingEmailData): Promise<ThreadMatchResult> {
    let projectContext: ProjectContext | undefined;
    
    // PLAN 7/9: Projekt-Erkennung für IncomingEmailData
    if ('headers' in criteria && 'textContent' in criteria) {
      const detectedContext = await this.detectProjectContext(criteria as IncomingEmailData);
      projectContext = detectedContext || undefined;
    }

    // 1. Header-basiertes Matching (höchste Priorität)
    if (criteria.inReplyTo || (criteria.references && criteria.references.length > 0)) {
      const headerMatch = await this.matchByHeaders(criteria);
      if (headerMatch.success && headerMatch.thread) {
        await this.updateThreadActivity(headerMatch.thread.id!, criteria);
        // Projekt-Kontext anreichern falls gefunden
        if (projectContext && projectContext.confidence > 0.5) {
          await this.enrichThreadWithProject(headerMatch.thread.id!, projectContext);
        }
        return { ...headerMatch, projectContext };
      }
    }

    // 2. Subject-basiertes Matching
    const subjectMatch = await this.matchBySubject(criteria);
    if (subjectMatch.success && subjectMatch.thread) {
      await this.updateThreadActivity(subjectMatch.thread.id!, criteria);
      // Projekt-Kontext anreichern falls gefunden
      if (projectContext && projectContext.confidence > 0.5) {
        await this.enrichThreadWithProject(subjectMatch.thread.id!, projectContext);
      }
      return { ...subjectMatch, projectContext };
    }

    // 3. Prüfe ob es bereits einen "deferred" Thread mit dieser ID gibt
    const deferredThreadId = this.generateThreadId(criteria);
    const existingThread = await this.checkDeferredThread(deferredThreadId, criteria);
    if (existingThread) {
      // Projekt-Kontext anreichern falls gefunden
      if (projectContext && projectContext.confidence > 0.5) {
        await this.enrichThreadWithProject(existingThread.id!, projectContext);
      }
      return {
        success: true,
        thread: existingThread,
        isNew: false,
        confidence: 100,
        strategy: 'deferred',
        projectContext
      };
    }

    // 4. Neuen Thread erstellen
    const newThread = await this.createThread(criteria, deferredThreadId, projectContext);
    return {
      success: true,
      thread: newThread,
      isNew: true,
      confidence: 100,
      strategy: 'new',
      projectContext
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

    // WICHTIG: Mailbox-Kontext in Thread-ID einbauen für separate Threads
    // Project-Mailbox: threadId enthält projectId
    // Domain-Mailbox: threadId enthält domainId (ohne projectId)
    const mailboxContext = criteria.projectId
      ? `project:${criteria.projectId}`
      : criteria.domainId
        ? `domain:${criteria.domainId}`
        : 'legacy';

    // Erstelle einen Hash aus Subject, Teilnehmern UND Mailbox-Kontext
    const hashInput = `${normalizedSubject}|${participantEmails}|${criteria.organizationId}|${mailboxContext}`;

    // Vereinfachter Hash (in Produktion würde man einen echten Hash verwenden)
    const hash = hashInput
      .split('')
      .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
      .toString(36)
      .replace('-', '');

    // WICHTIG: Kein nanoid mehr - muss deterministisch sein!
    // Jede Mailbox bekommt immer die gleiche Thread-ID für die gleichen Kriterien
    return `thread_${hash}`;
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
        // Filtere nach Mailbox-Kontext (Project vs Domain)
        // NUR Threads aus derselben Mailbox matchen!
        const matchingMessages = messagesSnapshot.docs.filter(doc => {
          const message = doc.data() as EmailMessage;

          // Project-Mailbox: Muss gleiches projectId haben
          if (criteria.projectId) {
            return message.projectId === criteria.projectId;
          }
          // Domain-Mailbox: Muss gleiches domainId haben UND KEIN projectId
          else if (criteria.domainId) {
            return message.domainId === criteria.domainId && !message.projectId;
          }
          // Legacy: Irgendeine Message
          return true;
        });

        if (matchingMessages.length > 0) {
          const message = matchingMessages[0].data() as EmailMessage;
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
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Subject-basiertes Thread-Matching
   * HINWEIS: Benötigt einen zusammengesetzten Index in Firestore:
   * - normalizedSubject (ASC)
   * - organizationId (ASC)
   * - lastMessageAt (DESC)
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
        where('normalizedSubject', '==', normalizedSubject),
        orderBy('lastMessageAt', 'desc'),
        limit(5)
      );

      const threadsSnapshot = await getDocs(threadsQuery);

      if (!threadsSnapshot.empty) {
        // Prüfe Teilnehmer UND Mailbox-Kontext für besseres Matching
        for (const doc of threadsSnapshot.docs) {
          const thread = { ...doc.data(), id: doc.id } as EmailThread;

          // Mailbox-Kontext muss übereinstimmen!
          const mailboxMatches = criteria.projectId
            ? (thread as any).projectId === criteria.projectId
            : criteria.domainId
              ? (thread as any).domainId === criteria.domainId && !(thread as any).projectId
              : true;

          if (mailboxMatches && this.participantsMatch(thread.participants, criteria)) {
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
      return { success: false };
    }
  }

  /**
   * Erstellt einen neuen Thread
   * FIX: Stelle sicher, dass alle Felder definierte Werte haben
   * PLAN 7/9: ERWEITERT um Projekt-Kontext
   */
  private async createThread(
    criteria: ThreadMatchingCriteria | IncomingEmailData,
    threadId?: string,
    projectContext?: ProjectContext
  ): Promise<EmailThread> {
    try {
      // Sammle alle Teilnehmer
      const participants = this.extractParticipants(criteria);
      const normalizedSubject = this.normalizeSubject(criteria.subject);
      
      // Erstelle Thread-Daten mit sicheren Default-Werten
      const threadData: Partial<ExtendedEmailThread> = {
        subject: criteria.subject || 'Kein Betreff',
        normalizedSubject: normalizedSubject || 'kein-betreff',
        participants: participants,
        lastMessageAt: serverTimestamp() as Timestamp,

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
        wasDeferred: !!threadId,

        // WICHTIG: Mailbox-Kontext speichern für separate Threads
        // Project-Mailbox: NUR projectId (domainId wird auch gesetzt aber projectId ist primär)
        // Domain-Mailbox: NUR domainId (KEIN projectId!)
        ...(criteria.projectId && { projectId: criteria.projectId }),
        ...(criteria.domainId && { domainId: criteria.domainId }),

        // PLAN 7/9: Projekt-Kontext hinzufügen falls vorhanden (zusätzliche Metadaten)
        ...(projectContext && {
          projectTitle: projectContext.projectTitle,
          contextType: projectContext.contextType as any,
          projectContext: {
            confidence: projectContext.confidence,
            detectionMethod: projectContext.detectionMethod as any || 'ai',
            detectedAt: serverTimestamp() as Timestamp
          }
        })
      };

      // Debug: Log die Daten vor der Bereinigung

      // Entferne alle undefined-Werte und prüfe auf nested undefined
      const cleanedData = Object.entries(threadData).reduce((acc, [key, value]) => {
        // Skip undefined values
        if (value === undefined) {
          console.warn(`⚠️ Skipping undefined field: ${key}`);
          return acc;
        }
        
        // Check for undefined in arrays
        if (Array.isArray(value)) {
          const cleanArray = value.filter(item => item !== undefined);
          // Behalte auch leere Arrays (wie contactIds)
          acc[key] = cleanArray;
          return acc;
        }
        
        // Check for undefined in objects (like participants)
        if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
          // Check if it's an array of objects
          if (Array.isArray(value)) {
            // Already handled above
          } else {
            const hasUndefined = Object.values(value).some(v => v === undefined);
            if (hasUndefined) {
              console.warn(`⚠️ Object ${key} contains undefined values:`, value);
            }
          }
        }
        
        acc[key] = value;
        return acc;
      }, {} as any);

      // Debug: Log die bereinigten Daten

      // Wenn threadId vorgegeben, verwende diese als Document ID
      if (threadId) {
        const docRef = doc(db, this.collectionName, threadId);
        await setDoc(docRef, cleanedData, { merge: true });
        return { ...cleanedData, id: threadId } as EmailThread;
      } else {
        const docRef = await addDoc(
          collection(db, this.collectionName),
          cleanedData
        );
        return { ...cleanedData, id: docRef.id } as EmailThread;
      }
    } catch (error) {
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
        updatedAt: serverTimestamp()
      });
    } catch (error) {
    }
  }

  /**
   * NEU: Weist einen Thread einem Team-Mitglied zu
   */
  async assignThread(
    threadId: string,
    userId: string | null,
    assignedBy: string
  ): Promise<void> {
    if (this.isServerSide) {
      return;
    }

    try {
      // Get current assignment for logging
      const threadDoc = await getDoc(doc(db, this.collectionName, threadId));
      const currentData = threadDoc.data();
      const currentAssignedTo = currentData?.assignedTo || null;
      const organizationId = currentData?.organizationId;

      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (userId) {
        // Zuweisung hinzufügen
        updateData.assignedTo = userId;
        updateData.assignedAt = serverTimestamp();
        updateData.assignedBy = assignedBy;
      } else {
        // Zuweisung entfernen
        updateData.assignedTo = null;
        updateData.assignedAt = null;
        updateData.assignedBy = null;
      }

      await updateDoc(doc(db, this.collectionName, threadId), updateData);
      
      // Log assignment change
      if (organizationId) {
        await this.logAssignmentChange(
          threadId,
          currentAssignedTo,
          userId,
          assignedBy,
          organizationId
        );
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * NEU: Ändert den Status eines Threads
   */
  async updateThreadStatus(
    threadId: string,
    status: EmailThread['status']
  ): Promise<void> {
    if (this.isServerSide) {
      return;
    }

    try {
      await updateDoc(doc(db, this.collectionName, threadId), {
        status,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * NEU: Ändert die Priorität eines Threads
   */
  async updateThreadPriority(
    threadId: string,
    priority: EmailThread['priority']
  ): Promise<void> {
    if (this.isServerSide) {
      return;
    }

    try {
      await updateDoc(doc(db, this.collectionName, threadId), {
        priority,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      throw error;
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
      
      // Finde alle E-Mails ohne zugehörigen Thread
      const orphanedMessages = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', organizationId),
        where('threadId', '!=', null)
      );
      
      const snapshot = await getDocs(orphanedMessages);
      const threadIds = new Set<string>();
      const messagesByThread = new Map<string, EmailMessage[]>();
      
      // Gruppiere Messages nach Thread-ID (aber ignoriere sent_ Threads)
      snapshot.forEach(doc => {
        const message = { ...doc.data(), id: doc.id } as EmailMessage;
        if (message.threadId && !message.threadId.startsWith('sent_')) {
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
        
      }
      
      return missingThreadIds.length;
    } catch (error) {
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
    
    // From - stelle sicher, dass name nie undefined ist
    participantMap.set(criteria.from.email, {
      email: criteria.from.email,
      name: criteria.from.name || ''
    });
    
    // To - stelle sicher, dass name nie undefined ist
    criteria.to.forEach(addr => {
      if (!participantMap.has(addr.email)) {
        participantMap.set(addr.email, {
          email: addr.email,
          name: addr.name || ''
        });
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

  /**
   * Get count of assigned threads for a team member
   */
  async getAssignedThreadsCount(organizationId: string, userId: string): Promise<number> {
    const q = query(
      collection(db, 'email_threads'),
      where('organizationId', '==', organizationId),
      where('assignedTo', '==', userId),
      where('status', 'in', ['active', 'waiting'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get workload statistics for organization
   */
  async getWorkloadStats(organizationId: string): Promise<Record<string, number>> {
    const q = query(
      collection(db, 'email_threads'),
      where('organizationId', '==', organizationId),
      where('status', 'in', ['active', 'waiting'])
    );
    
    const snapshot = await getDocs(q);
    const stats: Record<string, number> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.assignedTo) {
        stats[data.assignedTo] = (stats[data.assignedTo] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Get thread assignment history
   */
  async getAssignmentHistory(threadId: string): Promise<any[]> {
    const q = query(
      collection(db, 'thread_assignment_history'),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    const history: any[] = [];
    
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });
    
    return history;
  }

  /**
   * Log assignment change for history
   */
  private async logAssignmentChange(
    threadId: string, 
    fromUserId: string | null, 
    toUserId: string | null, 
    assignedBy: string,
    organizationId: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'thread_assignment_history'), {
        threadId,
        fromUserId,
        toUserId,
        assignedBy,
        organizationId,
        action: toUserId ? (fromUserId ? 'reassigned' : 'assigned') : 'unassigned',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      // Don't throw - this is just for logging
    }
  }

  // ============================================
  // PLAN 7/9: PROJEKT-ERKENNUNGS-METHODEN
  // ============================================

  /**
   * Erkennt Projekt-Kontext aus einer eingehenden E-Mail
   */
  private async detectProjectContext(emailData: IncomingEmailData): Promise<ProjectContext | null> {
    try {
      // 1. Reply-To-Adresse analysieren (höchste Priorität)
      const replyToProject = this.parseReplyToForProject(emailData.from.email);
      if (replyToProject) return replyToProject;
      
      // 2. E-Mail-Headers prüfen
      const headerProject = this.parseHeadersForProject(emailData.headers);
      if (headerProject) return headerProject;
      
      // 3. Campaign-ID aus bestehender Thread-Zuordnung
      if (emailData.campaignId) {
        const campaignProject = await this.findProjectByCampaign(emailData.campaignId);
        if (campaignProject) return campaignProject;
      }
      
      // 4. Absender-E-Mail → Kunde → Aktive Projekte
      const senderProject = await this.findProjectByCustomerEmail(emailData.from.email);
      if (senderProject) return senderProject;
      
      // 5. KI-basierte Content-Analyse (falls Text verfügbar)
      if (emailData.textContent) {
        const aiProject = await this.detectProjectByContent(emailData);
        if (aiProject) return aiProject;
      }
      
      return null;
    } catch (error) {
      console.error('Project detection failed:', error);
      return null;
    }
  }

  /**
   * Parse Reply-To für Projekt-Marker
   */
  private parseReplyToForProject(email: string): ProjectContext | null {
    // Pattern: pr-PROJECT_ID-CONTEXT_TYPE-CONTEXT_ID@domain.com
    const match = email.match(/^pr-([^-]+)-([^-]+)-([^@]+)@/);
    if (match) {
      const [, projectId, contextType, contextId] = match;
      return {
        projectId,
        contextType: contextType as any,
        contextId,
        confidence: 1.0,
        detectionMethod: 'reply-to',
        evidence: `Reply-To pattern: ${email}`
      };
    }
    return null;
  }

  /**
   * Parse E-Mail Headers für Projekt-Informationen
   */
  private parseHeadersForProject(headers?: Record<string, string>): ProjectContext | null {
    if (!headers) return null;
    
    const projectId = headers['X-CeleroPress-Project-ID'];
    const contextType = headers['X-CeleroPress-Context-Type'];
    const contextId = headers['X-CeleroPress-Context-ID'];
    
    if (projectId && contextType && contextId) {
      return {
        projectId,
        contextType: contextType as any,
        contextId,
        confidence: 1.0,
        detectionMethod: 'header',
        evidence: 'Custom headers present'
      };
    }
    
    return null;
  }

  /**
   * Finde Projekt über Campaign-ID
   */
  private async findProjectByCampaign(campaignId: string): Promise<ProjectContext | null> {
    if (this.isServerSide) return null;
    
    try {
      // Suche nach Kampagne um Projekt-ID zu finden
      const campaignQuery = query(
        collection(db, 'pr_campaigns'),
        where('id', '==', campaignId)
      );
      
      const snapshot = await getDocs(campaignQuery);
      if (!snapshot.empty) {
        const campaign = snapshot.docs[0].data();
        if (campaign.projectId) {
          return {
            projectId: campaign.projectId,
            contextType: 'campaign',
            contextId: campaignId,
            confidence: 0.9,
            detectionMethod: 'campaign-link',
            evidence: `Campaign ${campaignId} linked to project`
          };
        }
      }
    } catch (error) {
      console.error('Campaign lookup failed:', error);
    }
    
    return null;
  }

  /**
   * Finde Projekt über Kunden-E-Mail
   */
  private async findProjectByCustomerEmail(email: string): Promise<ProjectContext | null> {
    if (this.isServerSide) return null;
    
    try {
      // Suche nach aktiven Projekten des Kunden
      const projectQuery = query(
        collection(db, 'projects'),
        where('customer.email', '==', email),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(projectQuery);
      if (!snapshot.empty) {
        const project = snapshot.docs[0].data();
        return {
          projectId: snapshot.docs[0].id,
          projectTitle: project.title,
          contextType: 'general',
          contextId: 'customer-email',
          confidence: 0.7,
          detectionMethod: 'customer',
          evidence: `Customer email ${email} matches active project`
        };
      }
    } catch (error) {
      console.error('Customer project lookup failed:', error);
    }
    
    return null;
  }

  /**
   * KI-basierte Projekt-Erkennung über Content
   */
  private async detectProjectByContent(emailData: IncomingEmailData): Promise<ProjectContext | null> {
    if (this.isServerSide) return null;
    
    try {
      // Hole aktive Projekte für die Organisation
      const activeProjects = await this.getActiveProjectsForOrganization(emailData.organizationId);
      
      if (activeProjects.length === 0) {
        return null; // Keine Projekte vorhanden
      }
      
      // Dynamischen Import für GeminiService verwenden
      const { geminiService } = await import('@/lib/ai/gemini-service');
      
      // KI-Analyse durchführen
      const analysis = await geminiService.analyzeEmailForProject({
        subject: emailData.subject,
        content: emailData.textContent,
        fromEmail: emailData.from.email,
        organizationId: emailData.organizationId,
        activeProjects: activeProjects.map(p => ({
          id: p.id,
          title: p.title,
          clientName: p.customer?.name,
          stage: p.currentStage
        }))
      });
      
      // Nur verwenden wenn Konfidenz hoch genug ist
      if (analysis.projectId && analysis.confidence > 0.6) {
        return {
          projectId: analysis.projectId,
          projectTitle: analysis.projectTitle || undefined,
          contextType: analysis.contextType as any,
          contextId: 'ai-analysis',
          confidence: analysis.confidence,
          detectionMethod: 'ai',
          evidence: `KI-Analyse: ${analysis.reasoning}`
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('AI-based project detection failed:', error);
      return null;
    }
  }
  
  /**
   * Holt aktive Projekte für eine Organisation
   */
  private async getActiveProjectsForOrganization(organizationId: string): Promise<any[]> {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        limit(20) // Begrenzt auf 20 Projekte für Performance
      );
      
      const snapshot = await getDocs(projectsQuery);
      const projects: any[] = [];
      
      snapshot.forEach(doc => {
        projects.push({ ...doc.data(), id: doc.id });
      });
      
      return projects;
      
    } catch (error) {
      console.error('Failed to get active projects:', error);
      return [];
    }
  }

  /**
   * Reichert Thread mit Projekt-Informationen an
   */
  async enrichThreadWithProject(threadId: string, projectContext: ProjectContext): Promise<void> {
    if (this.isServerSide) return;
    
    try {
      await updateDoc(doc(db, this.collectionName, threadId), {
        projectId: projectContext.projectId,
        projectTitle: projectContext.projectTitle,
        contextType: projectContext.contextType,
        projectContext: {
          confidence: projectContext.confidence,
          detectionMethod: projectContext.detectionMethod,
          detectedAt: serverTimestamp(),
          evidence: projectContext.evidence
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Thread enrichment failed:', error);
    }
  }

  /**
   * Verknüpft E-Mail manuell mit Projekt
   */
  async linkEmailToProject(
    threadId: string,
    projectId: string,
    method: 'manual' | 'automatic',
    confidence: number = 1.0,
    userId?: string
  ): Promise<void> {
    if (this.isServerSide) return;

    try {
      // Hole Projekt-Details
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projekt nicht gefunden');
      }
      
      const project = projectDoc.data();
      
      // Thread aktualisieren
      await updateDoc(doc(db, this.collectionName, threadId), {
        projectId,
        projectTitle: project.title,
        projectStage: project.currentStage,
        projectContext: {
          confidence,
          detectionMethod: method,
          detectedAt: serverTimestamp(),
          detectedBy: userId
        },
        updatedAt: serverTimestamp()
      });
      
      // TODO: Projekt-Kommunikations-Summary aktualisieren
      // await this.updateProjectCommunicationSummary(projectId);
      
    } catch (error) {
      console.error('Manual project linking failed:', error);
      throw error;
    }
  }
}

// Singleton Exports für Client und Server
export const threadMatcherService = new FlexibleThreadMatcherService(false); // Client-side
export const serverThreadMatcherService = new FlexibleThreadMatcherService(true); // Server-side