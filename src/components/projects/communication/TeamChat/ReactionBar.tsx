'use client';

import React from 'react';
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';
import { MessageReaction } from './types';

interface ReactionBarProps {
  messageId: string;
  reactions?: MessageReaction[];
  userId: string;
  isOwnMessage: boolean;
  showReactionTooltip: string | null;
  onReaction: (messageId: string, emoji: string) => void;
  onShowTooltip: (key: string | null) => void;
}

/**
 * ReactionBar Component
 *
 * Zeigt die 3 Reactions (👍 👎 🤚) für eine Message
 * - 4 verschiedene States (geklickt/ungeklickt x eigene/fremde Message)
 * - Tooltip nur bei Count > 0
 * - Extrahiert aus TeamChat.tsx:843-882
 */
export const ReactionBar = React.memo<ReactionBarProps>(function ReactionBar({
  messageId,
  reactions,
  userId,
  isOwnMessage,
  showReactionTooltip,
  onReaction,
  onShowTooltip
}) {
  return (
    <div className="flex items-center gap-1">
      {[
        { emoji: '👍', icon: HandThumbUpIcon, label: 'Gefällt mir' },
        { emoji: '👎', icon: HandThumbDownIcon, label: 'Gefällt mir nicht' },
        { emoji: '🤚', icon: HandRaisedIcon, label: 'Entscheide ihr / Enthaltung' }
      ].map(({ emoji, icon: IconComponent, label }) => {
        // Finde die Reaction für dieses Emoji
        const reaction = reactions?.find(r => r.emoji === emoji);
        const hasUserReacted = reaction ? reaction.userIds.includes(userId) : false;
        const count = reaction ? reaction.count : 0;

        return (
          <button
            key={emoji}
            onClick={() => onReaction(messageId, emoji)}
            onMouseEnter={() => count > 0 ? onShowTooltip(`${messageId}-${emoji}`) : null}
            onMouseLeave={() => onShowTooltip(null)}
            className={`relative flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
              hasUserReacted
                ? isOwnMessage
                  ? 'bg-primary-100 text-gray-800'             // Geklickt: Wie Namens-Badge (hellblau)
                  : 'bg-gray-200 text-gray-700'             // Geklickt: Wie Namens-Badge (grau)
                : isOwnMessage
                  ? 'bg-primary-50 bg-opacity-80 text-gray-700'  // Ungeklickt: 80% vom Blasen-Hellblau
                  : 'bg-gray-100 bg-opacity-80 text-gray-700'  // Ungeklickt: 80% vom Blasen-Grau
            }`}
            title={label}
          >
            <IconComponent className="h-4 w-4" />
            {count > 0 && <span className="text-xs">{count}</span>}

            {/* Tooltip nur bei Count > 0 */}
            {showReactionTooltip === `${messageId}-${emoji}` && count > 0 && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                {reaction?.userNames.join(', ')}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
});
