// src/components/MediaUploadLink.tsx - Wiederverwendbarer Upload-Link
"use client";

import { Button } from "@/components/ui/button";
import { PhotoIcon, FolderPlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface MediaUploadLinkProps {
  companyId: string;
  companyName: string;
  variant?: 'button' | 'compact' | 'inline';
  className?: string;
}

export default function MediaUploadLink({ 
  companyId, 
  companyName, 
  variant = 'button',
  className = ''
}: MediaUploadLinkProps) {
  
  const uploadUrl = `/dashboard/library/media?uploadFor=${companyId}`;
  const mediaUrl = `/dashboard/library/media`; // Später: mit Client-Filter
  
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Link href={uploadUrl}>
          <Button color="zinc" className="text-xs">
            <PhotoIcon className="h-3 w-3 mr-1" />
            Upload
          </Button>
        </Link>
        <Link href={mediaUrl}>
          <Button plain className="text-xs text-gray-500 hover:text-gray-700">
            Mediathek
          </Button>
        </Link>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <span className={className}>
        <Link href={uploadUrl} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          📎 Medien hochladen
        </Link>
        {' • '}
        <Link href={mediaUrl} className="text-gray-500 hover:text-gray-700 text-sm">
          Mediathek öffnen
        </Link>
      </span>
    );
  }
  
  // Default: button variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Link href={uploadUrl}>
        <Button color="indigo">
          <PhotoIcon className="h-4 w-4 mr-2" />
          Medien hochladen für {companyName}
        </Button>
      </Link>
      <Link href={mediaUrl}>
        <Button color="zinc">
          <FolderPlusIcon className="h-4 w-4 mr-2" />
          Zur Mediathek
        </Button>
      </Link>
    </div>
  );
}

// === USAGE EXAMPLES ===

/*
// 1. In Company Detail Page - Vollständige Buttons
<MediaUploadLink 
  companyId={company.id!}
  companyName={company.name}
  variant="button"
  className="mt-4"
/>

// 2. In Company Card/List - Kompakte Buttons
<MediaUploadLink 
  companyId={company.id!}
  companyName={company.name}
  variant="compact"
  className="ml-auto"
/>

// 3. In Text oder Beschreibung - Inline Links
<p className="text-sm text-gray-600">
  Verwalten Sie Medien für diesen Kunden: {' '}
  <MediaUploadLink 
    companyId={company.id!}
    companyName={company.name}
    variant="inline"
  />
</p>

// 4. Mit Custom Styling
<MediaUploadLink 
  companyId={company.id!}
  companyName={company.name}
  variant="compact"
  className="absolute top-2 right-2"
/>
*/