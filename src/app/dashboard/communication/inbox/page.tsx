// src/app/dashboard/inbox/page.tsx
"use client";

import { useState } from 'react';
import MailboxSidebar from '@/components/inbox/MailboxSidebar';
import ThreadList from '@/components/inbox/ThreadList';
import MessageView from '@/components/inbox/MessageView';

export default function InboxPage() {
  const [selectedMailbox, setSelectedMailbox] = useState<{
    id: string;
    type: 'domain' | 'project';
  } | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mailbox Sidebar */}
      <MailboxSidebar
        selectedMailboxId={selectedMailbox?.id}
        onSelectMailbox={(id, type) => {
          setSelectedMailbox({ id, type });
          setSelectedThreadId(null); // Reset thread selection
        }}
      />

      {/* Thread List */}
      {selectedMailbox ? (
        <div className="flex-1 flex flex-col bg-white border-r">
          <div className="border-b p-4 bg-gray-50">
            <h2 className="text-lg font-semibold">Unterhaltungen</h2>
          </div>
          <ThreadList
            mailboxId={selectedMailbox.id}
            mailboxType={selectedMailbox.type}
            selectedThreadId={selectedThreadId || undefined}
            onSelectThread={setSelectedThreadId}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white border-r">
          <div className="text-center text-gray-500">
            <p className="text-lg">Wähle eine Mailbox aus</p>
          </div>
        </div>
      )}

      {/* Message View */}
      {selectedThreadId ? (
        <div className="flex-1 flex flex-col bg-white">
          <MessageView threadId={selectedThreadId} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center text-gray-500">
            <p className="text-lg">Wähle eine Unterhaltung aus</p>
          </div>
        </div>
      )}
    </div>
  );
}
