'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import { Project } from '@/types/project';

interface DatenTabContentProps {
  project: Project;
  organizationId: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export const DatenTabContent = React.memo(function DatenTabContent({
  project,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
}: DatenTabContentProps) {
  const t = useTranslations('projects.tabs.daten');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading level={3}>{t('title')}</Heading>
        <Text className="text-gray-500 mt-1">
          {t('description')}
        </Text>
      </div>

      {/* Projekt-Ordner - Zeigt alle Projekt-Ordner */}
      {projectFolders && (
        <ProjectFoldersView
          projectId={project.id!}
          organizationId={organizationId}
          customerId={project.customer?.id}
          customerName={project.customer?.name}
          projectFolders={projectFolders}
          foldersLoading={foldersLoading}
          onRefresh={onRefresh}
          filterByFolder="all"
          title={t('folderViewTitle')}
        />
      )}
    </div>
  );
});
