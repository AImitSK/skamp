// src/lib/ai/flows/media-research/stagingFlow.ts
// Genkit Flows für Staging Collection Management

import { ai, gemini25FlashModel } from '../../genkit-config';
import { adminDb } from '../../../firebase/admin-init';
import {
  SaveToStagingInputSchema,
  SaveToStagingOutputSchema,
  ReEnrichmentInputSchema,
  ReEnrichmentOutputSchema,
  BatchImportFromStagingInputSchema,
  BatchImportFromStagingOutputSchema,
  calculateQualityScore,
  type MediaResearchStaging,
  type StagingStatus,
  type EnrichmentPass,
} from '../../schemas/media-research-staging-schemas';
import { crmImportFlow } from './crmImportFlow';
import type { CrmImportInput } from '../../schemas/media-research-schemas';

// ══════════════════════════════════════════════════════════════
// KONSTANTEN
// ══════════════════════════════════════════════════════════════

const STAGING_COLLECTION = 'media_research_staging';
const MIN_SCORE_FOR_AUTO_IMPORT = 50;
const MAX_ENRICHMENT_ATTEMPTS = 3;

// Jina AI Reader
const JINA_READER_BASE = 'https://r.jina.ai/';

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Scrapt eine einzelne URL mit Jina
 */
async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const jinaUrl = `${JINA_READER_BASE}${url}`;
    console.log('[Staging] Jina Request:', jinaUrl);

    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
      },
    });

    if (!response.ok) {
      console.warn('[Staging] Jina Error:', response.status, url);
      return null;
    }

    const content = await response.text();
    return content.length > 50000
      ? content.substring(0, 50000) + '\n\n[... Content gekürzt ...]'
      : content;
  } catch (error) {
    console.error('[Staging] Jina Fetch Error:', error);
    return null;
  }
}

/**
 * Bestimmt den Status basierend auf Score und Enrichment-Count
 */
function determineStatus(
  score: number,
  enrichmentCount: number,
  maxAttempts: number
): StagingStatus {
  if (score >= MIN_SCORE_FOR_AUTO_IMPORT) {
    return 'ready';
  }
  if (enrichmentCount >= maxAttempts) {
    return 'needs_review';
  }
  return 'pending';
}

// ══════════════════════════════════════════════════════════════
// FLOW: SAVE TO STAGING
// ══════════════════════════════════════════════════════════════

/**
 * saveToStagingFlow
 *
 * Speichert WebScraper-Ergebnisse in die Staging Collection
 * und berechnet den Quality Score.
 */
export const saveToStagingFlow = ai.defineFlow(
  {
    name: 'saveToStagingFlow',
    inputSchema: SaveToStagingInputSchema,
    outputSchema: SaveToStagingOutputSchema,
  },
  async (input) => {
    const { organizationId, sessionId, tagName, userId, googlePlacesData, scraperOutput } = input;

    console.log('[Staging] Speichere:', googlePlacesData.name);

    // Quality Score berechnen
    const qualityScore = calculateQualityScore({
      publisherInfo: scraperOutput.publisherInfo,
      publications: scraperOutput.publications,
      contacts: scraperOutput.contacts,
      functionalContact: scraperOutput.functionalContact,
    });

    const readyForImport = qualityScore.total >= MIN_SCORE_FOR_AUTO_IMPORT;
    const status = determineStatus(qualityScore.total, 0, MAX_ENRICHMENT_ATTEMPTS);

    const now = new Date().toISOString();

    const stagingDoc: Omit<MediaResearchStaging, 'id'> = {
      // Identifikation
      organizationId,
      sessionId,
      tagName,
      userId,

      // Status & Qualität
      status,
      qualityScore,
      readyForImport,
      minScoreForImport: MIN_SCORE_FOR_AUTO_IMPORT,

      // Google Places Rohdaten
      googlePlacesData,

      // Scraper Output
      isMediaCompany: scraperOutput.isMediaCompany,
      mediaConfidence: scraperOutput.mediaConfidence,
      mediaClassificationReason: scraperOutput.mediaClassificationReason,
      publisherInfo: scraperOutput.publisherInfo,
      publications: scraperOutput.publications,
      contacts: scraperOutput.contacts,
      ...(scraperOutput.functionalContact ? { functionalContact: scraperOutput.functionalContact } : {}),
      scrapedUrls: scraperOutput.scrapedUrls,
      mediadataPdfUrls: scraperOutput.mediadataPdfUrls,
      ...(scraperOutput.internalNotes ? { internalNotes: scraperOutput.internalNotes } : {}),

      // Enrichment Tracking
      enrichmentCount: 0,
      maxEnrichmentAttempts: MAX_ENRICHMENT_ATTEMPTS,
      enrichmentPasses: [],
      ...(readyForImport ? {} : { nextEnrichmentAction: 'scrape_redaktion' }),

      // CRM Import Tracking
      imported: false,

      // Kosten & Timestamps
      totalCost: scraperOutput.cost.estimatedCostUSD,
      createdAt: now,
      updatedAt: now,
    };

    // In Firestore speichern
    const docRef = await adminDb.collection(STAGING_COLLECTION).add(stagingDoc);

    console.log('[Staging] Gespeichert:', docRef.id, 'Score:', qualityScore.total, 'Status:', status);

    return {
      stagingId: docRef.id,
      qualityScore: qualityScore.total,
      readyForImport,
      status,
    };
  }
);

// ══════════════════════════════════════════════════════════════
// FLOW: RE-ENRICHMENT
// ══════════════════════════════════════════════════════════════

const ENRICHMENT_PROMPT = `Du bist ein Experte für die Extraktion von Kontaktdaten aus Medien-Websites.

AUFGABE: Extrahiere ZUSÄTZLICHE Informationen aus diesem neuen Content.

FOKUS:
1. JOURNALISTEN mit persönlicher E-Mail (vorname.nachname@domain.de)
2. REDAKTIONS-KONTAKTE (redaktion@, newsdesk@, presse@)
3. PUBLIKATIONEN mit Website, Auflage, Social Media

REGELN:
- Nur NEUE Informationen extrahieren, die noch nicht bekannt sind
- Nur ECHTE Journalisten (Redakteur, Reporter, CvD), keine Verwaltung
- E-Mail-Adressen müssen exakt aus dem Text stammen

Antworte mit JSON:
{
  "newContacts": [
    {
      "name": "...",
      "firstName": "...",
      "lastName": "...",
      "position": "Redakteur",
      "email": "...",
      "phone": "...",
      "isJournalist": true
    }
  ],
  "newFunctionalContact": {
    "name": "Redaktion",
    "email": "redaktion@...",
    "phone": "..."
  },
  "publicationUpdates": {
    "website": "...",
    "circulation": 12345,
    "monthlyPageViews": 500000,
    "socialMedia": [{"platform": "facebook", "url": "..."}]
  },
  "foundNothing": false
}`;

/**
 * reEnrichmentFlow
 *
 * Versucht einen Staging-Eintrag mit zusätzlichen Daten anzureichern.
 */
export const reEnrichmentFlow = ai.defineFlow(
  {
    name: 'reEnrichmentFlow',
    inputSchema: ReEnrichmentInputSchema,
    outputSchema: ReEnrichmentOutputSchema,
  },
  async (input) => {
    const { stagingId, actions } = input;

    console.log('[Enrichment] Start für:', stagingId);

    // Staging-Dokument laden
    const stagingRef = adminDb.collection(STAGING_COLLECTION).doc(stagingId);
    const stagingDoc = await stagingRef.get();

    if (!stagingDoc.exists) {
      throw new Error(`Staging-Dokument nicht gefunden: ${stagingId}`);
    }

    const staging = stagingDoc.data() as MediaResearchStaging;
    const previousScore = staging.qualityScore.total;

    // Prüfe ob max Attempts erreicht
    if (staging.enrichmentCount >= staging.maxEnrichmentAttempts) {
      console.log('[Enrichment] Max Attempts erreicht');
      return {
        stagingId,
        passNumber: staging.enrichmentCount,
        attempted: [],
        improved: [],
        previousScore,
        newScore: previousScore,
        newStatus: 'needs_review' as StagingStatus,
        cost: 0,
      };
    }

    // Status auf "enriching" setzen
    await stagingRef.update({ status: 'enriching', updatedAt: new Date().toISOString() });

    // Bestimme Aktionen
    const actionsToTry = actions || determineEnrichmentActions(staging);
    const attempted: string[] = [];
    const improved: string[] = [];
    let cost = 0;
    let llmTokensUsed = 0;

    // Basis-URL extrahieren
    const baseUrl = staging.publisherInfo?.website || staging.googlePlacesData.website;
    if (!baseUrl) {
      console.log('[Enrichment] Keine Website bekannt');
      await stagingRef.update({ status: 'needs_review', updatedAt: new Date().toISOString() });
      return {
        stagingId,
        passNumber: staging.enrichmentCount + 1,
        attempted: ['no_website'],
        improved: [],
        previousScore,
        newScore: previousScore,
        newStatus: 'needs_review' as StagingStatus,
        cost: 0,
      };
    }

    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.origin;

    // Neue Daten sammeln
    let newContacts = [...staging.contacts];
    let newFunctionalContact = staging.functionalContact;
    let newPublications = [...staging.publications];
    let allScrapedContent = '';

    // ─────────────────────────────────────────────────────────────
    // AKTION: /redaktion scrapen
    // ─────────────────────────────────────────────────────────────
    if (actionsToTry.includes('scrape_redaktion')) {
      attempted.push('scrape_redaktion');
      const redaktionUrl = `${baseDomain}/redaktion`;
      const content = await scrapeUrl(redaktionUrl);

      // Längerer Delay wegen Rate Limiting
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (content && content.length > 500) {
        allScrapedContent += `\n\n--- /redaktion ---\n${content}`;
        console.log('[Enrichment] /redaktion geladen:', content.length, 'Zeichen');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // AKTION: /team scrapen
    // ─────────────────────────────────────────────────────────────
    if (actionsToTry.includes('scrape_team')) {
      attempted.push('scrape_team');
      const teamUrl = `${baseDomain}/team`;
      const content = await scrapeUrl(teamUrl);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (content && content.length > 500) {
        allScrapedContent += `\n\n--- /team ---\n${content}`;
        console.log('[Enrichment] /team geladen:', content.length, 'Zeichen');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // AKTION: /impressum nochmal scrapen
    // ─────────────────────────────────────────────────────────────
    if (actionsToTry.includes('scrape_impressum')) {
      attempted.push('scrape_impressum');
      const impressumUrl = `${baseDomain}/impressum`;
      const content = await scrapeUrl(impressumUrl);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (content && content.length > 500) {
        allScrapedContent += `\n\n--- /impressum ---\n${content}`;
        console.log('[Enrichment] /impressum geladen:', content.length, 'Zeichen');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LLM EXTRAKTION aus neuem Content
    // ─────────────────────────────────────────────────────────────
    if (allScrapedContent.length > 100) {
      try {
        const response = await ai.generate({
          model: gemini25FlashModel,
          prompt: [
            { text: ENRICHMENT_PROMPT },
            { text: `BEREITS BEKANNT:\n- Kontakte: ${staging.contacts.map(c => c.name).join(', ') || 'keine'}\n- Funktionskontakt: ${staging.functionalContact?.email || 'keiner'}\n\nNEUER CONTENT:\n${allScrapedContent}` },
          ],
          config: { temperature: 0.1, maxOutputTokens: 4096 },
        });

        const responseText = response.text || '';
        llmTokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);
        cost = (llmTokensUsed / 1_000_000) * 0.15;

        // JSON parsen
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);

          // Neue Kontakte hinzufügen
          if (Array.isArray(extracted.newContacts)) {
            for (const contact of extracted.newContacts) {
              if (contact.email && !newContacts.some(c => c.email === contact.email)) {
                newContacts.push({
                  contactType: 'person',
                  name: contact.name,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  position: contact.position,
                  email: contact.email,
                  phone: contact.phone,
                  isJournalist: true,
                });
                improved.push(`Journalist: ${contact.name}`);
                console.log('[Enrichment] Neuer Journalist:', contact.name, contact.email);
              }
            }
          }

          // Funktionskontakt aktualisieren
          if (extracted.newFunctionalContact?.email && !newFunctionalContact?.email) {
            newFunctionalContact = {
              contactType: 'function',
              name: extracted.newFunctionalContact.name || 'Redaktion',
              functionName: 'Redaktion',
              email: extracted.newFunctionalContact.email,
              phone: extracted.newFunctionalContact.phone,
              isJournalist: false,
            };
            improved.push(`Funktionskontakt: ${extracted.newFunctionalContact.email}`);
          }

          // Publication Updates
          if (extracted.publicationUpdates && newPublications.length > 0) {
            const updates = extracted.publicationUpdates;
            if (updates.circulation && !newPublications[0].circulation) {
              newPublications[0].circulation = updates.circulation;
              improved.push(`Auflage: ${updates.circulation}`);
            }
            if (updates.monthlyPageViews && !newPublications[0].monthlyPageViews) {
              newPublications[0].monthlyPageViews = updates.monthlyPageViews;
              improved.push(`PageViews: ${updates.monthlyPageViews}`);
            }
            if (updates.website && !newPublications[0].website) {
              newPublications[0].website = updates.website;
              improved.push(`Pub-Website: ${updates.website}`);
            }
          }
        }
      } catch (error) {
        console.error('[Enrichment] LLM Error:', error);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // NEUEN QUALITY SCORE BERECHNEN
    // ─────────────────────────────────────────────────────────────
    const newQualityScore = calculateQualityScore({
      publisherInfo: staging.publisherInfo,
      publications: newPublications,
      contacts: newContacts,
      functionalContact: newFunctionalContact,
    });

    const newEnrichmentCount = staging.enrichmentCount + 1;
    const newStatus = determineStatus(newQualityScore.total, newEnrichmentCount, staging.maxEnrichmentAttempts);
    const readyForImport = newQualityScore.total >= MIN_SCORE_FOR_AUTO_IMPORT;

    // Enrichment Pass dokumentieren
    const enrichmentPass: EnrichmentPass = {
      pass: newEnrichmentCount,
      timestamp: new Date().toISOString(),
      attempted,
      improved,
      newScore: newQualityScore.total,
      cost,
    };

    // ─────────────────────────────────────────────────────────────
    // STAGING DOKUMENT AKTUALISIEREN
    // ─────────────────────────────────────────────────────────────
    const nextAction = readyForImport ? null : determineNextAction(attempted);
    await stagingRef.update({
      contacts: newContacts,
      ...(newFunctionalContact ? { functionalContact: newFunctionalContact } : {}),
      publications: newPublications,
      qualityScore: newQualityScore,
      readyForImport,
      status: newStatus,
      enrichmentCount: newEnrichmentCount,
      enrichmentPasses: [...staging.enrichmentPasses, enrichmentPass],
      ...(nextAction ? { nextEnrichmentAction: nextAction } : {}),
      totalCost: staging.totalCost + cost,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Enrichment] Abgeschlossen:', {
      stagingId,
      previousScore,
      newScore: newQualityScore.total,
      improved: improved.length,
      newStatus,
    });

    return {
      stagingId,
      passNumber: newEnrichmentCount,
      attempted,
      improved,
      previousScore,
      newScore: newQualityScore.total,
      newStatus,
      cost,
    };
  }
);

/**
 * Bestimmt welche Enrichment-Aktionen sinnvoll sind
 */
function determineEnrichmentActions(staging: MediaResearchStaging): string[] {
  const actions: string[] = [];
  const scrapedUrls = staging.scrapedUrls || [];

  // Wenn keine Journalisten mit Email -> /redaktion und /team scrapen
  if (!staging.contacts.some(c => c.email)) {
    if (!scrapedUrls.some(u => u.includes('/redaktion'))) {
      actions.push('scrape_redaktion');
    }
    if (!scrapedUrls.some(u => u.includes('/team'))) {
      actions.push('scrape_team');
    }
  }

  // Wenn kein Funktionskontakt -> /impressum nochmal
  if (!staging.functionalContact?.email) {
    actions.push('scrape_impressum');
  }

  return actions.length > 0 ? actions : ['scrape_redaktion'];
}

/**
 * Bestimmt die nächste Enrichment-Aktion
 */
function determineNextAction(attempted: string[]): string | undefined {
  const allActions = ['scrape_redaktion', 'scrape_team', 'scrape_impressum'];
  return allActions.find(a => !attempted.includes(a));
}

// ══════════════════════════════════════════════════════════════
// FLOW: BATCH IMPORT FROM STAGING
// ══════════════════════════════════════════════════════════════

/**
 * batchImportFromStagingFlow
 *
 * Importiert alle bereiten Staging-Einträge ins CRM.
 */
export const batchImportFromStagingFlow = ai.defineFlow(
  {
    name: 'batchImportFromStagingFlow',
    inputSchema: BatchImportFromStagingInputSchema,
    outputSchema: BatchImportFromStagingOutputSchema,
  },
  async (input) => {
    const { sessionId, stagingIds, minScore, updateExisting } = input;

    console.log('[BatchImport] Start');

    // Staging-Einträge laden
    let query = adminDb.collection(STAGING_COLLECTION)
      .where('status', 'in', ['ready', 'needs_review'])
      .where('imported', '==', false);

    if (sessionId) {
      query = query.where('sessionId', '==', sessionId);
    }

    const snapshot = await query.get();
    let stagingDocs = snapshot.docs;

    // Filter nach IDs falls angegeben
    if (stagingIds && stagingIds.length > 0) {
      stagingDocs = stagingDocs.filter((doc: FirebaseFirestore.QueryDocumentSnapshot) => stagingIds.includes(doc.id));
    }

    // Filter nach Score
    stagingDocs = stagingDocs.filter((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as MediaResearchStaging;
      return data.qualityScore.total >= minScore;
    });

    console.log('[BatchImport] Zu importieren:', stagingDocs.length);

    const results: {
      stagingId: string;
      publisherName: string;
      status: 'imported' | 'skipped' | 'failed';
      reason?: string;
      crmIds?: { companyId?: string; contactIds?: string[] };
    }[] = [];

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Gruppiere nach Organization für Batch-Import
    const byOrg = new Map<string, typeof stagingDocs>();
    for (const doc of stagingDocs) {
      const data = doc.data() as MediaResearchStaging;
      const orgDocs = byOrg.get(data.organizationId) || [];
      orgDocs.push(doc);
      byOrg.set(data.organizationId, orgDocs);
    }

    // Pro Organization importieren
    for (const [orgId, orgDocs] of byOrg) {
      // Ersten Eintrag für gemeinsame Daten nehmen
      const firstData = orgDocs[0].data() as MediaResearchStaging;

      // CRM Import Input erstellen
      const publishers = orgDocs
        .filter((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = doc.data() as MediaResearchStaging;
          return data.isMediaCompany && data.publisherInfo;
        })
        .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = doc.data() as MediaResearchStaging;
          return {
            publisherInfo: data.publisherInfo!,
            publications: data.publications,
            contacts: data.contacts,
            functionalContact: data.functionalContact,
            sourceUrl: data.publisherInfo?.website,
            placeId: data.googlePlacesData.placeId,
            fallbackName: data.googlePlacesData.name,
            internalNotes: data.internalNotes,
          };
        });

      if (publishers.length === 0) {
        for (const doc of orgDocs) {
          results.push({
            stagingId: doc.id,
            publisherName: (doc.data() as MediaResearchStaging).googlePlacesData.name,
            status: 'skipped',
            reason: 'Kein Medienunternehmen',
          });
          skipped++;
        }
        continue;
      }

      try {
        // CRM Import ausführen
        const importInput: CrmImportInput = {
          organizationId: orgId,
          userId: firstData.userId,
          tagName: firstData.tagName,
          publishers: publishers as CrmImportInput['publishers'],
        };
        const importResult = await crmImportFlow(importInput);

        // Staging-Dokumente aktualisieren
        for (let i = 0; i < orgDocs.length; i++) {
          const doc = orgDocs[i];
          const data = doc.data() as MediaResearchStaging;

          if (!data.isMediaCompany) {
            results.push({
              stagingId: doc.id,
              publisherName: data.googlePlacesData.name,
              status: 'skipped',
              reason: 'Kein Medienunternehmen',
            });
            skipped++;
            continue;
          }

          const companyId = importResult.companies.ids[i];
          const contactIds = importResult.contacts.ids.slice(
            i * 2,
            (i + 1) * 2
          ); // Approximation

          await adminDb.collection(STAGING_COLLECTION).doc(doc.id).update({
            status: 'imported',
            imported: true,
            importedAt: new Date().toISOString(),
            crmIds: {
              companyId,
              contactIds,
              tagId: importResult.tagId,
            },
            updatedAt: new Date().toISOString(),
          });

          results.push({
            stagingId: doc.id,
            publisherName: data.publisherInfo?.name || data.googlePlacesData.name,
            status: 'imported',
            crmIds: { companyId, contactIds },
          });
          imported++;
        }
      } catch (error) {
        console.error('[BatchImport] Error:', error);
        for (const doc of orgDocs) {
          const data = doc.data() as MediaResearchStaging;
          await adminDb.collection(STAGING_COLLECTION).doc(doc.id).update({
            status: 'failed',
            importError: String(error),
            updatedAt: new Date().toISOString(),
          });
          results.push({
            stagingId: doc.id,
            publisherName: data.googlePlacesData.name,
            status: 'failed',
            reason: String(error),
          });
          failed++;
        }
      }
    }

    console.log('[BatchImport] Abgeschlossen:', { imported, skipped, failed });

    return {
      imported,
      skipped,
      failed,
      details: results,
    };
  }
);

// ══════════════════════════════════════════════════════════════
// FLOW: AUTO-ENRICH SESSION
// ══════════════════════════════════════════════════════════════

/**
 * autoEnrichSessionFlow
 *
 * Versucht alle Staging-Einträge einer Session automatisch anzureichern.
 */
export const autoEnrichSessionFlow = ai.defineFlow(
  {
    name: 'autoEnrichSessionFlow',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
      maxEnrichments: z.number().default(10).describe('Max Enrichments pro Durchlauf'),
    }),
    outputSchema: z.object({
      processed: z.number(),
      improved: z.number(),
      nowReady: z.number(),
      totalCost: z.number(),
    }),
  },
  async (input) => {
    const { sessionId, maxEnrichments } = input;

    console.log('[AutoEnrich] Start für Session:', sessionId);

    // Alle Einträge der Session laden die noch nicht ready sind
    const snapshot = await adminDb.collection(STAGING_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', 'in', ['pending', 'needs_review'])
      .where('enrichmentCount', '<', MAX_ENRICHMENT_ATTEMPTS)
      .limit(maxEnrichments)
      .get();

    let processed = 0;
    let improved = 0;
    let nowReady = 0;
    let totalCost = 0;

    for (const doc of snapshot.docs) {
      try {
        const result = await reEnrichmentFlow({ stagingId: doc.id });
        processed++;
        totalCost += result.cost;

        if (result.improved.length > 0) {
          improved++;
        }
        if (result.newStatus === 'ready') {
          nowReady++;
        }

        // Delay zwischen Enrichments
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('[AutoEnrich] Error für', doc.id, error);
      }
    }

    console.log('[AutoEnrich] Abgeschlossen:', { processed, improved, nowReady });

    return { processed, improved, nowReady, totalCost };
  }
);

// Import z for the autoEnrichSessionFlow
import { z } from 'genkit';
