'use client';

import React, { useState } from 'react';
import { AtSymbolIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui/avatar';
import { AssetPreview } from '../AssetPreview';
import { mediaService } from '@/lib/firebase/media-service';
import { Timestamp } from 'firebase/firestore';
import { ReactionBar } from './ReactionBar';
import { TeamMessage } from './types';
import { useEditMessage, useDeleteMessage } from '@/lib/hooks/useTeamMessages';
import { toastService } from '@/lib/utils/toast';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

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

  // Edit/Delete States
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Hooks
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();

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

  // Handler: Edit starten
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  // Handler: Edit abbrechen
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  // Handler: Edit speichern
  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      toastService.error('Nachricht darf nicht leer sein');
      return;
    }

    if (editedContent === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await editMessageMutation.mutateAsync({
        projectId,
        messageId: message.id,
        newContent: editedContent
      });
      setIsEditing(false);
      toastService.success('Nachricht wurde bearbeitet');
    } catch (err: any) {
      toastService.error(err.message || 'Fehler beim Bearbeiten der Nachricht');
    }
  };

  // Handler: Message löschen (öffnet Dialog)
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  // Handler: Message löschen bestätigen
  const confirmDelete = async () => {
    try {
      await deleteMessageMutation.mutateAsync({
        projectId,
        messageId: message.id
      });
      setShowDeleteDialog(false);
      toastService.success('Nachricht wurde gelöscht');
    } catch (err: any) {
      toastService.error(err.message || 'Fehler beim Löschen der Nachricht');
    }
  };

  // Handler: Edit-History Toggle
  const toggleEditHistory = () => {
    setShowEditHistory(!showEditHistory);
  };

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
        {/* Edit/Delete Buttons (nur eigene Messages + hover) */}
        {isOwnMessage && isHovered && !isEditing && (
          <div className="absolute -top-2 -right-2 flex space-x-1">
            <button
              onClick={handleStartEdit}
              className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-50 border border-gray-200"
              title="Bearbeiten"
            >
              <PencilIcon className="h-3.5 w-3.5 text-gray-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50 border border-gray-200"
              title="Löschen"
              disabled={deleteMessageMutation.isPending}
            >
              <TrashIcon className="h-3.5 w-3.5 text-red-600" />
            </button>
          </div>
        )}

        {/* Edit-Form (wenn im Edit-Modus) */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={editMessageMutation.isPending}
              >
                <XMarkIcon className="h-4 w-4 inline mr-1" />
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                disabled={editMessageMutation.isPending}
              >
                <CheckIcon className="h-4 w-4 inline mr-1" />
                {editMessageMutation.isPending ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Nachrichteninhalt */}
            <div className={`text-base break-words whitespace-pre-wrap leading-relaxed mb-2 ${
              isOwnMessage ? 'text-gray-900' : 'text-gray-800'
            }`}>
              {formatMessageWithLinksAndEmojis(message.content, isOwnMessage)}
            </div>
          </>
        )}

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

        {/* Bearbeitet-Hinweis + Edit-History */}
        {message.edited && !isEditing && (
          <div className="mt-2">
            <button
              onClick={toggleEditHistory}
              className={`text-xs ${
                isOwnMessage ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 hover:text-gray-600'
              } underline`}
            >
              {message.editHistory && message.editHistory.length > 0
                ? `(bearbeitet - ${message.editHistory.length}x)`
                : '(bearbeitet)'}
            </button>

            {/* Edit-History Dropdown */}
            {showEditHistory && message.editHistory && message.editHistory.length > 0 && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Bearbeitungsverlauf</h4>
                <div className="space-y-2">
                  {message.editHistory.map((entry, index) => {
                    const editDate = entry.editedAt instanceof Timestamp
                      ? entry.editedAt.toDate()
                      : entry.editedAt;

                    return (
                      <div key={index} className="text-xs text-gray-600 pb-2 border-b border-gray-100 last:border-0">
                        <div className="font-medium text-gray-700 mb-1">
                          {editDate.toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-gray-500 italic">
                          "{entry.previousContent}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Nachricht löschen</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Möchten Sie diese Nachricht wirklich löschen?
              </Text>
              <Text className="text-gray-500 mt-2">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button color="primary" onClick={confirmDelete} disabled={deleteMessageMutation.isPending} className="bg-red-600 hover:bg-red-700">
            {deleteMessageMutation.isPending ? 'Löschen...' : 'Nachricht löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});
