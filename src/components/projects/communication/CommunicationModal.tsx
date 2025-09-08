// src/components/projects/communication/CommunicationModal.tsx - Kommunikations-Feed Modal
'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PaperAirplaneIcon,
  LinkIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

// ========================================
// INTERFACES
// ========================================

export interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
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

interface CommunicationItem {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  content: string;
  participants: string[];
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status: 'unread' | 'read' | 'replied';
}

// Mock Data
const mockCommunications: CommunicationItem[] = [
  {
    id: '1',
    type: 'email',
    subject: 'Freigabe für erste Entwürfe',
    content: 'Die ersten Designentwürfe sehen sehr gut aus. Können wir einen Termin für die finale Abstimmung vereinbaren?',
    participants: ['kunde@firma.com', 'team@celeropress.com'],
    timestamp: new Date('2024-01-15T10:30:00'),
    direction: 'inbound',
    status: 'unread'
  },
  {
    id: '2',
    type: 'call',
    subject: 'Telefonat: Projektstatus besprochen',
    content: 'Ausführliche Besprechung des aktuellen Projektstatus. Nächste Schritte definiert.',
    participants: ['Max Mustermann', 'Anna Schmidt'],
    timestamp: new Date('2024-01-14T14:15:00'),
    direction: 'outbound',
    status: 'read'
  },
  {
    id: '3',
    type: 'email',
    subject: 'Materialien für die Kampagne',
    content: 'Anbei finden Sie die angeforderten Logos und Bildmaterialien für die geplante Kampagne.',
    participants: ['design@celeropress.com'],
    timestamp: new Date('2024-01-13T09:45:00'),
    direction: 'outbound',
    status: 'replied'
  },
  {
    id: '4',
    type: 'meeting',
    subject: 'Kick-off Meeting',
    content: 'Projekt-Kick-off mit allen Beteiligten. Ziele und Timeline definiert.',
    participants: ['Team CeleroPress', 'Kunde'],
    timestamp: new Date('2024-01-10T11:00:00'),
    direction: 'inbound',
    status: 'read'
  }
];

// ========================================
// COMMUNICATION MODAL KOMPONENTE
// ========================================

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'email' | 'call' | 'meeting' | 'note'>('all');
  const [communications] = useState<CommunicationItem[]>(mockCommunications);
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'planning' | 'feedback' | 'file_upload'>('general');
  const [planningContext, setPlanningContext] = useState<'strategy' | 'briefing' | 'inspiration' | 'research' | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'external' | 'team'>('external');
  const [communicationFeed, setCommunicationFeed] = useState<any>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Lade Kommunikationsfeed beim Öffnen des Modals
  useEffect(() => {
    if (isOpen && projectId && currentOrganization?.id) {
      loadCommunicationFeed();
    }
  }, [isOpen, projectId, currentOrganization?.id]);

  const loadCommunicationFeed = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const feed = await projectCommunicationService.getProjectCommunicationFeed(
        projectId,
        currentOrganization.id,
        { limit: 25, types: ['email-thread', 'internal-note'] }
      );
      setCommunicationFeed(feed);
      
      // Lade Team-Nachrichten (Mock für jetzt)
      setProjectMessages([
        {
          id: '1',
          projectId,
          messageType: 'planning',
          planningContext: 'strategy',
          content: 'Das Briefing ist jetzt finalisiert. @maria bitte einmal drüberschauen.',
          author: user?.uid || 'user1',
          authorName: user?.displayName || 'Aktueller User',
          mentions: ['maria'],
          attachments: [],
          timestamp: new Date(),
          organizationId: currentOrganization.id
        }
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Kommunikation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !currentOrganization?.id) return;
    
    setLoading(true);
    try {
      await projectCommunicationService.createInternalNote(
        projectId,
        newMessage,
        user.uid,
        user.displayName || 'Unbekannter User',
        currentOrganization.id,
        [], // mentions - später implementieren
        []  // attachments - später implementieren
      );
      
      setNewMessage('');
      setMessageType('general');
      setPlanningContext('');
      await loadCommunicationFeed();
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter communications
  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || comm.type === filterType;
    return matchesSearch && matchesType;
  });

  // Get icon for communication type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />;
      case 'call': return <PhoneIcon className="h-4 w-4" />;
      case 'meeting': return <CalendarIcon className="h-4 w-4" />;
      case 'note': return <DocumentTextIcon className="h-4 w-4" />;
      default: return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-blue-100 text-blue-800';
      case 'replied': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Projekt-Kommunikation
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {projectTitle} - Alle projekt-bezogenen Kommunikation
          </p>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Kommunikation durchsuchen..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle</option>
                <option value="email">E-Mails</option>
                <option value="call">Anrufe</option>
                <option value="meeting">Meetings</option>
                <option value="note">Notizen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-6 px-6">
            <button
              onClick={() => setActiveView('external')}
              className={`py-3 text-sm font-medium ${
                activeView === 'external'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <EnvelopeIcon className="w-4 h-4 mr-2 inline" />
              Externe Kommunikation
            </button>
            <button
              onClick={() => setActiveView('team')}
              className={`py-3 text-sm font-medium ${
                activeView === 'team'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 inline" />
              Team-Chat
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-h-[50vh] overflow-y-auto">
          {activeView === 'external' ? (
            // Externe Kommunikation (E-Mails, etc.)
            <div>
              {communicationFeed && communicationFeed.entries.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {communicationFeed.entries.map((entry: any) => (
                    <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 p-2 rounded-full ${
                          entry.type === 'email-thread' ? 'bg-blue-100 text-blue-600' :
                          entry.type === 'internal-note' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {entry.type === 'email-thread' ? <EnvelopeIcon className="h-4 w-4" /> :
                           entry.type === 'internal-note' ? <DocumentTextIcon className="h-4 w-4" /> :
                           <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {entry.title}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {entry.timestamp.toDate().toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {entry.preview}
                          </p>
                          {entry.emailData && (
                            <div className="flex items-center mt-2 space-x-2">
                              <UserIcon className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {entry.emailData.participants.map((p: any) => p.email).join(', ')}
                              </span>
                              {entry.emailData.unreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
                                  {entry.emailData.unreadCount} ungelesen
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <EnvelopeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Keine externe Kommunikation
                  </h3>
                  <p className="text-sm text-gray-500">
                    E-Mails und externe Nachrichten werden automatisch hier angezeigt.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Team-Chat
            <div>
              {projectMessages.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {projectMessages.map((message) => (
                    <div key={message.id} className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Text className="text-xs font-medium text-blue-600">
                            {message.authorName.charAt(0).toUpperCase()}
                          </Text>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Text className="text-sm font-medium text-gray-900">
                              {message.authorName}
                            </Text>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {message.messageType === 'planning' && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs font-medium rounded-full">
                                Planung
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {message.content}
                          </p>
                          {message.mentions.length > 0 && (
                            <div className="flex items-center mt-2 space-x-1">
                              <AtSymbolIcon className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                Erwähnt: {message.mentions.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Noch keine Team-Nachrichten
                  </h3>
                  <p className="text-sm text-gray-500">
                    Schreiben Sie die erste Nachricht für das Team.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team-Chat Input (nur sichtbar wenn Team-Tab aktiv) */}
        {activeView === 'team' && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="space-y-3">
              <div className="flex space-x-2">
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">Allgemein</option>
                  <option value="planning">Planung</option>
                  <option value="feedback">Feedback</option>
                </select>
                
                {messageType === 'planning' && (
                  <select
                    value={planningContext}
                    onChange={(e) => setPlanningContext(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Planungskontext wählen...</option>
                    <option value="strategy">Strategie</option>
                    <option value="briefing">Briefing</option>
                    <option value="inspiration">Inspiration</option>
                    <option value="research">Recherche</option>
                  </select>
                )}
              </div>
              
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nachricht an das Team schreiben..."
                    rows={3}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {activeView === 'external' ? (
                communicationFeed ? 
                  `${communicationFeed.entries.length} externe Einträge` : 
                  'Lade externe Kommunikation...'
              ) : (
                `${projectMessages.length} Team-Nachrichten`
              )}
            </div>
            <div className="flex space-x-3">
              {activeView === 'external' && (
                <Button
                  outline
                  onClick={() => console.log('E-Mail verknüpfen')}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  E-Mail verknüpfen
                </Button>
              )}
              <Button onClick={onClose}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationModal;