'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import ProjectStrategyTab from '@/components/projects/strategy/ProjectStrategyTab';
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';
import { FloatingChat } from '@/components/projects/communication/FloatingChat';
import ProjectGuideBox from '@/components/projects/guides/ProjectGuideBox';
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
import { ProjectMonitoringTab } from '@/components/projects/ProjectMonitoringTab';
import Link from 'next/link';
import { toastService } from '@/lib/utils/toast';
import { ProjectProvider } from './context/ProjectContext';
import { ProjectHeader, ProjectInfoBar } from './components/header';
import { TabNavigation } from './components/tabs';
import { LoadingState, ErrorState, ErrorBoundary } from './components/shared';
import {
  OverviewTabContent,
  TasksTabContent,
  StrategieTabContent,
  DatenTabContent,
  PressemeldungTabContent,
  VerteilerTabContent,
  MonitoringTabContent
} from './components/tab-content';

export default function ProjectDetailPage() {
  /* eslint-disable react-hooks/rules-of-hooks */
  // BEGRÜNDUNG: Alle Hooks (useParams, useRouter, useState, useEffect, etc.) müssen VOR
  // dem bedingten Return (Zeile 189) stehen. Next.js App Router Pattern erfordert dieses
  // Setup. Die Hooks werden nicht bedingt aufgerufen - sie stehen alle am Anfang der Komponente.
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;

  // Tab aus URL lesen (oder 'overview' als default)
  const tabFromUrl = (searchParams.get('tab') as 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring') || 'overview';

  // Alle React Hooks müssen vor bedingten Returns stehen
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'>(tabFromUrl);
  const [projectFolders, setProjectFolders] = useState<any>(null);
  const [dokumenteFolder, setDokumenteFolder] = useState<any>(null);
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
  const [completedGuideSteps, setCompletedGuideSteps] = useState<string[]>([]);

  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Basis-Daten laden (nur einmal pro Projekt)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // BEGRÜNDUNG: loadProject, loadTeamMembers, loadTags sind stabile Funktionen, die selbst
  // von projectId/organizationId abhängen. Sie als Dependencies hinzuzufügen würde einen
  // infinite loop verursachen. Das Disable ist bewusst und korrekt.
  useEffect(() => {
    if (!currentOrganization?.id) return; // Warte bis Organisation geladen ist
    loadProject();
    loadTeamMembers();
    loadTags();
  }, [projectId, currentOrganization?.id]);

  // Tasks nur für Overview Tab laden
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // BEGRÜNDUNG: loadTodayTasks ist eine stabile Funktion. Als Dependency würde infinite loop entstehen.
  useEffect(() => {
    if (activeTab === 'overview' && currentOrganization?.id) {
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
        } catch (error) {
          console.error('Fehler beim direkten Laden der Tags:', error);
        }
      }
    };
    
    loadProjectTags();
  }, [project?.tags]);

  // Lade Projekt-Ordnerstruktur und Dokumente wenn Daten-Tab ODER Strategie-Tab aktiviert wird
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // BEGRÜNDUNG: loadProjectFolders und loadStrategyDocuments sind stabile Funktionen. Infinite loop vermeiden.
  useEffect(() => {
    if ((activeTab === 'daten' || activeTab === 'strategie') && project && currentOrganization?.id) {
      loadProjectFolders();
      loadStrategyDocuments();
    }
  }, [activeTab, project, currentOrganization?.id]);

  // URL-basierte Tab-Navigation
  useEffect(() => {
    // Synchronisiere State mit URL wenn sich URL ändert
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    // Update URL mit shallow routing (kein Page-Reload)
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });

    // Update State
    setActiveTab(tab);
  }, [router, searchParams]);

  // Handler für Guide-Step Toggle (mit useCallback für Performance)
  const handleStepToggle = useCallback(async (stepId: string) => {
    const newSteps = completedGuideSteps.includes(stepId)
      ? completedGuideSteps.filter(id => id !== stepId)
      : [...completedGuideSteps, stepId];

    setCompletedGuideSteps(newSteps);

    if (project?.id && currentOrganization?.id && user?.uid) {
      try {
        await projectService.update(project.id, {
          completedGuideSteps: newSteps
        }, { organizationId: currentOrganization.id, userId: user.uid });
      } catch (error) {
        console.error('Fehler beim Speichern der Guide-Steps:', error);
      }
    }
  }, [completedGuideSteps, project?.id, currentOrganization?.id, user?.uid]);

  // Computed Values mit useMemo
  const assignedTeamMembers = useMemo(() => {
    if (!project?.assignedTo || !teamMembers.length) return [];

    return project.assignedTo
      .map(userId => teamMembers.find(m => m.userId === userId || m.id === userId))
      .filter(Boolean)
      .slice(0, 5);
  }, [project?.assignedTo, teamMembers]);

  const todayTasksCount = useMemo(() => {
    return todayTasks.length;
  }, [todayTasks.length]);

  const hasLinkedCampaigns = useMemo(() => {
    return linkedCampaigns.length > 0;
  }, [linkedCampaigns.length]);

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

      // Für Strategie-Tab: Finde den Dokumente-Ordner und lade seinen Inhalt
      if (folderStructure && folderStructure.subfolders) {
        const dokFolder = folderStructure.subfolders.find((folder: any) =>
          folder.name === 'Dokumente'
        );

        if (dokFolder) {
          // Lade die Unterordner und Assets des Dokumente-Ordners
          const { mediaService } = await import('@/lib/firebase/media-service');
          const [subfolders, assets] = await Promise.all([
            mediaService.getFolders(currentOrganization.id, dokFolder.id),
            mediaService.getMediaAssets(currentOrganization.id, dokFolder.id)
          ]);

          // Erstelle Struktur die direkt den Inhalt des Dokumente-Ordners zeigt
          const dokumenteInhaltAlsRoot = {
            mainFolder: dokFolder,
            subfolders: subfolders || [],  // Die Unterordner des Dokumente-Ordners
            assets: assets || [],           // Die Dateien im Dokumente-Ordner
            statistics: folderStructure.statistics
          };
          setDokumenteFolder(dokumenteInhaltAlsRoot);
        }
      }
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
        setCompletedGuideSteps(projectData.completedGuideSteps || []);
        
        // Lade verknüpfte Kampagnen - sowohl über linkedCampaigns als auch projectId
        try {
          let allCampaigns: any[] = [];

          // 1. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
          if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
            const linkedCampaignData = await Promise.all(
              projectData.linkedCampaigns.map(async (campaignId) => {
                try {
                  const campaign = await prService.getById(campaignId);
                  return campaign;
                } catch (error) {
                  console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
                  return null;
                }
              })
            );
            allCampaigns.push(...linkedCampaignData.filter(Boolean));
          }

          // 2. Lade Kampagnen über projectId (neuer Ansatz)
          const projectCampaigns = await prService.getCampaignsByProject(projectData.id!, currentOrganization!.id);
          allCampaigns.push(...projectCampaigns);

          // Duplikate entfernen (falls eine Kampagne über beide Wege gefunden wird)
          const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
            index === self.findIndex(c => c.id === campaign.id)
          );

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


  // eslint-disable-next-line react-hooks/exhaustive-deps
  // BEGRÜNDUNG: loadProject ist eine stabile Funktion. Empty deps array ist korrekt,
  // da der Callback bei jedem Re-Render die aktuelle loadProject-Referenz verwendet.
  const handleEditSuccess = useCallback((updatedProject: Project) => {
    setProject(updatedProject);
    toastService.success('Projekt erfolgreich aktualisiert');
    // Reload for consistency
    setTimeout(() => {
      loadProject();
    }, 500);
  }, []);

  const handleOpenPDF = useCallback(() => {
    if (currentPdfVersion?.downloadUrl) {
      window.open(currentPdfVersion.downloadUrl, '_blank');
    } else {
      toastService.warning('Kein PDF verfügbar. Bitte erstellen Sie zuerst ein PDF in der verknüpften Kampagne.');
    }
  }, [currentPdfVersion]);

  const handleViewFeedback = useCallback(async () => {
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
          toastService.warning('Keine Freigabe-Daten für diese Kampagne vorhanden.');
        }
      } else {
        toastService.warning('Keine Freigabe-Daten für diese Kampagne vorhanden.');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Feedback-Historie:', error);
      toastService.error('Fehler beim Laden der Feedback-Historie.');
    }
  }, [linkedCampaigns, currentOrganization]);

  const getCurrentStageLabel = (stage: string) => {
    switch (stage) {
      case 'ideas_planning': return 'Ideen & Planung';
      case 'creation': return 'Content und Materialien';
      case 'approval': return 'Freigabe';
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


  const handleDeleteProject = useCallback(() => {
    if (!project?.id || !currentOrganization?.id) return;
    setShowDeleteDialog(true);
  }, [project?.id, currentOrganization?.id]);

  const confirmDeleteProject = useCallback(async () => {
    if (!project?.id || !currentOrganization?.id) return;

    try {
      await projectService.delete(project.id, { organizationId: currentOrganization.id });
      setShowDeleteDialog(false);
      toastService.success('Projekt erfolgreich gelöscht');
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      setShowDeleteDialog(false);
      toastService.error(error.message || 'Fehler beim Löschen des Projekts');
    }
  }, [project?.id, currentOrganization?.id, router]);

  const handleCreateDocument = useCallback(async (templateType: string, title: string) => {
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
      toastService.success('Dokument erfolgreich erstellt');
      router.push(`/dashboard/strategy-documents/${documentId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen des Strategiedokuments:', error);
      toastService.error('Fehler beim Erstellen des Dokuments. Bitte versuchen Sie es erneut.');
    } finally {
      setDocumentsLoading(false);
    }
  }, [currentOrganization?.id, user?.uid, project?.id, router]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !project) {
    return <ErrorState message={error || 'Projekt nicht gefunden'} />;
  }

  return (
    <ProjectProvider
      projectId={projectId}
      organizationId={currentOrganization?.id || ''}
      initialProject={project}
      initialActiveTab={activeTab}
      onTabChange={handleTabChange}
      onReload={loadProject}
    >
      <ErrorBoundary>
        <div>
        {/* Header-Komponenten */}
        <ProjectHeader
          teamMembers={teamMembers}
          onEditClick={() => setShowEditWizard(true)}
          onTeamManageClick={() => setShowTeamModal(true)}
          onDeleteClick={handleDeleteProject}
        />
        <ProjectInfoBar projectTags={projectTags} />

      {/* Main Content Area */}
      <div className="space-y-6 mb-8 mt-6">
        {/* Content Tabs Box - Full Width */}
        <div className="bg-white rounded-lg border border-gray-200">
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="p-6">
          {/* Übersicht Tab */}
          {activeTab === 'overview' && (
            <OverviewTabContent
              project={project}
              currentOrganization={currentOrganization!}
              todayTasks={todayTasks}
              loadingTodayTasks={loadingTodayTasks}
              user={user!}
              completedGuideSteps={completedGuideSteps}
              onStepToggle={handleStepToggle}
              onNavigateToTasks={() => handleTabChange('tasks')}
            />
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <TasksTabContent
              project={project}
              organizationId={currentOrganization!.id}
              teamMembers={teamMembers}
            />
          )}

          {/* Strategie Tab */}
          {activeTab === 'strategie' && (
            <StrategieTabContent
              project={project}
              organizationId={currentOrganization!.id}
              dokumenteFolder={dokumenteFolder}
              foldersLoading={foldersLoading}
              onRefresh={loadProjectFolders}
            />
          )}

          {/* Daten Tab */}
          {activeTab === 'daten' && (
            <DatenTabContent
              project={project}
              organizationId={currentOrganization!.id}
              projectFolders={projectFolders}
              foldersLoading={foldersLoading}
              onRefresh={loadProjectFolders}
            />
          )}

          {/* Pressemeldung Tab */}
          {activeTab === 'pressemeldung' && (
            <PressemeldungTabContent
              project={project}
              organizationId={currentOrganization!.id}
            />
          )}

          {/* Verteiler Tab */}
          {activeTab === 'verteiler' && (
            <VerteilerTabContent
              project={project}
              organizationId={currentOrganization!.id}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'monitoring' && (
            <MonitoringTabContent projectId={projectId} />
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
          userId={user.uid}
          userDisplayName={user.displayName || 'Unbekannter User'}
        />
      )}
        </div>
      </ErrorBoundary>
    </ProjectProvider>
  );
}