// src/app/dashboard/pr/campaigns/new/page.tsx - KORRIGIERT mit verbessertem Asset-Loading
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { mediaService } from '@/lib/firebase/media-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign, CampaignAssetAttachment } from '@/types/pr';
import { MediaAsset, MediaFolder } from '@/types/media';
import { GenerationResult } from '@/types/ai';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Description } from '@/components/fieldset';
import { Label } from '@/components/label'; 
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Badge } from '@/components/badge';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import Link from 'next/link';

// Import Customer Selector
import { CustomerSelector } from '@/components/pr/CustomerSelector';
import { ListSelector } from '@/components/pr/ListSelector';

// Dynamic import für das neue Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

// Hilfsfunktion für sicheres Bildladen
const AssetPreview = ({ asset }: { asset: MediaAsset }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const isImage = asset.fileType?.startsWith('image/');
  
  if (!isImage) {
    return <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />;
  }
  
  return (
    <div className="relative h-16 w-full mb-2">
      {loading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded" />
      )}
      
      {!imageError && asset.downloadUrl && (
        <img 
          src={asset.downloadUrl} 
          alt={asset.fileName}
          className="h-16 w-full object-cover rounded"
          onError={(e) => {
            console.error(`Failed to load image: ${asset.fileName}`, e);
            setImageError(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
        />
      )}
      
      {(imageError || !asset.downloadUrl) && (
        <div className="h-16 w-full bg-gray-100 rounded flex items-center justify-center">
          <PhotoIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Asset-Selector Modal (KORRIGIERT)
function AssetSelectorModal({ 
  isOpen, 
  onClose, 
  clientId,
  clientName,
  onAssetsSelected,
  existingAssets = []
}: { 
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
  existingAssets?: CampaignAssetAttachment[];
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialisiere mit bereits ausgewählten Assets
  useEffect(() => {
    if (isOpen && existingAssets.length > 0) {
      const existing = new Set<string>();
      existingAssets.forEach(asset => {
        if (asset.type === 'asset' && asset.assetId) {
          existing.add(asset.assetId);
        } else if (asset.type === 'folder' && asset.folderId) {
          existing.add(asset.folderId);
        }
      });
      setSelectedItems(existing);
    }
  }, [isOpen, existingAssets]);

  useEffect(() => {
    if (isOpen && user && clientId) {
      loadClientMedia();
    }
  }, [isOpen, user, clientId]);

  const loadClientMedia = async () => {
    if (!user || !clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Loading media for client: ${clientId}`);
      
      const { assets: clientAssets, folders: clientFolders } = await mediaService.getMediaByClientId(
        user.uid,
        clientId
      );
      
      console.log(`📊 Raw data from service: ${clientAssets.length} assets, ${clientFolders.length} folders`);
      
      // Validiere und bereinige Assets
      const processedAssets = await processAssets(clientAssets);
      const processedFolders = processFolders(clientFolders);
      
      setAssets(processedAssets);
      setFolders(processedFolders);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Medien:', error);
      setError('Fehler beim Laden der Medien. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Verarbeite und validiere Assets
  const processAssets = async (rawAssets: MediaAsset[]): Promise<MediaAsset[]> => {
    console.log('🧹 Processing assets...');
    
    // 1. Filtere ungültige Assets
    const validAssets = rawAssets.filter(asset => {
      if (!asset.id) {
        console.warn('⚠️ Asset ohne ID gefunden:', asset);
        return false;
      }
      if (!asset.downloadUrl) {
        console.warn(`⚠️ Asset ${asset.id} ohne Download-URL:`, asset.fileName);
        return false;
      }
      if (!asset.fileName) {
        console.warn(`⚠️ Asset ${asset.id} ohne Dateinamen`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ Valid assets: ${validAssets.length} of ${rawAssets.length}`);
    
    // 2. Entferne Duplikate
    const uniqueMap = new Map<string, MediaAsset>();
    validAssets.forEach(asset => {
      if (!uniqueMap.has(asset.id!)) {
        uniqueMap.set(asset.id!, asset);
      } else {
        console.warn(`⚠️ Duplikat gefunden und entfernt: ${asset.id} - ${asset.fileName}`);
      }
    });
    
    const uniqueAssets = Array.from(uniqueMap.values());
    console.log(`🎯 Unique assets: ${uniqueAssets.length}`);
    
    // 3. Sortiere nach Datum (neueste zuerst)
    uniqueAssets.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    // 4. Validiere URLs für Bilder
    const processedAssets = await Promise.all(
      uniqueAssets.map(async (asset) => {
        if (asset.fileType?.startsWith('image/') && asset.downloadUrl) {
          try {
            // Prüfe ob die URL gültig ist
            const url = new URL(asset.downloadUrl);
            if (!url.protocol.startsWith('http')) {
              console.warn(`⚠️ Ungültiges Protokoll für Asset ${asset.id}: ${url.protocol}`);
              asset.downloadUrl = ''; // Setze ungültige URL auf leer
            }
          } catch (e) {
            console.warn(`⚠️ Ungültige URL für Asset ${asset.id}: ${asset.downloadUrl}`);
            asset.downloadUrl = ''; // Setze ungültige URL auf leer
          }
        }
        return asset;
      })
    );
    
    // 5. Final check
    if (processedAssets.length > 0) {
      console.log('🔍 Erste Asset:', {
        id: processedAssets[0].id,
        name: processedAssets[0].fileName,
        hasUrl: !!processedAssets[0].downloadUrl
      });
      
      const lastAsset = processedAssets[processedAssets.length - 1];
      console.log('🔍 Letzte Asset:', {
        id: lastAsset.id,
        name: lastAsset.fileName,
        hasUrl: !!lastAsset.downloadUrl
      });
    }
    
    return processedAssets;
  };

  // Verarbeite Ordner
  const processFolders = (rawFolders: MediaFolder[]): MediaFolder[] => {
    // Entferne Duplikate
    const uniqueMap = new Map<string, MediaFolder>();
    rawFolders.forEach(folder => {
      if (folder.id && !uniqueMap.has(folder.id)) {
        uniqueMap.set(folder.id, folder);
      }
    });
    
    const uniqueFolders = Array.from(uniqueMap.values());
    
    // Sortiere alphabetisch
    return uniqueFolders.sort((a, b) => a.name.localeCompare(b.name));
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
            ) : error ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadClientMedia}>Erneut versuchen</Button>
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
                    <h4 className="font-medium text-gray-900 mb-3">
                      Dateien ({assets.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {assets.map((asset, index) => (
                        <button
                          key={`asset-${asset.id}`}
                          onClick={() => toggleSelection(asset.id!)}
                          className={`p-3 rounded-lg border-2 transition-all relative ${
                            selectedItems.has(asset.id!)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={`${asset.fileName} (${index + 1}/${assets.length})`}
                        >
                          <AssetPreview asset={asset} />
                          
                          <p className="text-xs font-medium truncate">
                            {asset.fileName}
                          </p>
                          
                          {/* Warnung für fehlerhafte Assets */}
                          {!asset.downloadUrl && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-10 rounded-lg flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                            </div>
                          )}
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

export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Form State - Customer First!
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  
  // NEU: Assets State
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerationHistory, setAiGenerationHistory] = useState<GenerationResult[]>([]);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);

  // Success/Warning State
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setLoading(true);
      listsService.getAll(user.uid)
        .then(setAvailableLists)
        .catch((error) => {
          console.error('Fehler beim Laden der Listen:', error);
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const selectedList = useMemo(() => 
    availableLists.find(list => list.id === selectedListId),
    [availableLists, selectedListId]
  );
  
  // Form validity check als useMemo statt Funktion
  const isFormValid = useMemo(() => {
    return !!(
      selectedCustomerId &&
      selectedListId &&
      campaignTitle.trim() &&
      pressReleaseContent.trim() &&
      pressReleaseContent !== '<p></p>'
    );
  }, [selectedCustomerId, selectedListId, campaignTitle, pressReleaseContent]);

  // Validation nur bei Submit
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedCustomerId) {
      errors.customer = 'Bitte wählen Sie einen Kunden aus';
    }
    if (!selectedListId) {
      errors.list = 'Bitte wählen Sie einen Verteiler aus';
    }
    if (!campaignTitle.trim()) {
      errors.title = 'Bitte geben Sie einen Titel ein';
    }
    if (!pressReleaseContent.trim() || pressReleaseContent === '<p></p>') {
      errors.content = 'Bitte verfassen Sie eine Pressemitteilung';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedCustomerId, selectedListId, campaignTitle, pressReleaseContent]);

  const handleSaveDraft = async () => {
    if (!validateForm() || !user || !selectedList) return;

    setIsSaving(true);
    try {
      // Remove attachedAt from each asset using destructuring
      const cleanedAssets = attachedAssets.map(({ attachedAt, ...rest }) => rest);

      const campaignData = {
        userId: user.uid,
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        status: 'draft' as const,
        distributionListId: selectedList.id!,
        distributionListName: selectedList.name,
        recipientCount: selectedList.contactCount,
        clientId: selectedCustomerId,
        clientName: selectedCustomerName,
        attachedAssets: cleanedAssets,
        scheduledAt: null,
        sentAt: null,
      };

      const newCampaignId = await prService.create(campaignData);
      
      // Optional: Metadata für KI-Nutzung speichern
      if (lastGeneration && lastGeneration.metadata) {
        localStorage.setItem(`campaign_ai_metadata_${newCampaignId}`, JSON.stringify({
          generatedBy: lastGeneration.metadata.generatedBy,
          timestamp: lastGeneration.metadata.timestamp,
          context: lastGeneration.metadata.context
        }));
      }

      router.push(`/dashboard/pr/campaigns/edit/${newCampaignId}`);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten beim Speichern der Kampagne.");
    } finally {
      setIsSaving(false);
    }
  };

  // KI-Content Handler
  const handleAiGenerate = useCallback((result: GenerationResult) => {
    console.log('🤖 AI Generation Result:', result);

    if (result.headline && result.structured?.headline) {
      setCampaignTitle(result.headline);
    } else if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }

    setPressReleaseContent(result.content);

    setLastGeneration(result);
    setAiGenerationHistory(prev => [...prev, result]);
    setShowAiModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  }, []);

  // Customer Change Handler
  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    // Clear customer validation error only
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.customer;
      return newErrors;
    });
    
    // Reset attached assets when customer changes
    if (customerId !== selectedCustomerId) {
      setAttachedAssets([]);
    }
  }, [selectedCustomerId]);

  // Asset Management
  const handleAssetsSelected = (newAssets: CampaignAssetAttachment[]) => {
    setAttachedAssets(newAssets);
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a => 
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
  };

  // List Change Handler
  const handleListChange = useCallback((listId: string, listName: string, contactCount: number) => {
    setSelectedListId(listId);
    // Clear list validation error only
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.list;
      return newErrors;
    });
  }, []);

  // Title Change Handler
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCampaignTitle(e.target.value);
    // Clear title validation error only
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.title;
      return newErrors;
    });
  }, []);

  // Content Change Handler
  const handleContentChange = useCallback((content: string) => {
    setPressReleaseContent(content);
    // Clear content validation error only
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.content;
      return newErrors;
    });
  }, []);

  // Progress Steps
  const steps = [
    { 
      id: 'customer', 
      name: 'Kunde', 
      icon: BuildingOfficeIcon,
      completed: !!selectedCustomerId 
    },
    { 
      id: 'list', 
      name: 'Verteiler', 
      icon: UsersIcon,
      completed: !!selectedListId 
    },
    { 
      id: 'content', 
      name: 'Inhalt', 
      icon: DocumentTextIcon,
      completed: !!campaignTitle && !!pressReleaseContent 
    },
    {
      id: 'media',
      name: 'Medien',
      icon: PhotoIcon,
      completed: attachedAssets.length > 0
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <Heading>Neue PR-Kampagne erstellen</Heading>
        <Text className="mt-1">Erstellen Sie eine neue Pressemitteilung für Ihre Kunden.</Text>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-4xl">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center ${
                  step.completed ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  <div className={`rounded-full p-2 ${
                    step.completed ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    {step.completed ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="ml-2 font-medium text-sm">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-12 ${
                    step.completed ? 'bg-indigo-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="font-medium text-green-900">
                {lastGeneration ? 'KI-Assistent erfolgreich verwendet!' : 'Entwurf gespeichert!'}
              </h4>
              <p className="text-sm text-green-700 mt-1">
                {lastGeneration 
                  ? 'Die Pressemitteilung wurde automatisch in Titel und Inhalt übernommen.'
                  : 'Deine Kampagne wurde als Entwurf gespeichert.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 p-8 border rounded-lg bg-white">
        {/* Schritt 1: Kunde auswählen */}
        <div>
          <h3 className="text-base font-semibold mb-4 flex items-center">
            <span className="bg-indigo-100 text-indigo-700 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3">
              1
            </span>
            Für welchen Kunden ist diese Kampagne?
          </h3>
          
          <CustomerSelector
            value={selectedCustomerId}
            onChange={handleCustomerChange}
            required={true}
            description=""
            error={validationErrors.customer}
            showStats={false}
            showQuickAdd={false}
          />
        </div>

        {/* Schritt 2: Verteiler auswählen (NUR WENN KUNDE AUSGEWÄHLT) */}
        <div className={!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''}>
          <h3 className="text-base font-semibold mb-4 flex items-center">
            <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 ${
              selectedCustomerId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </span>
            An wen soll die Kampagne gesendet werden?
          </h3>
          
          <ListSelector
            value={selectedListId}
            onChange={handleListChange}
            lists={availableLists}
            loading={loading}
            required={true}
            error={validationErrors.list}
            showStats={true}
            showQuickAdd={true}
          />
        </div>

        {/* Schritt 3: Pressemitteilung (NUR WENN KUNDE & LISTE AUSGEWÄHLT) */}
        <div className={!selectedCustomerId || !selectedListId ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-t pt-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
              <div>
                <h3 className="text-base font-semibold flex items-center">
                  <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 ${
                    selectedCustomerId && selectedListId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    3
                  </span>
                  Pressemitteilung verfassen
                </h3>
                <Text>Erstelle professionelle Pressemitteilungen mit dem KI-Assistenten oder manuell.</Text>
                
                {/* KI-Features Highlight */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Strukturierte Generierung
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Intelligente Übernahme
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Journalistische Standards
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowAiModal(true)}
                disabled={!selectedCustomerId || !selectedListId}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg self-start sm:self-auto"
              >
                <SparklesIcon className="w-5 h-5" />
                KI-Assistent öffnen
              </Button>
            </div>

            {/* KI-Generation History */}
            {aiGenerationHistory.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <SparklesIcon className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">
                      KI-Assistent verwendet ({aiGenerationHistory.length}x)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAiModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Erneut verwenden
                  </button>
                </div>
                {lastGeneration?.metadata && (
                  <div className="mt-2 text-xs text-blue-700">
                    Letzte Generierung: {lastGeneration.metadata.timestamp ? 
                      new Date(lastGeneration.metadata.timestamp).toLocaleString('de-DE') : 
                      'Gerade eben'
                    }
                    {lastGeneration.metadata.context?.industry && 
                      ` • ${lastGeneration.metadata.context.industry}`
                    }
                    {lastGeneration.metadata.context?.tone && 
                      ` • ${lastGeneration.metadata.context.tone}`
                    }
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 space-y-4">
              <Field>
                <Label>Titel / Betreffzeile *</Label>
                <Input 
                  value={campaignTitle}
                  onChange={handleTitleChange}
                  placeholder="Innovative Partnerschaft revolutioniert die Branche..."
                  className={validationErrors.title ? 'border-red-300' : ''}
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
                {lastGeneration?.structured && campaignTitle === lastGeneration.structured.headline && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Von KI generierte Headline
                  </div>
                )}
              </Field>
              
              <Field>
                <Label>Inhalt *</Label>
                <RichTextEditor 
                  content={pressReleaseContent}
                  onChange={handleContentChange}
                />
                {validationErrors.content && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
                )}
                {lastGeneration && pressReleaseContent === lastGeneration.content && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Von KI generierte strukturierte Pressemitteilung
                  </div>
                )}
              </Field>
            </div>
          </div>
        </div>
        
        {/* Schritt 4: Medien anhängen (NEU) */}
        <div className={!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold flex items-center">
                  <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 ${
                    selectedCustomerId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    4
                  </span>
                  Medien anhängen (optional)
                </h3>
                <Text>Füge Bilder, Dokumente und andere Medien zu deiner Kampagne hinzu.</Text>
              </div>
              
              {selectedCustomerId && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAssetSelector(true)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Medien auswählen
                  </Button>
                  <Link
                    href={`/dashboard/mediathek?uploadFor=${selectedCustomerId}`}
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
                <p className="text-sm text-gray-400 mt-1">Optional - du kannst Medien auch später hinzufügen</p>
              </div>
            )}
          </div>
        </div>

        {/* Schritt 5: Versand planen (Placeholder) */}
        <div className={!selectedCustomerId || !selectedListId || !campaignTitle || !pressReleaseContent ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-t pt-8">
            <h3 className="text-base font-semibold text-zinc-400">Schritt 5: Versand planen (zukünftiges Feature)</h3>
            <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Abbrechen</Button>
        </Link>
        <Button 
          color="indigo" 
          disabled={!isFormValid || isSaving}
          onClick={handleSaveDraft}
        >
          {isSaving ? 'Speichern...' : 'Als Entwurf speichern'}
        </Button>
      </div>

      {/* Asset Selector Modal */}
      {selectedCustomerId && (
        <AssetSelectorModal
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={selectedCustomerId}
          clientName={selectedCustomerName}
          onAssetsSelected={handleAssetsSelected}
          existingAssets={attachedAssets}
        />
      )}

      {/* Neues strukturiertes KI-Modal mit Customer Context */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
          // TODO: Pass customer context to AI
          // customerContext={{
          //   companyName: selectedCustomerName,
          //   companyId: selectedCustomerId
          // }}
        />
      )}
    </div>
  );
}