// src/components/inbox/SmartFolderSidebar.tsx
"use client";

import { useState, useEffect } from 'react';
import { SmartFolder } from '@/types/inbox-enhanced';
import { smartFolderService } from '@/lib/email/smart-folder-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  FolderIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/20/solid';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import clsx from 'clsx';

interface SmartFolderSidebarProps {
  selectedFolderId?: string;
  onFolderSelect: (folder: SmartFolder) => void;
  className?: string;
}

export function SmartFolderSidebar({
  selectedFolderId,
  onFolderSelect,
  className
}: SmartFolderSidebarProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [folders, setFolders] = useState<SmartFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Lade Smart Folders
  useEffect(() => {
    const loadFolders = async () => {
      if (!currentOrganization?.id) return;

      try {
        setLoading(true);
        console.log('📁 Loading smart folders for organization:', currentOrganization.id);
        
        const folderList = await smartFolderService.getFoldersForOrganization(
          currentOrganization.id
        );
        
        console.log('✅ Loaded smart folders:', folderList.length);
        setFolders(folderList);

        // Erstelle automatisch Kunden- und Kampagnen-Ordner falls noch nicht vorhanden
        if (folderList.filter(f => f.type === 'customer').length === 0) {
          await smartFolderService.createCustomerFolders(currentOrganization.id);
        }
        
        if (folderList.filter(f => f.type === 'campaign').length === 0) {
          await smartFolderService.createCampaignFolders(currentOrganization.id);
        }

        // Lade Ordner erneut nach automatischer Erstellung
        const updatedFolders = await smartFolderService.getFoldersForOrganization(
          currentOrganization.id
        );
        setFolders(updatedFolders);
        
      } catch (error) {
        console.error('Error loading smart folders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, [currentOrganization?.id]);

  // Gruppiere Ordner nach Typ
  const systemFolders = folders.filter(f => f.isSystem);
  const customerFolders = folders.filter(f => f.type === 'customer');
  const campaignFolders = folders.filter(f => f.type === 'campaign');
  const teamFolders = folders.filter(f => f.type === 'team');
  const customFolders = folders.filter(f => !f.isSystem && f.type === 'custom');

  const getFolderIcon = (folder: SmartFolder) => {
    if (folder.icon) return folder.icon;
    
    switch (folder.type) {
      case 'customer':
        return '🏢';
      case 'campaign':
        return '📈';
      case 'team':
        return '👥';
      case 'status':
        return '📋';
      default:
        return '📁';
    }
  };

  const handleFolderClick = (folder: SmartFolder) => {
    console.log('📁 Selected folder:', folder.name);
    onFolderSelect(folder);
  };

  if (loading) {
    return (
      <div className={clsx('bg-gray-50 border-r', className)}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-gray-50 border-r overflow-y-auto', className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">E-Mail-Ordner</h2>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
            plain
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* System-Ordner */}
        {systemFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Status
            </h3>
            <div className="space-y-1">
              {systemFolders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderId === folder.id}
                  onClick={() => handleFolderClick(folder)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Kunden-Ordner */}
        {customerFolders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                Kunden
              </h3>
              <span className="text-xs text-gray-400">{customerFolders.length}</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {customerFolders.slice(0, 10).map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderId === folder.id}
                  onClick={() => handleFolderClick(folder)}
                />
              ))}
              {customerFolders.length > 10 && (
                <div className="text-xs text-gray-500 px-2 py-1">
                  +{customerFolders.length - 10} weitere...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kampagnen-Ordner */}
        {campaignFolders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <ChartBarIcon className="h-3 w-3" />
                Kampagnen
              </h3>
              <span className="text-xs text-gray-400">{campaignFolders.length}</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {campaignFolders.slice(0, 8).map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderId === folder.id}
                  onClick={() => handleFolderClick(folder)}
                />
              ))}
              {campaignFolders.length > 8 && (
                <div className="text-xs text-gray-500 px-2 py-1">
                  +{campaignFolders.length - 8} weitere...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team-Ordner */}
        {teamFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Team
            </h3>
            <div className="space-y-1">
              {teamFolders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderId === folder.id}
                  onClick={() => handleFolderClick(folder)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Benutzerdefinierte Ordner */}
        {customFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Benutzerdefiniert
            </h3>
            <div className="space-y-1">
              {customFolders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderId === folder.id}
                  onClick={() => handleFolderClick(folder)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Leerer Zustand */}
        {folders.length === 0 && (
          <div className="text-center py-8">
            <FolderIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Keine Ordner
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Ordner werden automatisch erstellt wenn E-Mails vorhanden sind.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface FolderItemProps {
  folder: SmartFolder;
  isSelected: boolean;
  onClick: () => void;
}

function FolderItem({ folder, isSelected, onClick }: FolderItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={clsx(
        'group flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors',
        isSelected 
          ? 'bg-[#005fab] text-white' 
          : 'text-gray-700 hover:bg-gray-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm" style={{ color: isSelected ? 'white' : folder.color }}>
          {getFolderIcon(folder)}
        </span>
        <span className="truncate font-medium">
          {folder.name}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Count Badge */}
        {folder.count !== undefined && folder.count > 0 && (
          <Badge 
            className={clsx(
              'text-xs px-1.5 py-0.5',
              isSelected 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-600'
            )}
          >
            {folder.count > 99 ? '99+' : folder.count}
          </Badge>
        )}
        
        {/* Priority/VIP Indicator */}
        {folder.filters.isVip && (
          <span className="text-yellow-400" title="VIP">⭐</span>
        )}
        
        {folder.filters.priority === 'high' && (
          <ExclamationCircleIcon 
            className={clsx(
              'h-3 w-3',
              isSelected ? 'text-white' : 'text-red-500'
            )}
            title="Hohe Priorität"
          />
        )}

        {/* Menu Button */}
        {!folder.isSystem && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={clsx(
              'opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300 transition-opacity',
              isSelected && 'hover:bg-white/20'
            )}
          >
            <EllipsisVerticalIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function getFolderIcon(folder: SmartFolder): string {
  if (folder.icon) return folder.icon;
  
  switch (folder.type) {
    case 'customer':
      return '🏢';
    case 'campaign':
      return '📈';
    case 'team':
      return '👥';
    case 'status':
      return '📋';
    default:
      return '📁';
  }
}