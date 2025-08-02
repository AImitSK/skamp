// src/components/inbox/TeamFolderSidebar_Simple.tsx
// Simplified version for quick deployment
"use client";

import { useState } from 'react';
import {
  InboxIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  PlusIcon,
  UserIcon,
  UserGroupIcon
} from '@heroicons/react/20/solid';

interface TeamFolderSidebarProps {
  selectedFolderId?: string;
  onFolderSelect: (folderId: string, folderType: 'general' | 'personal' | 'shared') => void;
  unreadCounts: Record<string, number>;
  onEmailMove?: (emailId: string, targetFolderId: string) => void;
}

export function TeamFolderSidebar({
  selectedFolderId,
  onFolderSelect,
  unreadCounts
}: TeamFolderSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['general', 'team']));

  // Mock folder structure for demonstration
  const folders = [
    {
      id: 'general',
      name: '📥 Allgemeine Anfragen',
      type: 'general' as const,
      unreadCount: unreadCounts.general || 0,
      children: [
        { id: 'general_new', name: '🆕 Neu', unreadCount: 5 },
        { id: 'general_progress', name: '🔄 In Bearbeitung', unreadCount: 3 },
        { id: 'general_done', name: '✅ Erledigt', unreadCount: 0 }
      ]
    },
    {
      id: 'team',
      name: '👥 Team-Ordner',
      type: 'shared' as const,
      unreadCount: 0,
      children: [
        { id: 'user_stefan', name: '👤 Stefan Kühne', unreadCount: 2 },
        { id: 'user_max', name: '👤 Max Mustermann', unreadCount: 1 },
        { id: 'user_anna', name: '👤 Anna Schmidt', unreadCount: 0 }
      ]
    }
  ];

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">📧 Postfächer</h2>
          <button
            onClick={() => console.log('Create folder clicked')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Ordner suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {folders.map(folder => (
            <div key={folder.id}>
              {/* Parent Folder */}
              <div
                className={`group flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-gray-50 ${
                  selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : ''
                }`}
                onClick={() => onFolderSelect(folder.id, folder.type)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folder.id);
                  }}
                  className="mr-1 p-0.5 hover:bg-gray-200 rounded"
                >
                  {expandedFolders.has(folder.id) ? (
                    <ChevronDownIcon className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                  )}
                </button>

                <span className="flex-1 truncate">{folder.name}</span>

                {folder.unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {folder.unreadCount > 99 ? '99+' : folder.unreadCount}
                  </span>
                )}
              </div>

              {/* Children */}
              {expandedFolders.has(folder.id) && (
                <div className="ml-4 space-y-1">
                  {folder.children.map(child => (
                    <div
                      key={child.id}
                      className={`flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-gray-50 ${
                        selectedFolderId === child.id ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => onFolderSelect(child.id, folder.type)}
                    >
                      <span className="flex-1 truncate">{child.name}</span>
                      
                      {child.unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {child.unreadCount > 99 ? '99+' : child.unreadCount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <div className="mb-2">🎉 Neues Team-Ordner System</div>
          <div className="text-green-600 font-medium">✅ Erfolgreich aktiviert!</div>
        </div>
      </div>
    </div>
  );
}