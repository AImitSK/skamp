'use client';

import React from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
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
  return (
    <div className="border-t border-gray-200 px-6 py-4">
      <div className="space-y-3">
        <div className="flex space-x-2">
          <select
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="general">Allgemein</option>
            <option value="planning">Planung</option>
            <option value="feedback">Feedback</option>
          </select>

          {messageType === 'planning' && (
            <select
              value={planningContext}
              onChange={(e) => onPlanningContextChange(e.target.value as any)}
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
              onChange={(e) => onNewMessageChange(e.target.value)}
              placeholder="Nachricht an das Team schreiben..."
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
