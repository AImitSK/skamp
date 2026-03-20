// src/lib/ai/flows/media-research/mediaResearchFlow.ts
// Haupt-Orchestrierungs-Flow für die regionale Medien-Recherche-Pipeline

import { ai } from '../../genkit-config';
import {
  MediaResearchInputSchema,
  MediaResearchOutputSchema,
  type MediaResearchInput,
  type MediaResearchOutput,
  type ExtractedPublisherInfo,
  type ExtractedPublication,
  type ExtractedContact,
} from '../../schemas/media-research-schemas';
import { googlePlacesSearchFlow } from './googlePlacesSearchFlow';
import { webScraperFlow } from './webScraperFlow';
import { crmImportFlow } from './crmImportFlow';
import { saveToStagingFlow, autoEnrichSessionFlow } from './stagingFlow';
import { v4 as uuidv4 } from 'uuid';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface PublisherResult {
  publisherName: string;
  website?: string;
  publisherInfo?: ExtractedPublisherInfo;
  publications: ExtractedPublication[];
  contacts: ExtractedContact[];
  /** Funktionskontakt als Fallback wenn keine Journalisten mit Email */
  functionalContact?: ExtractedContact;
  status: 'success' | 'partial' | 'failed' | 'not_media';
  errors: string[];
  placeId?: string;
  /** Medien-Klassifizierung vom LLM */
  isMediaCompany?: boolean;
  mediaConfidence?: number;
  mediaClassificationReason?: string;
  /** Interne Notizen für CRM (Probleme, Hinweise) */
  internalNotes?: string;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * mediaResearchFlow
 *
 * Haupt-Orchestrierungs-Flow für die regionale Medien-Recherche.
 *
 * Pipeline:
 * 1. Google Places Suche nach Medienunternehmen
 * 2. Website-Scraping für jeden Treffer mit Website
 * 3. LLM-Extraktion von Publisher, Publikationen, Redakteuren
 * 4. CRM-Import mit Duplikat-Prüfung
 *
 * Fehlerbehandlung: Partial Success - Fehler werden gesammelt aber
 * führen nicht zum Abbruch.
 */
export const mediaResearchFlow = ai.defineFlow(
  {
    name: 'mediaResearchFlow',
    inputSchema: MediaResearchInputSchema,
    outputSchema: MediaResearchOutputSchema,
  },
  async (input: MediaResearchInput): Promise<MediaResearchOutput> => {
    const startTime = Date.now();
    console.log('═'.repeat(60));
    console.log('[MediaResearch] Start für Region:', input.region);
    console.log('[MediaResearch] Zentrum:', input.center.lat, input.center.lng);
    console.log('[MediaResearch] Radius:', input.radiusKm, 'km');
    console.log('═'.repeat(60));

    const warnings: string[] = [];
    const results: PublisherResult[] = [];
    let googlePlacesCost = 0;
    let jinaCost = 0;
    let geminiCost = 0;

    // ══════════════════════════════════════════════════════════════
    // PHASE 1: GOOGLE PLACES SUCHE (inkl. zusätzlicher Zentren)
    // ══════════════════════════════════════════════════════════════
    console.log('\n📍 PHASE 1: Google Places Suche...');

    // Alle Suchzentren sammeln
    const searchCenters = [
      { name: input.region, center: input.center, radiusKm: input.radiusKm },
      ...(input.additionalCenters || []),
    ];

    console.log(`[MediaResearch] Suche in ${searchCenters.length} Zentren:`, searchCenters.map(c => c.name).join(', '));

    // Alle Places aus allen Zentren sammeln
    const allPlaces: any[] = [];
    const seenPlaceIds = new Set<string>();

    for (const searchCenter of searchCenters) {
      console.log(`\n[MediaResearch] Suche in: ${searchCenter.name} (${searchCenter.radiusKm}km Radius)`);

      try {
        const placesResult = await googlePlacesSearchFlow({
          region: searchCenter.name,
          center: searchCenter.center,
          radiusKm: searchCenter.radiusKm,
          searchTerms: input.additionalSearchTerms,
        });

        googlePlacesCost += placesResult.cost.estimatedCostUSD;

        // Deduplizieren nach Place ID
        for (const place of placesResult.places) {
          if (!seenPlaceIds.has(place.placeId)) {
            seenPlaceIds.add(place.placeId);
            allPlaces.push(place);
          }
        }

        console.log(`[MediaResearch] ${searchCenter.name}: ${placesResult.totalFound} gefunden, ${allPlaces.length} unique gesamt`);
      } catch (error: any) {
        warnings.push(`Google Places Fehler für ${searchCenter.name}: ${error.message}`);
        console.error(`[MediaResearch] Google Places Fehler für ${searchCenter.name}:`, error.message);
        // Weitermachen mit anderen Zentren
      }
    }

    if (allPlaces.length === 0) {
      return {
        summary: {
          region: input.region,
          publishersFound: 0,
          publicationsFound: 0,
          contactsFound: 0,
          companiesCreated: 0,
          contactsCreated: 0,
        },
        results: [],
        costs: { googlePlaces: googlePlacesCost, jina: 0, gemini: 0, total: googlePlacesCost },
        durationSeconds: (Date.now() - startTime) / 1000,
        warnings: ['Keine Medien-Orte gefunden in allen Suchzentren'],
      };
    }

    console.log(`[MediaResearch] Gesamt gefunden: ${allPlaces.length} unique Medien-Orte`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 2: WEBSITE SCRAPING
    // ══════════════════════════════════════════════════════════════
    console.log('\n🌐 PHASE 2: Website Scraping...');

    const placesWithWebsite = allPlaces.filter(p => p.website);
    console.log(`[MediaResearch] ${placesWithWebsite.length} von ${allPlaces.length} mit Website`);

    for (const place of placesWithWebsite) {
      console.log(`\n[MediaResearch] Scraping: ${place.name}`);
      console.log(`[MediaResearch] URL: ${place.website}`);

      const publisherResult: PublisherResult = {
        publisherName: place.name,
        website: place.website,
        publications: [],
        contacts: [],
        status: 'failed',
        errors: [],
        placeId: place.placeId,
      };

      try {
        const scraperResult = await webScraperFlow({
          websiteUrl: place.website!,
          companyName: place.name,
          knownInfo: {
            phone: place.phone,
            city: place.city,
          },
        });

        jinaCost += scraperResult.cost.jinaRequests * 0; // Jina ist kostenlos
        geminiCost += scraperResult.cost.estimatedCostUSD;

        // Medien-Klassifizierung speichern
        publisherResult.isMediaCompany = scraperResult.isMediaCompany;
        publisherResult.mediaConfidence = scraperResult.mediaConfidence;
        publisherResult.mediaClassificationReason = scraperResult.mediaClassificationReason;
        publisherResult.internalNotes = scraperResult.internalNotes;

        // WICHTIG: Nur echte Medienunternehmen weiter verarbeiten!
        if (!scraperResult.isMediaCompany) {
          publisherResult.status = 'not_media';
          publisherResult.errors.push(`Kein Medienunternehmen (${scraperResult.mediaConfidence}% Konfidenz): ${scraperResult.mediaClassificationReason}`);
          console.log(`[MediaResearch] ✗ KEIN MEDIEN: ${place.name} - ${scraperResult.mediaClassificationReason}`);
        } else if (scraperResult.success) {
          publisherResult.status = 'success';
          publisherResult.publisherInfo = scraperResult.publisherInfo;
          publisherResult.publications = scraperResult.publications;
          publisherResult.contacts = scraperResult.contacts;
          publisherResult.functionalContact = scraperResult.functionalContact;

          const journalistsWithEmail = scraperResult.contacts.filter(c => c.email).length;
          console.log(`[MediaResearch] ✓ MEDIEN: ${place.name} (${scraperResult.mediaConfidence}% Konfidenz)`);
          console.log(`[MediaResearch]   Extrahiert: ${scraperResult.publications.length} Pub, ${scraperResult.contacts.length} Journalisten`);
          console.log(`[MediaResearch]   Journalisten mit E-Mail: ${journalistsWithEmail}`);
          if (scraperResult.functionalContact) {
            console.log(`[MediaResearch]   Funktionskontakt: ${scraperResult.functionalContact.email}`);
          }
        } else {
          publisherResult.status = 'partial';
          publisherResult.errors = scraperResult.errors || [];

          // Auch bei partial: Basis-Info übernehmen
          publisherResult.publisherInfo = scraperResult.publisherInfo || {
            name: place.name,
            website: place.website,
            phone: place.phone,
            address: place.city ? { city: place.city } : undefined,
          };

          console.log(`[MediaResearch] ⚠ Partial: ${scraperResult.errors?.join(', ')}`);
        }
      } catch (error: any) {
        publisherResult.status = 'failed';
        publisherResult.errors.push(error.message);
        warnings.push(`Scraping fehlgeschlagen für ${place.name}: ${error.message}`);

        console.error(`[MediaResearch] ✗ Fehler bei ${place.name}:`, error.message);

        // Trotzdem Basis-Info speichern
        publisherResult.publisherInfo = {
          name: place.name,
          website: place.website,
          phone: place.phone,
          address: place.city ? { city: place.city } : undefined,
        };
      }

      results.push(publisherResult);

      // Rate Limiting zwischen Websites
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Orte ohne Website: NICHT importieren (können nicht validiert werden)
    // Nur zur Statistik erfassen
    for (const place of allPlaces.filter(p => !p.website)) {
      results.push({
        publisherName: place.name,
        publisherInfo: {
          name: place.name,
          phone: place.phone,
          address: place.city ? { city: place.city } : undefined,
        },
        publications: [],
        contacts: [],
        status: 'not_media', // Ohne Website nicht als Medien verifizierbar
        errors: ['Keine Website verfügbar - nicht verifizierbar'],
        placeId: place.placeId,
        isMediaCompany: false,
        mediaConfidence: 0,
        mediaClassificationReason: 'Keine Website zum Verifizieren',
      });
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 3: CRM IMPORT
    // ══════════════════════════════════════════════════════════════
    let crmImportResult;

    // ══════════════════════════════════════════════════════════════
    // PHASE 3: STAGING ODER CRM IMPORT
    // ══════════════════════════════════════════════════════════════

    // WICHTIG: NUR verifizierte Medienunternehmen verarbeiten!
    const mediaResults = results.filter(r =>
      r.isMediaCompany === true &&
      r.status !== 'failed' &&
      r.status !== 'not_media' &&
      r.publisherInfo
    );

    const nonMediaResults = results.filter(r =>
      r.isMediaCompany === false || r.status === 'not_media'
    );

    console.log(`[MediaResearch] Klassifizierung:`);
    console.log(`  - Echte Medienunternehmen: ${mediaResults.length}`);
    console.log(`  - Keine Medienunternehmen (gefiltert): ${nonMediaResults.length}`);

    // Log gefilterte Nicht-Medien
    for (const nm of nonMediaResults) {
      console.log(`  ✗ ${nm.publisherName}: ${nm.mediaClassificationReason || 'nicht klassifiziert'}`);
    }

    // Staging-Tracking
    let stagingSessionId: string | undefined;
    let stagingStats = { saved: 0, readyForImport: 0, needsEnrichment: 0 };

    // ══════════════════════════════════════════════════════════════
    // OPTION A: STAGING MODUS (empfohlen für Review)
    // ══════════════════════════════════════════════════════════════
    if (input.useStaging) {
      console.log('\n📦 PHASE 3: Staging-Modus (Review vor Import)...');

      // Session ID für diese Recherche
      stagingSessionId = uuidv4();
      console.log(`[MediaResearch] Staging Session: ${stagingSessionId}`);

      for (const result of mediaResults) {
        try {
          // In Staging speichern
          const stagingResult = await saveToStagingFlow({
            organizationId: input.organizationId,
            sessionId: stagingSessionId,
            tagName: input.tagName,
            userId: input.userId,
            googlePlacesData: {
              placeId: result.placeId || '',
              name: result.publisherName,
              website: result.website,
              searchTerm: 'media-research',
            },
            scraperOutput: {
              isMediaCompany: result.isMediaCompany || false,
              mediaConfidence: result.mediaConfidence || 0,
              mediaClassificationReason: result.mediaClassificationReason,
              publisherInfo: result.publisherInfo,
              publications: result.publications,
              contacts: result.contacts,
              functionalContact: result.functionalContact,
              scrapedUrls: [],
              mediadataPdfUrls: [],
              internalNotes: result.internalNotes,
              cost: { jinaRequests: 0, llmTokensUsed: 0, estimatedCostUSD: 0 },
            },
          });

          stagingStats.saved++;
          if (stagingResult.readyForImport) {
            stagingStats.readyForImport++;
          } else {
            stagingStats.needsEnrichment++;
          }

          console.log(`[MediaResearch] Staging: ${result.publisherName} → Score ${stagingResult.qualityScore}, ${stagingResult.status}`);
        } catch (error: any) {
          warnings.push(`Staging-Fehler für ${result.publisherName}: ${error.message}`);
        }
      }

      console.log(`[MediaResearch] Staging abgeschlossen: ${stagingStats.saved} gespeichert, ${stagingStats.readyForImport} bereit, ${stagingStats.needsEnrichment} braucht Enrichment`);

      // Auto-Enrichment falls aktiviert
      if (input.autoEnrich && stagingStats.needsEnrichment > 0) {
        console.log('\n🔄 Auto-Enrichment für Einträge mit niedrigem Score...');
        try {
          const enrichResult = await autoEnrichSessionFlow({
            sessionId: stagingSessionId,
            maxEnrichments: Math.min(stagingStats.needsEnrichment, 10),
          });
          console.log(`[MediaResearch] Auto-Enrichment: ${enrichResult.improved} verbessert, ${enrichResult.nowReady} jetzt bereit`);
          stagingStats.readyForImport += enrichResult.nowReady;
        } catch (error: any) {
          warnings.push(`Auto-Enrichment Fehler: ${error.message}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // OPTION B: DIREKTER CRM IMPORT (bisheriges Verhalten)
    // ══════════════════════════════════════════════════════════════
    else if (input.importToCrm) {
      console.log('\n💾 PHASE 3: Direkter CRM Import...');

      const publishersToImport = mediaResults
        .map(r => ({
          publisherInfo: r.publisherInfo!,
          publications: r.publications,
          contacts: r.contacts,
          functionalContact: r.functionalContact,
          sourceUrl: r.website,
          placeId: r.placeId,
          fallbackName: r.publisherName,
          internalNotes: r.internalNotes,
        }));

      console.log(`[MediaResearch] Importiere ${publishersToImport.length} verifizierte Medien-Publisher`);

      if (publishersToImport.length > 0) {
        try {
          crmImportResult = await crmImportFlow({
            organizationId: input.organizationId,
            userId: input.userId,
            tagName: input.tagName,
            publishers: publishersToImport,
          });

          console.log('[MediaResearch] CRM Import:', {
            companiesCreated: crmImportResult.companies.created,
            contactsCreated: crmImportResult.contacts.created,
            errors: crmImportResult.errors.length,
          });

          // Import-Fehler zu Warnings hinzufügen
          for (const error of crmImportResult.errors) {
            warnings.push(`CRM Import ${error.type} "${error.name}": ${error.error}`);
          }
        } catch (error: any) {
          warnings.push(`CRM Import fehlgeschlagen: ${error.message}`);
          console.error('[MediaResearch] CRM Import Fehler:', error);
        }
      } else {
        console.log('[MediaResearch] Keine Publisher zum Importieren');
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ZUSAMMENFASSUNG
    // ══════════════════════════════════════════════════════════════
    const durationSeconds = (Date.now() - startTime) / 1000;
    const totalCost = googlePlacesCost + jinaCost + geminiCost;

    // Statistiken berechnen
    const totalPlaces = results.length;
    const verifiedMediaCount = results.filter(r => r.isMediaCompany === true).length;
    const notMediaCount = results.filter(r => r.isMediaCompany === false || r.status === 'not_media').length;
    const publishersFound = results.filter(r => r.isMediaCompany === true && r.status !== 'failed').length;
    const publicationsFound = results.filter(r => r.isMediaCompany === true).reduce((sum, r) => sum + r.publications.length, 0);
    const contactsFound = results.filter(r => r.isMediaCompany === true).reduce((sum, r) => sum + r.contacts.length, 0);
    const contactsWithEmail = results.filter(r => r.isMediaCompany === true).reduce((sum, r) => sum + r.contacts.filter(c => c.email).length, 0);
    const companiesCreated = crmImportResult?.companies.created || 0;
    const contactsCreated = crmImportResult?.contacts.created || 0;
    const publicationsCreated = crmImportResult?.publications.created || 0;

    console.log('\n' + '═'.repeat(60));
    console.log('[MediaResearch] ABGESCHLOSSEN');
    console.log('═'.repeat(60));
    console.log(`Region: ${input.region}`);
    console.log(`Dauer: ${durationSeconds.toFixed(1)} Sekunden`);
    console.log('─'.repeat(60));
    console.log('KLASSIFIZIERUNG:');
    console.log(`  Google Places Treffer: ${totalPlaces}`);
    console.log(`  → Verifizierte Medien: ${verifiedMediaCount}`);
    console.log(`  → Keine Medien (gefiltert): ${notMediaCount}`);
    console.log('─'.repeat(60));
    console.log('EXTRAHIERTE DATEN (nur Medien):');
    console.log(`  Publisher: ${publishersFound}`);
    console.log(`  Publikationen: ${publicationsFound}`);
    console.log(`  Kontakte: ${contactsFound} (davon ${contactsWithEmail} mit E-Mail)`);
    console.log('─'.repeat(60));
    console.log('CRM IMPORT:');
    console.log(`  Companies erstellt: ${companiesCreated}`);
    console.log(`  Publications erstellt: ${publicationsCreated}`);
    console.log(`  Kontakte erstellt: ${contactsCreated}`);
    console.log('─'.repeat(60));
    console.log(`Kosten: $${totalCost.toFixed(2)}`);
    console.log(`Warnungen: ${warnings.length}`);
    console.log('═'.repeat(60));

    return {
      summary: {
        region: input.region,
        publishersFound,
        publicationsFound,
        contactsFound,
        companiesCreated,
        contactsCreated,
      },
      results: results.map(r => ({
        publisherName: r.publisherName,
        website: r.website,
        publicationsCount: r.publications.length,
        contactsCount: r.contacts.length,
        status: r.status,
        errors: r.errors.length > 0 ? r.errors : undefined,
      })),
      crmImport: crmImportResult,
      staging: stagingSessionId ? {
        sessionId: stagingSessionId,
        saved: stagingStats.saved,
        readyForImport: stagingStats.readyForImport,
        needsEnrichment: stagingStats.needsEnrichment,
      } : undefined,
      costs: {
        googlePlaces: googlePlacesCost,
        jina: jinaCost,
        gemini: geminiCost,
        total: totalCost,
      },
      durationSeconds,
      warnings,
    };
  }
);

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

// Alle Flows exportieren für Genkit Dev UI
export { googlePlacesSearchFlow } from './googlePlacesSearchFlow';
export { webScraperFlow } from './webScraperFlow';
export { crmImportFlow } from './crmImportFlow';
