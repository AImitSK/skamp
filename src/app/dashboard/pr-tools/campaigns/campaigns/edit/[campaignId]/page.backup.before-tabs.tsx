// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback, use } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { CampaignProvider, useCampaign } from "./context/CampaignContext";
import { TeamMember } from "@/types/international";
import { teamMemberEnhancedService } from "@/lib/firebase/team-service-enhanced";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetSelectorModal } from "@/components/campaigns/AssetSelectorModal";
import { KeyVisualSection } from "@/components/campaigns/KeyVisualSection";
import { KeyVisualData } from "@/types/pr";
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER } from "@/constants/ui";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
import { ModernCustomerSelector } from "@/components/pr/ModernCustomerSelector";
import CampaignRecipientManager from "@/components/pr/campaign/CampaignRecipientManager";
import { ApprovalSettings } from "@/components/campaigns/ApprovalSettings";
import { PDFVersionHistory } from "@/components/campaigns/PDFVersionHistory";
// VEREINFACHT: Nur noch SimplifiedApprovalData
interface SimplifiedApprovalData {
  customerApprovalRequired: boolean;
  customerContact?: any; // CustomerContact type
  customerApprovalMessage?: string;
}
import {
  PlusIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon,
  XCircleIcon,
  SparklesIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LinkIcon
} from "@heroicons/react/24/outline";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment, EditLockData, EditLockUtils, PRCampaign, EDIT_LOCK_CONFIG } from "@/types/pr";
import SimpleBoilerplateLoader, { BoilerplateSection } from "@/components/pr/campaign/SimpleBoilerplateLoader";
import { InfoTooltip } from "@/components/InfoTooltip";
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
// 🆕 NEW: Enhanced Edit-Lock Integration
import EditLockBanner from '@/components/campaigns/EditLockBanner';
import EditLockStatusIndicator from '@/components/campaigns/EditLockStatusIndicator';
import { CampaignPreviewStep } from '@/components/campaigns/CampaignPreviewStep';
import { ProjectLinkBanner } from '@/components/campaigns/ProjectLinkBanner';
import { PipelinePDFViewer } from '@/components/campaigns/PipelinePDFViewer';
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { Project } from "@/types/project";
import { ProjectAssignmentMigrationDialog } from '@/components/campaigns/ProjectAssignmentMigrationDialog';
import { toastService } from '@/lib/utils/toast';
// PRSEOHeaderBar now integrated in CampaignContentComposer

// Phase 2: Modular Tab Components
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import CampaignHeader from './components/CampaignHeader';
import TabNavigation from './components/TabNavigation';
import ContentTab from './tabs/ContentTab';
import AttachmentsTab from './tabs/AttachmentsTab';
import ApprovalTab from './tabs/ApprovalTab';
import PreviewTab from './tabs/PreviewTab';

// Dynamic import für AI Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});


export default function EditPRCampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Organisation wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <CampaignProvider campaignId={campaignId} organizationId={currentOrganization.id}>
      <CampaignEditPageContent campaignId={campaignId} />
    </CampaignProvider>
  );
}

function CampaignEditPageContent({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Campaign Context
  const {
    campaign: existingCampaign,
    loading,
    activeTab: currentStep,
    setActiveTab: setCurrentStep,
    setCampaign: setExistingCampaign,
    reloadCampaign,
    editLockStatus,
    loadingEditLock,
    approvalLoading
  } = useCampaign();

  // Local loading/saving/pdf states für zusätzliche Operationen
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);

  // Form State
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  
  // Multi-List Support
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedListNames, setSelectedListNames] = useState<string[]>([]);
  const [listRecipientCount, setListRecipientCount] = useState(0);
  
  // Manual Recipients
  const [manualRecipients, setManualRecipients] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
    isValid: boolean;
    validationError?: string;
  }>>([]);

  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [editorContent, setEditorContent] = useState<string>(''); // Editor-Inhalt für SEO
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);
  const [approvalData, setApprovalData] = useState<SimplifiedApprovalData>({
    customerApprovalRequired: false,
    customerContact: undefined,
    customerApprovalMessage: ''
  });

  // 🆕 Template-State-Management
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  // ✅ PROJEKT-INTEGRATION STATE
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // NEU: Dokumente-Ordner für KI-Kontext
  const [dokumenteFolderId, setDokumenteFolderId] = useState<string | undefined>();

  // State für bisherigen Feedback-Verlauf
  const [previousFeedback, setPreviousFeedback] = useState<any[]>([]);


  // Asset-Migration State
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationAssetCount, setMigrationAssetCount] = useState(0);
  const [pendingProjectId, setPendingProjectId] = useState<string>('');
  const [pendingProject, setPendingProject] = useState<Project | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);


  // Content HTML Generation - kombiniert alle Komponenten zu einem HTML-String
  const generateContentHtml = (): string => {
    let html = '';
    
    // 1. Haupt-Content (Editor-Inhalt) - KeyVisual wird bereits oben separat angezeigt
    if (editorContent && editorContent.trim() && editorContent !== '<p></p>') {
      html += `<div class="main-content">${editorContent}</div>`;
    }
    
    // 2. Textbausteine (falls vorhanden)
    if (boilerplateSections && boilerplateSections.length > 0) {
      
      const visibleSections = boilerplateSections
        .filter(section => {
          
          // Content-Prüfung mit korrekten Properties
          const content = section.content || 
                         section.boilerplate?.content ||
                         section.boilerplate?.description ||
                         '';
          
          // Title-Prüfung
          const title = section.customTitle || 
                       section.boilerplate?.name ||
                       '';
          
          // Vereinfachte Content-Prüfung - wenn boilerplateId vorhanden ist, dann hat es Content
          const hasContent = (section.boilerplateId && section.boilerplateId.trim() !== '') || 
                            (content && content.trim() && content !== '<p></p>' && content !== '<p><br></p>');
          
          return hasContent;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      
      if (visibleSections.length > 0) {
        // Füge Abstand zwischen Haupttext und erstem Textbaustein hinzu
        const hasMainContent = editorContent && editorContent.trim() && editorContent !== '<p></p>';
        if (hasMainContent) {
          html += `<div class="mt-12"></div>`;
        }
        
        visibleSections.forEach(section => {
          const content = section.content || 
                         section.boilerplate?.content ||
                         section.boilerplate?.description ||
                         '';
          
          const title = section.customTitle || 
                       section.boilerplate?.name ||
                       '';
          
          html += `<div class="boilerplate-section mb-8">
            ${title ? `<h3 class="text-xl font-bold mb-4 text-gray-900">${title}</h3>` : ''}
            <div class="boilerplate-content text-gray-800 prose prose-lg max-w-none">${content}</div>
          </div>`;
        });
      } else {
      }
    } else {
    }
    
    return html;
  };

  // Generiert finale Vorschau und wechselt zu Step 4
  const handleGeneratePreview = () => {
    const html = generateContentHtml();
    setFinalContentHtml(html);
    setCurrentStep(4);
  };

  // 🆕 Template-Select Handler
  const handleTemplateSelect = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
  };

  // PDF-WORKFLOW PREVIEW HANDLER
  const handlePDFWorkflowToggle = (enabled: boolean) => {
    if (enabled) {
      const steps = [];
      if (approvalData.customerApprovalRequired) {
        steps.push(`Kunden-Freigabe (${approvalData.customerContact?.name || 'TBD'})`);
      }
      
      setPdfWorkflowPreview({
        enabled: true,
        estimatedSteps: steps,
        shareableLinks: {
          customer: approvalData.customerApprovalRequired ? '/freigabe/[generated-id]' : undefined
        }
      });
    } else {
      setPdfWorkflowPreview({
        enabled: false,
        estimatedSteps: [],
        shareableLinks: {}
      });
    }
  };

  // ENHANCED STEP 3 → STEP 4 ÜBERGANG
  const handleStepTransition = async (targetStep: 1 | 2 | 3 | 4) => {
    if (currentStep === 3 && targetStep === 4) {
      // GENERATE PREVIEW MIT PDF-WORKFLOW PREPARATION
      await handleGeneratePreview();
      
      // Prüfe ob PDF-Workflow aktiv werden wird
      if (approvalData.customerApprovalRequired) {
      }
    } else {
      setCurrentStep(targetStep);
    }
  };

  const handleKeyVisualChange = (newKeyVisual: KeyVisualData | undefined) => {
    setKeyVisual(newKeyVisual);
  };

  const [keywords, setKeywords] = useState<string[]>([]); // SEO Keywords

  // Finales Content HTML für Vorschau (wird bei Step-Wechsel generiert)
  const [finalContentHtml, setFinalContentHtml] = useState<string>('');
  const [campaignAdmin, setCampaignAdmin] = useState<TeamMember | null>(null);

  // UI State
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [realPrScore, setRealPrScore] = useState<{
    totalScore: number;
    breakdown: { headline: number; keywords: number; structure: number; relevance: number; concreteness: number; engagement: number; social: number };
    hints: string[];
    keywordMetrics: any[];
  } | null>(null);
  
  // PR-Score automatisch aktualisieren wenn Inhalt sich ändert
  useEffect(() => {
    const calculatePrScore = () => {
      const content = `${campaignTitle || ''}\n\n${editorContent || ''}`.trim();
      if (!content || content.length < 50) {
        setRealPrScore({ totalScore: 28, breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 }, hints: ['Fügen Sie mehr Inhalt hinzu', 'Verwenden Sie aussagekräftige Keywords'], keywordMetrics: [] });
        return;
      }
      
      let score = 30; // Basis-Score
      const hints: string[] = [];
      
      // Title-Bewertung
      if (campaignTitle && campaignTitle.length > 30) {
        score += 15;
      } else {
        hints.push('Titel sollte mindestens 30 Zeichen haben');
      }
      
      // Content-Länge Bewertung
      const wordCount = content.split(/\s+/).length;
      if (wordCount > 200) {
        score += 20;
      } else {
        hints.push('Pressemitteilung sollte mindestens 200 Wörter haben');
      }
      
      // Keywords Bewertung
      if (keywords.length > 0) {
        score += 15;
        const keywordFound = keywords.some(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase())
        );
        if (keywordFound) {
          score += 15;
        } else {
          hints.push('Keywords sollten im Text verwendet werden');
        }
      } else {
        hints.push('Definieren Sie SEO-Keywords für bessere Auffindbarkeit');
      }
      
      // Struktur-Bewertung (einfache Heuristik)
      const hasStructure = content.includes('\n') || content.length > 500;
      if (hasStructure) {
        score += 5;
      } else {
        hints.push('Gliedern Sie den Text in Absätze');
      }
      
      score = Math.min(100, score);
      setRealPrScore({ totalScore: score, breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 }, hints, keywordMetrics: [] });
    };
    
    const timeoutId = setTimeout(calculatePrScore, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [campaignTitle, editorContent, keywords]);

  // PDF-Workflow Preview State
  const [pdfWorkflowPreview, setPdfWorkflowPreview] = useState<{
    enabled: boolean;
    estimatedSteps: string[];
    shareableLinks: { team?: string; customer?: string };
  }>({
    enabled: false,
    estimatedSteps: [],
    shareableLinks: {}
  });
  
  const [approvalWorkflowResult, setApprovalWorkflowResult] = useState<{
    workflowId?: string;
    pdfVersionId?: string;
    shareableLinks?: { team?: string; customer?: string };
  } | null>(null);
  
  // ✅ PIPELINE-APPROVAL STATE (Plan 3/9)
  const [projectApproval, setProjectApproval] = useState<any | null>(null);
  const [pipelineApprovalStatus, setPipelineApprovalStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');


  // Entferne die problematische useEffect dependency
  useEffect(() => {
    if (user && currentOrganization) {
      loadDataNow();
    }
  }, [user, currentOrganization, campaignId]);

  // ✅ PIPELINE-APPROVAL LOADING (Plan 3/9)
  useEffect(() => {
    if (existingCampaign?.projectId && currentOrganization) {
      loadProjectApproval();
    }
  }, [existingCampaign?.projectId, currentOrganization]);

  // Lade das Projekt-Objekt wenn eine projectId vorhanden ist
  useEffect(() => {
    const loadProject = async () => {
      if (selectedProjectId && currentOrganization?.id) {
        try {
          const { projectService } = await import('@/lib/firebase/project-service');
          const project = await projectService.getById(selectedProjectId, {
            organizationId: currentOrganization.id
          });
          if (project) {
            setSelectedProject(project);

            // NEU: Lade Dokumente-Ordner für KI-Kontext
            const projectFolders = await projectService.getProjectFolderStructure(
              selectedProjectId,
              { organizationId: currentOrganization.id }
            );
            const dokumenteFolder = projectFolders?.subfolders?.find(
              (folder: any) => folder.name === 'Dokumente'
            );
            if (dokumenteFolder) {
              setDokumenteFolderId(dokumenteFolder.id);
            }
          }
        } catch (error) {
          // Error handling without logging
        }
      }
    };

    loadProject();
  }, [selectedProjectId, currentOrganization?.id]);

  const loadDataNow = async () => {
    if (!user || !currentOrganization || !campaignId) return;
    setIsLoadingCampaign(true);
    try {
      await loadData();
    } catch (error) {
      toastService.error('Daten konnten nicht geladen werden');
    } finally {
      setIsLoadingCampaign(false);
    }
  };

  // 🆕 ENHANCED: Lade Edit-Lock Status
  // HINWEIS: Edit-Lock wird jetzt im Context geladen
  const loadEditLockStatus = async (campaignId: string) => {
    // Diese Funktion wird nicht mehr benötigt - Context übernimmt das
  };

  // ✅ PIPELINE-APPROVAL FUNKTIONEN (Plan 3/9)
  
  const loadProjectApproval = async () => {
    if (!existingCampaign?.projectId || !currentOrganization || !user) return;

    try {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      
      const approval = await approvalService.getByProjectId(
        existingCampaign.projectId,
        { organizationId: currentOrganization.id, userId: user.uid }
      );
      
      setProjectApproval(approval);
      
      if (approval) {
        // Update Pipeline-Status basierend auf Approval-Status
        if (approval.status === 'approved') {
          setPipelineApprovalStatus('approved');
        } else if (approval.status === 'rejected') {
          setPipelineApprovalStatus('rejected');
        } else if (approval.status === 'pending' || approval.status === 'in_review') {
          setPipelineApprovalStatus('pending');
        } else {
          setPipelineApprovalStatus('none');
        }
      } else {
        setPipelineApprovalStatus('none');
      }
    } catch (error) {
      setPipelineApprovalStatus('none');
    }
  };

  const handleCreateProjectApproval = async () => {
    if (!existingCampaign?.projectId || !currentOrganization || !user) return;

    try {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      
      const approvalData = {
        title: `Projekt-Freigabe: ${existingCampaign.title}`,
        description: 'Kunden-Freigabe für Projekt-Pipeline',
        campaignId: existingCampaign.id!,
        campaignTitle: existingCampaign.title,
        
        clientId: existingCampaign.clientId!,
        clientName: existingCampaign.clientName!,
        clientEmail: existingCampaign.clientName ? `${existingCampaign.clientName}@example.com` : '',
        
        // Content für Freigabe
        content: {
          html: existingCampaign.contentHtml || '',
          plainText: existingCampaign.contentHtml?.replace(/<[^>]*>/g, '') || '',
          subject: `Freigabe erforderlich: ${existingCampaign.title}`
        },
        
        attachedAssets: existingCampaign.attachedAssets?.map(asset => ({
          assetId: asset.assetId || asset.folderId || '',
          type: asset.type as 'file' | 'folder',
          name: asset.metadata?.fileName || asset.metadata?.folderName || 'Unbekannt',
          metadata: asset.metadata
        })) || [],
        
        // Standard-Approval-Settings
        status: 'draft' as const,
        workflow: 'simple' as const,
        options: {
          requireAllApprovals: true,
          allowPartialApproval: false,
          autoSendAfterApproval: false,
          allowComments: true,
          allowInlineComments: true
        },
        
        // Recipients werden durch UI gefüllt
        recipients: [],
        shareSettings: {
          requirePassword: false,
          requireEmailVerification: false,
          accessLog: true
        },
        
        // ✅ Pipeline-Integration
        projectId: existingCampaign.projectId,
        projectTitle: existingCampaign.projectTitle,
        pipelineStage: 'approval' as const,
        
        pipelineApproval: {
          isRequired: true,
          blocksStageTransition: true,
          autoTransitionOnApproval: true,
          stageRequirements: ['internal_approval_completed'],
          completionActions: [{
            type: 'transition_stage',
            target: 'distribution',
            data: { reason: 'customer_approved' }
          }]
        },
        
        requestedAt: new Date() as any,
        priority: 'medium' as const
      };

      const approval = await approvalService.createPipelineApproval(approvalData, {
        organizationId: currentOrganization.id,
        userId: user.uid
      });
      
      // Lade die neu erstellte Approval
      await loadProjectApproval();

    } catch (error) {
      // Error handling without logging
    }
  };

  const getApprovalStatusText = (status: string): string => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'pending': return 'Ausstehend';
      case 'in_review': return 'In Prüfung';
      case 'approved': return 'Freigegeben';
      case 'rejected': return 'Abgelehnt';
      case 'changes_requested': return 'Änderungen angefordert';
      default: return 'Unbekannt';
    }
  };

  const loadData = useCallback(async () => {
    if (!user || !currentOrganization || !campaignId) return;
    setIsLoadingCampaign(true);
    try {
      // Lade Verteiler-Listen
      const listsData = await listsService.getAll(currentOrganization.id, user.uid);
      setAvailableLists(listsData);
      
      // Lade bestehende Kampagne
      const campaign = await prService.getById(campaignId);
      if (campaign) {
        setExistingCampaign(campaign);
        
        // Lade erweiterte Approval-Daten mit feedbackHistory wenn ShareId vorhanden
        if (campaign.approvalData?.shareId && campaign.approvalData.shareId !== '') {
          try {
            const campaignWithFeedback = await prService.getCampaignByShareId(campaign.approvalData.shareId);
            if (campaignWithFeedback?.approvalData?.feedbackHistory) {
              campaign.approvalData.feedbackHistory = campaignWithFeedback.approvalData.feedbackHistory;
            } else {
            }
          } catch (error) {
          }
        } else {
          // Für alte Kampagnen: Erstelle eine minimale feedbackHistory aus vorhandenen Daten
          if (campaign.approvalData && 'customerApprovalMessage' in campaign.approvalData && campaign.approvalData.customerApprovalMessage) {
            const legacyFeedback = [{
              comment: campaign.approvalData.customerApprovalMessage,
              requestedAt: (campaign.updatedAt || campaign.createdAt) as any,
              author: 'Ihre Nachricht (Legacy)'
            }];
            setPreviousFeedback(legacyFeedback);
          }
        }
        
        // Setze alle Formular-Felder mit Kampagnen-Daten
        setCampaignTitle(campaign.title || '');
        setPressReleaseContent(campaign.contentHtml || '');
        setEditorContent(campaign.mainContent || '');
        setKeywords(campaign.keywords || []);
        setSelectedCompanyId(campaign.clientId || '');
        setSelectedCompanyName(campaign.clientName || '');
        setSelectedProjectId(campaign.projectId || '');

        // 🔥 WICHTIG: Kunde aus Projekt laden wenn Campaign projekt-verknüpft ist
        if (campaign.projectId) {
          // Lade Projekt und extrahiere echten Kunden (auch wenn Campaign schon clientName hat)
          try {
            const { projectService } = await import('@/lib/firebase/project-service');
            const project = await projectService.getById(campaign.projectId, {
              organizationId: currentOrganization.id
            });

            if (project?.customer?.id && project?.customer?.name) {
              setSelectedCompanyId(project.customer.id);
              setSelectedCompanyName(project.customer.name);
              setSelectedProject(project);
            }
          } catch (error) {
            // Error handling without logging
          }
        }
        setSelectedListIds(campaign.distributionListIds || []);
        setSelectedListNames(campaign.distributionListNames || []);
        setListRecipientCount(campaign.recipientCount || 0);
        setManualRecipients(campaign.manualRecipients || []);
        setAttachedAssets(campaign.attachedAssets || []);
        setKeyVisual(campaign.keyVisual);
        // Konvertiere CampaignBoilerplateSection zu BoilerplateSection und lade Inhalte
        const convertedSections: BoilerplateSection[] = await Promise.all(
          (campaign.boilerplateSections || []).map(async section => {
            let content = section.content;
            let boilerplate = null;
            
            // Wenn kein Content vorhanden, aber boilerplateId da ist, lade den Inhalt
            if (!content && section.boilerplateId) {
              try {
                boilerplate = await boilerplatesService.getById(section.boilerplateId);
                content = boilerplate?.content || boilerplate?.description || '';
              } catch (error) {
              }
            }
            
            return {
              id: section.id,
              type: section.type || 'boilerplate',
              boilerplateId: section.boilerplateId,
              content,
              metadata: section.metadata,
              order: section.order,
              isLocked: section.isLocked,
              isCollapsed: section.isCollapsed || false,
              customTitle: section.customTitle,
              // Speichere auch das geladene Boilerplate-Objekt für die Anzeige
              boilerplate: boilerplate || undefined
            };
          })
        );
        setBoilerplateSections(convertedSections);
        
        // Load team members and find campaign admin
        const members = await teamMemberEnhancedService.getAll(currentOrganization.id);

        // Find current admin (campaign creator)
        const admin = members.find(member => member.userId === campaign.userId);
        setCampaignAdmin(admin as any || null);
        
        // Setze gespeicherten PR-Score falls vorhanden
        if (campaign.seoMetrics?.prScore) {
          setRealPrScore({
            totalScore: campaign.seoMetrics.prScore,
            breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 },
            hints: campaign.seoMetrics.prHints || [],
            keywordMetrics: []
          });
        }
        
        // Setze Approval-Daten falls vorhanden
        if (campaign.approvalData) {
          setApprovalData({
            customerApprovalRequired: 'customerApprovalRequired' in campaign.approvalData ? campaign.approvalData.customerApprovalRequired : false,
            customerContact: 'customerContact' in campaign.approvalData ? campaign.approvalData.customerContact : undefined,
            // Nachrichtenfeld beim Editieren leer lassen für neue Nachricht
            customerApprovalMessage: ''
          });
          
          // Lade bisherigen Feedback-Verlauf falls vorhanden
          if (campaign.approvalData.feedbackHistory) {
            setPreviousFeedback(campaign.approvalData.feedbackHistory);
          }
        }
      }

      // Lade Edit-Lock Status
      await loadEditLockStatus(campaignId);
      
    } catch (error) {
      toastService.error('Kampagne konnte nicht geladen werden');
    } finally {
      setIsLoadingCampaign(false);
    }
  }, [user, currentOrganization, campaignId]);

  // 🆕 ENHANCED SUBMIT HANDLER mit vollständiger Edit-Lock Integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // KRITISCH: Nur in Step 4 speichern erlauben!
    if (currentStep !== 4) {
      return;
    }
    
    // 🆕 CRITICAL: Edit-Lock Prüfung vor Speicherung
    if (editLockStatus.isLocked) {
      const lockReason = editLockStatus.reason || 'unbekannt';
      toastService.warning(`Diese Kampagne kann nicht gespeichert werden. Grund: ${lockReason}`);
      return;
    }
    
    // Validierung
    const errors: string[] = [];
    if (!selectedCompanyId) {
      errors.push('Bitte wählen Sie einen Kunden aus');
    }
    // Verteiler-Auswahl ist jetzt optional - kann vor dem Versand gemacht werden
    if (!campaignTitle.trim()) {
      errors.push('Titel ist erforderlich');
    }
    if (!editorContent.trim() || editorContent === '<p></p>') {
      errors.push('Inhalt ist erforderlich');
    }
    
    if (errors.length > 0) {
      toastService.error(errors.join(', '));
      return;
    }

    setSaving(true);
    
    try {
      // 🔍 DEBUG: Aktuelle Werte vor dem Speichern

      // 🔧 FIX: Prüfe ob es eine neue oder bestehende Kampagne ist
      const urlParams = new URLSearchParams(window.location.search);
      const existingCampaignId = urlParams.get('id');
      const isNewCampaign = !existingCampaignId;
      

      // UPDATE CAMPAIGN MIT NEUER CUSTOMER-APPROVAL
      const result = await prService.updateCampaignWithNewApproval(
        campaignId,
        {
          id: existingCampaignId || undefined, // 🔧 FIX: Verwende existierende ID wenn vorhanden
          title: campaignTitle.trim(),
          contentHtml: pressReleaseContent || '',
          mainContent: editorContent,
          boilerplateSections: boilerplateSections.map((section, index) => ({
            ...section,
            position: section.position || 'custom' as const,
          })),
          clientId: selectedCompanyId,
          clientName: selectedCompanyName,
          keyVisual: keyVisual,
          attachedAssets: attachedAssets,
          distributionListId: selectedListIds[0] || '',
          distributionListName: selectedListNames[0] || '',
          distributionListIds: selectedListIds,
          distributionListNames: selectedListNames,
          recipientCount: listRecipientCount + manualRecipients.length,
          manualRecipients: manualRecipients,
          keywords: keywords,
          seoMetrics: {
            lastAnalyzed: serverTimestamp() as Timestamp,
            prScore: realPrScore?.totalScore || 0,
            prHints: realPrScore?.hints || [],
            prScoreCalculatedAt: serverTimestamp() as Timestamp,
          },
          status: 'draft' as const
        },
        {
          customerApprovalRequired: approvalData.customerApprovalRequired,
          customerContact: approvalData.customerContact,
          customerApprovalMessage: approvalData.customerApprovalMessage
        },
        {
          userId: user!.uid,
          organizationId: currentOrganization!.id
        }
      );
      
      // STORE WORKFLOW RESULT
      setApprovalWorkflowResult(result);
      
      // ✅ Plan 2/9: Automatische Pipeline-PDF-Generierung für Projekt-verknüpfte Kampagnen
      if (existingCampaign?.projectId && existingCampaign.internalPDFs?.enabled) {
        try {
          const { pdfVersionsService } = await import('@/lib/firebase/pdf-versions-service');
          await pdfVersionsService.handleCampaignSave(
            campaignId,
            {
              ...existingCampaign,
              title: campaignTitle,
              mainContent: editorContent,
              contentHtml: pressReleaseContent,
              clientName: selectedCompanyName,
              internalPDFs: existingCampaign.internalPDFs
            },
            { organizationId: currentOrganization!.id, userId: user!.uid }
          );
        } catch (pdfError) {
          // Nicht blockierend - Campaign-Update war erfolgreich
        }
      }
      
      // SUCCESS MESSAGE MIT CUSTOMER-WORKFLOW INFO
      if (result.workflowId && result.pdfVersionId) {
        toastService.success('Kampagne gespeichert & Kundenfreigabe angefordert! PDF-Version erstellt und Kunde wurde benachrichtigt.');
      } else {
        toastService.success('Kampagne erfolgreich gespeichert!');
      }
      
      // Navigation zurück zum Projekt (nicht mehr zu pr-tools)
      setTimeout(() => {
        // Wenn die Kampagne zu einem Projekt gehört, navigiere zum Projekt
        if (existingCampaign?.projectId) {
          router.push(`/dashboard/projects/${existingCampaign.projectId}`);
        } else {
          // Fallback: Zur Projekte-Übersicht
          router.push('/dashboard/projects');
        }
      }, 2000);

    } catch (error) {

      let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      if (error instanceof Error) {
        errorMessage = `Fehler: ${error.message}`;
      }

      toastService.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };


  // Hilfsfunktion zum Speichern als Entwurf (für PDF-Generation)
  const saveAsDraft = async (): Promise<string | null> => {
    if (!user || !currentOrganization) return null;

    try {
      // Bereite die boilerplateSections für Firebase vor (ohne position)
      const cleanedSections = boilerplateSections.map((section, index) => {
        const cleaned: any = {
          id: section.id,
          type: section.type,
          order: section.order ?? index, // Fallback auf index wenn order fehlt
          isLocked: section.isLocked || false,
          isCollapsed: section.isCollapsed || false
        };
        
        // Nur definierte Werte hinzufügen
        if (section.boilerplateId !== undefined && section.boilerplateId !== null) {
          cleaned.boilerplateId = section.boilerplateId;
        }
        if (section.content !== undefined && section.content !== null) {
          cleaned.content = section.content;
        }
        if (section.metadata !== undefined && section.metadata !== null) {
          cleaned.metadata = section.metadata;
        }
        if (section.customTitle !== undefined && section.customTitle !== null) {
          cleaned.customTitle = section.customTitle;
        }
        
        return cleaned;
      });

      // Bereite attachedAssets vor - stelle sicher, dass keine undefined timestamps drin sind
      const cleanedAttachedAssets = attachedAssets.map(asset => ({
        ...asset,
        attachedAt: asset.attachedAt || serverTimestamp()
      }));

      const campaignData = {
        organizationId: currentOrganization.id,
        title: campaignTitle.trim(),
        contentHtml: finalContentHtml || generateContentHtml(), // Verwende finale HTML oder generiere neu falls nicht vorhanden
        mainContent: editorContent || '',
        boilerplateSections: cleanedSections as any, // Type conversion for compatibility
        status: 'draft' as const,
        // Multi-List Support
        distributionListIds: selectedListIds,
        distributionListNames: selectedListNames,
        // Legacy fields (für Abwärtskompatibilität)
        distributionListId: selectedListIds[0] || '',
        distributionListName: selectedListNames[0] || '',
        recipientCount: listRecipientCount + manualRecipients.length,
        // Manual Recipients
        manualRecipients: manualRecipients,
        // SEO Data
        keywords: keywords,
        seoMetrics: {
          lastAnalyzed: serverTimestamp() as Timestamp,
          prScore: realPrScore?.totalScore || 0,
          prHints: realPrScore?.hints || [],
          prScoreCalculatedAt: serverTimestamp() as Timestamp,
        },
        clientId: selectedCompanyId || undefined,
        clientName: selectedCompanyName || undefined,
        keyVisual: keyVisual,
        attachedAssets: cleanedAttachedAssets,
        // Approval
        approvalRequired: approvalData.customerApprovalRequired || false,
        approvalData: approvalData.customerApprovalRequired ? approvalData as any : undefined,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Entferne null/undefined Werte
      Object.keys(campaignData).forEach(key => {
        if (campaignData[key as keyof typeof campaignData] === null) {
          delete campaignData[key as keyof typeof campaignData];
        }
      });

      return await prService.create(campaignData);
    } catch (error) {
      throw error;
    }
  };

  const handleAiGenerate = (result: any) => {
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }

    if (result.structured) {
      const htmlParts: string[] = [];

      if (result.structured.leadParagraph && result.structured.leadParagraph !== 'Lead-Absatz fehlt') {
        htmlParts.push(`<p><strong>${result.structured.leadParagraph}</strong></p>`);
      }

      if (result.structured.bodyParagraphs && result.structured.bodyParagraphs.length > 0) {
        const mainParagraphs = result.structured.bodyParagraphs
          .filter((paragraph: string) => paragraph && paragraph !== 'Haupttext der Pressemitteilung')
          .map((paragraph: string) => `<p>${paragraph}</p>`);

        htmlParts.push(...mainParagraphs);
      }

      if (result.structured.quote && result.structured.quote.text) {
        const quoteHtml = `<blockquote data-type="pr-quote" class="pr-quote border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
        <p>"${result.structured.quote.text}"</p>
        <footer class="text-sm text-gray-500 mt-2">— <strong>${result.structured.quote.person}</strong>, ${result.structured.quote.role}${result.structured.quote.company ? `, ${result.structured.quote.company}` : ''}</footer>
      </blockquote>`;

        htmlParts.push(quoteHtml);
      }

      if (result.structured.cta) {
        htmlParts.push(`<p><span data-type="cta-text" class="cta-text font-bold text-[#005fab]">${result.structured.cta}</span></p>`);
      }

      if (result.structured.hashtags && result.structured.hashtags.length > 0) {
        const formattedHashtags = result.structured.hashtags
          .map((hashtag: string) => {
            const cleanHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
            return `<span data-type="hashtag" class="hashtag text-blue-600 font-semibold">${cleanHashtag}</span>`;
          })
          .join(' ');

        htmlParts.push(`<p></p>`);
        htmlParts.push(`<p class="hashtags-section mt-4">${formattedHashtags}</p>`);
      }

      const fullHtmlContent = htmlParts.join('\n\n');
      setEditorContent(fullHtmlContent);
      setPressReleaseContent(fullHtmlContent);
    }

    setShowAiModal(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a =>
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
  };

  const handleGeneratePdf = async (forApproval: boolean = false) => {
    if (!user || !currentOrganization || !campaignTitle.trim()) {
      toastService.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    // Validiere erforderliche Felder bevor PDF erstellt wird
    const errors: string[] = [];
    if (!selectedCompanyId) {
      errors.push('Bitte wählen Sie einen Kunden aus');
    }
    if (!campaignTitle.trim()) {
      errors.push('Titel ist erforderlich');
    }
    if (!editorContent.trim() || editorContent === '<p></p>') {
      errors.push('Inhalt ist erforderlich');
    }
    
    if (errors.length > 0) {
      toastService.error(errors.join(', '));
      return;
    }

    if (!campaignId) {
      toastService.error('Campaign-ID nicht gefunden');
      return;
    }

    setGeneratingPdf(true);

    try {
      // ✅ VEREINFACHT: PDF direkt für echte Campaign erstellen (kein TEMP mehr)
      // Die Campaign existiert bereits mit allen korrekten Daten (projectId, clientId, etc.)
      const pdfVersionId = await pdfVersionsService.createPDFVersion(
        campaignId, // Echte Campaign-ID aus URL
        currentOrganization.id,
        {
          title: campaignTitle,
          mainContent: editorContent,
          boilerplateSections,
          keyVisual,
          clientName: selectedCompanyName,
          templateId: selectedTemplateId
        },
        {
          userId: user.uid,
          status: forApproval ? 'pending_customer' : 'draft'
        }
      );

      // PDF-Version für Vorschau laden
      const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
      setCurrentPdfVersion(newVersion);

      toastService.success('PDF erfolgreich generiert!');

    } catch (error) {
      toastService.error('Fehler bei der PDF-Erstellung');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 🆕 ENHANCED: Unlock-Request Handler
  const handleUnlockRequest = async (reason: string): Promise<void> => {
    if (!user) {
      throw new Error('User nicht verfügbar');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('id');
    
    if (!campaignId) {
      throw new Error('Campaign-ID nicht gefunden');
    }
    
    try {
      await pdfVersionsService.requestUnlock(campaignId, {
        userId: user.uid,
        displayName: user.displayName || user.email || 'Unbekannt',
        reason
      });

      toastService.success('Ihre Entsperr-Anfrage wurde an die Administratoren gesendet.');

      // Status neu laden
      await loadEditLockStatus(campaignId);
      
    } catch (error) {
      throw new Error('Die Entsperr-Anfrage konnte nicht gesendet werden.');
    }
  };

  // 🆕 ENHANCED: Retry Edit-Lock Status
  const handleRetryEditLock = async (): Promise<void> => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('id');
    
    if (campaignId) {
      await loadEditLockStatus(campaignId);
    }
  };

  if (loading) {
    return <LoadingState />;
  }


  return (
    <div>
      {/* Header */}
      {existingCampaign && (
        <CampaignHeader
          campaign={existingCampaign}
          selectedCompanyName={selectedCompanyName}
          selectedCompanyId={selectedCompanyId}
        />
      )}

      {/* Step Navigation */}
      <TabNavigation
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onGeneratePreview={handleGeneratePreview}
      />

      {/* 🆕 ENHANCED: Edit-Lock Banner */}
      {!loading && !loadingEditLock && editLockStatus.isLocked && (
        <EditLockBanner
          campaign={{ 
            editLocked: editLockStatus.isLocked,
            editLockedReason: editLockStatus.reason,
            lockedBy: editLockStatus.lockedBy,
            lockedAt: editLockStatus.lockedAt,
            unlockRequests: editLockStatus.unlockRequests
          } as PRCampaign}
          onRequestUnlock={handleUnlockRequest}
          onRetry={handleRetryEditLock}
          className="mb-6"
          showDetails={true}
        />
      )}

      {/* ✅ PIPELINE-APPROVAL BANNER (Plan 3/9) */}
      {!loading && existingCampaign?.projectId && existingCampaign.pipelineStage === 'customer_approval' && (
        <div className="mb-6 border border-orange-200 rounded-lg bg-orange-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-orange-600" />
              <Text className="font-semibold text-orange-900">
                Kunden-Freigabe erforderlich
              </Text>
              {projectApproval && (
                <Badge color="orange">
                  {getApprovalStatusText(projectApproval.status)}
                </Badge>
              )}
              {approvalLoading && (
                <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full"></div>
              )}
            </div>
            
            {!projectApproval ? (
              <div className="space-y-3">
                <Text className="text-sm text-orange-700">
                  Diese Kampagne ist Teil eines Projekts und benötigt eine Kunden-Freigabe 
                  bevor sie zur Distribution weitergeleitet werden kann.
                </Text>
                <Button onClick={handleCreateProjectApproval} disabled={approvalLoading}>
                  {approvalLoading ? 'Erstelle Freigabe...' : 'Freigabe erstellen'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-sm text-orange-700">
                      Status: <strong>{getApprovalStatusText(projectApproval.status)}</strong>
                    </Text>
                    {projectApproval.recipients?.length > 0 && (
                      <Text className="text-xs text-orange-600">
                        {projectApproval.recipients.filter((r: any) => r.status === 'approved').length}/
                        {projectApproval.recipients.length} Empfänger haben freigegeben
                      </Text>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      plain 
                      onClick={() => window.open(`/dashboard/approvals/${projectApproval.id}`)}
                    >
                      Freigabe öffnen
                    </Button>
                    {projectApproval.shareId && (
                      <Button 
                        plain 
                        onClick={() => window.open(`/freigabe/${projectApproval.shareId}`)}
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Kunden-Link
                      </Button>
                    )}
                  </div>
                </div>
                
                {projectApproval.status === 'approved' && 
                 projectApproval.pipelineApproval?.autoTransitionOnApproval && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded">
                    <Text className="text-xs text-green-700">
                      ✓ Freigabe erhalten. Projekt wird automatisch zur Distribution weitergeleitet.
                    </Text>
                  </div>
                )}
                
                {projectApproval.status === 'rejected' && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
                    <Text className="text-xs text-red-700">
                      ✗ Freigabe abgelehnt. Bitte überarbeiten Sie die Kampagne basierend auf dem Kunden-Feedback.
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Loading Edit-Lock Status */}
      {loadingEditLock && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            Prüfe Edit-Status...
          </div>
        </div>
      )}

      {/* Fehlermeldungen und Erfolgs-Nachrichten oben auf der Seite */}
      <form ref={formRef} onSubmit={(e) => {
        e.preventDefault();
        
        // BLOCKIERE ALLE AUTOMATISCHEN SUBMITS - NUR MANUELLER KLICK ERLAUBT
        return false;
      }}>
        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg border p-6">
            {/* Letzte Änderungsanforderung anzeigen */}
            {previousFeedback && previousFeedback.length > 0 && (() => {
              const lastCustomerFeedback = [...previousFeedback]
                .reverse()
                .find(f => f.author === 'Kunde');
              
              if (lastCustomerFeedback) {
                return (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-900 mb-2">
                          Letzte Änderungsanforderung vom Kunden
                        </h4>
                        <p className="text-sm text-yellow-800">
                          {lastCustomerFeedback.comment}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          {lastCustomerFeedback.requestedAt?.toDate ? 
                            new Date(lastCustomerFeedback.requestedAt.toDate()).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) :
                            ''
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <FieldGroup>
              {/* Pressemeldung */}
              <div className="mb-8 mt-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pressemeldung</h3>

                {/* KI-Assistent CTA */}
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="w-full mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <SparklesIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-white mb-1">
                          Schnellstart mit dem KI-Assistenten
                        </p>
                        <p className="text-sm text-indigo-100">
                          Erstelle einen kompletten Rohentwurf mit Titel, Lead-Absatz, Haupttext und Zitat in Sekunden
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRightIcon className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Content Composer mit SEO-Features */}
                <CampaignContentComposer
                  key={`composer-${boilerplateSections.length}`}
                  organizationId={currentOrganization!.id}
                  clientId={selectedCompanyId}
                  clientName={selectedCompanyName}
                  title={campaignTitle}
                  onTitleChange={setCampaignTitle}
                  mainContent={editorContent}
                  onMainContentChange={setEditorContent}
                  onFullContentChange={setPressReleaseContent}
                  onBoilerplateSectionsChange={setBoilerplateSections}
                  initialBoilerplateSections={boilerplateSections}
                  hideMainContentField={false}
                  hidePreview={true}
                  hideBoilerplates={true}
                  keywords={keywords}
                  onKeywordsChange={setKeywords}
                  onSeoScoreChange={(scoreData: any) => {
                    // Stelle sicher, dass social Property vorhanden ist
                    if (scoreData && scoreData.breakdown) {
                      setRealPrScore({
                        ...scoreData,
                        breakdown: {
                          ...scoreData.breakdown,
                          social: scoreData.breakdown.social || 0
                        }
                      });
                    } else {
                      setRealPrScore(scoreData);
                    }
                  }}
                />
                </div>
              </div>

              {/* Key Visual */}
              <div className="mt-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <KeyVisualSection
                    value={keyVisual}
                    onChange={handleKeyVisualChange}
                    clientId={selectedCompanyId}
                    clientName={selectedCompanyName}
                    organizationId={currentOrganization!.id}
                    userId={user!.uid}

                    // Campaign Smart Router Props für strukturierte Uploads
                    campaignId={campaignId}
                    campaignName={campaignTitle}
                    selectedProjectId={selectedProjectId}
                    selectedProjectName={selectedProject?.title}
                    enableSmartRouter={true}
                  />
                </div>

              </div>
            </FieldGroup>
          </div>
        )}

        {/* Step 2: Anhänge */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg border p-6">
            <FieldGroup>
              {/* Textbausteine */}
              <div className="mb-6">
                <SimpleBoilerplateLoader
                  organizationId={currentOrganization!.id}
                  clientId={selectedCompanyId}
                  clientName={selectedCompanyName}
                  onSectionsChange={setBoilerplateSections}
                  initialSections={boilerplateSections}
                />
              </div>

              {/* Medien */}
              <div className="mt-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Medien</h3>
                    {selectedCompanyId && (
                      <Button
                        type="button"
                        onClick={() => setShowAssetSelector(true)}
                        color="secondary"
                        className="text-sm px-3 py-1.5"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Medien hinzufügen
                      </Button>
                    )}
                  </div>
                
                {attachedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {attachedAssets.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          {attachment.type === 'folder' ? (
                            <FolderIcon className="h-5 w-5 text-gray-400" />
                          ) : attachment.metadata.fileType?.startsWith('image/') ? (
                            <img
                              src={attachment.metadata.thumbnailUrl}
                              alt={attachment.metadata.fileName}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {attachment.metadata.fileName || attachment.metadata.folderName}
                            </p>
                            {attachment.type === 'folder' && (
                              <Badge color="blue" className="text-xs">Ordner</Badge>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(attachment.assetId || attachment.folderId || '')}
                          className="text-red-600 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
                    onClick={() => {
                      if (selectedCompanyId) {
                        setShowAssetSelector(true);
                      } else {
                        // Zeige Fehlermeldung wenn kein Kunde ausgewählt
                        toastService.error('Bitte wählen Sie zuerst einen Kunden aus, um Medien hinzuzufügen');
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <PhotoIcon className="h-10 w-10 text-gray-400 group-hover:text-[#005fab] mb-2" />
                      <p className="text-gray-600 group-hover:text-[#005fab] font-medium">
                        {selectedCompanyId ? 'Medien hinzufügen' : 'Zuerst Kunden auswählen'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedCompanyId ? 'Klicken zum Auswählen' : 'Wählen Sie einen Kunden aus'}
                      </p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </FieldGroup>
          </div>
        )}

        {/* Step 3: Freigaben */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg border p-6">
            <FieldGroup>
              {/* Freigabe-Einstellungen */}
              <div className="mb-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Freigabe-Einstellungen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.
                  </p>
                </div>
                <ApprovalSettings
                  value={approvalData}
                  onChange={setApprovalData}
                  organizationId={currentOrganization!.id}
                  clientId={selectedCompanyId}
                  clientName={selectedCompanyName}
                  previousFeedback={previousFeedback}
                />
              </div>
              
              {/* PDF-WORKFLOW STATUS PREVIEW */}
              {pdfWorkflowPreview.enabled && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-900 mb-2">
                        ✅ PDF-Workflow bereit
                      </h4>
                      <Text className="text-sm text-green-700 mb-3">
                        Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:
                      </Text>
                      
                      <div className="space-y-2">
                        {pdfWorkflowPreview.estimatedSteps.map((step, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                            <ArrowRightIcon className="h-4 w-4" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <Text className="text-xs text-green-600">
                          💡 Tipp: Nach dem Speichern finden Sie alle Freigabe-Links und den aktuellen 
                          Status in Step 4 &ldquo;Vorschau&rdquo;.
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </FieldGroup>
          </div>
        )}

        {/* Step 4: Vorschau */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg border p-6">
            
            
            {/* PDF-WORKFLOW STATUS BANNER */}
            {approvalWorkflowResult && approvalWorkflowResult.workflowId && (
              <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <ClockIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Freigabe-Workflow aktiv
                    </h4>
                    <Text className="text-sm text-green-700 mb-3">
                      Die Kampagne befindet sich im Freigabe-Prozess. Links wurden versendet.
                    </Text>
                    
                    <div className="flex flex-wrap gap-2">
                      {approvalWorkflowResult.shareableLinks?.team && (
                        <Button
                          plain
                          onClick={() => window.open(approvalWorkflowResult.shareableLinks!.team!, '_blank')}
                          className="text-xs text-green-700 hover:text-green-800"
                        >
                          <UserGroupIcon className="h-3 w-3 mr-1" />
                          Team-Link öffnen
                        </Button>
                      )}
                      
                      {approvalWorkflowResult.shareableLinks?.customer && (
                        <Button
                          plain
                          onClick={() => window.open(approvalWorkflowResult.shareableLinks!.customer!, '_blank')}
                          className="text-xs text-green-700 hover:text-green-800"
                        >
                          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                          Kunden-Link öffnen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Live Vorschau - Mit CampaignPreviewStep Komponente */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live-Vorschau</h3>
              
              <CampaignPreviewStep
                campaignTitle={campaignTitle}
                finalContentHtml={finalContentHtml}
                keyVisual={keyVisual}
                selectedCompanyName={selectedCompanyName}
                campaignAdminName={campaignAdmin?.displayName || campaignAdmin?.email || 'Unbekannt'}
                realPrScore={realPrScore}
                keywords={keywords}
                boilerplateSections={boilerplateSections}
                attachedAssets={attachedAssets}
                editorContent={editorContent}
                approvalData={approvalData}
                organizationId={currentOrganization?.id}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                showTemplateSelector={true}
              />
            </div>
            
            {/* PDF-Vorschau und Versionen-Historie */}
            <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">PDF-Vorschau und Versionen</h3>
                
                {/* WORKFLOW-STATUS INDICATOR */}
                {approvalWorkflowResult?.pdfVersionId ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>PDF für Freigabe erstellt</span>
                  </div>
                ) : !editLockStatus.isLocked ? (
                  <Button
                    type="button"
                    onClick={() => handleGeneratePdf(false)}
                    disabled={generatingPdf}
                    color="secondary"
                  >
                    {generatingPdf ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        PDF wird erstellt...
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                        PDF generieren
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <LockClosedIcon className="h-4 w-4" />
                    PDF-Erstellung gesperrt - {editLockStatus.reason ? EDIT_LOCK_CONFIG[editLockStatus.reason]?.label : 'Bearbeitung nicht möglich'}
                  </div>
                )}
              </div>
              
              {/* Aktuelle PDF-Version */}
              {currentPdfVersion && (
                <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Vorschau PDF</span>
                          <Badge color="blue" className="text-xs">
                            {approvalWorkflowResult?.pdfVersionId ? 'Freigabe-PDF' : 'Aktuell'}
                          </Badge>
                        </div>
                        {approvalWorkflowResult?.workflowId && (
                          <div className="text-sm text-blue-700">
                            Workflow aktiv
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        color={currentPdfVersion.status === 'draft' ? 'zinc' : 
                              currentPdfVersion.status === 'approved' ? 'green' : 'amber'} 
                        className="text-xs"
                      >
                        {currentPdfVersion.status === 'draft' ? 'Entwurf' :
                         currentPdfVersion.status === 'approved' ? 'Freigegeben' : 'Freigabe angefordert'}
                      </Badge>
                      
                      <Button
                        type="button"
                        plain
                        onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}
                        className="!text-gray-600 hover:!text-gray-900 text-sm"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* PDF-Hinweis */}
              {!currentPdfVersion && (
                <div className="text-center py-6 text-gray-500">
                  <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Noch keine PDF-Version erstellt</p>
                  <p className="text-sm">Klicken Sie auf &ldquo;PDF generieren&rdquo; um eine Vorschau zu erstellen</p>
                </div>
              )}
              
              {/* PDF-Versionen Historie - innerhalb derselben Box */}
              {campaignId && currentOrganization && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-base font-semibold mb-4 text-gray-900">
                    PDF-Versionen Historie
                  </h4>
                  <PDFVersionHistory
                    campaignId={campaignId}
                    organizationId={currentOrganization.id}
                    showActions={true}
                  />
                </div>
              )}
            </div>
            
            {/* ✅ Plan 2/9: Pipeline-PDF-Viewer für Projekt-verknüpfte Kampagnen */}
            {existingCampaign?.projectId && currentOrganization && (
              <div className="mt-8">
                <PipelinePDFViewer
                  campaign={existingCampaign}
                  organizationId={currentOrganization.id}
                  onPDFGenerated={(pdfUrl) => {
                    // PDF generated successfully
                  }}
                />
              </div>
            )}
            
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          <div className="flex gap-3">
            <Button 
              type="button" 
              onClick={() => {
                // Zurück zum Projekt oder zur Projekte-Übersicht
                if (existingCampaign?.projectId) {
                  router.push(`/dashboard/projects/${existingCampaign.projectId}`);
                } else {
                  router.push('/dashboard/projects');
                }
              }}
              plain
              className="!bg-gray-50 hover:!bg-gray-100 !text-gray-700 !border !border-gray-300"
            >
              Abbrechen
            </Button>
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-900"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => handleStepTransition((currentStep + 1) as 1 | 2 | 3 | 4)}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                Weiter
                <ArrowLeftIcon className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e: React.MouseEvent) => {
                  handleSubmit(e as any);
                }}
                disabled={saving || editLockStatus.isLocked}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Speichert...
                  </>
                ) : approvalData.customerApprovalRequired ? (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Freigabe anfordern
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Als Entwurf speichern
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Asset Selector Modal */}
      {user && selectedCompanyId && (
        <AssetSelectorModal
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={selectedCompanyId}
          clientName={selectedCompanyName}
          onAssetsSelected={setAttachedAssets}
          organizationId={currentOrganization!.id}
          legacyUserId={user.uid}
          selectionMode="multiple"
          onUploadSuccess={() => {
            // Optional: Refresh or additional logic after upload
          }}

          // Campaign Smart Router Props für strukturierte Uploads
          campaignId={campaignId}
          campaignName={campaignTitle}
          selectedProjectId={selectedProjectId}
          selectedProjectName={selectedProject?.title}
          uploadType="attachment"
          enableSmartRouter={true}
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: ''
          }}
          organizationId={currentOrganization?.id}
          dokumenteFolderId={dokumenteFolderId}
        />
      )}

      {/* Asset-Migration Dialog */}
      <ProjectAssignmentMigrationDialog
        isOpen={showMigrationDialog}
        onClose={() => {
          setShowMigrationDialog(false);
          setPendingProjectId('');
          setPendingProject(null);
        }}
        onConfirm={async () => {
          if (!existingCampaign || !pendingProjectId || !currentOrganization || !user) return;

          setIsMigrating(true);

          try {
            // Führe Migration über neue API durch
            const response = await fetch('/api/migrate-campaign-assets-v2', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                campaignId: existingCampaign.id,
                projectId: pendingProjectId,
                organizationId: currentOrganization.id,
                userId: user.uid
              })
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(`API-Fehler: ${result.errors?.[0]?.error || response.statusText}`);
            }

            if (!result.success) {
              throw new Error(`Migration-Vorbereitung fehlgeschlagen: ${result.errors?.[0]?.error || 'Unbekannter Fehler'}`);
            }

            // Jetzt die echten Frontend-Uploads durchführen
            if (result.preparedAssets && result.preparedAssets.length > 0) {
              const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
              const { storage } = await import('@/lib/firebase/config');
              const { doc, updateDoc, setDoc, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase/config');

              let successCount = 0;
              const errors: string[] = [];

              for (const preparedAsset of result.preparedAssets) {
                try {

                  // Verwende Base64-Daten von der API (CORS-Umgehung)
                  const base64Data = preparedAsset.base64Data;
                  const contentType = preparedAsset.contentType;

                  // Konvertiere Base64 zu Blob (für mediaService)
                  const binaryString = atob(base64Data);
                  const arrayBuffer = new ArrayBuffer(binaryString.length);
                  const uint8Array = new Uint8Array(arrayBuffer);
                  for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                  }

                  const blob = new Blob([uint8Array], { type: contentType });
                  const file = new File([blob], preparedAsset.fileName, { type: contentType });

                  // Verwende mediaService für Upload (hat User-Auth)
                  const { mediaService } = await import('@/lib/firebase/media-service');
                  const uploadedAsset = await mediaService.uploadClientMedia(
                    file,
                    currentOrganization.id,
                    existingCampaign.clientId,
                    preparedAsset.targetFolderId,
                    undefined,
                    {
                      userId: user.uid,
                      description: `Migriert von Campaign ${existingCampaign.id}`,
                      originalAssetId: preparedAsset.id
                    }
                  );

                  // Firestore Updates je nach Asset-Typ
                  if (preparedAsset.type === 'pdf') {
                    // PDF Version aktualisieren
                    await updateDoc(doc(db, 'pdf_versions', preparedAsset.id), {
                      downloadUrl: uploadedAsset.downloadUrl,
                      storagePath: uploadedAsset.storagePath,
                      folderId: preparedAsset.targetFolderId,
                      migratedAt: serverTimestamp(),
                      isMigrated: true
                    });
                  } else if (preparedAsset.type === 'keyVisual') {
                    // Key Visual in Campaign aktualisieren
                    await updateDoc(doc(db, 'pr_campaigns', existingCampaign.id), {
                      'keyVisual.assetId': uploadedAsset.id,
                      'keyVisual.url': uploadedAsset.downloadUrl
                    });
                  } else if (preparedAsset.type === 'attachment') {
                    // Attached Assets aktualisieren
                    const attachedAssets = existingCampaign.attachedAssets || [];
                    const updatedAssets = attachedAssets.map((att: any) =>
                      att.assetId === preparedAsset.id
                        ? { ...att, assetId: uploadedAsset.id }
                        : att
                    );
                    await updateDoc(doc(db, 'pr_campaigns', existingCampaign.id), {
                      attachedAssets: updatedAssets
                    });
                  }

                  successCount++;
                } catch (error) {
                  errors.push(`${preparedAsset.fileName}: ${error}`);
                }
              }

              if (errors.length > 0) {
                throw new Error(`Migration teilweise fehlgeschlagen: ${errors.join(', ')}`);
              }
            }

            // Update Campaign in Firestore mit neuer Projekt-ID
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/config');

            await updateDoc(doc(db, 'pr_campaigns', campaignId), {
              projectId: pendingProjectId,
              updatedAt: serverTimestamp()
            });

            // Update lokale State
            setSelectedProjectId(pendingProjectId);
            setSelectedProject(pendingProject);

            // 🔥 WICHTIG: Automatisch Kunde aus Projekt übernehmen für PDF-Generierung
            if (pendingProject?.customer?.id && pendingProject?.customer?.name) {
              setSelectedCompanyId(pendingProject.customer.id);
              setSelectedCompanyName(pendingProject.customer.name);
            }

            // Zeige Erfolgs-Message
            if (result.successCount > 0) {
              toastService.success(
                `✅ ${result.successCount} ${result.successCount === 1 ? 'Asset' : 'Assets'} erfolgreich in Projekt-Ordner migriert`,
                { duration: 5000 }
              );
            }

            if (result.errors && result.errors.length > 0) {
              toastService.error(
                `⚠️ ${result.errors.length} ${result.errors.length === 1 ? 'Asset konnte' : 'Assets konnten'} nicht migriert werden`,
                { duration: 5000 }
              );
            }

            // Lade Campaign neu um aktualisierte Asset-IDs zu bekommen
            await loadData();

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toastService.error(`❌ Migration fehlgeschlagen: ${errorMessage}`);
          } finally {
            setIsMigrating(false);
            setShowMigrationDialog(false);
            setPendingProjectId('');
            setPendingProject(null);
          }
        }}
        assetCount={migrationAssetCount}
        projectName={pendingProject?.title || ''}
        isProcessing={isMigrating}
      />


      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}