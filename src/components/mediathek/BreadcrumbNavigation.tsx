// src/components/mediathek/BreadcrumbNavigation.tsx
"use client";

import { FolderBreadcrumb } from "@/types/media";
import { HomeIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface BreadcrumbNavigationProps {
  breadcrumbs: FolderBreadcrumb[];
  onNavigate: (folderId?: string) => void;
}

export default function BreadcrumbNavigation({
  breadcrumbs,
  onNavigate
}: BreadcrumbNavigationProps) {

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {/* Home/Root Button */}
      <Button
        plain
        onClick={() => onNavigate(undefined)}
        className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        <HomeIcon className="h-4 w-4" />
        <span>Mediathek</span>
      </Button>

      {/* Breadcrumb Items */}
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.id} className="flex items-center space-x-1">
          <ChevronRightIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
          <Button
            plain
            onClick={() => onNavigate(breadcrumb.id)}
            className={`text-sm ${
              index === breadcrumbs.length - 1
                ? 'text-zinc-900 font-medium cursor-default dark:text-white'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
            disabled={index === breadcrumbs.length - 1}
          >
            {breadcrumb.name}
          </Button>
        </div>
      ))}
    </nav>
  );
}