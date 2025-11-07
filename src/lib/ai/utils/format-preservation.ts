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
 * OPTIMIERT: Robuste Format-Wiederherstellung mit besserer Phrase-Erkennung
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

  // 2. Bold wiederherstellen (OPTIMIERT: Robustere Multi-Strategie)
  const boldMarkers = originalMarkers.filter(m => m.type === 'bold');
  const appliedBoldPhrases = new Set<string>(); // Track bereits formatierte Phrases

  boldMarkers.forEach(marker => {
    const originalPhrase = marker.text.trim();

    // Skip wenn diese Phrase bereits formatiert wurde
    if (appliedBoldPhrases.has(originalPhrase)) {
      return;
    }

    // Strategie 1: Exakte Phrase finden (case-sensitive)
    if (result.includes(originalPhrase)) {
      // FIX: Nur erste nicht-formatierte Instanz ersetzen
      const regex = new RegExp(`(?<!\\*\\*)${escapeRegex(originalPhrase)}(?!\\*\\*)`, 'g');
      let replaced = false;
      result = result.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          appliedBoldPhrases.add(originalPhrase);
          return `**${match}**`;
        }
        return match;
      });
      if (replaced) return;
    }

    // Strategie 2: Case-insensitive Suche
    const lowerResult = result.toLowerCase();
    const lowerPhrase = originalPhrase.toLowerCase();
    const lowerIndex = lowerResult.indexOf(lowerPhrase);

    if (lowerIndex !== -1) {
      const exactMatch = result.substring(lowerIndex, lowerIndex + originalPhrase.length);
      const regex = new RegExp(`(?<!\\*\\*)${escapeRegex(exactMatch)}(?!\\*\\*)`, 'g');
      let replaced = false;
      result = result.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          appliedBoldPhrases.add(originalPhrase);
          return `**${match}**`;
        }
        return match;
      });
      if (replaced) return;
    }

    // Strategie 3: Fuzzy Matching - Suche nach ähnlicher Phrase (gleiche Wortanzahl)
    const words = originalPhrase.split(' ');
    const wordCount = words.length;

    // Nur für Multi-Word Phrases (ab 2 Wörtern)
    if (wordCount >= 2) {
      const firstWord = words[0].toLowerCase();
      const resultWords = result.split(/\s+/);

      for (let i = 0; i < resultWords.length - wordCount + 1; i++) {
        if (resultWords[i].toLowerCase().replace(/[.,;:!?]/g, '') === firstWord) {
          // Gefunden! Nimm die nächsten wordCount Wörter
          const potentialPhrase = resultWords.slice(i, i + wordCount).join(' ');

          // Verhindere Doppel-Formatierung
          if (!potentialPhrase.includes('**') && !appliedBoldPhrases.has(potentialPhrase)) {
            const regex = new RegExp(`(?<!\\*\\*)${escapeRegex(potentialPhrase)}(?!\\*\\*)`, 'g');
            let replaced = false;
            result = result.replace(regex, (match) => {
              if (!replaced) {
                replaced = true;
                appliedBoldPhrases.add(potentialPhrase);
                return `**${match}**`;
              }
              return match;
            });
            if (replaced) return;
          }
        }
      }
    }
  });

  // 3. CTA wiederherstellen (OPTIMIERT: Robustere Positionssuche)
  const ctaMarkers = originalMarkers.filter(m => m.type === 'cta');
  ctaMarkers.forEach(marker => {
    const originalCTA = marker.text.trim();

    // Strategie 1: Exakte CTA finden (Text wurde nicht verändert)
    if (result.includes(originalCTA)) {
      // FIX: Nur wenn noch kein CTA-Marker drum herum ist
      const regex = new RegExp(`(?<!\\[\\[CTA: )${escapeRegex(originalCTA)}(?!\\]\\])`, 'g');
      result = result.replace(regex, (match) => `[[CTA: ${match}]]`);
      return;
    }

    // Strategie 2: Case-insensitive Suche
    const lowerResult = result.toLowerCase();
    const lowerCTA = originalCTA.toLowerCase();
    const ctaIndex = lowerResult.indexOf(lowerCTA);

    if (ctaIndex !== -1) {
      const exactMatch = result.substring(ctaIndex, ctaIndex + originalCTA.length);
      const regex = new RegExp(`(?<!\\[\\[CTA: )${escapeRegex(exactMatch)}(?!\\]\\])`, 'g');
      result = result.replace(regex, (match) => `[[CTA: ${match}]]`);
      return;
    }

    // Strategie 3: Suche nach Anchor-Wörtern (erste 3-4 Wörter)
    const anchorWords = originalCTA.split(' ').slice(0, Math.min(4, originalCTA.split(' ').length)).join(' ');
    const anchorIndex = lowerResult.indexOf(anchorWords.toLowerCase());

    if (anchorIndex !== -1) {
      const wordsInOriginal = originalCTA.split(' ').length;
      const startPos = anchorIndex;
      const possibleCTAWords = result.substring(startPos).split(' ').slice(0, wordsInOriginal);
      const possibleCTA = possibleCTAWords.join(' ').replace(/[.!?;,]+$/, ''); // Entferne trailing punctuation

      // Wenn Wortanzahl ähnlich (±2 Wörter Toleranz)
      if (Math.abs(possibleCTAWords.length - wordsInOriginal) <= 2) {
        const regex = new RegExp(`(?<!\\[\\[CTA: )${escapeRegex(possibleCTA)}(?!\\]\\])`, 'g');
        result = result.replace(regex, (match) => `[[CTA: ${originalCTA}]]`);
        return;
      }
    }

    // Strategie 4: Fallback - Hänge CTA am Ende an (nur wenn noch kein CTA existiert)
    if (!result.includes('[[CTA:')) {
      result += `\n\n[[CTA: ${originalCTA}]]`;
    }
  });

  // 4. Hashtags wiederherstellen (OPTIMIERT: Prüfe ob schon vorhanden)
  const hashtagMarkers = originalMarkers.filter(m => m.type === 'hashtag');
  if (hashtagMarkers.length > 0) {
    const existingHashtags = hashtagMarkers.filter(m => result.includes(m.text));
    const missingHashtags = hashtagMarkers.filter(m => !result.includes(m.text));

    // Füge nur fehlende Hashtags hinzu
    if (missingHashtags.length > 0) {
      const allHashtags = hashtagMarkers.map(m => m.text).join(' ');

      // Wenn gar keine Hashtags vorhanden, füge alle am Ende hinzu
      if (existingHashtags.length === 0) {
        result += '\n\n' + allHashtags;
      } else {
        // Füge fehlende Hashtags zu existierenden hinzu
        const hashtagLine = result.split('\n').find(line => line.includes('#'));
        if (hashtagLine) {
          const newHashtagLine = hashtagLine + ' ' + missingHashtags.map(m => m.text).join(' ');
          result = result.replace(hashtagLine, newHashtagLine);
        }
      }
    }
  }

  // 5. Quotes wiederherstellen (OPTIMIERT: Case-insensitive)
  const quoteMarkers = originalMarkers.filter(m => m.type === 'quote');
  quoteMarkers.forEach(marker => {
    const quoteStart = marker.text.split(' ').slice(0, 5).join(' ');
    const regex = new RegExp(escapeRegex(quoteStart), 'i');
    result = result.replace(regex, `> ${marker.text}`);
  });

  return result;
}

/**
 * Hilfsfunktion: Escaped Regex-Sonderzeichen
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
