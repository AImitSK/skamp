'use client';

import React, { useCallback, memo, useMemo } from 'react';
import { ChatBubbleLeftRightIcon, UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ToggleBox } from './ToggleBox';
import { CommunicationToggleBoxProps, CommunicationItem } from '@/types/customer-review';

/**
 * Communication-Toggle-Box für die Anzeige von Nachrichten und Kommunikation
 * Zeigt Feedback-Historie und aktuelle Nachrichten
 * OPTIMIERT: Mit React.memo und useMemo für bessere Performance
 */
function CommunicationToggleBoxComponent({
  id,
  title,
  isExpanded,
  onToggle,
  organizationId,
  communications = [],
  latestMessage,
  onReply,
  className = '',
  ...props
}: CommunicationToggleBoxProps) {

  const handleReply = useCallback((communication: CommunicationItem) => {
    onReply?.(communication);
  }, [onReply]);

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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // PERFORMANCE: Memoized subtitle Berechnung - ALLE Nachrichten
  const subtitle = useMemo(() => {
    // Finde die allerletzte Nachricht (egal ob Team oder Kunde)
    const latestMessage = communications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    if (latestMessage) {
      return `Letzte Nachricht: ${formatTimeAgo(latestMessage.createdAt)}`;
    }
    if (communications.length > 0) {
      return `${communications.length} Nachrichten`;
    }
    return undefined;
  }, [communications]);
  
  // PERFORMANCE: Virtualisierung für lange Listen
  const displayedCommunications = useMemo(() => 
    communications.slice(0, 50), // Begrenze auf 50 Nachrichten für bessere Performance
    [communications]
  );

  return (
    <ToggleBox
      id={id}
      title={title}
      subtitle={undefined}
      count={communications.length}
      icon={ChatBubbleLeftRightIcon}
      iconColor="text-green-600"
      isExpanded={isExpanded}
      onToggle={onToggle}
      organizationId={organizationId}
      className={className}
      data-testid="communication-toggle-box"
      {...props}
    >
      {communications.length === 0 ? (
        <div className="text-center py-8">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Noch keine Kommunikation vorhanden</p>
          <p className="text-sm text-gray-400 mt-1">
            Hier erscheinen Nachrichten und Rückmeldungen
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                        {/* Header */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {communication.senderName || communication.sender?.name}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {getTypeLabel(communication.type)}
                          </span>
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDate(communication.createdAt)}
                          </div>
                        </div>

                        {/* Nachricht */}
                        <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                          {communication.message || communication.content}
                        </div>

                        {/* Anhänge */}
                        {communication.attachments && communication.attachments.length > 0 && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Anhänge:</strong>{' '}
                            {communication.attachments.map((attachment, idx) => (
                              <span key={idx} className="mr-2">
                                📎 {attachment.name || attachment.filename}
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ToggleBox>
  );
}

// PERFORMANCE: Memoized Export
export const CommunicationToggleBox = memo(CommunicationToggleBoxComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.communications.length === nextProps.communications.length &&
    prevProps.latestMessage?.id === nextProps.latestMessage?.id
  );
});

export default CommunicationToggleBox;