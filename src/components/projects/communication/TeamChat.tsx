'use client';

import React, { useState, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  AtSymbolIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';

interface TeamChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
}

interface ProjectMessage {
  id: string;
  projectId: string;
  messageType: 'general' | 'planning' | 'feedback' | 'file_upload';
  planningContext?: 'strategy' | 'briefing' | 'inspiration' | 'research';
  content: string;
  author: string;
  authorName: string;
  mentions: string[];
  attachments: { id: string; name: string; url?: string }[];
  timestamp: Date;
  organizationId: string;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  projectId,
  projectTitle,
  organizationId,
  userId,
  userDisplayName
}) => {
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'planning' | 'feedback' | 'file_upload'>('general');
  const [planningContext, setPlanningContext] = useState<'strategy' | 'briefing' | 'inspiration' | 'research' | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId && organizationId) {
      loadMessages();
    }
  }, [projectId, organizationId]);

  const loadMessages = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Mock-Daten für Team-Nachrichten
      setProjectMessages([
        {
          id: '1',
          projectId,
          messageType: 'planning',
          planningContext: 'strategy',
          content: 'Das Briefing ist jetzt finalisiert. @maria bitte einmal drüberschauen.',
          author: 'user1',
          authorName: 'Thomas Klein',
          mentions: ['maria'],
          attachments: [],
          timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 Minuten
          organizationId
        },
        {
          id: '2',
          projectId,
          messageType: 'general',
          content: 'Kann das Briefing bis morgen finalisiert werden?',
          author: 'user2',
          authorName: 'Maria Bauer',
          mentions: [],
          attachments: [],
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 Stunden
          organizationId
        },
        {
          id: '3',
          projectId,
          messageType: 'feedback',
          content: 'Die Zielgruppenanalyse sieht sehr gut aus! Ein paar kleine Anmerkungen habe ich direkt im Dokument hinterlassen.',
          author: 'user3',
          authorName: 'Stefan Schmidt',
          mentions: [],
          attachments: [
            { id: 'att1', name: 'Zielgruppenanalyse_v2.pdf', url: '#' }
          ],
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 Tag
          organizationId
        }
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !organizationId) return;

    setLoading(true);
    try {
      // Temporär: Mock-Nachricht hinzufügen
      const newMsg: ProjectMessage = {
        id: String(Date.now()),
        projectId,
        messageType,
        planningContext: messageType === 'planning' ? planningContext : undefined,
        content: newMessage,
        author: userId,
        authorName: userDisplayName,
        mentions: extractMentions(newMessage),
        attachments: [],
        timestamp: new Date(),
        organizationId
      };

      setProjectMessages(prev => [newMsg, ...prev]);
      setNewMessage('');
      setMessageType('general');
      setPlanningContext('');

      // Später: Firebase-Integration
      // await projectCommunicationService.createInternalNote(...)
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@(\w+)/g;
    const matches = text.match(mentionPattern);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `vor ${minutes} Minuten`;
    if (hours < 24) return `vor ${hours} Stunden`;
    if (days < 7) return `vor ${days} Tagen`;

    return timestamp.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'feedback': return 'bg-green-100 text-green-800';
      case 'file_upload': return 'bg-blue-100 text-blue-800';
      default: return '';
    }
  };

  const getMessageTypeLabel = (type: string, context?: string) => {
    if (type === 'planning' && context) {
      switch (context) {
        case 'strategy': return 'Strategie';
        case 'briefing': return 'Briefing';
        case 'inspiration': return 'Inspiration';
        case 'research': return 'Recherche';
      }
    }
    switch (type) {
      case 'planning': return 'Planung';
      case 'feedback': return 'Feedback';
      case 'file_upload': return 'Datei';
      default: return '';
    }
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
      {/* Nachrichten-Bereich */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {projectMessages.length > 0 ? (
          projectMessages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <Avatar
                className="size-8 flex-shrink-0"
                initials={getInitials(message.authorName)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <Text className="text-sm font-medium text-gray-900">
                    {message.authorName}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </Text>
                  {message.messageType !== 'general' && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMessageTypeColor(message.messageType)}`}>
                      {getMessageTypeLabel(message.messageType, message.planningContext)}
                    </span>
                  )}
                </div>
                <Text className="text-sm text-gray-700 mt-1 break-words">
                  {message.content}
                </Text>
                {message.mentions.length > 0 && (
                  <div className="flex items-center mt-1 space-x-1">
                    <AtSymbolIcon className="h-3 w-3 text-gray-400" />
                    <Text className="text-xs text-gray-500">
                      {message.mentions.join(', ')}
                    </Text>
                  </div>
                )}
                {message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <PaperClipIcon className="h-3 w-3" />
                        <span>{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Text className="text-gray-500">
              Noch keine Nachrichten. Starten Sie die Unterhaltung!
            </Text>
          </div>
        )}
      </div>

      {/* Eingabebereich */}
      <div className="border-t border-gray-200 px-4 py-4 bg-white">
        <div className="space-y-3">
          {/* Nachrichtentyp-Auswahl */}
          <div className="flex items-center space-x-2">
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">Allgemein</option>
              <option value="planning">Planung</option>
              <option value="feedback">Feedback</option>
            </select>

            {messageType === 'planning' && (
              <select
                value={planningContext}
                onChange={(e) => setPlanningContext(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Kontext wählen...</option>
                <option value="strategy">Strategie</option>
                <option value="briefing">Briefing</option>
                <option value="inspiration">Inspiration</option>
                <option value="research">Recherche</option>
              </select>
            )}
          </div>

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
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Datei anhängen"
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Emoji"
              >
                <FaceSmileIcon className="h-5 w-5" />
              </button>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || loading}
                className="px-4 py-2"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Text className="text-xs text-gray-500">
              Verwenden Sie @ für Erwähnungen • Shift+Enter für neue Zeile
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;