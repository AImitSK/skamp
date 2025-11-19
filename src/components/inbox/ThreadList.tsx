// src/components/inbox/ThreadList.tsx
"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { EmailThread } from '@/types/email-enhanced';
import { EnvelopeIcon, EnvelopeOpenIcon, UserIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface ThreadListProps {
  mailboxId: string;
  mailboxType: 'domain' | 'project';
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
}

export default function ThreadList({
  mailboxId,
  mailboxType,
  selectedThreadId,
  onSelectThread
}: ThreadListProps) {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        setLoading(true);

        // Query basierend auf Mailbox-Typ
        let threadsQuery = query(
          collection(db, 'email_threads'),
          where('mailboxType', '==', mailboxType),
          orderBy('lastMessageAt', 'desc'),
          limit(50)
        );

        if (mailboxType === 'domain') {
          threadsQuery = query(
            collection(db, 'email_threads'),
            where('domainId', '==', mailboxId),
            where('mailboxType', '==', 'domain'),
            orderBy('lastMessageAt', 'desc'),
            limit(50)
          );
        } else {
          // Project Mailbox - finde via projectId
          // Wir müssen erst die Mailbox laden um projectId zu bekommen
          const mailboxDoc = await getDocs(
            query(
              collection(db, 'inbox_project_mailboxes'),
              where('__name__', '==', mailboxId)
            )
          );

          if (!mailboxDoc.empty) {
            const projectId = mailboxDoc.docs[0].data().projectId;
            threadsQuery = query(
              collection(db, 'email_threads'),
              where('projectId', '==', projectId),
              where('mailboxType', '==', 'project'),
              orderBy('lastMessageAt', 'desc'),
              limit(50)
            );
          }
        }

        const snapshot = await getDocs(threadsQuery);
        const threadList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EmailThread));

        setThreads(threadList);

      } catch (error) {
        console.error('[ThreadList] Error loading threads:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, [mailboxId, mailboxType]);

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <EnvelopeOpenIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">Keine Nachrichten</p>
          <p className="text-sm">In dieser Mailbox sind noch keine E-Mails eingegangen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y">
        {threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id!)}
            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
              selectedThreadId === thread.id ? 'bg-blue-50' : ''
            } ${thread.unreadCount > 0 ? 'bg-white font-medium' : 'bg-gray-50/50 font-normal'}`}
          >
            <div className="flex items-start gap-3">
              {/* Unread Indicator */}
              <div className="flex-shrink-0 pt-1">
                {thread.unreadCount > 0 ? (
                  <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <EnvelopeOpenIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Thread Content */}
              <div className="flex-1 min-w-0">
                {/* Participants */}
                <div className="flex items-center gap-2 mb-1">
                  <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">
                    {thread.participants
                      .map(p => p.name || p.email)
                      .slice(0, 3)
                      .join(', ')}
                    {thread.participants.length > 3 && ` +${thread.participants.length - 3}`}
                  </span>
                </div>

                {/* Subject */}
                <div className={`text-base mb-1 truncate ${
                  thread.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}>
                  {thread.subject || '(Kein Betreff)'}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {thread.messageCount} {thread.messageCount === 1 ? 'Nachricht' : 'Nachrichten'}
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(
                      (thread.lastMessageAt as Timestamp).toDate(),
                      { addSuffix: true, locale: de }
                    )}
                  </span>
                </div>

                {/* Redirect Label */}
                {thread.redirectMetadata && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                      Weitergeleitet aus: {thread.redirectMetadata.originalProjectName}
                    </span>
                  </div>
                )}
              </div>

              {/* Unread Count Badge */}
              {thread.unreadCount > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-blue-600 text-white rounded-full">
                    {thread.unreadCount}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
