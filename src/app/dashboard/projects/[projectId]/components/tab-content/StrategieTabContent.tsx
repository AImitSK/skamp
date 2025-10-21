'use client';

import React from 'react';
import ProjectStrategyTab from '@/components/projects/strategy/ProjectStrategyTab';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import { Project } from '@/types/project';

interface StrategieTabContentProps {
  project: Project;
  organizationId: string;
  dokumenteFolder: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function StrategieTabContent({
  project,
  organizationId,
  dokumenteFolder,
  foldersLoading,
  onRefresh
}: StrategieTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Templates */}
      {project && (
        <ProjectStrategyTab
          projectId={project.id!}
          organizationId={organizationId}
          project={project}
          dokumenteFolderId={dokumenteFolder?.mainFolder?.id}
          onDocumentSaved={onRefresh}
        />
      )}

      {/* Projekt-Ordner - Zeigt nur Dokumente-Ordner */}
      {dokumenteFolder && (
        <ProjectFoldersView
          key={`strategy-folders-${dokumenteFolder.assets?.length || 0}`}
          projectId={project.id!}
          organizationId={organizationId}
          projectFolders={dokumenteFolder}
          foldersLoading={foldersLoading}
          onRefresh={onRefresh}
          filterByFolder="Dokumente"
          initialFolderId={dokumenteFolder.mainFolder?.id}
        />
      )}
    </div>
  );
}
