// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { InboxSidebar } from '@/components/inbox/InboxSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { emailAddressService } from '@/lib/email/email-address-service';
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
  DocumentData
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
  Cog6ToothIcon
} from '@heroicons/react/20/solid';

export default function InboxPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  // State
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
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
  
  // Ref to track if we've already resolved threads
  const threadsResolvedRef = useRef(false);
  
  // Debug Info Type
  interface DebugInfo {
    emailAddresses?: any[];
    hasEmailAddresses?: boolean;
    emailAddressError?: any;
    listenersSetup?: boolean;
    organizationId?: string;
    selectedFolder?: string;
    threadCount?: number;
    threads?: EmailThread[];
    threadError?: string;
    messageCount?: number;
    messages?: EmailMessage[];
    messageError?: string;
    setupError?: string;
    deferredThreadsResolved?: number;
  }
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  
  // Real-time unread counts
  const [unreadCounts, setUnreadCounts] = useState({
    inbox: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0
  });

  // Firestore unsubscribe functions
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);

  // Resolve deferred threads when component mounts
  useEffect(() => {
    const resolveDeferredThreads = async () => {
      if (!user || !organizationId || threadsResolvedRef.current || !hasEmailAddresses) {
        return;
      }
      
      setResolvingThreads(true);
      console.log('🔄 Resolving deferred threads...');
      
      try {
        const resolvedCount = await threadMatcherService.resolveDeferredThreads(organizationId);
        console.log(`✅ Resolved ${resolvedCount} deferred threads`);
        
        setDebugInfo(prev => ({
          ...prev,
          deferredThreadsResolved: resolvedCount
        }));
        
        threadsResolvedRef.current = true;
      } catch (error) {
        console.error('Error resolving deferred threads:', error);
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
        console.log('📧 Checking email addresses for org:', organizationId);
        const addresses = await emailAddressService.getByOrganization(organizationId, user.uid);
        console.log('📧 Found email addresses:', addresses);
        setEmailAddresses(addresses);
        setHasEmailAddresses(addresses.length > 0);
        
        // Update debug info
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          emailAddresses: addresses,
          hasEmailAddresses: addresses.length > 0
        }));
      } catch (error) {
        console.error('Error checking email addresses:', error);
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

    console.log('🔄 Setting up real-time listeners...');
    setDebugInfo((prev: DebugInfo) => ({
      ...prev,
      listenersSetup: true,
      organizationId,
      selectedFolder
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
  }, [user, organizationId, selectedFolder, hasEmailAddresses, resolvingThreads]);

  const setupRealtimeListeners = (unsubscribes: Unsubscribe[]) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Listen to threads - Alle Ordner müssen gefiltert werden
      console.log('📨 Setting up thread listener for org:', organizationId, 'folder:', selectedFolder);
      
      // Lade alle Threads und filtere client-seitig basierend auf E-Mails
      const threadsQuery = query(
        collection(db, 'email_threads'),
        where('organizationId', '==', organizationId),
        orderBy('lastMessageAt', 'desc'),
        limit(100) // Mehr laden für client-seitige Filterung
      );

      const threadsUnsubscribe = onSnapshot(
        threadsQuery,
        async (snapshot) => {
          console.log('📨 Thread snapshot received, size:', snapshot.size);
          let threadsData: EmailThread[] = [];
          
          // Konvertiere Snapshot zu Array
          snapshot.forEach((doc) => {
            threadsData.push({ ...doc.data(), id: doc.id } as EmailThread);
          });
          
          // Filtere Threads basierend auf E-Mails im ausgewählten Ordner
          console.log(`📁 Filtering threads for folder: ${selectedFolder}`);
          const threadIdsInFolder = new Set<string>();
          
          // Finde alle Thread-IDs die E-Mails im ausgewählten Ordner haben
          for (const thread of threadsData) {
            const messagesQuery = query(
              collection(db, 'email_messages'),
              where('threadId', '==', thread.id),
              where('folder', '==', selectedFolder),
              limit(1)
            );
            
            try {
              const messagesSnapshot = await getDocs(messagesQuery);
              if (!messagesSnapshot.empty) {
                threadIdsInFolder.add(thread.id!);
              }
            } catch (err) {
              console.error(`Error checking thread ${thread.id}:`, err);
            }
          }
          
          // Filtere Threads
          threadsData = threadsData.filter(thread => 
            threadIdsInFolder.has(thread.id!)
          );
          
          console.log(`✅ Found ${threadsData.length} threads with emails in ${selectedFolder}`);
          setThreads(threadsData);
          
          // Update debug info
          setDebugInfo((prev: DebugInfo) => ({
            ...prev,
            threadCount: threadsData.length,
            threads: threadsData
          }));
          
          // Update unread counts
          updateUnreadCounts(threadsData);
        },
        (error) => {
          console.error('Error loading threads:', error);
          setError('Fehler beim Laden der E-Mail-Threads');
          setDebugInfo((prev: DebugInfo) => ({
            ...prev,
            threadError: error.message
          }));
        }
      );
      
      unsubscribes.push(threadsUnsubscribe);

      // 2. Listen to messages in selected folder
      console.log('📧 Setting up message listener for folder:', selectedFolder);
      
      // Fix für draft vs drafts
      const folderName = selectedFolder === 'drafts' ? 'draft' : selectedFolder;
      
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', organizationId),
        where('folder', '==', folderName),
        orderBy('receivedAt', 'desc'),
        limit(100)
      );

      const messagesUnsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          console.log('📧 Message snapshot received, size:', snapshot.size);
          const messagesData: EmailMessage[] = [];
          snapshot.forEach((doc) => {
            messagesData.push({ ...doc.data(), id: doc.id } as EmailMessage);
          });
          setEmails(messagesData);
          setLoading(false);
          
          // Update debug info
          setDebugInfo((prev: DebugInfo) => ({
            ...prev,
            messageCount: messagesData.length,
            messages: messagesData
          }));
        },
        (error) => {
          console.error('Error loading messages:', error);
          setError('Fehler beim Laden der E-Mails');
          setLoading(false);
          setDebugInfo((prev: DebugInfo) => ({
            ...prev,
            messageError: error.message
          }));
        }
      );
      
      unsubscribes.push(messagesUnsubscribe);

    } catch (error: any) {
      console.error('Error setting up listeners:', error);
      setError('Fehler beim Einrichten der Echtzeit-Updates');
      setLoading(false);
      setDebugInfo((prev: DebugInfo) => ({
        ...prev,
        setupError: error.message
      }));
    }
  };

  const updateUnreadCounts = async (threadsData: EmailThread[]) => {
    // Calculate unread counts from threads
    const counts = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0
    };

    // In a real implementation, we would query each folder
    // For now, use thread unread counts for inbox
    if (selectedFolder === 'inbox') {
      counts.inbox = threadsData.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
    }
    
    setUnreadCounts(counts);
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
      console.error('Error resolving threads:', error);
      alert('Fehler beim Erstellen der Threads');
    } finally {
      setResolvingThreads(false);
    }
  };

  // Refresh inbox
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
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
      console.log('🧪 Creating test email...');
      const defaultAddress = emailAddresses.find(addr => addr.isDefault) || emailAddresses[0];
      
      // Bestimme den Ordner basierend auf selectedFolder
      let folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam' = 'inbox';
      let isDraft = false;
      
      if (selectedFolder === 'sent') folder = 'sent';
      else if (selectedFolder === 'drafts') {
        folder = 'draft';
        isDraft = true;
      }
      else if (selectedFolder === 'spam') folder = 'spam';
      else if (selectedFolder === 'trash') folder = 'trash';
      else folder = 'inbox';
      
      // Create a test thread first
      const testThread = await threadMatcherService.findOrCreateThread({
        messageId: `test-${Date.now()}@celeropress.de`,
        subject: `Test E-Mail in ${selectedFolder} - ${new Date().toLocaleString('de-DE')}`,
        from: { email: 'test@example.com', name: 'Test Sender' },
        to: [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        organizationId,
        inReplyTo: null,
        references: []
      });

      if (!testThread.success || !testThread.threadId) {
        throw new Error('Failed to create test thread');
      }

      // Create test email message
      const testMessage = await emailMessageService.create({
        messageId: `test-${Date.now()}@celeropress.de`,
        threadId: testThread.threadId,
        from: folder === 'sent' 
          ? { email: defaultAddress.email, name: defaultAddress.displayName }
          : { email: 'test@example.com', name: 'Test Sender' },
        to: folder === 'sent'
          ? [{ email: 'recipient@example.com', name: 'Test Recipient' }]
          : [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        subject: `Test E-Mail in ${selectedFolder} - ${new Date().toLocaleString('de-DE')}`,
        textContent: `Dies ist eine Test-E-Mail im ${selectedFolder} Ordner zur Überprüfung der Inbox-Funktionalität.\n\nDiese E-Mail wurde automatisch generiert.`,
        htmlContent: `<p>Dies ist eine Test-E-Mail im <strong>${selectedFolder}</strong> Ordner zur Überprüfung der Inbox-Funktionalität.</p><p>Diese E-Mail wurde automatisch generiert.</p>`,
        snippet: `Dies ist eine Test-E-Mail im ${selectedFolder} Ordner...`,
        folder: folder,
        isRead: folder === 'sent' || isDraft, // Gesendete und Entwürfe sind "gelesen"
        isStarred: false,
        isArchived: false,
        isDraft: isDraft,
        labels: ['test', selectedFolder],
        importance: 'normal',
        emailAccountId: defaultAddress.id,
        organizationId,
        userId: user?.uid || '',
        receivedAt: serverTimestamp() as Timestamp,
        sentAt: folder === 'sent' ? serverTimestamp() as Timestamp : undefined,
        attachments: [],
        headers: {},
        references: []
      });

      console.log('✅ Test email created:', testMessage);
      alert(`Test-E-Mail wurde im ${selectedFolder} Ordner erstellt!`);
    } catch (error: any) {
      console.error('❌ Error creating test email:', error);
      alert(`Fehler beim Erstellen der Test-E-Mail: ${error.message}`);
    }
  };

  // Handle thread selection
  const handleThreadSelect = async (thread: EmailThread) => {
    console.log('📧 Thread selected:', thread.id, thread.subject);
    setSelectedThread(thread);
    
    try {
      // Load all messages for this thread im aktuellen Ordner
      let threadMessages: EmailMessage[] = [];
      
      // Fix für draft vs drafts
      const folderName = selectedFolder === 'drafts' ? 'draft' : selectedFolder;
      
      // Lade nur E-Mails des Threads im aktuellen Ordner
      const folderQuery = query(
        collection(db, 'email_messages'),
        where('threadId', '==', thread.id!),
        where('folder', '==', folderName),
        orderBy('receivedAt', 'asc')
      );
      
      const snapshot = await getDocs(folderQuery);
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        threadMessages.push({ ...doc.data(), id: doc.id } as EmailMessage);
      });
      
      console.log(`📨 Loaded ${threadMessages.length} messages for thread in ${selectedFolder}`);
      
      if (threadMessages.length > 0) {
        // Select the latest email in the thread
        const latestEmail = threadMessages[threadMessages.length - 1];
        setSelectedEmail(latestEmail);
        console.log('✅ Selected latest email:', latestEmail.id);
        
        // Mark thread as read (nur in inbox)
        if (selectedFolder === 'inbox' && thread.unreadCount && thread.unreadCount > 0) {
          await threadMatcherService.markThreadAsRead(thread.id!);
          
          // Mark all unread messages in thread as read
          for (const message of threadMessages) {
            if (!message.isRead && message.id) {
              await emailMessageService.markAsRead(message.id);
            }
          }
        }
      } else {
        console.warn('⚠️ No messages found for thread:', thread.id);
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('❌ Error loading thread messages:', error);
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
      console.log('📦 Archiving email:', emailId);
      
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
      
      console.log('✅ Email archived successfully');
    } catch (error) {
      console.error('❌ Error archiving email:', error);
      alert('Fehler beim Archivieren der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);
      console.log('🗑️ Deleting email:', emailId);
      
      // Speichere aktuelle Auswahl
      const currentThreadId = selectedThread?.id;
      const currentEmailId = selectedEmail?.id;
      
      // Lösche die E-Mail
      await emailMessageService.delete(emailId);
      
      // Wenn die gelöschte E-Mail die ausgewählte war
      if (currentEmailId === emailId) {
        console.log('🔄 Deleted email was selected, updating state...');
        setSelectedEmail(null);
        
        // Im Trash-Ordner: Thread bleibt sichtbar
        if (selectedFolder === 'trash') {
          // Thread bleibt ausgewählt, aber keine E-Mail
          console.log('📂 In trash folder, keeping thread selected');
          return;
        }
        
        // In anderen Ordnern: Prüfe verbleibende E-Mails
        const remainingEmails = emails.filter(e => 
          e.threadId === currentThreadId && e.id !== emailId
        );
        
        console.log(`📧 Remaining emails in thread: ${remainingEmails.length}`);
        
        if (remainingEmails.length === 0) {
          // Kein Thread mehr vorhanden, alles zurücksetzen
          console.log('🔄 No more emails in thread, resetting selection');
          setSelectedThread(null);
        } else {
          // Wähle die nächste E-Mail im Thread
          const nextEmail = remainingEmails[remainingEmails.length - 1];
          console.log('✅ Selecting next email:', nextEmail.id);
          setSelectedEmail(nextEmail);
        }
      }
      
      console.log('✅ Email deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting email:', error);
      alert('Fehler beim Löschen der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStar = async (emailId: string, starred: boolean) => {
    try {
      await emailMessageService.toggleStar(emailId);
    } catch (error) {
      console.error('Error starring email:', error);
    }
  };

  // Filter threads based on search
  const filteredThreads = threads.filter(thread => {
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

  // Get emails for selected thread - immer nur aus dem aktuellen Ordner
  const threadEmails = selectedThread 
    ? emails.filter(e => e.threadId === selectedThread.id)
        .sort((a, b) => {
          const aTime = a.receivedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.receivedAt?.toDate?.()?.getTime() || 0;
          return aTime - bTime;
        })
    : [];

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
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
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
      <div className="border-b bg-white px-4 py-3 mt-12">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Search, New Email & Refresh */}
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative w-96">
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
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
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
            {/* Später: Bulk-Actions, View Options, etc. */}
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
        {/* Sidebar */}
        <InboxSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          unreadCounts={unreadCounts}
        />

        {/* Thread List */}
        <div className="w-96 border-r bg-gray-50 flex flex-col">
          {/* Folder Header */}
          <div className="px-4 py-2 border-b bg-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700">
              {selectedFolder === 'inbox' && 'Posteingang'}
              {selectedFolder === 'sent' && 'Gesendet'}
              {selectedFolder === 'drafts' && 'Entwürfe'}
              {selectedFolder === 'spam' && 'Spam'}
              {selectedFolder === 'trash' && 'Papierkorb'}
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
          />
        </div>

        {/* Email Viewer */}
        <div className="flex-1 flex flex-col">
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