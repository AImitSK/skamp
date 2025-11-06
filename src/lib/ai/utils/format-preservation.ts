// src/lib/ai/utils/format-preservation.ts

/**
 * Format-Preservation für Text-Transformationen
 *
 * Extrahiert Formatierungen (Bold, CTA, Hashtags, Quotes, Paragraphs) aus Text,
 * damit sie nach AI-Transformation wiederhergestellt werden können.
 */

interface FormatMarker {
  type: 'bold' | 'cta' | 'hashtag' | 'quote' | 'paragraph';
  start: number;
  end: number;
  text: string;
  metadata?: any;
}

interface ExtractedFormat {
  plainText: string;
  markers: FormatMarker[];
}

/**
 * Extrahiert alle Formatierungen aus einem Text
 *
 * @param text - Original-Text mit Formatierungen
 * @returns Objekt mit plainText und markers Array
 *
 * @example
 * const input = "Das ist **wichtig**. [[CTA: Jetzt testen]] #KI #Innovation";
 * const { plainText, markers } = extractFormatting(input);
 * // plainText: "Das ist wichtig. Jetzt testen"
 * // markers: [{ type: 'bold', text: 'wichtig', ... }, ...]
 */
export function extractFormatting(text: string): ExtractedFormat {
  const markers: FormatMarker[] = [];
  let plainText = text;
  let offset = 0;

  // 1. Bold extrahieren (**text** oder <strong>text</strong>)
  const boldRegex = /(\*\*(.+?)\*\*|<strong>(.+?)<\/strong>)/g;
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    const boldText = match[2] || match[3];
    markers.push({
      type: 'bold',
      start: match.index - offset,
      end: match.index - offset + boldText.length,
      text: boldText
    });
    plainText = plainText.replace(match[0], boldText);
    offset += match[0].length - boldText.length;
  }

  // 2. CTA extrahieren ([[CTA: text]])
  const ctaRegex = /\[\[CTA:\s*(.+?)\]\]/g;
  while ((match = ctaRegex.exec(text)) !== null) {
    const ctaText = match[1];
    markers.push({
      type: 'cta',
      start: match.index - offset,
      end: match.index - offset + ctaText.length,
      text: ctaText
    });
    plainText = plainText.replace(match[0], ctaText);
    offset += match[0].length - ctaText.length;
  }

  // 3. Hashtags extrahieren (#hashtag)
  const hashtagRegex = /#(\w+)/g;
  while ((match = hashtagRegex.exec(text)) !== null) {
    markers.push({
      type: 'hashtag',
      start: match.index - offset,
      end: match.index - offset + match[0].length,
      text: match[0]
    });
  }

  // 4. Quotes extrahieren (> quote)
  const quoteRegex = /^>\s*(.+)$/gm;
  while ((match = quoteRegex.exec(text)) !== null) {
    markers.push({
      type: 'quote',
      start: match.index - offset,
      end: match.index - offset + match[1].length,
      text: match[1]
    });
    plainText = plainText.replace(match[0], match[1]);
    offset += 2; // "> "
  }

  // 5. Paragraph-Struktur extrahieren
  const paragraphs = text.split('\n\n');
  let currentPos = 0;
  paragraphs.forEach((para, idx) => {
    if (para.trim()) {
      markers.push({
        type: 'paragraph',
        start: currentPos,
        end: currentPos + para.length,
        text: para,
        metadata: { index: idx }
      });
    }
    currentPos += para.length + 2; // +2 für \n\n
  });

  return { plainText: plainText.trim(), markers };
}

/**
 * Wendet extrahierte Formatierungen auf transformierten Text an
 *
 * @param transformedText - Von AI transformierter Plain-Text
 * @param originalMarkers - Format-Marker aus extractFormatting()
 * @returns Text mit wiederhergestellten Formatierungen
 *
 * @example
 * const transformed = "Das ist bedeutend. Probieren Sie es jetzt aus";
 * const formatted = applyFormatting(transformed, markers);
 * // "Das ist **bedeutend**. [[CTA: Probieren Sie es jetzt aus]] #KI #Innovation"
 */
export function applyFormatting(
  transformedText: string,
  originalMarkers: FormatMarker[]
): string {
  let result = transformedText;

  // 1. Paragraph-Struktur wiederherstellen
  const paragraphMarkers = originalMarkers.filter(m => m.type === 'paragraph');
  if (paragraphMarkers.length > 1) {
    // Wenn Original mehrere Absätze hatte, versuche Transformed zu splitten
    const sentences = result.split(/\.\s+/);
    const paragraphCount = paragraphMarkers.length;
    const sentencesPerParagraph = Math.ceil(sentences.length / paragraphCount);

    const newParagraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
      newParagraphs.push(sentences.slice(i, i + sentencesPerParagraph).join('. ') + '.');
    }
    result = newParagraphs.join('\n\n');
  }

  // 2. Bold wiederherstellen (Word-Matching)
  const boldMarkers = originalMarkers.filter(m => m.type === 'bold');
  boldMarkers.forEach(marker => {
    // Suche nach ähnlichen Wörtern im transformed Text
    const words = marker.text.split(' ');
    words.forEach(word => {
      if (word.length > 3) { // Nur relevante Wörter
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, `**${word}**`);
      }
    });
  });

  // 3. CTA wiederherstellen
  const ctaMarkers = originalMarkers.filter(m => m.type === 'cta');
  ctaMarkers.forEach(marker => {
    // Suche nach ähnlichem Text im transformed Text
    const ctaWords = marker.text.split(' ').slice(0, 3).join(' '); // Erste 3 Wörter
    const regex = new RegExp(ctaWords, 'i');
    result = result.replace(regex, `[[CTA: ${marker.text}]]`);
  });

  // 4. Hashtags wiederherstellen
  const hashtagMarkers = originalMarkers.filter(m => m.type === 'hashtag');
  if (hashtagMarkers.length > 0 && !result.includes('#')) {
    // Füge Hashtags am Ende hinzu
    result += '\n\n' + hashtagMarkers.map(m => m.text).join(' ');
  }

  // 5. Quotes wiederherstellen
  const quoteMarkers = originalMarkers.filter(m => m.type === 'quote');
  quoteMarkers.forEach(marker => {
    // Suche nach Quote-Text im Transformed
    const quoteStart = marker.text.split(' ').slice(0, 5).join(' ');
    const regex = new RegExp(quoteStart, 'i');
    result = result.replace(regex, `> ${marker.text}`);
  });

  return result;
}
