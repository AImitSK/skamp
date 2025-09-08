// DEBUGGING STEP 5: INBOX COMPONENTS TEST (MOST DANGEROUS!)
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { emailAddressService } from '@/lib/email/email-address-service';
import { TeamFolderSidebar } from '@/components/inbox/TeamFolderSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { EmailThread, EmailMessage } from '@/types/email';
import { Unsubscribe } from 'firebase/firestore';

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

export default function InboxHookLogicPhase1Page() {
  // Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  // HOOK-LOGIK PHASE 1: Alle useState Definitionen aus Original
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
  
  // Team-Ordner State
  const [selectedFolderType, setSelectedFolderType] = useState<'general' | 'team'>('general');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | undefined>();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    inbox: 0, sent: 0, drafts: 0, spam: 0, trash: 0, general: 0
  });
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);

  // Test State
  const [message, setMessage] = useState('RACE CONDITION FIX: useEffect Firebase Listeners mit isActive Flag');

  // HOOK-LOGIK PHASE 2: Kritischer useEffect mit Firebase Listeners - FIXED
  useEffect(() => {
    console.log('🔄 useEffect triggered with deps:', { user: !!user, organizationId, selectedFolderType, selectedTeamMemberId });
    
    if (!user || !organizationId) {
      setLoading(false);
      return;
    }

    let isActive = true; // Flag to prevent race conditions
    setLoading(true);
    setError(null);

    try {
      // Team-Ordner Mode - inline implementation to avoid circular dependency
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

      const newUnsubscribes: Unsubscribe[] = [];

      const threadsUnsubscribe = onSnapshot(
        threadsQuery,
        async (snapshot) => {
          if (!isActive) return; // Prevent race condition updates
          
          let threadsData: EmailThread[] = [];
          
          snapshot.forEach((doc) => {
            threadsData.push({ ...doc.data(), id: doc.id } as EmailThread);
          });

          // Für "general" folder: Filtere alle Threads ohne Team-Zuweisung
          if (selectedFolderType === 'general') {
            threadsData = threadsData.filter(thread => {
              const assignedTo = (thread as any).assignedToUserId || (thread as any).assignedTo;
              return !assignedTo && !(thread.id && thread.id.startsWith('sent_'));
            });
          } else {
            threadsData = threadsData.filter(thread => 
              !(thread.id && thread.id.startsWith('sent_'))
            );
          }
          
          if (isActive) {
            setThreads(threadsData);
            setDebugInfo((prev: DebugInfo) => ({
              ...prev,
              threadCount: threadsData.length,
              threads: threadsData
            }));
          }
        },
        (error) => {
          if (isActive) {
            setError('Fehler beim Laden der E-Mail-Threads');
            setDebugInfo((prev: DebugInfo) => ({
              ...prev,
              threadError: error.message
            }));
          }
        }
      );
      
      newUnsubscribes.push(threadsUnsubscribe);

      // 2. Listen to messages
      let messagesQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', organizationId),
        where('folder', '==', 'inbox'),
        orderBy('receivedAt', 'desc'),
        limit(100)
      );

      const messagesUnsubscribe = onSnapshot(
        messagesQuery,
        async (snapshot) => {
          if (!isActive) return; // Prevent race condition updates
          
          let messagesData: EmailMessage[] = [];
          
          snapshot.forEach((doc) => {
            messagesData.push({ ...doc.data(), id: doc.id } as EmailMessage);
          });

          // Client-seitige Filterung für Team-Ordner
          if (selectedFolderType === 'general') {
            messagesData = messagesData.filter(msg => {
              const assignedTo = (msg as any).assignedToUserId || (msg as any).assignedTo;
              return !assignedTo;
            });
          } else if (selectedFolderType === 'team' && selectedTeamMemberId) {
            messagesData = messagesData.filter(msg => {
              const assignedTo = (msg as any).assignedToUserId || (msg as any).assignedTo;
              return assignedTo === selectedTeamMemberId;
            });
          }
          
          if (isActive) {
            setEmails(messagesData);
            setLoading(false);
            setDebugInfo((prev: DebugInfo) => ({
              ...prev,
              messageCount: messagesData.length,
              messages: messagesData
            }));
          }
        },
        (error) => {
          if (isActive) {
            setError('Fehler beim Laden der E-Mails');
            setLoading(false);
            setDebugInfo((prev: DebugInfo) => ({
              ...prev,
              messageError: error.message
            }));
          }
        }
      );
      
      newUnsubscribes.push(messagesUnsubscribe);
      setUnsubscribes(newUnsubscribes);

    } catch (error: any) {
      setError('Fehler beim Einrichten der Echtzeit-Updates');
      setLoading(false);
      setDebugInfo((prev: DebugInfo) => ({
        ...prev,
        setupError: error.message
      }));
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      isActive = false; // Prevent any pending updates
      newUnsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing:', error);
        }
      });
    };
  }, [user, organizationId, selectedFolderType, selectedTeamMemberId]);

  // Test Inbox Components Import
  const testComponentImports = () => {
    try {
      const sidebarExists = !!TeamFolderSidebar;
      const emailListExists = !!EmailList;  
      const emailViewerExists = !!EmailViewer;

      setComponentTestResults(prev => ({
        ...prev,
        sidebar: sidebarExists ? '✅ Import OK' : '❌ Import failed',
        emailList: emailListExists ? '✅ Import OK' : '❌ Import failed', 
        emailViewer: emailViewerExists ? '✅ Import OK' : '❌ Import failed'
      }));

      setMessage('Step 5 - All component imports tested!');
    } catch (error: any) {
      setComponentTestResults(prev => ({
        ...prev,
        rendering: `❌ Error: ${error.message}`
      }));
      setMessage(`Step 5 - Component import error: ${error.message}`);
    }
  };

  // Test Component Rendering (DANGEROUS!)
  const testComponentRendering = () => {
    try {
      setShowComponents(true);
      setComponentTestResults(prev => ({
        ...prev,
        rendering: '✅ Components rendered'
      }));
      setMessage('Step 5 - Components rendered successfully!');
    } catch (error: any) {
      setComponentTestResults(prev => ({
        ...prev,
        rendering: `❌ Render Error: ${error.message}`
      }));
      setMessage(`Step 5 - Render error: ${error.message}`);
    }
  };

  return (
    <div className="p-4">
      <Heading level={1}>Hook-Logik Phase 2</Heading>
      <p className="mt-2">{message}</p>
      
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge color="green">User:</Badge>
          <span className="text-sm">{user?.email || 'Not logged in'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="blue">Organization:</Badge>
          <span className="text-sm">{currentOrganization?.name || 'None'}</span>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex items-center gap-2">
          <Badge color="purple">useEffect:</Badge>
          <span className="text-xs">Firebase Listeners aktiv</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="orange">Loading:</Badge>
          <span className="text-xs">{loading ? 'Loading...' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">Threads:</Badge>
          <span className="text-xs">{threads.length} threads loaded</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="cyan">Emails:</Badge>
          <span className="text-xs">{emails.length} emails loaded</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="yellow">Error:</Badge>
          <span className="text-xs">{error || 'None'}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={() => setSelectedFolderType(selectedFolderType === 'general' ? 'team' : 'general')}
          color="dark/zinc"
        >
          Toggle Folder: {selectedFolderType}
        </Button>
        <Button 
          onClick={() => setMessage('Phase 2 useEffect Test - Button clicked!')}
          plain
        >
          Test useEffect
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700 font-semibold">Error occurred:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Firebase Listeners Status</h2>
        <div className="text-sm space-y-1">
          <p>✅ useEffect: {user && organizationId ? 'Active' : 'Waiting for auth'}</p>
          <p>✅ Firebase Queries: 2 listeners (threads + messages)</p>
          <p>✅ Threads Query: email_threads collection</p>
          <p>✅ Messages Query: email_messages collection</p>
          <p>✅ Cleanup: Automatic unsubscribe on unmount</p>
          <p>✅ Dependencies: [user, organizationId, selectedFolderType, selectedTeamMemberId]</p>
        </div>
      </div>
    </div>
  );
}