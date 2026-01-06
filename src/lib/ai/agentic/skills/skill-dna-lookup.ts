// src/lib/ai/agentic/skills/skill-dna-lookup.ts
// Skill: Lädt DNA-Kontext aus Firestore
// WICHTIG: Verwendet Firebase Admin SDK, da Genkit server-side läuft!

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { DnaLookupInputSchema } from '../types';
import { adminDb } from '@/lib/firebase/admin-init';
import type { MarkenDNADocument, MarkenDNADocumentType } from '@/types/marken-dna';

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
    console.log('[skill_dna_lookup] Called with companyId:', input.companyId, 'docType:', input.docType);

    try {
      // Helper: Dokumente aus Firestore laden (Admin SDK)
      const loadDocuments = async (companyId: string): Promise<MarkenDNADocument[]> => {
        const collectionRef = adminDb
          .collection('companies')
          .doc(companyId)
          .collection('markenDNA');

        const snapshot = await collectionRef.get();
        console.log('[skill_dna_lookup] Found', snapshot.docs.length, 'docs for', companyId);

        return snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || docSnap.id as MarkenDNADocumentType,
            ...data
          } as MarkenDNADocument;
        });
      };

      // DNA-Synthese laden
      if (input.docType === 'synthesis') {
        const syntheseRef = adminDb
          .collection('companies')
          .doc(input.companyId)
          .collection('markenDNA')
          .doc('synthesis');
        const syntheseSnap = await syntheseRef.get();

        if (!syntheseSnap.exists) {
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

        const syntheseData = syntheseSnap.data();
        return {
          success: true,
          companyId: input.companyId,
          docType: 'synthesis',
          synthesis: {
            content: syntheseData?.plainText || syntheseData?.content || '',
            status: 'completed' as const,
          },
        };
      }

      // Alle Dokumente laden
      if (input.docType === 'all' || !input.docType) {
        const docs = await loadDocuments(input.companyId);

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
      const docs = await loadDocuments(input.companyId);
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
      console.error('[skill_dna_lookup] Error:', errorMessage);

      return {
        success: false,
        companyId: input.companyId,
        error: `DNA-Lookup fehlgeschlagen: ${errorMessage}`,
      };
    }
  }
);
