'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { toastService } from '@/lib/utils/toast';

interface ProjectTableProps {
  projects: Project[];
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  currentOrganizationId: string;
  userId: string;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ProjectTable({
  projects,
  teamMembers,
  loadingTeam,
  currentOrganizationId,
  userId,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete
}: ProjectTableProps) {
  const t = useTranslations('projects.table');

  // Hilfsfunktionen
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'on_hold': return 'yellow';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'zinc';
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('status.active');
      case 'on_hold': return t('status.onHold');
      case 'completed': return t('status.completed');
      case 'cancelled': return t('status.cancelled');
      default: return status;
    }
  };

  const getCurrentStageLabel = (stage: string) => {
    switch (stage) {
      case 'ideas_planning': return t('stages.planning');
      case 'creation': return t('stages.creation');
      case 'approval': return t('stages.approval');
      case 'distribution': return t('stages.distribution');
      case 'monitoring': return t('stages.monitoring');
      case 'completed': return t('stages.completed');
      default: return stage;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-8 py-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center">
          <div className="flex-1 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {t('headers.project')}
          </div>
          <div className="w-32 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {t('headers.status')}
          </div>
          <div className="w-40 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {t('headers.stage')}
          </div>
          <div className="w-40 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {t('headers.team')}
          </div>
          <div className="w-32 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {t('headers.updated')}
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-zinc-200">
        {projects.map((project) => {
          return (
            <div key={project.id} className="px-8 py-5 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center">
                {/* Projekt Title mit Kunde */}
                <div className="flex-1 px-4 min-w-0">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="text-sm font-semibold text-zinc-900 hover:text-primary block truncate"
                    title={project.title}
                  >
                    {project.title}
                  </Link>
                  {project.customer && (
                    <div className="flex items-center gap-2 mt-1">
                      <BuildingOfficeIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                      <span className="text-xs text-zinc-500 truncate">
                        {project.customer.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="w-32 px-4">
                  <Badge color={getProjectStatusColor(project.status)}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>

                {/* Projektphase als Text */}
                <div className="w-40 px-4">
                  <div className="text-sm text-zinc-900">
                    {getCurrentStageLabel(project.currentStage)}
                  </div>
                </div>

                {/* Team Avatare */}
                <div className="w-40 px-4">
                  {project.assignedTo && project.assignedTo.length > 0 ? (
                    <div className="flex -space-x-2">
                      {(() => {
                        const uniqueMembers = [];
                        const seenMemberIds = new Set();

                        for (const userId of project.assignedTo) {
                          const member = teamMembers.find(m => m.userId === userId || m.id === userId);
                          if (member && !seenMemberIds.has(member.id)) {
                            uniqueMembers.push({ userId, member });
                            seenMemberIds.add(member.id);
                          } else if (!member) {
                            uniqueMembers.push({ userId, member: null });
                          }
                        }

                        return uniqueMembers;
                      })().slice(0, 3).map(({ userId, member }) => {

                        if (!member || loadingTeam) {
                          // Fallback für unbekannte Member
                          return (
                            <div
                              key={userId}
                              className="w-7 h-7 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 text-xs font-medium ring-2 ring-white"
                              title={loadingTeam ? t('team.loadingMembers') : t('team.unknownMember')}
                            >
                              {loadingTeam ? "..." : "?"}
                            </div>
                          );
                        }

                        // Generate initials as fallback
                        const initials = member.displayName
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <Avatar
                            key={userId}
                            className="size-7 ring-2 ring-white"
                            src={member.photoUrl}
                            initials={initials}
                            title={member.displayName}
                          />
                        );
                      })}
                      {(() => {
                        const uniqueMembers = [];
                        const seenMemberIds = new Set();

                        for (const userId of project.assignedTo) {
                          const member = teamMembers.find(m => m.userId === userId || m.id === userId);
                          if (member && !seenMemberIds.has(member.id)) {
                            uniqueMembers.push({ userId, member });
                            seenMemberIds.add(member.id);
                          } else if (!member) {
                            uniqueMembers.push({ userId, member: null });
                          }
                        }

                        return uniqueMembers.length > 3 ? (
                          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 text-xs font-medium ring-2 ring-white">
                            +{uniqueMembers.length - 3}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">{t('team.noTeam')}</span>
                  )}
                </div>

                {/* Aktualisiert */}
                <div className="w-32 px-4">
                  <div className="text-xs text-zinc-600">
                    {formatDate(project.updatedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="w-12 flex justify-end">
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem href={`/dashboard/projects/${project.id}`}>
                        <EyeIcon className="h-4 w-4" />
                        {t('actions.view')}
                      </DropdownItem>
                      <DropdownItem onClick={() => onEdit(project)}>
                        <PencilIcon className="h-4 w-4" />
                        {t('actions.edit')}
                      </DropdownItem>
                      <DropdownDivider />
                      {project.status === 'archived' ? (
                        <DropdownItem
                          onClick={async () => {
                            try {
                              await onUnarchive(project.id!);
                              toastService.success(`Projekt "${project.title}" reaktiviert`);
                            } catch (error) {
                              toastService.error('Projekt konnte nicht reaktiviert werden');
                            }
                          }}
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                          {t('actions.unarchive')}
                        </DropdownItem>
                      ) : (
                        <DropdownItem
                          onClick={async () => {
                            try {
                              await onArchive(project.id!);
                              toastService.success(`Projekt "${project.title}" archiviert`);
                            } catch (error) {
                              toastService.error('Projekt konnte nicht archiviert werden');
                            }
                          }}
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                          {t('actions.archive')}
                        </DropdownItem>
                      )}
                      <DropdownDivider />
                      <DropdownItem
                        onClick={async () => {
                          if (confirm(t('actions.deleteConfirm'))) {
                            try {
                              const projectTitle = project.title;
                              await onDelete(project.id!);
                              toastService.success(`Projekt "${projectTitle}" erfolgreich gelöscht`);
                            } catch (error) {
                              toastService.error('Projekt konnte nicht gelöscht werden');
                            }
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-red-600">{t('actions.delete')}</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
