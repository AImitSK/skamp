// src/components/inbox/EmailList.tsx
"use client";

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types/inbox-enhanced';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { StatusManager } from '@/components/inbox/StatusManager';
import clsx from 'clsx';
import { 
  ChevronDoubleRightIcon,
  UserGroupIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember } from '@/types/international';

interface EmailListProps {
  threads: EmailThread[];
  selectedThread: EmailThread | null;
  onThreadSelect: (thread: EmailThread) => void;
  loading?: boolean;
  onStar?: (emailId: string, starred: boolean) => void;
  onAssign?: (threadId: string, userId: string | null) => void;
  organizationId?: string;
}

export function EmailList({ 
  threads, 
  selectedThread, 
  onThreadSelect,
  loading = false,
  onStar,
  onAssign,
  organizationId
}: EmailListProps) {
  
  // NEU: State für Team-Mitglieder
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [assigningThread, setAssigningThread] = useState<string | null>(null);
  
  // NEU: Lade Team-Mitglieder
  useEffect(() => {
    if (organizationId) {
      loadTeamMembers();
    }
  }, [organizationId]);
  
  const loadTeamMembers = async () => {
    if (!organizationId) return;
    
    try {
      setLoadingTeam(true);
      const members = await teamMemberService.getByOrganization(organizationId);
      const activeMembers = members.filter(m => m.status === 'active');
      setTeamMembers(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  };
  
  // Helper function to safely convert Firestore timestamp to Date
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    return null;
  };

  const formatTime = (timestamp: any): string => {
    const date = toDate(timestamp);
    if (!date) return '';
    
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return 'gerade eben';
      if (diffMins < 60) return `vor ${diffMins} Minute${diffMins !== 1 ? 'n' : ''}`;
      if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
      
      return date.toLocaleDateString('de-DE');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  // NEU: Handle Zuweisung
  const handleAssign = async (threadId: string, userId: string | null) => {
    if (!onAssign) return;
    
    try {
      setAssigningThread(threadId);
      await onAssign(threadId, userId);
    } catch (error) {
      console.error('Error assigning thread:', error);
    } finally {
      setAssigningThread(null);
    }
  };
  
  // NEU: Finde zugewiesenes Team-Mitglied
  const getAssignedMember = (thread: EmailThread): TeamMember | null => {
    // Verwende type assertion da assignedTo optional ist
    const assignedTo = (thread as any).assignedTo;
    if (!assignedTo) return null;
    return teamMembers.find(m => m.userId === assignedTo) || null;
  };
  
  // NEU: Generiere Initialen für Avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // NEU: Generiere Avatar-Farbe basierend auf Name
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">Keine E-Mails in diesem Ordner</p>
        </div>
      </div>
    );
  }

  // Thread list
  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const isSelected = selectedThread?.id === thread.id;
        const hasUnread = thread.unreadCount > 0;
        const primaryParticipant = thread.participants[0] || { email: 'Unbekannt' };
        const assignedMember = getAssignedMember(thread);
        const isAssigning = assigningThread === thread.id;
        
        return (
          <div
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={clsx(
              "border-b border-gray-200 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors relative",
              isSelected && "bg-blue-50 hover:bg-blue-50",
              hasUnread && "bg-white"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                isSelected ? "bg-[#005fab]" : "bg-gray-400"
              )}>
                {primaryParticipant.name 
                  ? primaryParticipant.name.charAt(0).toUpperCase()
                  : primaryParticipant.email.charAt(0).toUpperCase()
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <h4 className={clsx(
                    "text-sm truncate flex-1 mr-2",
                    hasUnread ? "font-semibold text-gray-900" : "font-normal text-gray-700"
                  )}>
                    {primaryParticipant.name || primaryParticipant.email}
                  </h4>
                  <div className="flex items-center gap-2">
                    {/* NEU: Zugewiesenes Team-Mitglied */}
                    {assignedMember && (
                      <div className="flex items-center">
                        <div 
                          className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                            getAvatarColor(assignedMember.displayName)
                          )}
                          title={`Zugewiesen an ${assignedMember.displayName}`}
                        >
                          {getInitials(assignedMember.displayName)}
                        </div>
                      </div>
                    )}
                    
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTime(thread.lastMessageAt)}
                    </span>
                  </div>
                </div>

                {/* Subject */}
                <p className={clsx(
                  "text-sm truncate mb-1",
                  hasUnread ? "font-medium text-gray-900" : "text-gray-700"
                )}>
                  {thread.subject}
                </p>

                {/* Badges row */}
                <div className="flex items-center gap-2 mt-1">
                  {hasUnread && (
                    <Badge color="blue" className="text-xs">
                      {thread.unreadCount} neu
                    </Badge>
                  )}
                  
                  {thread.messageCount > 1 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <ChevronDoubleRightIcon className="h-3 w-3" />
                      {thread.messageCount}
                    </span>
                  )}
                  
                  {thread.participants.length > 2 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <UserGroupIcon className="h-3 w-3" />
                      {thread.participants.length}
                    </span>
                  )}
                  
                  {/* Enhanced Status & Priority Display */}
                  <StatusManager
                    thread={thread}
                    compact={true}
                    showSLA={false}
                    showTimers={false}
                  />
                </div>
              </div>
              
              {/* NEU: Quick Assign Button */}
              {onAssign && (
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Dropdown>
                    <DropdownButton 
                      plain 
                      className={clsx(
                        "p-1.5 hover:bg-gray-200 rounded transition-colors",
                        isAssigning && "opacity-50 cursor-wait"
                      )}
                      disabled={isAssigning}
                    >
                      {assignedMember ? (
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      {!loadingTeam ? (
                        <>
                          {assignedMember && (
                            <>
                              <DropdownItem onClick={() => handleAssign(thread.id!, null)}>
                                <XMarkIcon className="h-4 w-4 mr-2" />
                                Zuweisung entfernen
                              </DropdownItem>
                              <div className="border-t my-1" />
                            </>
                          )}
                          {teamMembers.map(member => (
                            <DropdownItem 
                              key={member.userId}
                              onClick={() => handleAssign(thread.id!, member.userId)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <div 
                                    className={clsx(
                                      "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2",
                                      getAvatarColor(member.displayName)
                                    )}
                                  >
                                    {getInitials(member.displayName)}
                                  </div>
                                  <span>{member.displayName}</span>
                                </div>
                                {assignedMember?.userId === member.userId && (
                                  <CheckIcon className="h-4 w-4 text-green-600 ml-2" />
                                )}
                              </div>
                            </DropdownItem>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Lade Team-Mitglieder...
                        </div>
                      )}
                    </DropdownMenu>
                  </Dropdown>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}