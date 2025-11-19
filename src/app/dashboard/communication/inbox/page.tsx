// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { EmailThread, EmailMessage } from '@/types/email-enhanced';
import MailboxSidebar from '@/components/inbox/MailboxSidebar';
import ThreadList from '@/components/inbox/ThreadList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { NotificationBell } from '@/components/inbox/NotificationBell';
import { emailMessageService } from '@/lib/email/email-message-service';
import { emailAddressService } from '@/lib/email/email-address-service';
import { db } from '@/lib/firebase/client-init';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

export default function InboxPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  // Mailbox Selection State (NEU)
  const [selectedMailbox, setSelectedMailbox] = useState<{
    id: string;
    type: 'domain' | 'project';
  } | null>(null);

  // Thread & Message State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Compose State (BEHALTEN aus alter Inbox)
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);

  // Email Addresses State
  const [hasEmailAddresses, setHasEmailAddresses] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<any[]>([]);

  // Load Email Addresses (BEHALTEN)
  useEffect(() => {
    const loadEmailAddresses = async () => {
      if (!organizationId) return;

      try {
        const addresses = await emailAddressService.getByOrganization(organizationId);
        setEmailAddresses(addresses);
        setHasEmailAddresses(addresses.length > 0);
      } catch (error) {
        console.error('[InboxPage] Error loading email addresses:', error);
        setHasEmailAddresses(false);
      }
    };

    loadEmailAddresses();
  }, [organizationId]);

  // Load Thread Details when selected
  useEffect(() => {
    const loadThreadDetails = async () => {
      if (!selectedThreadId) {
        setSelectedThread(null);
        setMessages([]);
        return;
      }

      setLoading(true);
      try {
        // Load Thread
        const threadDoc = await getDoc(doc(db, 'email_threads', selectedThreadId));
        if (threadDoc.exists()) {
          setSelectedThread({ id: threadDoc.id, ...threadDoc.data() } as EmailThread);
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

      } catch (error) {
        console.error('[InboxPage] Error loading thread details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThreadDetails();
  }, [selectedThreadId]);

  // Handle Reply (BEHALTEN aus alter Inbox)
  const handleReply = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('reply');
    setShowCompose(true);
  };

  // Handle Forward (BEHALTEN aus alter Inbox)
  const handleForward = (email: EmailMessage) => {
    setReplyToEmail(email);
    setComposeMode('forward');
    setShowCompose(true);
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

  // Handle Email Sent (BEHALTEN)
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
        onSelectMailbox={(id, type) => {
          setSelectedMailbox({ id, type });
          setSelectedThreadId(null); // Reset thread selection
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
              >
                <PencilSquareIcon className="h-4 w-4" />
                Neue E-Mail
              </Button>
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

      {/* Email Viewer (BEHALTEN aus alter Inbox mit allen Features) */}
      {selectedThreadId && selectedThread ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <EmailViewer
            thread={selectedThread}
            messages={messages}
            onReply={handleReply}
            onForward={handleForward}
            organizationId={organizationId}
            emailAddresses={emailAddresses}
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

      {/* Compose Email Modal (BEHALTEN aus alter Inbox) */}
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

      {/* No Email Addresses Warning (BEHALTEN) */}
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
