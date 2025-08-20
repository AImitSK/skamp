// src/components/campaigns/TeamMemberSelector.tsx - Team-Mitglieder Mehrfach-Auswahl
"use client";

import { useState, useEffect } from 'react';
import { TeamMemberSelectorProps } from '@/types/approvals-enhanced';
import { TeamMember } from '@/types/international';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export function TeamMemberSelector({
  selectedMembers,
  onSelectionChange,
  organizationId
}: TeamMemberSelectorProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, [organizationId]);

  const loadTeamMembers = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);
      
      const members = await teamMemberService.getByOrganization(organizationId);
      
      // Filter nur aktive Mitglieder und interne Rollen
      const eligibleMembers = members.filter(member => 
        member.status === 'active' && 
        // ✅ ALLE INTERNEN ROLLEN: admin, owner, member sind berechtigt für Team-Approvals
        member.role !== 'client' && // Clients sind keine internen Approver
        member.role !== 'guest'   // Guests sind keine Approver
      );
      
      setTeamMembers(eligibleMembers);
    } catch (error) {
      console.error('Fehler beim Laden der Team-Mitglieder:', error);
      setError('Team-Mitglieder konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Filter members based on search term
  const filteredMembers = teamMembers.filter(member =>
    member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedMembers, memberId]);
    } else {
      onSelectionChange(selectedMembers.filter(id => id !== memberId));
    }
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredMembers.map(m => m.id!));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'purple';
      case 'admin': return 'blue';
      case 'member': return 'green';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'member': return 'Mitglied';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium">Team-Mitglieder für Freigabe</Text>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium">Team-Mitglieder für Freigabe</Text>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <Text className="text-sm text-red-800">{error}</Text>
          </div>
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium">Team-Mitglieder für Freigabe</Text>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Text className="text-sm text-gray-600">
            Keine verfügbaren Team-Mitglieder für die Freigabe gefunden.
          </Text>
        </div>
      </div>
    );
  }

  const selectedCount = selectedMembers.length;
  const totalCount = filteredMembers.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium">Team-Mitglieder für Freigabe</Text>
          {selectedCount > 0 && (
            <Badge color="blue">
              {selectedCount} ausgewählt
            </Badge>
          )}
        </div>
        
        {totalCount > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {selectedMembers.length === totalCount ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
        )}
      </div>

      {/* Search */}
      {teamMembers.length > 3 && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Team-Mitglieder suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            Keine Team-Mitglieder gefunden
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isSelected = selectedMembers.includes(member.id!);
            
            return (
              <div
                key={member.id}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  isSelected 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-white border-gray-200 hover:bg-gray-50"
                )}
                onClick={() => handleMemberToggle(member.id!, !isSelected)}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={(checked) => handleMemberToggle(member.id!, checked)}
                  color="blue"
                />
                
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Text className="font-medium text-gray-900 truncate">
                      {member.displayName}
                    </Text>
                    <Badge color={getRoleBadgeColor(member.role)} className="flex-shrink-0">
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>
                  <Text className="text-sm text-gray-500 truncate">
                    {member.email}
                  </Text>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Text className="text-sm text-blue-800">
            <strong>{selectedCount}</strong> Team-Mitglied{selectedCount !== 1 ? 'er' : ''} 
            {selectedCount === 1 ? ' wird' : ' werden'} für die Freigabe benachrichtigt.
            {selectedCount > 1 && ' Alle müssen zustimmen, bevor die nächste Stufe erreicht wird.'}
          </Text>
        </div>
      )}
    </div>
  );
}