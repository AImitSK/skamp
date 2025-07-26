// src/components/inbox/InboxSidebar.tsx
"use client";

import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import clsx from 'clsx';
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/react/20/solid';

interface InboxSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  unreadCounts: Record<string, number>;
}

export function InboxSidebar({
  selectedFolder,
  onFolderSelect,
  onCompose,
  unreadCounts
}: InboxSidebarProps) {
  const folders = [
    {
      id: 'inbox',
      name: 'Posteingang',
      icon: InboxIcon,
      count: unreadCounts.inbox
    },
    {
      id: 'sent',
      name: 'Gesendet',
      icon: PaperAirplaneIcon,
      count: unreadCounts.sent
    },
    {
      id: 'drafts',
      name: 'Entwürfe',
      icon: DocumentDuplicateIcon,
      count: unreadCounts.drafts
    },
    {
      id: 'spam',
      name: 'Spam',
      icon: ExclamationTriangleIcon,
      count: unreadCounts.spam
    },
    {
      id: 'trash',
      name: 'Papierkorb',
      icon: TrashIcon,
      count: unreadCounts.trash
    }
  ];

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">
      {/* Compose Button */}
      <div className="p-4">
        <Button 
          onClick={onCompose}
          className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white flex items-center justify-center gap-2"
        >
          <PencilSquareIcon className="h-5 w-5" />
          <span className="whitespace-nowrap">Neue E-Mail</span>
        </Button>
      </div>

      {/* Folder List */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isSelected = selectedFolder === folder.id;
            
            return (
              <li key={folder.id}>
                <button
                  onClick={() => onFolderSelect(folder.id)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-[#005fab] text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <Badge 
                      color={isSelected ? 'zinc' : 'zinc'} 
                      className={clsx(
                        'whitespace-nowrap',
                        isSelected ? 'bg-white/20 text-white' : ''
                      )}
                    >
                      {folder.count}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Storage Info */}
      <div className="p-4 border-t">
        <div className="text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Speicher verwendet</span>
            <span>2.3 GB / 15 GB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#005fab] h-2 rounded-full" 
              style={{ width: '15%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}