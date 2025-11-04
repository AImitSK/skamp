// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/CampaignContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PRCampaign, EditLockData, KeyVisualData, CampaignAssetAttachment } from '@/types/pr';
import { prService } from '@/lib/firebase/pr-service';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { toastService } from '@/lib/utils/toast';
import { BoilerplateSection } from '@/components/pr/campaign/SimpleBoilerplateLoader';
import { Project } from '@/types/project';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';

/**
 * Campaign Context für zentrales State Management der Campaign Edit Page
 *
 * Phase 3: Erweitert mit Content, SEO, Attachments, Approval States
 *
 * Verwaltet:
 * - Campaign Daten & Content
 * - Loading/Saving States
 * - Active Tab Navigation
 * - PDF Generation & Versioning
 * - Approval Workflow
 * - SEO & Keywords
 * - Assets & Boilerplates
 */

interface CampaignContextValue {
  // Core Campaign State
  campaign: PRCampaign | null;
  loading: boolean;
  saving: boolean;

  // Navigation
  activeTab: 1 | 2 | 3 | 4;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;

  // Campaign Actions
  setCampaign: (campaign: PRCampaign | null) => void;
  updateField: (field: keyof PRCampaign, value: any) => void;
  saveCampaign: () => Promise<void>;
  reloadCampaign: () => Promise<void>;

  // Content States
  campaignTitle: string;
  editorContent: string;
  pressReleaseContent: string;
  updateTitle: (title: string) => void;
  updateEditorContent: (content: string) => void;
  updatePressReleaseContent: (content: string) => void;

  // SEO States
  keywords: string[];
  updateKeywords: (keywords: string[]) => void;
  seoScore: any;
  updateSeoScore: (scoreData: any) => void;

  // Visual States
  keyVisual: KeyVisualData | undefined;
  updateKeyVisual: (visual: KeyVisualData | undefined) => void;

  // Boilerplates States
  boilerplateSections: BoilerplateSection[];
  updateBoilerplateSections: (sections: BoilerplateSection[]) => void;

  // Assets States
  attachedAssets: CampaignAssetAttachment[];
  updateAttachedAssets: (assets: CampaignAssetAttachment[]) => void;
  removeAsset: (assetId: string) => void;

  // Company & Project States
  selectedCompanyId: string;
  selectedCompanyName: string;
  selectedProjectId: string;
  selectedProjectName: string | undefined;
  selectedProject: Project | null;
  dokumenteFolderId: string | undefined;
  updateCompany: (companyId: string, companyName: string) => void;
  updateProject: (projectId: string, projectName?: string, project?: Project | null) => void;
  updateDokumenteFolderId: (folderId: string | undefined) => void;

  // Approval States
  approvalData: any;
  updateApprovalData: (data: any) => void;
  previousFeedback: any[];

  // Template States
  selectedTemplateId: string | undefined;
  updateSelectedTemplate: (templateId: string, templateName?: string) => void;

  // PDF Generation
  generatingPdf: boolean;
  currentPdfVersion: PDFVersion | null;
  generatePdf: (folderId?: string) => Promise<void>;

  // Edit Lock
  editLockStatus: EditLockData;
  loadingEditLock: boolean;

  // Approval Workflow
  approvalLoading: boolean;
  submitForApproval: () => Promise<void>;
  approveCampaign: (approved: boolean, note?: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

interface CampaignProviderProps {
  children: React.ReactNode;
  campaignId: string;
  organizationId: string;
}

export function CampaignProvider({
  children,
  campaignId,
  organizationId
}: CampaignProviderProps) {
  // Core Campaign State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

  // PDF Generation
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);

  // Edit Lock
  const [editLockStatus, setEditLockStatus] = useState<EditLockData>({
    isLocked: false,
    lockedBy: undefined,
    lockedAt: undefined,
  });
  const [loadingEditLock, setLoadingEditLock] = useState(true);

  // Approval
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Phase 3: Content States
  const [campaignTitle, setCampaignTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');

  // Phase 3: SEO States
  const [keywords, setKeywords] = useState<string[]>([]);
  const [seoScore, setSeoScore] = useState<any>(null);

  // Phase 3: Visual States
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);

  // Phase 3: Boilerplates States
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);

  // Phase 3: Assets States
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);

  // Phase 3: Company & Project States
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dokumenteFolderId, setDokumenteFolderId] = useState<string | undefined>(undefined);

  // Phase 3: Approval States
  const [approvalData, setApprovalData] = useState<any>({
    customerApprovalRequired: false,
    customerContact: undefined,
    customerApprovalMessage: ''
  });
  const [previousFeedback, setPreviousFeedback] = useState<any[]>([]);

  // Phase 3: Template States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  // Load Campaign Data - Phase 3.5: Lädt ALLE Campaign-States
  const loadCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const campaign = await prService.getById(campaignId);
      if (campaign) {
        setCampaign(campaign);

        // Lade erweiterte Approval-Daten mit feedbackHistory wenn ShareId vorhanden
        if (campaign.approvalData?.shareId && campaign.approvalData.shareId !== '') {
          try {
            const campaignWithFeedback = await prService.getCampaignByShareId(campaign.approvalData.shareId);
            if (campaignWithFeedback?.approvalData?.feedbackHistory) {
              campaign.approvalData.feedbackHistory = campaignWithFeedback.approvalData.feedbackHistory;
              setCampaign({ ...campaign });
            }
          } catch (error) {
            // Fehler beim Laden der Feedback-History - nicht kritisch
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

        // Phase 3.5: Setze ALLE Content States
        setCampaignTitle(campaign.title || '');
        setPressReleaseContent(campaign.contentHtml || '');
        setEditorContent(campaign.mainContent || '');
        setKeywords(campaign.keywords || []);
        setSelectedCompanyId(campaign.clientId || '');
        setSelectedCompanyName(campaign.clientName || '');
        setSelectedProjectId(campaign.projectId || '');
        setAttachedAssets(campaign.attachedAssets || []);
        setKeyVisual(campaign.keyVisual);

        // Lade Projekt wenn projectId vorhanden
        if (campaign.projectId) {
          try {
            const { projectService } = await import('@/lib/firebase/project-service');
            const project = await projectService.getById(campaign.projectId, {
              organizationId: organizationId
            });

            if (project) {
              setSelectedProject(project);
              setSelectedProjectName(project.title);

              // Überschreibe Kunde mit Projekt-Kunde falls vorhanden
              if (project.customer?.id && project.customer?.name) {
                setSelectedCompanyId(project.customer.id);
                setSelectedCompanyName(project.customer.name);
              }

              // Lade Dokumente-Ordner für KI-Kontext
              const projectFolders = await projectService.getProjectFolderStructure(
                campaign.projectId,
                { organizationId: organizationId }
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
                // Fehler beim Laden - nicht kritisch
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
              boilerplate: boilerplate || undefined
            };
          })
        );
        setBoilerplateSections(convertedSections);

        // Setze Approval-Daten falls vorhanden
        if (campaign.approvalData) {
          setApprovalData({
            customerApprovalRequired: 'customerApprovalRequired' in campaign.approvalData ? campaign.approvalData.customerApprovalRequired : false,
            customerContact: 'customerContact' in campaign.approvalData ? campaign.approvalData.customerContact : undefined,
            customerApprovalMessage: ''
          });

          // Lade bisherigen Feedback-Verlauf falls vorhanden
          if (campaign.approvalData.feedbackHistory) {
            setPreviousFeedback(campaign.approvalData.feedbackHistory);
          }
        }

        // Setze gespeicherten SEO-Score falls vorhanden
        if (campaign.seoMetrics?.prScore) {
          setSeoScore({
            totalScore: campaign.seoMetrics.prScore,
            breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 },
            hints: campaign.seoMetrics.prHints || [],
            keywordMetrics: []
          });
        }
      }

      // Lade Edit-Lock Status
      try {
        setLoadingEditLock(true);
        const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
        setEditLockStatus(lockStatus);
      } catch (error) {
        // Edit-Lock Fehler nicht kritisch
      } finally {
        setLoadingEditLock(false);
      }

    } catch (error) {
      toastService.error('Kampagne konnte nicht geladen werden');
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, organizationId]);

  // Load campaign on mount
  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Actions (Placeholder - werden in nächsten Tasks implementiert)
  const updateField = (field: keyof PRCampaign, value: any) => {
    setCampaign(prev => prev ? { ...prev, [field]: value } : null);
  };

  const saveCampaign = async () => {
    // Wird in Task 6 implementiert
  };

  const reloadCampaign = async () => {
    await loadCampaign();
  };

  const generatePdf = async (folderId?: string) => {
    // Wird in Task 7 implementiert
  };

  const submitForApproval = async () => {
    // Wird in Task 8 implementiert
  };

  const approveCampaign = async (approved: boolean, note?: string) => {
    // Wird in Task 9 implementiert
  };

  // Phase 3: Content Actions
  const updateTitle = useCallback((title: string) => {
    setCampaignTitle(title);
  }, []);

  const updateEditorContent = useCallback((content: string) => {
    setEditorContent(content);
  }, []);

  const updatePressReleaseContent = useCallback((content: string) => {
    setPressReleaseContent(content);
  }, []);

  // Phase 3: SEO Actions
  const updateKeywords = useCallback((newKeywords: string[]) => {
    setKeywords(newKeywords);
  }, []);

  const updateSeoScore = useCallback((scoreData: any) => {
    setSeoScore(scoreData);
  }, []);

  // Phase 3: Visual Actions
  const updateKeyVisual = useCallback((visual: KeyVisualData | undefined) => {
    setKeyVisual(visual);
  }, []);

  // Phase 3: Boilerplates Actions
  const updateBoilerplateSections = useCallback((sections: BoilerplateSection[]) => {
    setBoilerplateSections(sections);
  }, []);

  // Phase 3: Assets Actions
  const updateAttachedAssets = useCallback((assets: CampaignAssetAttachment[]) => {
    setAttachedAssets(assets);
  }, []);

  const removeAsset = useCallback((assetId: string) => {
    setAttachedAssets(prev => prev.filter(asset =>
      (asset.assetId || asset.folderId) !== assetId
    ));
  }, []);

  // Phase 3: Company & Project Actions
  const updateCompany = useCallback((companyId: string, companyName: string) => {
    setSelectedCompanyId(companyId);
    setSelectedCompanyName(companyName);
  }, []);

  const updateProject = useCallback((projectId: string, projectName?: string, project?: Project | null) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    if (project !== undefined) {
      setSelectedProject(project);
    }
  }, []);

  const updateDokumenteFolderId = useCallback((folderId: string | undefined) => {
    setDokumenteFolderId(folderId);
  }, []);

  // Phase 3: Approval Actions
  const updateApprovalData = useCallback((data: any) => {
    setApprovalData(data);
  }, []);

  // Phase 3: Template Actions
  const updateSelectedTemplate = useCallback((templateId: string, templateName?: string) => {
    setSelectedTemplateId(templateId);
  }, []);

  const value: CampaignContextValue = {
    // Core State
    campaign,
    loading,
    saving,

    // Navigation
    activeTab,
    setActiveTab,

    // Campaign Actions
    setCampaign,
    updateField,
    saveCampaign,
    reloadCampaign,

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

    // PDF
    generatingPdf,
    currentPdfVersion,
    generatePdf,

    // Edit Lock
    editLockStatus,
    loadingEditLock,

    // Approval
    approvalLoading,
    submitForApproval,
    approveCampaign,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }
  return context;
}
