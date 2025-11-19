// src/components/inbox/EmailList.tsx
"use client";

import { EmailThread } from '@/types/inbox-enhanced';
import { Badge } from '@/components/ui/badge';
import { StatusManager } from '@/components/inbox/StatusManager';
import clsx from 'clsx';
import {
  ChevronDoubleRightIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface EmailListProps {
  threads: EmailThread[];
  selectedThread: EmailThread | null;
  onThreadSelect: (thread: EmailThread) => void;
  loading?: boolean;
  onStar?: (emailId: string, starred: boolean) => void;
}

export function EmailList({
  threads,
  selectedThread,
  onThreadSelect,
  loading = false,
  onStar
}: EmailListProps) {
  
  // Helper function to safely convert Firestore timestamp to Date
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    return null;
  };

  const formatTime = (timestamp: any): string => {
    const date = toDate(timestamp);
    if (!date) return '';
    
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return 'gerade eben';
      if (diffMins < 60) return `vor ${diffMins} Minute${diffMins !== 1 ? 'n' : ''}`;
      if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
      
      return date.toLocaleDateString('de-DE');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">Keine E-Mails in diesem Ordner</p>
        </div>
      </div>
    );
  }

  // Thread list
  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const isSelected = selectedThread?.id === thread.id;
        const hasUnread = thread.unreadCount > 0;
        const primaryParticipant = thread.participants[0] || { email: 'Unbekannt' };
        
        return (
          <div
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={clsx(
              "border-b border-gray-200 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors relative",
              isSelected && "bg-blue-50 hover:bg-blue-50",
              hasUnread && "bg-white"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                isSelected ? "bg-[#005fab]" : "bg-gray-400"
              )}>
                {primaryParticipant.name 
                  ? primaryParticipant.name.charAt(0).toUpperCase()
                  : primaryParticipant.email.charAt(0).toUpperCase()
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <h4 className={clsx(
                    "text-sm truncate flex-1 mr-2",
                    hasUnread ? "font-semibold text-gray-900" : "font-normal text-gray-700"
                  )}>
                    {primaryParticipant.name || primaryParticipant.email}
                  </h4>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTime(thread.lastMessageAt)}
                  </span>
                </div>

                {/* Subject */}
                <p className={clsx(
                  "text-sm truncate mb-1",
                  hasUnread ? "font-medium text-gray-900" : "text-gray-700"
                )}>
                  {thread.subject}
                </p>

                {/* Badges row */}
                <div className="flex items-center gap-2 mt-1">
                  {hasUnread && (
                    <Badge color="blue" className="text-xs">
                      {thread.unreadCount} neu
                    </Badge>
                  )}
                  
                  {thread.messageCount > 1 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <ChevronDoubleRightIcon className="h-3 w-3" />
                      {thread.messageCount}
                    </span>
                  )}
                  
                  {thread.participants.length > 2 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <UserGroupIcon className="h-3 w-3" />
                      {thread.participants.length}
                    </span>
                  )}
                  
                  {/* Enhanced Status & Priority Display */}
                  <StatusManager
                    thread={thread}
                    compact={true}
                    showSLA={false}
                    showTimers={false}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}