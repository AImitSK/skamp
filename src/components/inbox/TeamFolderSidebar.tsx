// src/components/inbox/TeamFolderSidebar.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import clsx from 'clsx';
import {
  InboxIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/20/solid';
import { 
  TeamFolder, 
  FolderTreeNode,
  FolderStats 
} from '@/types/inbox-enhanced';
import { teamFolderService } from '@/lib/email/team-folder-service';
import { FolderManagementModal } from './FolderManagementModal';
// import { toast } from 'react-hot-toast';
// Fallback toast implementation
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message)
};

// ============================================================================
// INTERFACES
// ============================================================================

interface TeamFolderSidebarProps {
  selectedFolderId?: string;
  onFolderSelect: (folderId: string, folderType: 'general' | 'personal' | 'shared') => void;
  unreadCounts: Record<string, number>;
  onEmailMove?: (emailId: string, targetFolderId: string) => void;
}

interface FolderItemProps {
  node: FolderTreeNode;
  isSelected: boolean;
  unreadCount: number;
  onSelect: () => void;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateSubfolder?: () => void;
  canManage: boolean;
}

// ============================================================================
// TEAM FOLDER SIDEBAR COMPONENT
// ============================================================================

export function TeamFolderSidebar({
  selectedFolderId,
  onFolderSelect,
  unreadCounts,
  onEmailMove
}: TeamFolderSidebarProps) {
  // State
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [folderStats, setFolderStats] = useState<Record<string, FolderStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [managementModal, setManagementModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    parentFolderId?: string;
    editingFolder?: TeamFolder;
  }>({
    isOpen: false,
    mode: 'create'
  });

  // Context
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Lade Ordner-Struktur
  useEffect(() => {
    if (user && currentOrganization) {
      loadFolderTree();
      loadFolderStats();
    }
  }, [user, currentOrganization]);

  // ========================================
  // DATA LOADING
  // ========================================

  const loadFolderTree = async () => {
    if (!user || !currentOrganization) return;

    try {
      setLoading(true);
      const tree = await teamFolderService.getFolderTree(currentOrganization.id, user.uid);
      setFolderTree(tree);
      
      // Auto-expand System-Ordner
      const systemFolderIds = new Set<string>();
      tree.forEach(node => {
        if (node.folder.isSystem) {
          systemFolderIds.add(node.folder.id!);
        }
      });
      setExpandedFolders(systemFolderIds);
      
    } catch (error) {
      console.error('Error loading folder tree:', error);
      toast.error('Fehler beim Laden der Ordner');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderStats = async () => {
    if (!user || !currentOrganization) return;

    try {
      const stats = await teamFolderService.getFolderStats(currentOrganization.id);
      const statsMap: Record<string, FolderStats> = {};
      stats.forEach(stat => {
        statsMap[stat.folderId] = stat;
      });
      setFolderStats(statsMap);
    } catch (error) {
      console.error('Error loading folder stats:', error);
    }
  };

  // ========================================
  // FOLDER MANAGEMENT
  // ========================================

  const handleCreateFolder = (parentFolderId?: string) => {
    setManagementModal({
      isOpen: true,
      mode: 'create',
      parentFolderId
    });
  };

  const handleEditFolder = (folder: TeamFolder) => {
    setManagementModal({
      isOpen: true,
      mode: 'edit',
      editingFolder: folder
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || !currentOrganization) return;

    if (!confirm('Ordner wirklich löschen? E-Mails bleiben in anderen Ordnern erhalten.')) {
      return;
    }

    try {
      await teamFolderService.softDelete(folderId, {
        organizationId: currentOrganization.id,
        userId: user.uid
      });
      
      toast.success('Ordner gelöscht');
      loadFolderTree();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleFolderSaved = () => {
    setManagementModal({ isOpen: false, mode: 'create' });
    loadFolderTree();
    loadFolderStats();
  };

  // ========================================
  // UI HELPERS
  // ========================================

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFolderType = (folder: TeamFolder): 'general' | 'personal' | 'shared' => {
    if (folder.name.includes('Allgemeine Anfragen')) return 'general';
    if (folder.ownerId === user?.uid) return 'personal';
    return 'shared';
  };

  const canManageFolder = (folder: TeamFolder): boolean => {
    if (!user) return false;
    return folder.ownerId === user.uid || folder.ownerId === 'system';
  };

  // Filter für Suche
  const filteredTree = useMemo(() => {
    if (!searchQuery) return folderTree;

    const filterNode = (node: FolderTreeNode): FolderTreeNode | null => {
      const matchesSearch = node.folder.name.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as FolderTreeNode[];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };

    return folderTree.map(filterNode).filter(Boolean) as FolderTreeNode[];
  }, [folderTree, searchQuery]);

  // ========================================
  // RENDER COMPONENTS
  // ========================================

  if (loading) {
    return (
      <div className="w-64 border-r border-gray-200 bg-white p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">📧 Postfächer</h2>
          <Button
            size="sm"
            onClick={() => handleCreateFolder()}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Suche */}
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
        {filteredTree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FolderIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Keine Ordner gefunden</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map(node => (
              <FolderTreeItem
                key={node.folder.id}
                node={node}
                isSelected={selectedFolderId === node.folder.id}
                unreadCount={unreadCounts[node.folder.id!] || folderStats[node.folder.id!]?.newEmails || 0}
                expandedFolders={expandedFolders}
                onSelect={() => onFolderSelect(node.folder.id!, getFolderType(node.folder))}
                onToggle={() => toggleFolder(node.folder.id!)}
                onEdit={() => handleEditFolder(node.folder)}
                onDelete={() => handleDeleteFolder(node.folder.id!)}
                onCreateSubfolder={() => handleCreateFolder(node.folder.id)}
                canManage={canManageFolder(node.folder)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => loadFolderTree()}
          className="w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center justify-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Aktualisieren
        </button>
      </div>

      {/* Management Modal */}
      <FolderManagementModal
        isOpen={managementModal.isOpen}
        mode={managementModal.mode}
        parentFolderId={managementModal.parentFolderId}
        editingFolder={managementModal.editingFolder}
        onClose={() => setManagementModal({ isOpen: false, mode: 'create' })}
        onSaved={handleFolderSaved}
      />
    </div>
  );
}

// ============================================================================
// FOLDER TREE ITEM COMPONENT
// ============================================================================

function FolderTreeItem({
  node,
  isSelected,
  unreadCount,
  expandedFolders,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onCreateSubfolder,
  canManage
}: {
  node: FolderTreeNode;
  isSelected: boolean;
  unreadCount: number;
  expandedFolders: Set<string>;
  onSelect: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateSubfolder: () => void;
  canManage: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const isExpanded = expandedFolders.has(node.folder.id!);
  const hasChildren = node.children.length > 0;

  const getFolderIcon = (folder: TeamFolder) => {
    if (folder.icon) return folder.icon;
    if (folder.name.includes('Allgemeine')) return '📥';
    if (folder.ownerId !== 'system') return '👤';
    return '📁';
  };

  return (
    <div>
      {/* Folder Item */}
      <div
        className={clsx(
          'group flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer relative',
          'hover:bg-gray-50',
          isSelected && 'bg-blue-50 text-blue-700',
          node.depth > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-3 w-3 text-gray-400" />
            )}
          </button>
        )}

        {/* Folder Icon & Name */}
        <div 
          className="flex items-center flex-1 min-w-0"
          onClick={onSelect}
        >
          <span className="mr-2 text-base" style={{ color: node.folder.color }}>
            {getFolderIcon(node.folder)}
          </span>
          
          <span className="truncate flex-1">
            {node.folder.name}
          </span>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <Badge 
              size="sm" 
              color="blue"
              className="ml-2"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>

        {/* Actions Menu */}
        {showActions && canManage && !node.folder.isSystem && (
          <div className="absolute right-2 flex items-center space-x-1 bg-white rounded shadow-sm border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder();
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Unterordner erstellen"
            >
              <PlusIcon className="h-3 w-3 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Bearbeiten"
            >
              <PencilIcon className="h-3 w-3 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-gray-100 rounded text-red-600"
              title="Löschen"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(childNode => (
            <FolderTreeItem
              key={childNode.folder.id}
              node={childNode}
              isSelected={isSelected}
              unreadCount={unreadCount}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}