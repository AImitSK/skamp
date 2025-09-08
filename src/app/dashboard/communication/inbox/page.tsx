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
  const [message, setMessage] = useState('Hook-Logik Phase 1: useState Definitionen Test');

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
      <Heading level={1}>Hook-Logik Phase 1</Heading>
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
          <Badge color="purple">useState Count:</Badge>
          <span className="text-xs">20+ state variables imported</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="orange">Loading State:</Badge>
          <span className="text-xs">{loading ? 'Loading' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">Threads:</Badge>
          <span className="text-xs">{threads.length} threads</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="cyan">Emails:</Badge>
          <span className="text-xs">{emails.length} emails</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={() => setLoading(!loading)}
          color="dark/zinc"
        >
          Toggle Loading
        </Button>
        <Button 
          onClick={() => setMessage('Phase 1 useState Test - Button clicked!')}
          plain
        >
          Test useState
        </Button>
      </div>

      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">useState Hook Status</h2>
        <div className="text-sm space-y-1">
          <p>✅ selectedThread: {selectedThread ? 'Set' : 'null'}</p>
          <p>✅ selectedEmail: {selectedEmail ? 'Set' : 'null'}</p>
          <p>✅ loading: {loading.toString()}</p>
          <p>✅ error: {error || 'null'}</p>
          <p>✅ threads: {threads.length} items</p>
          <p>✅ emails: {emails.length} items</p>
          <p>✅ teamMembers: {teamMembers.length} items</p>
          <p>✅ unreadCounts: {Object.keys(unreadCounts).length} categories</p>
        </div>
      </div>
    </div>
  );
}