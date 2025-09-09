'use client';

import React, { useState, useEffect } from 'react';
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
  TrashIcon
} from '@heroicons/react/24/outline';
import { ProjectCreationWizard } from '@/components/projects/creation/ProjectCreationWizard';
import { projectService } from '@/lib/firebase/project-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { Project, ProjectCreationResult, PipelineStage } from '@/types/project';
import { TeamMember } from '@/types/international';
import { BoardFilters, kanbanBoardService } from '@/lib/kanban/kanban-board-service';
import { KanbanBoard } from '@/components/projects/kanban/KanbanBoard';
import { BoardProvider } from '@/components/projects/kanban/BoardProvider';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
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
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [filters, setFilters] = useState<BoardFilters>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    loadProjects();
    loadTeamMembers();
  }, [currentOrganization?.id]);

  const loadProjects = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);
      const projectList = await projectService.getAll({
        organizationId: currentOrganization.id
      });
      setProjects(projectList);
    } catch (error: any) {
      console.error('Fehler beim Laden der Projekte:', error);
      setError('Projekte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

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
    
    // Neues Projekt direkt zum State hinzufügen (optimistische Update)
    if (result.project) {
      setProjects(prevProjects => [...prevProjects, result.project]);
    }
    
    // Projekte neu laden mit Verzögerung (für Firebase Konsistenz)
    setTimeout(() => {
      loadProjects();
    }, 1000);
    
    // Wizard schließen nach kurzer Verzögerung (für Success Animation)
    setTimeout(() => {
      setShowWizard(false);
    }, 2000);
  };

  // Group projects by pipeline stage for board view
  const groupProjectsByStage = (projectList: Project[]) => {
    const stages: PipelineStage[] = [
      'ideas_planning',
      'creation',
      'internal_approval',
      'customer_approval',
      'distribution',
      'monitoring',
      'completed'
    ];

    return stages.reduce((acc, stage) => {
      acc[stage] = projectList.filter(project => project.currentStage === stage);
      return acc;
    }, {} as Record<PipelineStage, Project[]>);
  };

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

      // Move project
      const result = await kanbanBoardService.moveProject(
        projectId,
        currentStage,
        targetStage,
        user.uid,
        currentOrganization.id
      );

      if (result.success) {
        // Refresh projects
        loadProjects();
      } else {
        console.error('Move failed:', result.errors);
      }
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
      case 'internal_approval': return 'Interne Freigabe';
      case 'customer_approval': return 'Kundenfreigabe';
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
            <BoardProvider organizationId={currentOrganization.id}>
              <KanbanBoard
                projects={groupProjectsByStage(projects)}
                totalProjects={projects.length}
                activeUsers={[]} // TODO: Get from real-time hook
                filters={filters}
                loading={loading}
                onProjectMove={handleProjectMove}
                onFiltersChange={handleFiltersChange}
                onRefresh={loadProjects}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onNewProject={() => setShowWizard(true)}
                onMoreOptions={() => console.log('More options')}
              />
            </BoardProvider>
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

      {/* Table View */}
      {!loading && !error && projects.length > 0 && viewMode === 'list' && (
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
                          {project.assignedTo.slice(0, 3).map((userId: string) => {
                            // Finde Team-Mitglied wie in Kanban-Ansicht
                            const memberByUserId = teamMembers.find(m => m.userId === userId);
                            const memberById = teamMembers.find(m => m.id === userId);
                            const member = memberByUserId || memberById;
                            
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
                          {project.assignedTo.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                              +{project.assignedTo.length - 3}
                            </div>
                          )}
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
                          <DropdownItem href={`/dashboard/projects/${project.id}/edit`}>
                            <PencilIcon className="h-4 w-4" />
                            Bearbeiten
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem 
                            onClick={async () => {
                              if (confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                                try {
                                  await projectService.delete(project.id!, {
                                    organizationId: currentOrganization.id
                                  });
                                  loadProjects();
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


      {/* Project Creation Wizard */}
      <ProjectCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={handleWizardSuccess}
        organizationId={currentOrganization.id}
      />
    </>
  );
}