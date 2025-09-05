// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamFolderSidebar } from '@/components/inbox/TeamFolderSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { NotificationBell } from '@/components/inbox/NotificationBell';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { emailAddressService } from '@/lib/email/email-address-service';
import { getCustomerCampaignMatcher } from '@/lib/email/customer-campaign-matcher';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { notificationService } from '@/lib/email/notification-service-enhanced';
import { 
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  PencilSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  BugAntIcon,
  PlusIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  ListBulletIcon
} from '@heroicons/react/20/solid';

export default function InboxPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';
  
  // State
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  const [hasEmailAddresses, setHasEmailAddresses] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvingThreads, setResolvingThreads] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [organizationSidebarCollapsed, setOrganizationSidebarCollapsed] = useState(false);
  
  // State für Team-Ordner-Organisation
  const [selectedFolderType, setSelectedFolderType] = useState<'general' | 'team'>('general');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | undefined>();
  // Entfernt: customerCampaignMatcher (nicht mehr benötigt für Team-System)
  
  // NEU: State für Team-Features
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
  // Ref to track if we've already resolved threads
  const threadsResolvedRef = useRef(false);
  
  // Debug Info Type
  interface DebugInfo {
    emailAddresses?: any[];
    hasEmailAddresses?: boolean;
    emailAddressError?: any;
    listenersSetup?: boolean;
    organizationId?: string;
    selectedFolderType?: string;
    selectedTeamMemberId?: string;
    threadCount?: number;
    threads?: EmailThread[];
    threadError?: string;
    messageCount?: number;
    messages?: EmailMessage[];
    messageError?: string;
    setupError?: string;
    deferredThreadsResolved?: number;
    teamMembers?: any[];
    teamError?: string;
  }
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  
  // Real-time unread counts
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0,
    general: 0
  });

  // Firestore unsubscribe functions
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);

  // Initialize CustomerCampaignMatcher
  useEffect(() => {
    if (organizationId) {
      const matcher = getCustomerCampaignMatcher(organizationId);
      // Entfernt: setCustomerCampaignMatcher(matcher);
    }
  }, [organizationId]);

  // Load team members with fallback
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!organizationId) return;
      
      setLoadingTeam(true);
      try {

        const members = await teamMemberService.getByOrganization(organizationId);
        
        if (members.length === 0) {
          // Fallback: Create mock team members for development

          const mockMembers = [
            {
              id: '1',
              userId: user?.uid || '',
              displayName: user?.displayName || user?.email || 'Aktueller Benutzer',
              email: user?.email || 'user@example.com',
              role: 'owner',
              status: 'active',
              photoUrl: user?.photoURL || null,
              organizationId: organizationId
            },
            {
              id: '2',
              userId: 'mock-team-member-1',
              displayName: 'Max Mustermann',
              email: 'max@example.com',
              role: 'admin',
              status: 'active',
              photoUrl: null,
              organizationId: organizationId
            },
            {
              id: '3',
              userId: 'mock-team-member-2',
              displayName: 'Anna Schmidt',
              email: 'anna@example.com',
              role: 'member',
              status: 'active',
              photoUrl: null,
              organizationId: organizationId
            }
          ];
          setTeamMembers(mockMembers);
          setDebugInfo(prev => ({
            ...prev,
            teamMembers: mockMembers,
            teamError: 'Using mock data - no organization found'
          }));
        } else {
          setTeamMembers(members);
          setDebugInfo(prev => ({
            ...prev,
            teamMembers: members
          }));
        }
      } catch (error) {

        // Fallback bei Fehler
        const fallbackMember = {
          id: '1',
          userId: user?.uid || '',
          displayName: user?.displayName || user?.email || 'Aktueller Benutzer',
          email: user?.email || 'user@example.com',
          role: 'owner',
          status: 'active',
          photoUrl: user?.photoURL || null,
          organizationId: organizationId
        };
        setTeamMembers([fallbackMember]);
        setDebugInfo(prev => ({
          ...prev,
          teamMembers: [fallbackMember],
          teamError: error instanceof Error ? error.message : 'Unknown error'
        }));
      } finally {
        setLoadingTeam(false);
      }
    };

    loadTeamMembers();
  }, [organizationId, user]);

  // Resolve deferred threads when component mounts
  useEffect(() => {
    const resolveDeferredThreads = async () => {
      if (!user || !organizationId || threadsResolvedRef.current || !hasEmailAddresses) {
        return;
      }
      
      setResolvingThreads(true);

      
      try {
        const resolvedCount = await threadMatcherService.resolveDeferredThreads(organizationId);

        
        setDebugInfo(prev => ({
          ...prev,
          deferredThreadsResolved: resolvedCount
        }));
        
        threadsResolvedRef.current = true;
      } catch (error) {

      } finally {
        setResolvingThreads(false);
      }
    };
    
    // Verzögere die Thread-Resolution um sicherzustellen, dass E-Mails geladen sind
    const timer = setTimeout(() => {
      resolveDeferredThreads();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, organizationId, hasEmailAddresses]);

  // Check if user has email addresses configured
  useEffect(() => {
    const checkEmailAddresses = async () => {
      if (!user || !organizationId) return;
      
      try {
        console.log('🔍 Inbox: Loading email addresses for:', {
          organizationId,
          userId: user.uid
        });
        
        const addresses = await emailAddressService.getByOrganization(organizationId, user.uid);
        
        console.log('📬 Inbox: Email addresses found:', addresses);
        setEmailAddresses(addresses);
        setHasEmailAddresses(addresses.length > 0);
        
        // Update debug info
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          emailAddresses: addresses,
          hasEmailAddresses: addresses.length > 0
        }));
      } catch (error) {

        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          emailAddressError: error
        }));
      }
    };

    checkEmailAddresses();
  }, [user, organizationId]);

  // Load email data with real-time updates
  useEffect(() => {
    if (!user || !organizationId || !hasEmailAddresses) {
      setLoading(false);
      return;
    }


    setDebugInfo((prev: DebugInfo) => ({
      ...prev,
      listenersSetup: true,
      organizationId,
      selectedFolderType,
      selectedTeamMemberId
    }));

    // Clean up previous listeners
    unsubscribes.forEach(unsubscribe => unsubscribe());
    
    const newUnsubscribes: Unsubscribe[] = [];
    
    // Set up real-time listeners
    setupRealtimeListeners(newUnsubscribes);
    
    setUnsubscribes(newUnsubscribes);

    // Cleanup on unmount
    return () => {
      newUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, organizationId, selectedFolderType, selectedTeamMemberId, hasEmailAddresses, resolvingThreads, setupRealtimeListeners, unsubscribes]);

  const setupRealtimeListeners = (unsubscribes: Unsubscribe[]) => {
    setLoading(true);
    setError(null);

    try {
      // Team-Ordner Mode
      setupTeamFolderListeners(unsubscribes);

    } catch (error: any) {

      setError('Fehler beim Einrichten der Echtzeit-Updates');
      setLoading(false);
      setDebugInfo((prev: DebugInfo) => ({
        ...prev,
        setupError: error.message
      }));
    }
  };


  const setupTeamFolderListeners = (unsubscribes: Unsubscribe[]) => {
    console.log('🎯 Setting up TEAM FOLDER listeners:', {
      folderType: selectedFolderType,
      teamMemberId: selectedTeamMemberId
    });

    // 1. Basis-Query für Threads
    let threadsQuery = query(
      collection(db, 'email_threads'),
      where('organizationId', '==', organizationId),
      orderBy('lastMessageAt', 'desc'),
      limit(100)
    );

    // HINWEIS: Für Team-Ordner verwenden wir die Basis-Query und filtern client-seitig,
    // da assignedToUserId noch nicht in allen bestehenden Threads vorhanden ist

    const threadsUnsubscribe = onSnapshot(
      threadsQuery,
      async (snapshot) => {

        let threadsData: EmailThread[] = [];
        
        snapshot.forEach((doc) => {
          threadsData.push({ ...doc.data(), id: doc.id } as EmailThread);
        });

        // Für "general" folder: Filtere alle Threads ohne Team-Zuweisung
        // UND schließe gesendete E-Mail Threads aus (sent_ prefix)
        if (selectedFolderType === 'general') {
          threadsData = threadsData.filter(thread => {
            const assignedTo = (thread as any).assignedToUserId || (thread as any).assignedTo;
            return !assignedTo && !(thread.id && thread.id.startsWith('sent_'));
          });
        } else {
          // Auch in anderen Ordnern gesendete Threads ausschließen
          threadsData = threadsData.filter(thread => 
            !(thread.id && thread.id.startsWith('sent_'))
          );
        }
        

        setThreads(threadsData);
        
        // Update unread counts
        await updateTeamUnreadCounts(threadsData);
        
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          threadCount: threadsData.length,
          threads: threadsData
        }));
      },
      (error) => {

        setError('Fehler beim Laden der E-Mail-Threads');
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          threadError: error.message
        }));
      }
    );
    
    unsubscribes.push(threadsUnsubscribe);

    // 2. Listen to messages
    let messagesQuery = query(
      collection(db, 'email_messages'),
      where('organizationId', '==', organizationId),
      where('folder', '==', 'inbox'), // Nur Inbox-Nachrichten für Kunden/Kampagnen
      orderBy('receivedAt', 'desc'),
      limit(100)
    );

    // HINWEIS: Für Team-Ordner verwenden wir die Basis-Query und filtern client-seitig,
    // da assignedToUserId noch nicht in allen bestehenden Messages vorhanden ist

    const messagesUnsubscribe = onSnapshot(
      messagesQuery,
      async (snapshot) => {

        let messagesData: EmailMessage[] = [];
        
        snapshot.forEach((doc) => {
          messagesData.push({ ...doc.data(), id: doc.id } as EmailMessage);
        });

        // Client-seitige Filterung für Team-Ordner
        if (selectedFolderType === 'general') {
          // Allgemeine Anfragen: Nachrichten ohne Team-Zuweisung
          messagesData = messagesData.filter(msg => {
            const assignedTo = (msg as any).assignedToUserId || (msg as any).assignedTo;
            return !assignedTo;
          });
        } else if (selectedFolderType === 'team' && selectedTeamMemberId) {
          // Team-Ordner: Nur Nachrichten für dieses Team-Mitglied
          messagesData = messagesData.filter(msg => {
            const assignedTo = (msg as any).assignedToUserId || (msg as any).assignedTo;
            return assignedTo === selectedTeamMemberId;
          });
        }

        // Keine automatische Zuordnung mehr nötig im Team-System
        // E-Mails werden manuell über die UI zugewiesen
        
        setEmails(messagesData);
        setLoading(false);
        
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          messageCount: messagesData.length,
          messages: messagesData
        }));
      },
      (error) => {

        setError('Fehler beim Laden der E-Mails');
        setLoading(false);
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          messageError: error.message
        }));
      }
    );
    
    unsubscribes.push(messagesUnsubscribe);
  };

  const updateUnreadCounts = async (threadsData: EmailThread[]) => {
    // Calculate unread counts from threads
    const counts = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      general: 0
    };

    // In Customer/Campaign mode, we don't use classic folder counts anymore
    // This function is kept for backward compatibility but can be removed
    
    setUnreadCounts(counts);
  };

  const updateTeamUnreadCounts = async (threadsData: EmailThread[]) => {
    const counts: Record<string, number> = {
      general: 0
    };

    // Zähle ungelesene Nachrichten für Team-Ordner
    for (const thread of threadsData) {
      if (thread.unreadCount > 0) {
        // Allgemeine Anfragen: alle E-Mails ohne spezifische Zuweisung
        if (!thread.assignedToUserId) {
          counts.general += thread.unreadCount;
        }
        
        // Team-Mitglied Ordner: zugewiesene E-Mails
        if (thread.assignedToUserId) {
          counts[`team_${thread.assignedToUserId}`] = (counts[`team_${thread.assignedToUserId}`] || 0) + thread.unreadCount;
          // E-Mail auch in Allgemeinen Anfragen zählen (sichtbar für alle)
          counts.general += thread.unreadCount;
        }
      }
    }

    setUnreadCounts(prev => ({ ...prev, ...counts }));
  };

  // Manually resolve deferred threads
  const handleResolveThreads = async () => {
    setResolvingThreads(true);
    try {
      const resolvedCount = await threadMatcherService.resolveDeferredThreads(organizationId);
      alert(`${resolvedCount} Threads wurden erstellt!`);
      
      setDebugInfo(prev => ({
        ...prev,
        deferredThreadsResolved: resolvedCount
      }));
    } catch (error) {

      alert('Fehler beim Erstellen der Threads');
    } finally {
      setResolvingThreads(false);
    }
  };

  // Refresh inbox
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Keine Cache-Bereinigung mehr nötig im Team-System
      
      // Trigger listeners to refresh
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes: Unsubscribe[] = [];
      setupRealtimeListeners(newUnsubscribes);
      setUnsubscribes(newUnsubscribes);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  // Create test email for development
  const createTestEmail = async () => {
    if (!emailAddresses.length) {
      alert('Keine E-Mail-Adressen konfiguriert!');
      return;
    }

    try {

      const defaultAddress = emailAddresses.find(addr => addr.isDefault) || emailAddresses[0];
      
      // In Customer/Campaign Mode immer inbox
      let folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam' = 'inbox';
      let isDraft = false;
      
      // Create a test thread first
      const testThread = await threadMatcherService.findOrCreateThread({
        messageId: `test-${Date.now()}@celeropress.de`,
        subject: `Test E-Mail - ${new Date().toLocaleString('de-DE')}`,
        from: { email: 'test@example.com', name: 'Test Sender' },
        to: [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        organizationId,
        inReplyTo: null,
        references: []
      });

      if (!testThread.success || !testThread.threadId) {
        throw new Error('Failed to create test thread');
      }

      // Füge Kunden/Kampagnen-Zuordnung hinzu
      // Im Team-System wird keine automatische Kunden/Kampagnen-Zuordnung mehr vorgenommen
      // E-Mails werden in allgemeine Anfragen erstellt und können dann zugewiesen werden
      let assignedToUserId = undefined;
      
      if (selectedFolderType === 'team' && selectedTeamMemberId) {
        assignedToUserId = selectedTeamMemberId;
      }

      // Create test email message
      const testMessageData: Partial<EmailMessage> = {
        messageId: `test-${Date.now()}@celeropress.de`,
        threadId: testThread.threadId,
        from: { email: 'test@example.com', name: 'Test Sender' },
        to: [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        subject: `Test E-Mail - ${new Date().toLocaleString('de-DE')}`,
        textContent: `Dies ist eine Test-E-Mail zur Überprüfung der Inbox-Funktionalität.\n\nDiese E-Mail wurde automatisch generiert.`,
        htmlContent: `<p>Dies ist eine Test-E-Mail zur Überprüfung der Inbox-Funktionalität.</p><p>Diese E-Mail wurde automatisch generiert.</p>`,
        snippet: `Dies ist eine Test-E-Mail...`,
        folder: folder,
        isRead: isDraft,
        isStarred: false,
        isArchived: false,
        isDraft: isDraft,
        labels: ['test'],
        importance: 'normal',
        emailAccountId: defaultAddress.id,
        organizationId,
        userId: user?.uid || '',
        receivedAt: serverTimestamp() as Timestamp,
        sentAt: undefined,
        attachments: [],
        // NEU: Team-Zuordnung (wird als benutzerdefiniertes Feld hinzugefügt)
        ...(assignedToUserId && { assignedToUserId }),
        folderType: 'general' // Alle E-Mails starten in allgemeinen Anfragen
      };
      
      const testMessage = await emailMessageService.create(testMessageData);


      alert(`Test-E-Mail wurde erstellt!`);
    } catch (error: any) {

      alert(`Fehler beim Erstellen der Test-E-Mail: ${error.message}`);
    }
  };

  // Handle manual mark as read for specific email
  const handleMarkEmailAsRead = async (emailId: string) => {
    try {
      await emailMessageService.markAsRead(emailId);
      
      // Update local state
      setEmails(prevEmails =>
        prevEmails.map(email =>
          email.id === emailId ? { ...email, isRead: true } : email
        )
      );
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // Handle thread selection
  const handleThreadSelect = async (thread: EmailThread) => {

    setSelectedThread(thread);
    setSelectedEmail(null); // Reset selected email when switching threads
    
    try {
      // Load all messages for this thread
      let threadMessages: EmailMessage[] = [];
      
      // Load all messages in thread
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('threadId', '==', thread.id!),
        orderBy('receivedAt', 'asc')
      );
      
      const snapshot = await getDocs(messagesQuery);
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        threadMessages.push({ ...doc.data(), id: doc.id } as EmailMessage);
      });
      

      
      // Update the global emails state with thread messages
      if (threadMessages.length > 0) {
        setEmails(prevEmails => {
          // Remove existing messages for this thread and add new ones
          const otherMessages = prevEmails.filter(email => email.threadId !== thread.id);
          return [...otherMessages, ...threadMessages];
        });
        
        // Select the latest email in the thread
        const latestEmail = threadMessages[threadMessages.length - 1];
        setSelectedEmail(latestEmail);

        
        // DON'T automatically mark as read - only when user explicitly views email
        // Thread selection should not mark emails as read
      } else {
        // No messages found for thread
        setSelectedEmail(null);
      }
    } catch (error) {

      setError('Fehler beim Laden der Thread-Nachrichten');
    }
  };

  // Handle email actions
  const handleReply = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('reply');
    setShowCompose(true);
  };

  const handleForward = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('forward');
    setShowCompose(true);
  };

  const handleArchive = async (emailId: string) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);

      
      // Speichere aktuelle Auswahl
      const currentThreadId = selectedThread?.id;
      const currentEmailId = selectedEmail?.id;
      
      await emailMessageService.archive(emailId);
      
      // Wenn die archivierte E-Mail die ausgewählte war
      if (currentEmailId === emailId) {
        setSelectedEmail(null);
        
        // Prüfe ob es noch andere E-Mails im Thread gibt
        const remainingEmails = emails.filter(e => 
          e.threadId === currentThreadId && e.id !== emailId && !e.isArchived
        );
        
        if (remainingEmails.length === 0) {
          // Kein Thread mehr vorhanden, alles zurücksetzen
          setSelectedThread(null);
        } else {
          // Wähle die nächste E-Mail im Thread
          const nextEmail = remainingEmails[remainingEmails.length - 1];
          setSelectedEmail(nextEmail);
        }
      }
      

    } catch (error) {

      alert('Fehler beim Archivieren der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);

      
      // Speichere aktuelle Auswahl
      const currentThreadId = selectedThread?.id;
      const currentEmailId = selectedEmail?.id;
      
      // Lösche die E-Mail
      await emailMessageService.delete(emailId);
      
      // Wenn die gelöschte E-Mail die ausgewählte war
      if (currentEmailId === emailId) {

        setSelectedEmail(null);
        
        // In Customer/Campaign mode, check remaining emails

        
        // In anderen Ordnern: Prüfe verbleibende E-Mails
        const remainingEmails = emails.filter(e => 
          e.threadId === currentThreadId && e.id !== emailId
        );
        

        
        if (remainingEmails.length === 0) {
          // Kein Thread mehr vorhanden, Thread auch aus Firestore löschen

          
          if (currentThreadId) {
            try {
              // Lösche den Thread direkt aus Firestore
              await deleteDoc(doc(db, 'email_threads', currentThreadId));

            } catch (error) {

            }
          }
          
          setSelectedThread(null);
        } else {
          // Wähle die nächste E-Mail im Thread
          const nextEmail = remainingEmails[remainingEmails.length - 1];

          setSelectedEmail(nextEmail);
        }
      }
      

    } catch (error) {

      alert('Fehler beim Löschen der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStar = async (emailId: string, starred: boolean) => {
    try {
      await emailMessageService.toggleStar(emailId);
    } catch (error) {

    }
  };

  // NEU: Handle thread assignment
  const handleThreadAssign = async (threadId: string, userId: string | null) => {
    try {
      // Optimistic update - sofort lokale Thread-Liste aktualisieren
      setThreads(prevThreads => 
        prevThreads.map(thread => 
          thread.id === threadId 
            ? { ...thread, assignedTo: userId } as any
            : thread
        )
      );

      // Update selected thread if it's the one being assigned
      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, assignedTo: userId } as any : prev);
      }

      const assignedBy = user?.uid || '';
      const assignedByName = user?.displayName || user?.email || 'Unbekannt';
      
      // Update thread assignment in database
      await threadMatcherService.assignThread(threadId, userId, assignedBy);
      
      // Send notification if assigning to someone
      if (userId && userId !== user?.uid) {
        const thread = threads.find(t => t.id === threadId);
        if (thread) {
          await notificationService.sendAssignmentNotification(
            { ...thread, assignedTo: userId } as any,
            userId,
            assignedBy,
            assignedByName,
            organizationId
          );
        }
      }
      

    } catch (error) {

      
      // Rollback optimistic update bei Fehler
      setThreads(prevThreads => 
        prevThreads.map(thread => 
          thread.id === threadId 
            ? { ...thread, assignedTo: (thread as any).assignedTo } // Zurück zum ursprünglichen Wert
            : thread
        )
      );
      
      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, assignedTo: (prev as any).assignedTo } : prev);
      }
      
      alert('Fehler beim Zuweisen des Threads');
    }
  };

  // NEU: Handle thread status change
  const handleThreadStatusChange = async (threadId: string, status: 'active' | 'waiting' | 'resolved' | 'archived' | undefined) => {
    if (!status) return;
    
    try {
      const changedBy = user?.uid || '';
      const changedByName = user?.displayName || user?.email || 'Unbekannt';
      const thread = threads.find(t => t.id === threadId);
      
      // Update thread status
      await threadMatcherService.updateThreadStatus(threadId, status);
      
      // Send notification if thread is assigned to someone else
      if (thread) {
        await notificationService.sendStatusChangeNotification(
          thread,
          status,
          changedBy,
          changedByName,
          organizationId
        );
      }
      

      
      // Bei Archivierung: Thread aus der Liste entfernen
      if (status === 'archived') {
        setSelectedThread(null);
        setSelectedEmail(null);
      }
    } catch (error) {

      alert('Fehler beim Ändern des Thread-Status');
    }
  };

  // NEU: Handle thread priority change
  const handleThreadPriorityChange = async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!selectedThread) return;
    
    try {
      await threadMatcherService.updateThreadPriority(selectedThread.id!, priority);

    } catch (error) {

      alert('Fehler beim Ändern der Thread-Priorität');
    }
  };

  // NEU: Handle thread category change (AI-based assignment)
  const handleThreadCategoryChange = async (category: string, assignee?: string) => {
    if (!selectedThread) return;
    
    try {
      // If AI suggests an assignee, try to find matching team member
      if (assignee) {
        const matchingMember = teamMembers.find(member => 
          member.displayName.toLowerCase().includes(assignee.toLowerCase()) ||
          member.email.toLowerCase().includes(assignee.toLowerCase())
        );
        
        if (matchingMember) {
          await handleThreadAssign(selectedThread.id!, matchingMember.userId);
        }
      }
      
      // Store category in thread metadata (could be extended)

      
    } catch (error) {

    }
  };

  // Handle folder selection from sidebar
  const handleFolderSelect = (type: 'general' | 'team', id?: string) => {

    setSelectedFolderType(type);
    setSelectedTeamMemberId(type === 'team' ? id : undefined);
    setSelectedThread(null);
    setSelectedEmail(null);
  };


  // Filter threads based on folder selection and search
  const filteredThreads = threads.filter(thread => {
    // Erstens: Filter nach Ordner-Auswahl
    const assignedTo = (thread as any).assignedTo || (thread as any).assignedToUserId;
    
    if (selectedFolderType === 'general') {
      // General: Zeige nur Threads ohne Zuweisung
      if (assignedTo) {
        return false;
      }
    } else if (selectedFolderType === 'team' && selectedTeamMemberId) {
      // Team: Zeige nur Threads, die diesem Team-Mitglied zugewiesen sind
      if (assignedTo !== selectedTeamMemberId) {
        return false;
      }
    }
    
    // Zweitens: Filter nach Suchbegriff
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(searchLower) ||
      thread.participants.some(p => 
        p.email.toLowerCase().includes(searchLower) ||
        p.name?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Get emails for selected thread
  const threadEmails = selectedThread 
    ? emails.filter(e => e.threadId === selectedThread.id)
        .sort((a, b) => {
          const aTime = a.receivedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.receivedAt?.toDate?.()?.getTime() || 0;
          return aTime - bTime;
        })
    : [];

  // Get folder display name
  const getFolderDisplayName = () => {
    if (selectedFolderType === 'general') return 'Allgemeine Anfragen';
    if (selectedFolderType === 'team' && selectedTeamMemberId) {
      const member = teamMembers.find(m => m.userId === selectedTeamMemberId);
      return member?.displayName || 'Team-Mitglied';
    }
    return 'E-Mails';
  };

  // Show empty state if no email addresses configured
  if (!loading && !hasEmailAddresses) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-md">
          <InboxIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Keine E-Mail-Adressen konfiguriert
          </h2>
          <p className="text-gray-500 mb-6">
            Um E-Mails empfangen zu können, müssen Sie zuerst eine E-Mail-Adresse einrichten.
          </p>
          <Button 
            href="/dashboard/settings/email"
            className="bg-primary hover:bg-primary-hover text-white"
          >
            E-Mail-Adresse einrichten
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] bg-white flex flex-col">
      {/* Toolbar / Funktionsbar */}
      <div className="border-b bg-gray-50 px-4 py-5 mt-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Toggle Buttons, Search, New Email & Refresh */}
          <div className="flex items-center gap-3 flex-1">
            {/* Toggle Buttons */}
            <div className="flex items-center gap-1">
              {/* Organization Sidebar Toggle */}
              <Button
                plain
                onClick={() => setOrganizationSidebarCollapsed(!organizationSidebarCollapsed)}
                className="p-2"
                title={organizationSidebarCollapsed ? 'Ordner-Sidebar anzeigen' : 'Ordner-Sidebar ausblenden'}
              >
                <FolderIcon className="h-5 w-5 text-gray-400" />
                {organizationSidebarCollapsed ? (
                  <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronLeftIcon className="h-3 w-3 text-gray-400" />
                )}
              </Button>
              
              {/* Thread List Sidebar Toggle */}
              <Button
                plain
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2"
                title={sidebarCollapsed ? 'Thread-Liste anzeigen' : 'Thread-Liste ausblenden'}
              >
                <ListBulletIcon className="h-5 w-5 text-gray-400" />
                {sidebarCollapsed ? (
                  <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronLeftIcon className="h-3 w-3 text-gray-400" />
                )}
              </Button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="E-Mails durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* New Email Button */}
            <Button 
              onClick={() => {
                setComposeMode('new');
                setReplyToEmail(null);
                setShowCompose(true);
              }}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              <PencilSquareIcon className="h-4 w-4 mr-2" />
              <span className="whitespace-nowrap">Neue E-Mail</span>
            </Button>
            
            {/* Refresh Button */}
            <Button
              plain
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2"
              title="Aktualisieren"
            >
              <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell
              onNotificationClick={(notification) => {
                // Navigate to thread when notification is clicked
                if (notification.threadId) {
                  const thread = threads.find(t => t.id === notification.threadId);
                  if (thread) {
                    handleThreadSelect(thread);
                  }
                }
              }}
            />
            
            
            <Button
              plain
              className="p-2"
              title="Ansichtsoptionen"
            >
              <Squares2X2Icon className="h-5 w-5 text-gray-400" />
            </Button>
            
            <Button
              plain
              className="p-2"
              title="Einstellungen"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
            </Button>

            {/* Debug controls for development */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <div className="border-l mx-2 h-6" />
                <Button
                  plain
                  onClick={createTestEmail}
                  className="text-xs p-1"
                  title="Test-E-Mail erstellen"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
                <Button
                  plain
                  onClick={handleResolveThreads}
                  className="text-xs p-1"
                  title="Threads manuell erstellen"
                  disabled={resolvingThreads}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${resolvingThreads ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  plain
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs p-1"
                  title="Debug-Info anzeigen"
                >
                  <BugAntIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Team Folder Sidebar */}
        {!organizationSidebarCollapsed && (
          <TeamFolderSidebar
            selectedFolderId={selectedTeamMemberId}
            selectedFolderType={selectedFolderType}
            onFolderSelect={handleFolderSelect}
            unreadCounts={unreadCounts}
            organizationId={organizationId}
          />
        )}

        {/* Thread List */}
        {!sidebarCollapsed && (
          <div className="w-96 border-r bg-gray-50 flex flex-col">
          {/* Folder Header */}
          <div className="px-4 py-2 border-b bg-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700">
              {getFolderDisplayName()}
              {filteredThreads.length > 0 && (
                <span className="text-gray-500 font-normal ml-2">
                  ({filteredThreads.length})
                </span>
              )}
            </h3>
            {resolvingThreads && (
              <div className="flex items-center text-xs text-gray-500">
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                Threads werden erstellt...
              </div>
            )}
          </div>

          {/* Debug Info */}
          {showDebug && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-xs">
              <h4 className="font-bold mb-2">Debug Info:</h4>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Email List */}
          <EmailList
            threads={filteredThreads}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            loading={loading || resolvingThreads}
            onStar={handleStar}
            onAssign={handleThreadAssign}
            organizationId={organizationId}
          />
          </div>
        )}

        {/* Email Viewer */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedThread && threadEmails.length > 0 ? (
            <EmailViewer
              thread={selectedThread}
              emails={threadEmails}
              selectedEmail={selectedEmail}
              onReply={handleReply}
              onForward={handleForward}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onStar={handleStar}
              onMarkAsRead={handleMarkEmailAsRead}
              onStatusChange={handleThreadStatusChange}
              onAssignmentChange={handleThreadAssign}
              onPriorityChange={handleThreadPriorityChange}
              onCategoryChange={handleThreadCategoryChange}
              organizationId={organizationId}
              teamMembers={teamMembers}
              showAI={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <InboxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {loading ? 'E-Mails werden geladen...' : 'Keine E-Mail ausgewählt'}
                </p>
                <p className="text-sm mt-1">
                  {!loading && threads.length === 0 
                    ? 'Keine E-Mails in diesem Ordner' 
                    : 'Wählen Sie eine Konversation aus der Liste'}
                </p>
                {!loading && threads.length === 0 && hasEmailAddresses && (
                  <div className="mt-6">
                    <p className="text-xs text-gray-400 mb-3">
                      Warten Sie auf eingehende E-Mails oder senden Sie eine Test-E-Mail
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                      <Button 
                        onClick={createTestEmail}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Test-E-Mail erstellen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmail
          organizationId={organizationId}
          mode={composeMode}
          replyToEmail={replyToEmail}
          onClose={() => {
            setShowCompose(false);
            setReplyToEmail(null);
          }}
          onSend={() => {
            setShowCompose(false);
            setReplyToEmail(null);
            // New email will appear automatically through real-time listener
          }}
        />
      )}
    </div>
  );
}