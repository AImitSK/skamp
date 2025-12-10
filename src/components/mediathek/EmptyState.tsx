// src/components/mediathek/EmptyState.tsx
"use client";

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('media.emptyState');

  return (
    <div className="text-center py-12 border rounded-lg bg-white">
      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
      <Heading level={3} className="mt-2">
        {isInFolder ? t('folderEmpty') : t('libraryEmpty')}
      </Heading>
      <Text className="mt-1">
        {isInFolder ? t('folderEmptyHint') : t('libraryEmptyHint')}
      </Text>
      <div className="mt-6 flex justify-center gap-3">
        <Button plain onClick={onCreateFolder}>
          <FolderPlusIcon className="h-4 w-4" />
          {t('createFolder')}
        </Button>
        <Button
          onClick={onUpload}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          <PlusIcon className="h-4 w-4" />
          {t('uploadFiles')}
        </Button>
      </div>
    </div>
  );
}
