'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  AtSymbolIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { teamChatService, TeamMessage as FirebaseTeamMessage, MessageReaction } from '@/lib/firebase/team-chat-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';
import { MentionDropdown } from './MentionDropdown';
import { AssetPickerModal, SelectedAsset } from './AssetPickerModal';
import { AssetPreview } from './AssetPreview';
import { teamChatNotificationsService } from '@/lib/firebase/team-chat-notifications';

interface TeamChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  projectId,
  projectTitle,
  organizationId,
  userId,
  userDisplayName
}) => {
  const [messages, setMessages] = useState<FirebaseTeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // @-Mention State
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Asset Picker States
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reaction States
  const [showReactionTooltip, setShowReactionTooltip] = useState<string | null>(null);

  // Prüfe Team-Mitgliedschaft und lade Team-Daten
  useEffect(() => {
    const checkTeamMembership = async () => {
      if (!projectId || !userId || !organizationId) return;

      try {
        // Lade Projekt und Team-Mitglieder parallel
        const [project, members] = await Promise.all([
          projectService.getById(projectId, { organizationId }),
          teamMemberService.getByOrganization(organizationId)
        ]);

        setTeamMembers(members);

        // Debug: Alle Team-Mitglieder ausgeben
        console.log('Alle Team-Mitglieder:', members.map(m => ({
          id: m.id,
          userId: m.userId,
          displayName: m.displayName,
          email: m.email
        })));

        if (project) {
          // Finde das aktuelle User Member-Objekt
          const currentMember = members.find(m =>
            m.userId === userId ||
            m.id === userId ||
            m.email === userDisplayName // Fallback auf Email
          );

          if (currentMember) {
            setCurrentUserPhoto(currentMember.photoUrl);

            // Prüfe Team-Mitgliedschaft mit allen möglichen ID-Varianten
            const memberUserId = currentMember.userId || currentMember.id;
            const memberId = currentMember.id;

            const isMember = Boolean(
              // Check mit Member-ID (currentMember.id) in assignedTo Array - DAS IST DER WICHTIGE CHECK!
              (project.assignedTo && project.assignedTo.includes(memberId)) ||
              // Check mit Member-userId in assignedTo Array
              (project.assignedTo && project.assignedTo.includes(memberUserId)) ||
              // Check mit direkter userId in assignedTo Array
              (project.assignedTo && project.assignedTo.includes(userId)) ||
              // Check ob User der Projekt-Admin ist
              project.userId === memberUserId ||
              project.userId === userId ||
              // Check ob User der Projekt-Manager ist
              (project.managerId && (project.managerId === memberUserId || project.managerId === userId))
            );

            console.log('Team-Mitgliedschaft Check:', {
              currentUserId: userId,
              memberUserId,
              memberId, // Die wichtige ID!
              projectUserId: project.userId,
              projectManagerId: project.managerId,
              assignedTo: project.assignedTo,
              isMember,
              // Debug: Prüfungen einzeln
              checks: {
                memberIdInAssigned: project.assignedTo && project.assignedTo.includes(memberId),
                memberUserIdInAssigned: project.assignedTo && project.assignedTo.includes(memberUserId),
                userIdInAssigned: project.assignedTo && project.assignedTo.includes(userId),
                isProjectAdmin: project.userId === memberUserId || project.userId === userId,
                isProjectManager: project.managerId && (project.managerId === memberUserId || project.managerId === userId)
              }
            });

            setIsTeamMember(isMember);
          } else {
            // Wenn kein Member gefunden wurde, prüfe direkt mit userId
            const isMember = Boolean(
              (project.assignedTo && project.assignedTo.includes(userId)) ||
              project.userId === userId ||
              (project.managerId && project.managerId === userId)
            );

            console.log('Direkte Team-Mitgliedschaft Check (kein Member gefunden):', {
              userId,
              projectUserId: project.userId,
              assignedTo: project.assignedTo,
              isMember
            });

            setIsTeamMember(isMember);
          }
        }
      } catch (error) {
        console.error('Fehler beim Prüfen der Team-Mitgliedschaft:', error);
      }
    };

    checkTeamMembership();
  }, [projectId, userId, organizationId, userDisplayName]);

  // Abonniere Nachrichten
  useEffect(() => {
    if (!projectId || !organizationId) return;

    setLoading(true);

    // Beende vorheriges Abonnement
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Abonniere neue Nachrichten
    unsubscribeRef.current = teamChatService.subscribeToMessages(
      projectId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
        // Scrolle zu neuen Nachrichten
        setTimeout(() => scrollToBottom(), 100);
      },
      100 // Lade bis zu 100 Nachrichten
    );

    // Cleanup beim Unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [projectId, organizationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !organizationId || !isTeamMember || sending) return;

    setSending(true);
    try {
      // Extrahiere Mentions
      const mentions = teamChatService.extractMentions(newMessage);

      // Sende Nachricht
      await teamChatService.sendMessage(projectId, {
        content: newMessage,
        authorId: userId,
        authorName: userDisplayName,
        authorPhotoUrl: currentUserPhoto,
        mentions,
        organizationId
      });

      // Push-Notifications für @-Mentions senden
      if (mentions.length > 0) {
        try {
          const mentionedUserIds = teamChatNotificationsService.extractMentionedUserIds(
            newMessage,
            teamMembers
          );

          if (mentionedUserIds.length > 0) {
            await teamChatNotificationsService.sendMentionNotifications({
              mentionedUserIds,
              messageContent: newMessage,
              authorId: userId,
              authorName: userDisplayName,
              projectId,
              projectTitle,
              organizationId
            });
          }
        } catch (error) {
          console.error('Fehler beim Senden der Mention-Notifications:', error);
          // Fehler bei Notifications soll Nachricht nicht blockieren
        }
      }

      setNewMessage('');
      setCursorPosition(0);
      setShowMentionDropdown(false);
      // Scrolle nach unten nach dem Senden
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: Timestamp | Date): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    if (hours < 24) return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // @-Mention Handler
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNewMessage(value);
    setCursorPosition(cursorPos);

    // Prüfe auf @-Mention
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);

    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearchTerm(searchTerm);
      setSelectedMentionIndex(0);

      // Berechne Position des Dropdowns
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        const charWidth = 8; // Geschätzte Zeichen-Breite

        setMentionDropdownPosition({
          top: rect.top - 200, // Über der Textarea
          left: rect.left + (currentLine.length * charWidth)
        });
      }

      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown) {
      const filteredMembers = teamMembers.filter(member =>
        member.displayName.toLowerCase().includes(mentionSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(mentionSearchTerm.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          selectMention(filteredMembers[selectedMentionIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    // Normale Enter-Behandlung
    if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectMention = (member: TeamMember) => {
    const beforeCursor = newMessage.substring(0, cursorPosition);
    const afterCursor = newMessage.substring(cursorPosition);

    // Finde das @ und ersetze es mit dem Namen
    const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);
    if (mentionMatch) {
      const beforeMention = beforeCursor.substring(0, mentionMatch.index);
      const newText = beforeMention + `@${member.displayName} ` + afterCursor;
      const newCursorPos = beforeMention.length + member.displayName.length + 2;

      setNewMessage(newText);
      setShowMentionDropdown(false);

      // Setze Cursor-Position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const getAuthorInfo = (authorId: string, authorName?: string): { name: string; photoUrl?: string } => {
    // Suche in teamMembers mit beiden ID-Varianten
    const member = teamMembers.find(m =>
      m.userId === authorId ||
      m.id === authorId ||
      (authorName && m.displayName === authorName)
    );

    if (member) {
      return {
        name: member.displayName,
        photoUrl: member.photoUrl
      };
    }

    // Fallback für unbekannte Mitglieder
    return {
      name: authorName || 'Unbekannter User',
      photoUrl: undefined
    };
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  // Funktion zur Ersetzung von Text-Smileys durch Emojis
  const replaceEmojis = (text: string): string => {
    let result = text;
    Object.entries(emojiMap).forEach(([textEmoji, emoji]) => {
      // Escape spezielle Regex-Zeichen
      const escapedTextEmoji = textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Verwende Wort-Grenzen für bessere Erkennung
      const regex = new RegExp(`\\b${escapedTextEmoji}\\b|(?<=\\s|^)${escapedTextEmoji}(?=\\s|$)`, 'g');
      result = result.replace(regex, emoji);
    });
    return result;
  };

  // Funktion zur Erkennung und Formatierung von Links, Assets + Emojis
  const formatMessageWithLinksAndEmojis = (content: string, isOwnMessage: boolean): JSX.Element => {
    const parts = [];
    let lastIndex = 0;

    // Asset-Links Pattern
    const assetRegex = /\[([^\]]+)\]\((asset|folder):\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\)/g;

    // Standard-Links Pattern
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

    // Finde alle Asset-Links
    let match;
    while ((match = assetRegex.exec(content)) !== null) {
      // Text vor dem Asset-Link
      if (match.index > lastIndex) {
        const beforeText = content.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push({ type: 'text', content: beforeText });
        }
      }

      // Asset-Link
      parts.push({
        type: 'asset',
        linkText: match[1],
        assetType: match[2],
        projectId: match[3],
        assetId: match[4]
      });

      lastIndex = assetRegex.lastIndex;
    }

    // Text nach dem letzten Asset-Link
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    // Wenn keine Asset-Links gefunden, behandle als normalen Text
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'asset') {
            return (
              <div key={index} className="my-2">
                <AssetPreview
                  assetId={part.assetId}
                  assetType={part.assetType as 'asset' | 'folder'}
                  linkText={part.linkText}
                  projectId={part.projectId}
                  organizationId={organizationId}
                  isOwnMessage={isOwnMessage}
                  onAssetClick={() => handleAssetLinkClick(part.assetType, part.projectId, part.assetId)}
                />
              </div>
            );
          }

          // Text-Teil: Prüfe auf Standard-URLs und verarbeite Emojis
          let textContent = part.content;

          // URL-Links verarbeiten
          const urlMatches = textContent.match(urlRegex);
          if (urlMatches) {
            urlMatches.forEach(urlMatch => {
              let url = urlMatch;
              if (!urlMatch.startsWith('http://') && !urlMatch.startsWith('https://')) {
                url = 'https://' + urlMatch;
              }

              const linkElement = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline ${
                isOwnMessage ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
              }">${urlMatch}</a>`;

              textContent = textContent.replace(urlMatch, linkElement);
            });
          }

          // Emojis ersetzen
          textContent = replaceEmojis(textContent);

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

  // Handler für Asset-Link-Clicks
  const handleAssetLinkClick = async (type: string, projectIdFromLink: string, assetId: string) => {
    // Sicherheitsprüfung: nur Assets aus dem aktuellen Projekt
    if (projectIdFromLink !== projectId) {
      console.warn('Asset gehört nicht zu diesem Projekt');
      return;
    }

    try {
      if (type === 'asset') {
        // Asset direkt öffnen/downloaden
        const asset = await mediaService.getMediaAssetById(assetId);
        if (asset && asset.downloadUrl) {
          window.open(asset.downloadUrl, '_blank');
        }
      } else if (type === 'folder') {
        // Zur Daten-Tab wechseln und Ordner anzeigen
        // TODO: Implementiere Navigation zum Daten-Tab mit spezifischem Ordner
        console.log('Navigiere zu Ordner:', assetId);
      }
    } catch (error) {
      console.error('Fehler beim Öffnen des Assets:', error);
    }
  };

  // Asset Selection Handler
  const handleAssetSelect = (asset: SelectedAsset) => {
    let assetText = '';

    if (asset.type === 'asset') {
      // Format: [Filename.jpg](asset://projectId/assetId)
      assetText = `[${asset.name}](asset://${projectId}/${asset.id})`;
    } else if (asset.type === 'folder') {
      // Format: [Ordner: FolderName](folder://projectId/folderId)
      assetText = `[Ordner: ${asset.name}](folder://${projectId}/${asset.id})`;
    }

    // Füge Asset-Link zur aktuellen Nachricht hinzu
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const currentValue = textarea.value;
      const cursorPos = textarea.selectionStart;

      // Füge Asset am Cursor ein (mit Leerzeichen wenn nötig)
      const before = currentValue.substring(0, cursorPos);
      const after = currentValue.substring(cursorPos);
      const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
      const needsSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

      const finalText = before +
        (needsSpaceBefore ? ' ' : '') +
        assetText +
        (needsSpaceAfter ? ' ' : '') +
        after;

      setNewMessage(finalText);

      // Setze Cursor nach dem Asset-Link
      setTimeout(() => {
        const newCursorPos = before.length +
          (needsSpaceBefore ? 1 : 0) +
          assetText.length +
          (needsSpaceAfter ? 1 : 0);
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  // Emoji Selection Handler
  const handleEmojiSelect = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const currentValue = textarea.value;
      const cursorPos = textarea.selectionStart;

      // Füge Emoji am Cursor ein
      const before = currentValue.substring(0, cursorPos);
      const after = currentValue.substring(cursorPos);
      const finalText = before + emoji + after;

      setNewMessage(finalText);

      // Setze Cursor nach dem Emoji
      setTimeout(() => {
        const newCursorPos = before.length + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }

    setShowEmojiPicker(false);
  };

  // Reaction Handler
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!userId || !userDisplayName) {
      console.error('Kein gültiger User für Reaction');
      return;
    }

    try {
      await teamChatService.toggleReaction(
        projectId,
        messageId,
        emoji,
        userId,
        userDisplayName
      );
    } catch (error) {
      console.error('Fehler beim Reagieren:', error);
    }
  };

  return (
    <>
      {/* CSS für Mention-Highlights */}
      <style jsx>{`
        .mention-highlight {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 500;
        }
        .mention-highlight-self {
          background-color: #fef3c7;
          color: #92400e;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 600;
        }
      `}</style>

      <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 400px)' }}>
      {/* Warnung wenn kein Team-Mitglied */}
      {!isTeamMember && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <Text className="text-sm text-yellow-800">
              Sie sind kein Mitglied dieses Projekt-Teams. Sie können die Nachrichten lesen, aber nicht schreiben.
            </Text>
          </div>
        </div>
      )}

      {/* Nachrichten-Bereich */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

              const isOwnMessage = message.authorId === userId;
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const isFirstInGroup = !previousMessage || previousMessage.authorId !== message.authorId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
                >
                  {!isOwnMessage && (
                    <Avatar
                      className="size-8 flex-shrink-0 mr-3 self-end"
                      src={authorInfo.photoUrl}
                      initials={getInitials(authorInfo.name || message.authorName)}
                    />
                  )}

                  <div className={`relative max-w-xs lg:max-w-md xl:max-w-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
                      : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
                  } px-4 py-2 shadow-sm`}>
                    {/* Name und Zeit Badge - bei jeder Nachricht */}
                    <div className={`flex items-center justify-between mb-1 ${
                      isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isOwnMessage
                          ? 'bg-blue-500 text-blue-100'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {message.authorName}
                      </span>
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                      } ml-2`}>
                        {message.timestamp ? formatTimestamp(message.timestamp) : 'gerade eben'}
                      </span>
                    </div>

                    {/* Nachrichteninhalt */}
                    <div className={`text-sm break-words whitespace-pre-wrap ${
                      isOwnMessage ? 'text-white' : 'text-gray-800'
                    }`}>
                      {/* Prüfe ob aktueller User erwähnt wurde */}
                      {teamChatNotificationsService.isUserMentioned(message.content, userDisplayName) ? (
                        <div className="bg-yellow-200 bg-opacity-20 px-1 rounded">
                          {formatMessageWithLinksAndEmojis(message.content, isOwnMessage)}
                        </div>
                      ) : (
                        formatMessageWithLinksAndEmojis(message.content, isOwnMessage)
                      )}
                    </div>

                    {/* Mentions */}
                    {message.mentions && message.mentions.length > 0 && (
                      <div className="flex items-center mt-2 space-x-1">
                        <AtSymbolIcon className={`h-3 w-3 ${
                          isOwnMessage ? 'text-blue-200' : 'text-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {message.mentions.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Bearbeitet-Hinweis */}
                    {message.edited && (
                      <div className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        (bearbeitet)
                      </div>
                    )}


                    {/* Fixe Reaction Buttons - immer sichtbar */}
                    <div className="flex items-center gap-1 mt-2">
                      {['👍', '👎', '🤚'].map((emoji) => {
                        // Finde die Reaction für dieses Emoji
                        const reaction = message.reactions?.find(r => r.emoji === emoji);
                        const hasUserReacted = reaction ? reaction.userIds.includes(userId) : false;
                        const count = reaction ? reaction.count : 0;

                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id!, emoji)}
                            onMouseEnter={() => count > 0 ? setShowReactionTooltip(`${message.id}-${emoji}`) : null}
                            onMouseLeave={() => setShowReactionTooltip(null)}
                            className={`relative text-sm px-2 py-1 rounded-full transition-colors ${
                              hasUserReacted
                                ? isOwnMessage
                                  ? 'bg-blue-200 text-blue-900'           // Geklickt: Helles Blau
                                  : 'bg-gray-300 text-gray-900'           // Geklickt: Helles Grau
                                : isOwnMessage
                                  ? 'bg-blue-600 bg-opacity-80 text-white'  // Ungeklickt: 80% vom Blasen-Blau
                                  : 'bg-gray-100 bg-opacity-80 text-gray-700'  // Ungeklickt: 80% vom Blasen-Grau
                            }`}
                            title={`Mit ${emoji} reagieren`}
                          >
                            {emoji} {count > 0 && count}

                            {/* Tooltip nur bei Count > 0 */}
                            {showReactionTooltip === `${message.id}-${emoji}` && count > 0 && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                                {reaction?.userNames.join(', ')}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isOwnMessage && (
                    <Avatar
                      className="size-8 flex-shrink-0 ml-3 self-end"
                      src={currentUserPhoto}
                      initials={getInitials(userDisplayName)}
                    />
                  )}
                </div>
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

      {/* Eingabebereich - nur für Team-Mitglieder */}
      {isTeamMember && (
        <div className="border-t border-gray-200 px-4 py-4 bg-white">
          <div className="space-y-3">
            {/* Nachrichteneingabe */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nachricht eingeben... (@name für Erwähnungen)"
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-18 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[44px]"
                  disabled={sending}
                />

                {/* Asset-Button im Textarea */}
                <button
                  type="button"
                  onClick={() => setShowAssetPicker(true)}
                  className="absolute right-10 top-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Asset anhängen"
                  disabled={sending}
                >
                  <PaperClipIcon className="h-4 w-4" />
                </button>

                {/* Emoji-Button im Textarea */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(true)}
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Emoji einfügen"
                  disabled={sending}
                >
                  <FaceSmileIcon className="h-4 w-4" />
                </button>

                {/* @-Mention Dropdown */}
                <MentionDropdown
                  isVisible={showMentionDropdown}
                  position={mentionDropdownPosition}
                  searchTerm={mentionSearchTerm}
                  teamMembers={teamMembers}
                  selectedIndex={selectedMentionIndex}
                  onSelect={selectMention}
                  onClose={() => setShowMentionDropdown(false)}
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="h-[44px] px-4 flex-shrink-0"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Text className="text-xs text-gray-500">
                📎 für Assets • @ für Erwähnungen • Shift+Enter für neue Zeile
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        onSelectAsset={handleAssetSelect}
        projectId={projectId}
        organizationId={organizationId}
      />

      {/* Emoji Picker Panel */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Emoji auswählen</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {/* Häufig verwendete Emojis */}
              {[
                '😀', '😂', '😍', '🥰', '😎', '🤔', '😅', '😊',
                '👍', '👎', '👏', '🙌', '💯', '🔥', '❤️', '💪',
                '🎉', '🎊', '✨', '⭐', '💡', '✅', '❌', '⚡',
                '👌', '✌️', '🤝', '🙏', '💖', '😴', '🤷', '🎯'
              ].map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 rounded transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Oder verwende Text-Emojis wie :) :( :D :P &lt;3
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default TeamChat;