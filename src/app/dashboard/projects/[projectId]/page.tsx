'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  CogIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  LightBulbIcon,
  EyeIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';

// Pipeline-Komponenten importieren
import PipelineProgressDashboard from '@/components/projects/workflow/PipelineProgressDashboard';
import MonitoringConfigPanel from '@/components/projects/monitoring/MonitoringConfigPanel';
import MonitoringStatusWidget from '@/components/projects/monitoring/MonitoringStatusWidget';
import ProjectAssetGallery from '@/components/projects/assets/ProjectAssetGallery';
import AssetPipelineStatus from '@/components/projects/assets/AssetPipelineStatus';
import WorkflowAutomationManager from '@/components/projects/workflow/WorkflowAutomationManager';
import TaskDependenciesVisualizer from '@/components/projects/workflow/TaskDependenciesVisualizer';
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';
import { TeamChat } from '@/components/projects/communication/TeamChat';
import { FloatingChat } from '@/components/projects/communication/FloatingChat';
import { projectService } from '@/lib/firebase/project-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';
import { strategyDocumentService, StrategyDocument } from '@/lib/firebase/strategy-document-service';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import { tagsService } from '@/lib/firebase/tags-service';
import { Tag } from '@/types/crm';
import { approvalService } from '@/lib/firebase/approval-service';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { ApprovalHistoryModal } from '@/components/campaigns/ApprovalHistoryModal';
import { ApprovalEnhanced } from '@/types/approvals';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { TeamManagementModal } from '@/components/projects/TeamManagementModal';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  // Alle React Hooks müssen vor bedingten Returns stehen
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'daten' | 'tasks' | 'teamchat' | 'monitoring'>('overview');
  const [projectFolders, setProjectFolders] = useState<any>(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [strategyDocuments, setStrategyDocuments] = useState<StrategyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [linkedCampaigns, setLinkedCampaigns] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalEnhanced | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPdfErrorDialog, setShowPdfErrorDialog] = useState(false);
  const [showFeedbackErrorDialog, setShowFeedbackErrorDialog] = useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState('');
  const [showDocumentErrorDialog, setShowDocumentErrorDialog] = useState(false);
  const [showDeleteErrorDialog, setShowDeleteErrorDialog] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  useEffect(() => {
    loadProject();
    loadTeamMembers();
    loadTags();
  }, [projectId, currentOrganization?.id]);

  // Lade spezifische Tags für das Projekt
  useEffect(() => {
    const loadProjectTags = async () => {
      if (project?.tags && project.tags.length > 0) {
        try {
          // Versuche zuerst die Tags direkt über ihre IDs zu laden
          const directTags = await tagsService.getByIds(project.tags);
          setProjectTags(directTags);
          console.log('Direkt geladene Tags:', directTags);
        } catch (error) {
          console.error('Fehler beim direkten Laden der Tags:', error);
        }
      }
    };
    
    loadProjectTags();
  }, [project?.tags]);

  // Lade Projekt-Ordnerstruktur und Dokumente wenn Daten-Tab aktiviert wird
  useEffect(() => {
    if (activeTab === 'daten' && project && currentOrganization?.id) {
      loadProjectFolders();
      loadStrategyDocuments();
    }
  }, [activeTab, project, currentOrganization?.id]);

  // Bedingte Rückgabe nach allen Hooks
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text className="text-red-600">Projekt-ID nicht gefunden</Text>
      </div>
    );
  }

  const loadStrategyDocuments = async () => {
    if (!project?.id || !currentOrganization?.id) return;
    
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
      case 'archived': return 'zinc';
      default: return 'zinc';
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
    if (!project?.id || !currentOrganization?.id) return;
    
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
        
        // Lade verknüpfte Kampagnen
        if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
          try {
            const campaigns = await Promise.all(
              projectData.linkedCampaigns.map(async (campaignId) => {
                try {
                  // Hier müsste der PR-Service importiert werden
                  // const campaign = await prService.getById(campaignId);
                  // Vorerst Dummy-Daten für die erste verknüpfte Kampagne
                  return {
                    id: campaignId,
                    title: `${projectData.title} - PR-Kampagne`,
                    status: 'in_review',
                    progress: 75,
                    approvalRequired: true // Default: Freigabe erforderlich
                  };
                } catch (error) {
                  console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
                  return null;
                }
              })
            );
            setLinkedCampaigns(campaigns.filter(Boolean));

            // Lade PDF-Version für die erste Kampagne
            if (campaigns.length > 0 && campaigns[0]) {
              try {
                const pdfVersion = await pdfVersionsService.getCurrentVersion(campaigns[0].id);
                setCurrentPdfVersion(pdfVersion);
              } catch (error) {
                console.error('Fehler beim Laden der PDF-Version:', error);
                // PDF-Fehler ist nicht kritisch - setze einfach null
                setCurrentPdfVersion(null);
              }
            }
          } catch (error) {
            console.error('Fehler beim Laden der verknüpften Kampagnen:', error);
          }
        }
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

  const loadTags = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoadingTags(true);
      // Fallback auf user.uid für Rückwärtskompatibilität mit alten Tags
      const allTags = await tagsService.getAll(currentOrganization.id, user?.uid);
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };


  const handleEditSuccess = (updatedProject: Project) => {
    setProject(updatedProject);
    // Reload for consistency
    setTimeout(() => {
      loadProject();
    }, 500);
  };

  const handleOpenPDF = () => {
    if (currentPdfVersion?.downloadUrl) {
      window.open(currentPdfVersion.downloadUrl, '_blank');
    } else {
      setShowPdfErrorDialog(true);
    }
  };

  const handleViewFeedback = async () => {
    if (!linkedCampaigns.length || !currentOrganization?.id) return;

    try {
      // Lade alle Approvals und filtere nach campaignId
      const allApprovals = await approvalService.getAll(currentOrganization.id);

      // Finde die Freigabe für diese spezifische Kampagne
      const campaignApproval = allApprovals.find(a => a.campaignId === linkedCampaigns[0].id);

      if (campaignApproval && campaignApproval.id) {
        const fullApproval = await approvalService.getById(campaignApproval.id, currentOrganization.id);
        if (fullApproval) {
          setSelectedApproval(fullApproval);
          setShowFeedbackModal(true);
        } else {
          setFeedbackErrorMessage('Keine Freigabe-Daten für diese Kampagne vorhanden.');
          setShowFeedbackErrorDialog(true);
        }
      } else {
        setFeedbackErrorMessage('Keine Freigabe-Daten für diese Kampagne vorhanden.');
        setShowFeedbackErrorDialog(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Feedback-Historie:', error);
      setFeedbackErrorMessage('Fehler beim Laden der Feedback-Historie.');
      setShowFeedbackErrorDialog(true);
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

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'planning': return 'Planung';
      case 'content_creation': return 'Content-Erstellung';
      case 'internal_review': return 'Interne Prüfung';
      case 'customer_approval': return 'Kundenfreigabe';
      case 'distribution': return 'Verteilung';
      case 'monitoring': return 'Monitoring';
      case 'completed': return 'Abgeschlossen';
      default: return stage;
    }
  };

  const formatProjectDate = (date: any): string => {
    try {
      if (!date) return '-';

      // Firestore Timestamp mit toDate Methode
      if (date && typeof date === 'object' && date.toDate) {
        return formatDate(date.toDate());
      }

      // Firestore Timestamp mit seconds/nanoseconds
      if (date && typeof date === 'object' && date.seconds) {
        return formatDate(new Date(date.seconds * 1000));
      }

      // Bereits ein Date-Objekt
      if (date instanceof Date) {
        return formatDate(date);
      }

      // String-Datum
      if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return formatDate(parsed);
        }
      }

      return '-';
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
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
    if (!timestamp) return 'Unbekannt';
    try {
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      // Handle regular Date or string
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Ungültiges Datum';
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Datumsformatfehler';
    }
  };


  const handleDeleteProject = () => {
    if (!project?.id || !currentOrganization?.id) return;
    setShowDeleteDialog(true);
  };

  const confirmDeleteProject = async () => {
    if (!project?.id || !currentOrganization?.id) return;

    try {
      await projectService.delete(project.id, { organizationId: currentOrganization.id });
      setShowDeleteDialog(false);
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      setDeleteErrorMessage(error.message || 'Unbekannter Fehler beim Löschen des Projekts');
      setShowDeleteDialog(false);
      setShowDeleteErrorDialog(true);
    }
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
        type: templateType.includes('briefing') ? 'briefing' as const : 
              templateType.includes('strategy') ? 'strategy' as const : 'analysis' as const,
        content,
        status: 'draft' as const,
        author: user.uid,
        authorName: user.displayName || user.email || 'Unbekannter Autor',
        organizationId: currentOrganization.id
      }, {
        organizationId: currentOrganization.id,
        userId: user.uid
      });

      // Liste aktualisieren und zur Editor-Seite navigieren
      await loadStrategyDocuments();
      router.push(`/dashboard/strategy-documents/${documentId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen des Strategiedokuments:', error);
      setShowDocumentErrorDialog(true);
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
      {/* Kompakter Header mit allen Projektinfos */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 -mx-8 -mt-8 px-8 pt-6 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Link href="/dashboard/projects">
              <Button plain className="p-2 mt-1">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              {/* Titel und Status in einer Zeile */}
              <div className="flex items-center gap-3 mb-2">
                <Heading className="!text-2xl">{project.title}</Heading>
                <Badge color={getProjectStatusColor(project.status)}>
                  {getProjectStatusLabel(project.status)}
                </Badge>
              </div>

              {/* Kompakte Info-Zeile */}
              <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                {/* Aktuelle Phase */}
                <div className="flex items-center gap-1.5">
                  <Squares2X2Icon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Phase:</span>
                  <span className="text-gray-900">{getStageLabel(project.currentStage)}</span>
                </div>

                {/* Kunde */}
                {project.client && (
                  <div className="flex items-center gap-1.5">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Kunde:</span>
                    <span className="text-gray-900">{project.client}</span>
                  </div>
                )}

                {/* Priorität */}
                <div className="flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Priorität:</span>
                  <Badge
                    color={project.priority === 'high' ? 'red' : project.priority === 'medium' ? 'yellow' : 'zinc'}
                    className="!py-0.5 !text-xs"
                  >
                    {project.priority === 'high' ? 'Hoch' : project.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                  </Badge>
                </div>

                {/* Deadline wenn vorhanden */}
                {project.deadline && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Deadline:</span>
                    <span className="text-gray-900">
                      {new Date(project.deadline).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {/* Team-Größe */}
                {project.assignedTo && project.assignedTo.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Team:</span>
                    <span className="text-gray-900">{project.assignedTo.length} Mitglieder</span>
                  </div>
                )}
              </div>

              {/* Tags wenn vorhanden */}
              {projectTags.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {projectTags.slice(0, 5).map(tag => (
                    <Badge
                      key={tag.id}
                      color={tag.color || 'zinc'}
                      className="!py-0.5 !text-xs"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {projectTags.length > 5 && (
                    <span className="text-xs text-gray-500">+{projectTags.length - 5} weitere</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowEditWizard(true)} outline className="!py-1.5">
              <PencilSquareIcon className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Bearbeiten</span>
            </Button>

            {/* Mehr-Optionen Dropdown */}
            <Dropdown>
              <DropdownButton outline className="!py-1.5 !px-2">
                <EllipsisVerticalIcon className="w-5 h-5" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={() => setShowTeamModal(true)}>
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Team verwalten
                </DropdownItem>
                <DropdownItem onClick={() => router.push(`/dashboard/strategy-documents?projectId=${projectId}`)}>
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  Dokumente
                </DropdownItem>
                <DropdownItem onClick={handleDeleteProject} className="text-red-600">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Projekt löschen
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Tabs Box */}
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
                onClick={() => setActiveTab('daten')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'daten'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LightBulbIcon className="w-4 h-4 mr-2" />
                Daten
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
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('teamchat')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'teamchat'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Team-Chat
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
                Analytics
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
                  projectId={project?.id || ''}
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

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Project Task Manager */}
              {project && teamMembers.length > 0 && (
                <ProjectTaskManager
                  projectId={project.id!}
                  organizationId={currentOrganization!.id}
                  projectManagerId={project.managerId || currentOrganization!.ownerId}
                  teamMembers={teamMembers}
                  projectTeamMemberIds={project.assignedTo}
                  projectTitle={project.title}
                />
              )}

            </div>
          )}


          {/* Team-Chat Tab */}
          {activeTab === 'teamchat' && project && currentOrganization && (
            <TeamChat
              projectId={project.id!}
              projectTitle={project.title}
              organizationId={currentOrganization.id}
              userId={user?.uid || ''}
              userDisplayName={user?.displayName || 'Unbekannter User'}
            />
          )}

          {/* Monitoring & Analytics Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {project && (
                <>
                  {/* Monitoring Status Widget */}
                  <MonitoringStatusWidget
                    projectId={project?.id || ''}
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
                      projectId={project?.id || ''}
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

          {/* Daten & Strategie Tab */}
          {activeTab === 'daten' && (
            <div className="space-y-6">
              {/* Projekt-Ordner */}
              <ProjectFoldersView
                projectId={project.id!}
                organizationId={currentOrganization.id}
                projectFolders={projectFolders}
                foldersLoading={foldersLoading}
                onRefresh={loadProjectFolders}
                clientId={project.customer?.id || ''}
              />
            </div>
          )}
        </div>
      </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="lg:col-span-1 space-y-6">
          {/* Enhanced Project Info Box */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="space-y-0">
              {/* Projektdetails Section */}
              <div>
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <Subheading>Projektdetails</Subheading>
                  </div>
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => setShowEditWizard(true)}>
                        <PencilSquareIcon className="h-4 w-4" />
                        Projekt bearbeiten
                      </DropdownItem>
                      <DropdownItem onClick={() => handleDeleteProject()}>
                        <TrashIcon className="h-4 w-4" />
                        Projekt löschen
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <div className="space-y-3 px-6 py-4">
                  <div>
                    <Text className="text-sm font-medium text-gray-600">Aktuelle Phase</Text>
                    <div className="flex items-center mt-1">
                      <ArrowPathIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-base text-gray-900">{getCurrentStageLabel(project.currentStage)}</span>
                    </div>
                  </div>
                  
                  {project.customer && (
                    <div>
                      <Text className="text-sm font-medium text-gray-600">Kunde</Text>
                      <div className="flex items-center mt-1">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <button
                          className="text-blue-600 hover:text-blue-700 hover:underline text-left text-base"
                          onClick={() => router.push(`/dashboard/contacts/crm/companies/${project.customer?.id}`)}
                          title="Kunde anzeigen"
                        >
                          {project.customer.name}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Text className="text-sm font-medium text-gray-600">Erstellt am</Text>
                    <div className="flex items-center mt-1">
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-base text-gray-900">{formatProjectDate(project.createdAt)}</span>
                    </div>
                  </div>

                  <div>
                    <Text className="text-sm font-medium text-gray-600">Priorität</Text>
                    <div className="mt-1">
                      {(() => {
                        console.log('Debug - Priorität:', project.priority, typeof project.priority);
                        return project.priority;
                      })() ? (
                        <Badge color={
                          project.priority === 'urgent' ? 'red' :
                          project.priority === 'high' ? 'red' :
                          project.priority === 'medium' ? 'yellow' :
                          project.priority === 'low' ? 'green' : 'gray'
                        }>
                          {project.priority === 'urgent' ? 'Dringend' :
                           project.priority === 'high' ? 'Hoch' :
                           project.priority === 'medium' ? 'Mittel' :
                           project.priority === 'low' ? 'Niedrig' :
                           project.priority}
                        </Badge>
                      ) : (
                        <span className="text-base text-gray-500">-</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text className="text-sm font-medium text-gray-600">Tags</Text>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {console.log('Debug - Project tags:', project.tags)}
                      {console.log('Debug - All organization tags:', tags)}
                      {console.log('Debug - Direct loaded project tags:', projectTags)}
                      {console.log('Debug - Current Organization:', currentOrganization?.id)}
                      {project.tags && project.tags.length > 0 ? (
                        project.tags.map((tagId, index) => {
                          // Zuerst in direkt geladenen Projekt-Tags suchen
                          let tagInfo = projectTags.find(t => t.id === tagId);
                          // Falls nicht gefunden, in allen Organisation-Tags suchen
                          if (!tagInfo) {
                            tagInfo = tags.find(t => t.id === tagId);
                          }
                          console.log(`Debug - Looking for tag ${tagId}, found:`, tagInfo);
                          return (
                            <Badge key={tagId} color={tagInfo?.color || (index % 2 === 0 ? 'blue' : 'purple')}>
                              {tagInfo?.name || tagId}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-base text-gray-500">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pressemeldung Section - Nur anzeigen wenn Kampagne verknüpft */}
              {linkedCampaigns.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <Subheading>Pressemeldung</Subheading>
                    </div>
                    <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => {
                        if (linkedCampaigns.length > 0) {
                          router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${linkedCampaigns[0].id}`);
                        }
                      }}>
                        <PencilSquareIcon className="h-4 w-4" />
                        Bearbeiten
                      </DropdownItem>
                      <DropdownItem onClick={() => {
                        if (linkedCampaigns.length > 0) {
                          router.push(`/dashboard/pr-tools/approvals?campaignId=${linkedCampaigns[0].id}`);
                        }
                      }}>
                        <EyeIcon className="h-4 w-4" />
                        Freigabecenter
                      </DropdownItem>
                      <DropdownItem
                        onClick={handleOpenPDF}
                        disabled={!currentPdfVersion || !linkedCampaigns[0]?.approvalRequired}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {!linkedCampaigns[0]?.approvalRequired ? 'Keine Kundenfreigabe erforderlich' :
                         currentPdfVersion ? `Aktuelles PDF (V${currentPdfVersion.version})` : 'Kein PDF vorhanden'}
                      </DropdownItem>
                      <DropdownItem
                        onClick={handleViewFeedback}
                        disabled={linkedCampaigns.length === 0 || !linkedCampaigns[0]?.approvalRequired}
                      >
                        <ClockIcon className="h-4 w-4" />
                        {!linkedCampaigns[0]?.approvalRequired ? 'Keine Kundenfreigabe erforderlich' : 'Feedback Historie'}
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <div className="space-y-3 px-6 py-4">
                  <div>
                    <Text className="text-sm font-medium text-gray-600">PR-Kampagne</Text>
                    <div className="mt-1">
                      {linkedCampaigns.length > 0 ? (
                        <button
                          className="flex items-center text-base text-blue-600 hover:text-blue-700 hover:underline max-w-full"
                          onClick={() => router.push(`/dashboard/pr-tools/campaigns/campaigns/${linkedCampaigns[0].id}`)}
                          title={linkedCampaigns[0].title}
                        >
                          <PaperAirplaneIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="truncate">{linkedCampaigns[0].title}</span>
                        </button>
                      ) : (
                        <span className="text-base text-gray-500">-</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text className="text-sm font-medium text-gray-600">Status</Text>
                    <div className="mt-1">
                      {linkedCampaigns.length > 0 ? (
                        <Badge color={
                          linkedCampaigns[0].status === 'approved' ? 'green' :
                          linkedCampaigns[0].status === 'in_review' ? 'blue' :
                          linkedCampaigns[0].status === 'changes_requested' ? 'yellow' : 'gray'
                        }>
                          {linkedCampaigns[0].status === 'draft' ? 'Entwurf' :
                           linkedCampaigns[0].status === 'in_review' ? 'In Prüfung' :
                           linkedCampaigns[0].status === 'approved' ? 'Freigegeben' :
                           linkedCampaigns[0].status === 'changes_requested' ? 'Änderung erbeten' :
                           linkedCampaigns[0].status}
                        </Badge>
                      ) : (
                        <span className="text-base text-gray-500">-</span>
                      )}
                    </div>
                  </div>

                  {/* Status Fortschritt - nur anzeigen wenn Kundenfreigabe erforderlich */}
                  {linkedCampaigns.length > 0 && linkedCampaigns[0].approvalRequired && (
                    <div>
                      <Text className="text-sm font-medium text-gray-600">Status Fortschritt</Text>
                      <div className="mt-2">
                        {/* Berechne Fortschritt direkt aus dem Kampagnenstatus */}
                        {(() => {
                          const campaignStatus = linkedCampaigns[0].status;
                          const progress = campaignStatus === 'approved' ? 100 :
                                          campaignStatus === 'in_review' ? 40 :
                                          campaignStatus === 'changes_requested' ? 60 :
                                          campaignStatus === 'pending' ? 20 :
                                          campaignStatus === 'draft' ? 10 : 0;

                          return (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <Text className="text-xs text-gray-500">Freigabe</Text>
                                <Text className="text-xs text-gray-600">{progress}%</Text>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </div>
              )}

              {/* Team Section */}
              <div>
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <Subheading>Team</Subheading>
                  </div>
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => setShowTeamModal(true)}>
                        <UserGroupIcon className="h-4 w-4" />
                        Team verwalten
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Projekt-Admin */}
                  <div>
                    <Text className="text-sm font-medium text-gray-600 mb-2">Projekt-Admin</Text>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const adminMember = teamMembers.find(m => m.userId === project.userId || m.id === project.userId);

                        if (adminMember) {
                          const initials = adminMember.displayName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <>
                              <Avatar
                                className="size-8"
                                src={adminMember.photoUrl}
                                initials={initials}
                              />
                              <div>
                                <Text className="text-sm font-medium text-gray-900">{adminMember.displayName}</Text>
                                <Text className="text-xs text-gray-500">{adminMember.email}</Text>
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <Text className="text-xs font-medium text-gray-600">?</Text>
                              </div>
                              <Text className="text-sm text-gray-500">Nicht zugeordnet</Text>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Team-Mitglieder */}
                  <div>
                    <Text className="text-sm font-medium text-gray-600 mb-2">Team-Mitglieder</Text>
                  {project.assignedTo && project.assignedTo.length > 0 ? (
                    <div className="flex -space-x-2">
                      {/* Entferne Duplikate und zeige nur eindeutige Team-Members */}
                      {(() => {
                        const uniqueMembers = [];
                        const seenMemberIds = new Set();

                        for (const userId of project.assignedTo) {
                          const member = teamMembers.find(m => m.userId === userId || m.id === userId);
                          if (member && !seenMemberIds.has(member.id)) {
                            uniqueMembers.push({ userId, member });
                            seenMemberIds.add(member.id);
                          } else if (!member) {
                            // Unbekannter Member - auch hinzufügen
                            uniqueMembers.push({ userId, member: null });
                          }
                        }

                        return uniqueMembers;
                      })().slice(0, 4).map(({ userId, member }, index) => {

                        if (!member || loadingTeam) {
                          // Fallback für unbekannte Member
                          return (
                            <div
                              key={userId}
                              className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white"
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
                            className="size-8 ring-2 ring-white"
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

                        return uniqueMembers.length > 4 ? (
                          <div
                            className="w-8 h-8 rounded-full bg-gray-300 ring-2 ring-white flex items-center justify-center text-gray-700 text-xs font-medium"
                            title={`+${uniqueMembers.length - 4} weitere Mitglieder`}
                          >
                            +{uniqueMembers.length - 4}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <Text className="text-sm">Keine Team-Mitglieder zugewiesen</Text>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Project Edit Wizard */}
      {project && currentOrganization && (
        <ProjectEditWizard
          isOpen={showEditWizard}
          onClose={() => setShowEditWizard(false)}
          onSuccess={handleEditSuccess}
          project={project}
          organizationId={currentOrganization.id}
        />
      )}


      {/* Feedback History Modal */}
      {showFeedbackModal && selectedApproval && (
        <ApprovalHistoryModal
          approval={selectedApproval}
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedApproval(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Projekt löschen</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Möchten Sie das Projekt <strong>"{project?.title}"</strong> wirklich löschen?
              </Text>
              <Text className="text-gray-500 mt-2">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle verknüpften Daten werden ebenfalls gelöscht.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button color="red" onClick={confirmDeleteProject}>
            Projekt löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Error Dialog */}
      <Dialog open={showPdfErrorDialog} onClose={() => setShowPdfErrorDialog(false)}>
        <DialogTitle>PDF nicht verfügbar</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Kein PDF verfügbar. Bitte erstellen Sie zuerst ein PDF in der verknüpften Kampagne.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowPdfErrorDialog(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Error Dialog */}
      <Dialog open={showFeedbackErrorDialog} onClose={() => setShowFeedbackErrorDialog(false)}>
        <DialogTitle>Feedback nicht verfügbar</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-gray-900">{feedbackErrorMessage}</Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowFeedbackErrorDialog(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Error Dialog */}
      <Dialog open={showDocumentErrorDialog} onClose={() => setShowDocumentErrorDialog(false)}>
        <DialogTitle>Dokumenterstellung fehlgeschlagen</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Fehler beim Erstellen des Dokuments. Bitte versuchen Sie es erneut.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowDocumentErrorDialog(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Error Dialog */}
      <Dialog open={showDeleteErrorDialog} onClose={() => setShowDeleteErrorDialog(false)}>
        <DialogTitle>Löschung fehlgeschlagen</DialogTitle>
        <DialogBody>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-gray-900">
                Fehler beim Löschen des Projekts: {deleteErrorMessage}
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowDeleteErrorDialog(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Management Modal */}
      {project && (
        <TeamManagementModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          project={project}
          organizationId={currentOrganization?.id || ''}
          onSuccess={(updatedProject) => {
            setProject(updatedProject);
            // Reload team members to refresh display
            loadTeamMembers();
          }}
        />
      )}

      {/* Floating Chat - nur anzeigen wenn Projekt geladen und User eingeloggt */}
      {project && currentOrganization && user && (
        <FloatingChat
          projectId={project.id!}
          projectTitle={project.title}
          organizationId={currentOrganization.id}
          userId={user.uid}
          userDisplayName={user.displayName || 'Unbekannter User'}
        />
      )}
    </div>
  );
}