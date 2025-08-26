// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
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
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon,
  XCircleIcon,
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
// PRSEOHeaderBar now integrated in CampaignContentComposer


// Einfache Alert-Komponente für diese Seite
function SimpleAlert({ type = 'info', message }: { type?: 'info' | 'error'; message: string }) {
  const Icon = type === 'error' ? XCircleIcon : InformationCircleIcon;
  const bgColor = type === 'error' ? 'bg-red-50' : 'bg-blue-50';
  const textColor = type === 'error' ? 'text-red-700' : 'text-blue-700';
  const iconColor = type === 'error' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className={`rounded-md p-4 ${bgColor}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="ml-3">
          <Text className={`text-sm ${textColor}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}


export default function EditPRCampaignPage({ params }: { params: { campaignId: string } }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const campaignId = params.campaignId;
  const [existingCampaign, setExistingCampaign] = useState<PRCampaign | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);

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
  
  // Legacy single list (für Validierung)
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedListName, setSelectedListName] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [editorContent, setEditorContent] = useState<string>(''); // Editor-Inhalt für SEO
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);
  const [approvalRequired, setApprovalRequired] = useState(false); // Legacy - wird durch approvalData ersetzt
  const [approvalData, setApprovalData] = useState<SimplifiedApprovalData>({
    customerApprovalRequired: false,
    customerContact: undefined,
    customerApprovalMessage: ''
  });

  // State für bisherigen Feedback-Verlauf
  const [previousFeedback, setPreviousFeedback] = useState<any[]>([]);

  // Debug Logging für State-Änderungen
  useEffect(() => {
    console.log('🖼️ KeyVisual State changed:', keyVisual);
  }, [keyVisual]);

  useEffect(() => {
    console.log('📝 BoilerplateSections State changed:', boilerplateSections?.length, boilerplateSections);
  }, [boilerplateSections]);

  // Content HTML Generation - kombiniert alle Komponenten zu einem HTML-String
  const generateContentHtml = (): string => {
    let html = '';
    
    // 1. Haupt-Content (Editor-Inhalt) - KeyVisual wird bereits oben separat angezeigt
    if (editorContent && editorContent.trim() && editorContent !== '<p></p>') {
      html += `<div class="main-content">${editorContent}</div>`;
    }
    
    // 2. Textbausteine (falls vorhanden)
    if (boilerplateSections && boilerplateSections.length > 0) {
      console.log('🔍 generateContentHtml - Textbausteine prüfen:', boilerplateSections.length, boilerplateSections);
      
      const visibleSections = boilerplateSections
        .filter(section => {
          console.log('🔍 Raw section object:', section);
          
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
          console.log(`🔍 Section "${title}": hasContent=${!!hasContent}, boilerplateId="${section.boilerplateId}", content="${content?.substring(0, 50)}..."`);
          
          return hasContent;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ Sichtbare Textbausteine:', visibleSections.length, visibleSections.map(s => s.customTitle || s.boilerplate?.name || '(kein Titel)'));
      
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
        console.log('❌ Keine sichtbaren Textbausteine gefunden');
      }
    } else {
      console.log('❌ Keine Textbausteine vorhanden');
    }
    
    console.log('📄 Finales HTML generiert:', html.length, 'Zeichen');
    return html;
  };

  // Generiert finale Vorschau und wechselt zu Step 4
  const handleGeneratePreview = () => {
    console.log('🔄 Generiere finale Vorschau...');
    const html = generateContentHtml();
    console.log('✅ ContentHtml generiert:', html.length, 'Zeichen');
    setFinalContentHtml(html);
    setCurrentStep(4);
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
        console.log('🔄 PDF-Workflow wird bei Speicherung aktiviert');
      }
    } else {
      setCurrentStep(targetStep);
    }
  };

  // Debug Wrapper-Funktionen
  const handleKeyVisualChange = (newKeyVisual: KeyVisualData | undefined) => {
    console.log('🖼️ KeyVisual wird geändert zu:', newKeyVisual);
    setKeyVisual(newKeyVisual);
  };

  const handleBoilerplateSectionsChange = (newSections: BoilerplateSection[]) => {
    console.log('📝 BoilerplateSections werden geändert zu:', newSections?.length, newSections);
    setBoilerplateSections(newSections);
  };

  const [keywords, setKeywords] = useState<string[]>([]); // SEO Keywords
  
  // Finales Content HTML für Vorschau (wird bei Step-Wechsel generiert)
  const [finalContentHtml, setFinalContentHtml] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [campaignAdmin, setCampaignAdmin] = useState<TeamMember | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
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
  
  // 4-Step Navigation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Debug: Track currentStep changes
  useEffect(() => {
    console.log('📊 CurrentStep changed to:', currentStep);
    console.log('🎯 UI should now show step:', currentStep, 'content');
  }, [currentStep]);
  
  // 🆕 ENHANCED PDF & EDIT-LOCK STATE
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editLocked, setEditLocked] = useState(false); // Legacy compatibility
  const [editLockStatus, setEditLockStatus] = useState<EditLockData>({
    isLocked: false,
    canRequestUnlock: false
  });
  const [loadingEditLock, setLoadingEditLock] = useState(true);
  
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


  // Entferne die problematische useEffect dependency
  useEffect(() => {
    if (user && currentOrganization) {
      loadDataNow();
    }
  }, [user, currentOrganization, campaignId]);

  const loadDataNow = async () => {
    if (!user || !currentOrganization || !campaignId) return;
    setLoading(true);
    setIsLoadingCampaign(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setValidationErrors(['Daten konnten nicht geladen werden']);
    } finally {
      setLoading(false);
      setIsLoadingCampaign(false);
    }
  };

  // 🆕 ENHANCED: Lade Edit-Lock Status
  const loadEditLockStatus = async (campaignId: string) => {
    if (!campaignId) {
      setLoadingEditLock(false);
      return;
    }
    
    try {
      setLoadingEditLock(true);
      const status = await pdfVersionsService.getEditLockStatus(campaignId);
      setEditLockStatus(status);
      setEditLocked(status.isLocked); // Legacy compatibility
    } catch (error) {
      console.error('Fehler beim Laden des Edit-Lock Status:', error);
    } finally {
      setLoadingEditLock(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!user || !currentOrganization || !campaignId) return;
    setLoading(true);
    setIsLoadingCampaign(true);
    try {
      // Lade Verteiler-Listen
      const listsData = await listsService.getAll(currentOrganization.id, user.uid);
      setAvailableLists(listsData);
      
      // Lade bestehende Kampagne
      console.log('🔄 Loading campaign and team members...');
      const campaign = await prService.getById(campaignId);
      if (campaign) {
        setExistingCampaign(campaign);
        
        // Lade erweiterte Approval-Daten mit feedbackHistory wenn ShareId vorhanden
        console.log('🔍 Checking for shareId:', campaign.approvalData?.shareId);
        if (campaign.approvalData?.shareId && campaign.approvalData.shareId !== '') {
          try {
            console.log('📥 Loading feedback history for shareId:', campaign.approvalData.shareId);
            const campaignWithFeedback = await prService.getCampaignByShareId(campaign.approvalData.shareId);
            console.log('📦 Campaign with feedback loaded:', campaignWithFeedback);
            if (campaignWithFeedback?.approvalData?.feedbackHistory) {
              campaign.approvalData.feedbackHistory = campaignWithFeedback.approvalData.feedbackHistory;
              console.log('📊 Loaded feedback history from approval:', campaignWithFeedback.approvalData.feedbackHistory);
            } else {
              console.log('⚠️ No feedbackHistory found in campaignWithFeedback');
            }
          } catch (error) {
            console.error('❌ Fehler beim Laden der Feedback-History:', error);
          }
        } else {
          console.log('⚠️ No shareId found in approvalData - this is a legacy campaign');
          // Für alte Kampagnen: Erstelle eine minimale feedbackHistory aus vorhandenen Daten
          if (campaign.approvalData && 'customerApprovalMessage' in campaign.approvalData && campaign.approvalData.customerApprovalMessage) {
            const legacyFeedback = [{
              comment: campaign.approvalData.customerApprovalMessage,
              requestedAt: (campaign.updatedAt || campaign.createdAt) as any,
              author: 'Ihre Nachricht (Legacy)'
            }];
            setPreviousFeedback(legacyFeedback);
            console.log('📝 Created legacy feedback history from customerApprovalMessage');
          }
        }
        
        // Setze alle Formular-Felder mit Kampagnen-Daten
        setCampaignTitle(campaign.title || '');
        setPressReleaseContent(campaign.contentHtml || '');
        setEditorContent(campaign.mainContent || '');
        setKeywords(campaign.keywords || []);
        setSelectedCompanyId(campaign.clientId || '');
        setSelectedCompanyName(campaign.clientName || '');
        setSelectedListIds(campaign.distributionListIds || []);
        setSelectedListNames(campaign.distributionListNames || []);
        setListRecipientCount(campaign.recipientCount || 0);
        setManualRecipients(campaign.manualRecipients || []);
        setAttachedAssets(campaign.attachedAssets || []);
        setKeyVisual(campaign.keyVisual);
        // Konvertiere CampaignBoilerplateSection zu BoilerplateSection
        const convertedSections: BoilerplateSection[] = (campaign.boilerplateSections || []).map(section => ({
          id: section.id,
          type: section.type || 'boilerplate',
          boilerplateId: section.boilerplateId,
          content: section.content,
          metadata: section.metadata,
          order: section.order,
          isLocked: section.isLocked,
          isCollapsed: section.isCollapsed || false,
          customTitle: section.customTitle
        }));
        setBoilerplateSections(convertedSections);
        
        // Load team members and find campaign admin
        console.log('👥 Loading team members for organization:', currentOrganization.id);
        const members = await teamMemberEnhancedService.getAll(currentOrganization.id);
        // Fix: Cast TeamMemberExtended[] to TeamMember[]
        setTeamMembers(members as any);
        
        // Find current admin (campaign creator)
        const admin = members.find(member => member.userId === campaign.userId);
        console.log('👤 Found campaign admin:', admin?.displayName || 'Not found', 'for userId:', campaign.userId);
        // Fix: Cast TeamMemberExtended to TeamMember
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
          console.log('📝 Edit-Page: Approval Data:', campaign.approvalData);
          console.log('💬 Edit-Page: Feedback History:', campaign.approvalData.feedbackHistory);
          if (campaign.approvalData.feedbackHistory) {
            setPreviousFeedback(campaign.approvalData.feedbackHistory);
          }
        }
        
        // Legacy Kompatibilität
        setSelectedListId(campaign.distributionListIds?.[0] || '');
        setSelectedListName(campaign.distributionListNames?.[0] || '');
        setRecipientCount(campaign.recipientCount || 0);
      }
      
      // Lade Edit-Lock Status
      await loadEditLockStatus(campaignId);
      
    } catch (error) {
      console.error('Fehler beim Laden der Kampagne:', error);
      setValidationErrors(['Kampagne konnte nicht geladen werden']);
    } finally {
      setLoading(false);
      setIsLoadingCampaign(false);
    }
  }, [user, currentOrganization, campaignId]);

  // 🆕 ENHANCED SUBMIT HANDLER mit vollständiger Edit-Lock Integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // KRITISCH: Nur in Step 4 speichern erlauben!
    if (currentStep !== 4) {
      console.log('🚫 Form-Submit verhindert - nicht in Step 4:', currentStep);
      return;
    }
    
    // 🆕 CRITICAL: Edit-Lock Prüfung vor Speicherung
    if (editLockStatus.isLocked) {
      const lockReason = editLockStatus.reason || 'unbekannt';
      alert(`Diese Kampagne kann nicht gespeichert werden. Grund: ${lockReason}`); 
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
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setSaving(true);
    
    try {
      // 🔍 DEBUG: Aktuelle Werte vor dem Speichern
      console.log('🔍 ENHANCED CAMPAIGN SAVE - Vor dem Speichern:');
      console.log('👤 User:', user?.uid);
      console.log('🏢 Organization:', currentOrganization?.id);
      console.log('📝 ApprovalData:', approvalData);

      // 🔧 FIX: Prüfe ob es eine neue oder bestehende Kampagne ist
      const urlParams = new URLSearchParams(window.location.search);
      const existingCampaignId = urlParams.get('id');
      const isNewCampaign = !existingCampaignId;
      
      console.log('🆔 Campaign ID:', campaignId);
      console.log('✏️ Updating existing campaign');

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
      
      // SUCCESS MESSAGE MIT CUSTOMER-WORKFLOW INFO
      if (result.workflowId && result.pdfVersionId) {
        setSuccessMessage(
          `Kampagne gespeichert & Kundenfreigabe angefordert! PDF-Version erstellt und Kunde wurde benachrichtigt.`
        );
      } else {
        setSuccessMessage('Kampagne erfolgreich gespeichert!');
      }
      
      // Navigation
      setTimeout(() => {
        router.push(`/dashboard/pr-tools/campaigns/campaigns/${result.campaignId}`);
      }, 2000);

    } catch (error) {

      let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      if (error instanceof Error) {
        errorMessage = `Fehler: ${error.message}`;
      }

      setValidationErrors([errorMessage]);
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
      console.error('Fehler beim Speichern als Entwurf:', error);
      throw error;
    }
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a =>
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
  };

  const handleGeneratePdf = async (forApproval: boolean = false) => {
    if (!user || !currentOrganization || !campaignTitle.trim()) {
      setValidationErrors(['Bitte füllen Sie alle erforderlichen Felder aus']);
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
      setValidationErrors(errors);
      return;
    }

    setGeneratingPdf(true);
    console.log('🔍 TEMP CAMPAIGN DEBUG: Creating temporary campaign...');
    
    try {
      // 1. Temporäre Kampagne mit generating_preview Status erstellen
      const tempCampaignData = {
        title: campaignTitle,
        contentHtml: '',
        mainContent: editorContent,
        boilerplateSections: boilerplateSections.map((section, index) => ({
          ...section,
          position: 'custom' as const,
          order: section.order ?? index
        })) as any,
        keyVisual,
        clientId: selectedCompanyId,
        clientName: selectedCompanyName,
        status: 'generating_preview' as const,
        userId: user.uid,
        organizationId: currentOrganization.id,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      };

      console.log('⏳ Temporary campaign created with status:', tempCampaignData.status);
      
      // 2. Temporäre Kampagne speichern
      const tempCampaignId = await prService.create(tempCampaignData);
      
      try {
        // 3. PDF für temporäre Kampagne generieren
        console.log('📄 PDF generated, cleaning up temporary campaign...');
        const pdfVersionId = await pdfVersionsService.createPDFVersion(
          tempCampaignId,
          currentOrganization.id,
          {
            title: campaignTitle,
            mainContent: editorContent,
            boilerplateSections,
            keyVisual,
            clientName: selectedCompanyName
          },
          {
            userId: user.uid,
            status: forApproval ? 'pending_customer' : 'draft'
          }
        );

        // 4. PDF-Version für Vorschau laden
        const newVersion = await pdfVersionsService.getCurrentVersion(tempCampaignId);
        setCurrentPdfVersion(newVersion);

        setSuccessMessage('PDF erfolgreich generiert!');
        
      } finally {
        // 5. Temporäre Kampagne IMMER löschen (auch bei Fehlern)
        try {
          await prService.delete(tempCampaignId);
          console.log('✅ Temporary campaign deleted successfully');
        } catch (deleteError) {
          console.error('⚠️ Failed to delete temporary campaign:', deleteError);
        }
      }
      
    } catch (error) {
      console.error('Fehler bei PDF-Generation:', error);
      setValidationErrors(['Fehler bei der PDF-Erstellung']);
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
      
      alert('Ihre Entsperr-Anfrage wurde an die Administratoren gesendet.');
      
      // Status neu laden
      await loadEditLockStatus(campaignId);
      
    } catch (error) {
      console.error('Fehler beim Unlock-Request:', error);
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
          <Text className="mt-4">Lade Daten...</Text>
        </div>
      </div>
    );
  }


  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Heading>PR-Kampagne bearbeiten</Heading>
        {existingCampaign && (
          <Text className="mt-2 text-gray-600">
            Bearbeite: {existingCampaign.title}
          </Text>
        )}
      </div>

      {/* Step Navigation - FUNKTIONIEREND ABER SCHÖNER */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => {
              console.log('🎯 Step 1 clicked');
              setCurrentStep(1);
            }}
            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
              currentStep === 1
                ? 'border-[#005fab] text-[#005fab]'
                : currentStep > 1
                ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Pressemeldung
            {currentStep > 1 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
          </button>
          
          <button
            type="button"
            onClick={() => {
              console.log('🎯 Step 2 clicked');
              setCurrentStep(2);
            }}
            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
              currentStep === 2
                ? 'border-[#005fab] text-[#005fab]'
                : currentStep > 2
                ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PaperClipIcon className="h-4 w-4 mr-2" />
            Anhänge
            {currentStep > 2 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
          </button>
          
          <button
            type="button"
            onClick={() => {
              console.log('🎯 Step 3 clicked');
              setCurrentStep(3);
            }}
            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
              currentStep === 3
                ? 'border-[#005fab] text-[#005fab]'
                : currentStep > 3
                ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Freigaben
            {currentStep > 3 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
          </button>
          
          <button
            type="button"
            onClick={() => {
              console.log('🎯 Step 4 clicked - generating preview');
              handleGeneratePreview();
            }}
            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
              currentStep === 4
                ? 'border-[#005fab] text-[#005fab]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Vorschau
          </button>
        </nav>
      </div>

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
      
      {/* Loading Edit-Lock Status */}
      {loadingEditLock && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            Prüfe Edit-Status...
          </div>
        </div>
      )}

      {/* Fehlermeldungen und Erfolgs-Nachrichten oben auf der Seite */}
      {validationErrors.length > 0 && (
        <div className="mb-6 animate-shake">
          <SimpleAlert type="error" message={validationErrors[0]} />
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6">
          <div className="rounded-md p-4 bg-green-50">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <Text className="text-sm text-green-700">{successMessage}</Text>
              </div>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={(e) => {
        e.preventDefault();
        console.log('🎯 AUTOMATISCHES Form-Submit Event! CurrentStep:', currentStep);
        console.log('🔍 Event Details:', e.type, 'Target:', e.target, 'Submitter:', (e as any).submitter);
        console.log('🔍 Form Elements:', Array.from((e.target as HTMLFormElement).elements).filter(el => (el as HTMLElement).getAttribute('type') === 'submit').map(el => ({ type: (el as HTMLElement).getAttribute('type'), value: (el as any).value, className: (el as HTMLElement).className })));
        
        // BLOCKIERE ALLE AUTOMATISCHEN SUBMITS - NUR MANUELLER KLICK ERLAUBT
        console.log('🚫 ALLE Form-Submits werden blockiert - nur manuelle Speichern-Clicks erlaubt');
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
              {/* Absender */}
              <div className="mb-8">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Absender</h3>
                  
                  <div className="mb-3">
                    <ModernCustomerSelector
                      value={selectedCompanyId}
                      onChange={(companyId, companyName) => {
                        setSelectedCompanyId(companyId);
                        setSelectedCompanyName(companyName);
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pressemeldung */}
              <div className="mb-8 mt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pressemeldung</h3>
                </div>

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
                  onSeoScoreChange={(scoreData: any) => setRealPrScore(scoreData)}
                />
              </div>

              {/* Key Visual */}
              <div className="mt-8">
                <KeyVisualSection
                  value={keyVisual}
                  onChange={handleKeyVisualChange}
                  clientId={selectedCompanyId}
                  clientName={selectedCompanyName}
                  organizationId={user!.uid}
                  userId={user!.uid}
                />
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
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Medien (optional)</h3>
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
                    
                    {/* Button für weitere Medien wenn bereits welche vorhanden */}
                    {selectedCompanyId && (
                      <Button
                        type="button"
                        onClick={() => setShowAssetSelector(true)}
                        color="secondary"
                        className="text-sm px-3 py-1.5 flex items-center gap-2 mt-3"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Weitere Medien hinzufügen
                      </Button>
                    )}
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
                    onClick={() => {
                      if (selectedCompanyId) {
                        setShowAssetSelector(true);
                      } else {
                        // Zeige Fehlermeldung wenn kein Kunde ausgewählt
                        setValidationErrors(['Bitte wählen Sie zuerst einen Kunden aus, um Medien hinzuzufügen']);
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
              />
            </div>
            
            {/* PDF-Vorschau */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">PDF-Vorschau</h3>
                
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
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-900">Version {currentPdfVersion.version}</span>
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
                        onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}
                        color="secondary"
                      >
                        PDF öffnen
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
            </div>
            
            {/* PDF-Versionen Historie */}
            {campaignId && currentOrganization && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  PDF-Versionen Historie
                </h3>
                <PDFVersionHistory
                  campaignId={campaignId}
                  organizationId={currentOrganization.id}
                  showActions={true}
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
              onClick={() => router.push('/dashboard/pr-tools/campaigns')}
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
                  console.log('🖱️ MANUELLER Speichern-Click!');
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
          organizationId={user.uid}
          legacyUserId={user.uid}
          selectionMode="multiple"
          onUploadSuccess={() => {
            // Optional: Refresh or additional logic after upload
          }}
        />
      )}


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