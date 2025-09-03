'use client';

import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface LatestMessageBannerProps {
  latestMessage?: {
    id: string;
    type: 'feedback' | 'comment' | 'approval_request' | 'question';
    content: string;
    message: string;
    sender: {
      id: string;
      name: string;
      email: string;
      role: 'customer' | 'agency';
    };
    senderName: string;
    senderAvatar: string;
    createdAt: Date;
    isRead: boolean;
    campaignId: string;
    organizationId: string;
  };
}

export function LatestMessageBanner({ latestMessage }: LatestMessageBannerProps) {
  if (!latestMessage) return null;

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

  const getTypeLabel = (type: typeof latestMessage.type) => {
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

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
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
              Aktuelle Meldung
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
  );
}