// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Button } from '@/components/ui/button';
import MailboxSidebar from '@/components/inbox/MailboxSidebar';
import ThreadList from '@/components/inbox/ThreadList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { NotificationBell } from '@/components/inbox/NotificationBell';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { emailAddressService } from '@/lib/email/email-address-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
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
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import {
  PencilSquareIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function InboxPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  // NEU: Mailbox Selection State
  const [selectedMailbox, setSelectedMailbox] = useState<{
    id: string;
    type: 'domain' | 'project';
  } | null>(null);

  // Thread & Message State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose State
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  const [hasEmailAddresses, setHasEmailAddresses] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Team State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Email Addresses
  useEffect(() => {
    const loadEmailAddresses = async () => {
      if (!organizationId) return;

      try {
        const addresses = await emailAddressService.getByOrganization(organizationId, user?.uid || '');
        setEmailAddresses(addresses);
        setHasEmailAddresses(addresses.length > 0);
      } catch (error) {
        console.error('[InboxPage] Error loading email addresses:', error);
        setHasEmailAddresses(false);
      }
    };

    loadEmailAddresses();
  }, [organizationId, user?.uid]);

  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!organizationId) return;

      setLoadingTeam(true);
      try {
        const members = await teamMemberService.getByOrganization(organizationId);

        if (members.length === 0) {
          const mockMembers = [
            {
              id: '1',
              userId: user?.uid || '',
              displayName: user?.displayName || user?.email || 'Aktueller Benutzer',
              email: user?.email || 'user@example.com',
              role: 'owner',
              status: 'active'
            }
          ];
          setTeamMembers(mockMembers);
        } else {
          setTeamMembers(members);
        }
      } catch (error) {
        const fallbackMember = {
          id: '1',
          userId: user?.uid || '',
          displayName: user?.displayName || user?.email || 'Aktueller Benutzer',
          email: user?.email || 'user@example.com',
          role: 'owner',
          status: 'active'
        };
        setTeamMembers([fallbackMember]);
      } finally {
        setLoadingTeam(false);
      }
    };

    loadTeamMembers();
  }, [organizationId, user]);

  // Load Thread Details when selected
  useEffect(() => {
    const loadThreadDetails = async () => {
      if (!selectedThreadId) {
        setSelectedThread(null);
        setSelectedEmail(null);
        setMessages([]);
        return;
      }

      setLoading(true);
      try {
        // Load Thread
        const threadDoc = await getDoc(doc(db, 'email_threads', selectedThreadId));
        if (threadDoc.exists()) {
          const threadData = { id: threadDoc.id, ...threadDoc.data() } as EmailThread;
          setSelectedThread(threadData);
        }

        // Load Messages
        const messagesQuery = query(
          collection(db, 'email_messages'),
          where('threadId', '==', selectedThreadId),
          where('folder', '!=', 'trash'),
          orderBy('folder'),
          orderBy('receivedAt', 'asc')
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const messageList = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EmailMessage));

        setMessages(messageList);

        // Select latest email
        if (messageList.length > 0) {
          setSelectedEmail(messageList[messageList.length - 1]);
        }

        // Mark thread as read
        if (threadDoc.exists()) {
          const threadData = threadDoc.data();
          if (threadData.unreadCount && threadData.unreadCount > 0) {
            await threadMatcherService.markThreadAsRead(selectedThreadId);

            // Mark all unread messages as read
            for (const message of messageList) {
              if (!message.isRead && message.id) {
                await emailMessageService.markAsRead(message.id);
              }
            }
          }
        }

      } catch (error) {
        console.error('[InboxPage] Error loading thread details:', error);
        setError('Fehler beim Laden der Nachrichten');
      } finally {
        setLoading(false);
      }
    };

    loadThreadDetails();
  }, [selectedThreadId]);

  // Handle Reply
  const handleReply = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('reply');
    setShowCompose(true);
  };

  // Handle Forward
  const handleForward = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('forward');
    setShowCompose(true);
  };

  // Handle Archive
  const handleArchive = async (emailId: string) => {
    if (actionLoading) return;

    try {
      setActionLoading(true);

      const currentThreadId = selectedThread?.id;
      const currentEmailId = selectedEmail?.id;

      await emailMessageService.archive(emailId);

      if (currentEmailId === emailId) {
        setSelectedEmail(null);

        const remainingEmails = messages.filter(e =>
          e.threadId === currentThreadId && e.id !== emailId && !e.isArchived
        );

        if (remainingEmails.length === 0) {
          setSelectedThread(null);
          setSelectedThreadId(null);
        } else {
          const nextEmail = remainingEmails[remainingEmails.length - 1];
          setSelectedEmail(nextEmail);
        }
      }

    } catch (error) {
      console.error('[InboxPage] Error archiving email:', error);
      alert('Fehler beim Archivieren der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (emailId: string) => {
    if (actionLoading) return;

    try {
      setActionLoading(true);

      const currentThreadId = selectedThread?.id;
      const currentEmailId = selectedEmail?.id;

      await emailMessageService.delete(emailId);

      if (currentEmailId === emailId) {
        setSelectedEmail(null);

        const remainingEmails = messages.filter(e =>
          e.threadId === currentThreadId && e.id !== emailId
        );

        if (remainingEmails.length === 0) {
          if (currentThreadId) {
            try {
              await deleteDoc(doc(db, 'email_threads', currentThreadId));
            } catch (error) {
              console.error('[InboxPage] Error deleting thread:', error);
            }
          }

          setSelectedThread(null);
          setSelectedThreadId(null);
        } else {
          const nextEmail = remainingEmails[remainingEmails.length - 1];
          setSelectedEmail(nextEmail);
        }
      }

    } catch (error) {
      console.error('[InboxPage] Error deleting email:', error);
      alert('Fehler beim Löschen der E-Mail');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Star
  const handleStar = async (emailId: string, starred: boolean) => {
    try {
      await emailMessageService.toggleStar(emailId);
    } catch (error) {
      console.error('[InboxPage] Error toggling star:', error);
    }
  };

  // Handle Mark as Read
  const handleMarkAsRead = async (emailId: string) => {
    try {
      await emailMessageService.markAsRead(emailId);
    } catch (error) {
      console.error('[InboxPage] Error marking as read:', error);
    }
  };

  // Handle Thread Status Change
  const handleStatusChange = async (threadId: string, status: 'active' | 'waiting' | 'resolved' | 'archived') => {
    try {
      const changedBy = user?.uid || '';
      const changedByName = user?.displayName || user?.email || 'Unbekannt';
      const thread = threads.find(t => t.id === threadId);

      await threadMatcherService.updateThreadStatus(threadId, status);

      if (thread) {
        await notificationService.sendStatusChangeNotification(
          thread,
          status,
          changedBy,
          changedByName,
          organizationId
        );
      }

      if (status === 'archived') {
        setSelectedThread(null);
        setSelectedEmail(null);
        setSelectedThreadId(null);
      }
    } catch (error) {
      console.error('[InboxPage] Error changing status:', error);
      alert('Fehler beim Ändern des Status');
    }
  };

  // Handle Thread Assignment
  const handleAssignmentChange = async (threadId: string, assignedTo: string | null) => {
    try {
      setThreads(prevThreads =>
        prevThreads.map(thread =>
          thread.id === threadId
            ? { ...thread, assignedToUserId: assignedTo } as EmailThread
            : thread
        )
      );

      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, assignedToUserId: assignedTo } as EmailThread : prev);
      }

      const assignedBy = user?.uid || '';
      const assignedByName = user?.displayName || user?.email || 'Unbekannt';

      await threadMatcherService.assignThread(threadId, assignedTo, assignedBy);

      if (assignedTo && assignedTo !== user?.uid) {
        const thread = threads.find(t => t.id === threadId);
        if (thread) {
          await notificationService.sendAssignmentNotification(
            { ...thread, assignedToUserId: assignedTo } as any,
            assignedTo,
            assignedBy,
            assignedByName,
            organizationId
          );
        }
      }

    } catch (error) {
      console.error('[InboxPage] Error assigning thread:', error);

      setThreads(prevThreads =>
        prevThreads.map(thread =>
          thread.id === threadId
            ? { ...thread, assignedToUserId: (thread as any).assignedToUserId }
            : thread
        )
      );

      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, assignedToUserId: (prev as any).assignedToUserId } : prev);
      }

      alert('Fehler beim Zuweisen des Threads');
    }
  };

  // Handle Priority Change
  const handlePriorityChange = async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!selectedThread) return;

    try {
      await threadMatcherService.updateThreadPriority(selectedThread.id!, priority);
    } catch (error) {
      console.error('[InboxPage] Error changing priority:', error);
      alert('Fehler beim Ändern der Priorität');
    }
  };

  // Handle Category Change (AI-based assignment)
  const handleCategoryChange = async (category: string, assignee?: string) => {
    if (!selectedThread) return;

    try {
      if (assignee) {
        const matchingMember = teamMembers.find(member =>
          member.displayName.toLowerCase().includes(assignee.toLowerCase()) ||
          member.email.toLowerCase().includes(assignee.toLowerCase())
        );

        if (matchingMember) {
          await handleAssignmentChange(selectedThread.id!, matchingMember.userId);
        }
      }
    } catch (error) {
      console.error('[InboxPage] Error changing category:', error);
    }
  };

  // Handle New Email
  const handleNewEmail = () => {
    setReplyToEmail(null);
    setComposeMode('new');
    setShowCompose(true);
  };

  // Handle Compose Close
  const handleComposeClose = () => {
    setShowCompose(false);
    setReplyToEmail(null);
    setComposeMode('new');
  };

  // Handle Email Sent
  const handleEmailSent = async () => {
    setShowCompose(false);
    setReplyToEmail(null);
    setComposeMode('new');

    // Reload messages if we were replying
    if (selectedThreadId) {
      const messagesQuery = query(
        collection(db, 'email_messages'),
        where('threadId', '==', selectedThreadId),
        where('folder', '!=', 'trash'),
        orderBy('folder'),
        orderBy('receivedAt', 'asc')
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messageList = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailMessage));

      setMessages(messageList);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Neue Mailbox Sidebar */}
      <MailboxSidebar
        selectedMailboxId={selectedMailbox?.id}
        onSelectMailbox={(id: string, type: 'domain' | 'project') => {
          setSelectedMailbox({ id, type });
          setSelectedThreadId(null);
        }}
      />

      {/* Thread List (NEU) */}
      {selectedMailbox ? (
        <div className="flex-1 flex flex-col bg-white border-r max-w-md">
          <div className="border-b p-4 bg-white flex items-center justify-between">
            <h2 className="text-lg font-semibold">Unterhaltungen</h2>
            <div className="flex items-center gap-2">
              <NotificationBell organizationId={organizationId} />
              <Button
                onClick={handleNewEmail}
                disabled={!hasEmailAddresses}
                className="flex items-center gap-2"
                size="sm"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Neue E-Mail
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <ThreadList
            mailboxId={selectedMailbox.id}
            mailboxType={selectedMailbox.type}
            selectedThreadId={selectedThreadId || undefined}
            onSelectThread={setSelectedThreadId}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white border-r max-w-md">
          <div className="text-center text-gray-500 p-8">
            <p className="text-lg">Wähle eine Mailbox aus</p>
            <p className="text-sm mt-2">
              Links findest du deine Domain-Postfächer und Projekt-Postfächer
            </p>
          </div>
        </div>
      )}

      {/* Email Viewer (ALTE Version mit ALLEN Features) */}
      {selectedThreadId && selectedThread && selectedEmail ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <EmailViewer
            thread={selectedThread}
            emails={messages}
            selectedEmail={selectedEmail}
            onReply={handleReply}
            onForward={handleForward}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onStar={handleStar}
            onMarkAsRead={handleMarkAsRead}
            onStatusChange={handleStatusChange}
            onAssignmentChange={handleAssignmentChange}
            onPriorityChange={handlePriorityChange}
            onCategoryChange={handleCategoryChange}
            organizationId={organizationId}
            teamMembers={teamMembers}
            showAI={true}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center text-gray-500 p-8">
            {selectedMailbox ? (
              <>
                <p className="text-lg">Wähle eine Unterhaltung aus</p>
                <p className="text-sm mt-2">
                  Deine E-Mails werden hier angezeigt
                </p>
              </>
            ) : (
              <>
                <p className="text-lg">Willkommen in deiner Inbox</p>
                <p className="text-sm mt-2">
                  Wähle eine Mailbox aus um deine E-Mails zu sehen
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Compose Email Modal (ALTE Version) */}
      {showCompose && (
        <ComposeEmail
          mode={composeMode}
          replyToEmail={replyToEmail}
          organizationId={organizationId}
          onClose={handleComposeClose}
          onSent={handleEmailSent}
          emailAddresses={emailAddresses}
        />
      )}

      {/* No Email Addresses Warning */}
      {!hasEmailAddresses && (
        <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-yellow-800">
            <strong>Keine E-Mail-Adresse konfiguriert</strong>
            <br />
            Bitte füge zuerst eine E-Mail-Adresse in den Einstellungen hinzu, um E-Mails zu senden.
          </p>
        </div>
      )}
    </div>
  );
}
