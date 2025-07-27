// src/components/inbox/EmailList.tsx
"use client";

import { EmailThread } from '@/types/inbox-enhanced';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';
import { Badge } from '@/components/badge';
import clsx from 'clsx';
import { 
  StarIcon,
  PaperClipIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/20/solid';

interface EmailListProps {
  threads: EmailThread[];
  selectedThread: EmailThread | null;
  onThreadSelect: (thread: EmailThread) => void;
  loading: boolean;
  onStar?: (emailId: string, starred: boolean) => void;
}

export function EmailList({ 
  threads, 
  selectedThread, 
  onThreadSelect,
  loading,
  onStar
}: EmailListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Keine E-Mails in diesem Ordner</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const isSelected = selectedThread?.id === thread.id;
        const hasUnread = thread.unreadCount > 0;
        
        // Get primary participant (not us)
        const primaryParticipant = thread.participants.find(p => 
          !p.email.includes('@skamp.de')
        ) || thread.participants[0];
        
        return (
          <button
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={clsx(
              'w-full text-left p-4 border-b hover:bg-gray-100 transition-colors',
              isSelected && 'bg-blue-50 border-l-4 border-l-[#005fab]',
              hasUnread && 'bg-white'
            )}
          >
            <div className="flex items-start gap-3">
                            {/* Star */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  // onStar would handle individual email starring
                }}
                className="mt-1 text-gray-300 hover:text-yellow-400 cursor-pointer"
              >
                <StarIcon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className={clsx(
                      'text-sm truncate',
                      hasUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
                    )}>
                      {primaryParticipant.name || primaryParticipant.email}
                    </p>
                    {thread.messageCount > 1 && (
                      <Badge color="zinc" className="whitespace-nowrap text-xs">
                        {thread.messageCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(thread.lastMessageAt.toDate(), {
                      addSuffix: true,
                      locale: de
                    })}
                  </span>
                </div>

                {/* Subject */}
                <p className={clsx(
                  'text-sm truncate mb-1',
                  hasUnread ? 'font-medium text-gray-900' : 'text-gray-700'
                )}>
                  {thread.subject}
                </p>

                {/* Preview - would come from last message */}
                <p className="text-sm text-gray-600 truncate">
                  {thread.lastMessageId ? 'Klicken Sie um die Unterhaltung anzuzeigen...' : ''}
                </p>

                {/* Tags */}
                {thread.campaignId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color="purple" className="whitespace-nowrap text-xs">
                      PR-Kampagne
                    </Badge>
                    {hasUnread && (
                      <Badge color="blue" className="whitespace-nowrap text-xs">
                        Ungelesen
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}