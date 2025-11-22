// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Button } from '@/components/ui/button';
import { TeamFolderSidebar } from '@/components/inbox/TeamFolderSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { emailAddressService } from '@/lib/email/email-address-service';
import { getCustomerCampaignMatcher } from '@/lib/email/customer-campaign-matcher';
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
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import {
  PencilSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  ListBulletIcon
} from '@heroicons/react/20/solid';
import { toastService } from '@/lib/utils/toast';

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
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvingThreads, setResolvingThreads] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [organizationSidebarCollapsed, setOrganizationSidebarCollapsed] = useState(false);
  
  // State für Team-Ordner-Organisation
  const [selectedFolderType, setSelectedFolderType] = useState<'general' | 'team'>('general');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | undefined>();
  const [selectedMailboxEmail, setSelectedMailboxEmail] = useState<string | undefined>();
  // Entfernt: customerCampaignMatcher (nicht mehr benötigt für Team-System)
  
  // Ref to track if we've already resolved threads
  const threadsResolvedRef = useRef(false);
  
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

  // Resolve deferred threads when component mounts
  useEffect(() => {
    const resolveDeferredThreads = async () => {
      if (!user || !organizationId || threadsResolvedRef.current || !hasEmailAddresses) {
        return;
      }
      
      setResolvingThreads(true);

      
      try {
        const resolvedCount = await threadMatcherService.resolveDeferredThreads(organizationId);
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

        const addresses = await emailAddressService.getByOrganization(organizationId, user.uid);

        setEmailAddresses(addresses);
        setHasEmailAddresses(addresses.length > 0);
      } catch (error) {
        console.error('Error loading email addresses:', error);
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
  }, [user, organizationId, selectedFolderType, selectedTeamMemberId, hasEmailAddresses, resolvingThreads]);

  const setupRealtimeListeners = (unsubscribes: Unsubscribe[]) => {
    setLoading(true);
    setError(null);

    try {
      // Team-Ordner Mode
      setupTeamFolderListeners(unsubscribes);

    } catch (error: any) {
      console.error('Setup error:', error);
      toastService.error('Fehler beim Einrichten der Echtzeit-Updates');
      setError('Fehler beim Einrichten der Echtzeit-Updates');
      setLoading(false);
    }
  };


  const setupTeamFolderListeners = (unsubscribes: Unsubscribe[]) => {

    // 1. Basis-Query für Threads (OHNE orderBy, um Index-Fehler zu vermeiden)
    let threadsQuery = query(
      collection(db, 'email_threads'),
      where('organizationId', '==', organizationId),
      limit(100)
    );

    const threadsUnsubscribe = onSnapshot(
      threadsQuery,
      async (snapshot) => {
        let threadsData: EmailThread[] = [];

        snapshot.forEach((doc) => {
          threadsData.push({ ...doc.data(), id: doc.id } as EmailThread);
        });

        console.log('🔍 [DEBUG] Alle geladenen Threads:', threadsData.map(t => ({
          id: t.id,
          subject: t.subject,
          projectId: (t as any).projectId,
          domainId: (t as any).domainId
        })));

        // Domain-Postfach: Filtere nach domainId UND !projectId
        if (selectedFolderType === 'general' && selectedTeamMemberId) {
          console.log('🔍 [DEBUG] Domain-Filter aktiv für:', selectedTeamMemberId);
          threadsData = threadsData.filter(thread => {
            const domainId = (thread as any).domainId;
            const projectId = (thread as any).projectId;
            const matches = domainId === selectedTeamMemberId && !projectId;
            console.log('🔍 [DEBUG] Thread:', thread.subject, '- domainId:', domainId, 'projectId:', projectId, 'matches:', matches);
            return matches;
          });
        }
        // Projekt-Postfach: Filtere nach projectId
        else if (selectedFolderType === 'team' && selectedTeamMemberId) {
          console.log('🔍 [DEBUG] Project-Filter aktiv für:', selectedTeamMemberId);
          threadsData = threadsData.filter(thread => {
            const projectId = (thread as any).projectId;
            const matches = projectId === selectedTeamMemberId;
            console.log('🔍 [DEBUG] Thread:', thread.subject, '- projectId:', projectId, 'matches:', matches);
            return matches;
          });
        }

        console.log('🔍 [DEBUG] Gefilterte Threads:', threadsData.length);

        // Berechne unreadCounts für ALLE Mailboxen (nicht nur gefilterte)
        // Zähle Threads mit ungelesenen Nachrichten (nicht die Summe der Messages!)
        const counts: Record<string, number> = {};
        snapshot.forEach((doc) => {
          const thread = doc.data() as EmailThread;
          const hasUnread = (thread.unreadCount || 0) > 0;

          // Nur Threads mit ungelesenen Nachrichten zählen
          if (hasUnread) {
            // Project-Mailbox
            if ((thread as any).projectId) {
              const projectId = (thread as any).projectId;
              counts[projectId] = (counts[projectId] || 0) + 1;
            }
            // Domain-Mailbox (nur wenn KEIN projectId)
            else if ((thread as any).domainId) {
              const domainId = (thread as any).domainId;
              counts[domainId] = (counts[domainId] || 0) + 1;
            }
          }
        });
        console.log('🔍 [DEBUG] Berechnete unreadCounts (Threads mit neuen Nachrichten):', counts);
        setUnreadCounts(counts);

        // Client-seitig nach lastMessageAt sortieren
        threadsData.sort((a, b) => {
          const aTime = a.lastMessageAt?.toMillis?.() || 0;
          const bTime = b.lastMessageAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setThreads(threadsData);
        setLoading(false);
      },
      (error) => {
        console.error('Thread load error:', error);
        toastService.error('Fehler beim Laden der E-Mail-Threads');
        setError('Fehler beim Laden der E-Mail-Threads');
        setLoading(false);
      }
    );

    unsubscribes.push(threadsUnsubscribe);

    // 2. Messages Query (filter trash client-side to avoid index)
    let messagesQuery = query(
      collection(db, 'email_messages'),
      where('organizationId', '==', organizationId),
      limit(100)
    );

    const messagesUnsubscribe = onSnapshot(
      messagesQuery,
      async (snapshot) => {
        let messagesData: EmailMessage[] = [];

        snapshot.forEach((doc) => {
          const message = { ...doc.data(), id: doc.id } as EmailMessage;
          // Filter out trash messages client-side
          if (message.folder !== 'trash') {
            messagesData.push(message);
          }
        });

        // Filtere nach Postfach-Typ
        if (selectedFolderType === 'general' && selectedTeamMemberId) {
          // Domain-Mailbox: NUR Emails die KEIN projectId haben!
          messagesData = messagesData.filter(msg => {
            const domainId = (msg as any).domainId;
            const projectId = (msg as any).projectId;
            return domainId === selectedTeamMemberId && !projectId;
          });
        } else if (selectedFolderType === 'team' && selectedTeamMemberId) {
          // Project-Mailbox: NUR Emails die ein projectId haben
          messagesData = messagesData.filter(msg => {
            const projectId = (msg as any).projectId;
            return projectId === selectedTeamMemberId;
          });
        }

        setEmails(messagesData);
        setLoading(false);
      },
      (error) => {
        console.error('Messages load error:', error);
        toastService.error('Fehler beim Laden der E-Mails');
        setError('Fehler beim Laden der E-Mails');
        setLoading(false);
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
      toastService.success(`${resolvedCount} Threads wurden erstellt`);
    } catch (error) {
      console.error('Error resolving threads:', error);
      toastService.error('Fehler beim Erstellen der Threads');
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
      toastService.error('Keine E-Mail-Adressen konfiguriert');
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


      toastService.success('Test-E-Mail wurde erstellt');
    } catch (error: any) {

      toastService.error(`Fehler beim Erstellen der Test-E-Mail: ${error.message}`);
    }
  };

  // Handle thread selection
  const handleThreadSelect = async (thread: EmailThread) => {
    setSelectedThread(thread);
    setSelectedEmail(null); // Reset selected email when switching threads

    try {
      // Load all messages for this thread
      let threadMessages: EmailMessage[] = [];

      // Load all messages in thread (filter trash client-side to avoid index)
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('threadId', '==', thread.id!),
        orderBy('receivedAt', 'asc')
      );

      const snapshot = await getDocs(messagesQuery);
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const message = { ...doc.data(), id: doc.id } as EmailMessage;
        // Filter out trash messages client-side
        if (message.folder !== 'trash') {
          threadMessages.push(message);
        }
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

        // Mark thread as read
        if (thread.unreadCount && thread.unreadCount > 0) {
          await threadMatcherService.markThreadAsRead(thread.id!);

          // Mark all unread messages in thread as read
          for (const message of threadMessages) {
            if (!message.isRead && message.id) {
              await emailMessageService.markAsRead(message.id);
            }
          }
        }
      } else {
        // No messages found for thread
        console.warn('⚠️ No messages found for thread:', thread.id);
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('❌ Error loading thread messages:', error);
      console.error('Thread ID:', thread.id);
      console.error('Error details:', error instanceof Error ? error.message : error);
      const errorMsg = 'Fehler beim Laden der Thread-Nachrichten: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler');
      toastService.error(errorMsg);
      setError(errorMsg);
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

      // Success Toast
      toastService.success('E-Mail archiviert');

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
      console.error('Archive error:', error);
      toastService.error('Fehler beim Archivieren der E-Mail');
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

      // Success Toast
      toastService.success('E-Mail gelöscht');

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
      console.error('Delete error:', error);
      toastService.error('Fehler beim Löschen der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStar = async (emailId: string, starred: boolean) => {
    try {
      await emailMessageService.toggleStar(emailId);

      // Success Toast (kurz und kompakt)
      toastService.success(starred ? 'Markiert' : 'Markierung entfernt');

      // Update thread isStarred wenn mindestens eine Email im Thread starred ist
      if (selectedThread?.id) {
        const threadRef = doc(db, 'email_threads', selectedThread.id);
        await updateDoc(threadRef, {
          isStarred: starred,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toastService.error('Fehler beim Markieren');
    }
  };

  // Handle thread status change
  const handleThreadStatusChange = async (threadId: string, status: 'active' | 'waiting' | 'resolved' | 'archived' | undefined) => {
    if (!status) return;
    
    try {
      const changedBy = user?.uid || '';
      const changedByName = user?.displayName || user?.email || 'Unbekannt';
      const thread = threads.find(t => t.id === threadId);
      
      // Update thread status
      await threadMatcherService.updateThreadStatus(threadId, status);

      // Success Toast
      const statusLabels = {
        active: 'Aktiv',
        waiting: 'Wartend',
        resolved: 'Gelöst',
        archived: 'Archiviert'
      };
      toastService.success(`Status geändert: ${statusLabels[status]}`);

      // Bei Archivierung: Thread aus der Liste entfernen
      if (status === 'archived') {
        setSelectedThread(null);
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Status change error:', error);
      toastService.error('Fehler beim Ändern des Thread-Status');
    }
  };


  // Handle folder selection from sidebar
  const handleFolderSelect = (type: 'general' | 'team', id?: string, emailAddress?: string) => {
    setSelectedFolderType(type);
    setSelectedTeamMemberId(id);
    setSelectedMailboxEmail(emailAddress);
    setSelectedThread(null);
    setSelectedEmail(null);
  };


  // Filter threads based on folder selection and search
  const filteredThreads = threads.filter(thread => {
    // Filter nach Suchbegriff
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
        // Dedupliziere nach messageId (falls Backend-Duplikate existieren)
        .filter((email, index, self) =>
          index === self.findIndex(e => e.messageId === email.messageId)
        )
        .sort((a, b) => {
          const aTime = a.receivedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.receivedAt?.toDate?.()?.getTime() || 0;
          return aTime - bTime;
        })
    : [];

  // Copy email to clipboard
  const copyEmailToClipboard = async () => {
    if (selectedMailboxEmail) {
      try {
        await navigator.clipboard.writeText(selectedMailboxEmail);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
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
          {/* Left side - Toggle Buttons */}
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
          <div className="relative w-full max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="E-Mails durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
              />
            </div>
          </div>

          {/* Right side - New Email & Refresh */}
          <div className="flex items-center gap-3 ml-auto">
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
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedMailboxEmail ? (
                <button
                  onClick={copyEmailToClipboard}
                  className="flex items-center gap-2 min-w-0 group"
                  title="Klicken zum Kopieren"
                >
                  <span className="font-medium text-sm text-gray-700 truncate group-hover:text-[#005fab]">
                    {selectedMailboxEmail}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400 group-hover:text-[#005fab] flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              ) : (
                <h3 className="font-medium text-sm text-gray-700">E-Mails</h3>
              )}
              {filteredThreads.length > 0 && (
                <span className="text-gray-500 font-normal text-sm flex-shrink-0">
                  ({filteredThreads.length})
                </span>
              )}
            </div>
            {resolvingThreads && (
              <div className="flex items-center text-xs text-gray-500">
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                Threads werden erstellt...
              </div>
            )}
          </div>

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
              onStatusChange={handleThreadStatusChange}
              organizationId={organizationId}
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
          currentMailboxEmail={selectedMailboxEmail}
          onClose={() => {
            setShowCompose(false);
            setReplyToEmail(null);
          }}
          onSend={(data) => {
            console.log('✅ Email sent:', data);
            setShowCompose(false);
            setReplyToEmail(null);
            // New email will appear automatically through real-time listener
          }}
        />
      )}
    </div>
  );
}