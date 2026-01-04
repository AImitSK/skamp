// src/lib/ai/agentic/skills/skill-dna-lookup.ts
// Skill: Lädt DNA-Kontext aus Firestore

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { DnaLookupInputSchema } from '../types';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';
import type { MarkenDNADocument } from '@/types/marken-dna';

/**
 * skill_dna_lookup
 *
 * Lädt Marken-DNA Dokumente oder die DNA-Synthese aus Firestore.
 *
 * Nutze dieses Tool um:
 * - Den Kontext aus früheren Dokumenten zu laden
 * - Die DNA-Synthese als Leitplanke zu nutzen
 * - Den Status aller Dokumente zu prüfen
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "companyId": "abc123",
 *   "docType": "briefing"
 * }
 * ```
 */
export const skillDnaLookup = ai.defineTool(
  {
    name: 'skill_dna_lookup',
    description: `Lädt Marken-DNA Dokumente oder die DNA-Synthese.

Nutze dieses Tool zu Beginn eines Chats um Kontext zu laden:
- "synthesis": Lädt die kompakte DNA-Synthese (~500 Tokens)
- "briefing", "swot", etc.: Lädt ein spezifisches Dokument
- "all": Lädt alle 6 Dokumente mit Status

Als SWOT-Spezialist solltest du z.B. zuerst das Briefing laden.
Als Orchestrator prüfst du den Status aller Dokumente.

WICHTIG: Nutze den geladenen Kontext als Leitplanke für deine Arbeit!`,
    inputSchema: DnaLookupInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      companyId: z.string(),
      docType: z.string().optional(),
      documents: z.array(z.object({
        type: z.string(),
        status: z.enum(['missing', 'draft', 'completed']),
        content: z.string().optional(),
        plainText: z.string().optional(),
      })).optional(),
      synthesis: z.object({
        content: z.string(),
        status: z.enum(['missing', 'draft', 'completed']),
      }).optional(),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    try {
      // DNA-Synthese laden
      if (input.docType === 'synthesis') {
        const synthesis = await dnaSyntheseService.getSynthese(input.companyId);

        if (!synthesis) {
          return {
            success: true,
            companyId: input.companyId,
            docType: 'synthesis',
            synthesis: {
              content: '',
              status: 'missing' as const,
            },
          };
        }

        return {
          success: true,
          companyId: input.companyId,
          docType: 'synthesis',
          synthesis: {
            content: synthesis.plainText || synthesis.content,
            // DNASynthese hat kein status Feld - wenn sie existiert, ist sie 'completed'
            status: 'completed' as const,
          },
        };
      }

      // Alle Dokumente laden
      if (input.docType === 'all' || !input.docType) {
        const docs = await markenDNAService.getDocuments(input.companyId);

        const documentStatus = (['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'] as const).map(type => {
          const doc = docs.find((d: MarkenDNADocument) => d.type === type);
          return {
            type,
            status: doc?.status || ('missing' as const),
            content: doc?.content,
            plainText: doc?.plainText,
          };
        });

        return {
          success: true,
          companyId: input.companyId,
          docType: 'all',
          documents: documentStatus,
        };
      }

      // Spezifisches Dokument laden
      const docs = await markenDNAService.getDocuments(input.companyId);
      const doc = docs.find((d: MarkenDNADocument) => d.type === input.docType);

      if (!doc) {
        return {
          success: true,
          companyId: input.companyId,
          docType: input.docType,
          documents: [{
            type: input.docType,
            status: 'missing' as const,
          }],
        };
      }

      return {
        success: true,
        companyId: input.companyId,
        docType: input.docType,
        documents: [{
          type: doc.type,
          status: doc.status,
          content: doc.content,
          plainText: doc.plainText,
        }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        companyId: input.companyId,
        error: `DNA-Lookup fehlgeschlagen: ${errorMessage}`,
      };
    }
  }
);
