'use client';

import React from 'react';
import {
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { ProjectMessage } from './types';

interface MessageFeedProps {
  activeView: 'external' | 'team';
  communicationFeed: any | null;
  projectMessages: ProjectMessage[];
}

/**
 * MessageFeed Component
 *
 * Feed-Rendering für:
 * - Externe Kommunikation (E-Mails, etc.)
 * - Team-Chat Messages
 * - Empty States
 *
 * Extrahiert aus CommunicationModal.tsx:324-450
 */
export const MessageFeed = React.memo<MessageFeedProps>(function MessageFeed({
  activeView,
  communicationFeed,
  projectMessages
}) {
  const t = useTranslations('projects.communication.modal.feed');

  return (
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
                              {t('external.unread', { count: entry.emailData.unreadCount })}
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
                {t('external.empty.title')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('external.empty.description')}
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
                            {t('team.badge.planning')}
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
                            {t('team.mentioned', { names: message.mentions.join(', ') })}
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
                {t('team.empty.title')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('team.empty.description')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
