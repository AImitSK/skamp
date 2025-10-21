'use client';

import React from 'react';
import ProjectPressemeldungenTab from '@/components/projects/pressemeldungen/ProjectPressemeldungenTab';
import { Project } from '@/types/project';

interface PressemeldungTabContentProps {
  project: Project;
  organizationId: string;
}

export function PressemeldungTabContent({
  project,
  organizationId
}: PressemeldungTabContentProps) {
  return (
    <div className="space-y-6">
      {project && (
        <ProjectPressemeldungenTab
          projectId={project.id!}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
