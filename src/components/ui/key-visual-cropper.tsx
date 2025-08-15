// src/components/ui/key-visual-cropper.tsx
"use client";

import { useRef, useState, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import 'react-image-crop/dist/ReactCrop.css';

interface KeyVisualCropperProps {
  src: string;
  onCropComplete: (croppedImageFile: File, cropData?: any) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

// Canvas utility für das 16:9 Cropping
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string = 'key-visual.jpg'
): Promise<{ file: File; cropData: any }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Key Visual Größe: 1920x1080 (16:9) für hohe Qualität
  const targetWidth = 1920;
  const targetHeight = 1080;
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Crop-Daten für spätere Wiederverwendung speichern
  const cropData = {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    unit: crop.unit
  };

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error('Canvas toBlob failed');
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve({ file, cropData });
      },
      'image/jpeg',
      0.9 // Hohe Qualität
    );
  });
}

export function KeyVisualCropper({ src, onCropComplete, onCancel, isProcessing }: KeyVisualCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Zentrierter 16:9 Crop
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, // 90% der Bildbreite für 16:9
        },
        16 / 9, // 16:9 Aspect Ratio
        width,
        height
      ),
      width,
      height
    );
    
    setCrop(crop);
  }, []);

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const { file, cropData } = await getCroppedImg(
        imgRef.current,
        completedCrop,
        'key-visual.jpg'
      );
      onCropComplete(file, cropData);
    } catch (error) {
      console.error('Fehler beim Crop:', error);
    }
  }, [completedCrop, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="mb-6">
          <Heading level={3}>Key Visual zuschneiden</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Wähle den gewünschten Bildausschnitt im 16:9 Format für dein Key Visual. 
            Dieses Bild erscheint prominent über der Headline in der Pressemitteilung.
          </Text>
        </div>

        {/* Crop Area */}
        <div className="mb-6 flex justify-center">
          <div className="max-w-full max-h-[500px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={16 / 9} // 16:9 Ratio für Key Visual
              minWidth={160}
              minHeight={90}
              circularCrop={false} // Rechteckig, nicht rund
            >
              <img
                ref={imgRef}
                alt="Zu schneidendes Key Visual"
                src={src}
                style={{ maxWidth: '100%', maxHeight: '500px' }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Vorschau */}
        {completedCrop && (
          <div className="mb-6">
            <Text className="font-medium mb-3">Vorschau (16:9 Format):</Text>
            <div className="flex justify-center">
              <div 
                className="border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden"
                style={{ width: '320px', height: '180px' }}
              >
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundPosition: `${-completedCrop.x * (320 / completedCrop.width)}px ${-completedCrop.y * (180 / completedCrop.height)}px`,
                    backgroundSize: `${(imgRef.current?.width || 1) * (320 / completedCrop.width)}px ${(imgRef.current?.height || 1) * (180 / completedCrop.height)}px`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button 
            className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
            onClick={handleCropComplete}
            disabled={!completedCrop || isProcessing}
          >
            {isProcessing ? 'Speichere...' : 'Zuschneiden & Verwenden'}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <Text className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tipp:</strong> Das Key Visual wird automatisch auf 1920×1080 Pixel (Full HD) optimiert 
            für gestochen scharfe Darstellung in E-Mails und PDFs.
          </Text>
        </div>
      </div>
    </div>
  );
}