// src/components/pr/campaign/hooks/useBoilerplateProcessing.ts
import { useState, useEffect } from 'react';
import { BoilerplateSection } from '../IntelligentBoilerplateSection';

/**
 * Custom Hook für Boilerplate-Content-Processing
 *
 * Verarbeitet Boilerplate-Sections und generiert vollständigen HTML-Content
 * für die Pressemitteilungs-Vorschau.
 *
 * Features:
 * - Sortierung nach order-Property
 * - Boilerplate-Content Rendering
 * - Strukturierte Inhalte (lead, main, quote)
 * - Quote-Metadata Formatting
 * - Automatisches Datum am Ende
 *
 * @param boilerplateSections - Array von Boilerplate-Sections
 * @param title - Titel der Pressemitteilung
 * @param onFullContentChange - Callback wenn Content sich ändert
 * @returns Vollständig prozessierter HTML-Content
 *
 * @example
 * ```tsx
 * const processedContent = useBoilerplateProcessing(
 *   boilerplateSections,
 *   title,
 *   onFullContentChange
 * );
 *
 * // In Preview
 * <div dangerouslySetInnerHTML={{ __html: processedContent }} />
 * ```
 */
export function useBoilerplateProcessing(
  boilerplateSections: BoilerplateSection[],
  title: string,
  onFullContentChange: (content: string) => void
) {
  const [processedContent, setProcessedContent] = useState('');

  useEffect(() => {
    const composeFullContent = async () => {
      // Erstelle den vollständigen HTML-Content aus allen Sections
      let fullHtml = '';

      // Füge Titel hinzu wenn vorhanden
      if (title) {
        fullHtml += `<h1 class="text-2xl font-bold mb-4">${title}</h1>\n\n`;
      }

      // Sortiere Sections nach order
      const sortedSections = [...boilerplateSections].sort((a, b) =>
        (a.order ?? 0) - (b.order ?? 0)
      );

      // Füge alle Sections hinzu
      for (const section of sortedSections) {
        if (section.type === 'boilerplate' && section.boilerplate) {
          // Boilerplate content
          fullHtml += section.boilerplate.content + '\n\n';
        } else if (section.content) {
          // Strukturierte Inhalte (lead, main, quote)
          if (section.type === 'quote' && section.metadata) {
            fullHtml += `<blockquote class="border-l-4 border-blue-400 pl-4 italic">\n`;
            fullHtml += `${section.content}\n`;
            fullHtml += `<footer class="text-sm text-gray-600 mt-2">— ${section.metadata.person}`;
            if (section.metadata.role) fullHtml += `, ${section.metadata.role}`;
            if (section.metadata.company) fullHtml += ` bei ${section.metadata.company}`;
            fullHtml += `</footer>\n`;
            fullHtml += `</blockquote>\n\n`;
          } else {
            fullHtml += section.content + '\n\n';
          }
        }
      }

      // Füge Datum am Ende hinzu
      const currentDate = new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      fullHtml += `<p class="text-sm text-gray-600 mt-8">${currentDate}</p>`;

      setProcessedContent(fullHtml);
      onFullContentChange(fullHtml);
    };

    composeFullContent();
  }, [boilerplateSections, title, onFullContentChange]);

  return processedContent;
}
