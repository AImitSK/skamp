// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  FolderIcon,
  // DocumentIcon ersetzt durch DocumentTextIcon,
  SparklesIcon,
  InformationCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { mediaService } from "@/lib/firebase/media-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment, PRCampaign } from "@/types/pr";
import SimpleBoilerplateLoader, { BoilerplateSection } from "@/components/pr/campaign/SimpleBoilerplateLoader";
import { MediaAsset, MediaFolder } from "@/types/media";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { serverTimestamp } from 'firebase/firestore';
import { AssetSelectorModal } from "@/components/campaigns/AssetSelectorModal";
import { KeyVisualSection } from "@/components/campaigns/KeyVisualSection";
import { KeyVisualData } from "@/types/pr";
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER } from "@/constants/ui";
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

// Lokale AssetSelectorModal entfernt - nutzen jetzt die gemeinsame Komponente aus @/components/campaigns/AssetSelectorModal

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const formRef = useRef<HTMLFormElement>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Campaign State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Form State
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  // Multi-List Support (wie in New-Seite)
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
  const [editorContent, setEditorContent] = useState<string>(''); // Editor-Inhalt für SEO - FIXED: wird jetzt mit mainContent synchronisiert
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);
  const [approvalRequired, setApprovalRequired] = useState(false); // Legacy - wird durch approvalData ersetzt
  const [approvalData, setApprovalData] = useState<EnhancedApprovalData>(createDefaultEnhancedApprovalData());
  const [keywords, setKeywords] = useState<string[]>([]); // SEO Keywords
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // 3-Step Navigation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Load OrganizationId
  useEffect(() => {
    const loadOrganizationId = async () => {
      if (!user) return;
      
      try {
        const orgs = await teamMemberService.getUserOrganizations(user.uid);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].organization.id!);
        } else {
          setOrganizationId(user.uid);
        }
      } catch (error) {
        // Organization loading failed, using userId as fallback
        setOrganizationId(user.uid);
      }
    };
    
    loadOrganizationId();
  }, [user]);

  // Load Campaign
  useEffect(() => {
    if (user && campaignId) {
      loadCampaign();
    }
  }, [user, campaignId]);

  // Load Lists
  useEffect(() => {
    if (user && organizationId) {
      loadLists();
    }
  }, [user, organizationId]);

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
        setEditorContent(campaignData.mainContent || ''); // FIXED: Lade mainContent in editorContent
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
          // Prüfe ob es Enhanced Approval Data ist
          if ('teamApprovalRequired' in campaignData.approvalData || 'customerApprovalRequired' in campaignData.approvalData) {
            setApprovalData(campaignData.approvalData as EnhancedApprovalData);
          } else {
            // Legacy ApprovalData - konvertiere zu Enhanced
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

  const loadLists = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(organizationId);
      setAvailableLists(listsData);
    } catch (error) {
      // Fehler beim Laden der Listen
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        mainContent: editorContent || '', // FIXED: Speichere editorContent als mainContent
        boilerplateSections: cleanedSections,
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
          // TODO: SEO-Metriken aus PRSEOHeaderBar übernehmen
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
      
      // Füge die AI-Sections zu den bestehenden hinzu
      const newSections = [...boilerplateSections, ...aiSections];
      setBoilerplateSections(newSections);
    }
    
    setShowAiModal(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a =>
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
  };

  if (loadingCampaign || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
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

  // Step Navigation Component
  const StepNavigation = () => {
    const steps = [
      { id: 1, name: 'Pressemeldung', icon: DocumentTextIcon },
      { id: 2, name: 'Einstellungen', icon: UsersIcon },
      { id: 3, name: 'Vorschau', icon: InformationCircleIcon }
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
                onClick={() => setCurrentStep(step.id as 1 | 2 | 3)}
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

      {/* Fehlermeldungen oben auf der Seite */}
      {validationErrors.length > 0 && (
        <div className="mb-6 animate-shake">
          <SimpleAlert type="error" message={validationErrors[0]} />
        </div>
      )}

      <form ref={formRef} onSubmit={(e) => {
        console.log('🚨 EDIT FORM onSubmit ausgelöst! Event:', e.type, 'Target:', e.target);
        e.preventDefault(); // VERHINDERE automatisches Submit
        console.log('🚨 Form Submit wurde verhindert!');
      }}>
        {/* Step Content */}
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
                  organizationId={user!.uid}
                  userId={user!.uid}
                />
              </div>
            </FieldGroup>
          </div>
        )}

        {/* Step 2: Einstellungen */}
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

              {/* Verteiler mit Multi-List Support */}
              <div className="mt-8">
                <CampaignRecipientManager
                  selectedListIds={selectedListIds}
                  selectedListNames={selectedListNames}
                  manualRecipients={manualRecipients}
                  onListsChange={(listIds, listNames, totalFromLists) => {
                    setSelectedListIds(listIds);
                    setSelectedListNames(listNames);
                    setListRecipientCount(totalFromLists);
                    // Legacy fields aktualisieren
                    setSelectedListId(listIds[0] || '');
                    setSelectedListName(listNames[0] || '');
                  }}
                  onAddManualRecipient={(recipient) => {
                    const newRecipient = {
                      ...recipient,
                      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    };
                    setManualRecipients([...manualRecipients, newRecipient]);
                  }}
                  onRemoveManualRecipient={(id) => {
                    setManualRecipients(manualRecipients.filter(r => r.id !== id));
                  }}
                  recipientCount={listRecipientCount + manualRecipients.length}
                  // Campaign Integration (existierende Campaign Daten)
                  campaignDistributionListIds={selectedListIds}
                  campaignDistributionListNames={selectedListNames}
                  campaignRecipientCount={listRecipientCount + manualRecipients.length}
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

              {/* Erweiterte Freigabe-Einstellungen */}
              {currentOrganization && (
                <div className="mt-8">
                  <div className="bg-white rounded-lg border p-6">
                    <ApprovalSettings
                      value={approvalData}
                      onChange={setApprovalData}
                      organizationId={currentOrganization.id}
                      clientId={selectedCompanyId}
                      clientName={selectedCompanyName}
                    />
                  </div>
                </div>
              )}
            </FieldGroup>
          </div>
        )}

        {/* Step 3: Vorschau */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vorschau</h3>
            
            {/* Einfache HTML-Vorschau ohne Textbausteine-Editor */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="prose max-w-none">
                {/* Titel */}
                <h1 className="text-2xl font-bold mb-4">{campaignTitle || 'Titel der Pressemitteilung'}</h1>
                
                {/* Hauptinhalt aus Editor */}
                {editorContent && (
                  <div 
                    className="mb-6"
                    dangerouslySetInnerHTML={{ __html: editorContent }} 
                  />
                )}
                
                {/* Boilerplate Sections */}
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
            
            {/* Statistiken */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Zeichen:</span> {(editorContent || '').replace(/<[^>]*>/g, '').length}
              </div>
              <div>
                <span className="font-medium">Textbausteine:</span> {boilerplateSections.length}
              </div>
              <div>
                <span className="font-medium">Keywords:</span> {keywords.length}
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
                onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-900"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3)}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                Weiter
                <ArrowLeftIcon className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  console.log('🖱️ EDIT - Manueller Speichern-Click!');
                  handleSubmit(e as any);
                }}
                disabled={saving}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              >
                {saving ? 'Speichert...' : 'Änderungen speichern'}
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
          onAssetsSelected={(newAssets) => {
            // Merge new assets with existing ones
            const mergedAssets = [...attachedAssets, ...newAssets];
            setAttachedAssets(mergedAssets);
          }}
          organizationId={user.uid}
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