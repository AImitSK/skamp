'use client';

import React from 'react';
import ProjectDistributionLists from '@/components/projects/distribution/ProjectDistributionLists';
import { Project } from '@/types/project';

interface VerteilerTabContentProps {
  project: Project;
  organizationId: string;
}

export function VerteilerTabContent({
  project,
  organizationId
}: VerteilerTabContentProps) {
  return (
    <div className="space-y-6">
      {project && (
        <ProjectDistributionLists
          projectId={project.id!}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
