'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  RocketLaunchIcon,
  FolderIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon
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
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';
import { toastService } from '@/lib/utils/toast';
import NoActiveProjectsState from './components/empty-states/NoActiveProjectsState';
import NoArchivedProjectsState from './components/empty-states/NoArchivedProjectsState';
import NoFiltersSelectedState from './components/empty-states/NoFiltersSelectedState';
import NoProjectsAtAllState from './components/empty-states/NoProjectsAtAllState';
import ProjectTable from './components/tables/ProjectTable';

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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ NEU: Filter-Hook verwenden
  const {
    showActive,
    showArchived,
    filteredProjects,
    toggleActive,
    toggleArchived,
  } = useProjectFilters(allProjects, searchTerm);

  // Gefilterte Projekte aus Hook verwenden
  const projects = filteredProjects;

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
    toastService.success(`Projekt "${result.project.title}" erfolgreich erstellt`);
    // React Query invalidiert automatisch den Cache
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowEditWizard(true);
  };

  const handleEditSuccess = (updatedProject: Project) => {
    toastService.success(`Projekt "${updatedProject.title}" erfolgreich aktualisiert`);
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
      // Find current stage and project
      let currentStage: PipelineStage | null = null;
      let projectTitle = '';
      for (const project of projects) {
        if (project.id === projectId) {
          currentStage = project.currentStage;
          projectTitle = project.title;
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

      toastService.success(`Projekt "${projectTitle}" erfolgreich verschoben`);
    } catch (error: any) {
      toastService.error('Projekt konnte nicht verschoben werden');
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

  // Table Actions
  const handleArchive = async (projectId: string) => {
    if (!currentOrganization) return;
    await archiveProjectMutation.mutateAsync({
      projectId,
      organizationId: currentOrganization.id,
      userId: user?.uid || ''
    });
  };

  const handleUnarchive = async (projectId: string) => {
    if (!currentOrganization) return;
    await projectService.unarchive(projectId, {
      organizationId: currentOrganization.id,
      userId: user?.uid || ''
    });
  };

  const handleDelete = async (projectId: string) => {
    if (!currentOrganization) return;
    await deleteProjectMutation.mutateAsync({
      projectId,
      organizationId: currentOrganization.id
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
                <p className="text-sm text-red-700">{error}</p>
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-900">Projekte</h1>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Projekte durchsuchen..."
              className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 h-10"
            />
          </div>

          {/* Primary Action */}
          <Button
            onClick={() => setShowWizard(true)}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neues Projekt
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('board')}
              className={`p-2 rounded transition-colors ${viewMode === 'board' ? 'bg-white text-primary' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="Board-Ansicht"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-primary' : 'text-zinc-500 hover:text-zinc-700'}`}
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
                className={`px-3 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center whitespace-nowrap ${(showActive && showArchived) || (!showActive && !showArchived) ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-50' : showArchived ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-green-500 bg-green-50 text-green-700'}`}
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
                        onChange={(e) => toggleActive(e.target.checked)}
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
                        onChange={(e) => toggleArchived(e.target.checked)}
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
        </div>
      </div>

      {/* Error State */}
      {error && viewMode === 'list' && (
        <div className="p-6 text-center">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 inline-block">
            <h3 className="text-sm font-medium text-red-800 mb-2">Fehler beim Laden</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && viewMode === 'list' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-zinc-600">Projekte werden geladen...</p>
          </div>
        </div>
      )}

      {/* Results Info */}
      {!loading && !error && viewMode === 'list' && (
        <div className="mb-4 flex items-center justify-between">
          <Text className="text-sm text-zinc-600">
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
            {searchTerm && (
              <span className="ml-2">· gefiltert von {allProjects.length} gesamt</span>
            )}
          </Text>
        </div>
      )}

      {/* Table View */}
      {!loading && !error && viewMode === 'list' && (
        <div className="space-y-4">
          {/* Archiv Info-Banner wenn nur Archiv-Filter aktiv */}
          {showArchived && !showActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <FunnelIcon className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Archivansicht aktiv
                  </h3>
                  <p className="text-sm text-blue-700">
                    Archivierte Projekte können über das 3-Punkte-Menü reaktiviert werden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <ProjectTable
              projects={projects}
              teamMembers={teamMembers}
              loadingTeam={loadingTeam}
              currentOrganizationId={currentOrganization.id}
              userId={user?.uid || ''}
              onEdit={handleEditProject}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
            />
          )}
          
          {/* Empty State für Tabellenansicht */}
          {projects.length === 0 && showActive && !showArchived && <NoActiveProjectsState />}
          {projects.length === 0 && showArchived && !showActive && <NoArchivedProjectsState />}
          {projects.length === 0 && (!showActive && !showArchived) && <NoFiltersSelectedState />}
          {projects.length === 0 && (showActive && showArchived) && <NoProjectsAtAllState />}
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