'use client';

import React, { useState } from 'react';
import { UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  avatar?: string;
}

interface TeamMemberMultiSelectProps {
  teamMembers: TeamMember[];
  selectedMembers: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function TeamMemberMultiSelect({ 
  teamMembers, 
  selectedMembers, 
  onSelectionChange 
}: TeamMemberMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByRole, setFilterByRole] = useState<string>('all');

  // Filter Team-Mitglieder basierend auf Suche und Rolle
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterByRole === 'all' || member.role.toLowerCase() === filterByRole.toLowerCase();
    
    return matchesSearch && matchesRole;
  });

  // Gruppiere nach Rolle
  const membersByRole = filteredMembers.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {} as Record<string, TeamMember[]>);

  // Verfügbare Rollen extrahieren
  const availableRoles = Array.from(new Set(teamMembers.map(m => m.role)));


  const handleMemberToggle = (memberId: string) => {
    const newSelection = selectedMembers.includes(memberId)
      ? selectedMembers.filter(id => id !== memberId)
      : [...selectedMembers, memberId];
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredMembers.map(m => m.id));
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Suche und Filter */}
      <div className="space-y-3">
        {/* Suchfeld */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Team-Mitglieder suchen..."
          />
        </div>

        {/* Rolle Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Rolle:</label>
          <select
            value={filterByRole}
            onChange={(e) => setFilterByRole(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Rollen</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Auswahl-Aktionen */}
        {filteredMembers.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedMembers.length} von {filteredMembers.length} ausgewählt
            </span>
            <div className="space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAll();
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Alle auswählen
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeselectAll();
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Alle abwählen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Team-Mitglieder Liste */}
      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md">
        {Object.keys(membersByRole).length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Keine Team-Mitglieder gefunden
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(membersByRole).map(([role, members]) => (
              <div key={role} className="p-4">
                {/* Rollen-Header */}
                <h4 className="text-sm font-medium text-gray-800 mb-3">
                  {role} ({members.length})
                </h4>

                {/* Mitglieder in der Rolle */}
                <div className="space-y-2">
                  {members.map(member => {
                    console.log('🔍 TeamMember Debug:', {
                      memberData: member,
                      selectedMembers: selectedMembers,
                      isSelectedById: selectedMembers.includes(member.id),
                      isSelectedByEmail: selectedMembers.includes(member.email)
                    });
                    const isSelected = selectedMembers.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent hover:bg-gray-50'
                        }`}
                        onClick={() => handleMemberToggle(member.id)}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleMemberToggle(member.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />

                        {/* Avatar */}
                        <div className="ml-3 flex-shrink-0">
                          {member.avatar ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={member.avatar}
                              alt={member.displayName}
                            />
                          ) : (
                            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                        </div>

                        {/* Mitglied Info */}
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.displayName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}