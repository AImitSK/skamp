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
import { generateMockData } from '@/lib/inbox/mockData';
import { 
  PencilSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InboxIcon
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
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  
  // Mock unread counts
  const [unreadCounts] = useState({
    inbox: 3,
    sent: 0,
    drafts: 2,
    spam: 1,
    trash: 0
  });

  // Load mock data on mount
  useEffect(() => {
    if (user && organizationId) {
      loadMockData();
    }
  }, [user, organizationId, selectedFolder]);

  const loadMockData = async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockData = generateMockData(organizationId, selectedFolder);
    setThreads(mockData.threads);
    setEmails(mockData.emails);
    
    setLoading(false);
  };

  // Handle thread selection
  const handleThreadSelect = (thread: EmailThread) => {
    setSelectedThread(thread);
    
    // Find emails for this thread
    const threadEmails = emails.filter(e => e.threadId === thread.id);
    if (threadEmails.length > 0) {
      // Select the latest email in the thread
      const latestEmail = threadEmails.sort((a, b) => 
        b.receivedAt.toDate().getTime() - a.receivedAt.toDate().getTime()
      )[0];
      setSelectedEmail(latestEmail);
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
    // In production: API call
    setEmails(prev => prev.filter(e => e.id !== emailId));
    setSelectedEmail(null);
    setSelectedThread(null);
  };

  const handleDelete = async (emailId: string) => {
    // In production: API call
    setEmails(prev => prev.filter(e => e.id !== emailId));
    setSelectedEmail(null);
    setSelectedThread(null);
  };

  const handleStar = async (emailId: string, starred: boolean) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, isStarred: starred } : e
    ));
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
        .sort((a, b) => a.receivedAt.toDate().getTime() - b.receivedAt.toDate().getTime())
    : [];

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

          {/* Folder Header */}
          <div className="px-4 py-2 border-b bg-gray-100">
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
          </div>

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
                <p className="text-lg font-medium">Keine E-Mail ausgewählt</p>
                <p className="text-sm mt-1">Wählen Sie eine Konversation aus der Liste</p>
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
            loadMockData(); // Reload to show sent email
          }}
        />
      )}
    </div>
  );
}