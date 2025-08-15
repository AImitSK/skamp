// src/components/campaigns/KeyVisualSection.tsx
"use client";

import { useState, useRef } from 'react';
import { PhotoIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AssetSelectorModal } from '@/components/campaigns/AssetSelectorModal';
import { KeyVisualCropper } from '@/components/ui/key-visual-cropper';
import { uploadService } from '@/lib/firebase/upload-service';
import { storage } from '@/lib/firebase/client-init';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
}

export function KeyVisualSection({
  value,
  onChange,
  clientId,
  clientName,
  organizationId,
  userId
}: KeyVisualSectionProps) {
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direkter Upload Handler
  const handleDirectUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine Bilddatei aus.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Die Datei darf maximal 10MB groß sein.');
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
      // Upload zu Firebase Storage - verwende userId für Media Library Kompatibilität
      const timestamp = Date.now();
      const originalName = croppedFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const fileName = `organizations/${userId}/media/${timestamp}-${originalName}-key-visual.jpg`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, croppedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Key Visual setzen
      onChange({
        url: downloadUrl,
        cropData: cropData
      });
      
      setShowCropper(false);
      setSelectedImageSrc('');
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      alert('Fehler beim Hochladen des Bildes');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssetSelected = async (assets: any[]) => {
    if (assets.length > 0 && assets[0].type === 'asset') {
      // Asset aus Media Library ausgewählt - lade über Proxy-Route für CORS-freies Cropping
      const asset = assets[0];
      
      try {
        // Verwende Proxy-Route statt direkter Firebase URL
        const proxyUrl = `/api/proxy-firebase-image?url=${encodeURIComponent(asset.metadata.thumbnailUrl)}`;
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
            setShowCropper(true);
          }
        };
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('Fehler beim Laden des Bildes:', error);
        alert('Fehler beim Laden des Bildes aus der Media Library. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleRemoveKeyVisual = () => {
    onChange(undefined);
  };

  const handleEditKeyVisual = () => {
    if (value?.url) {
      setSelectedImageSrc(value.url);
      setShowCropper(true);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <Text className="font-medium text-gray-900">Key Visual (Optional)</Text>
        <Text className="text-sm text-gray-500">16:9 Format • Erscheint über der Headline</Text>
      </div>

      {!value ? (
        // Platzhalter wenn kein Key Visual
        <div 
          className="relative aspect-[16/9] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-[#f1f0e2] hover:border-[#005fab] transition-all cursor-pointer group"
          onClick={() => setShowAssetSelector(true)}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <PhotoIcon className="h-12 w-12 text-gray-400 group-hover:text-[#005fab] mb-3" />
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
              className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-800 shadow-lg px-4 py-2 font-bold"
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

      {/* Asset Selector Modal mit Upload-Option */}
      {showAssetSelector && clientId && (
        <AssetSelectorModal
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={clientId}
          clientName={clientName}
          onAssetsSelected={handleAssetSelected}
          organizationId={userId}
          legacyUserId={userId}
          selectionMode="single"
          onUploadSuccess={() => {
            // Optional: Refresh or additional logic after upload
          }}
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
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}