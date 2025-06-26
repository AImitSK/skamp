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
  
  // 🆕 Drag & Drop Props
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}

export default function FolderCard({ 
  folder, 
  onOpen, 
  onEdit, 
  onDelete, 
  onShare, 
  fileCount = 0,
  // 🆕 Drag & Drop Props
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop
}: FolderCardProps) {
  
  const { companies } = useCrmData();
  const folderColor = folder.color || '#6366f1'; // Default Indigo
  
  const associatedCompany = folder.clientId 
    ? companies.find(c => c.id === folder.clientId)
    : null;

  return (
    <div 
      className={`group relative bg-white rounded-lg border shadow-sm transition-all duration-200 overflow-hidden ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50 shadow-lg scale-105 border-2' // 🆕 Drag Over Styling
          : 'border-gray-200 hover:shadow-md'
      }`}
      // 🆕 Drag & Drop Event Handlers
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
        
        {/* 🆕 Drop Hint */}
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