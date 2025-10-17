// src/components/mediathek/BreadcrumbNavigation.tsx
"use client";

import { useState } from "react";
import { FolderBreadcrumb } from "@/types/media";
import { HomeIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface BreadcrumbNavigationProps {
  breadcrumbs: FolderBreadcrumb[];
  onNavigate: (folderId?: string) => void;
  onBreadcrumbDrop?: (targetFolderId: string | undefined, event: React.DragEvent) => void;
}

export default function BreadcrumbNavigation({
  breadcrumbs,
  onNavigate,
  onBreadcrumbDrop
}: BreadcrumbNavigationProps) {
  const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, folderId: string | undefined) => {
    if (!onBreadcrumbDrop) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Verhindern, dass man auf den aktuellen Ordner (letzter Breadcrumb) droppt
    const isCurrentFolder = breadcrumbs.length > 0 && folderId === breadcrumbs[breadcrumbs.length - 1].id;
    if (!isCurrentFolder) {
      setDragOverBreadcrumb(folderId || 'root');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverBreadcrumb(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverBreadcrumb(null);

    if (onBreadcrumbDrop) {
      onBreadcrumbDrop(folderId, e);
    }
  };

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {/* Home/Root Button - mit Drop-Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, undefined)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, undefined)}
        className={`rounded-md transition-colors ${
          dragOverBreadcrumb === 'root'
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : ''
        }`}
      >
        <Button
          plain
          onClick={() => onNavigate(undefined)}
          className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          <HomeIcon className="h-4 w-4" />
          <span>Mediathek</span>
        </Button>
      </div>

      {/* Breadcrumb Items - mit Drop-Zone */}
      {breadcrumbs.map((breadcrumb, index) => {
        const isCurrentFolder = index === breadcrumbs.length - 1;
        const isDropTarget = dragOverBreadcrumb === breadcrumb.id;

        return (
          <div key={breadcrumb.id} className="flex items-center space-x-1">
            <ChevronRightIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
            <div
              onDragOver={(e) => handleDragOver(e, breadcrumb.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, breadcrumb.id)}
              className={`rounded-md transition-colors ${
                isDropTarget && !isCurrentFolder
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : ''
              }`}
            >
              <Button
                plain
                onClick={() => onNavigate(breadcrumb.id)}
                className={`text-sm ${
                  isCurrentFolder
                    ? 'text-zinc-900 font-medium cursor-default dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
                disabled={isCurrentFolder}
              >
                {breadcrumb.name}
              </Button>
            </div>
          </div>
        );
      })}
    </nav>
  );
}