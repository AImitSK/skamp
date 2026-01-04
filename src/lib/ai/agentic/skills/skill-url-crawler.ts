// src/lib/ai/agentic/skills/skill-url-crawler.ts
// Skill: Analysiert Webseiten via Jina AI Reader

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { UrlCrawlerInputSchema } from '../types';

/**
 * skill_url_crawler
 *
 * Analysiert Webseiten und extrahiert strukturierte Inhalte.
 * Nutzt Jina AI Reader (https://r.jina.ai/) für saubere Markdown-Extraktion.
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "url": "https://example.com/about"
 * }
 * ```
 */
export const skillUrlCrawler = ai.defineTool(
  {
    name: 'skill_url_crawler',
    description: `Analysiert eine Webseite und extrahiert den Inhalt als Markdown.

Nutze dieses Tool wenn der User eine URL teilt, z.B.:
- Unternehmenswebseite
- About-Seite
- Pressemitteilung
- Produktseite

Das Tool gibt den Seiteninhalt als sauberes Markdown zurück.

FEHLERBEHANDLUNG:
Wenn das Crawling fehlschlägt, frage den User:
"Ich konnte die URL nicht lesen. Kannst du mir die wichtigsten Infos hier reinkopieren?"`,
    inputSchema: UrlCrawlerInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      url: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    try {
      // Jina AI Reader für saubere Markdown-Extraktion
      const jinaUrl = `https://r.jina.ai/${input.url}`;

      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/markdown',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();

      // Titel extrahieren (erste H1 oder Zeile)
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : undefined;

      return {
        success: true,
        url: input.url,
        title,
        content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        url: input.url,
        error: `Crawling fehlgeschlagen: ${errorMessage}`,
      };
    }
  }
);
