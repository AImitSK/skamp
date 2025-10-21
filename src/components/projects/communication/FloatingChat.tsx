'use client';

import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { TeamChat } from './TeamChat';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { TeamMember } from '@/types/international';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useFloatingChatState } from '@/lib/hooks/useFloatingChatState';

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
  // Chat-Zustand mit Custom Hook (LocalStorage-Logik ausgelagert)
  const { isOpen, setIsOpen } = useFloatingChatState(projectId);

  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<TeamMember[]>([]);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Animation nur beim ersten Mount triggern, wenn Chat bereits offen ist
  useEffect(() => {
    if (isOpen) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, []); // Nur beim ersten Mount

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
            project.projectManager === member.id ||
            project.projectManager === member.userId
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


  // Verhindere Body-Scroll-Jump beim Dialog öffnen
  useEffect(() => {
    if (showClearChatDialog) {
      // Berechne Scrollbar-Breite
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Füge padding-right hinzu um Jump zu verhindern
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
      // Wichtig: Fixed Elemente auch anpassen
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      // Reset wenn Dialog geschlossen
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = '';
      }
    }

    // Cleanup
    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      const chatElement = document.querySelector('[data-floating-chat]');
      if (chatElement instanceof HTMLElement) {
        chatElement.style.paddingRight = '';
      }
    };
  }, [showClearChatDialog]);

  const toggleChat = () => {
    const newState = !isOpen;
    if (newState) {
      // Nur animieren wenn Chat geöffnet wird
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 300); // Animation-Dauer
    }
    setIsOpen(newState);
    // Globaler localStorage-Key wird automatisch im useEffect gespeichert
  };

  const handleClearChat = () => {
    setShowClearChatDialog(true);
  };

  const confirmClearChat = async () => {
    try {
      await teamChatService.clearChatHistory(projectId);
      setShowClearChatDialog(false);
      // Optional: Seite neu laden oder State zurücksetzen
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Löschen des Chat-Verlaufs:', error);
      alert('Fehler beim Löschen des Chat-Verlaufs');
    }
  };

  return (
    <>
      {/* Chat Toggle Button - immer sichtbar */}
      <div className="fixed bottom-4 right-4 z-50">
        {!isOpen && (
          <button
            onClick={toggleChat}
            className="bg-primary hover:bg-primary-hover text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group relative"
            title="Team-Chat öffnen"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />

            {/* Badge für ungelesene Nachrichten */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}

            {/* Grüner Punkt für neue Nachrichten (auch ohne Counter) */}
            {unreadCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 bg-green-400 rounded-full h-3 w-3 animate-pulse ring-2 ring-white"></div>
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
        <div className={`fixed bottom-4 right-4 z-50 ${shouldAnimate ? 'animate-slide-up' : ''}`} data-floating-chat>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200" style={{ width: '550px', height: 'calc(100vh - 70px)', maxHeight: '85vh' }}>
            {/* Chat Header */}
            <div className="bg-primary text-white px-2 py-2 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {/* Team-Avatare zuerst */}
                <div className="flex items-center -space-x-2">
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
                        className="size-7 ring-2 ring-primary hover:z-10 transition-all"
                        src={member.photoUrl}
                        initials={initials}
                        style={{ zIndex: 5 - index }}
                        title={member.displayName}
                      />
                    );
                  })}
                  {assignedMembers.length > 5 && (
                    <div
                      className="size-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-medium ring-2 ring-primary"
                      title={`${assignedMembers.length - 5} weitere Mitglieder`}
                    >
                      +{assignedMembers.length - 5}
                    </div>
                  )}
                </div>

                {/* Nur "Projekt-Chat" Text */}
                <h3 className="font-medium">Projekt-Chat</h3>
              </div>

              {/* Minimieren und Mehr-Optionen Buttons */}
              <div className="flex-shrink-0 flex items-center space-x-1">
                <button
                  onClick={toggleChat}
                  className="hover:bg-primary-hover p-1 rounded transition-colors"
                  title="Minimieren"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>

                <button
                  onClick={handleClearChat}
                  className="hover:bg-primary-hover p-1 rounded transition-colors"
                  title="Mehr Optionen"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
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
                lastReadTimestamp={lastReadTimestamp}
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
      {/* Clear Chat Dialog */}
      <Dialog open={showClearChatDialog} onClose={() => setShowClearChatDialog(false)}>
        <DialogTitle>Chat-Verlauf löschen</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Möchten Sie den gesamten Chat-Verlauf wirklich löschen?
              </Text>
              <Text className="text-gray-500 mt-2">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle Nachrichten werden permanent gelöscht.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowClearChatDialog(false)}>
            Abbrechen
          </Button>
          <Button color="red" onClick={confirmClearChat}>
            Chat-Verlauf löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FloatingChat;