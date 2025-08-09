// src/components/ui/image-cropper.tsx
"use client";

import { useRef, useState, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  src: string;
  onCropComplete: (croppedImageFile: File) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

// Canvas utility für das Cropping
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string = 'cropped-avatar.jpg'
): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Avatar-Größe: 512x512 für hohe Qualität
  const targetSize = 512;
  canvas.width = targetSize;
  canvas.height = targetSize;

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
    targetSize,
    targetSize
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error('Canvas toBlob failed');
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.9 // Hohe Qualität
    );
  });
}

export function ImageCropper({ src, onCropComplete, onCancel, isProcessing }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Zentrierter quadratischer Crop
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80, // 80% der Bildbreite
        },
        1, // 1:1 Aspect Ratio (Quadrat)
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
      const croppedImageFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        'avatar.jpg'
      );
      onCropComplete(croppedImageFile);
    } catch (error) {
      console.error('Fehler beim Crop:', error);
    }
  }, [completedCrop, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="mb-6">
          <Heading level={3}>Profilbild zuschneiden</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Ziehe die Ecken, um den gewünschten Bildausschnitt auszuwählen. Das Bild wird automatisch quadratisch zugeschnitten.
          </Text>
        </div>

        {/* Crop Area */}
        <div className="mb-6 flex justify-center">
          <div className="max-w-full max-h-96 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1} // 1:1 Ratio für Quadrat
              minWidth={100}
              minHeight={100}
              circularCrop // Zeigt Vorschau als Kreis
            >
              <img
                ref={imgRef}
                alt="Zu schneidendes Bild"
                src={src}
                style={{ maxWidth: '100%', maxHeight: '400px' }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Vorschau */}
        {completedCrop && (
          <div className="mb-6">
            <Text className="font-medium mb-3">Vorschau:</Text>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundPosition: `${-completedCrop.x * (80 / completedCrop.width)}px ${-completedCrop.y * (80 / completedCrop.height)}px`,
                    backgroundSize: `${(imgRef.current?.width || 1) * (80 / completedCrop.width)}px ${(imgRef.current?.height || 1) * (80 / completedCrop.height)}px`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button 
            plain 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button 
            color="indigo" 
            onClick={handleCropComplete}
            disabled={!completedCrop || isProcessing}
          >
            {isProcessing ? 'Speichere...' : 'Zuschneiden & Speichern'}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <Text className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tipp:</strong> Das zugeschnittene Bild wird automatisch auf 512×512 Pixel optimiert für gestochen scharfe Avatare.
          </Text>
        </div>
      </div>
    </div>
  );
}