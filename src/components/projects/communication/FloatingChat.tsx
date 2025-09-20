'use client';

import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { TeamChat } from './TeamChat';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { TeamMember } from '@/types/international';
import { Avatar } from '@/components/ui/avatar';

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
  const [isOpen, setIsOpen] = useState(true); // Default: ausgeklappt
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<TeamMember[]>([]);

  // Lade Team-Mitglieder
  useEffect(() => {
    const loadTeamData = async () => {
      if (!projectId || !organizationId) return;

      try {
        // Lade Projekt und Team-Mitglieder
        const [project, members] = await Promise.all([
          projectService.getById(projectId, { organizationId }),
          teamMemberService.getByOrganization(organizationId)
        ]);

        setTeamMembers(members);

        // Filtere nur zugewiesene Mitglieder
        if (project && project.assignedTo) {
          const assigned = members.filter(member =>
            project.assignedTo?.includes(member.id) ||
            project.assignedTo?.includes(member.userId || '') ||
            project.userId === member.id ||
            project.userId === member.userId ||
            project.managerId === member.id ||
            project.managerId === member.userId
          );
          setAssignedMembers(assigned);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Team-Daten:', error);
      }
    };

    loadTeamData();
  }, [projectId, organizationId]);

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
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group relative"
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
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200" style={{ width: '550px', height: 'calc(100vh - 70px)', maxHeight: '85vh' }}>
            {/* Chat Header */}
            <div className="bg-indigo-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <ChatBubbleLeftRightIcon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-shrink-0">
                  <h3 className="font-medium">Team-Chat</h3>
                  <p className="text-xs text-indigo-100">{projectTitle}</p>
                </div>

                {/* Team-Avatare */}
                <div className="flex items-center -space-x-2 ml-4">
                  {assignedMembers.slice(0, 5).map((member, index) => {
                    const initials = member.displayName
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '??';

                    return (
                      <Avatar
                        key={member.id}
                        className="size-7 ring-2 ring-indigo-600 hover:z-10 transition-all"
                        src={member.photoUrl}
                        initials={initials}
                        style={{ zIndex: 5 - index }}
                        title={member.displayName}
                      />
                    );
                  })}
                  {assignedMembers.length > 5 && (
                    <div
                      className="size-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-medium ring-2 ring-indigo-600"
                      title={`${assignedMembers.length - 5} weitere Mitglieder`}
                    >
                      +{assignedMembers.length - 5}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={toggleChat}
                  className="hover:bg-indigo-700 p-1 rounded transition-colors"
                  title="Minimieren"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    localStorage.setItem(`chat_open_${projectId}`, 'false');
                  }}
                  className="hover:bg-indigo-700 p-1 rounded transition-colors"
                  title="Schließen"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="h-[calc(100%-60px)] overflow-hidden">
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