'use client';

import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { TeamMessage } from './types';

interface UnreadIndicatorProps {
  messages: TeamMessage[];
  lastReadTimestamp?: Date | null;
}

/**
 * UnreadIndicator Component
 *
 * Zeigt ein Badge mit der Anzahl ungelesener Nachrichten
 * - Nur sichtbar wenn unreadCount > 0
 * - Berechnet aus messages.filter(msg => msg.timestamp > lastReadTimestamp)
 */
export const UnreadIndicator = React.memo<UnreadIndicatorProps>(function UnreadIndicator({
  messages,
  lastReadTimestamp
}) {
  const unreadCount = React.useMemo(() => {
    if (!lastReadTimestamp) return 0;

    return messages.filter(msg => {
      if (!msg.timestamp) return false;

      const messageDate = msg.timestamp instanceof Timestamp
        ? msg.timestamp.toDate()
        : msg.timestamp;

      return messageDate > lastReadTimestamp;
    }).length;
  }, [messages, lastReadTimestamp]);

  if (unreadCount === 0) return null;

  return (
    <div className="flex items-center justify-center">
      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        {unreadCount} {unreadCount === 1 ? 'neue Nachricht' : 'neue Nachrichten'}
      </div>
    </div>
  );
});
