'use client';

import React from 'react';
import { Text } from '@/components/ui/text';
import { Timestamp } from 'firebase/firestore';
import { MessageItem } from './MessageItem';
import { TeamMessage, TeamMember } from './types';

interface MessageListProps {
  messages: TeamMessage[];
  loading: boolean;
  userId: string;
  organizationId: string;
  projectId: string;
  isTeamMember: boolean;
  currentUserPhoto?: string;
  userDisplayName: string;
  lastReadTimestamp?: Date | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  teamMembers: TeamMember[];
  showReactionTooltip: string | null;
  onReaction: (messageId: string, emoji: string) => void;
  onShowTooltip: (key: string | null) => void;
}

/**
 * MessageList Component
 *
 * Zeigt die Message-Liste mit:
 * - Auto-Scroll zu neuen Messages
 * - Date Separators ("Heute", "Gestern", Datum)
 * - "Neue Nachrichten" Separator
 * - Loading State
 * - Empty State
 *
 * Extrahiert aus TeamChat.tsx:750-916
 */
export const MessageList = React.memo<MessageListProps>(function MessageList({
  messages,
  loading,
  userId,
  organizationId,
  projectId,
  isTeamMember,
  currentUserPhoto,
  userDisplayName,
  lastReadTimestamp,
  messagesEndRef,
  teamMembers,
  showReactionTooltip,
  onReaction,
  onShowTooltip
}) {
  // Team-Member Lookup Map für O(1) Performance
  const teamMemberMap = React.useMemo(() => {
    const map = new Map<string, { name: string; photoUrl?: string }>();
    teamMembers.forEach(member => {
      const info = { name: member.displayName, photoUrl: member.photoUrl };
      if (member.userId) map.set(member.userId, info);
      if (member.id) map.set(member.id, info);
      if (member.displayName) map.set(member.displayName, info);
    });
    return map;
  }, [teamMembers]);

  const getAuthorInfo = (authorId: string, authorName?: string): { name: string; photoUrl?: string } => {
    const info = teamMemberMap.get(authorId) ||
                 (authorName ? teamMemberMap.get(authorName) : null);

    if (info) {
      return info;
    }

    return {
      name: authorName || 'Unbekannter User',
      photoUrl: undefined
    };
  };

  const formatDateSeparator = (timestamp: Timestamp | Date): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.getTime() === today.getTime()) {
      return 'Heute';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const isNewDay = (currentMessage: TeamMessage, previousMessage: TeamMessage | null): boolean => {
    if (!previousMessage || !currentMessage.timestamp || !previousMessage.timestamp) return false;

    const currentDate = currentMessage.timestamp instanceof Timestamp
      ? currentMessage.timestamp.toDate()
      : currentMessage.timestamp;
    const previousDate = previousMessage.timestamp instanceof Timestamp
      ? previousMessage.timestamp.toDate()
      : previousMessage.timestamp;

    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const previousDay = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate());

    return currentDay.getTime() !== previousDay.getTime();
  };

  const shouldShowNewMessagesSeparator = (currentMessage: TeamMessage, index: number): boolean => {
    if (!lastReadTimestamp || !currentMessage.timestamp) return false;

    const currentDate = currentMessage.timestamp instanceof Timestamp
      ? currentMessage.timestamp.toDate()
      : currentMessage.timestamp;

    const isNewMessage = currentDate > lastReadTimestamp;

    if (!isNewMessage) return false;

    if (index === 0) return true;

    const previousMessage = messages[index - 1];
    if (!previousMessage.timestamp) return true;

    const previousDate = previousMessage.timestamp instanceof Timestamp
      ? previousMessage.timestamp.toDate()
      : previousMessage.timestamp;

    return previousDate <= lastReadTimestamp;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-4">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <Text className="text-gray-500 mt-2">Lade Nachrichten...</Text>
        </div>
      ) : messages.length > 0 ? (
        <>
          {messages.map((message, index) => {
            const authorInfo = message.authorPhotoUrl
              ? { name: message.authorName, photoUrl: message.authorPhotoUrl }
              : getAuthorInfo(message.authorId, message.authorName);

            const previousMessage = index > 0 ? messages[index - 1] : null;
            const isFirstInGroup = !previousMessage || previousMessage.authorId !== message.authorId;
            const showDateSeparator = index === 0 || isNewDay(message, previousMessage);
            const showNewMessagesSeparator = shouldShowNewMessagesSeparator(message, index);

            return (
              <React.Fragment key={message.id}>
                {/* Datums-Separator */}
                {showDateSeparator && message.timestamp && (
                  <div className="flex justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {formatDateSeparator(message.timestamp)}
                    </div>
                  </div>
                )}

                {/* "Neue Nachrichten" Separator */}
                {showNewMessagesSeparator && (
                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-green-300"></div>
                    <div className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium mx-3">
                      Neue Nachrichten
                    </div>
                    <div className="flex-1 border-t border-green-300"></div>
                  </div>
                )}

                <div className={isFirstInGroup ? 'mt-4' : 'mt-1'}>
                  <MessageItem
                    message={message}
                    userId={userId}
                    organizationId={organizationId}
                    projectId={projectId}
                    authorInfo={authorInfo}
                    currentUserPhoto={currentUserPhoto}
                    userDisplayName={userDisplayName}
                    showReactionTooltip={showReactionTooltip}
                    onReaction={onReaction}
                    onShowTooltip={onShowTooltip}
                  />
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </>
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8 mx-4">
            <Text className="text-gray-500 text-center">
              Noch keine Nachrichten. {isTeamMember ? 'Starten Sie die Unterhaltung!' : 'Nur Team-Mitglieder können Nachrichten senden.'}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
});
