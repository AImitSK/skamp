'use client';

import React from 'react';
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

export function DatenTabContent({
  project,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
}: DatenTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading level={3}>Projektdaten verwalten</Heading>
        <Text className="text-gray-500 mt-1">
          Organisieren Sie alle Projektdateien und Dokumente zentral
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
        />
      )}
    </div>
  );
}
