// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx - Campaign Editor 4.0
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { teamMemberService } from "@/lib/firebase/team-service-enhanced";
import { pdfVersionsService } from "@/lib/firebase/pdf-versions-service";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
import { ModernCustomerSelector } from "@/components/pr/ModernCustomerSelector";
import CampaignRecipientManager from "@/components/pr/campaign/CampaignRecipientManager";
import { ApprovalSettings } from "@/components/campaigns/ApprovalSettings";
import { EnhancedApprovalData, createDefaultEnhancedApprovalData } from "@/types/approvals-enhanced";
import {
  PlusIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  FolderIcon,
  SparklesIcon,
  InformationCircleIcon,
  XCircleIcon,
  PaperClipIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { prService } from "@/lib/firebase/pr-service";
import { mediaService } from "@/lib/firebase/media-service";
import { CampaignAssetAttachment, PRCampaign } from "@/types/pr";
import SimpleBoilerplateLoader, { BoilerplateSection } from "@/components/pr/campaign/SimpleBoilerplateLoader";
import { serverTimestamp } from 'firebase/firestore';
import { AssetSelectorModal } from "@/components/campaigns/AssetSelectorModal";
import { KeyVisualSection } from "@/components/campaigns/KeyVisualSection";
import { KeyVisualData } from "@/types/pr";

// Dynamic import für AI Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

// Einfache Alert-Komponente
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

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const formRef = useRef<HTMLFormElement>(null);

  // Campaign State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
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
  
  // Legacy single list (für Kompatibilität)
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedListName, setSelectedListName] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [editorContent, setEditorContent] = useState<string>('');
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approvalData, setApprovalData] = useState<EnhancedApprovalData>(createDefaultEnhancedApprovalData());
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string>('');
  
  // 4-Step Navigation State - UPDATED TO 4 STEPS
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Load Campaign
  useEffect(() => {
    if (user && campaignId) {
      loadCampaign();
    }
  }, [user, campaignId]);

  const loadCampaign = async () => {
    if (!user || !campaignId) return;
    
    setLoadingCampaign(true);
    try {
      const campaignData = await prService.getById(campaignId);
      if (campaignData) {
        setCampaign(campaignData);
        
        // Setze alle Formularfelder mit den geladenen Daten
        setCampaignTitle(campaignData.title || '');
        setPressReleaseContent(campaignData.contentHtml || '');
        setEditorContent(campaignData.mainContent || '');
        setSelectedCompanyId(campaignData.clientId || '');
        setSelectedCompanyName(campaignData.clientName || '');
        
        // Multi-List Support
        setSelectedListIds(campaignData.distributionListIds || []);
        setSelectedListNames(campaignData.distributionListNames || []);
        setListRecipientCount(campaignData.recipientCount || 0);
        
        // Legacy Single List (Rückwärtskompatibilität)
        setSelectedListId(campaignData.distributionListId || '');
        setSelectedListName(campaignData.distributionListName || '');
        setRecipientCount(campaignData.recipientCount || 0);
        
        // Manual Recipients
        setManualRecipients(campaignData.manualRecipients || []);
        
        // Legacy Approval
        setApprovalRequired(campaignData.approvalRequired || false);
        
        // Enhanced Approval Data
        if (campaignData.approvalData && typeof campaignData.approvalData === 'object') {
          if ('teamApprovalRequired' in campaignData.approvalData || 'customerApprovalRequired' in campaignData.approvalData) {
            setApprovalData(campaignData.approvalData as EnhancedApprovalData);
          } else {
            const legacyData = campaignData.approvalData as any;
            setApprovalData({
              ...createDefaultEnhancedApprovalData(),
              shareId: legacyData.shareId
            });
          }
        } else {
          setApprovalData(createDefaultEnhancedApprovalData());
        }
        
        setAttachedAssets(campaignData.attachedAssets || []);
        setKeyVisual(campaignData.keyVisual || undefined);
        setKeywords(campaignData.keywords || []);
        
        // Konvertiere boilerplateSections falls nötig
        if (campaignData.boilerplateSections) {
          const sections = campaignData.boilerplateSections.map((section: any, index: number) => ({
            ...section,
            order: section.order ?? index,
            isLocked: section.isLocked || false,
            isCollapsed: section.isCollapsed || false
          }));
          setBoilerplateSections(sections);
        }
      } else {
        setValidationErrors(['Kampagne nicht gefunden']);
      }
    } catch (error) {
      setValidationErrors(['Fehler beim Laden der Kampagne']);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
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
    
    setValidationErrors([]);
    setSaving(true);
    
    try {
      // Bereite die boilerplateSections für Firebase vor
      const cleanedSections = boilerplateSections.map((section, index) => {
        const cleaned: any = {
          id: section.id,
          type: section.type,
          order: section.order ?? index,
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

      // Bereite attachedAssets vor
      const cleanedAttachedAssets = attachedAssets.map(asset => ({
        ...asset,
        attachedAt: asset.attachedAt || serverTimestamp()
      }));

      const updateData: Partial<PRCampaign> = {
        title: campaignTitle.trim(),
        contentHtml: pressReleaseContent || '',
        mainContent: editorContent || '',
        boilerplateSections: cleanedSections,
        distributionListIds: selectedListIds,
        distributionListNames: selectedListNames,
        distributionListId: selectedListIds[0] || '',
        distributionListName: selectedListNames[0] || '',
        recipientCount: listRecipientCount + manualRecipients.length,
        manualRecipients: manualRecipients,
        keywords: keywords,
        seoMetrics: {
          lastAnalyzed: serverTimestamp(),
        },
        clientId: selectedCompanyId || undefined,
        clientName: selectedCompanyName || undefined,
        keyVisual: keyVisual,
        attachedAssets: cleanedAttachedAssets,
        approvalRequired: approvalData.teamApprovalRequired || approvalData.customerApprovalRequired || approvalRequired || false,
        approvalData: (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) ? approvalData : undefined
      };

      // Entferne undefined Werte
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      await prService.update(campaignId, updateData);

      // Wenn Freigabe erforderlich und noch nicht angefordert
      if (approvalRequired && campaign?.status === 'draft') {
        try {
          const shareId = await prService.requestApproval(campaignId);
        } catch (approvalError) {
          // Fehler beim Erstellen der Freigabe
        }
      }

      // Navigation zurück zur Übersicht
      router.push('/dashboard/pr-tools/campaigns');

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
    
    // Erstelle AI-Sections aus strukturierten Daten
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

  // PDF-Generation - NEW FEATURE
  const handleGeneratePdf = async () => {
    if (!currentOrganization?.id) {
      setPdfError('Organisation nicht gefunden');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError('');

    try {
      const pdfVersionId = await pdfVersionsService.createPDFVersion(
        campaignId,
        currentOrganization.id,
        {
          title: campaignTitle,
          mainContent: editorContent,
          boilerplateSections,
          keyVisual,
          clientName: selectedCompanyName
        },
        {
          userId: user!.uid,
          status: 'draft'
        }
      );

      console.log('✅ PDF erfolgreich generiert:', pdfVersionId);
      // TODO: Hier könnte ein Success-Toast gezeigt werden
    } catch (error) {
      console.error('❌ PDF-Generation Fehler:', error);
      setPdfError('Fehler bei der PDF-Erstellung');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a =>
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
  };

  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kampagne...</Text>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Text className="text-red-600">Kampagne nicht gefunden</Text>
        <Link href="/dashboard/pr-tools/campaigns" className="mt-4 text-[#005fab] hover:text-[#004a8c]">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  // 4-Step Navigation Component - UPDATED
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
                onClick={() => setCurrentStep(step.id as 1 | 2 | 3 | 4)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-[#005fab] text-[#005fab]'
                    : isCompleted
                    ? 'border-green-500 text-green-600 hover:text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {step.name}
                {isCompleted && (
                  <span className="ml-2 text-green-500">✓</span>
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
        <Heading>PR-Kampagne bearbeiten</Heading>
      </div>

      {/* Step Navigation */}
      <StepNavigation />

      {/* Fehlermeldungen */}
      {validationErrors.length > 0 && (
        <div className="mb-6">
          <SimpleAlert type="error" message={validationErrors[0]} />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Step 1: Pressemeldung */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg border p-6">
            <FieldGroup>
              {/* Absender */}
              <div className="mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Absender</h3>
                  
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

              {/* Pressemeldung */}
              <div className="mb-8">
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
                {currentOrganization && (
                  <CampaignContentComposer
                    key={`composer-${boilerplateSections.length}`}
                    organizationId={currentOrganization.id}
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
                )}
              </div>

              {/* Key Visual */}
              <div className="mt-8">
                <KeyVisualSection
                  value={keyVisual}
                  onChange={setKeyVisual}
                  clientId={selectedCompanyId}
                  clientName={selectedCompanyName}
                  organizationId={currentOrganization?.id || user!.uid}
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
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">Medien (optional)</h3>
                  {selectedCompanyId && (
                    <Button
                      type="button"
                      onClick={() => setShowAssetSelector(true)}
                      plain
                      className="whitespace-nowrap"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Medien hinzufügen
                    </Button>
                  )}
                </div>
                
                {attachedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {attachedAssets.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <Text>Noch keine Medien angehängt</Text>
                  </div>
                )}
              </div>
            </FieldGroup>
          </div>
        )}

        {/* Step 3: Freigaben - UPDATED: REMOVED VERTEILER */}
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

        {/* Step 4: Vorschau - UPDATED WITH PDF GENERATION */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg border p-6">
            {/* Live Vorschau mit korrigiertem Layout */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live-Vorschau</h3>
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="prose max-w-none">
                  {/* 1. Key Visual (oben) */}
                  {keyVisual && (
                    <div className="mb-6">
                      {keyVisual.type === 'image' && keyVisual.url && (
                        <img 
                          src={keyVisual.url} 
                          alt={keyVisual.alt || 'Key Visual'}
                          className="w-full max-w-2xl mx-auto rounded-lg shadow-sm"
                        />
                      )}
                      {keyVisual.caption && (
                        <p className="text-sm text-gray-600 text-center mt-2 italic">
                          {keyVisual.caption}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* 2. Headline */}
                  <h1 className="text-2xl font-bold mb-4">{campaignTitle || 'Titel der Pressemitteilung'}</h1>
                  
                  {/* 3. Hauptinhalt/Text */}
                  {editorContent && (
                    <div 
                      className="mb-6"
                      dangerouslySetInnerHTML={{ __html: editorContent }} 
                    />
                  )}
                  
                  {/* 4. Textbausteine */}
                  {boilerplateSections.map((section, index) => (
                    <div key={section.id} className="mb-4">
                      {section.content && (
                        <div dangerouslySetInnerHTML={{ __html: section.content }} />
                      )}
                      {section.metadata && section.type === 'quote' && (
                        <div className="italic text-gray-600 mt-2">
                          — {section.metadata.person}, {section.metadata.role}
                          {section.metadata.company && `, ${section.metadata.company}`}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Datum */}
                  <p className="text-sm text-gray-600 mt-8">
                    {new Date().toLocaleDateString('de-DE', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* PDF-Export - NEW FEATURE */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">PDF-Export</h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-sm text-gray-600">
                      Exportiere die Kampagne als PDF-Dokument für Freigaben oder zum Download.
                    </Text>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={isGeneratingPdf}
                    className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generiere PDF...
                      </>
                    ) : (
                      'PDF generieren'
                    )}
                  </Button>
                </div>
                
                {pdfError && (
                  <div className="mt-3">
                    <SimpleAlert type="error" message={pdfError} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Statistiken */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{(editorContent || '').replace(/<[^>]*>/g, '').length}</div>
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

        {/* Navigation Buttons - UPDATED FOR 4 STEPS */}
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
                onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4)}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                Weiter
                <ArrowLeftIcon className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-gray-600 hover:bg-gray-700 text-white whitespace-nowrap"
                >
                  {saving ? 'Speichert...' : 'Als Entwurf speichern'}
                </Button>
                {(approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) && (
                  <Button
                    type="button"
                    onClick={async (e) => {
                      // Speichere zuerst die Kampagne
                      await handleSubmit(e as any);
                      // TODO: Dann starte Freigabe-Prozess
                    }}
                    disabled={saving}
                    className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                  >
                    Freigabe anfordern
                  </Button>
                )}
              </>
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
          onAssetsSelected={(newAssets) => {
            const mergedAssets = [...attachedAssets, ...newAssets];
            setAttachedAssets(mergedAssets);
          }}
          organizationId={currentOrganization?.id || user.uid}
          legacyUserId={user.uid}
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: editorContent
          }}
        />
      )}
    </div>
  );
}