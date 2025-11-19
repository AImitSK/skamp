// src/components/inbox/MessageView.tsx
"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { EmailMessage } from '@/types/email-enhanced';
import { UserIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MessageViewProps {
  threadId: string;
}

export default function MessageView({ threadId }: MessageViewProps) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);

        const messagesQuery = query(
          collection(db, 'email_messages'),
          where('threadId', '==', threadId),
          where('folder', '!=', 'trash'),
          orderBy('folder'),
          orderBy('receivedAt', 'asc')
        );

        const snapshot = await getDocs(messagesQuery);
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EmailMessage));

        setMessages(messageList);

        // Markiere ungelesene Messages als gelesen
        const unreadMessages = messageList.filter(m => !m.isRead);
        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map(m =>
              updateDoc(doc(db, 'email_messages', m.id!), { isRead: true })
            )
          );

          // Update Thread unreadCount
          const threadRef = doc(db, 'email_threads', threadId);
          await updateDoc(threadRef, {
            unreadCount: 0,
            updatedAt: Timestamp.now()
          });
        }

      } catch (error) {
        console.error('[MessageView] Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="border rounded-lg p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <p>Keine Nachrichten gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="border rounded-lg bg-white shadow-sm overflow-hidden"
          >
            {/* Message Header */}
            <div className="bg-gray-50 border-b p-4">
              <div className="flex items-start justify-between mb-3">
                {/* From */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {message.from.name || message.from.email}
                    </div>
                    {message.from.name && (
                      <div className="text-sm text-gray-500">{message.from.email}</div>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4" />
                  {format(
                    (message.receivedAt as Timestamp).toDate(),
                    'dd. MMM yyyy, HH:mm',
                    { locale: de }
                  )}
                </div>
              </div>

              {/* To */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRightIcon className="h-4 w-4" />
                <span>An:</span>
                <span className="font-medium">
                  {message.to.map(t => t.name || t.email).join(', ')}
                </span>
              </div>

              {/* Subject (nur bei erster Message) */}
              {index === 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-lg font-semibold text-gray-900">
                    {message.subject || '(Kein Betreff)'}
                  </div>
                </div>
              )}

              {/* Redirect Info */}
              {message.redirectMetadata && (
                <div className="mt-3 pt-3 border-t">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    <span className="font-medium">Weitergeleitet:</span>
                    <span className="ml-1">
                      Ursprünglich für Projekt "{message.redirectMetadata.originalProjectName}"
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="p-6">
              {message.htmlContent ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.htmlContent }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {message.textContent}
                </div>
              )}

              {/* Attachments */}
              {message.hasAttachments && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">📎 Diese Nachricht enthält Anhänge</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
