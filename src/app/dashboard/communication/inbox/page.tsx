// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect } from 'react';
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
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  PencilSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  BugAntIcon,
  PlusIcon
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
  }, [user, organizationId, selectedFolder, hasEmailAddresses]);

  const setupRealtimeListeners = (unsubscribes: Unsubscribe[]) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Listen to threads
      console.log('📨 Setting up thread listener for org:', organizationId);
      
      // Vereinfachte Query ohne subject, um Index-Anforderung zu vermeiden
      const threadsQuery = query(
        collection(db, 'email_threads'),
        where('organizationId', '==', organizationId),
        orderBy('lastMessageAt', 'desc'),
        limit(50)
      );

      const threadsUnsubscribe = onSnapshot(
        threadsQuery,
        (snapshot) => {
          console.log('📨 Thread snapshot received, size:', snapshot.size);
          const threadsData: EmailThread[] = [];
          snapshot.forEach((doc) => {
            threadsData.push({ ...doc.data(), id: doc.id } as EmailThread);
          });
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
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', organizationId),
        where('folder', '==', selectedFolder),
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
    counts.inbox = threadsData.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
    
    setUnreadCounts(counts);
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
      
      // Create a test thread first
      const testThread = await threadMatcherService.findOrCreateThread({
        messageId: `test-${Date.now()}@celeropress.de`,
        subject: `Test E-Mail ${new Date().toLocaleString('de-DE')}`,
        from: { email: 'test@example.com', name: 'Test Sender' },
        to: [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        organizationId,
        inReplyTo: null,
        references: []
      });

      if (!testThread.success || !testThread.thread?.id) {
        throw new Error('Failed to create test thread');
      }

      // Create test email message
      const testMessage = await emailMessageService.create({
        messageId: `test-${Date.now()}@celeropress.de`,
        threadId: testThread.thread.id,
        from: { email: 'test@example.com', name: 'Test Sender' },
        to: [{ email: defaultAddress.email, name: defaultAddress.displayName }],
        subject: `Test E-Mail ${new Date().toLocaleString('de-DE')}`,
        textContent: 'Dies ist eine Test-E-Mail zur Überprüfung der Inbox-Funktionalität.\n\nDiese E-Mail wurde automatisch generiert.',
        htmlContent: '<p>Dies ist eine Test-E-Mail zur Überprüfung der Inbox-Funktionalität.</p><p>Diese E-Mail wurde automatisch generiert.</p>',
        snippet: 'Dies ist eine Test-E-Mail zur Überprüfung der Inbox-Funktionalität...',
        folder: 'inbox',
        isRead: false,
        isStarred: false,
        isArchived: false,
        isDraft: false,
        labels: ['test'],
        importance: 'normal',
        emailAccountId: defaultAddress.id,
        organizationId,
        userId: user?.uid || '',
        receivedAt: serverTimestamp() as Timestamp,
        attachments: [],
        headers: {},
        references: []
      });

      console.log('✅ Test email created:', testMessage);
      alert('Test-E-Mail wurde erstellt!');
    } catch (error: any) {
      console.error('❌ Error creating test email:', error);
      alert(`Fehler beim Erstellen der Test-E-Mail: ${error.message}`);
    }
  };

  // Handle thread selection
  const handleThreadSelect = async (thread: EmailThread) => {
    setSelectedThread(thread);
    
    try {
      // Load all messages for this thread
      const threadMessages = await emailMessageService.getThreadMessages(thread.id!);
      
      if (threadMessages.length > 0) {
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
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
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
    try {
      await emailMessageService.archive(emailId);
      setSelectedEmail(null);
      setSelectedThread(null);
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  const handleDelete = async (emailId: string) => {
    try {
      await emailMessageService.delete(emailId);
      setSelectedEmail(null);
      setSelectedThread(null);
    } catch (error) {
      console.error('Error deleting email:', error);
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

  // Get emails for selected thread
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
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
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
    <div className="h-[calc(100vh-4rem)] flex bg-white">
      {/* Sidebar */}
      <InboxSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        onCompose={() => {
          setComposeMode('new');
          setReplyToEmail(null);
          setShowCompose(true);
        }}
        unreadCounts={unreadCounts}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Thread List */}
        <div className="w-96 border-r bg-gray-50 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b bg-white">
            <div className="relative">
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
          </div>

          {/* Folder Header with Debug Toggle */}
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
            <div className="flex items-center gap-2">
              {process.env.NODE_ENV === 'development' && (
                <>
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
            loading={loading}
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