'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  AtSymbolIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  HandRaisedIcon
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
import { MessageInput } from './TeamChat/MessageInput';
import { teamChatNotificationsService } from '@/lib/firebase/team-chat-notifications';
import { useTeamMessages, useSendMessage, useMessageReaction } from '@/lib/hooks/useTeamMessages';

interface TeamChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
  lastReadTimestamp?: Date | null;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  projectId,
  projectTitle,
  organizationId,
  userId,
  userDisplayName,
  lastReadTimestamp
}) => {
  // React Query Hooks für Messages (ersetzt useState + useEffect)
  const { data: messages = [], isLoading: loading } = useTeamMessages(projectId);
  const sendMessageMutation = useSendMessage();
  const reactionMutation = useMessageReaction();

  const [newMessage, setNewMessage] = useState('');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
              (project.projectManager && (project.projectManager === memberUserId || project.projectManager === userId))
            );

            setIsTeamMember(isMember);
          } else {
            // Wenn kein Member gefunden wurde, prüfe direkt mit userId
            const isMember = Boolean(
              (project.assignedTo && project.assignedTo.includes(userId)) ||
              project.userId === userId ||
              (project.projectManager && project.projectManager === userId)
            );

            setIsTeamMember(isMember);
          }
        }
      } catch (error) {
        console.error('Fehler beim Prüfen der Team-Mitgliedschaft:', error);
      }
    };

    checkTeamMembership();
  }, [projectId, userId, organizationId, userDisplayName]);

  // Verhindere Body-Scroll-Jump bei Modals
  useEffect(() => {
    const isModalOpen = showAssetPicker || showEmojiPicker;

    if (isModalOpen) {
      // Berechne Scrollbar-Breite
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Füge padding-right hinzu um Jump zu verhindern
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
      // Wichtig: Fixed Elemente auch anpassen
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      // Reset wenn Modals geschlossen
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = '';
      }
    }

    // Cleanup
    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = '';
      }
    };
  }, [showAssetPicker, showEmojiPicker]);

  // Auto-Scroll zu neuen Messages (wenn neue Messages kommen)
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => scrollToBottom(), 300);
    }
  }, [messages.length, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initiales Scrollen nach unten beim ersten Laden
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Sofortiges Scrollen ohne Animation beim ersten Laden
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 200);
    }
  }, [loading, messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !organizationId || !isTeamMember || sendMessageMutation.isPending) return;

    try {
      // Extrahiere Mentions
      const mentions = teamChatService.extractMentions(newMessage);

      // Sende Nachricht via React Query Mutation
      await sendMessageMutation.mutateAsync({
        projectId,
        content: newMessage,
        authorId: userId,
        authorName: userDisplayName,
        authorPhotoUrl: currentUserPhoto,
        organizationId,
        mentions,
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
    }
  };

  const formatTimestamp = (timestamp: Timestamp | Date): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Datum für Tagesseparator formatieren
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

  // Prüfe ob neuer Tag beginnt
  const isNewDay = (currentMessage: FirebaseTeamMessage, previousMessage: FirebaseTeamMessage | null): boolean => {
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

  // Prüfe ob "Neue Nachrichten" Separator angezeigt werden soll
  const shouldShowNewMessagesSeparator = (currentMessage: FirebaseTeamMessage, index: number): boolean => {
    if (!lastReadTimestamp || !currentMessage.timestamp) return false;

    const currentDate = currentMessage.timestamp instanceof Timestamp
      ? currentMessage.timestamp.toDate()
      : currentMessage.timestamp;

    // Ist diese Nachricht nach dem lastReadTimestamp?
    const isNewMessage = currentDate > lastReadTimestamp;

    if (!isNewMessage) return false;

    // Prüfe ob die vorherige Nachricht älter als lastReadTimestamp ist
    if (index === 0) return true; // Erste Nachricht und sie ist neu

    const previousMessage = messages[index - 1];
    if (!previousMessage.timestamp) return true;

    const previousDate = previousMessage.timestamp instanceof Timestamp
      ? previousMessage.timestamp.toDate()
      : previousMessage.timestamp;

    return previousDate <= lastReadTimestamp;
  };

  // @-Mention Handler
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [showMentionDropdown, teamMembers, mentionSearchTerm, selectedMentionIndex]);

  const selectMention = useCallback((member: TeamMember) => {
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
  }, [newMessage, cursorPosition]);

  // useMemo: Team-Member Lookup Map für bessere Performance
  const teamMemberMap = useMemo(() => {
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
    // Nutze Map für O(1) Lookup statt O(n) find
    const info = teamMemberMap.get(authorId) ||
                 (authorName ? teamMemberMap.get(authorName) : null);

    if (info) {
      return info;
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
    const assetRegex = /\[([^\]]+)\]\((asset):\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\)/g;

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

          // Text-Teil: Prüfe auf Standard-URLs und verarbeite Emojis
          let textContent = part.content || '';

          // URL-Links verarbeiten
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

          // Emojis ersetzen
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

  // Reaction Handler (React Query Mutation) - Optimiert mit useCallback
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId || !userDisplayName) {
      console.error('Kein gültiger User für Reaction');
      return;
    }

    try {
      await reactionMutation.mutateAsync({
        projectId,
        messageId,
        emoji,
        userId,
        userName: userDisplayName,
      });
    } catch (error) {
      console.error('Fehler beim Reagieren:', error);
    }
  }, [projectId, userId, userDisplayName, reactionMutation]);

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

      <div className="flex flex-col h-full">
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

              const isOwnMessage = message.authorId === userId;
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

                  <div
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
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
                      <div className="flex items-center gap-1">
                      {[
                        { emoji: '👍', icon: HandThumbUpIcon, label: 'Gefällt mir' },
                        { emoji: '👎', icon: HandThumbDownIcon, label: 'Gefällt mir nicht' },
                        { emoji: '🤚', icon: HandRaisedIcon, label: 'Entscheide ihr / Enthaltung' }
                      ].map(({ emoji, icon: IconComponent, label }) => {
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
                            {showReactionTooltip === `${message.id}-${emoji}` && count > 0 && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                                {reaction?.userNames.join(', ')}
                              </div>
                            )}
                          </button>
                        );
                      })}
                      </div>

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

      {/* Eingabebereich - nur für Team-Mitglieder */}
      {isTeamMember && (
        <MessageInput
          newMessage={newMessage}
          sending={sendMessageMutation.isPending}
          textareaRef={textareaRef}
          handleTextChange={handleTextChange}
          handleKeyDown={handleKeyDown}
          handleSendMessage={handleSendMessage}
          setShowAssetPicker={setShowAssetPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          showMentionDropdown={showMentionDropdown}
          mentionDropdownPosition={mentionDropdownPosition}
          mentionSearchTerm={mentionSearchTerm}
          teamMembers={teamMembers}
          selectedMentionIndex={selectedMentionIndex}
          selectMention={selectMention}
          setShowMentionDropdown={setShowMentionDropdown}
        />
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