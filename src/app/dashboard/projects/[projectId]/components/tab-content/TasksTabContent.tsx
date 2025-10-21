'use client';

import React from 'react';
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';

interface TasksTabContentProps {
  project: Project;
  organizationId: string;
  teamMembers: TeamMember[];
}

export function TasksTabContent({
  project,
  organizationId,
  teamMembers
}: TasksTabContentProps) {
  return (
    <div className="space-y-6">
      {project && teamMembers.length > 0 && (
        <ProjectTaskManager
          projectId={project.id!}
          organizationId={organizationId}
          projectManagerId={project.projectManager || project.userId}
          teamMembers={teamMembers}
          projectTeamMemberIds={project.assignedTo}
          projectTitle={project.title}
        />
      )}
    </div>
  );
}
