// src/components/mediathek/MediaCard.tsx
"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { MediaAsset } from "@/types/media";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider
} from "@/components/ui/dropdown";
import {
  EyeIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import Link from 'next/link';

interface MediaCardProps {
  asset: MediaAsset;
  isSelected: boolean;
  isDragging: boolean;
  isSelectionMode: boolean;
  selectedAssetsCount: number;
  tooltip?: string;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void;
  onToggleSelection: (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const getFileIcon = (fileType: string | undefined) => {
  if (!fileType) return DocumentTextIcon;

  if (fileType.startsWith('image/')) {
    return PhotoIcon;
  } else if (fileType.startsWith('video/')) {
    return VideoCameraIcon;
  } else if (fileType.includes('pdf') || fileType.includes('document')) {
    return DocumentTextIcon;
  } else {
    return DocumentTextIcon;
  }
};

// Phase 3.4: React.memo prevents unnecessary re-renders
const MediaCard = memo(function MediaCard({
  asset,
  isSelected,
  isDragging,
  isSelectionMode,
  selectedAssetsCount,
  tooltip,
  onDragStart,
  onDragEnd,
  onClick,
  onToggleSelection,
  onEdit,
  onShare,
  onDelete,
}: MediaCardProps) {
  const t = useTranslations('mediathek.mediaCard');
  const FileIcon = getFileIcon(asset.fileType);

  return (
    <div
      className={`group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isSelected ? 'border-[#005fab] bg-blue-50' : 'border-gray-200'
      }`}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={tooltip}
    >
      {/* Selection Checkbox */}
      <div className={`absolute top-2 left-2 z-10 transition-opacity ${
        isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <label className="cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="size-4 text-[#005fab] bg-white border-gray-300 rounded focus:ring-[#005fab] focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </div>

      {/* Multi-Selection Badge */}
      {isSelected && selectedAssetsCount > 1 && (
        <div className="absolute top-2 right-2 bg-[#005fab] text-white text-xs px-2 py-1 rounded-full z-10">
          {selectedAssetsCount}
        </div>
      )}

      {/* Preview */}
      <div className="aspect-square w-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
        {asset.fileType?.startsWith('image/') ? (
          <img
            src={asset.downloadUrl}
            alt={asset.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <FileIcon className="h-16 w-16 text-gray-400" />
        )}

        {/* Hover Actions */}
        {!isSelectionMode && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Link href={asset.downloadUrl} target="_blank">
                <Button color="zinc" className="shadow-lg bg-white p-2">
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 3-Punkte-Menü */}
        {!isSelectionMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dropdown>
              <DropdownButton
                plain
                className="bg-white/90 shadow-sm hover:bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <EllipsisVerticalIcon className="h-4 w-4" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                <DropdownItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 text-gray-500" />
                  {t('editDetails')}
                </DropdownItem>
                <DropdownItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onShare();
                  }}
                  className="hover:bg-gray-50"
                >
                  <ShareIcon className="h-4 w-4 text-gray-500" />
                  {t('share')}
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">{t('delete')}</span>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={asset.fileName}>
          {asset.fileName}
        </h3>
      </div>
    </div>
  );
});

export default MediaCard;
