// src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
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
import { CampaignPreviewStep } from "@/components/campaigns/CampaignPreviewStep";
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
  SparklesIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  LockClosedIcon,
  LinkIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment, EditLockData, EditLockUtils, PRCampaign, EDIT_LOCK_CONFIG } from "@/types/pr";
import SimpleBoilerplateLoader, { BoilerplateSection } from "@/components/pr/campaign/SimpleBoilerplateLoader";
import { InfoTooltip } from "@/components/InfoTooltip";
import { serverTimestamp } from 'firebase/firestore';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
// 🆕 NEW: Enhanced Edit-Lock Integration
import EditLockBanner from '@/components/campaigns/EditLockBanner';
import EditLockStatusIndicator from '@/components/campaigns/EditLockStatusIndicator';
// PRSEOHeaderBar now integrated in CampaignContentComposer

// Dynamic import für AI Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

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


export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

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
    
    // KeyVisual wird NICHT hier eingefügt - die CampaignPreviewStep Komponente zeigt es bereits an
    
    // 1. Haupt-Content (Editor-Inhalt)
    if (editorContent && editorContent.trim() && editorContent !== '<p></p>') {
      html += `<div class="main-content">${editorContent}</div>`;
    }
    
    // 2. Textbausteine (falls vorhanden)
    // Füge Abstand zwischen Haupttext und erstem Textbaustein hinzu
    if (boilerplateSections && boilerplateSections.length > 0) {
      console.log('🔍 generateContentHtml - Textbausteine prüfen:', boilerplateSections.length, boilerplateSections);
      
      const visibleSections = boilerplateSections
        .filter(section => {
          console.log('🔍 Raw section object:', section);
          
          // Prüfe verschiedene mögliche Content-Felder (auch verschachtelt)
          const content = section.content || 
                         section.boilerplate?.content ||
                         '';
          
          // Nur customTitle anzeigen, keine internen Namen
          const title = section.customTitle || '';
          
          const hasContent = content && content.trim();
          console.log(`🔍 Section "${title}": hasContent=${hasContent}, content="${content?.substring(0, 50)}..."`);
          
          return hasContent;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ Sichtbare Textbausteine:', visibleSections.length, visibleSections.map(s => s.customTitle || '(kein Titel)'));
      
      if (visibleSections.length > 0) {
        // Füge zusätzlichen Abstand hinzu, wenn bereits Haupt-Content vorhanden ist
        const hasMainContent = editorContent && editorContent.trim() && editorContent !== '<p></p>';
        const marginClass = hasMainContent ? 'mt-12' : 'mt-8';
        
        html += `<div class="boilerplate-sections ${marginClass}">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Textbausteine</h2>`;
        
        visibleSections.forEach(section => {
          const content = section.content || 
                         section.boilerplate?.content ||
                         '';
          
          // Nur customTitle anzeigen, keine internen Namen
          const title = section.customTitle || '';
          
          html += `<div class="boilerplate-section mb-8">
            ${title ? `<h3 class="text-lg font-semibold mb-2 text-gray-900">${title}</h3>` : ''}
            <div class="boilerplate-content text-gray-800">${content}</div>
          </div>`;
        });
        html += `</div>`;
      } else {
        console.log('❌ Keine sichtbaren Textbausteine gefunden');
      }
    } else {
      console.log('❌ Keine Textbausteine vorhanden');
    }
    
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
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [realPrScore, setRealPrScore] = useState<{
    totalScore: number;
    breakdown: { headline: number; keywords: number; structure: number; relevance: number; concreteness: number; engagement: number };
    hints: string[];
    keywordMetrics: any[];
  } | null>(null);
  
  // 4-Step Navigation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
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


  useEffect(() => {
    if (user && currentOrganization) {
      loadData();
    }
  }, [user, currentOrganization]);

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

  const loadData = async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(currentOrganization.id, user.uid);
      setAvailableLists(listsData);
      
      // 🆕 NEUE: Lade Edit-Lock Status wenn Campaign-ID vorhanden
      const urlParams = new URLSearchParams(window.location.search);
      const campaignId = urlParams.get('id');
      if (campaignId) {
        await loadEditLockStatus(campaignId);
      } else {
        setLoadingEditLock(false);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      console.log('🆔 Campaign ID:', existingCampaignId);
      console.log('🆕 Is New Campaign:', isNewCampaign);

      // VEREINFACHTER SAVE MIT CUSTOMER-APPROVAL INTEGRATION
      const result = await prService.saveCampaignWithCustomerApproval(
        {
          id: existingCampaignId || undefined, // 🔧 FIX: Verwende existierende ID wenn vorhanden
          title: campaignTitle.trim(),
          contentHtml: pressReleaseContent || '',
          mainContent: editorContent,
          boilerplateSections: boilerplateSections as any,
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
          status: 'draft' as const
        },
        {
          customerApprovalRequired: approvalData.customerApprovalRequired,
          customerContact: approvalData.customerContact,
          customerApprovalMessage: approvalData.customerApprovalMessage
        },
        {
          userId: user!.uid,
          organizationId: currentOrganization!.id,
          isNewCampaign: isNewCampaign // 🔧 FIX: Korrekte Logik für neue vs. bestehende Kampagnen
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

  const handleAiGenerate = (result: any) => {
    // Überschrift separat setzen
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    
    // ALLES andere kommt direkt in den Editor als zusammenhängender HTML-Content
    if (result.structured) {
      const htmlParts: string[] = [];
      
      // Lead-Absatz als fettgedruckten ersten Absatz
      if (result.structured.leadParagraph && result.structured.leadParagraph !== 'Lead-Absatz fehlt') {
        htmlParts.push(`<p><strong>${result.structured.leadParagraph}</strong></p>`);
      }
      
      // Hauptabsätze als normale Paragraphen
      if (result.structured.bodyParagraphs && result.structured.bodyParagraphs.length > 0) {
        const mainParagraphs = result.structured.bodyParagraphs
          .filter((paragraph: string) => paragraph && paragraph !== 'Haupttext der Pressemitteilung')
          .map((paragraph: string) => `<p>${paragraph}</p>`);
        
        htmlParts.push(...mainParagraphs);
      }
      
      // Zitat korrekt als blockquote mit data-type="pr-quote" formatieren
      // Wichtig: Die Toolbar kann mit diesem Format arbeiten
      if (result.structured.quote && result.structured.quote.text) {
        const quoteHtml = `<blockquote data-type="pr-quote" class="pr-quote border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
        <p>"${result.structured.quote.text}"</p>
        <footer class="text-sm text-gray-500 mt-2">— <strong>${result.structured.quote.person}</strong>, ${result.structured.quote.role}${result.structured.quote.company ? `, ${result.structured.quote.company}` : ''}</footer>
      </blockquote>`;
        
        htmlParts.push(quoteHtml);
      }
      
      // CTA (Call-to-Action) mit korrekter Formatierung für die Toolbar
      if (result.structured.cta) {
        // CTA wird mit data-type="cta-text" formatiert, wie von CTAExtension erwartet
        htmlParts.push(`<p><span data-type="cta-text" class="cta-text font-bold text-[#005fab]">${result.structured.cta}</span></p>`);
      }
      
      // ALLES als ein zusammenhängender HTML-Content in den Editor
      const fullHtmlContent = htmlParts.join('\n\n');
      setEditorContent(fullHtmlContent);
      
      // Auch als pressReleaseContent für die Vorschau
      setPressReleaseContent(fullHtmlContent);
    }
    
    setShowAiModal(false);
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
        boilerplateSections: cleanedSections,
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
          lastAnalyzed: serverTimestamp() as any,
          prScore: realPrScore?.totalScore || 0,
          prHints: realPrScore?.hints || [],
          prScoreCalculatedAt: serverTimestamp() as any,
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
        boilerplateSections: boilerplateSections.map(section => ({
          ...section,
          position: section.position || 'custom'
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
            boilerplateSections: boilerplateSections as any,
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
        <Heading>Neue PR-Kampagne</Heading>
      </div>

      {/* Step Navigation - FUNKTIONIEREND */}
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
        // Debug-Logging entfernt für TypeScript-Kompatibilität
        
        // BLOCKIERE ALLE AUTOMATISCHEN SUBMITS - NUR MANUELLER KLICK ERLAUBT
        console.log('🚫 ALLE Form-Submits werden blockiert - nur manuelle Speichern-Clicks erlaubt');
        return false;
      }}>
        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg border p-6">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pressemeldung</h3>
                  <Button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white whitespace-nowrap"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    KI-Assistent
                  </Button>
                </div>
                
                {/* Info-Box für KI-Nutzung */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-semibold">Tipp: Nutze den KI-Assistenten!</p>
                      <p className="mt-1">Der KI-Assistent liefert dir einen kompletten Rohentwurf deiner Pressemitteilung mit Titel, Lead-Absatz, Haupttext und Zitat. Diesen kannst du dann im Editor verfeinern und mit Textbausteinen erweitern.</p>
                    </div>
                  </div>
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
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 flex items-center gap-2 mt-3"
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
            <CampaignPreviewStep
              campaignTitle={campaignTitle}
              finalContentHtml={finalContentHtml}
              keyVisual={keyVisual}
              selectedCompanyName={selectedCompanyName}
              campaignAdminName={user?.displayName || user?.email || 'Unbekannt'}
              realPrScore={realPrScore}
              keywords={keywords}
              boilerplateSections={boilerplateSections}
              attachedAssets={attachedAssets}
              editorContent={editorContent}
              approvalData={approvalData}
            />
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
                onClick={(e: any) => {
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

      {/* AI Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: ''
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