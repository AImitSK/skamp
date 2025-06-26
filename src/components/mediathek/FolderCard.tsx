// src/components/mediathek/FolderCard.tsx
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
import { useCrmData } from "@/context/CrmDataContext"; // NEU: Für Firmennamen

interface FolderCardProps {
  folder: MediaFolder;
  onOpen: (folder: MediaFolder) => void;
  onEdit: (folder: MediaFolder) => void;
  onDelete: (folder: MediaFolder) => void;
  onShare?: (folder: MediaFolder) => void; // NEU: Share-Funktion
  fileCount?: number;
}

export default function FolderCard({ 
  folder, 
  onOpen, 
  onEdit, 
  onDelete, 
  onShare, // NEU: Share-Handler
  fileCount = 0 
}: FolderCardProps) {
  
  const { companies } = useCrmData(); // NEU: Firmen-Daten laden
  const folderColor = folder.color || '#6366f1'; // Default Indigo
  
  // NEU: Firmennamen ermitteln
  const associatedCompany = folder.clientId 
    ? companies.find(c => c.id === folder.clientId)
    : null;

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Folder Preview */}
      <div 
        className="aspect-square w-full bg-gray-50 flex items-center justify-center cursor-pointer relative"
        onClick={() => onOpen(folder)}
      >
        <FolderIcon 
          className="h-16 w-16 transition-transform duration-200 group-hover:scale-105" 
          style={{ color: folderColor }}
        />
        
        {/* Hover-Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
        
        {/* Actions Menu */}
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
      </div>

      {/* Folder Information */}
      <div className="p-4">
        <h3 
          className="text-sm font-medium text-gray-900 truncate mb-1 cursor-pointer hover:text-indigo-600" 
          title={folder.name}
          onClick={() => onOpen(folder)}
        >
          {folder.name}
        </h3>
        
        {/* NEU: Kunden-Badge */}
        {associatedCompany && (
          <div className="mb-2">
            <Badge color="blue" className="text-xs">
              {associatedCompany.name}
            </Badge>
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
          </p>
          {folder.description && (
            <p className="text-xs text-gray-500 truncate" title={folder.description}>
              {folder.description}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}