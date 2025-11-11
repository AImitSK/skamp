// src/utils/imageHelpers.ts

/**
 * Resized ein Bild auf maximale Breite/Höhe unter Beibehaltung des Seitenverhältnisses
 * @param file - Original Bilddatei
 * @param maxWidth - Maximale Breite in Pixeln
 * @param maxHeight - Maximale Höhe in Pixeln
 * @param quality - JPEG Qualität (0-1), default 0.9
 * @returns Promise<File> - Resized Bilddatei
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Fehler beim Laden des Bildes'));

      img.onload = () => {
        // Berechne neue Dimensionen unter Beibehaltung des Seitenverhältnisses
        let width = img.width;
        let height = img.height;

        // Prüfe ob Resize überhaupt nötig ist
        if (width <= maxWidth && height <= maxHeight) {
          // Bild ist bereits klein genug, return original
          resolve(file);
          return;
        }

        // Berechne Skalierungsfaktor
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        // Erstelle Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas Context konnte nicht erstellt werden'));
          return;
        }

        // Zeichne resized Bild
        ctx.drawImage(img, 0, 0, width, height);

        // Konvertiere zu Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Fehler beim Erstellen des Bildes'));
              return;
            }

            // Erstelle neue Datei mit gleichem Namen
            const resizedFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(resizedFile);
          },
          file.type || 'image/jpeg',
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Erstellt eine Email-optimierte Version eines Logos (max 250x100px)
 * @param file - Original Logo-Datei
 * @returns Promise<File> - Email-optimierte Logo-Datei
 */
export async function createEmailLogo(file: File): Promise<File> {
  return resizeImage(file, 250, 100, 0.85);
}
