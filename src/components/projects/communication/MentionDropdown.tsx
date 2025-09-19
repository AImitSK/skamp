'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { TeamMember } from '@/types/international';

interface MentionDropdownProps {
  isVisible: boolean;
  position: { top: number; left: number };
  searchTerm: string;
  teamMembers: TeamMember[];
  selectedIndex: number;
  onSelect: (member: TeamMember) => void;
  onClose: () => void;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  isVisible,
  position,
  searchTerm,
  teamMembers,
  selectedIndex,
  onSelect,
  onClose
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter team members basierend auf Suchterm
  const filteredMembers = teamMembers.filter(member =>
    member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sortiere: Owner/Admin zuerst
  filteredMembers.sort((a, b) => {
    if (a.role === 'owner' && b.role !== 'owner') return -1;
    if (b.role === 'owner' && a.role !== 'owner') return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  // Schließe Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Scrolle zu ausgewähltem Element
  useEffect(() => {
    if (dropdownRef.current && selectedIndex >= 0) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  if (!isVisible || filteredMembers.length === 0) {
    return null;
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-64"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2">
        <div className="text-xs text-gray-500 px-2 py-1 font-medium">
          Team-Mitglieder
        </div>
        {filteredMembers.map((member, index) => (
          <div
            key={member.id}
            onClick={() => onSelect(member)}
            className={`flex items-center space-x-3 px-2 py-2 rounded-md cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-blue-50 text-blue-900'
                : 'hover:bg-gray-50'
            }`}
          >
            <Avatar
              className="size-6 flex-shrink-0"
              src={member.photoUrl}
              initials={getInitials(member.displayName)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {member.displayName}
                </span>
                {member.role === 'owner' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Owner
                  </span>
                )}
                {member.role === 'admin' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {member.email}
              </div>
            </div>
            {index === selectedIndex && (
              <div className="text-xs text-blue-600 font-medium">
                ↵ Enter
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && searchTerm && (
        <div className="p-4 text-center text-gray-500 text-sm">
          Keine Team-Mitglieder gefunden für &quot;{searchTerm}&quot;
        </div>
      )}

      <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
        ↑↓ Navigation • Enter Auswählen • Esc Schließen
      </div>
    </div>
  );
};

export default MentionDropdown;