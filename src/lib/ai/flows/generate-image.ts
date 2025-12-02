// src/lib/ai/flows/generate-image.ts
// Genkit Flow für Imagen 3 Bildgenerierung

import { ai, imagen3Model } from '../genkit-config';
import {
  GenerateImageInputSchema,
  GenerateImageOutputSchema,
  type GenerateImageInput,
  type GenerateImageOutput
} from '../schemas/image-generation-schemas';

// ══════════════════════════════════════════════════════════════
// IMAGEN KONFIGURATION
// ══════════════════════════════════════════════════════════════

// Imagen 3 unterstützt diese Aspect Ratios:
// 1:1 (1024x1024), 3:4, 4:3, 9:16, 16:9
// Für 16:9: Output ist 1408x768 Pixel
const IMAGEN_CONFIG = {
  aspectRatio: '16:9',
  outputWidth: 1408,
  outputHeight: 768,
  numberOfImages: 1,
  // Negative Prompt um unerwünschte Elemente zu vermeiden
  defaultNegativePrompt: 'text, watermark, logo, signature, blurry, low quality, distorted, deformed, ugly, bad anatomy'
};

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImage',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input: GenerateImageInput): Promise<GenerateImageOutput> => {

    console.log('🖼️ Imagen Bildgenerierung gestartet', {
      promptLength: input.prompt.length,
      aspectRatio: input.aspectRatio || '16:9'
    });

    // ══════════════════════════════════════════════════════════════
    // 1. PROMPT OPTIMIERUNG
    // ══════════════════════════════════════════════════════════════

    // Stelle sicher, dass der Prompt Qualitäts-Keywords enthält
    let optimizedPrompt = input.prompt;

    // Füge Qualitäts-Keywords hinzu falls nicht vorhanden
    const qualityKeywords = ['high quality', 'professional photography', '16:9 aspect ratio'];
    for (const keyword of qualityKeywords) {
      if (!optimizedPrompt.toLowerCase().includes(keyword.toLowerCase())) {
        optimizedPrompt += `, ${keyword}`;
      }
    }

    console.log('📝 Optimierter Prompt:', optimizedPrompt.substring(0, 100) + '...');

    // ══════════════════════════════════════════════════════════════
    // 2. IMAGEN API CALL
    // ══════════════════════════════════════════════════════════════

    const negativePrompt = input.negativePrompt || IMAGEN_CONFIG.defaultNegativePrompt;

    console.log('🤖 Model: imagen-3.0-generate-002');

    const result = await ai.generate({
      model: imagen3Model,
      prompt: optimizedPrompt,
      output: {
        format: 'media'
      }
    });

    // ══════════════════════════════════════════════════════════════
    // 3. BILD EXTRAHIEREN
    // ══════════════════════════════════════════════════════════════

    // Imagen gibt das Bild als media URL zurück
    const mediaUrl = result.media?.url;

    if (!mediaUrl) {
      console.error('❌ Kein Bild von Imagen erhalten');
      console.error('❌ Result:', JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error('Imagen hat kein Bild generiert. Möglicherweise wurde der Inhalt blockiert.');
    }

    console.log('✅ Bild erfolgreich generiert');

    // ══════════════════════════════════════════════════════════════
    // 4. OUTPUT FORMATIEREN
    // ══════════════════════════════════════════════════════════════

    // Bestimme Format aus Data-URL
    let format: 'png' | 'jpeg' | 'webp' = 'png';
    if (mediaUrl.includes('image/jpeg') || mediaUrl.includes('image/jpg')) {
      format = 'jpeg';
    } else if (mediaUrl.includes('image/webp')) {
      format = 'webp';
    }

    return {
      imageUrl: mediaUrl,
      width: IMAGEN_CONFIG.outputWidth,
      height: IMAGEN_CONFIG.outputHeight,
      format,
      prompt: input.prompt // Original-Prompt für Metadaten
    };
  }
);

// ══════════════════════════════════════════════════════════════
// HELPER: Base64 zu Buffer konvertieren (für Upload)
// ══════════════════════════════════════════════════════════════

/**
 * Extrahiert Base64-Daten aus einer Data-URL
 */
export function extractBase64FromDataUrl(dataUrl: string): {
  base64: string;
  mimeType: string;
} {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Ungültiges Data-URL Format');
  }
  return {
    mimeType: matches[1],
    base64: matches[2]
  };
}

/**
 * Konvertiert Base64 zu Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Erstellt einen Dateinamen für das generierte Bild
 */
export function generateImageFilename(prefix: string = 'ki-bild'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `${prefix}-${timestamp}.png`;
}
