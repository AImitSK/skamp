'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { AssetPickerModal, SelectedAsset } from './AssetPickerModal';
import { MessageInput } from './TeamChat/MessageInput';
import { MessageList } from './TeamChat/MessageList';
import { TeamMember } from './TeamChat/types';
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

  const handleSendMessage = useCallback(async () => {
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
  }, [newMessage, userId, organizationId, isTeamMember, sendMessageMutation, projectId, userDisplayName, currentUserPhoto, teamMembers, projectTitle]);


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


  // Asset Selection Handler
  const handleAssetSelect = useCallback((asset: SelectedAsset) => {
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
  }, [projectId]);

  // Emoji Selection Handler
  const handleEmojiSelect = useCallback((emoji: string) => {
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
  }, []);

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
      <MessageList
        messages={messages}
        loading={loading}
        userId={userId}
        organizationId={organizationId}
        projectId={projectId}
        isTeamMember={isTeamMember}
        currentUserPhoto={currentUserPhoto}
        userDisplayName={userDisplayName}
        lastReadTimestamp={lastReadTimestamp}
        messagesEndRef={messagesEndRef}
        teamMembers={teamMembers}
        showReactionTooltip={showReactionTooltip}
        onReaction={handleReaction}
        onShowTooltip={setShowReactionTooltip}
      />

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