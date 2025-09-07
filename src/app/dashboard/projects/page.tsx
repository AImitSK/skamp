'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon,
  RocketLaunchIcon,
  EllipsisVerticalIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  FolderIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';
import { ProjectCreationWizard } from '@/components/projects/creation/ProjectCreationWizard';
import { projectService } from '@/lib/firebase/project-service';
import { Project, ProjectCreationResult, PipelineStage } from '@/types/project';
import { BoardFilters, kanbanBoardService } from '@/lib/kanban/kanban-board-service';
import { KanbanBoard } from '@/components/projects/kanban/KanbanBoard';
import { BoardProvider } from '@/components/projects/kanban/BoardProvider';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
import Link from 'next/link';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [filters, setFilters] = useState<BoardFilters>({});

  useEffect(() => {
    loadProjects();
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

  return (
    <div className="flex flex-col">
      {/* Header Section - stays in container */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Projekte</Heading>
            <Text className="mt-2">
              Verwalten Sie Ihre PR-Projekte und Kampagnen zentral
            </Text>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => handleViewModeChange('board')}
                className={`
                  px-3 py-2 text-sm font-medium rounded-l-lg transition-colors
                  ${viewMode === 'board'
                    ? 'bg-blue-500 text-white'
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
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                title="Listen-Ansicht"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>

            <Button 
              onClick={() => setShowWizard(true)}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Neues Projekt</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Fehler beim Laden
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={loadProjects}
                  className="text-sm text-red-800 hover:text-red-900 underline"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <Text className="ml-3">Projekte werden geladen...</Text>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Projekte</h3>
          <p className="mt-1 text-sm text-gray-500">
            Erstellen Sie Ihr erstes Projekt mit dem Projekt-Anlage-Wizard.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowWizard(true)} className="flex items-center space-x-2">
              <RocketLaunchIcon className="w-4 h-4" />
              <span>Erstes Projekt erstellen</span>
            </Button>
          </div>
        </div>
      )}
    </div>

    {/* Board View - breaks out of container for full width */}
    {!loading && !error && projects.length > 0 && viewMode === 'board' && currentOrganization && (
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[70vh] px-4">
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
          />
        </BoardProvider>
      </div>
    )}

    <div>

      {/* List View (existing Projects Grid) */}
      {!loading && !error && projects.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Project Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <EllipsisVerticalIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Project Meta */}
                <div className="mt-4 flex items-center justify-between">
                  <Badge color={getProjectStatusColor(project.status)}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                  
                  <div className="text-xs text-gray-500">
                    {getCurrentStageLabel(project.currentStage)}
                  </div>
                </div>

                {/* Customer */}
                {project.customer && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">Kunde:</span> {project.customer.name}
                  </div>
                )}

                {/* Dates */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="w-3 h-3 mr-1" />
                    Erstellt: {formatDate(project.createdAt)}
                  </div>
                  
                  {project.dueDate && (
                    <div>
                      Fällig: {formatDate(project.dueDate)}
                    </div>
                  )}
                </div>

                {/* Team */}
                {project.assignedTo && project.assignedTo.length > 0 && (
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <UserGroupIcon className="w-3 h-3 mr-1" />
                    {project.assignedTo.length} Team-Mitglied{project.assignedTo.length > 1 ? 'er' : ''}
                  </div>
                )}

                {/* Wizard Creation Context */}
                {project.creationContext?.createdViaWizard && (
                  <div className="mt-3 flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <RocketLaunchIcon className="w-3 h-3 mr-1" />
                    Erstellt mit Wizard
                    {project.creationContext.templateName && (
                      <span className="ml-2 text-blue-500">
                        ({project.creationContext.templateName})
                      </span>
                    )}
                  </div>
                )}

                {/* Setup Status für Wizard-erstellte Projekte */}
                {project.setupStatus && (
                  <div className="mt-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {project.setupStatus.campaignLinked && (
                        <Badge color="green" className="text-xs">Kampagne</Badge>
                      )}
                      {project.setupStatus.assetsAttached && (
                        <Badge color="blue" className="text-xs">Assets</Badge>
                      )}
                      {project.setupStatus.tasksCreated && (
                        <Badge color="purple" className="text-xs">Tasks</Badge>
                      )}
                      {project.setupStatus.teamNotified && (
                        <Badge color="orange" className="text-xs">Team benachrichtigt</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Project Actions */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Details anzeigen
                    </button>
                  </Link>
                  
                  <div className="text-xs text-gray-500">
                    Aktualisiert: {formatDate(project.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Project Creation Wizard */}
      <ProjectCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={handleWizardSuccess}
        organizationId={currentOrganization.id}
      />
    </div>
  );
}