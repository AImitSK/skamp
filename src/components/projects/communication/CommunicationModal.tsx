// src/components/projects/communication/CommunicationModal.tsx - Kommunikations-Feed Modal
'use client';

import React, { useState } from 'react';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// ========================================
// INTERFACES
// ========================================

export interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
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

        {/* Communication List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredCommunications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredCommunications.map((comm) => (
                <div key={comm.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    {/* Type Icon */}
                    <div className={`flex-shrink-0 p-2 rounded-full ${
                      comm.type === 'email' ? 'bg-blue-100 text-blue-600' :
                      comm.type === 'call' ? 'bg-green-100 text-green-600' :
                      comm.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getTypeIcon(comm.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {comm.subject}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(comm.status)}`}>
                            {comm.status === 'unread' ? 'Ungelesen' :
                             comm.status === 'replied' ? 'Beantwortet' : 'Gelesen'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comm.timestamp.toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {comm.content}
                      </p>
                      
                      <div className="flex items-center mt-2 space-x-2">
                        <UserIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {comm.participants.join(', ')}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${
                          comm.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {comm.direction === 'inbound' ? '↓ Eingehend' : '↑ Ausgehend'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Keine Kommunikation gefunden
              </h3>
              <p className="text-sm text-gray-500">
                {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Für dieses Projekt wurde noch keine Kommunikation erfasst'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredCommunications.length} von {communications.length} Einträgen
            </div>
            <div className="flex space-x-3">
              <button 
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => console.log('Neue E-Mail senden')}
              >
                Neue E-Mail
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationModal;