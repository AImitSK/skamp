'use client';

import React, { useMemo } from 'react';
import { ChatBubbleLeftRightIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { CommunicationItem } from '@/types/customer-review';

/**
 * Standalone Feedback-Chat Anzeige ohne ToggleBox-Wrapper
 * Wiederverwendbare Komponente für Chat-Verlauf in Modals
 */
interface FeedbackChatViewProps {
  communications?: CommunicationItem[];
  latestMessage?: CommunicationItem;
  className?: string;
}

export function FeedbackChatView({
  communications = [],
  latestMessage,
  className = '',
}: FeedbackChatViewProps) {

  const formatTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validierung: Prüfe ob Datum gültig ist
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'unbekannt';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    // Zusätzliche Validierung für negative Zeiten
    if (diffInMinutes < 0) return 'gerade eben';
    if (diffInMinutes < 1) return 'gerade eben';
    if (diffInMinutes < 60) return `vor ${diffInMinutes} Min.`;
    if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)} Std.`;
    return `vor ${Math.floor(diffInMinutes / 1440)} Tag(en)`;
  };

  const getTypeIcon = (type: CommunicationItem['type']) => {
    switch (type) {
      case 'feedback':
        return '💬';
      case 'comment':
        return '💬';
      case 'approval_request':
        return '✅';
      case 'question':
        return '❓';
      default:
        return '📝';
    }
  };

  const getTypeLabel = (type: CommunicationItem['type']) => {
    switch (type) {
      case 'feedback':
        return 'Feedback';
      case 'comment':
        return 'Kommentar';
      case 'approval_request':
        return 'Freigabe-Anfrage';
      case 'question':
        return 'Frage';
      default:
        return 'Nachricht';
    }
  };

  // PERFORMANCE: Virtualisierung für lange Listen
  const displayedCommunications = useMemo(() => 
    communications.slice(0, 50), // Begrenze auf 50 Nachrichten für bessere Performance
    [communications]
  );

  if (communications.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Noch keine Kommunikation vorhanden</p>
        <p className="text-sm text-gray-400 mt-1">
          Hier erscheinen Nachrichten und Rückmeldungen
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Letzte Nachricht prominent */}
      {latestMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            {/* Avatar statt Icon */}
            <div className="flex-shrink-0">
              {latestMessage.senderAvatar ? (
                <img
                  src={latestMessage.senderAvatar}
                  alt={latestMessage.senderName || latestMessage.sender?.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-green-900">
                  Neueste Nachricht
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {getTypeLabel(latestMessage.type)}
                </span>
                <span className="text-sm text-green-700">
                  {formatTimeAgo(latestMessage.createdAt)}
                </span>
              </div>
              <div className="text-sm text-green-800 mb-2">
                <strong>Von:</strong> {latestMessage.senderName || latestMessage.sender?.name}
              </div>
              <div className="text-sm text-green-900 whitespace-pre-wrap">
                {latestMessage.message || latestMessage.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kommunikations-Historie */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">
          Vollständige Kommunikationshistorie
        </h4>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {displayedCommunications.map((communication, index) => {
            const isLatest = latestMessage?.id === communication.id;
            
            return (
              <div
                key={communication.id}
                className={`
                  border rounded-lg p-4 transition-colors duration-150
                  ${isLatest 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white'
                  }
                `}
                data-testid={`communication-${communication.id}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Sender-Avatar oder Icon */}
                  <div className="flex-shrink-0">
                    {communication.senderAvatar ? (
                      <img
                        src={communication.senderAvatar}
                        alt={communication.senderName || communication.sender?.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    {/* Header mit Typ und Zeit */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {communication.senderName || communication.sender?.name}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getTypeLabel(communication.type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(communication.createdAt)}
                      </span>
                    </div>
                    
                    {/* Nachricht */}
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {communication.message || communication.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}