/**
 * MessageInput.tsx - Team Chat Input Component
 *
 * KRITISCH: 1:1 Kopie aus TeamChat.tsx (Zeilen 914-983)
 * - Icons INNERHALB des Textarea (absolute Position)
 * - Layout: flex items-center space-x-3
 * - Send-Button RECHTS vom Textarea
 *
 * UI-Inventory: docs/planning/shared/communication-ui-inventory-checklist.md:36-68
 */

import React from 'react';
import {
  PaperClipIcon,
  FaceSmileIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { TeamMember } from '@/types/international';
import { MentionDropdown } from '../MentionDropdown';

interface MessageInputProps {
  newMessage: string;
  sending: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  setShowAssetPicker: (show: boolean) => void;
  setShowEmojiPicker: (show: boolean) => void;

  // @-Mention Props
  showMentionDropdown: boolean;
  mentionDropdownPosition: { top: number; left: number };
  mentionSearchTerm: string;
  teamMembers: TeamMember[];
  selectedMentionIndex: number;
  selectMention: (member: TeamMember) => void;
  setShowMentionDropdown: (show: boolean) => void;
}

export const MessageInput: React.FC<MessageInputProps> = React.memo(({
  newMessage,
  sending,
  textareaRef,
  handleTextChange,
  handleKeyDown,
  handleSendMessage,
  setShowAssetPicker,
  setShowEmojiPicker,
  showMentionDropdown,
  mentionDropdownPosition,
  mentionSearchTerm,
  teamMembers,
  selectedMentionIndex,
  selectMention,
  setShowMentionDropdown,
}) => {
  return (
    <div className="border-t border-gray-200 px-4 pt-4 pb-2 bg-white">
      <div>
        {/* Nachrichteneingabe */}
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder=""
              rows={1}
              className="w-full text-base border border-gray-300 rounded-lg px-3 py-2 pr-20 focus:ring-blue-500 focus:border-blue-500 resize-none h-[44px] leading-relaxed"
              disabled={sending}
            />

            {/* Icons Container mit weißem Hintergrund */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white rounded-md flex items-center space-x-1 px-1">
              {/* Asset-Button */}
              <button
                type="button"
                onClick={() => setShowAssetPicker(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Asset anhängen"
                disabled={sending}
              >
                <PaperClipIcon className="h-4 w-4" />
              </button>

              {/* Emoji-Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Emoji einfügen"
                disabled={sending}
              >
                <FaceSmileIcon className="h-4 w-4" />
              </button>
            </div>

            {/* @-Mention Dropdown */}
            <MentionDropdown
              isVisible={showMentionDropdown}
              position={mentionDropdownPosition}
              searchTerm={mentionSearchTerm}
              teamMembers={teamMembers}
              selectedIndex={selectedMentionIndex}
              onSelect={selectMention}
              onClose={() => setShowMentionDropdown(false)}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="h-[44px] min-h-[44px] px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Send"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <ArrowRightIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';
