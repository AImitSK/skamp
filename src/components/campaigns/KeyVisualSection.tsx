// src/components/campaigns/KeyVisualSection.tsx
"use client";

import { useState, useRef, useMemo } from 'react';
import { PhotoIcon, PencilIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AssetSelectorModal } from '@/components/campaigns/AssetSelectorModal';
import { KeyVisualCropper } from '@/components/ui/key-visual-cropper';
import { storage } from '@/lib/firebase/client-init';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  campaignMediaService, 
  uploadCampaignHeroImage,
  getCampaignUploadFeatureStatus 
} from '@/lib/firebase/campaign-media-service';
import { 
  createFeatureFlagContext,
  getUIEnhancements,
  isCampaignSmartRouterEnabled 
} from '@/components/campaigns/config/campaign-feature-flags';

interface KeyVisualData {
  assetId?: string;
  url: string;
  cropData?: any;
}

interface KeyVisualSectionProps {
  value?: KeyVisualData;
  onChange: (keyVisual: KeyVisualData | undefined) => void;
  clientId?: string;
  clientName?: string;
  organizationId: string;
  userId: string;
  
  // Campaign Smart Router Integration Props
  campaignId?: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  enableSmartRouter?: boolean;
}

export function KeyVisualSection({
  value,
  onChange,
  clientId,
  clientName,
  organizationId,
  userId,
  
  // Campaign Smart Router Props
  campaignId,
  campaignName,
  selectedProjectId,
  selectedProjectName,
  enableSmartRouter = false
}: KeyVisualSectionProps) {
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingWithSmartRouter, setUploadingWithSmartRouter] = useState(false);
  const [isLoadingCropper, setIsLoadingCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Campaign Smart Router State
  const featureFlagContext = useMemo(() => {
    if (!enableSmartRouter || !campaignId) return null;
    return createFeatureFlagContext({
      organizationId,
      userId,
      campaignId,
      projectId: selectedProjectId
    });
  }, [enableSmartRouter, campaignId, organizationId, userId, selectedProjectId]);
  
  const featureStatus = useMemo(() => {
    if (!featureFlagContext) return null;
    return getCampaignUploadFeatureStatus({
      organizationId,
      userId,
      campaignId,
      projectId: selectedProjectId
    });
  }, [featureFlagContext, organizationId, userId, campaignId, selectedProjectId]);
  
  const uiEnhancements = useMemo(() => {
    if (!featureFlagContext) return { showStorageType: false, showUploadMethodBadges: false, showContextPreview: false, showPathSuggestions: false };
    return getUIEnhancements(featureFlagContext);
  }, [featureFlagContext]);

  // Direkter Upload Handler
  const handleDirectUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      console.warn('Campaign KeyVisual: Nur Bilddateien sind erlaubt');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.warn('Campaign KeyVisual: Datei zu groß (max 10MB)');
      return;
    }

    // Bild als Data URL laden für Cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImageSrc(e.target.result as string);
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File, cropData?: any) => {
    setIsProcessing(true);
    try {
      let downloadUrl: string;

      if (selectedProjectId) {
        console.log('🔍 Suche Medien-Ordner für Projekt:', selectedProjectId);

        // ✅ RICHTIGE LÖSUNG: Finde den Medien-Ordner des Projekts und lade dort hoch
        const { mediaService } = await import('@/lib/firebase/media-service');

        // 1. Alle Ordner der Organisation laden
        const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);
        console.log('📁 Alle Ordner:', allFolders.length);

        // 2. Projekt-Hauptordner finden - verwende gleiche Logik wie AssetSelectorModal
        const projectFolder = allFolders.find(folder =>
          folder.name.includes('P-') && folder.name.includes(selectedProjectName || 'Dan dann')
        );
        console.log('🎯 Projekt-Ordner gefunden:', projectFolder);

        if (projectFolder) {
          // 3. Medien-Unterordner finden
          const medienFolder = allFolders.find(folder =>
            folder.parentFolderId === projectFolder.id && folder.name === 'Medien'
          );
          console.log('🎯 Medien-Ordner gefunden:', medienFolder);

          if (medienFolder) {
            // 4. DIREKTER UPLOAD mit mediaService.uploadClientMedia (wie SimpleProjectUploadModal)
            const uploadedAsset = await mediaService.uploadClientMedia(
              croppedFile,
              organizationId,
              clientId,
              medienFolder.id, // Upload direkt in Medien-Ordner
              undefined, // Kein Progress-Callback
              { userId, description: `KeyVisual für Campaign ${campaignName || campaignId}` }
            );

            downloadUrl = uploadedAsset.downloadUrl;
            console.log('✅ Upload erfolgreich in Medien-Ordner:', downloadUrl);
          } else {
            throw new Error('Medien-Ordner nicht gefunden');
          }
        } else {
          throw new Error('Projekt-Ordner nicht gefunden');
        }
      } else {
        // Fallback für Campaigns ohne Projekt - Legacy Upload
        const uploadResult = await uploadCampaignHeroImage({
          organizationId,
          userId,
          campaignId,
          campaignName,
          clientId,
          file: croppedFile
        });
        downloadUrl = uploadResult.asset?.downloadUrl || uploadResult.path;
      }
      
      // Key Visual setzen
      onChange({
        url: downloadUrl,
        cropData: cropData
      });
      
      setShowCropper(false);
      setSelectedImageSrc('');
    } catch (error) {
      console.error('Campaign KeyVisual Upload-Fehler:', error);
      setUploadingWithSmartRouter(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssetSelected = async (assets: any[]) => {
    if (assets.length > 0 && assets[0].type === 'asset') {
      // Asset aus Media Library ausgewählt - lade über Proxy-Route für CORS-freies Cropping
      const asset = assets[0];

      // Schließe Asset Selector Modal und zeige Loading
      setShowAssetSelector(false);
      setIsLoadingCropper(true);

      try {
        // Verwende Proxy-Route statt direkter Firebase URL - verwende originalUrl als Fallback
        const imageUrl = asset.metadata.thumbnailUrl || asset.metadata.originalUrl || asset.metadata.downloadUrl;
        const proxyUrl = `/api/proxy-firebase-image?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`Proxy request failed: ${response.status}`);
        }

        const blob = await response.blob();

        // Konvertiere zu Data URL (wie bei direktem Upload)
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setSelectedImageSrc(e.target.result as string);
            setIsLoadingCropper(false);
            setShowCropper(true);
          }
        };
        reader.readAsDataURL(blob);

      } catch (error) {
        console.warn('Campaign KeyVisual CORS-Fehler beim Asset-Loading');
        setIsLoadingCropper(false);
      }
    }
  };

  const handleRemoveKeyVisual = () => {
    onChange(undefined);
  };

  const handleEditKeyVisual = async () => {
    if (value?.url) {
      // Zeige Loading während Bild für Cropper geladen wird
      setIsLoadingCropper(true);

      try {
        // Verwende Proxy-Route für CORS-freies Cropping (genau wie handleAssetSelected)
        const proxyUrl = `/api/proxy-firebase-image?url=${encodeURIComponent(value.url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`Proxy request failed: ${response.status}`);
        }

        const blob = await response.blob();

        // Konvertiere zu Data URL (wie bei direktem Upload)
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setSelectedImageSrc(e.target.result as string);
            setIsLoadingCropper(false);
            setShowCropper(true);
          }
        };
        reader.readAsDataURL(blob);

      } catch (error) {
        console.warn('Campaign KeyVisual CORS-Fehler beim Asset-Loading');
        setIsLoadingCropper(false);
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Key Visual</h3>
      </div>

      {!value ? (
        // Platzhalter wenn kein Key Visual - kompakte Höhe wie Medien-Platzhalter
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
          onClick={() => setShowAssetSelector(true)}
        >
          <div className="flex flex-col items-center justify-center">
            <PhotoIcon className="h-10 w-10 text-gray-400 group-hover:text-[#005fab] mb-2" />
            <Text className="text-gray-600 group-hover:text-[#005fab] font-medium">
              Key Visual hinzufügen
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Klicken zum Auswählen oder Hochladen
            </Text>
          </div>
        </div>
      ) : (
        // Preview wenn Key Visual gesetzt
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-gray-200 group">
          <img 
            src={value.url} 
            alt="Key Visual" 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay mit Edit/Remove Buttons */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <Button
              onClick={handleEditKeyVisual}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg px-4 py-2 font-medium"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
            <Button
              onClick={handleRemoveKeyVisual}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm px-4 py-2 font-medium"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Entfernen
            </Button>
          </div>
        </div>
      )}

      {/* Hidden File Input für direkten Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Asset Selector Modal - zeigt vorhandene Dateien an */}
      {showAssetSelector && clientId && (
        <AssetSelectorModal
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={clientId}
          clientName={clientName}
          onAssetsSelected={handleAssetSelected}
          organizationId={organizationId}
          legacyUserId={userId}
          selectionMode="single"
          onUploadSuccess={() => {
            // Optional: Refresh or additional logic after upload
          }}

          // Campaign Smart Router Props
          campaignId={campaignId}
          campaignName={campaignName}
          selectedProjectId={selectedProjectId}
          selectedProjectName={selectedProjectName}
          uploadType="hero-image"
          enableSmartRouter={enableSmartRouter}
        />
      )}

      {/* Fallback wenn kein Client ausgewählt */}
      {showAssetSelector && !clientId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <Text className="font-medium text-gray-900 mb-4">
              Bitte wählen Sie zuerst einen Kunden aus
            </Text>
            <div className="flex gap-3">
              <Button
                onClick={handleDirectUpload}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white px-4 py-2 flex-1"
              >
                Trotzdem hochladen
              </Button>
              <Button
                onClick={() => setShowAssetSelector(false)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-900 px-4 py-2 flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Key Visual Cropper */}
      {showCropper && (
        <KeyVisualCropper
          src={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setSelectedImageSrc('');
          }}
          isProcessing={isProcessing || uploadingWithSmartRouter}
        />
      )}
      
      {/* Smart Router Upload Progress Overlay */}
      {uploadingWithSmartRouter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <Text className="font-medium text-gray-900 mb-2">
                Smart Router Upload läuft...
              </Text>
              <Text className="text-sm text-gray-500">
                Key Visual wird intelligent geroutet und hochgeladen
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Cropper Loading Overlay */}
      {isLoadingCropper && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <Text className="font-medium text-gray-900 mb-2">
                Cropping-Tool wird geladen...
              </Text>
              <Text className="text-sm text-gray-500">
                Bild wird für die Bearbeitung vorbereitet
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}