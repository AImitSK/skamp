// src/components/mediathek/FolderCard.tsx - Mit Drag & Drop Support
"use client";

import { MediaFolder } from "@/types/media";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { 
  FolderIcon, 
  EllipsisVerticalIcon,
  TrashIcon,
  PencilIcon,
  ShareIcon
} from "@heroicons/react/24/solid";
import { 
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from "@/components/dropdown";
import { useCrmData } from "@/context/CrmDataContext";

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
  onDrop?: (e: React.DragEvent) => void; // 🔧 Wieder hinzugefügt für Assets
  
  // 🆕 Folder Drag & Drop Props
  onFolderMove?: (folderId: string, targetFolderId: string) => Promise<void>;
  isDraggedFolder?: boolean;
  canAcceptFolder?: boolean;
  onFolderDragStart?: (folder: MediaFolder) => void;
  onFolderDragEnd?: () => void;
}

export default function FolderCard({ 
  folder, 
  onOpen, 
  onEdit, 
  onDelete, 
  onShare, 
  fileCount = 0,
  // Drag & Drop Props für Assets
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop,
  // 🆕 Folder Drag & Drop Props
  onFolderMove,
  isDraggedFolder = false,
  canAcceptFolder = true,
  onFolderDragStart,
  onFolderDragEnd
}: FolderCardProps) {
  
  const { companies } = useCrmData();
  const folderColor = folder.color || '#6366f1'; // Default Indigo
  
  const associatedCompany = folder.clientId 
    ? companies.find(c => c.id === folder.clientId)
    : null;

  // 🚨 EXTREME DEBUG: Was ist onFolderMove wirklich?
  console.log(`🚨 FolderCard "${folder.name}" - onFolderMove DEBUG:`, {
    exists: !!onFolderMove,
    type: typeof onFolderMove,
    value: onFolderMove,
    stringified: String(onFolderMove),
    isFunction: typeof onFolderMove === 'function'
  });

  // 🆕 Folder Drag Handlers
  const handleFolderDragStart = (e: React.DragEvent) => {
    console.log('Dragging folder:', folder.name);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `folder:${folder.id}`);
    e.stopPropagation(); // Prevent interference with asset drag
    
    // Notify parent component
    if (onFolderDragStart) {
      onFolderDragStart(folder);
    }
  };

  const handleFolderDragEnd = () => {
    console.log('Folder drag ended');
    
    // Notify parent component
    if (onFolderDragEnd) {
      onFolderDragEnd();
    }
  };

  const handleFolderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const data = e.dataTransfer.getData('text/plain');
    console.log('🗂️ FolderCard Drop - received data:', data);
    
    // Check if it's a folder being dropped
    if (data.startsWith('folder:')) {
      console.log('🔧 This IS a folder drop');
      
      if (onFolderMove) {
        console.log('🎯 onFolderMove exists, calling it!');
        const draggedFolderId = data.replace('folder:', '');
        
        console.log(`🗂️ Folder-to-folder drop detected: ${draggedFolderId} -> ${folder.id}`);
        
        // Prevent dropping folder into itself
        if (draggedFolderId === folder.id) {
          console.log('❌ Cannot drop folder into itself');
          return;
        }
        
        console.log(`✅ Moving folder ${draggedFolderId} into ${folder.id}`);
        
        try {
          await onFolderMove(draggedFolderId, folder.id!);
          console.log('🎉 Folder move completed successfully!');
        } catch (error) {
          console.error('❌ Error moving folder:', error);
        }
        
        return;
      } else {
        console.log('❌ onFolderMove is null/undefined!');
      }
    } 
    
    // If it's not a folder drop, call the asset drop handler
    if (onDrop && !data.startsWith('folder:')) {
      console.log('📁 Delegating to asset drop handler');
      onDrop(e);
    } else {
      console.log('⚠️ No handler for drop type:', data);
    }
  };

  const handleCombinedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Check what's being dragged based on dataTransfer types or current drag state
    let dragType = 'asset'; // default
    
    // Try to peek at drag data (this might not work in all browsers during dragover)
    try {
      const types = Array.from(e.dataTransfer.types);
      if (types.includes('text/plain')) {
        // We can't read the actual data during dragover, so we assume asset unless we know it's a folder
        // The actual check happens in onDrop
      }
    } catch (error) {
      // Ignore - some browsers don't allow reading during dragover
    }
    
    // Set appropriate drop effect
    e.dataTransfer.dropEffect = 'move';
    
    // Call the asset drag over handler if provided
    if (onDragOver) {
      onDragOver(e);
    }
  };

  return (
    <div 
      className={`group relative bg-white rounded-lg border shadow-sm transition-all duration-200 overflow-hidden ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50 shadow-lg scale-105 border-2' // Drag Over Styling
          : isDraggedFolder
          ? 'opacity-50 scale-95 border-gray-300' // 🆕 Being dragged
          : 'border-gray-200 hover:shadow-md'
      }`}
      // 🆕 Make folder draggable
      draggable={true}
      onDragStart={handleFolderDragStart}
      onDragEnd={handleFolderDragEnd}
      // Enhanced Drag & Drop Event Handlers
      onDragOver={handleCombinedDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleFolderDrop}
    >
      {/* Folder Preview */}
      <div 
        className={`aspect-square w-full bg-gray-50 flex items-center justify-center cursor-pointer relative ${
          isDragOver ? 'bg-blue-100' : '' // 🆕 Additional styling when drag over
        }`}
        onClick={() => onOpen(folder)}
      >
        <FolderIcon 
          className={`h-16 w-16 transition-all duration-200 ${
            isDragOver 
              ? 'scale-110 text-blue-600' // 🆕 Scale up and change color when dragging over
              : 'group-hover:scale-105'
          }`} 
          style={{ color: isDragOver ? '#2563eb' : folderColor }} // 🆕 Dynamic color
        />
        
        {/* 🆕 Enhanced Drop Hint */}
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
        
        {/* 🆕 Dragging Indicator */}
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
                className="bg-white/90 shadow-sm hover:bg-white p-2"
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

      {/* Folder Information */}
      <div className={`p-4 ${isDragOver ? 'bg-blue-50' : ''}`}>
        <h3 
          className={`text-sm font-medium truncate mb-1 cursor-pointer transition-colors ${
            isDragOver 
              ? 'text-blue-900' 
              : 'text-gray-900 hover:text-indigo-600'
          }`}
          title={folder.name}
          onClick={() => onOpen(folder)}
        >
          {folder.name}
        </h3>
        
        {/* Kunden-Badge */}
        {associatedCompany && (
          <div className="mb-2">
            <Badge color="blue" className="text-xs">
              {associatedCompany.name}
            </Badge>
          </div>
        )}
        
        <div className="space-y-1">
          <p className={`text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
            {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
          </p>
          {folder.description && (
            <p className={`text-xs truncate ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`} title={folder.description}>
              {folder.description}
            </p>
          )}
          <p className={`text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
            {folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}