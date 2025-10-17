// src/components/mediathek/FolderCard.tsx - Cleaner Grid ohne Dateianzahl, Beschreibung als Tooltip
"use client";

import { memo } from "react";
import { MediaFolder } from "@/types/media";
import { Button } from "@/components/ui/button";
import {
  EllipsisVerticalIcon,
  TrashIcon,
  PencilIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import { FolderIcon } from "@heroicons/react/24/solid";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from "@/components/ui/dropdown";

interface FolderCardProps {
  folder: MediaFolder;
  onOpen: (folder: MediaFolder) => void;
  onEdit: (folder: MediaFolder) => void;
  onDelete: (folder: MediaFolder) => void;
  onShare?: (folder: MediaFolder) => void;
  fileCount?: number;
  
  // Drag & Drop Props für Assets auf Ordner
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  
  // Folder Drag & Drop Props
  onFolderMove?: (folderId: string, targetFolderId: string) => Promise<void>;
  isDraggedFolder?: boolean;
  canAcceptFolder?: boolean;
  onFolderDragStart?: (folder: MediaFolder) => void;
  onFolderDragEnd?: () => void;
}

// Phase 3.4: React.memo prevents unnecessary re-renders
const FolderCard = memo(function FolderCard({
  folder,
  onOpen,
  onEdit,
  onDelete,
  onShare,
  fileCount = 0, // Wird nicht mehr angezeigt, aber beibehalten für Kompatibilität
  // Drag & Drop Props für Assets
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop,
  // Folder Drag & Drop Props
  onFolderMove,
  isDraggedFolder = false,
  canAcceptFolder = true,
  onFolderDragStart,
  onFolderDragEnd
}: FolderCardProps) {

  const folderColor = folder.color || '#6366f1'; // Default Indigo

  // Folder Drag Handlers
  const handleFolderDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `folder:${folder.id}`);
    e.stopPropagation();
    
    if (onFolderDragStart) {
      onFolderDragStart(folder);
    }
  };

  const handleFolderDragEnd = () => {
    if (onFolderDragEnd) {
      onFolderDragEnd();
    }
  };

  const handleFolderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const data = e.dataTransfer.getData('text/plain');
    
    // Check if it's a folder being dropped
    if (data.startsWith('folder:')) {
      if (onFolderMove) {
        const draggedFolderId = data.replace('folder:', '');
        
        // Prevent dropping folder into itself
        if (draggedFolderId === folder.id) {
          return;
        }
        
        try {
          await onFolderMove(draggedFolderId, folder.id!);
        } catch (error) {
          // Error handling could be improved with proper user feedback
        }
        
        return;
      }
    } 
    
    // If it's not a folder drop, call the asset drop handler
    if (onDrop && !data.startsWith('folder:')) {
      onDrop(e);
    }
  };

  const handleCombinedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (onDragOver) {
      onDragOver(e);
    }
  };

  // 🆕 Tooltip-Text erstellen
  const getTooltipText = () => {
    let tooltip = folder.name;
    if (folder.description) {
      tooltip += `\n\nBeschreibung: ${folder.description}`;
    }
    return tooltip;
  };

  return (
    <div 
      className={`group relative bg-white rounded-lg border transition-all duration-200 overflow-hidden ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50 scale-105 border-2' // Drag Over Styling
          : isDraggedFolder
          ? 'opacity-50 scale-95 border-gray-300' // Being dragged
          : 'border-gray-200 hover:border-gray-300'
      }`}
      // Make folder draggable
      draggable={true}
      onDragStart={handleFolderDragStart}
      onDragEnd={handleFolderDragEnd}
      // Enhanced Drag & Drop Event Handlers
      onDragOver={handleCombinedDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleFolderDrop}
      // 🆕 Tooltip für den gesamten Container
      title={getTooltipText()}
    >
      {/* Folder Preview */}
      <div 
        className={`aspect-square w-full bg-gray-50 flex items-center justify-center cursor-pointer relative ${
          isDragOver ? 'bg-blue-100' : ''
        }`}
        onClick={() => onOpen(folder)}
      >
        <FolderIcon 
          className={`h-16 w-16 transition-all duration-200 ${
            isDragOver 
              ? 'scale-110 text-blue-600'
              : 'group-hover:scale-105'
          }`} 
          style={{ color: isDragOver ? '#2563eb' : folderColor }}
        />
        
        {/* Enhanced Drop Hint */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100 bg-opacity-90">
            <div className="text-center">
              <div className="text-2xl mb-1">📁</div>
              <div className="text-xs font-medium text-blue-800">
                Hier ablegen
              </div>
            </div>
          </div>
        )}
        
        {/* Dragging Indicator */}
        {isDraggedFolder && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90">
            <div className="text-center">
              <div className="text-lg mb-1">↗️</div>
              <div className="text-xs font-medium text-gray-700">
                Wird bewegt...
              </div>
            </div>
          </div>
        )}
        
        {/* Hover-Overlay (hidden during drag) */}
        {!isDragOver && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
        )}
        
        {/* Actions Menu (hidden during drag) */}
        {!isDragOver && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dropdown>
              <DropdownButton 
                as={Button} 
                plain 
                className="bg-white/90 hover:bg-white p-2"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <EllipsisVerticalIcon className="h-4 w-4" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(folder); }}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Bearbeiten
                </DropdownItem>
                {onShare && (
                  <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onShare(folder); }}>
                    <ShareIcon className="h-4 w-4 mr-2" />
                    Teilen
                  </DropdownItem>
                )}
                <DropdownItem 
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(folder); }}
                  className="text-red-600"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Löschen
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>

      {/* 🆕 CLEANER Folder Information - Nur Name */}
      <div className={`p-4 ${isDragOver ? 'bg-blue-50' : ''}`}>
        <h3
          className={`text-sm font-medium truncate cursor-pointer transition-colors ${
            isDragOver
              ? 'text-blue-900'
              : 'text-gray-900 hover:text-indigo-600'
          }`}
          onClick={() => onOpen(folder)}
        >
          {folder.name}
        </h3>

        {/* 🚫 ENTFERNT: Dateianzahl, Beschreibung, Erstellungsdatum, Client-Badge */}
        {/* Alle diese Infos sind jetzt im Tooltip verfügbar */}
      </div>
    </div>
  );
});

export default FolderCard;