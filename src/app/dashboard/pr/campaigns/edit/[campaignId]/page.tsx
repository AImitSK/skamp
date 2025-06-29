// src/app/dashboard/pr/campaigns/edit/[campaignId]/page.tsx - Gefixt
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { mediaService } from '@/lib/firebase/media-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign, CampaignAssetAttachment } from '@/types/pr';
import { MediaAsset, MediaFolder } from '@/types/media';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field} from '@/components/fieldset';
import { Label } from '@/components/label'; 
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { CustomerBadge } from '@/components/pr/CustomerSelector';
import { Badge } from '@/components/badge';
import Link from 'next/link';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ClockIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";

// Dynamic import für das kompatible Modal
import dynamic from 'next/dynamic';
import { LegacyGenerationResult } from '@/lib/ai/interface-adapters';

const CompatibleStructuredModal = dynamic(() => import('@/components/pr/ai/CompatibleStructuredModal'), {
  ssr: false
});

// Verwende Legacy Generation Result für Kompatibilität
type GenerationResult = LegacyGenerationResult;

// Einfacher Asset-Selector Modal (mit Fix)
function AssetSelectorModal({ 
  isOpen, 
  onClose, 
  clientId,
  clientName,
  onAssetsSelected 
}: { 
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user && clientId) {
      loadClientMedia();
    }
  }, [isOpen, user, clientId]);

  const loadClientMedia = async () => {
    if (!user || !clientId) return;
    
    setLoading(true);
    try {
      const { assets: clientAssets, folders: clientFolders } = await mediaService.getMediaByClientId(
        user.uid,
        clientId
      );
      
      // Dedupliziere Assets basierend auf ID
      const uniqueAssets = clientAssets.filter((asset, index, self) =>
        index === self.findIndex((a) => a.id === asset.id)
      );
      
      const uniqueFolders = clientFolders.filter((folder, index, self) =>
        index === self.findIndex((f) => f.id === folder.id)
      );
      
      setAssets(uniqueAssets);
      setFolders(uniqueFolders);
    } catch (error) {
      console.error('Fehler beim Laden der Medien:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleConfirm = () => {
    const attachments: CampaignAssetAttachment[] = [];
    
    // Assets hinzufügen
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
          attachedAt: null as any, // Placeholder - will be removed before saving
          attachedBy: user?.uid || ''
        });
      }
    });

    // Ordner hinzufügen
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
          attachedAt: null as any, // Placeholder - will be removed before saving
          attachedBy: user?.uid || ''
        });
      }
    });

    onAssetsSelected(attachments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Medien auswählen</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Wähle Medien von {clientName || 'diesem Kunden'} aus
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Lade Medien...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ordner */}
                {folders.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Ordner</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {folders.map(folder => (
                        <button
                          key={`folder-${folder.id}`}
                          onClick={() => toggleSelection(folder.id!)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedItems.has(folder.id!)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <FolderIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium truncate">{folder.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {assets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Dateien</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {assets.map(asset => (
                        <button
                          key={`asset-${asset.id}`}
                          onClick={() => toggleSelection(asset.id!)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            selectedItems.has(asset.id!)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {asset.fileType.startsWith('image/') ? (
                            <img 
                              src={asset.downloadUrl} 
                              alt={asset.fileName}
                              className="h-16 w-full object-cover rounded mb-2"
                            />
                          ) : (
                            <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                          )}
                          <p className="text-xs font-medium truncate">{asset.fileName}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {assets.length === 0 && folders.length === 0 && (
                  <div className="text-center py-12">
                    <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Keine Medien für diesen Kunden gefunden</p>
                    <Link 
                      href={`/dashboard/mediathek?uploadFor=${clientId}`}
                      target="_blank"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      Medien in neuem Tab hochladen
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedItems.size} ausgewählt
              </p>
              <div className="flex gap-3">
                <Button plain onClick={onClose}>
                  Abbrechen
                </Button>
                <Button 
                  color="indigo" 
                  onClick={handleConfirm}
                  disabled={selectedItems.size === 0}
                >
                  Auswahl übernehmen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  // Form State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Asset Selector State
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  const loadCampaignData = useCallback(async () => {
    if (!user || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [campaignData, listsData] = await Promise.all([
        prService.getById(campaignId),
        listsService.getAll(user.uid)
      ]);

      if (!campaignData) {
        setError("Kampagne nicht gefunden.");
        setLoading(false);
        return;
      }

      setCampaign(campaignData);
      setAvailableLists(listsData);
      
      // Formular-Felder mit den geladenen Daten befüllen
      setCampaignTitle(campaignData.title);
      setSelectedListId(campaignData.distributionListId);
      setPressReleaseContent(campaignData.contentHtml);
      setAttachedAssets(campaignData.attachedAssets || []);

      // KI-Metadata laden (falls vorhanden)
      try {
        const metadata = localStorage.getItem(`campaign_ai_metadata_${campaignId}`);
        if (metadata) {
          setAiMetadata(JSON.parse(metadata));
        }
      } catch (e) {
        // Ignoriere Fehler beim Laden der Metadata
      }

    } catch (err) {
      console.error("Fehler beim Laden der Kampagne:", err);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const selectedList = availableLists.find(list => list.id === selectedListId);
  const isFormValid = !!selectedListId && campaignTitle.trim() !== '' && pressReleaseContent.trim() !== '' && pressReleaseContent !== '<p></p>';

  const handleUpdate = async () => {
    if (!isFormValid || !campaign) return;

    setIsSaving(true);
    try {
      // Remove attachedAt from each asset using destructuring
      const cleanedAssets = attachedAssets.map(({ attachedAt, ...rest }) => rest);

      const updatedData = {
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        distributionListId: selectedListId,
        distributionListName: selectedList?.name,
        recipientCount: selectedList?.contactCount,
        attachedAssets: cleanedAssets,
      };
      
      await prService.update(campaign.id!, updatedData);
      
      // Erfolgs-Nachricht anzeigen
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten beim Speichern der Kampagne.");
    } finally {
      setIsSaving(false);
    }
  };

  // Asset Management
  const handleAssetsSelected = async (newAssets: CampaignAssetAttachment[]) => {
    try {
      // Füge neue Assets hinzu
      await prService.attachAssets(campaign!.id!, newAssets);
      
      // Aktualisiere lokalen State
      setAttachedAssets([...attachedAssets, ...newAssets]);
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Fehler beim Anhängen der Assets:', error);
      alert('Fehler beim Anhängen der Medien');
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    try {
      const asset = attachedAssets.find(a => 
        (a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId)
      );
      
      if (!asset) return;
      
      // Entferne aus Backend
      await prService.removeAssets(campaign!.id!, [assetId]);
      
      // Aktualisiere lokalen State
      setAttachedAssets(attachedAssets.filter(a => a !== asset));
      
    } catch (error) {
      console.error('Fehler beim Entfernen des Assets:', error);
    }
  };

  // KI-Content Handler mit intelligenter Übernahme
  const handleAiGenerate = (result: GenerationResult) => {
    console.log('🤖 AI Generation Result (Edit Mode):', result);

    // Intelligente Feld-Übernahme
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    setPressReleaseContent(result.content);

    // Metadata aktualisieren
    if (result.metadata) {
      setAiMetadata({
        generatedBy: result.metadata.generatedBy,
        timestamp: result.metadata.timestamp,
        context: result.metadata.context
      });

      // Metadata in localStorage speichern
      if (campaign?.id) {
        localStorage.setItem(`campaign_ai_metadata_${campaign.id}`, JSON.stringify({
          generatedBy: result.metadata.generatedBy,
          timestamp: result.metadata.timestamp,
          context: result.metadata.context
        }));
      }
    }

    // Modal schließen und Success anzeigen
    setShowAiModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  if (loading) return <div className="p-8 text-center">Lade Kampagnen-Daten...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <Heading>Kampagne bearbeiten</Heading>
        <Text className="mt-1">Du bearbeitest den Entwurf: "{campaign?.title}"</Text>
        
        {/* Campaign Metadata with Customer Info */}
        {campaign && (
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Erstellt: {campaign.createdAt?.toDate().toLocaleDateString('de-DE')}
            </div>
            {campaign.clientId && (
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="h-4 w-4" />
                <CustomerBadge 
                  customerId={campaign.clientId} 
                  customerName={campaign.clientName}
                  showIcon={false}
                />
              </div>
            )}
            {aiMetadata && (
              <div className="flex items-center text-indigo-600">
                <SparklesIcon className="h-4 w-4 mr-1" />
                KI-generiert: {new Date(aiMetadata.timestamp).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="font-medium text-green-900">Änderungen gespeichert!</h4>
              <p className="text-sm text-green-700 mt-1">
                Die Kampagne wurde erfolgreich aktualisiert.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 p-8 border rounded-lg bg-white">
        {/* Customer Info Section - READ ONLY in Edit Mode */}
        {campaign?.clientId && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-600">Kunde</Label>
                <div className="mt-1 flex items-center gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {campaign.clientName || 'Unbekannter Kunde'}
                  </span>
                  <CustomerBadge 
                    customerId={campaign.clientId} 
                    customerName={campaign.clientName}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Link 
                  href={`/dashboard/mediathek?clientId=${campaign.clientId}`}
                  target="_blank"
                >
                  <Button plain className="text-sm">
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    Medien verwalten
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <Field>
          <Label className="text-base font-semibold">Verteiler</Label>
          <Select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
            <option value="">Verteiler wählen...</option>
            {availableLists.map(list => (
              <option key={list.id} value={list.id!}>
                {list.name} ({list.contactCount} Kontakte)
              </option>
            ))}
          </Select>
          
          {selectedList && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm">
              <p>
                <strong>{selectedList.contactCount} Empfänger</strong> in der Liste "{selectedList.name}".
              </p>
            </div>
          )}
        </Field>

        <div className="border-t pt-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-semibold">Pressemitteilung</h3>
              <Text>Bearbeite den Titel und den Inhalt deiner Mitteilung.</Text>
              
              {/* KI-Metadata anzeigen */}
              {aiMetadata && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                  <div className="flex items-center text-indigo-700">
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    <span className="font-medium">Von KI generiert</span>
                    <span className="ml-2">
                      {new Date(aiMetadata.timestamp).toLocaleString('de-DE')}
                    </span>
                    {aiMetadata.context?.industry && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                        {aiMetadata.context.industry}
                      </span>
                    )}
                    {aiMetadata.context?.tone && (
                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                        {aiMetadata.context.tone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg"
            >
              <SparklesIcon className="w-5 h-5"/>
              KI-Assistent verwenden
            </Button>
          </div>
          
          <div className="mt-4 space-y-4">
            <Field>
              <Label>Titel / Betreffzeile</Label>
              <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
            </Field>
            <Field>
              <Label>Inhalt</Label>
              <RichTextEditor content={pressReleaseContent} onChange={setPressReleaseContent} />
            </Field>
          </div>
        </div>

        {/* Assets Section - Funktionsfähig! */}
        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                Medien anhängen
              </h3>
              <Text>
                Füge Bilder, Dokumente und andere Medien zu deiner Kampagne hinzu.
              </Text>
            </div>
            
            {campaign?.clientId && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAssetSelector(true)}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Medien auswählen
                </Button>
                <Link
                  href={`/dashboard/mediathek?uploadFor=${campaign.clientId}`}
                  target="_blank"
                >
                  <Button plain className="flex items-center gap-2">
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Neue hochladen
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Angehängte Assets anzeigen */}
          {attachedAssets.length > 0 ? (
            <div className="space-y-3">
              {attachedAssets.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {attachment.type === 'folder' ? (
                      <FolderIcon className="h-6 w-6 text-gray-400" />
                    ) : attachment.metadata.fileType?.startsWith('image/') ? (
                      <img
                        src={attachment.metadata.thumbnailUrl}
                        alt={attachment.metadata.fileName}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <DocumentIcon className="h-6 w-6 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {attachment.metadata.fileName || attachment.metadata.folderName}
                      </p>
                      {attachment.metadata.description && (
                        <p className="text-xs text-gray-500">{attachment.metadata.description}</p>
                      )}
                    </div>
                    {attachment.type === 'folder' && (
                      <Badge color="blue" className="text-xs">Ordner</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveAsset(attachment.assetId || attachment.folderId || '')}
                    className="text-red-600 hover:text-red-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Noch keine Medien angehängt</p>
              {!campaign?.clientId && (
                <p className="text-sm text-gray-400 mt-1">
                  Wähle zuerst einen Kunden aus, um Medien anzuhängen
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t pt-8">
           <h3 className="text-base font-semibold text-zinc-400">Versand planen (zukünftiges Feature)</h3>
           <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Zurück zur Übersicht</Button>
        </Link>
        <Button color="indigo" disabled={!isFormValid || isSaving} onClick={handleUpdate}>
          {isSaving ? 'Speichern...' : 'Änderungen speichern'}
        </Button>
      </div>

      {/* Asset Selector Modal */}
      {campaign?.clientId && (
        <AssetSelectorModal
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={campaign.clientId}
          clientName={campaign.clientName}
          onAssetsSelected={handleAssetsSelected}
        />
      )}

      {/* Kompatibles strukturiertes KI-Modal */}
      {showAiModal && (
        <CompatibleStructuredModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
          // TODO: Pass customer context
          // customerContext={{
          //   companyName: campaign?.clientName,
          //   companyId: campaign?.clientId
          // }}
        />
      )}
    </div>
  );
}