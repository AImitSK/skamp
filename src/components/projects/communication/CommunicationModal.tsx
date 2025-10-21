// src/components/projects/communication/CommunicationModal.tsx - Kommunikations-Feed Modal
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';
import { Button } from '@/components/ui/button';
import { MessageFilters } from './CommunicationModal/MessageFilters';
import { MessageFeed } from './CommunicationModal/MessageFeed';
import { MessageComposer } from './CommunicationModal/MessageComposer';
import type { CommunicationModalProps, ProjectMessage } from './CommunicationModal/types';

export type { CommunicationModalProps, ProjectMessage };

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

  // Performance-Optimierung: Gefilterte Communication Feed Entries
  const filteredCommunicationEntries = useMemo(() => {
    if (!communicationFeed?.entries) return [];

    let result = communicationFeed.entries;

    // Filter nach Typ
    if (filterType !== 'all') {
      result = result.filter((entry: any) => {
        // Map filterType zu entry.type
        const typeMapping: Record<string, string[]> = {
          'email': ['email-thread'],
          'call': ['call-log'],
          'meeting': ['meeting-note'],
          'note': ['internal-note']
        };
        return typeMapping[filterType]?.includes(entry.type);
      });
    }

    // Filter nach Suchbegriff
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((entry: any) => {
        return (
          entry.title?.toLowerCase().includes(lowerSearch) ||
          entry.preview?.toLowerCase().includes(lowerSearch) ||
          entry.emailData?.participants?.some((p: any) =>
            p.email?.toLowerCase().includes(lowerSearch) ||
            p.name?.toLowerCase().includes(lowerSearch)
          )
        );
      });
    }

    return result;
  }, [communicationFeed, filterType, searchTerm]);

  // Performance-Optimierung: Gefilterte Team Messages
  const filteredProjectMessages = useMemo(() => {
    let result = projectMessages;

    // Filter nach Suchbegriff
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((message) => {
        return (
          message.content.toLowerCase().includes(lowerSearch) ||
          message.authorName.toLowerCase().includes(lowerSearch) ||
          message.mentions.some((mention) => mention.toLowerCase().includes(lowerSearch))
        );
      });
    }

    return result;
  }, [projectMessages, searchTerm]);

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

        {/* Search, Filter & Tabs */}
        <MessageFilters
          searchTerm={searchTerm}
          filterType={filterType}
          activeView={activeView}
          onSearchChange={setSearchTerm}
          onFilterChange={setFilterType}
          onViewChange={setActiveView}
        />

        {/* Content Area */}
        <MessageFeed
          activeView={activeView}
          communicationFeed={communicationFeed ? { ...communicationFeed, entries: filteredCommunicationEntries } : null}
          projectMessages={filteredProjectMessages}
        />

        {/* Team-Chat Input (nur sichtbar wenn Team-Tab aktiv) */}
        {activeView === 'team' && (
          <MessageComposer
            newMessage={newMessage}
            messageType={messageType}
            planningContext={planningContext}
            loading={loading}
            onNewMessageChange={setNewMessage}
            onMessageTypeChange={setMessageType}
            onPlanningContextChange={setPlanningContext}
            onSendMessage={handleSendMessage}
          />
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {activeView === 'external' ? (
                communicationFeed ?
                  `${filteredCommunicationEntries.length} von ${communicationFeed.entries.length} externen Einträgen` :
                  'Lade externe Kommunikation...'
              ) : (
                `${filteredProjectMessages.length} von ${projectMessages.length} Team-Nachrichten`
              )}
            </div>
            <div className="flex space-x-3">
              {activeView === 'external' && (
                <Button
                  outline
                  onClick={() => {
                    // TODO: E-Mail verknüpfen Feature implementieren
                  }}
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