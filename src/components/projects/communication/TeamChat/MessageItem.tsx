'use client';

import React from 'react';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui/avatar';
import { AssetPreview } from '../AssetPreview';
import { mediaService } from '@/lib/firebase/media-service';
import { Timestamp } from 'firebase/firestore';
import { ReactionBar } from './ReactionBar';
import { TeamMessage } from './types';

interface MessageItemProps {
  message: TeamMessage;
  userId: string;
  organizationId: string;
  projectId: string;
  authorInfo: { name: string; photoUrl?: string };
  currentUserPhoto?: string;
  userDisplayName: string;
  showReactionTooltip: string | null;
  onReaction: (messageId: string, emoji: string) => void;
  onShowTooltip: (key: string | null) => void;
}

/**
 * MessageItem Component
 *
 * Einzelne Message mit:
 * - Avatar (links für fremde, rechts für eigene)
 * - Message-Bubble mit Content
 * - Mentions (@-Liste)
 * - Edit-Hinweis
 * - Reactions (ReactionBar)
 * - Timestamp
 *
 * Extrahiert aus TeamChat.tsx:790-903
 */
export const MessageItem = React.memo<MessageItemProps>(function MessageItem({
  message,
  userId,
  organizationId,
  projectId,
  authorInfo,
  currentUserPhoto,
  userDisplayName,
  showReactionTooltip,
  onReaction,
  onShowTooltip
}) {
  const isOwnMessage = message.authorId === userId;

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: Timestamp | Date): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Emoji-Mapping für Text-Smileys
  const emojiMap: { [key: string]: string } = {
    ':)': '😊',
    ':-)': '😊',
    ';)': '😉',
    ';-)': '😉',
    ':D': '😃',
    ':-D': '😃',
    ':d': '😃',
    ':(': '😢',
    ':-(': '😢',
    ':P': '😛',
    ':-P': '😛',
    ':p': '😛',
    ':o': '😮',
    ':O': '😮',
    ':-o': '😮',
    ':-O': '😮',
    ':|': '😐',
    ':-|': '😐',
    ':*': '😘',
    ':-*': '😘',
    '<3': '❤️',
    '</3': '💔',
    ':s': '😕',
    ':-s': '😕',
    ':S': '😕',
    ':-S': '😕',
    ':\\': '😕',
    ':-\\': '😕',
    ':/': '😕',
    ':-/': '😕',
    '>:(': '😠',
    '>:-(': '😠',
    ':x': '😵',
    ':-x': '😵',
    ':X': '😵',
    ':-X': '😵'
  };

  const replaceEmojis = (text: string): string => {
    let result = text;
    Object.entries(emojiMap).forEach(([textEmoji, emoji]) => {
      const escapedTextEmoji = textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTextEmoji}\\b|(?<=\\s|^)${escapedTextEmoji}(?=\\s|$)`, 'g');
      result = result.replace(regex, emoji);
    });
    return result;
  };

  const formatMessageWithLinksAndEmojis = (content: string, isOwnMessage: boolean): JSX.Element => {
    const parts = [];
    let lastIndex = 0;

    const assetRegex = /\[([^\]]+)\]\((asset):\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

    let match;
    while ((match = assetRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = content.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push({ type: 'text', content: beforeText });
        }
      }

      parts.push({
        type: 'asset',
        linkText: match[1],
        assetType: match[2],
        projectId: match[3],
        assetId: match[4]
      });

      lastIndex = assetRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    const handleAssetLinkClick = async (type: string, projectIdFromLink: string, assetId: string) => {
      if (projectIdFromLink !== projectId) {
        console.warn('Asset gehört nicht zu diesem Projekt');
        return;
      }

      try {
        if (type === 'asset') {
          const asset = await mediaService.getMediaAssetById(assetId);
          if (asset && asset.downloadUrl) {
            window.open(asset.downloadUrl, '_blank');
          }
        }
      } catch (error) {
        console.error('Fehler beim Öffnen des Assets:', error);
      }
    };

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'asset' && part.assetId && part.assetType && part.linkText && part.projectId) {
            return (
              <div key={index} className="my-2">
                <AssetPreview
                  assetId={part.assetId}
                  assetType={part.assetType as 'asset' | 'folder'}
                  linkText={part.linkText}
                  projectId={part.projectId}
                  organizationId={organizationId}
                  isOwnMessage={isOwnMessage}
                  onAssetClick={() => handleAssetLinkClick(part.assetType!, part.projectId!, part.assetId!)}
                />
              </div>
            );
          }

          let textContent = part.content || '';

          const urlMatches = textContent.match(urlRegex);
          if (urlMatches) {
            urlMatches.forEach(urlMatch => {
              let url = urlMatch;
              if (!urlMatch.startsWith('http://') && !urlMatch.startsWith('https://')) {
                url = 'https://' + urlMatch;
              }

              const linkElement = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline ${
                isOwnMessage ? 'text-primary-600 hover:text-primary-700' : 'text-blue-600 hover:text-blue-800'
              }">${urlMatch}</a>`;

              textContent = textContent!.replace(urlMatch, linkElement);
            });
          }

          textContent = replaceEmojis(textContent!);

          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: textContent }}
            />
          );
        })}
      </>
    );
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (
        <Avatar
          className="size-8 flex-shrink-0 mr-3 self-end"
          src={authorInfo.photoUrl}
          initials={getInitials(authorInfo.name || message.authorName)}
          title={authorInfo.name || message.authorName}
        />
      )}

      <div className={`relative min-w-[200px] max-w-xs lg:max-w-md xl:max-w-lg ${
        isOwnMessage
          ? 'bg-primary-50 text-gray-900 rounded-l-lg rounded-tr-lg'
          : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
      } px-4 py-2 shadow-sm`}>
        {/* Nachrichteninhalt zuerst */}
        <div className={`text-base break-words whitespace-pre-wrap leading-relaxed mb-2 ${
          isOwnMessage ? 'text-gray-900' : 'text-gray-800'
        }`}>
          {formatMessageWithLinksAndEmojis(message.content, isOwnMessage)}
        </div>

        {/* Mentions */}
        {message.mentions && message.mentions.length > 0 && (
          <div className="flex items-center mt-2 space-x-1">
            <AtSymbolIcon className={`h-3 w-3 ${
              isOwnMessage ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <span className={`text-xs ${
              isOwnMessage ? 'text-gray-600' : 'text-gray-500'
            }`}>
              {message.mentions.join(', ')}
            </span>
          </div>
        )}

        {/* Bearbeitet-Hinweis */}
        {message.edited && (
          <div className={`text-xs mt-1 ${
            isOwnMessage ? 'text-gray-600' : 'text-gray-400'
          }`}>
            (bearbeitet)
          </div>
        )}

        {/* Untere Zeile: Reactions und Uhrzeit */}
        <div className="flex items-center justify-between">
          {/* Reactions links */}
          <ReactionBar
            messageId={message.id}
            reactions={message.reactions}
            userId={userId}
            isOwnMessage={isOwnMessage}
            showReactionTooltip={showReactionTooltip}
            onReaction={onReaction}
            onShowTooltip={onShowTooltip}
          />

          {/* Uhrzeit rechts */}
          <span className={`text-xs ${
            isOwnMessage ? 'text-gray-600' : 'text-gray-500'
          } ml-2 flex-shrink-0`}>
            {message.timestamp ? formatTimestamp(message.timestamp) : 'Unbekannt'}
          </span>
        </div>
      </div>

      {isOwnMessage && (
        <Avatar
          className="size-8 flex-shrink-0 ml-3 self-end"
          src={currentUserPhoto}
          initials={getInitials(userDisplayName)}
          title={userDisplayName}
        />
      )}
    </div>
  );
});
