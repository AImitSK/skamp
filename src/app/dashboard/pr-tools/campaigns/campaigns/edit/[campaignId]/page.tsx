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
import { approvalService } from '@/lib/firebase/approval-service';
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

  // Campaign Context - Phase 3.5: Alle Campaign-States aus Context
  const {
    campaign: existingCampaign,
    loading,
    activeTab: currentStep,
    setActiveTab: setCurrentStep,
    setCampaign: setExistingCampaign,
    reloadCampaign,
    editLockStatus,
    loadingEditLock,
    approvalLoading,
    // Content States
    campaignTitle,
    editorContent,
    pressReleaseContent,
    updateTitle,
    updateEditorContent,
    updatePressReleaseContent,
    // SEO States
    keywords,
    updateKeywords,
    seoScore,
    updateSeoScore,
    // Visual States
    keyVisual,
    updateKeyVisual,
    // Boilerplates States
    boilerplateSections,
    updateBoilerplateSections,
    // Assets States
    attachedAssets,
    updateAttachedAssets,
    removeAsset,
    // Company & Project States
    selectedCompanyId,
    selectedCompanyName,
    selectedProjectId,
    selectedProjectName,
    selectedProject,
    dokumenteFolderId,
    updateCompany,
    updateProject,
    updateDokumenteFolderId,
    // Approval States
    approvalData,
    updateApprovalData,
    previousFeedback,
    // Template States
    selectedTemplateId,
    updateSelectedTemplate,
    // PDF Generation
    generatingPdf,
    currentPdfVersion,
    generatePdf
  } = useCampaign();

  // Local loading/saving states für zusätzliche Operationen
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State (Distribution-spezifisch)
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  
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

  // Phase 3.5: ALLE Content States jetzt im Context
  // Entfernt: campaignTitle, editorContent, pressReleaseContent, keywords
  // Entfernt: boilerplateSections, attachedAssets, keyVisual
  // Entfernt: selectedCompanyId, selectedCompanyName, selectedProjectId
  // Entfernt: selectedProject, dokumenteFolderId
  // Entfernt: approvalData, previousFeedback, selectedTemplateId
  // Entfernt: generatingPdf, currentPdfVersion, finalContentHtml


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
    // Phase 3.5: finalContentHtml entfernt - wird jetzt in PreviewTab mit useMemo berechnet
    setCurrentStep(4);
  };

  // 🆕 Template-Select Handler
  const handleTemplateSelect = (templateId: string, templateName: string) => {
    updateSelectedTemplate(templateId); // Phase 3.5: Context update function
  };

  // Phase 4: handlePDFWorkflowToggle() entfernt (obsolet, nicht verwendet)

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
    updateKeyVisual(newKeyVisual); // Phase 3.5: Context update function
  };

  const [campaignAdmin, setCampaignAdmin] = useState<TeamMember | null>(null);

  // UI State
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  // Phase 3.5: realPrScore entfernt - verwende seoScore aus Context
  
  // PR-Score automatisch aktualisieren wenn Inhalt sich ändert
  // Phase 3.5: Verwendet Context States (campaignTitle, editorContent, keywords)
  useEffect(() => {
    const calculatePrScore = () => {
      const content = `${campaignTitle || ''}\n\n${editorContent || ''}`.trim();
      if (!content || content.length < 50) {
        updateSeoScore({
          totalScore: 28,
          breakdown: { headline: 20, keywords: 0, structure: 0, relevance: 40, concreteness: 40, engagement: 20, social: 0 },
          hints: ['Fügen Sie mehr Inhalt hinzu', 'Verwenden Sie aussagekräftige Keywords'],
          keywordMetrics: []
        });
        return;
      }

      const hints: string[] = [];
      const breakdown = {
        headline: 0,
        keywords: 0,
        structure: 0,
        relevance: 0,
        concreteness: 0,
        engagement: 0,
        social: 0
      };

      // 1. Headline-Bewertung (0-100)
      if (campaignTitle) {
        const titleLength = campaignTitle.length;
        if (titleLength >= 30 && titleLength <= 60) {
          breakdown.headline = 100;
        } else if (titleLength >= 20 && titleLength < 30) {
          breakdown.headline = 70;
        } else if (titleLength > 60 && titleLength <= 80) {
          breakdown.headline = 80;
        } else if (titleLength < 20) {
          breakdown.headline = 40;
          hints.push('Titel sollte mindestens 30-60 Zeichen haben');
        } else {
          breakdown.headline = 50;
          hints.push('Titel ist zu lang (optimal: 30-60 Zeichen)');
        }
      } else {
        breakdown.headline = 0;
        hints.push('Fügen Sie einen aussagekräftigen Titel hinzu');
      }

      // 2. Keywords-Bewertung (0-100)
      if (keywords.length >= 3) {
        breakdown.keywords = 50;
        const contentLower = content.toLowerCase();
        const keywordsFound = keywords.filter(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );

        if (keywordsFound.length === keywords.length) {
          breakdown.keywords = 100;
        } else if (keywordsFound.length >= keywords.length * 0.6) {
          breakdown.keywords = 75;
          hints.push('Verwenden Sie alle Keywords im Text');
        } else {
          breakdown.keywords = 50;
          hints.push('Keywords sollten im Text verwendet werden');
        }
      } else if (keywords.length > 0) {
        breakdown.keywords = 40;
        hints.push('Definieren Sie mindestens 3 SEO-Keywords');
      } else {
        breakdown.keywords = 0;
        hints.push('Definieren Sie SEO-Keywords für bessere Auffindbarkeit');
      }

      // 3. Struktur-Bewertung (0-100)
      const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
      const hasList = content.includes('<ul>') || content.includes('<ol>');

      if (paragraphs.length >= 3) {
        breakdown.structure = 70;
        if (hasList) {
          breakdown.structure = 100;
        }
      } else if (paragraphs.length >= 2) {
        breakdown.structure = 50;
        hints.push('Gliedern Sie den Text in mindestens 3 Absätze');
      } else {
        breakdown.structure = 30;
        hints.push('Gliedern Sie den Text in mehrere Absätze');
      }

      // 4. Relevanz-Bewertung (Content-Länge) (0-100)
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount >= 300 && wordCount <= 800) {
        breakdown.relevance = 100;
      } else if (wordCount >= 200 && wordCount < 300) {
        breakdown.relevance = 75;
        hints.push('Optimal wären 300-800 Wörter');
      } else if (wordCount >= 100 && wordCount < 200) {
        breakdown.relevance = 50;
        hints.push('Pressemitteilung sollte mindestens 200 Wörter haben');
      } else if (wordCount > 800) {
        breakdown.relevance = 80;
        hints.push('Sehr langer Text - erwägen Sie Kürzung auf 300-800 Wörter');
      } else {
        breakdown.relevance = 30;
        hints.push('Text ist zu kurz (mindestens 200 Wörter empfohlen)');
      }

      // 5. Konkretheit-Bewertung (Basis-Bewertung) (0-100)
      const hasNumbers = /\d+/.test(content);
      const hasQuotes = content.includes('"') || content.includes('„');

      breakdown.concreteness = 60; // Basis
      if (hasNumbers) breakdown.concreteness += 20;
      if (hasQuotes) breakdown.concreteness += 20;

      if (!hasNumbers) hints.push('Verwenden Sie konkrete Zahlen und Fakten');
      if (!hasQuotes) hints.push('Zitate erhöhen die Glaubwürdigkeit');

      // 6. Engagement-Bewertung (0-100)
      const hasCallToAction = /kontakt|information|website|besuchen|erfahren/i.test(content);
      breakdown.engagement = hasCallToAction ? 80 : 50;

      if (!hasCallToAction) {
        hints.push('Call-to-Action hinzufügen (Kontakt, Website, etc.)');
      }

      // 7. Social-Bewertung (0-100)
      const hasSocialElements = keywords.length >= 3 && campaignTitle.length >= 30 && wordCount >= 200;
      breakdown.social = hasSocialElements ? 80 : 40;

      // Gesamt-Score berechnen (Durchschnitt aller Kategorien)
      const totalScore = Math.round(
        (breakdown.headline +
         breakdown.keywords +
         breakdown.structure +
         breakdown.relevance +
         breakdown.concreteness +
         breakdown.engagement +
         breakdown.social) / 7
      );

      updateSeoScore({
        totalScore,
        breakdown,
        hints,
        keywordMetrics: keywords.map(keyword => ({
          keyword,
          count: (content.match(new RegExp(keyword, 'gi')) || []).length
        }))
      });
    };

    const timeoutId = setTimeout(calculatePrScore, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [campaignTitle, editorContent, keywords, updateSeoScore]);

  // Phase 4: Obsolete PDF-Workflow States entfernt (nicht verwendet)
  
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
            // Phase 3.5: Context update functions
            updateProject(selectedProjectId, project.title, project);

            // NEU: Lade Dokumente-Ordner für KI-Kontext
            const projectFolders = await projectService.getProjectFolderStructure(
              selectedProjectId,
              { organizationId: currentOrganization.id }
            );
            const dokumenteFolder = projectFolders?.subfolders?.find(
              (folder: any) => folder.name === 'Dokumente'
            );
            if (dokumenteFolder) {
              updateDokumenteFolderId(dokumenteFolder.id); // Phase 3.5: Context update function
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

  // Phase 3.5: Edit-Lock Status wird jetzt vom Context geladen
  // loadEditLockStatus() entfernt - nicht mehr benötigt

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

      const approval = await approvalService.createPipelineApproval(approvalData as any, {
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

  // Phase 3.5: Stark vereinfacht - nur Distribution-spezifische Daten
  const loadData = useCallback(async () => {
    if (!user || !currentOrganization) return;
    setIsLoadingCampaign(true);
    try {
      // 1. Lade Verteiler-Listen (Distribution-spezifisch)
      const listsData = await listsService.getAll(currentOrganization.id, user.uid);
      setAvailableLists(listsData);

      // 2. Hole Campaign aus Context (wird bereits von Context.loadCampaign() geladen)
      if (existingCampaign) {
        // Setze Distribution-Daten aus Campaign
        setSelectedListIds(existingCampaign.distributionListIds || []);
        setSelectedListNames(existingCampaign.distributionListNames || []);
        setListRecipientCount(existingCampaign.recipientCount || 0);
        setManualRecipients(existingCampaign.manualRecipients || []);

        // 3. Load team members and find campaign admin (page-spezifisch)
        const members = await teamMemberEnhancedService.getAll(currentOrganization.id);
        const admin = members.find(member => member.userId === existingCampaign.userId);
        setCampaignAdmin(admin as any || null);

        // Phase 3.5: PR-Score wird jetzt vom Context geladen (Context.loadCampaign() setzt seoScore)
      }

    } catch (error) {
      toastService.error('Daten konnten nicht geladen werden');
    } finally {
      setIsLoadingCampaign(false);
    }
  }, [user, currentOrganization, existingCampaign]);

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
            prScore: seoScore?.totalScore || 0, // Phase 3.5: Context seoScore
            prHints: seoScore?.hints || [], // Phase 3.5: Context seoScore
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

      // Phase 4: approvalWorkflowResult entfernt (obsolet)

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


  // Phase 4: saveAsDraft() entfernt (obsolet, wurde nirgendwo aufgerufen)

  const handleAiGenerate = (result: any) => {
    if (result.structured?.headline) {
      updateTitle(result.structured.headline); // Phase 3.5: Context update function
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
      updateEditorContent(fullHtmlContent); // Phase 3.5: Context update function
      updatePressReleaseContent(fullHtmlContent); // Phase 3.5: Context update function
    }

    setShowAiModal(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    // Phase 3.5: Context hat bereits removeAsset() Funktion
    removeAsset(assetId);
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

    // Phase 3.5: Diese Funktion könnte komplett durch Context generatePdf() ersetzt werden
    // Für jetzt verwenden wir die Context-Funktion direkt
    await generatePdf();
  };

  // 🆕 ENHANCED: Manual Approval Handler
  const handleGrantManualApproval = async (reason: string): Promise<void> => {
    if (!user) {
      throw new Error('User nicht verfügbar');
    }

    if (!campaignId) {
      throw new Error('Campaign-ID nicht gefunden');
    }

    try {
      // Hole Approval für diese Kampagne
      const approval = await approvalService.getApprovalByCampaignId(campaignId);

      if (!approval) {
        throw new Error('Keine Freigabe-Anfrage gefunden');
      }

      // Erteile manuelle Freigabe
      await approvalService.grantManualApproval(
        approval.id!,
        {
          organizationId: params.organizationId,
          userId: user.uid,
          displayName: user.displayName || user.email || 'Unbekannt',
          email: user.email || ''
        },
        reason
      );

      toastService.success('Freigabe erfolgreich erteilt. Die Kampagne kann nun bearbeitet werden.');

      // Context neu laden
      await reloadCampaign();

    } catch (error: any) {
      toastService.error(error.message || 'Die Freigabe konnte nicht erteilt werden.');
      throw error;
    }
  };

  // 🆕 ENHANCED: Request Manual Changes Handler
  const handleRequestManualChanges = async (reason: string): Promise<void> => {
    if (!user) {
      throw new Error('User nicht verfügbar');
    }

    if (!campaignId) {
      throw new Error('Campaign-ID nicht gefunden');
    }

    try {
      // Hole Approval für diese Kampagne
      const approval = await approvalService.getApprovalByCampaignId(campaignId);

      if (!approval) {
        throw new Error('Keine Freigabe-Anfrage gefunden');
      }

      // Setze Status auf "Änderungen erbeten"
      await approvalService.requestManualChanges(
        approval.id!,
        {
          organizationId: params.organizationId,
          userId: user.uid,
          displayName: user.displayName || user.email || 'Unbekannt',
          email: user.email || ''
        },
        reason
      );

      toastService.success('Änderungen erbeten. Die Kampagne kann nun bearbeitet werden.');

      // Context neu laden
      await reloadCampaign();

    } catch (error: any) {
      toastService.error(error.message || 'Änderungen konnten nicht angefordert werden.');
      throw error;
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
          onGrantApproval={handleGrantManualApproval}
          onRequestChanges={handleRequestManualChanges}
          className="mb-6"
          showDetails={true}
        />
      )}

      {/* ✅ PIPELINE-APPROVAL BANNER (Plan 3/9) */}
      {!loading && existingCampaign?.projectId && (existingCampaign.pipelineStage as any) === 'customer_approval' && (
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
        {/* Step 1: Pressemeldung */}
        {currentStep === 1 && (
          <ContentTab
            organizationId={currentOrganization!.id}
            userId={user!.uid}
            campaignId={campaignId}
            onOpenAiModal={() => setShowAiModal(true)}
            onSeoScoreChange={(scoreData: any) => {
              // Handle SEO score updates
            }}
          />
        )}

        {/* Step 2: Anhänge */}
        {currentStep === 2 && (
          <AttachmentsTab
            organizationId={currentOrganization!.id}
            onOpenAssetSelector={() => setShowAssetSelector(true)}
          />
        )}

        {/* Step 3: Freigaben */}
        {currentStep === 3 && (
          <ApprovalTab
            organizationId={currentOrganization!.id}
          />
        )}

        {/* Step 4: Vorschau */}
        {currentStep === 4 && (
          <PreviewTab
            organizationId={currentOrganization!.id}
            campaignId={campaignId}
          />
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
          onAssetsSelected={updateAttachedAssets} // Phase 3.5: Context update function
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
                    existingCampaign.clientId!,
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
                    await updateDoc(doc(db, 'pr_campaigns', existingCampaign.id!), {
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
                    await updateDoc(doc(db, 'pr_campaigns', existingCampaign.id!), {
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

            // Phase 3.5: Context update functions
            if (pendingProject) {
              updateProject(pendingProjectId, pendingProject.title, pendingProject);
            }

            // 🔥 WICHTIG: Automatisch Kunde aus Projekt übernehmen für PDF-Generierung
            if (pendingProject?.customer?.id && pendingProject?.customer?.name) {
              updateCompany(pendingProject.customer.id, pendingProject.customer.name);
            }

            // Zeige Erfolgs-Message
            if (result.successCount > 0) {
              toastService.success(
                `✅ ${result.successCount} ${result.successCount === 1 ? 'Asset' : 'Assets'} erfolgreich in Projekt-Ordner migriert`
              );
            }

            if (result.errors && result.errors.length > 0) {
              toastService.error(
                `⚠️ ${result.errors.length} ${result.errors.length === 1 ? 'Asset konnte' : 'Assets konnten'} nicht migriert werden`
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