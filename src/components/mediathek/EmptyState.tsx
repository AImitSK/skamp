// src/components/mediathek/EmptyState.tsx
"use client";

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { PhotoIcon, FolderPlusIcon, PlusIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  isInFolder: boolean;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export default function EmptyState({
  isInFolder,
  onCreateFolder,
  onUpload
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 border rounded-lg bg-white">
      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
      <Heading level={3} className="mt-2">
        {isInFolder ? 'Dieser Ordner ist leer' : 'Ihre Mediathek ist leer'}
      </Heading>
      <Text className="mt-1">
        {isInFolder
          ? 'Laden Sie Dateien hoch oder erstellen Sie Unterordner.'
          : 'Erstellen Sie Ihren ersten Ordner oder laden Sie Dateien hoch.'
        }
      </Text>
      <div className="mt-6 flex justify-center gap-3">
        <Button plain onClick={onCreateFolder}>
          <FolderPlusIcon className="h-4 w-4" />
          Ordner erstellen
        </Button>
        <Button
          onClick={onUpload}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          <PlusIcon className="h-4 w-4" />
          Dateien hochladen
        </Button>
      </div>
    </div>
  );
}
