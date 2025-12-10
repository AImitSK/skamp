'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import ProjectTable from '../tables/ProjectTable';
import NoActiveProjectsState from '../empty-states/NoActiveProjectsState';
import NoArchivedProjectsState from '../empty-states/NoArchivedProjectsState';
import NoFiltersSelectedState from '../empty-states/NoFiltersSelectedState';
import NoProjectsAtAllState from '../empty-states/NoProjectsAtAllState';

interface ListViewProps {
  loading: boolean;
  projects: Project[];
  allProjects: Project[];
  searchTerm: string;
  showActive: boolean;
  showArchived: boolean;
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  currentOrganizationId: string;
  userId: string;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ListView({
  loading,
  projects,
  allProjects,
  searchTerm,
  showActive,
  showArchived,
  teamMembers,
  loadingTeam,
  currentOrganizationId,
  userId,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete
}: ListViewProps) {
  const t = useTranslations('projects');

  // Loading State
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-zinc-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600">
          {projects.length} {projects.length === 1 ? t('results.singular') : t('results.plural')}
          {searchTerm && (
            <span className="ml-2">· {t('results.filteredFrom', { total: allProjects.length })}</span>
          )}
        </Text>
      </div>

      {/* Table View */}
      <div className="space-y-4">
        {/* Archiv Info-Banner wenn nur Archiv-Filter aktiv */}
        {showArchived && !showActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FunnelIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  {t('archiveBanner.title')}
                </h3>
                <p className="text-sm text-blue-700">
                  {t('archiveBanner.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ProjectTable */}
        {projects.length > 0 && (
          <ProjectTable
            projects={projects}
            teamMembers={teamMembers}
            loadingTeam={loadingTeam}
            currentOrganizationId={currentOrganizationId}
            userId={userId}
            onEdit={onEdit}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
          />
        )}

        {/* Empty States */}
        {projects.length === 0 && showActive && !showArchived && <NoActiveProjectsState />}
        {projects.length === 0 && showArchived && !showActive && <NoArchivedProjectsState />}
        {projects.length === 0 && (!showActive && !showArchived) && <NoFiltersSelectedState />}
        {projects.length === 0 && (showActive && showArchived) && <NoProjectsAtAllState />}
      </div>
    </>
  );
}
