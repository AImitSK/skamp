// src/components/inbox/TeamFolderSidebar.tsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/badge';
import clsx from 'clsx';
import {
  InboxIcon,
  UserIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/20/solid';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface TeamFolderSidebarProps {
  selectedFolderId?: string;
  selectedFolderType: 'general' | 'team';
  onFolderSelect: (type: 'general' | 'team', id?: string) => void;
  unreadCounts: Record<string, number>;
  organizationId: string;
}

interface TeamMemberFolder {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  unreadCount: number;
}

export function TeamFolderSidebar({
  selectedFolderId,
  selectedFolderType,
  onFolderSelect,
  unreadCounts,
  organizationId
}: TeamFolderSidebarProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberFolder[]>([]);
  const [generalUnread, setGeneralUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Lade Team-Mitglieder
  useEffect(() => {
    loadTeamMembers();
  }, [organizationId, unreadCounts]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Lade alle Team-Mitglieder der Organisation
      const membersQuery = query(
        collection(db, 'team_members'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        orderBy('displayName', 'asc')
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const memberData: TeamMemberFolder[] = [];
      
      membersSnapshot.forEach(doc => {
        const member = doc.data();
        const memberUnread = unreadCounts[`team_${member.userId}`] || 0;
        
        memberData.push({
          id: doc.id,
          userId: member.userId,
          displayName: member.displayName || member.email,
          email: member.email,
          unreadCount: memberUnread
        });
      });
      
      setTeamMembers(memberData);
      
      // Setze general unread count
      setGeneralUnread(unreadCounts.general || 0);
      
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter team members based on search
  const filteredTeamMembers = teamMembers.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.displayName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      {/* Header mit Suche */}
      <div className="p-4 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Postfächer</h3>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Team-Mitglied suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
          />
        </div>
      </div>

      {/* Folder List */}
      <nav className="flex-1 overflow-y-auto">
        {/* Allgemeine Anfragen */}
        <div className="px-2 pt-4">
          <button
            onClick={() => onFolderSelect('general')}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedFolderType === 'general' && !selectedFolderId
                ? 'bg-[#005fab] text-white'
                : 'text-gray-700 hover:bg-gray-200'
            )}
          >
            <div className="flex items-center gap-3">
              <InboxIcon className="h-5 w-5" />
              <span>Allgemeine Anfragen</span>
            </div>
            {generalUnread > 0 && (
              <Badge 
                color={selectedFolderType === 'general' ? 'zinc' : 'blue'} 
                className={clsx(
                  'whitespace-nowrap',
                  selectedFolderType === 'general' ? 'bg-white/20 text-white' : ''
                )}
              >
                {generalUnread}
              </Badge>
            )}
          </button>
        </div>

        {/* Team-Mitglieder */}
        <div className="px-2 pt-4">
          <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Team-Mitglieder
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab]"></div>
            </div>
          ) : filteredTeamMembers.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {searchQuery ? 'Keine Team-Mitglieder gefunden' : 'Noch keine Team-Mitglieder'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTeamMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => onFolderSelect('team', member.userId)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedFolderId === member.userId && selectedFolderType === 'team'
                      ? 'bg-[#005fab] text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {member.displayName}
                      </div>
                      <div className={clsx(
                        'text-xs truncate',
                        selectedFolderId === member.userId && selectedFolderType === 'team'
                          ? 'text-white/70'
                          : 'text-gray-500'
                      )}>
                        {member.email}
                      </div>
                    </div>
                  </div>
                  
                  {member.unreadCount > 0 && (
                    <Badge 
                      color={selectedFolderId === member.userId && selectedFolderType === 'team' ? 'zinc' : 'blue'} 
                      className={clsx(
                        'whitespace-nowrap flex-shrink-0',
                        selectedFolderId === member.userId && selectedFolderType === 'team' 
                          ? 'bg-white/20 text-white' 
                          : ''
                      )}
                    >
                      {member.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}