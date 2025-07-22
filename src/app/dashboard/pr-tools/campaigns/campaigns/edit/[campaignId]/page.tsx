// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
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
  FolderIcon,
  DocumentIcon,
  SparklesIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { mediaService } from "@/lib/firebase/media-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment, PRCampaign } from "@/types/pr";
import { BoilerplateSection } from "@/components/pr/campaign/IntelligentBoilerplateSection";
import { MediaAsset, MediaFolder } from "@/types/media";
import { Input } from "@/components/input";
import { InfoTooltip } from "@/components/InfoTooltip";

// Dynamic import für AI Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

// Alert Component
function Alert({
  type = 'info',
  title,
  message
}: {
  type?: 'info' | 'error' | 'success';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700'
  };

  const icons = {
    info: InformationCircleIcon,
    error: ExclamationTriangleIcon,
    success: CheckCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

// Asset Selector Modal
function AssetSelectorModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onAssetsSelected,
  userId,
  currentAssets = []
}: {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
  userId: string;
  currentAssets?: CampaignAssetAttachment[];
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && clientId) {
      loadClientMedia();
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    // Pre-select current assets
    if (currentAssets.length > 0) {
      const preSelected = new Set<string>();
      currentAssets.forEach(attachment => {
        if (attachment.type === 'asset' && attachment.assetId) {
          preSelected.add(attachment.assetId);
        } else if (attachment.type === 'folder' && attachment.folderId) {
          preSelected.add(attachment.folderId);
        }
      });
      setSelectedItems(preSelected);
    }
  }, [currentAssets]);

  const loadClientMedia = async () => {
    setLoading(true);
    try {
      const { assets: clientAssets, folders: clientFolders } = await mediaService.getMediaByClientId(
        userId,
        clientId
      );
      setAssets(clientAssets);
      setFolders(clientFolders);
    } catch (error) {
      console.error('Fehler beim Laden der Medien:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(a =>
    !searchTerm || a.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    const attachments: CampaignAssetAttachment[] = [];
    
    assets.forEach(asset => {
      if (selectedItems.has(asset.id!)) {
        attachments.push({
          id: `asset-${asset.id}`,
          type: 'asset',
          assetId: asset.id,
          metadata: {
            fileName: asset.fileName,
            fileType: asset.fileType,
            description: asset.description || '',
            thumbnailUrl: asset.downloadUrl
          },
          attachedAt: new Date() as any,
          attachedBy: userId
        });
      }
    });

    folders.forEach(folder => {
      if (selectedItems.has(folder.id!)) {
        attachments.push({
          id: `folder-${folder.id}`,
          type: 'folder',
          folderId: folder.id,
          metadata: {
            folderName: folder.name,
            description: folder.description || ''
          },
          attachedAt: new Date() as any,
          attachedBy: userId
        });
      }
    });

    onAssetsSelected(attachments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle className="px-6 py-4">Medien auswählen</DialogTitle>
      <DialogBody className="px-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Medien suchen..."
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <Text className="mt-4">Lade Medien...</Text>
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Ordner</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {folders.map(folder => (
                    <label
                      key={folder.id}
                      className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItems.has(folder.id!)}
                        onChange={(checked) => {
                          const newSelection = new Set(selectedItems);
                          if (checked) {
                            newSelection.add(folder.id!);
                          } else {
                            newSelection.delete(folder.id!);
                          }
                          setSelectedItems(newSelection);
                        }}
                        className="mr-3 shrink-0"
                      />
                      <FolderIcon className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        {folder.description && (
                          <p className="text-sm text-gray-500 truncate">{folder.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {filteredAssets.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Dateien</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAssets.map(asset => (
                    <label
                      key={asset.id}
                      className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItems.has(asset.id!)}
                        onChange={(checked) => {
                          const newSelection = new Set(selectedItems);
                          if (checked) {
                            newSelection.add(asset.id!);
                          } else {
                            newSelection.delete(asset.id!);
                          }
                          setSelectedItems(newSelection);
                        }}
                        className="mr-3 shrink-0"
                      />
                      {asset.fileType?.startsWith('image/') ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="h-10 w-10 object-cover rounded mr-3 shrink-0"
                        />
                      ) : (
                        <DocumentIcon className="h-10 w-10 text-gray-400 mr-3 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {assets.length === 0 && folders.length === 0 && (
              <div className="text-center py-12">
                <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Text>Keine Medien für diesen Kunden gefunden</Text>
                <Link
                  href={`/dashboard/pr-tools/media-library?uploadFor=${clientId}`}
                  target="_blank"
                  className="inline-flex items-center mt-4 text-[#005fab] hover:text-[#004a8c]"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                  Medien hochladen
                </Link>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleConfirm}
          disabled={selectedItems.size === 0}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
        >
          {selectedItems.size} Medien übernehmen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const formRef = useRef<HTMLFormElement>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Form State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
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
  const [approvalRequired, setApprovalRequired] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

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
        console.warn('Organization loading failed, using userId as fallback:', error);
        setOrganizationId(user.uid);
      }
    };
    
    loadOrganizationId();
  }, [user]);

  useEffect(() => {
    if (user && organizationId && campaignId) {
      loadCampaignData();
    }
  }, [user, organizationId, campaignId]);

  const loadCampaignData = async () => {
    if (!user || !organizationId || !campaignId) return;
    
    setLoading(true);
    try {
      // Load campaign
      const campaignData = await prService.getById(campaignId);
      if (!campaignData) {
        setAlert({ type: 'error', message: 'Kampagne nicht gefunden' });
        return;
      }
      
      setCampaign(campaignData);
      
      // Set form data
      setCampaignTitle(campaignData.title);
      setPressReleaseContent(campaignData.contentHtml);
      
      // Convert CampaignBoilerplateSection to BoilerplateSection
      const convertedSections: BoilerplateSection[] = (campaignData.boilerplateSections || []).map(section => ({
        id: section.id,
        type: section.type || 'custom' as any, // Fallback wenn type undefined ist
        position: section.position,
        order: section.order,
        isLocked: section.isLocked || false,
        isCollapsed: section.isCollapsed || false,
        boilerplateId: section.boilerplateId,
        content: section.content,
        metadata: section.metadata,
        customTitle: section.customTitle
      }));
      setBoilerplateSections(convertedSections);
      
      setSelectedCompanyId(campaignData.clientId || '');
      setSelectedCompanyName(campaignData.clientName || '');
      setSelectedListId(campaignData.distributionListId);
      setSelectedListName(campaignData.distributionListName);
      setRecipientCount(campaignData.recipientCount);
      setAttachedAssets(campaignData.attachedAssets || []);
      setApprovalRequired(campaignData.approvalRequired || false);
      
      // Load lists
      const listsData = await listsService.getAll(organizationId);
      setAvailableLists(listsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      setAlert({ type: 'error', message: 'Fehler beim Laden der Kampagne' });
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
      // Bereite die boilerplateSections für Firebase vor
      const cleanedSections = boilerplateSections.map(section => {
        const cleaned: any = {
          id: section.id,
          type: section.type,
          position: section.position,
          order: section.order,
          isLocked: section.isLocked,
          isCollapsed: section.isCollapsed
        };
        
        // Nur definierte Werte hinzufügen
        if (section.boilerplateId) cleaned.boilerplateId = section.boilerplateId;
        if (section.content) cleaned.content = section.content;
        if (section.metadata) cleaned.metadata = section.metadata;
        if (section.customTitle) cleaned.customTitle = section.customTitle;
        
        return cleaned;
      });

      const updateData = {
        title: campaignTitle,
        contentHtml: pressReleaseContent || '',
        boilerplateSections: cleanedSections,
        distributionListId: selectedListId,
        distributionListName: selectedListName,
        recipientCount: recipientCount,
        clientId: selectedCompanyId,
        clientName: selectedCompanyName,
        attachedAssets: attachedAssets,
        approvalRequired: approvalRequired
      };

      console.log('Aktualisiere Kampagne mit Daten:', updateData);
      
      await prService.update(campaignId, updateData);
      
      setAlert({ type: 'success', message: 'Kampagne erfolgreich gespeichert' });
      
      // Nach kurzer Verzögerung zur Detail-Seite
      setTimeout(() => {
        router.push(`/dashboard/pr-tools/campaigns/campaigns/${campaignId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Fehler beim Speichern der Kampagne:', error);
      
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
      
      // Lead-Absatz
      if (result.structured.leadParagraph && result.structured.leadParagraph !== 'Lead-Absatz fehlt') {
        aiSections.push({
          id: `ai-lead-${Date.now()}`,
          type: 'lead',
          position: 'custom',
          order: 0,
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
            position: 'custom',
            order: 1,
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
          position: 'custom',
          order: aiSections.length,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kampagne...</Text>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <Heading level={2}>Kampagne nicht gefunden</Heading>
        <Button href="/dashboard/pr-tools/campaigns" className="mt-4">
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/pr-tools/campaigns/campaigns/${campaignId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Zurück zur Kampagne
        </Link>
        
        <Heading>Kampagne bearbeiten</Heading>
        <Text className="mt-2 text-gray-600">
          Bearbeiten Sie die Details Ihrer PR-Kampagne
        </Text>
      </div>

      {/* Alerts */}
      {alert && (
        <div className="mb-6 animate-fade-in">
          <Alert type={alert.type} message={alert.message} />
        </div>
      )}

      {/* Fehlermeldungen */}
      {validationErrors.length > 0 && (
        <div className="mb-6 animate-shake">
          <Alert type="error" message={validationErrors[0]} />
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
                  content="Pflichtfeld: Wählen Sie den Kunden aus, für den diese PR-Kampagne erstellt wird."
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
                  content="Pflichtfeld: Wählen Sie eine Verteilerliste aus."
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
                    content="Pflichtfeld: Bearbeiten Sie den Inhalt Ihrer Pressemitteilung."
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

              {/* Content Composer */}
              <CampaignContentComposer
                key={`composer-${boilerplateSections.length}`}
                userId={user!.uid}
                clientId={selectedCompanyId}
                clientName={selectedCompanyName}
                title={campaignTitle}
                onTitleChange={setCampaignTitle}
                mainContent=""
                onMainContentChange={() => {}}
                onFullContentChange={setPressReleaseContent}
                onBoilerplateSectionsChange={setBoilerplateSections}
                initialBoilerplateSections={boilerplateSections}
                hideMainContentField={true}
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
                    Medien bearbeiten
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
                          <DocumentIcon className="h-5 w-5 text-gray-400" />
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
          <Button 
            type="button" 
            plain 
            href={`/dashboard/pr-tools/campaigns/campaigns/${campaignId}`}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {saving ? 'Speichert...' : 'Änderungen speichern'}
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
          userId={user.uid}
          currentAssets={attachedAssets}
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
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
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}