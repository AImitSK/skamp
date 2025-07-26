// src/components/inbox/EmailViewer.tsx
"use client";

import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { Button } from '@/components/button';
import format from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  EllipsisVerticalIcon,
  PaperClipIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface EmailViewerProps {
  thread: EmailThread;
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onReply: (email: EmailMessage) => void;
  onForward: (email: EmailMessage) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onStar: (emailId: string, starred: boolean) => void;
}

export function EmailViewer({
  thread,
  emails,
  selectedEmail,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onStar
}: EmailViewerProps) {
  if (!selectedEmail || emails.length === 0) {
    return null;
  }

  const latestEmail = emails[emails.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {thread.subject}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStar(latestEmail.id!, !latestEmail.isStarred)}
              className={clsx(
                'p-2 rounded-lg hover:bg-gray-100',
                latestEmail.isStarred ? 'text-yellow-400' : 'text-gray-400'
              )}
            >
              <StarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onArchive(latestEmail.id!)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <ArchiveBoxIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(latestEmail.id!)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4">
          <Button 
            onClick={() => onReply(latestEmail)}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
            Antworten
          </Button>
          <Button 
            onClick={() => onForward(latestEmail)}
            plain
          >
            <ArrowUturnRightIcon className="h-4 w-4 mr-2" />
            Weiterleiten
          </Button>
        </div>
      </div>

      {/* Email Thread */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email, index) => (
          <div 
            key={email.id}
            className={clsx(
              'border-b',
              index === emails.length - 1 ? 'bg-white' : 'bg-gray-50'
            )}
          >
            {/* Email Header */}
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium">
                    {email.from.name ? email.from.name[0].toUpperCase() : email.from.email[0].toUpperCase()}
                  </div>
                  
                  {/* Sender info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {email.from.name || email.from.email}
                      </span>
                      <span className="text-sm text-gray-500">
                        &lt;{email.from.email}&gt;
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      an {email.to.map(t => t.name || t.email).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-sm text-gray-500">
                  {format(email.receivedAt.toDate(), 'dd. MMM yyyy, HH:mm')}
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="px-6 pb-6">
              {email.htmlContent ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{email.textContent}</p>
              )}

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Anhänge ({email.attachments.length})
                  </p>
                  <div className="space-y-2">
                    {email.attachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <PaperClipIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">{attachment.filename}</span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(attachment.size / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reply (nur beim letzten Email) */}
            {index === emails.length - 1 && (
              <div className="px-6 pb-4">
                <button
                  onClick={() => onReply(email)}
                  className="text-sm text-[#005fab] hover:text-[#004a8c] font-medium"
                >
                  Schnellantwort...
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}