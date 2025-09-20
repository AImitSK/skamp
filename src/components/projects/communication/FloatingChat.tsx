'use client';

import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { TeamChat } from './TeamChat';
import { teamChatService } from '@/lib/firebase/team-chat-service';

interface FloatingChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  projectId,
  projectTitle,
  organizationId,
  userId,
  userDisplayName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);

  // Überwache ungelesene Nachrichten
  useEffect(() => {
    if (!projectId || !organizationId || !userId) return;

    const unsubscribe = teamChatService.subscribeToMessages(
      projectId,
      (messages) => {
        if (!isOpen && lastReadTimestamp) {
          // Zähle Nachrichten nach lastReadTimestamp
          const unread = messages.filter(msg => {
            if (!msg.timestamp) return false;
            const msgTime = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp.toDate();
            return msgTime > lastReadTimestamp && msg.authorId !== userId;
          }).length;
          setUnreadCount(unread);
        }
      },
      50 // Lade nur die letzten 50 Nachrichten für Performance
    );

    return () => unsubscribe();
  }, [projectId, organizationId, userId, isOpen, lastReadTimestamp]);

  // Reset unread count wenn Chat geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLastReadTimestamp(new Date());
    }
  }, [isOpen]);

  // Speichere Chat-Zustand in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`chat_open_${projectId}`);
    if (savedState === 'true') {
      setIsOpen(true);
    }
  }, [projectId]);

  const toggleChat = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(`chat_open_${projectId}`, newState.toString());
  };

  return (
    <>
      {/* Chat Toggle Button - immer sichtbar */}
      <div className="fixed bottom-4 right-4 z-50">
        {!isOpen && (
          <button
            onClick={toggleChat}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group relative"
            title="Team-Chat öffnen"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />

            {/* Badge für ungelesene Nachrichten */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}

            {/* Hover Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Team-Chat öffnen
            </div>
          </button>
        )}
      </div>

      {/* Chat Panel - nur sichtbar wenn isOpen */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200" style={{ width: '400px', height: '600px' }}>
            {/* Chat Header */}
            <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <div>
                  <h3 className="font-medium">Team-Chat</h3>
                  <p className="text-xs text-blue-100">{projectTitle}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleChat}
                  className="hover:bg-blue-700 p-1 rounded transition-colors"
                  title="Minimieren"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    localStorage.setItem(`chat_open_${projectId}`, 'false');
                  }}
                  className="hover:bg-blue-700 p-1 rounded transition-colors"
                  title="Schließen"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="h-[calc(600px-60px)] overflow-hidden">
              <TeamChat
                projectId={projectId}
                projectTitle={projectTitle}
                organizationId={organizationId}
                userId={userId}
                userDisplayName={userDisplayName}
              />
            </div>
          </div>
        </div>
      )}

      {/* CSS für Animationen */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default FloatingChat;