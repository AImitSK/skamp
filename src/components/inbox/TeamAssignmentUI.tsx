// src/components/inbox/TeamAssignmentUI.tsx
"use client";

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types/inbox-enhanced';
import { TeamMember } from '@/types/international';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import clsx from 'clsx';
import { 
  UserGroupIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/20/solid';

interface TeamAssignmentUIProps {
  thread: EmailThread;
  organizationId: string;
  onAssignmentChange?: (threadId: string, assignedTo: string | null) => void;
  compact?: boolean;
  showHistory?: boolean;
}

export function TeamAssignmentUI({ 
  thread, 
  organizationId, 
  onAssignmentChange,
  compact = false,
  showHistory = false
}: TeamAssignmentUIProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [showWorkload, setShowWorkload] = useState(false);
  const [workloadStats, setWorkloadStats] = useState<Record<string, number>>({});

  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, [organizationId]);

  const loadTeamMembers = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const members = await teamMemberService.getByOrganization(organizationId);
      const activeMembers = members.filter(m => m.status === 'active');
      setTeamMembers(activeMembers);
      
      // Load workload stats
      await loadWorkloadStats(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkloadStats = async (members: TeamMember[]) => {
    const stats: Record<string, number> = {};
    
    for (const member of members) {
      try {
        // Count active threads assigned to this member
        const assignedCount = await threadMatcherService.getAssignedThreadsCount(
          organizationId, 
          member.userId
        );
        stats[member.userId] = assignedCount;
      } catch (error) {
        console.error(`Error loading workload for ${member.displayName}:`, error);
        stats[member.userId] = 0;
      }
    }
    
    setWorkloadStats(stats);
  };

  const handleAssign = async (userId: string | null) => {
    if (assigning) return;
    
    try {
      setAssigning(true);
      
      // Update in database
      await threadMatcherService.assignThread(
        thread.id!, 
        userId, 
        'current-user-id' // TODO: Get from auth context
      );
      
      // Update workload stats
      await loadWorkloadStats(teamMembers);
      
      // Notify parent component
      onAssignmentChange?.(thread.id!, userId);
      
      console.log('✅ Thread assignment updated successfully');
    } catch (error) {
      console.error('Error assigning thread:', error);
      alert('Fehler beim Zuweisen des Threads');
    } finally {
      setAssigning(false);
    }
  };

  const getAssignedMember = (): TeamMember | null => {
    const assignedTo = (thread as any).assignedTo;
    if (!assignedTo) return null;
    return teamMembers.find(m => m.userId === assignedTo) || null;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const getWorkloadLevel = (count: number): { color: string; label: string } => {
    if (count === 0) return { color: 'green', label: 'Verfügbar' };
    if (count <= 3) return { color: 'yellow', label: 'Normal' };
    if (count <= 6) return { color: 'orange', label: 'Beschäftigt' };
    return { color: 'red', label: 'Überlastet' };
  };

  const assignedMember = getAssignedMember();

  if (loading) {
    return (
      <div className="flex items-center">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compact view for EmailList
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {assignedMember && (
          <div 
            className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
              getAvatarColor(assignedMember.displayName)
            )}
            title={`Zugewiesen an ${assignedMember.displayName}`}
          >
            {getInitials(assignedMember.displayName)}
          </div>
        )}
        
        <Dropdown>
          <DropdownButton 
            plain 
            className={clsx(
              "p-1.5 hover:bg-gray-200 rounded transition-colors",
              assigning && "opacity-50 cursor-wait"
            )}
            disabled={assigning}
          >
            <UserIcon className="h-4 w-4 text-gray-400" />
          </DropdownButton>
          <DropdownMenu anchor="bottom end">
            {assignedMember && (
              <>
                <DropdownItem onClick={() => handleAssign(null)}>
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Zuweisung entfernen
                </DropdownItem>
                <div className="border-t my-1" />
              </>
            )}
            {teamMembers.map(member => {
              const workload = workloadStats[member.userId] || 0;
              const workloadInfo = getWorkloadLevel(workload);
              
              return (
                <DropdownItem 
                  key={member.userId}
                  onClick={() => handleAssign(member.userId)}
                >
                  <div className="flex items-center w-full py-2 relative">
                    {/* Alles links ausgerichtet */}
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className={clsx(
                          "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium",
                          getAvatarColor(member.displayName)
                        )}
                      >
                        {getInitials(member.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {member.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {workload} aktive Threads • {workloadInfo.label}
                        </div>
                      </div>
                    </div>
                    
                    {/* Haken ganz rechts */}
                    {assignedMember?.userId === member.userId && (
                      <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 absolute right-2" />
                    )}
                  </div>
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </Dropdown>
      </div>
    );
  }

  // Full view for EmailViewer
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4" />
          Team-Zuweisung
        </h4>
        <Button
          plain
          onClick={() => setShowWorkload(!showWorkload)}
          className="text-xs"
        >
          {showWorkload ? 'Weniger anzeigen' : 'Workload anzeigen'}
        </Button>
      </div>

      {/* Current Assignment */}
      <div className="mb-4">
        {assignedMember ? (
          <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                  getAvatarColor(assignedMember.displayName)
                )}
              >
                {getInitials(assignedMember.displayName)}
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-900">
                  {assignedMember.displayName}
                </span>
                <span className="block text-xs text-gray-500">
                  {assignedMember.email}
                </span>
              </div>
            </div>
            <Button
              plain
              onClick={() => handleAssign(null)}
              disabled={assigning}
              className="text-red-600 hover:text-red-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-white border border-dashed rounded-lg text-center">
            <UserIcon className="h-6 w-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nicht zugewiesen</p>
          </div>
        )}
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 mb-2">Team-Mitglieder:</p>
        {teamMembers.map(member => {
          const isAssigned = assignedMember?.userId === member.userId;
          const workload = workloadStats[member.userId] || 0;
          const workloadInfo = getWorkloadLevel(workload);
          
          return (
            <div 
              key={member.userId}
              className={clsx(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                isAssigned ? "bg-blue-50 border border-blue-200" : "bg-white hover:bg-gray-50"
              )}
              onClick={() => !assigning && handleAssign(member.userId)}
            >
              <div className="flex items-center gap-2">
                <div 
                  className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                    getAvatarColor(member.displayName)
                  )}
                >
                  {getInitials(member.displayName)}
                </div>
                <div>
                  <span className="block text-sm text-gray-900">
                    {member.displayName}
                  </span>
                  {showWorkload && (
                    <span className="block text-xs text-gray-500">
                      {workload} aktive Threads
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {showWorkload && (
                  <Badge 
                    color={workloadInfo.color as any}
                    className="text-xs"
                  >
                    {workloadInfo.label}
                  </Badge>
                )}
                {isAssigned && (
                  <CheckIcon className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment History */}
      {showHistory && assignmentHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-gray-600 mb-2">Verlauf:</p>
          <div className="space-y-1">
            {assignmentHistory.slice(0, 3).map((entry, index) => (
              <div key={index} className="text-xs text-gray-500 flex items-center gap-2">
                <ClockIcon className="h-3 w-3" />
                <span>{entry.action} von {entry.assignedBy}</span>
                <span className="text-gray-400">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assigning && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
}