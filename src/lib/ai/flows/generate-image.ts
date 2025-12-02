// src/lib/ai/flows/generate-image.ts
// Genkit Flow für KI-Bildgenerierung
// Verwendet Gemini 2.0 Flash Experimental (kostenlos) oder Imagen 3 (kostenpflichtig)

import { ai } from '../genkit-config';
import {
  GenerateImageInputSchema,
  GenerateImageOutputSchema,
  type GenerateImageInput,
  type GenerateImageOutput
} from '../schemas/image-generation-schemas';

// ══════════════════════════════════════════════════════════════
// BILDGENERIERUNG KONFIGURATION
// ══════════════════════════════════════════════════════════════

// Gemini 2.0 Flash Exp generiert standardmäßig 1024x1024
// Wir geben 16:9 im Prompt an für bessere Ergebnisse
const IMAGE_CONFIG = {
  aspectRatio: '16:9',
  outputWidth: 1408,
  outputHeight: 768,
  numberOfImages: 1,
  // Negative Prompt um unerwünschte Elemente zu vermeiden
  defaultNegativePrompt: 'text, watermark, logo, signature, blurry, low quality, distorted, deformed, ugly, bad anatomy'
};

// Bildgenerierung verwendet Imagen 4 (empfohlen von Google)
// Imagen 4 for Generation: Höchste Bildqualität für Text-zu-Bild

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

    // Imagen 4 ist das empfohlene Modell für hochwertige Bildgenerierung
    // Alternativ: gemini-2.5-flash-preview-image-generation für konversationelle Bildbearbeitung
    const modelName = 'googleai/imagen-4.0-generate-002';

    console.log('🖼️ Bildgenerierung gestartet', {
      promptLength: input.prompt.length,
      aspectRatio: input.aspectRatio || '16:9',
      model: modelName
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
    console.log('🤖 Model:', modelName);

    // ══════════════════════════════════════════════════════════════
    // 2. BILDGENERIERUNG API CALL
    // ══════════════════════════════════════════════════════════════

    // Verwendet String-basiertes Modell für Type-Kompatibilität
    const result = await ai.generate({
      model: modelName,
      prompt: optimizedPrompt,
      output: {
        format: 'media'
      }
    });

    // ══════════════════════════════════════════════════════════════
    // 3. BILD EXTRAHIEREN
    // ══════════════════════════════════════════════════════════════

    // Das Modell gibt das Bild als media URL zurück
    const mediaUrl = result.media?.url;

    if (!mediaUrl) {
      console.error('❌ Kein Bild erhalten');
      console.error('❌ Result:', JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error('Bildgenerierung fehlgeschlagen. Möglicherweise wurde der Inhalt blockiert.');
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
      width: IMAGE_CONFIG.outputWidth,
      height: IMAGE_CONFIG.outputHeight,
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
