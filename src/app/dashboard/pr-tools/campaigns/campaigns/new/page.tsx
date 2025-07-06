// src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Select } from "@/components/select";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
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
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { prService } from "@/lib/firebase/pr-service";
import { mediaService } from "@/lib/firebase/media-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { DistributionList } from "@/types/lists";
import { CampaignAssetAttachment } from "@/types/pr";
import { BoilerplateSection } from "@/components/pr/campaign/IntelligentBoilerplateSection"; // Korrekter Import
import { MediaAsset, MediaFolder } from "@/types/media";
import { Company } from "@/types/crm";
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
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    error: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

// Asset Selector Modal (bleibt unverändert)
function AssetSelectorModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onAssetsSelected,
  userId
}: {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
  userId: string;
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

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const search = searchTerm.toLowerCase();
    return assets.filter(a =>
      a.fileName.toLowerCase().includes(search) ||
      a.description?.toLowerCase().includes(search)
    );
  }, [assets, searchTerm]);

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
                        className="mr-3"
                      />
                      <FolderIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium">{folder.name}</p>
                        {folder.description && (
                          <p className="text-sm text-gray-500">{folder.description}</p>
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
                        className="mr-3"
                      />
                      {asset.fileType?.startsWith('image/') ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="h-10 w-10 object-cover rounded mr-3"
                        />
                      ) : (
                        <DocumentIcon className="h-10 w-10 text-gray-400 mr-3" />
                      )}
                      <div className="flex-1">
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

export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Form State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState(''); // Finaler HTML Content
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>([]); // Korrigierter Typ
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState(''); // NEU: Suchbegriff für Listen
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesData, listsData] = await Promise.all([
        companiesService.getAll(user.uid),
        listsService.getAll(user.uid)
      ]);
      setCompanies(companiesData);
      setAvailableLists(listsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCompany = useMemo(() =>
    companies.find(c => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const selectedLists = useMemo(() =>
    availableLists.filter(list => selectedListIds.includes(list.id!)),
    [availableLists, selectedListIds]
  );

  const totalRecipients = useMemo(() =>
    selectedLists.reduce((sum, list) => sum + list.contactCount, 0),
    [selectedLists]
  );

  // Gefilterte Listen basierend auf Suchbegriff
  const filteredLists = useMemo(() => {
    if (!listSearchTerm) return availableLists;
    
    const searchLower = listSearchTerm.toLowerCase();
    return availableLists.filter(list => 
      list.name.toLowerCase().includes(searchLower) ||
      (list.description && list.description.toLowerCase().includes(searchLower))
    );
  }, [availableLists, listSearchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const errors: string[] = [];
    if (!selectedCompanyId) {
      errors.push('Bitte wählen Sie einen Kunden aus');
    }
    if (selectedListIds.length === 0) {
      errors.push('Bitte wählen Sie mindestens einen Verteiler aus');
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
      const campaignData = {
        userId: user!.uid,
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        mainContent: mainContent,
        boilerplateSections: boilerplateSections, // NEU
        status: 'draft' as const,
        distributionListId: selectedListIds[0],
        distributionListName: selectedLists[0].name,
        distributionListIds: selectedListIds,
        distributionListNames: selectedLists.map(l => l.name),
        recipientCount: totalRecipients,
        clientId: selectedCompanyId,
        clientName: selectedCompany?.name || '',
        attachedAssets: attachedAssets,
        approvalRequired: approvalRequired,
        scheduledAt: null,
        sentAt: null
      };

      const newCampaignId = await prService.create(campaignData);
      
      if (approvalRequired) {
        await prService.requestApproval(newCampaignId);
      }
      
      router.push('/dashboard/pr-tools/campaigns');
    } catch (error) {
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = (result: any) => {
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    setMainContent(result.content);
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
          <Text className="mt-4">Lade Daten...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/pr-tools/campaigns"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Zurück zur Übersicht
        </Link>
        
        <Heading>Neue PR-Kampagne</Heading>
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-4">
          <Alert type="error" message={validationErrors[0]} />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
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
                  <Select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    required
                  >
                    <option value="">Kunde auswählen...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Verteiler */}
                <Field>
                  <Label className="flex items-center">
                    Verteiler
                    <InfoTooltip 
                      content="Pflichtfeld: Wählen Sie mindestens eine Verteilerliste aus. Die Pressemitteilung wird an alle Kontakte in den ausgewählten Listen gesendet."
                      className="ml-1"
                    />
                  </Label>
                  
                  {/* Suchfeld für Listen */}
                  <div className="mb-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={listSearchTerm}
                        onChange={(e) => setListSearchTerm(e.target.value)}
                        placeholder="Listen durchsuchen..."
                        className="pl-9"
                      />
                    </div>
                    {listSearchTerm && (
                      <p className="mt-1 text-sm text-gray-500">
                        {filteredLists.length} von {availableLists.length} Listen gefunden
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {filteredLists.length > 0 ? (
                      filteredLists.map((list) => (
                        <label key={list.id} className="flex items-center hover:bg-gray-50 rounded p-1">
                          <Checkbox
                            checked={selectedListIds.includes(list.id!)}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedListIds([...selectedListIds, list.id!]);
                              } else {
                                setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                              }
                            }}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <span className="font-medium">{list.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({list.contactCount} Kontakte)
                            </span>
                            {list.type === 'dynamic' && (
                              <Badge color="blue" className="ml-2 text-xs">Dynamisch</Badge>
                            )}
                            {list.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{list.description}</p>
                            )}
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <UsersIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">
                          {listSearchTerm 
                            ? 'Keine Listen gefunden' 
                            : 'Noch keine Verteiler erstellt'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedLists.length > 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      {totalRecipients.toLocaleString('de-DE')} Empfänger in {selectedLists.length} Listen
                    </p>
                  )}
                </Field>

                {/* Inhalt */}
                <div className="border-t pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center">
                      Pressemitteilung
                      <InfoTooltip 
                        content="Pflichtfeld: Erstellen Sie hier den Inhalt Ihrer Pressemitteilung. Sie müssen einen Titel und Hauptinhalt eingeben."
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
                  
                  {/* NEU: Content Composer mit Boilerplate-Props */}
                  <CampaignContentComposer
                    userId={user!.uid}
                    clientId={selectedCompanyId}
                    clientName={selectedCompany?.name}
                    title={campaignTitle}
                    onTitleChange={setCampaignTitle}
                    mainContent={mainContent}
                    onMainContentChange={setMainContent}
                    onFullContentChange={setPressReleaseContent}
                    onBoilerplateSectionsChange={setBoilerplateSections}
                    initialBoilerplateSections={boilerplateSections}
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
                        <PlusIcon />
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
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Zusammenfassung</h3>
              
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Kunde</dt>
                  <dd className="font-medium">
                    {selectedCompany?.name || <span className="text-gray-400">Nicht ausgewählt</span>}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-gray-500">Verteiler</dt>
                  <dd className="font-medium">
                    {selectedLists.length > 0 ? (
                      <>
                        {selectedLists.length} Listen ({totalRecipients.toLocaleString('de-DE')} Empfänger)
                      </>
                    ) : (
                      <span className="text-gray-400">Keine ausgewählt</span>
                    )}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-gray-500">Medien</dt>
                  <dd className="font-medium">
                    {attachedAssets.length > 0 ? (
                      `${attachedAssets.length} Medien`
                    ) : (
                      <span className="text-gray-400">Keine</span>
                    )}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-gray-500">Freigabe</dt>
                  <dd className="font-medium">
                    {approvalRequired ? (
                      <span className="text-orange-600">Erforderlich</span>
                    ) : (
                      <span className="text-gray-400">Nicht erforderlich</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
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
          clientName={selectedCompany?.name}
          onAssetsSelected={setAttachedAssets}
          userId={user.uid}
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: mainContent
          }}
        />
      )}
    </div>
  );
}