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
import { CustomerSelector } from "@/components/pr/CustomerSelector";
import { ListSelector } from "@/components/pr/ListSelector";
import {
  PlusIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  XCircleIcon,
  SparklesIcon,
  InformationCircleIcon,
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment } from "@/types/pr";
import { BoilerplateSection } from "@/components/pr/campaign/IntelligentBoilerplateSection";
import { InfoTooltip } from "@/components/InfoTooltip";
import { serverTimestamp } from 'firebase/firestore';

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
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedListName, setSelectedListName] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]);
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [keyVisual, setKeyVisual] = useState<KeyVisualData | undefined>(undefined);
  const [approvalRequired, setApprovalRequired] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);


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
    
    // Validierung
    const errors: string[] = [];
    if (!selectedCompanyId) {
      errors.push('Bitte wählen Sie einen Kunden aus');
    }
    if (!selectedListId) {
      errors.push('Bitte wählen Sie einen Verteiler aus');
    }
    if (!campaignTitle.trim()) {
      errors.push('Titel ist erforderlich');
    }
    if (!pressReleaseContent.trim() || pressReleaseContent === '<p></p>') {
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

      const campaignData: any = {
        userId: user!.uid,
        organizationId: currentOrganization!.id,
        title: campaignTitle.trim(),
        contentHtml: pressReleaseContent || '',
        boilerplateSections: cleanedSections,
        status: 'draft' as const,
        distributionListId: selectedListId,
        distributionListName: selectedListName || '',
        recipientCount: recipientCount || 0,
        clientId: selectedCompanyId || null,
        clientName: selectedCompanyName || null,
        keyVisual: keyVisual || null,
        attachedAssets: cleanedAttachedAssets,
        approvalRequired: approvalRequired || false
      };

      // Entferne alle null Werte (Firebase mag keine null-Werte)
      Object.keys(campaignData).forEach(key => {
        if (campaignData[key] === null) {
          delete campaignData[key];
        }
      });

      const newCampaignId = await prService.create(campaignData);

      if (approvalRequired) {
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

      // Erfolgreiche Navigation mit Refresh-Parameter
      router.push('/dashboard/pr-tools/campaigns?refresh=true');

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
        <button
          onClick={() => router.push('/dashboard/pr-tools/campaigns')}
          className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Zurück zur Übersicht
        </button>
        
        <Heading>Neue PR-Kampagne</Heading>
      </div>

      {/* Fehlermeldungen oben auf der Seite */}
      {validationErrors.length > 0 && (
        <div className="mb-6 animate-shake">
          <SimpleAlert type="error" message={validationErrors[0]} />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Main Form */}
        <div className="bg-white rounded-lg border p-6">
          <FieldGroup>
            {/* Kunde */}
            <Field>
              <Label className="flex items-center">
                Kunde
                <InfoTooltip 
                  content="Pflichtfeld: Wählen Sie den Kunden aus, für den diese PR-Kampagne erstellt wird. Die Kampagne wird diesem Kunden zugeordnet."
                  className="ml-1"
                />
              </Label>
              <CustomerSelector
                value={selectedCompanyId}
                onChange={(companyId, companyName) => {
                  setSelectedCompanyId(companyId);
                  setSelectedCompanyName(companyName);
                }}
                required
              />
            </Field>

            {/* Verteiler */}
            <Field>
              <Label className="flex items-center">
                Verteiler
                <InfoTooltip 
                  content="Pflichtfeld: Wählen Sie eine Verteilerliste aus. Die Pressemitteilung wird an alle Kontakte in dieser Liste gesendet."
                  className="ml-1"
                />
              </Label>
              <ListSelector
                value={selectedListId}
                onChange={(listId, listName, contactCount) => {
                  setSelectedListId(listId);
                  setSelectedListName(listName);
                  setRecipientCount(contactCount);
                }}
                lists={availableLists}
                loading={false}
                required
              />
            </Field>

            {/* Inhalt */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center">
                  Pressemitteilung
                  <InfoTooltip 
                    content="Pflichtfeld: Erstellen Sie hier den Inhalt Ihrer Pressemitteilung. Sie müssen einen Titel und Inhalt eingeben."
                    className="ml-1"
                  />
                </h3>
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
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Tipp: Nutze den KI-Assistenten!</p>
                    <p className="mt-1">Der KI-Assistent erstellt automatisch alle Inhalte deiner Pressemitteilung: Titel, Lead-Absatz, Haupttext und Zitat. Diese erscheinen dann als verschiebbare Elemente, die du mit Textbausteinen kombinieren kannst.</p>
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
                mainContent=""
                onMainContentChange={() => {}}
                onFullContentChange={setPressReleaseContent}
                onBoilerplateSectionsChange={setBoilerplateSections}
                initialBoilerplateSections={boilerplateSections}
                hideMainContentField={false}
                enableSEOFeatures={true}
              />
            </div>

            {/* Key Visual */}
            <div className="border-t pt-6 mt-6">
              <KeyVisualSection
                value={keyVisual}
                onChange={setKeyVisual}
                clientId={selectedCompanyId}
                clientName={selectedCompanyName}
                organizationId={user!.uid}
                userId={user!.uid}
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

            {/* Freigabe */}
            <div className="border-t pt-6 mt-6">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={approvalRequired}
                  onChange={setApprovalRequired}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Freigabe vom Kunden erforderlich</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Wenn aktiviert, muss der Kunde die Pressemitteilung vor dem Versand freigeben.
                  </p>
                </div>
              </label>
            </div>
          </FieldGroup>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" plain onClick={() => router.push('/dashboard/pr-tools/campaigns')}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {saving ? 'Speichert...' : approvalRequired ? (
              <>
                <PaperAirplaneIcon className="h-4 w-4" />
                Freigabe anfordern
              </>
            ) : 'Als Entwurf speichern'}
          </Button>
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