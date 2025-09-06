'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  PencilSquareIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  CogIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

// Pipeline-Komponenten importieren
import PipelineProgressDashboard from '@/components/projects/workflow/PipelineProgressDashboard';
import MonitoringConfigPanel from '@/components/projects/monitoring/MonitoringConfigPanel';
import MonitoringStatusWidget from '@/components/projects/monitoring/MonitoringStatusWidget';
import ProjectAssetGallery from '@/components/projects/assets/ProjectAssetGallery';
import AssetPipelineStatus from '@/components/projects/assets/AssetPipelineStatus';
import WorkflowAutomationManager from '@/components/projects/workflow/WorkflowAutomationManager';
import TaskDependenciesVisualizer from '@/components/projects/workflow/TaskDependenciesVisualizer';
import { CommunicationModal } from '@/components/projects/communication/CommunicationModal';
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'assets' | 'communication' | 'monitoring'>('overview');
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId, currentOrganization?.id]);

  const loadProject = async () => {
    if (!projectId || !currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);
      const projectData = await projectService.getById(projectId, {
        organizationId: currentOrganization.id
      });
      
      if (projectData) {
        setProject(projectData);
      } else {
        setError('Projekt nicht gefunden');
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Projekts:', error);
      setError('Projekt konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
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
      case 'ideas_planning': return 'Ideen & Planung';
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

  // Handle Communication Feed
  const handleOpenCommunicationFeed = () => {
    setShowCommunicationModal(true);
  };

  const handleCloseCommunicationFeed = () => {
    setShowCommunicationModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Projekt wird geladen...</Text>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <DocumentTextIcon className="h-12 w-12 mx-auto" />
        </div>
        <Heading>{error || 'Projekt nicht gefunden'}</Heading>
        <div className="mt-6">
          <Link href="/dashboard/projects">
            <Button>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Zurück zur Projektübersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/projects">
              <Button plain className="p-2">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <Heading>{project.title}</Heading>
              <Text className="mt-1">{project.description || 'Keine Beschreibung verfügbar'}</Text>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge color={getProjectStatusColor(project.status)}>
              {getProjectStatusLabel(project.status)}
            </Badge>
            <Button>
              <PencilSquareIcon className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
            <Subheading>Projektdetails</Subheading>
          </div>
          
          <div className="space-y-4">
            <div>
              <Text className="text-sm font-medium text-gray-600">Aktuelle Phase</Text>
              <Text className="mt-1">{getCurrentStageLabel(project.currentStage)}</Text>
            </div>
            
            {project.customer && (
              <div>
                <Text className="text-sm font-medium text-gray-600">Kunde</Text>
                <div className="flex items-center mt-1">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <Text>{project.customer.name}</Text>
                </div>
              </div>
            )}
            
            <div>
              <Text className="text-sm font-medium text-gray-600">Erstellt am</Text>
              <div className="flex items-center mt-1">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-1" />
                <Text>{formatDate(project.createdAt)}</Text>
              </div>
            </div>

            {project.dueDate && (
              <div>
                <Text className="text-sm font-medium text-gray-600">Fälligkeitsdatum</Text>
                <div className="flex items-center mt-1">
                  <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <Text>{formatDate(project.dueDate)}</Text>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
            <Subheading>Team</Subheading>
          </div>
          
          <div className="space-y-4">
            {project.assignedTo && project.assignedTo.length > 0 ? (
              <div>
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  Zugewiesene Mitarbeiter ({project.assignedTo.length})
                </Text>
                <div className="space-y-2">
                  {project.assignedTo.slice(0, 3).map((memberId) => (
                    <div key={memberId} className="flex items-center">
                      <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
                      <Text className="text-sm">Team-Mitglied</Text>
                    </div>
                  ))}
                  {project.assignedTo.length > 3 && (
                    <Text className="text-sm text-gray-500">
                      +{project.assignedTo.length - 3} weitere
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Keine Team-Mitglieder zugewiesen</Text>
            )}
          </div>
        </div>

        {/* Wizard Info */}
        {project.creationContext?.createdViaWizard && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Squares2X2Icon className="h-5 w-5 text-gray-400 mr-2" />
              <Subheading>Wizard-Erstellung</Subheading>
            </div>
            
            <div className="space-y-4">
              <div>
                <Text className="text-sm font-medium text-gray-600">Template</Text>
                <Text className="mt-1">{project.creationContext.templateId}</Text>
              </div>
              
              <div>
                <Text className="text-sm font-medium text-gray-600">Wizard-Version</Text>
                <Text className="mt-1">{project.creationContext.wizardVersion}</Text>
              </div>
              
              {project.setupStatus && (
                <div>
                  <Text className="text-sm font-medium text-gray-600 mb-2">Setup-Status</Text>
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
          </div>
        )}
      </div>

      {/* Content Tabs - Vollständige Pipeline-Integration */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex space-x-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'overview' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Übersicht
              </button>
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'tasks' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                Tasks & Workflow
              </button>
              <button 
                onClick={() => setActiveTab('assets')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'assets' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                Assets & Medien
              </button>
              <button 
                onClick={() => setActiveTab('communication')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'communication' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Kommunikation
              </button>
              <button 
                onClick={() => setActiveTab('monitoring')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'monitoring' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Monitoring & Analytics
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Übersicht Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pipeline Progress Dashboard */}
              {project && (
                <PipelineProgressDashboard
                  projectId={project.id}
                  progress={{
                    overallPercent: 65,
                    stageProgress: {
                      'ideas_planning': 100,
                      'creation': 80,
                      'internal_approval': 60,
                      'customer_approval': 0,
                      'distribution': 0,
                      'monitoring': 0,
                      'completed': 0
                    },
                    taskCompletion: 12,
                    criticalTasksRemaining: 3,
                    lastUpdated: new Date(),
                    milestones: [
                      { percent: 25, achievedAt: new Date(), notificationSent: true },
                      { percent: 50, notificationSent: false }
                    ]
                  }}
                  currentStage={project.currentStage}
                />
              )}
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                  <CogIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Text className="font-medium">Workflow konfigurieren</Text>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                  <PhotoIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Text className="font-medium">Assets hinzufügen</Text>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                  <ChartBarIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Text className="font-medium">Analytics anzeigen</Text>
                </div>
              </div>
            </div>
          )}

          {/* Tasks & Workflow Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {project && (
                <>
                  {/* Task Dependencies Visualizer */}
                  <div>
                    <Subheading className="mb-4">Task-Abhängigkeiten</Subheading>
                    <TaskDependenciesVisualizer
                      projectId={project.id}
                      tasks={[]} // Mock empty array for now
                      onTaskUpdate={async (taskId, updates) => {
                        console.log('Task update:', taskId, updates);
                      }}
                    />
                  </div>
                  
                  {/* Workflow Automation Manager */}
                  <div className="border-t border-gray-200 pt-6">
                    <Subheading className="mb-4">Workflow-Automatisierung</Subheading>
                    <WorkflowAutomationManager
                      projectId={project.id}
                      currentConfig={{
                        autoStageTransition: true,
                        requireAllCriticalTasks: true,
                        enableTaskDependencies: true,
                        notifyOnStageTransition: true,
                        customTransitionRules: []
                      }}
                      availableUsers={[
                        { id: '1', name: 'Team Member 1', email: 'member1@example.com' },
                        { id: '2', name: 'Team Member 2', email: 'member2@example.com' }
                      ]}
                      onConfigUpdate={async (config) => {
                        console.log('Config updated:', config);
                      }}
                    />
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="border-t border-gray-200 pt-6 text-center">
                    <Subheading className="mb-4">Task-Verwaltung</Subheading>
                    <div className="flex justify-center space-x-4">
                      <Button outline onClick={() => console.log('Neue Task erstellen')}>
                        <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                        Neue Task
                      </Button>
                      <Button outline onClick={() => console.log('Workflow bearbeiten')}>
                        <CogIcon className="w-4 h-4 mr-2" />
                        Workflow bearbeiten
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Assets & Medien Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              {project && (
                <>
                  {/* Project Asset Gallery */}
                  <ProjectAssetGallery
                    projectId={project.id}
                    organizationId={currentOrganization?.id || ''}
                    currentStage={project.currentStage}
                  />
                  
                  {/* Asset Pipeline Status */}
                  <div className="border-t border-gray-200 pt-6">
                    <AssetPipelineStatus
                      project={project}
                      onValidationUpdate={(result) => console.log('Validation updated:', result)}
                    />
                  </div>
                  
                  {/* Actions */}
                  <div className="border-t border-gray-200 pt-6 text-center">
                    <Subheading className="mb-4">Asset-Verwaltung</Subheading>
                    <div className="flex justify-center space-x-4">
                      <Button outline onClick={() => console.log('Asset hinzufügen')}>
                        <PhotoIcon className="w-4 h-4 mr-2" />
                        Neue Assets hinzufügen
                      </Button>
                      <Button outline onClick={() => console.log('Asset-Bibliothek öffnen')}>
                        <FolderIcon className="w-4 h-4 mr-2" />
                        Asset-Bibliothek
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Kommunikation Tab */}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              <div className="text-center py-12 bg-blue-50 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <Subheading className="mb-2">Projekt-Kommunikation</Subheading>
                <Text className="text-gray-600 mb-4">
                  Hier werden alle projekt-bezogenen E-Mails und Kommunikation automatisch erkannt und zugeordnet.
                </Text>
                <Button outline onClick={handleOpenCommunicationFeed}>
                  <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                  Kommunikations-Feed öffnen
                </Button>
              </div>
            </div>
          )}

          {/* Monitoring & Analytics Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {project && (
                <>
                  {/* Monitoring Status Widget */}
                  <MonitoringStatusWidget
                    projectId={project.id}
                    currentStage={project.currentStage}
                    isEnabled={true}
                    stats={{
                      totalClippings: 47,
                      totalReach: 1250000,
                      averageSentiment: 0.78,
                      trending: 'up',
                      lastUpdated: new Date()
                    }}
                  />
                  
                  {/* Monitoring Config Panel */}
                  <div className="border-t border-gray-200 pt-6">
                    <MonitoringConfigPanel
                      projectId={project.id}
                      organizationId={currentOrganization?.id || ''}
                      currentConfig={{
                        isEnabled: true,
                        monitoringPeriod: 30,
                        autoTransition: true,
                        providers: [
                          {
                            name: 'landau',
                            apiEndpoint: '',
                            isEnabled: true,
                            supportedMetrics: ['reach', 'sentiment', 'mentions']
                          }
                        ],
                        alertThresholds: {
                          minReach: 10000,
                          sentimentAlert: 0.3,
                          competitorMentions: 5
                        },
                        reportSchedule: 'weekly'
                      }}
                      onConfigUpdate={(config) => console.log('Config updated:', config)}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Communication Modal */}
      {showCommunicationModal && (
        <CommunicationModal
          isOpen={showCommunicationModal}
          onClose={handleCloseCommunicationFeed}
          projectId={projectId}
          projectTitle={project.title}
        />
      )}
    </div>
  );
}