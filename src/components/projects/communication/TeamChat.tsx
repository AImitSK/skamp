'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  AtSymbolIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { teamChatService, TeamMessage as FirebaseTeamMessage } from '@/lib/firebase/team-chat-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

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
            const isMember =
              // Check mit Member-ID in assignedTo Array
              project.assignedTo?.includes(memberUserId) ||
              // Check mit direkter userId in assignedTo Array
              project.assignedTo?.includes(userId) ||
              // Check ob User der Projekt-Admin ist
              project.userId === memberUserId ||
              project.userId === userId ||
              // Check ob User der Projekt-Manager ist
              (project.managerId && (project.managerId === memberUserId || project.managerId === userId));

            console.log('Team-Mitgliedschaft Check:', {
              currentUserId: userId,
              memberUserId,
              projectUserId: project.userId,
              projectManagerId: project.managerId,
              assignedTo: project.assignedTo,
              isMember
            });

            setIsTeamMember(isMember);
          } else {
            // Wenn kein Member gefunden wurde, prüfe direkt mit userId
            const isMember =
              project.assignedTo?.includes(userId) ||
              project.userId === userId ||
              (project.managerId && project.managerId === userId);

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

      setNewMessage('');
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

  return (
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
            {messages.map((message) => {
              const authorInfo = message.authorPhotoUrl
                ? { name: message.authorName, photoUrl: message.authorPhotoUrl }
                : getAuthorInfo(message.authorId, message.authorName);

              return (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar
                    className="size-8 flex-shrink-0"
                    src={authorInfo.photoUrl}
                    initials={getInitials(authorInfo.name || message.authorName)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2">
                      <Text className="text-sm font-medium text-gray-900">
                        {message.authorName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {message.timestamp ? formatTimestamp(message.timestamp) : 'gerade eben'}
                      </Text>
                      {message.edited && (
                        <Text className="text-xs text-gray-400">(bearbeitet)</Text>
                      )}
                    </div>
                    <Text className="text-sm text-gray-700 mt-1 break-words whitespace-pre-wrap">
                      {message.content}
                    </Text>
                    {message.mentions && message.mentions.length > 0 && (
                      <div className="flex items-center mt-1 space-x-1">
                        <AtSymbolIcon className="h-3 w-3 text-gray-400" />
                        <Text className="text-xs text-gray-500">
                          {message.mentions.join(', ')}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-12">
            <Text className="text-gray-500">
              Noch keine Nachrichten. {isTeamMember ? 'Starten Sie die Unterhaltung!' : 'Nur Team-Mitglieder können Nachrichten senden.'}
            </Text>
          </div>
        )}
      </div>

      {/* Eingabebereich - nur für Team-Mitglieder */}
      {isTeamMember && (
        <div className="border-t border-gray-200 px-4 py-4 bg-white">
          <div className="space-y-3">
            {/* Nachrichteneingabe */}
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Nachricht eingeben... (@name für Erwähnungen)"
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={sending}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2"
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
                Verwenden Sie @ für Erwähnungen • Shift+Enter für neue Zeile
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;