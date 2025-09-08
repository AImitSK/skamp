'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  FolderIcon,
  LightBulbIcon
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
import { strategyDocumentService, StrategyDocument } from '@/lib/firebase/strategy-document-service';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'assets' | 'communication' | 'monitoring' | 'planning'>('overview');
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [projectFolders, setProjectFolders] = useState<any>(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [strategyDocuments, setStrategyDocuments] = useState<StrategyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId, currentOrganization?.id]);

  // Lade Projekt-Ordnerstruktur und Dokumente wenn Planning-Tab aktiviert wird
  useEffect(() => {
    if (activeTab === 'planning' && project && currentOrganization?.id) {
      loadProjectFolders();
      loadStrategyDocuments();
    }
  }, [activeTab, project, currentOrganization?.id]);

  const loadStrategyDocuments = async () => {
    if (!project || !currentOrganization?.id) return;
    
    setDocumentsLoading(true);
    try {
      const documents = await strategyDocumentService.getByProjectId(project.id, {
        organizationId: currentOrganization.id
      });
      setStrategyDocuments(documents);
    } catch (error) {
      console.error('Fehler beim Laden der Strategiedokumente:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };


  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'yellow';
      case 'review': return 'blue';
      case 'approved': return 'green';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  const getDocumentStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'review': return 'In Prüfung';
      case 'approved': return 'Freigegeben';
      case 'archived': return 'Archiviert';
      default: return status;
    }
  };

  const loadProjectFolders = async () => {
    if (!project || !currentOrganization?.id) return;
    
    setFoldersLoading(true);
    try {
      const folderStructure = await projectService.getProjectFolderStructure(project.id, {
        organizationId: currentOrganization.id
      });
      setProjectFolders(folderStructure);
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Ordner:', error);
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleOpenFolder = (folderId: string) => {
    // Navigation zur Media Library mit spezifischem Ordner
    window.open(`/dashboard/pr-tools/media-library?folder=${folderId}`, '_blank');
  };

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

  const handleCreateDocument = async (templateType: string, title: string) => {
    if (!currentOrganization?.id || !user?.uid || !project?.id) return;

    try {
      setDocumentsLoading(true);
      
      // Template content basierend auf Typ
      let content = '';
      switch (templateType) {
        case 'briefing-template':
          content = `
            <h1>Projekt-Briefing</h1>
            <h2>Ausgangssituation</h2>
            <p>[Beschreibung der aktuellen Situation]</p>
            
            <h2>Ziele</h2>
            <ul>
              <li>Hauptziel</li>
              <li>Nebenziele</li>
            </ul>
            
            <h2>Zielgruppen</h2>
            <p>[Primäre und sekundäre Zielgruppen]</p>
            
            <h2>Kernbotschaften</h2>
            <p>[Hauptbotschaften]</p>
          `;
          break;
        case 'strategy-template':
          content = `
            <h1>Kommunikationsstrategie</h1>
            <h2>Strategische Ausrichtung</h2>
            <p>[Grundlegende Strategie]</p>
            
            <h2>Kanäle & Medien</h2>
            <ul>
              <li>Print-Medien</li>
              <li>Online-Medien</li>
              <li>Social Media</li>
            </ul>
            
            <h2>Timeline & Meilensteine</h2>
            <p>[Zeitplan]</p>
          `;
          break;
        case 'analysis-template':
          content = `
            <h1>Marktanalyse</h1>
            <h2>Marktumfeld</h2>
            <p>[Marktanalyse]</p>
            
            <h2>Wettbewerber</h2>
            <p>[Competitor-Analyse]</p>
            
            <h2>Chancen & Risiken</h2>
            <ul>
              <li>Chancen</li>
              <li>Risiken</li>
            </ul>
          `;
          break;
        default:
          content = '<p>Neues Strategiedokument</p>';
      }

      // Dokument erstellen
      const documentId = await strategyDocumentService.create({
        projectId: project.id,
        title,
        type: templateType.includes('briefing') ? 'briefing' : 
              templateType.includes('strategy') ? 'strategy' : 'analysis',
        content,
        status: 'draft',
        author: user.uid,
        version: 1,
        organizationId: currentOrganization.id
      });

      // Liste aktualisieren und zur Editor-Seite navigieren
      await loadStrategyDocuments();
      router.push(`/dashboard/strategy-documents/${documentId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen des Strategiedokuments:', error);
      alert('Fehler beim Erstellen des Dokuments. Bitte versuchen Sie es erneut.');
    } finally {
      setDocumentsLoading(false);
    }
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
            <Button onClick={() => router.push(`/dashboard/projects/${projectId}/edit`)}>
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
              <button 
                onClick={() => setActiveTab('planning')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'planning' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LightBulbIcon className="w-4 h-4 mr-2" />
                Planung & Strategie
                {project.currentStage === 'ideas_planning' && (
                  <Badge className="ml-2" color="green">Aktiv</Badge>
                )}
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

          {/* Planung & Strategie Tab */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              {/* Phase-Status Header */}
              <div className={`p-4 rounded-lg border ${
                project.currentStage === 'ideas_planning' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Subheading className="text-gray-900">
                      {project.currentStage === 'ideas_planning' 
                        ? 'Aktive Planungsphase' 
                        : 'Planungsphase abgeschlossen'
                      }
                    </Subheading>
                    <Text className="text-gray-600 mt-1">
                      {project.currentStage === 'ideas_planning' 
                        ? 'Das Projekt befindet sich derzeit in der Ideen- und Planungsphase. Alle Bereiche können bearbeitet werden.'
                        : 'Die Planungsphase ist abgeschlossen. Dokumente können nur eingesehen werden.'
                      }
                    </Text>
                  </div>
                  <Badge color={project.currentStage === 'ideas_planning' ? 'green' : 'gray'}>
                    {project.currentStage === 'ideas_planning' ? 'Bearbeitbar' : 'Nur Lesen'}
                  </Badge>
                </div>
              </div>
              
              {/* 4 Hauptbereiche */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategiedokumente */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <Subheading>Strategiedokumente</Subheading>
                    {documentsLoading && (
                      <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    )}
                  </div>
                  <Text className="text-gray-600 mb-4">
                    Erstellen und verwalten Sie Projektbriefings, Strategiepapiere und Analysedokumente.
                  </Text>
                  
                  {strategyDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {strategyDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <DocumentTextIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <Text className="text-sm font-medium text-gray-900 truncate">
                                  {doc.title}
                                </Text>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Text className="text-xs text-gray-500">
                                    {doc.type === 'briefing' ? 'Briefing' :
                                     doc.type === 'strategy' ? 'Strategie' :
                                     doc.type === 'analysis' ? 'Analyse' : 'Notizen'}
                                  </Text>
                                  <span className="text-gray-300">•</span>
                                  <Text className="text-xs text-gray-500">
                                    v{doc.version} von {doc.authorName}
                                  </Text>
                                  <span className="text-gray-300">•</span>
                                  <Text className="text-xs text-gray-500">
                                    {doc.updatedAt.toDate().toLocaleDateString('de-DE')}
                                  </Text>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge color={getDocumentStatusColor(doc.status)}>
                              {getDocumentStatusLabel(doc.status)}
                            </Badge>
                            <Button
                              size="sm"
                              outline
                              onClick={() => router.push(`/dashboard/strategy-documents/${doc.id}`)}
                            >
                              {project.currentStage === 'ideas_planning' ? 'Bearbeiten' : 'Ansehen'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <DocumentTextIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <Text className="text-sm text-gray-500 mb-1">
                        Noch keine Strategiedokumente erstellt
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Beginnen Sie mit einem Briefing oder einer Strategieanalyse
                      </Text>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button 
                      outline 
                      disabled={project.currentStage !== 'ideas_planning' || documentsLoading}
                      className="w-full"
                      onClick={() => handleCreateDocument('briefing-template', `${project.title} - Briefing`)}
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Neues Dokument erstellen
                    </Button>
                  </div>
                  
                  {/* Quick Templates */}
                  {project.currentStage === 'ideas_planning' && strategyDocuments.length === 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Text className="text-xs text-gray-600 mb-2">Schnellstart:</Text>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCreateDocument('briefing-template', 'Projekt-Briefing')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          disabled={documentsLoading}
                        >
                          Briefing
                        </button>
                        <button
                          onClick={() => handleCreateDocument('strategy-template', 'Kommunikationsstrategie')}
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          disabled={documentsLoading}
                        >
                          Strategie
                        </button>
                        <button
                          onClick={() => handleCreateDocument('analysis-template', 'Marktanalyse')}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          disabled={documentsLoading}
                        >
                          Analyse
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Projekt-Ordner */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <FolderIcon className="h-5 w-5 text-purple-500 mr-2" />
                    <Subheading>Projekt-Ordner</Subheading>
                    {foldersLoading && (
                      <div className="ml-2 animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    )}
                  </div>
                  <Text className="text-gray-600 mb-4">
                    Organisierte Ordnerstruktur für alle projektbezogenen Dateien und Assets.
                  </Text>
                  
                  {projectFolders ? (
                    <div className="space-y-3">
                      {/* Hauptordner */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FolderIcon className="h-5 w-5 text-purple-600 mr-2" />
                            <div>
                              <Text className="text-sm font-medium text-purple-900">
                                {projectFolders.mainFolder?.name || 'Hauptordner'}
                              </Text>
                              <Text className="text-xs text-purple-600">
                                {projectFolders.statistics.totalFiles} Dateien gesamt
                              </Text>
                            </div>
                          </div>
                          <Button
                            outline
                            size="sm"
                            onClick={() => handleOpenFolder(projectFolders.mainFolder?.id)}
                          >
                            Öffnen
                          </Button>
                        </div>
                      </div>
                      
                      {/* Unterordner */}
                      <div className="space-y-2">
                        {projectFolders.subfolders.map((folder: any, index: number) => {
                          const fileCount = projectFolders.statistics.folderSizes[folder.id] || 0;
                          const colors = [
                            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                            { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
                            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' },
                            { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: 'text-yellow-600' },
                            { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' }
                          ];
                          const color = colors[index % colors.length];
                          
                          return (
                            <div key={folder.id} className={`${color.bg} ${color.border} border rounded-lg p-2`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <FolderIcon className={`h-4 w-4 ${color.icon} mr-2`} />
                                  <div>
                                    <Text className={`text-sm font-medium ${color.text}`}>
                                      {folder.name}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                      {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
                                    </Text>
                                  </div>
                                </div>
                                <Button
                                  outline
                                  size="sm"
                                  onClick={() => handleOpenFolder(folder.id)}
                                >
                                  <FolderIcon className="w-3 h-3 mr-1" />
                                  Öffnen
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Statistiken */}
                      {projectFolders.statistics.lastActivity && (
                        <div className="text-xs text-gray-500 mt-3">
                          Letzte Aktivität: {projectFolders.statistics.lastActivity.toDate().toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Fallback für Projekte ohne automatische Ordnerstruktur
                    <div className="space-y-2">
                      <div className="text-center py-4">
                        <FolderIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <Text className="text-sm text-gray-500">
                          Keine automatische Ordnerstruktur gefunden
                        </Text>
                        <Text className="text-xs text-gray-400">
                          Nur neue Projekte haben automatische Ordner
                        </Text>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button
                      outline
                      className="w-full"
                      onClick={() => window.open('/dashboard/pr-tools/media-library', '_blank')}
                    >
                      <FolderIcon className="w-4 h-4 mr-2" />
                      Media-Bibliothek öffnen
                    </Button>
                  </div>
                </div>

                {/* Team-Kommunikation */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500 mr-2" />
                    <Subheading>Team-Kommunikation</Subheading>
                  </div>
                  <Text className="text-gray-600 mb-4">
                    Projektspezifische Kommunikation mit @-Mentions und Datei-Upload.
                  </Text>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Text className="text-xs font-medium text-blue-600">MB</Text>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Text className="text-sm font-medium">Maria Bauer</Text>
                        <Text className="text-xs text-gray-500">vor 2 Stunden</Text>
                        <Text className="text-sm text-gray-700 mt-1">
                          Kann das Briefing bis morgen finalisiert werden?
                        </Text>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      outline 
                      className="w-full"
                      onClick={handleOpenCommunicationFeed}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                      Chat öffnen
                    </Button>
                  </div>
                </div>

                {/* Planungs-Checkliste */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-orange-500 mr-2" />
                    <Subheading>Planungs-Checkliste</Subheading>
                  </div>
                  <Text className="text-gray-600 mb-4">
                    Standard-Aufgaben für eine vollständige Projektplanung.
                  </Text>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" checked className="rounded text-green-600" />
                      <Text className="text-sm">Projekt-Briefing erstellt</Text>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded text-green-600" />
                      <Text className="text-sm">Zielgruppen definiert</Text>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded text-green-600" />
                      <Text className="text-sm">Budget und Timeline festgelegt</Text>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded text-green-600" />
                      <Text className="text-sm">Team-Rollen zugewiesen</Text>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded text-green-600" />
                      <Text className="text-sm">Strategiedokument finalisiert</Text>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      outline 
                      disabled={project.currentStage !== 'ideas_planning'}
                      className="w-full"
                    >
                      <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                      Checkliste verwalten
                    </Button>
                  </div>
                </div>
              </div>
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