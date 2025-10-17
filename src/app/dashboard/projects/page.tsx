'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { 
  PlusIcon,
  RocketLaunchIcon,
  EllipsisVerticalIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  FolderIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ViewColumnsIcon,
  BuildingOfficeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { ProjectCreationWizard } from '@/components/projects/creation/ProjectCreationWizard';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';
import { projectService } from '@/lib/firebase/project-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { Project, ProjectCreationResult, PipelineStage } from '@/types/project';
import { TeamMember } from '@/types/international';
import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { KanbanBoard } from '@/components/projects/kanban/KanbanBoard';
import { useMoveProject, useProjects, useDeleteProject, useArchiveProject } from '@/lib/hooks/useProjectData';
import Link from 'next/link';

// Kanban Layout Wrapper Komponente
const KanbanLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    // Verstecke Sidebar nur für Kanban-View
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const mainContent = document.querySelector('[data-slot="main"]');
    
    if (sidebar && mainContent) {
      sidebar.classList.add('hidden');
      mainContent.classList.remove('lg:pl-64', 'xl:pl-80');
      mainContent.classList.add('lg:pl-0');
      
      mainContent.classList.remove('p-4', 'sm:p-6', 'lg:p-8');
      mainContent.classList.add('p-0');
    }
    
    // Cleanup beim Wechsel zurück zu Listen-View
    return () => {
      if (sidebar && mainContent) {
        sidebar.classList.remove('hidden');
        mainContent.classList.add('lg:pl-64', 'xl:pl-80');
        mainContent.classList.remove('lg:pl-0');
        
        mainContent.classList.add('p-4', 'sm:p-6', 'lg:p-8');
        mainContent.classList.remove('p-0');
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 top-14">
      {children}
    </div>
  );
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  // React Query Hook für Projekte
  const { data: allProjects = [], isLoading } = useProjects(currentOrganization?.id);
  const [showWizard, setShowWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [filters, setFilters] = useState<BoardFilters>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Gefilterte Projekte basierend auf Checkboxen
  const projects = React.useMemo(() => {
    if (showActive && showArchived) {
      return allProjects;
    } else if (showActive) {
      return allProjects.filter(p => p.status !== 'archived');
    } else if (showArchived) {
      return allProjects.filter(p => p.status === 'archived');
    }
    return [];
  }, [allProjects, showActive, showArchived]);

  const loading = isLoading;

  useEffect(() => {
    loadTeamMembers();
  }, [currentOrganization?.id]);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // loadProjects entfernt - React Query handled das automatisch

  const loadTeamMembers = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoadingTeam(true);
      const members = await teamMemberService.getByOrganization(currentOrganization.id);
      const activeMembers = members.filter(m => m.status === 'active');
      setTeamMembers(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleWizardSuccess = (result: ProjectCreationResult) => {
    console.log('Projekt erfolgreich erstellt:', result);
    // React Query invalidiert automatisch den Cache
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowEditWizard(true);
  };

  const handleEditSuccess = (updatedProject: Project) => {
    // React Query invalidiert automatisch den Cache
  };

  // Group projects by pipeline stage for board view - BUGFIX: 6 Phasen statt 7
  const groupProjectsByStage = (projectList: Project[]) => {
    const stages: PipelineStage[] = [
      'ideas_planning',
      'creation',
      'approval',
      'distribution',
      'monitoring',
      'completed'
    ];

    return stages.reduce((acc, stage) => {
      acc[stage] = projectList.filter(project => 
        project.currentStage === stage && project.status !== 'archived'
      );
      return acc;
    }, {} as Record<PipelineStage, Project[]>);
  };

  // React Query Hooks
  const moveProjectMutation = useMoveProject();
  const deleteProjectMutation = useDeleteProject();
  const archiveProjectMutation = useArchiveProject();

  // Handle project move in board view
  const handleProjectMove = async (projectId: string, targetStage: PipelineStage) => {
    if (!user || !currentOrganization?.id) return;

    try {
      // Find current stage
      let currentStage: PipelineStage | null = null;
      for (const project of projects) {
        if (project.id === projectId) {
          currentStage = project.currentStage;
          break;
        }
      }

      if (!currentStage) {
        throw new Error('Projekt nicht gefunden');
      }

      // Move project mit Optimistic Update
      await moveProjectMutation.mutateAsync({
        projectId,
        currentStage,
        targetStage,
        userId: user.uid,
        organizationId: currentOrganization.id
      });

      // Kein loadProjects() mehr - React Query handled den Cache
    } catch (error: any) {
      console.error('Move error:', error);
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: BoardFilters) => {
    setFilters(newFilters);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'board' | 'list' | 'calendar') => {
    setViewMode(mode);
  };

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
      case 'active': return 'Aktiv';
      case 'on_hold': return 'Pausiert';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  const getCurrentStageLabel = (stage: string) => {
    switch (stage) {
      case 'ideas_planning': return 'Planung';
      case 'creation': return 'Erstellung';
      case 'approval': return 'Freigabe';
      case 'distribution': return 'Verteilung';
      case 'monitoring': return 'Monitoring';
      case 'completed': return 'Abgeschlossen';
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

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <Text>Keine Organisation ausgewählt</Text>
      </div>
    );
  }

  // Kanban Full-Width Layout
  if (viewMode === 'board') {
    return (
      <KanbanLayoutWrapper>
        <div className="w-full h-[calc(100vh-3.5rem)] bg-white flex flex-col">
          {/* Board View with integrated toolbar */}
          {!loading && !error && projects.length > 0 && currentOrganization && (
            <KanbanBoard
              projects={groupProjectsByStage(projects)}
              totalProjects={projects.length}
              activeUsers={[]}
              filters={filters}
              loading={loading}
              onProjectMove={handleProjectMove}
              onFiltersChange={handleFiltersChange}
              onRefresh={() => {}} // Kein Manual Refresh nötig - React Query handled das
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onNewProject={() => setShowWizard(true)}
            />
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 text-center">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 inline-block">
                <h3 className="text-sm font-medium text-red-800 mb-2">Fehler beim Laden</h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <button
                  onClick={loadProjects}
                  className="text-sm text-red-800 hover:text-red-900 underline"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Projekte werden geladen...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && projects.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Projekte</h3>
                <p className="text-gray-500 mb-6">
                  Erstellen Sie Ihr erstes Projekt mit dem Projekt-Anlage-Wizard.
                </p>
                <Button onClick={() => setShowWizard(true)} className="flex items-center space-x-2">
                  <RocketLaunchIcon className="w-4 h-4" />
                  <span>Erstes Projekt erstellen</span>
                </Button>
              </div>
            </div>
          )}

          {/* Project Creation Wizard */}
          <ProjectCreationWizard
            isOpen={showWizard}
            onClose={() => setShowWizard(false)}
            onSuccess={handleWizardSuccess}
            organizationId={currentOrganization.id}
          />

          {/* Project Edit Wizard */}
          {editingProject && (
            <ProjectEditWizard
              isOpen={showEditWizard}
              onClose={() => {
                setShowEditWizard(false);
                setEditingProject(null);
              }}
              onSuccess={handleEditSuccess}
              project={editingProject}
              organizationId={currentOrganization.id}
            />
          )}
        </div>
      </KanbanLayoutWrapper>
    );
  }

  // Listen-Ansicht mit normalem Layout
  return (
    <>
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Projekte</Heading>
            <Subheading>Verwalten Sie Ihre PR-Projekte und Kampagnen</Subheading>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => handleViewModeChange('board')}
                className={`
                  px-3 py-2 text-sm font-medium rounded-l-lg transition-colors
                  ${viewMode === 'board'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                title="Board-Ansicht"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`
                  px-3 py-2 text-sm font-medium border-l border-gray-300 rounded-r-lg transition-colors
                  ${viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                title="Listen-Ansicht"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Button - nur in Listenansicht */}
            {viewMode === 'list' && (
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`
                    px-3 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center whitespace-nowrap
                    ${(showActive && showArchived) || (!showActive && !showArchived)
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : showArchived
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-green-500 bg-green-50 text-green-700'
                    }
                  `}
                  title="Status-Filter"
                >
                  <FunnelIcon className="h-4 w-4" />
                  {(showActive && showArchived) && (
                    <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                      2
                    </span>
                  )}
                  {showArchived && !showActive && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      A
                    </span>
                  )}
                  {showActive && !showArchived && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      A
                    </span>
                  )}
                </button>

                {/* Filter Dropdown Menu */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status Filter
                      </p>
                    </div>
                    <div className="py-1">
                      <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showActive}
                          onChange={(e) => setShowActive(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                        />
                        <span>Aktiv</span>
                        {showActive && (
                          <CheckIcon className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </label>
                      <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showArchived}
                          onChange={(e) => setShowArchived(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                        />
                        <span>Archiv</span>
                        {showArchived && (
                          <CheckIcon className="h-4 w-4 text-blue-600 ml-auto" />
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Button onClick={() => setShowWizard(true)} className="flex items-center space-x-2">
              <PlusIcon className="w-4 h-4" />
              <span>Neues Projekt</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 text-center">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 inline-block">
            <h3 className="text-sm font-medium text-red-800 mb-2">Fehler beim Laden</h3>
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <button
              onClick={loadProjects}
              className="text-sm text-red-800 hover:text-red-900 underline"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Projekte werden geladen...</p>
          </div>
        </div>
      )}

      {/* Empty State - nur anzeigen wenn nicht in Kanban- oder List-Modus */}
      {!loading && !error && projects.length === 0 && viewMode !== 'board' && viewMode !== 'list' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Projekte</h3>
            <p className="text-gray-500 mb-6">
              Erstellen Sie Ihr erstes Projekt mit dem Projekt-Anlage-Wizard.
            </p>
            <Button onClick={() => setShowWizard(true)} className="flex items-center space-x-2">
              <RocketLaunchIcon className="w-4 h-4" />
              <span>Erstes Projekt erstellen</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table View */}
      {!loading && !error && viewMode === 'list' && (
        <div className="space-y-4">
          {/* Archiv Info-Banner wenn nur Archiv-Filter aktiv */}
          {showArchived && !showActive && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center">
                <FunnelIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Archivansicht aktiv
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Archivierte Projekte können über das 3-Punkte-Menü reaktiviert werden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              <div className="flex-1 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Projekt
              </div>
              <div className="w-32 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </div>
              <div className="w-40 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Projektphase
              </div>
              <div className="w-40 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Team
              </div>
              <div className="w-24 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Priorität
              </div>
              <div className="w-32 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Aktualisiert
              </div>
              <div className="w-12"></div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {projects.map((project) => {
              const projectPriority = (project as any).priority as string;
              
              return (
                <div key={project.id} className="px-8 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Projekt Title mit Kunde */}
                    <div className="flex-1 px-4 min-w-0">
                      <Link 
                        href={`/dashboard/projects/${project.id}`} 
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary block truncate"
                        title={project.title}
                      >
                        {project.title}
                      </Link>
                      {project.customer && (
                        <div className="flex items-center gap-2 mt-1">
                          <BuildingOfficeIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
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
                      <div className="text-sm text-zinc-900 dark:text-white">
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
                                  className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white"
                                  title={loadingTeam ? "Lädt Mitgliederdaten..." : "Unbekanntes Mitglied"}
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
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                                +{uniqueMembers.length - 3}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Kein Team</span>
                      )}
                    </div>

                    {/* Priorität */}
                    <div className="w-24 px-4">
                      {projectPriority ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          projectPriority === 'urgent' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                          projectPriority === 'high' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                          projectPriority === 'medium' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                          projectPriority === 'low' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                          'bg-gray-50 text-gray-700 ring-gray-600/20'
                        }`}>
                          {projectPriority === 'urgent' ? 'Dringend' :
                           projectPriority === 'high' ? 'Hoch' :
                           projectPriority === 'medium' ? 'Mittel' :
                           projectPriority === 'low' ? 'Niedrig' : '-'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </div>

                    {/* Aktualisiert */}
                    <div className="w-32 px-4">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDate(project.updatedAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="w-12 flex justify-end">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                          <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem href={`/dashboard/projects/${project.id}`}>
                            <EyeIcon className="h-4 w-4" />
                            Projekt anzeigen
                          </DropdownItem>
                          <DropdownItem onClick={() => handleEditProject(project)}>
                            <PencilIcon className="h-4 w-4" />
                            Bearbeiten
                          </DropdownItem>
                          <DropdownDivider />
                          {project.status === 'archived' ? (
                            <DropdownItem
                              onClick={async () => {
                                try {
                                  await projectService.unarchive(project.id!, {
                                    organizationId: currentOrganization.id,
                                    userId: user?.uid || ''
                                  });
                                  // React Query invalidiert automatisch
                                } catch (error) {
                                  console.error('Fehler beim Reaktivieren:', error);
                                }
                              }}
                            >
                              <ArchiveBoxIcon className="h-4 w-4" />
                              Reaktivieren
                            </DropdownItem>
                          ) : (
                            <DropdownItem
                              onClick={async () => {
                                try {
                                  await archiveProjectMutation.mutateAsync({
                                    projectId: project.id!,
                                    organizationId: currentOrganization.id,
                                    userId: user?.uid || ''
                                  });
                                } catch (error) {
                                  console.error('Fehler beim Archivieren:', error);
                                }
                              }}
                            >
                              <ArchiveBoxIcon className="h-4 w-4" />
                              Archivieren
                            </DropdownItem>
                          )}
                          <DropdownDivider />
                          <DropdownItem
                            onClick={async () => {
                              if (confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                                try {
                                  await deleteProjectMutation.mutateAsync({
                                    projectId: project.id!,
                                    organizationId: currentOrganization.id
                                  });
                                } catch (error) {
                                  console.error('Fehler beim Löschen:', error);
                                }
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="text-red-600">Löschen</span>
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
          )}
          
          {/* Empty State für Tabellenansicht */}
          {projects.length === 0 && showActive && !showArchived && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
              <RocketLaunchIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
              <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
                Keine aktiven Projekte
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Erstelle dein erstes Projekt oder aktiviere den Archiv-Filter.
              </p>
            </div>
          )}
          
          {projects.length === 0 && showArchived && !showActive && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
              <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
                Keine archivierten Projekte
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Archivierte Projekte werden hier angezeigt.
              </p>
            </div>
          )}
          
          {projects.length === 0 && (!showActive && !showArchived) && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
              <FunnelIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
              <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
                Keine Filter ausgewählt
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Wähle "Aktiv" oder "Archiv" im Filter-Menü aus.
              </p>
            </div>
          )}
          
          {projects.length === 0 && (showActive && showArchived) && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
              <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
                Keine Projekte vorhanden
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Erstelle dein erstes Projekt mit dem Wizard.
              </p>
            </div>
          )}
        </div>
      )}


      {/* Project Creation Wizard */}
      <ProjectCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={handleWizardSuccess}
        organizationId={currentOrganization.id}
      />

      {/* Project Edit Wizard */}
      {editingProject && (
        <ProjectEditWizard
          isOpen={showEditWizard}
          onClose={() => {
            setShowEditWizard(false);
            setEditingProject(null);
          }}
          onSuccess={handleEditSuccess}
          project={editingProject}
          organizationId={currentOrganization.id}
        />
      )}
    </>
  );
}