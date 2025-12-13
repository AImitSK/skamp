'use client';

import React from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface MessageComposerProps {
  newMessage: string;
  messageType: 'general' | 'planning' | 'feedback' | 'file_upload';
  planningContext: 'strategy' | 'briefing' | 'inspiration' | 'research' | '';
  loading: boolean;
  onNewMessageChange: (value: string) => void;
  onMessageTypeChange: (type: 'general' | 'planning' | 'feedback' | 'file_upload') => void;
  onPlanningContextChange: (context: 'strategy' | 'briefing' | 'inspiration' | 'research' | '') => void;
  onSendMessage: () => void;
}

/**
 * MessageComposer Component
 *
 * Team-Chat Input-Bereich mit:
 * - Message-Type Auswahl (Allgemein, Planung, Feedback)
 * - Planning-Context Auswahl (Strategie, Briefing, etc.)
 * - Textarea für Nachricht
 * - Send-Button
 *
 * Extrahiert aus CommunicationModal.tsx:453-502
 */
export const MessageComposer = React.memo<MessageComposerProps>(function MessageComposer({
  newMessage,
  messageType,
  planningContext,
  loading,
  onNewMessageChange,
  onMessageTypeChange,
  onPlanningContextChange,
  onSendMessage
}) {
  const t = useTranslations('projects.communication.modal.composer');

  return (
    <div className="border-t border-gray-200 px-6 py-4">
      <div className="space-y-3">
        <div className="flex space-x-2">
          <select
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="general">{t('messageTypes.general')}</option>
            <option value="planning">{t('messageTypes.planning')}</option>
            <option value="feedback">{t('messageTypes.feedback')}</option>
          </select>

          {messageType === 'planning' && (
            <select
              value={planningContext}
              onChange={(e) => onPlanningContextChange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('planningContextPlaceholder')}</option>
              <option value="strategy">{t('planningContexts.strategy')}</option>
              <option value="briefing">{t('planningContexts.briefing')}</option>
              <option value="inspiration">{t('planningContexts.inspiration')}</option>
              <option value="research">{t('planningContexts.research')}</option>
            </select>
          )}
        </div>

        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={3}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <Button
            onClick={onSendMessage}
            disabled={!newMessage.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
