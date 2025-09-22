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
  ClipboardDocumentListIcon,
  FolderIcon,
  FolderOpenIcon,
  EyeIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TagIcon,
  CheckCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import type { Task } from '@/types/tasks';

// Pipeline-Komponenten importieren
import PipelineProgressDashboard from '@/components/projects/workflow/PipelineProgressDashboard';
import ProjectAssetGallery from '@/components/projects/assets/ProjectAssetGallery';
import AssetPipelineStatus from '@/components/projects/assets/AssetPipelineStatus';
import WorkflowAutomationManager from '@/components/projects/workflow/WorkflowAutomationManager';
import ProjectPressemeldungenTab from '@/components/projects/pressemeldungen/ProjectPressemeldungenTab';
import TaskDependenciesVisualizer from '@/components/projects/workflow/TaskDependenciesVisualizer';
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';
import { FloatingChat } from '@/components/projects/communication/FloatingChat';
import PhaseGuideBox from '@/components/projects/guides/PhaseGuideBox';
import { projectService } from '@/lib/firebase/project-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { taskService } from '@/lib/firebase/task-service';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { ProjectTask } from '@/types/tasks';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';
import { strategyDocumentService, StrategyDocument } from '@/lib/firebase/strategy-document-service';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import { tagsService } from '@/lib/firebase/tags-service';
import { Tag } from '@/types/crm';
import { approvalService } from '@/lib/firebase/approval-service';
import { prService } from '@/lib/firebase/pr-service';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { ApprovalHistoryModal } from '@/components/campaigns/ApprovalHistoryModal';
import { ApprovalEnhanced } from '@/types/approvals';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { TeamManagementModal } from '@/components/projects/TeamManagementModal';
import ProjectDistributionLists from '@/components/projects/distribution/ProjectDistributionLists';
import Link from 'next/link';

export default function ProjectDetailPage() {
  console.log('🔄 ProjectDetailPage MOUNT/RENDER');
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'daten' | 'pressemeldung' | 'verteiler' | 'monitoring'>('overview');
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
  const [todayTasks, setTodayTasks] = useState<ProjectTask[]>([]);
  const [loadingTodayTasks, setLoadingTodayTasks] = useState(false);

  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPdfErrorDialog, setShowPdfErrorDialog] = useState(false);
  const [showFeedbackErrorDialog, setShowFeedbackErrorDialog] = useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState('');
  const [showDocumentErrorDialog, setShowDocumentErrorDialog] = useState(false);
  const [showDeleteErrorDialog, setShowDeleteErrorDialog] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // Basis-Daten laden (nur einmal pro Projekt)
  useEffect(() => {
    if (!currentOrganization?.id) return; // Warte bis Organisation geladen ist
    console.log('📊 Loading project base data...');
    loadProject();
    loadTeamMembers();
    loadTags();
  }, [projectId, currentOrganization?.id]);

  // Tasks nur für Overview Tab laden
  useEffect(() => {
    if (activeTab === 'overview' && currentOrganization?.id) {
      console.log('📋 Loading today tasks for overview tab...');
      loadTodayTasks();
    }
  }, [activeTab, projectId, currentOrganization?.id]);

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


  const loadTodayTasks = async () => {
    if (!projectId || !currentOrganization?.id || !user?.uid) {
      return;
    }

    try {
      setLoadingTodayTasks(true);
      const projectTasks = await taskService.getByProjectId(currentOrganization.id, projectId);

      // Filter für heute fällige oder überfällige Tasks des aktuellen Users
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userTodayTasks = projectTasks
        // .filter(task => task.projectId === projectId) // Nicht nötig, schon im Service gefiltert
        .filter((task: Task) => {
          // Nur Tasks des aktuellen Users
          if (task.assignedUserId !== user.uid) return false;

          // Nur nicht erledigte Tasks
          if (task.status === 'completed') return false;

          // Prüfe ob Task heute fällig oder überfällig ist
          if (!task.dueDate) return false;

          const dueDate = task.dueDate.toDate();
          const dueDateOnly = new Date(dueDate);
          dueDateOnly.setHours(0, 0, 0, 0);

          // Heute fällig oder überfällig (dueDate <= heute)
          const isToday = dueDateOnly.getTime() === today.getTime();
          const isOverdue = dueDateOnly.getTime() < today.getTime();

          // Setze isOverdue flag für die Anzeige
          if (isOverdue) {
            (task as any).isOverdue = true;
          }

          return isToday || isOverdue;
        }) as ProjectTask[];

      setTodayTasks(userTodayTasks);
    } catch (error) {
      console.error('Fehler beim Laden der heute fälligen Tasks:', error);
    } finally {
      setLoadingTodayTasks(false);
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
        
        // Lade verknüpfte Kampagnen - sowohl über linkedCampaigns als auch projectId
        try {
          console.log('🔍 DEBUG OVERVIEW - Lade Kampagnen für Projekt:', projectData.id, 'Organisation:', currentOrganization!.id);
          console.log('🔍 DEBUG OVERVIEW - Projekt-Data:', projectData);
          let allCampaigns: any[] = [];

          // 1. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
          if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
            console.log('🔍 DEBUG OVERVIEW - linkedCampaigns gefunden:', projectData.linkedCampaigns);
            const linkedCampaignData = await Promise.all(
              projectData.linkedCampaigns.map(async (campaignId) => {
                try {
                  console.log('🔍 DEBUG OVERVIEW - Lade Kampagne:', campaignId);
                  const campaign = await prService.getById(campaignId, currentOrganization!.id);
                  console.log('🔍 DEBUG OVERVIEW - Kampagne geladen:', campaign);
                  return campaign;
                } catch (error) {
                  console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
                  return null;
                }
              })
            );
            allCampaigns.push(...linkedCampaignData.filter(Boolean));
            console.log('🔍 DEBUG OVERVIEW - Kampagnen über linkedCampaigns:', allCampaigns.length);
          } else {
            console.log('🔍 DEBUG OVERVIEW - Keine linkedCampaigns gefunden');
          }

          // 2. Lade Kampagnen über projectId (neuer Ansatz)
          console.log('🔍 DEBUG OVERVIEW - Suche Kampagnen mit projectId...');
          const projectCampaigns = await prService.getCampaignsByProject(projectData.id!, currentOrganization!.id);
          console.log('🔍 DEBUG OVERVIEW - Kampagnen über projectId gefunden:', projectCampaigns);
          allCampaigns.push(...projectCampaigns);

          // Duplikate entfernen (falls eine Kampagne über beide Wege gefunden wird)
          const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
            index === self.findIndex(c => c.id === campaign.id)
          );
          console.log('🔍 DEBUG OVERVIEW - Einzigartige Kampagnen:', uniqueCampaigns);

          setLinkedCampaigns(uniqueCampaigns);

          // Lade PDF-Version für die erste Kampagne
          if (uniqueCampaigns.length > 0 && uniqueCampaigns[0]) {
            try {
              const pdfVersion = await pdfVersionsService.getCurrentVersion(uniqueCampaigns[0].id);
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
      case 'ideas_planning': return 'Ideenplanung';
      case 'planning': return 'Planung';
      case 'content_creation': return 'Content-Erstellung';
      case 'internal_review': return 'Interne Prüfung';
      case 'internal_approval': return 'Interne Freigabe';
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

  const getTeamMember = (userId: string) => {
    return teamMembers.find(member => member.userId === userId || member.id === userId);
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
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              {/* Titel und Status in einer Zeile */}
              <div className="flex items-center gap-3 mb-2">
                <Heading className="!text-2xl">{project.title}</Heading>
                <Badge color={getProjectStatusColor(project.status)}>
                  {getProjectStatusLabel(project.status)}
                </Badge>
                {/* Erstellt-Datum */}
                <span className="text-sm text-gray-500">
                  Erstellt: {formatProjectDate(project.createdAt)}
                </span>
              </div>

              {/* Trennlinie */}
              <div className="border-t border-gray-200 mt-8 mb-3"></div>

              {/* Kompakte Info-Zeile */}
              <div className="flex items-center flex-wrap gap-8 text-sm text-gray-600">
                {/* Aktuelle Phase */}
                <div className="flex items-center gap-1.5">
                  <Squares2X2Icon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Phase:</span>
                  <span className="text-gray-900">{getStageLabel(project.currentStage)}</span>
                </div>


                {/* Kunde */}
                {project.customer && (
                  <div className="flex items-center gap-1.5">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Kunde:</span>
                    <button
                      className="text-primary hover:text-primary-hover hover:underline text-sm"
                      onClick={() => router.push(`/dashboard/contacts/crm/companies/${project.customer?.id}`)}
                      title="Kunde anzeigen"
                    >
                      {project.customer.name}
                    </button>
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
                      {project.deadline?.toDate().toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {/* Tags - ans Ende und nur wenn vorhanden */}
                {projectTags.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <TagIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Tags:</span>
                    <div className="flex items-center gap-1">
                      {projectTags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag.id}
                          color={tag.color || 'zinc'}
                          className="!py-0.5 !text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {projectTags.length > 3 && (
                        <span className="text-xs text-gray-500">+{projectTags.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Zurück zur Hauptseite */}
            <Link href="/dashboard/projects">
              <Button plain className="p-2">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>

            {/* Team-Mitglieder Avatare */}
            {project.assignedTo && project.assignedTo.length > 0 && (
              <div className="flex items-center -space-x-2">
                {(() => {
                  // Sammle alle zugewiesenen User-IDs inklusive Admin und Manager
                  const allUserIds = [
                    ...(project.assignedTo || []),
                    project.userId,
                    project.managerId
                  ].filter(Boolean);

                  // Eindeutige User-IDs sammeln und Member finden
                  const uniqueMembers: Array<{userId: string, member: TeamMember | null}> = [];
                  for (const userId of allUserIds) {
                    if (userId && !uniqueMembers.find(u => u.userId === userId)) {
                      const member = teamMembers.find(m =>
                        m.userId === userId ||
                        m.id === userId
                      );
                      uniqueMembers.push({ userId, member: member || null });
                    }
                  }

                  return uniqueMembers.slice(0, 5).map(({ userId, member }, index) => {
                    if (member) {
                      const initials = member.displayName
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '??';

                      return (
                        <Avatar
                          key={userId}
                          className="size-8 ring-2 ring-gray-50 hover:z-10 transition-all"
                          src={member.photoUrl}
                          initials={initials}
                          style={{ zIndex: 5 - index }}
                          title={member.displayName}
                        />
                      );
                    }
                    return null;
                  });
                })()}
                {project.assignedTo && project.assignedTo.length > 5 && (
                  <div
                    className="size-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium ring-2 ring-gray-50"
                    title={`${project.assignedTo.length - 5} weitere Mitglieder`}
                  >
                    +{project.assignedTo.length - 5}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowEditWizard(true)} color="secondary" className="!py-1.5">
                <PencilSquareIcon className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Bearbeiten</span>
              </Button>

              {/* Mehr-Optionen Dropdown */}
              <Dropdown>
                <DropdownButton plain className="!py-1.5 !px-2">
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
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 mb-8">
        {/* Content Tabs Box - Full Width */}
        <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: overview');
                  setActiveTab('overview');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Übersicht
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: tasks');
                  setActiveTab('tasks');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'tasks'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                Tasks
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: daten');
                  setActiveTab('daten');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'daten'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FolderOpenIcon className="w-4 h-4 mr-2" />
                Daten
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: pressemeldung');
                  setActiveTab('pressemeldung');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'pressemeldung'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Pressemeldung
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: verteiler');
                  setActiveTab('verteiler');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'verteiler'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UsersIcon className="w-4 h-4 mr-2" />
                Verteiler
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🎯 Tab Click: monitoring');
                  setActiveTab('monitoring');
                }}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'monitoring'
                    ? 'text-primary border-b-2 border-primary'
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
              {/* BLAUE BOX - Pipeline-Fortschritt [1/1] - Volle Breite oben */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Squares2X2Icon className="h-5 w-5 text-primary mr-2" />
                  <Subheading>Pipeline-Übersicht</Subheading>
                </div>
                {/* Pipeline-Fortschritt Dashboard hier */}
                {project && currentOrganization && (
                  <PipelineProgressDashboard
                    projectId={project.id || ''}
                    organizationId={currentOrganization.id}
                    currentStage={project.currentStage}
                    onNavigateToTasks={() => setActiveTab('tasks')}
                  />
                )}
              </div>

              {/* Heute fällige Tasks Box - nur wenn vorhanden */}
              {todayTasks.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-5 w-5 text-primary mr-2" />
                      <Subheading>Meine fälligen Tasks</Subheading>
                    </div>
                    {/* User Avatar oben rechts */}
                    {user && (
                      <div className="flex items-center">
                        <Avatar
                          className="size-8"
                          src={user.photoURL}
                          initials={user.displayName
                            ?.split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2) || user.email?.charAt(0).toUpperCase() || '?'}
                          title={user.displayName || user.email || 'Aktueller User'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Task Liste */}
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Status Icon */}
                          <div className="flex-shrink-0">
                            {task.status === 'completed' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : task.isOverdue ? (
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                            ) : (
                              <ClockIcon className="h-5 w-5 text-orange-500" />
                            )}
                          </div>

                          {/* Task Titel */}
                          <div className="min-w-0 flex-1">
                            <Text className="text-sm font-medium text-gray-900 truncate" title={task.title}>
                              {task.title}
                            </Text>
                          </div>
                        </div>

                        {/* Fortschritt */}
                        <div className="flex items-center gap-3 ml-4">
                          {(() => {
                            const progress = task.progress || 0;

                            // Einheitliche Farblogik wie in Phase/Pressemeldung Box
                            const getProgressColor = (percent: number) => {
                              if (percent >= 90) return 'bg-green-500';
                              if (percent >= 70) return 'bg-blue-500';
                              if (percent >= 50) return 'bg-yellow-500';
                              return 'bg-red-500';
                            };

                            const progressColor = getProgressColor(progress);
                            const isInProgress = task.status === 'in_progress';

                            return (
                              <>
                                <div className="relative">
                                  <div className="w-20 bg-gray-200 rounded-full h-3">
                                    <div
                                      className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>

                                  {isInProgress && (
                                    <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <Text className="text-xs text-gray-500 w-8">
                                  {Math.round(progress)}%
                                </Text>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer mit Link zum Tasks Tab */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-sm text-primary hover:text-primary-hover font-medium"
                    >
                      Alle Tasks anzeigen →
                    </button>
                  </div>
                </div>
              )}

              {/* Untere Reihe: Fortschritt nach Phase + Guide/Pressemeldung (responsive) */}
              <div className={`grid gap-6 ${(() => {
                const earlyPhases = ['ideas_planning', 'creation'];
                const showGuide = project && earlyPhases.includes(project.currentStage);
                return (showGuide || linkedCampaigns.length > 0) ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1';
              })()}`}>
                {/* Fortschritt nach Phase Box */}
                {project && currentOrganization && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <ChartBarIcon className="h-5 w-5 text-primary mr-2" />
                      <Subheading>Fortschritt nach Phase</Subheading>
                    </div>
                    {/* Nur den Phase-spezifischen Teil der Pipeline-Komponente */}
                    <div className="space-y-4">
                      {(() => {
                        const stageLabels = {
                          'ideas_planning': 'Ideen & Planung',
                          'creation': 'Erstellung',
                          'internal_approval': 'Interne Freigabe',
                          'customer_approval': 'Kunden-Freigabe',
                          'distribution': 'Verteilung',
                          'monitoring': 'Monitoring',
                          'completed': 'Abgeschlossen'
                        };

                        const stageOrder = [
                          'ideas_planning',
                          'creation',
                          'internal_approval',
                          'customer_approval',
                          'distribution',
                          'monitoring',
                          'completed'
                        ];

                        const getStageStatus = (stage: string) => {
                          const currentIndex = stageOrder.indexOf(project.currentStage);
                          const stageIndex = stageOrder.indexOf(stage);

                          if (stageIndex < currentIndex) return 'completed';
                          if (stageIndex === currentIndex) return 'current';
                          return 'upcoming';
                        };

                        const getProgressColor = (percent: number) => {
                          if (percent >= 90) return 'bg-green-500';
                          if (percent >= 70) return 'bg-blue-500';
                          if (percent >= 50) return 'bg-yellow-500';
                          return 'bg-red-500';
                        };

                        return stageOrder.map(stage => {
                          const status = getStageStatus(stage);
                          const stageProgress = status === 'completed' ? 100 : status === 'current' ? 50 : 0;
                          const progressColor = getProgressColor(stageProgress);

                          return (
                            <div key={stage} className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  {status === 'completed' && (
                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                  {status === 'current' && (
                                    <ClockIcon className="w-5 h-5 text-primary" />
                                  )}
                                  {status === 'upcoming' && (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                  )}

                                  <span className={`font-medium ${
                                    status === 'current' ? 'text-primary' :
                                    status === 'completed' ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    {stageLabels[stage as keyof typeof stageLabels]}
                                  </span>
                                </div>

                                <span className="text-sm font-medium text-gray-600">
                                  {Math.round(stageProgress)}%
                                </span>
                              </div>

                              <div className="relative">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                                    style={{ width: `${stageProgress}%` }}
                                  ></div>
                                </div>

                                {status === 'current' && (
                                  <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse"></div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Guide Box für frühe Phasen ODER Pressemeldung für späte Phasen */}
                {(() => {
                  const earlyPhases = ['ideas_planning', 'creation'];
                  const showGuide = project && earlyPhases.includes(project.currentStage);

                  if (showGuide && user && currentOrganization) {
                    return (
                      <PhaseGuideBox
                        currentPhase={project.currentStage}
                        projectId={project.id!}
                        organizationId={currentOrganization.id}
                        userId={user.uid}
                        onTaskComplete={() => {}} // Minimale Implementation
                        onPhaseAdvance={(newPhase) => {
                          // Simple phase advance ohne komplexe Logic
                          console.log(`Advancing to phase: ${newPhase}`);
                        }}
                        setActiveTab={(tab: string) => setActiveTab(tab as any)}
                      />
                    );
                  }

                  // Keine zusätzliche Pressemeldung Box mehr - alles im Pressemeldung Tab
                  return null;
                })()}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Project Task Manager */}
              {project && teamMembers.length > 0 && currentOrganization && (
                <ProjectTaskManager
                  projectId={project.id!}
                  organizationId={currentOrganization.id}
                  projectManagerId={project.managerId || project.userId}
                  teamMembers={teamMembers}
                  projectTeamMemberIds={project.assignedTo}
                  projectTitle={project.title}
                />
              )}

            </div>
          )}

          {/* Daten Tab */}
          {activeTab === 'daten' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Daten-Bereich</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Hier werden zukünftig projektspezifische Daten angezeigt.
                </p>
              </div>
            </div>
          )}

          {/* Pressemeldung Tab */}
          {activeTab === 'pressemeldung' && (
            <div className="space-y-6">
              {project && currentOrganization && (
                <ProjectPressemeldungenTab
                  projectId={project.id!}
                  organizationId={currentOrganization.id}
                />
              )}
            </div>
          )}

          {/* Verteiler Tab */}
          {activeTab === 'verteiler' && (
            <div className="space-y-6">
              {project && currentOrganization && (
                <ProjectDistributionLists
                  projectId={project.id!}
                  organizationId={currentOrganization.id}
                />
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Hier werden zukünftig Analytics und Monitoring-Funktionen angezeigt.
                </p>
              </div>
            </div>
          )}

          {/* Daten & Strategie Tab */}
          {activeTab === 'daten' && (
            <div className="space-y-6">
              {/* Projekt-Ordner */}
              {currentOrganization && (
                <ProjectFoldersView
                  projectId={project.id!}
                  organizationId={currentOrganization.id}
                  projectFolders={projectFolders}
                  foldersLoading={foldersLoading}
                  onRefresh={loadProjectFolders}
                  clientId={project.customer?.id || ''}
                />
              )}
            </div>
          )}

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
          organizationId={currentOrganization?.id || ''}
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
          <Button onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700 text-white border-transparent">
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
      {project && currentOrganization && (
        <TeamManagementModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          project={project}
          organizationId={currentOrganization.id}
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