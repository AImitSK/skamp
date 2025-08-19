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
import { EnhancedApprovalData, createDefaultEnhancedApprovalData } from "@/types/approvals-enhanced";
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
  FolderIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment } from "@/types/pr";
import SimpleBoilerplateLoader, { BoilerplateSection } from "@/components/pr/campaign/SimpleBoilerplateLoader";
import { InfoTooltip } from "@/components/InfoTooltip";
import { serverTimestamp } from 'firebase/firestore';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
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
  const [approvalData, setApprovalData] = useState<EnhancedApprovalData>(createDefaultEnhancedApprovalData());

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
    
    // 1. KeyVisual (falls vorhanden)
    if (keyVisual && keyVisual.url) {
      html += `<div class="key-visual-container mb-6">
        <img src="${keyVisual.url}" alt="${keyVisual.alt || ''}" 
             style="width: 100%; max-width: 600px; height: auto; border-radius: 8px;" />
        ${keyVisual.caption ? `<p class="text-sm text-gray-600 mt-2 italic">${keyVisual.caption}</p>` : ''}
      </div>`;
    }
    
    // 2. Haupt-Content (Editor-Inhalt)
    if (editorContent && editorContent.trim() && editorContent !== '<p></p>') {
      html += `<div class="main-content">${editorContent}</div>`;
    }
    
    // 3. Textbausteine (falls vorhanden)
    if (boilerplateSections && boilerplateSections.length > 0) {
      console.log('🔍 generateContentHtml - Textbausteine prüfen:', boilerplateSections.length, boilerplateSections);
      
      const visibleSections = boilerplateSections
        .filter(section => {
          console.log('🔍 Raw section object:', section);
          
          // Prüfe verschiedene mögliche Content-Felder (auch verschachtelt)
          const content = section.content || 
                         section.htmlContent || 
                         section.text || 
                         section.boilerplate?.content ||
                         section.boilerplate?.htmlContent ||
                         section.boilerplate?.text ||
                         '';
          
          const title = section.customTitle ||
                       section.boilerplate?.title ||
                       section.boilerplate?.name ||
                       '';
          
          const hasContent = content && content.trim();
          console.log(`🔍 Section "${title}": hasContent=${hasContent}, content="${content?.substring(0, 50)}..."`);
          
          return hasContent;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ Sichtbare Textbausteine:', visibleSections.length, visibleSections.map(s => s.title));
      
      if (visibleSections.length > 0) {
        html += `<div class="boilerplate-sections mt-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Textbausteine</h2>`;
        
        visibleSections.forEach(section => {
          const content = section.content || 
                         section.htmlContent || 
                         section.text || 
                         section.boilerplate?.content ||
                         section.boilerplate?.htmlContent ||
                         section.boilerplate?.text ||
                         '';
          
          const title = section.customTitle ||
                       section.boilerplate?.title ||
                       section.boilerplate?.name ||
                       '';
          
          html += `<div class="boilerplate-section mb-6 p-4 border-l-4 border-blue-500 bg-blue-50">
            ${title ? `<h3 class="text-lg font-semibold mb-2 text-blue-900">${title}</h3>` : ''}
            <div class="boilerplate-content text-blue-800">${content}</div>
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
  
  // 4-Step Navigation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // PDF State
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editLocked, setEditLocked] = useState(false);


  useEffect(() => {
    if (user && currentOrganization) {
      loadData();
    }
  }, [user, currentOrganization]);

  const loadData = async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(currentOrganization.id, user.uid);
      setAvailableLists(listsData);
    } catch (error) {
      // Fehler beim Laden
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // KRITISCH: Nur in Step 4 speichern erlauben!
    if (currentStep !== 4) {
      console.log('🚫 Form-Submit verhindert - nicht in Step 4:', currentStep);
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

      // 🔍 DEBUG: Aktuelle Werte vor dem Speichern
      console.log('🔍 NEW CAMPAIGN DEBUG - Vor dem Speichern:');
      console.log('🏷️ Keywords:', keywords, 'length:', keywords.length);
      console.log('📝 EditorContent length:', editorContent.length);
      console.log('📰 PressReleaseContent length:', pressReleaseContent?.length || 0);
      console.log('👤 User:', user?.uid);
      console.log('🏢 Organization:', currentOrganization?.id);

      const campaignData: any = {
        userId: user!.uid,
        organizationId: currentOrganization!.id,
        title: campaignTitle.trim(),
        contentHtml: pressReleaseContent || '',
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
        mainContent: editorContent, // Editor-Inhalt für SEO
        seoMetrics: {
          lastAnalyzed: serverTimestamp(),
          // TODO: SEO-Metriken aus PRSEOHeaderBar übernehmen
        },
        clientId: selectedCompanyId || null,
        clientName: selectedCompanyName || null,
        keyVisual: keyVisual || null,
        attachedAssets: cleanedAttachedAssets,
        approvalRequired: approvalData.teamApprovalRequired || approvalData.customerApprovalRequired || false,
        approvalData: (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) ? approvalData : undefined
      };

      // 🔍 DEBUG: Campaign-Data vor Bereinigung
      console.log('🔍 NEW CAMPAIGN DEBUG - campaignData vor Bereinigung:');
      console.log('🏷️ campaignData.keywords:', campaignData.keywords);
      console.log('📝 campaignData.mainContent:', campaignData.mainContent?.substring(0, 100) + '...');
      console.log('📰 campaignData.contentHtml:', campaignData.contentHtml?.substring(0, 100) + '...');

      // Entferne alle null Werte (Firebase mag keine null-Werte)
      Object.keys(campaignData).forEach(key => {
        if (campaignData[key] === null) {
          delete campaignData[key];
        }
      });

      // 🔍 DEBUG: Campaign-Data nach Bereinigung
      console.log('🔍 NEW CAMPAIGN DEBUG - campaignData nach Bereinigung:');
      console.log('🏷️ campaignData.keywords FINAL:', campaignData.keywords);
      console.log('📝 campaignData.mainContent FINAL:', campaignData.mainContent?.substring(0, 100) + '...');
      console.log('🗄️ Alle Felder:', Object.keys(campaignData));

      console.log('💾 Starte prService.create mit campaignData...');
      const newCampaignId = await prService.create(campaignData);
      console.log('✅ Kampagne erstellt mit ID:', newCampaignId);

      // Erstelle erweiterten Approval-Workflow falls erforderlich (NACH Campaign-Erstellung)
      if (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) {
        try {
          // Import approval workflow service dynamically to avoid circular imports
          const { approvalWorkflowService } = await import('@/lib/firebase/approval-workflow-service');
          
          await approvalWorkflowService.createWorkflow(
            newCampaignId,
            currentOrganization!.id,
            approvalData
          );
          console.log('✅ Approval-Workflow erfolgreich erstellt');
        } catch (error) {
          console.error('❌ Fehler beim Erstellen des Approval-Workflows:', error);
          // Workflow-Fehler sollten nicht die Campaign-Erstellung blockieren
          setValidationErrors(['Die Kampagne wurde gespeichert, aber der Freigabe-Workflow konnte nicht erstellt werden.']);
        }
      } else if (approvalRequired) {
        // Legacy approval fallback
        try {
          const shareId = await prService.requestApproval(newCampaignId);
          if (!shareId) {
            // Freigabe konnte nicht erstellt werden, Kampagne wurde trotzdem gespeichert
          }
        } catch (approvalError) {
          // Zeige Warnung, aber navigiere trotzdem
          setValidationErrors(['Die Kampagne wurde gespeichert, aber die Freigabe konnte nicht erstellt werden.']);
          setTimeout(() => {
            router.push('/dashboard/pr-tools/campaigns?refresh=true');
          }, 2000);
          return;
        }
      }

      // Zeige Erfolgs-Bestätigung vor Navigation
      setValidationErrors([]); // Lösche vorherige Fehler
      setSuccessMessage('Kampagne erfolgreich gespeichert! Weiterleitung...');
      
      // Kurze Verzögerung für UX - zeige "Gespeichert!" bevor navigiert wird
      setTimeout(() => {
        router.push('/dashboard/pr-tools/campaigns?refresh=true');
      }, 1500);

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
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    
    // Erstelle AI-Sections aus strukturierten Daten (ohne position)
    if (result.structured) {
      const aiSections: BoilerplateSection[] = [];
      let order = boilerplateSections.length;
      
      // Lead-Absatz
      if (result.structured.leadParagraph && result.structured.leadParagraph !== 'Lead-Absatz fehlt') {
        aiSections.push({
          id: `ai-lead-${Date.now()}`,
          type: 'lead',
          order: order++,
          isLocked: false,
          isCollapsed: false,
          customTitle: 'Lead-Absatz (KI-generiert)',
          content: `<p><strong>${result.structured.leadParagraph}</strong></p>`
        });
      }
      
      // Hauptabsätze
      if (result.structured.bodyParagraphs && result.structured.bodyParagraphs.length > 0) {
        const mainContent = result.structured.bodyParagraphs
          .filter((paragraph: string) => paragraph && paragraph !== 'Haupttext der Pressemitteilung')
          .map((paragraph: string) => `<p>${paragraph}</p>`)
          .join('\n\n');
          
        if (mainContent) {
          aiSections.push({
            id: `ai-main-${Date.now()}`,
            type: 'main',
            order: order++,
            isLocked: false,
            isCollapsed: false,
            customTitle: 'Haupttext (KI-generiert)',
            content: mainContent
          });
        }
      }
      
      // Zitat
      if (result.structured.quote && result.structured.quote.text) {
        aiSections.push({
          id: `ai-quote-${Date.now()}`,
          type: 'quote',
          order: order++,
          isLocked: false,
          isCollapsed: false,
          customTitle: 'Zitat (KI-generiert)',
          content: result.structured.quote.text,
          metadata: {
            person: result.structured.quote.person,
            role: result.structured.quote.role,
            company: result.structured.quote.company
          }
        });
      }
      
      // Füge die AI-Sections zu den bestehenden hinzu und sortiere nach order
      const newSections = [...boilerplateSections, ...aiSections].sort((a, b) => (a.order || 0) - (b.order || 0));
      setBoilerplateSections(newSections);
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
          lastAnalyzed: serverTimestamp(),
        },
        clientId: selectedCompanyId || undefined,
        clientName: selectedCompanyName || undefined,
        keyVisual: keyVisual,
        attachedAssets: cleanedAttachedAssets,
        // Approval
        approvalRequired: approvalData.teamApprovalRequired || approvalData.customerApprovalRequired || false,
        approvalData: (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) ? approvalData : undefined,
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
    try {
      // Speichere zuerst die Kampagne als Entwurf
      const campaignId = await saveAsDraft();
      
      if (!campaignId) {
        throw new Error('Kampagne konnte nicht gespeichert werden');
      }

      // Dann generiere PDF für die gespeicherte Kampagne
      const pdfVersionId = await pdfVersionsService.createPDFVersion(
        campaignId,
        currentOrganization.id,
        {
          title: campaignTitle,
          mainContent: editorContent,
          boilerplateSections,
          keyVisual
        },
        {
          userId: user.uid,
          status: forApproval ? 'pending_customer' : 'draft'
        }
      );

      // Lade die erstellte PDF-Version
      const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
      setCurrentPdfVersion(newVersion);

      setSuccessMessage('PDF erfolgreich generiert!');
    } catch (error) {
      console.error('Fehler bei PDF-Generation:', error);
      setValidationErrors(['Fehler bei der PDF-Erstellung']);
    } finally {
      setGeneratingPdf(false);
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

  // Step Navigation Component
  const StepNavigation = () => {
    const steps = [
      { id: 1, name: 'Pressemeldung', icon: DocumentTextIcon },
      { id: 2, name: 'Anhänge', icon: PaperClipIcon },
      { id: 3, name: 'Freigaben', icon: UserGroupIcon },
      { id: 4, name: 'Vorschau', icon: InformationCircleIcon }
    ];

    return (
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (step.id === 4) {
                    handleGeneratePreview(); // Generiere ContentHtml bei Klick auf Vorschau
                  } else {
                    setCurrentStep(step.id as 1 | 2 | 3 | 4);
                  }
                }}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-[#005fab] text-[#005fab]'
                    : isCompleted
                    ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {step.name}
                {isCompleted && (
                  <span className="ml-2 text-[#004a8c]">✓</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Heading>Neue PR-Kampagne</Heading>
      </div>

      {/* Step Navigation */}
      <StepNavigation />

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
        console.log('🔍 Event Details:', e.type, 'Target:', e.target, 'Submitter:', e.submitter);
        console.log('🔍 Form Elements:', Array.from(e.target.elements).filter(el => el.type === 'submit').map(el => ({ type: el.type, value: el.value, className: el.className })));
        
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
            </FieldGroup>
          </div>
        )}

        {/* Step 4: Vorschau */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg border p-6">
            {/* Live Vorschau - EXAKT WIE IM DETAIL PAGE */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live-Vorschau</h3>
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="prose prose-sm max-w-none">
                  {/* Titel */}
                  <h1 className="text-2xl font-bold mb-4">{campaignTitle || 'Titel der Pressemitteilung'}</h1>
                  
                  {/* Hauptinhalt - Fertiges ContentHtml wie in Detail Page */}
                  <div 
                    className="mb-6"
                    dangerouslySetInnerHTML={{ __html: finalContentHtml || '<p class="text-gray-400 italic text-center py-8">Klicken Sie auf "Weiter" oder "Vorschau" um die finale Vorschau zu generieren</p>' }} 
                  />

                  {/* Textbausteine sind bereits in generateContentHtml() enthalten */}
                  
                  {/* Debug Info nur in Development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <strong>Debug Live-Vorschau (finale ContentHtml):</strong><br/>
                      KeyVisual: {keyVisual ? `✅ (${keyVisual.type}, ${keyVisual.url ? 'URL✅' : 'URL❌'})` : '❌'}<br/>
                      Textbausteine: {boilerplateSections?.length || 0} ({boilerplateSections?.filter(s => s.content?.trim()).length || 0} mit Content)<br/>
                      Textbausteine Details: {boilerplateSections?.map(s => `${s.title}(isActive:${s.isActive}, hasContent:${!!s.content?.trim()})`).join(', ')}<br/>
                      EditorContent: {editorContent ? `${editorContent.length} Zeichen` : '❌'}<br/>
                      Finale HTML: {finalContentHtml.length} Zeichen (generiert bei Step-Wechsel)
                      {finalContentHtml && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600">Finale HTML anzeigen</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                            {finalContentHtml}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  
                  {/* Datum */}
                  <p className="text-sm text-gray-600 mt-8 pt-4 border-t border-gray-200">
                    {new Date().toLocaleDateString('de-DE', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* PDF-Export */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">PDF-Export</h3>
                
                {!editLocked && (
                  <Button
                    type="button"
                    onClick={() => handleGeneratePdf(false)}
                    disabled={generatingPdf}
                    className="bg-[#005fab] hover:bg-[#004a8c] text-white"
                  >
                    {generatingPdf ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        PDF wird erstellt...
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                        PDF generieren
                      </>
                    )}
                  </Button>
                )}
                
                {editLocked && (
                  <div className="text-sm text-gray-500">
                    PDF-Erstellung gesperrt während Freigabe-Prozess
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
                          <Badge color="blue" className="text-xs">Aktuell</Badge>
                        </div>
                        <div className="text-sm text-blue-700">
                          {currentPdfVersion.metadata?.wordCount} Wörter • {currentPdfVersion.metadata?.pageCount} Seiten
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        color={currentPdfVersion.status === 'draft' ? 'gray' : 
                              currentPdfVersion.status === 'approved' ? 'green' : 'yellow'} 
                        className="text-xs"
                      >
                        {currentPdfVersion.status === 'draft' ? 'Entwurf' :
                         currentPdfVersion.status === 'approved' ? 'Freigegeben' : 'Freigabe angefordert'}
                      </Badge>
                      
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  <p className="text-sm">Klicken Sie auf "PDF generieren" um eine Vorschau zu erstellen</p>
                </div>
              )}
            </div>
            
            {/* Statistiken */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(editorContent || '').replace(/<[^>]*>/g, '').length}
                </div>
                <div className="text-sm text-gray-600">Zeichen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{boilerplateSections.length}</div>
                <div className="text-sm text-gray-600">Textbausteine</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{keywords.length}</div>
                <div className="text-sm text-gray-600">Keywords</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{attachedAssets.length}</div>
                <div className="text-sm text-gray-600">Medien</div>
              </div>
            </div>
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
                onClick={() => {
                  if (currentStep === 3) {
                    handleGeneratePreview(); // Generiere ContentHtml beim Wechsel von Step 3 zu 4
                  } else {
                    setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4);
                  }
                }}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                Weiter
                <ArrowLeftIcon className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  console.log('🖱️ MANUELLER Speichern-Click!');
                  handleSubmit(e as any);
                }}
                disabled={saving}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Speichert...
                  </>
                ) : (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired || approvalRequired) ? (
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