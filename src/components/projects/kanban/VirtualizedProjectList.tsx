// src/components/projects/kanban/VirtualizedProjectList.tsx - Virtual Scrolling für Plan 10/9
'use client';

import React, { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
// TODO: react-window Package Installation erforderlich
// import { FixedSizeList as List } from 'react-window';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { Tag } from '@/types/crm';
import { ProjectCard } from './ProjectCard';
import { PERFORMANCE_CONFIG } from './kanban-constants';

// ========================================
// INTERFACES
// ========================================

export interface VirtualizedProjectListProps {
  projects: Project[];
  height: number;
  onProjectSelect?: (projectId: string) => void;
  onProjectMove?: (projectId: string, targetStage: any) => Promise<void>;
  onProjectAdded?: () => void;
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
  onProjectUpdated?: () => void;
  useDraggableProject: (project: Project) => any;
  loading?: boolean;
  teamMembers?: TeamMember[];
  tags?: Tag[];
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    projects: Project[];
    onProjectSelect?: (projectId: string) => void;
    onProjectMove?: (projectId: string, targetStage: any) => Promise<void>;
    onProjectAdded?: () => void;
    onProjectDeleted?: () => void;
    onProjectArchived?: () => void;
    onProjectUpdated?: () => void;
    useDraggableProject: (project: Project) => any;
    teamMembers?: TeamMember[];
    tags?: Tag[];
  };
}

// ========================================
// LIST ITEM KOMPONENTE
// ========================================

const ListItem: React.FC<ListItemProps> = memo(({ index, style, data }) => {
  const { projects, onProjectSelect, onProjectMove, onProjectAdded, onProjectDeleted, onProjectArchived, onProjectUpdated, useDraggableProject, teamMembers, tags } = data;
  const project = projects[index];

  if (!project) {
    return (
      <div style={style} className="px-3">
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div className="pb-1.5">
        <ProjectCard
          project={project}
          onSelect={onProjectSelect}
          onProjectMove={onProjectMove}
          onProjectAdded={onProjectAdded}
          onProjectDeleted={onProjectDeleted}
          onProjectArchived={onProjectArchived}
          onProjectUpdated={onProjectUpdated}
          useDraggableProject={useDraggableProject}
          teamMembers={teamMembers}
          tags={tags}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Performance optimization - custom comparison
  const prevProject = prevProps.data.projects[prevProps.index];
  const nextProject = nextProps.data.projects[nextProps.index];
  
  if (!prevProject && !nextProject) return true;
  if (!prevProject || !nextProject) return false;
  
  return (
    prevProject.id === nextProject.id &&
    prevProject.updatedAt === nextProject.updatedAt &&
    prevProps.index === nextProps.index
  );
});

ListItem.displayName = 'VirtualizedListItem';

// ========================================
// VIRTUALIZED PROJECT LIST KOMPONENTE
// ========================================

export const VirtualizedProjectList: React.FC<VirtualizedProjectListProps> = memo(({
  projects,
  height,
  onProjectSelect,
  onProjectMove,
  onProjectAdded,
  onProjectDeleted,
  onProjectArchived,
  onProjectUpdated,
  useDraggableProject,
  loading = false,
  teamMembers = [],
  tags = []
}) => {
  const t = useTranslations('projects.kanban');

  // Memoized data object for list items
  const itemData = useMemo(() => ({
    projects,
    onProjectSelect,
    onProjectMove,
    onProjectAdded,
    onProjectDeleted,
    onProjectArchived,
    onProjectUpdated,
    useDraggableProject,
    teamMembers,
    tags
  }), [projects, onProjectSelect, onProjectMove, onProjectAdded, onProjectDeleted, onProjectArchived, onProjectUpdated, useDraggableProject, teamMembers, tags]);

  // Performance threshold - virtualize only for large lists
  const shouldVirtualize = projects.length >= PERFORMANCE_CONFIG.virtualScrolling.threshold;

  // Loading state
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-24"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="text-4xl mb-3">📋</div>
        <h4 className="text-lg font-medium mb-2">{t('empty.title')}</h4>
        <p className="text-sm text-center">
          {t('empty.noProjectsInCategory')}
        </p>
      </div>
    );
  }

  // Small list - render normally for better performance
  if (!shouldVirtualize) {
    return (
      <div className="space-y-2">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onSelect={onProjectSelect}
            onProjectMove={onProjectMove}
            useDraggableProject={useDraggableProject}
            teamMembers={teamMembers}
            tags={tags}
          />
        ))}
      </div>
    );
  }

  // Large list - use virtualization (nach react-window Installation)
  // TODO: React-Window Implementation
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onSelect={onProjectSelect}
          onProjectMove={onProjectMove}
          onProjectAdded={onProjectAdded}
          onProjectDeleted={onProjectDeleted}
          onProjectArchived={onProjectArchived}
          onProjectUpdated={onProjectUpdated}
          useDraggableProject={useDraggableProject}
          teamMembers={teamMembers}
          tags={tags}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Performance optimization - prevent unnecessary re-renders
  return (
    prevProps.projects.length === nextProps.projects.length &&
    prevProps.height === nextProps.height &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.projects.map(p => ({ id: p.id, updatedAt: p.updatedAt }))) === 
    JSON.stringify(nextProps.projects.map(p => ({ id: p.id, updatedAt: p.updatedAt })))
  );
});

VirtualizedProjectList.displayName = 'VirtualizedProjectList';

export default VirtualizedProjectList;