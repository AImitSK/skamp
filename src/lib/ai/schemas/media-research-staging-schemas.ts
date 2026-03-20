// src/lib/ai/schemas/media-research-staging-schemas.ts
// Schemas für die Staging Collection vor CRM-Import

import { z } from 'genkit';
import {
  MediaPlaceSchema,
  ExtractedPublisherInfoSchema,
  ExtractedPublicationSchema,
  ExtractedContactSchema,
  SocialMediaLinkSchema,
} from './media-research-schemas';

// ══════════════════════════════════════════════════════════════
// QUALITY SCORE SCHEMA
// ══════════════════════════════════════════════════════════════

/**
 * Qualitäts-Score für einen Staging-Eintrag
 * Max 100 Punkte
 */
export const QualityScoreSchema = z.object({
  /** Publisher hat Website (20 Punkte) */
  hasWebsite: z.boolean().describe('Publisher hat Website'),
  /** Mindestens eine Email vorhanden (25 Punkte) */
  hasEmail: z.boolean().describe('Mindestens eine Email (Redaktion oder Journalist)'),
  /** Echte Journalisten mit persönlicher Email (15 Punkte) */
  hasJournalistsWithEmail: z.boolean().describe('Journalisten mit persönlicher Email'),
  /** Auflage oder PageViews bekannt (15 Punkte) */
  hasReachData: z.boolean().describe('Auflage oder PageViews bekannt'),
  /** Social Media Profile vorhanden (10 Punkte) */
  hasSocialMedia: z.boolean().describe('Social Media Profile vorhanden'),
  /** Publications haben eigene Website (15 Punkte) */
  publicationsHaveWebsite: z.boolean().describe('Publications haben eigene Website'),
  /** Gesamt-Score (0-100) */
  total: z.number().min(0).max(100).describe('Gesamt-Score'),
  /** Score-Details für Debugging */
  breakdown: z.object({
    website: z.number(),
    email: z.number(),
    journalists: z.number(),
    reach: z.number(),
    social: z.number(),
    pubWebsites: z.number(),
  }).describe('Score-Breakdown'),
});
export type QualityScore = z.infer<typeof QualityScoreSchema>;

// ══════════════════════════════════════════════════════════════
// ENRICHMENT TRACKING
// ══════════════════════════════════════════════════════════════

/**
 * Tracking eines Enrichment-Durchlaufs
 */
export const EnrichmentPassSchema = z.object({
  /** Pass-Nummer (1, 2, 3...) */
  pass: z.number().describe('Durchlauf-Nummer'),
  /** Zeitpunkt des Durchlaufs */
  timestamp: z.string().describe('ISO Timestamp'),
  /** Was wurde versucht */
  attempted: z.array(z.string()).describe('Versuchte Enrichments'),
  /** Was wurde verbessert */
  improved: z.array(z.string()).describe('Erfolgreich verbesserte Felder'),
  /** Neuer Quality Score nach diesem Pass */
  newScore: z.number().describe('Quality Score nach diesem Pass'),
  /** Kosten dieses Passes */
  cost: z.number().describe('Kosten in USD'),
});
export type EnrichmentPass = z.infer<typeof EnrichmentPassSchema>;

// ══════════════════════════════════════════════════════════════
// STAGING STATUS
// ══════════════════════════════════════════════════════════════

/**
 * Status eines Staging-Eintrags
 */
export const StagingStatusSchema = z.enum([
  'pending',      // Neu erstellt, noch nicht geprüft
  'enriching',    // Wird gerade angereichert
  'ready',        // Bereit für Import (Score >= Schwelle)
  'needs_review', // Manueller Review nötig (niedriger Score)
  'imported',     // Erfolgreich ins CRM importiert
  'rejected',     // Manuell abgelehnt
  'failed',       // Import fehlgeschlagen
]);
export type StagingStatus = z.infer<typeof StagingStatusSchema>;

// ══════════════════════════════════════════════════════════════
// MAIN STAGING SCHEMA
// ══════════════════════════════════════════════════════════════

/**
 * Ein Eintrag in der Staging Collection
 */
export const MediaResearchStagingSchema = z.object({
  // ─────────────────────────────────────────────────────────────
  // IDENTIFIKATION
  // ─────────────────────────────────────────────────────────────
  /** Firestore Document ID */
  id: z.string().optional().describe('Firestore Document ID'),
  /** Organization ID */
  organizationId: z.string().describe('Firebase Organization ID'),
  /** Research Session ID (gruppiert zusammengehörige Einträge) */
  sessionId: z.string().describe('Research Session ID'),
  /** Tag Name für spätere CRM-Zuordnung */
  tagName: z.string().describe('Tag für CRM Import'),
  /** User der die Recherche gestartet hat */
  userId: z.string().describe('User ID'),

  // ─────────────────────────────────────────────────────────────
  // STATUS & QUALITÄT
  // ─────────────────────────────────────────────────────────────
  /** Aktueller Status */
  status: StagingStatusSchema.describe('Aktueller Status'),
  /** Qualitäts-Score */
  qualityScore: QualityScoreSchema.describe('Qualitäts-Score'),
  /** Ist bereit für Import? (Score >= MIN_SCORE) */
  readyForImport: z.boolean().describe('Bereit für CRM Import'),
  /** Mindest-Score für Auto-Import (default 50) */
  minScoreForImport: z.number().default(50).describe('Mindest-Score für Import'),

  // ─────────────────────────────────────────────────────────────
  // ROHDATEN: GOOGLE PLACES
  // ─────────────────────────────────────────────────────────────
  /** Original Google Places Daten */
  googlePlacesData: MediaPlaceSchema.describe('Google Places Rohdaten'),

  // ─────────────────────────────────────────────────────────────
  // ROHDATEN: WEB SCRAPER
  // ─────────────────────────────────────────────────────────────
  /** Ist es ein echtes Medienunternehmen? */
  isMediaCompany: z.boolean().describe('Ist Medienunternehmen'),
  /** Konfidenz der Klassifizierung */
  mediaConfidence: z.number().describe('Klassifizierungs-Konfidenz'),
  /** Begründung für Klassifizierung */
  mediaClassificationReason: z.string().optional().describe('Klassifizierungs-Begründung'),

  /** Extrahierte Publisher-Info */
  publisherInfo: ExtractedPublisherInfoSchema.optional().describe('Publisher Informationen'),
  /** Extrahierte Publikationen */
  publications: z.array(ExtractedPublicationSchema).describe('Publikationen'),
  /** Extrahierte Kontakte (nur Journalisten) */
  contacts: z.array(ExtractedContactSchema).describe('Journalisten-Kontakte'),
  /** Funktionskontakt als Fallback */
  functionalContact: ExtractedContactSchema.optional().describe('Funktionskontakt'),

  /** Gescrapte URLs */
  scrapedUrls: z.array(z.string()).describe('Gescrapte URLs'),
  /** Gefundene Mediadaten-PDF URLs */
  mediadataPdfUrls: z.array(z.string()).optional().describe('Mediadaten PDF URLs'),
  /** Interne Notizen aus Extraktion */
  internalNotes: z.string().optional().describe('Interne Notizen'),

  // ─────────────────────────────────────────────────────────────
  // ENRICHMENT TRACKING
  // ─────────────────────────────────────────────────────────────
  /** Anzahl Enrichment-Durchläufe */
  enrichmentCount: z.number().default(0).describe('Anzahl Enrichment-Versuche'),
  /** Max Enrichment-Versuche */
  maxEnrichmentAttempts: z.number().default(3).describe('Max Enrichment-Versuche'),
  /** Details zu jedem Enrichment-Pass */
  enrichmentPasses: z.array(EnrichmentPassSchema).default([]).describe('Enrichment-Historie'),
  /** Nächste geplante Enrichment-Aktion */
  nextEnrichmentAction: z.string().optional().describe('Nächste Enrichment-Aktion'),

  // ─────────────────────────────────────────────────────────────
  // CRM IMPORT TRACKING
  // ─────────────────────────────────────────────────────────────
  /** Wurde importiert? */
  imported: z.boolean().default(false).describe('Wurde ins CRM importiert'),
  /** Zeitpunkt des Imports */
  importedAt: z.string().optional().describe('Import-Zeitpunkt'),
  /** Erstellte CRM IDs */
  crmIds: z.object({
    companyId: z.string().optional(),
    publicationIds: z.array(z.string()).optional(),
    contactIds: z.array(z.string()).optional(),
    tagId: z.string().optional(),
  }).optional().describe('CRM Referenzen'),
  /** Import-Fehler falls vorhanden */
  importError: z.string().optional().describe('Import-Fehler'),

  // ─────────────────────────────────────────────────────────────
  // KOSTEN & TIMESTAMPS
  // ─────────────────────────────────────────────────────────────
  /** Gesamtkosten für diesen Eintrag */
  totalCost: z.number().default(0).describe('Gesamtkosten USD'),
  /** Erstellt am */
  createdAt: z.string().describe('Erstellt am'),
  /** Zuletzt aktualisiert */
  updatedAt: z.string().describe('Zuletzt aktualisiert'),
});
export type MediaResearchStaging = z.infer<typeof MediaResearchStagingSchema>;

// ══════════════════════════════════════════════════════════════
// STAGING FLOW INPUT/OUTPUT
// ══════════════════════════════════════════════════════════════

/**
 * Input für Staging-Flow (speichert Scraper-Ergebnisse)
 */
export const SaveToStagingInputSchema = z.object({
  organizationId: z.string(),
  sessionId: z.string(),
  tagName: z.string(),
  userId: z.string(),
  googlePlacesData: MediaPlaceSchema,
  scraperOutput: z.object({
    isMediaCompany: z.boolean(),
    mediaConfidence: z.number(),
    mediaClassificationReason: z.string().optional(),
    publisherInfo: ExtractedPublisherInfoSchema.optional(),
    publications: z.array(ExtractedPublicationSchema),
    contacts: z.array(ExtractedContactSchema),
    functionalContact: ExtractedContactSchema.optional(),
    scrapedUrls: z.array(z.string()),
    mediadataPdfUrls: z.array(z.string()).optional(),
    internalNotes: z.string().optional(),
    cost: z.object({
      jinaRequests: z.number(),
      llmTokensUsed: z.number(),
      estimatedCostUSD: z.number(),
    }),
  }),
});
export type SaveToStagingInput = z.infer<typeof SaveToStagingInputSchema>;

/**
 * Output nach Staging-Speicherung
 */
export const SaveToStagingOutputSchema = z.object({
  stagingId: z.string().describe('Staging Document ID'),
  qualityScore: z.number().describe('Berechneter Quality Score'),
  readyForImport: z.boolean().describe('Bereit für Import'),
  status: StagingStatusSchema.describe('Status'),
});
export type SaveToStagingOutput = z.infer<typeof SaveToStagingOutputSchema>;

// ══════════════════════════════════════════════════════════════
// RE-ENRICHMENT FLOW INPUT/OUTPUT
// ══════════════════════════════════════════════════════════════

/**
 * Input für Re-Enrichment Flow
 */
export const ReEnrichmentInputSchema = z.object({
  /** Staging Document ID */
  stagingId: z.string().describe('Staging ID zum Anreichern'),
  /** Spezifische Aktionen (optional, sonst auto-detect) */
  actions: z.array(z.enum([
    'scrape_redaktion',    // /redaktion Seite scrapen
    'scrape_team',         // /team Seite scrapen
    'scrape_impressum',    // /impressum nochmal
    'parse_mediadaten',    // Mediadaten-PDF parsen
    'search_publication',  // Web-Suche für Publication-Website
  ])).optional().describe('Gewünschte Enrichment-Aktionen'),
});
export type ReEnrichmentInput = z.infer<typeof ReEnrichmentInputSchema>;

/**
 * Output des Re-Enrichment Flows
 */
export const ReEnrichmentOutputSchema = z.object({
  stagingId: z.string(),
  passNumber: z.number().describe('Welcher Enrichment-Pass'),
  attempted: z.array(z.string()).describe('Versuchte Aktionen'),
  improved: z.array(z.string()).describe('Verbesserte Felder'),
  previousScore: z.number(),
  newScore: z.number(),
  newStatus: StagingStatusSchema,
  cost: z.number(),
});
export type ReEnrichmentOutput = z.infer<typeof ReEnrichmentOutputSchema>;

// ══════════════════════════════════════════════════════════════
// BATCH IMPORT INPUT/OUTPUT
// ══════════════════════════════════════════════════════════════

/**
 * Input für Batch-Import aus Staging
 */
export const BatchImportFromStagingInputSchema = z.object({
  /** Session ID oder Liste von Staging IDs */
  sessionId: z.string().optional(),
  stagingIds: z.array(z.string()).optional(),
  /** Nur Einträge mit diesem Mindest-Score importieren */
  minScore: z.number().default(50),
  /** Auch bereits importierte updaten? */
  updateExisting: z.boolean().default(false),
});
export type BatchImportFromStagingInput = z.infer<typeof BatchImportFromStagingInputSchema>;

/**
 * Output des Batch-Imports
 */
export const BatchImportFromStagingOutputSchema = z.object({
  imported: z.number().describe('Erfolgreich importiert'),
  skipped: z.number().describe('Übersprungen (Score zu niedrig)'),
  failed: z.number().describe('Import fehlgeschlagen'),
  details: z.array(z.object({
    stagingId: z.string(),
    publisherName: z.string(),
    status: z.enum(['imported', 'skipped', 'failed']),
    reason: z.string().optional(),
    crmIds: z.object({
      companyId: z.string().optional(),
      contactIds: z.array(z.string()).optional(),
    }).optional(),
  })),
});
export type BatchImportFromStagingOutput = z.infer<typeof BatchImportFromStagingOutputSchema>;

// ══════════════════════════════════════════════════════════════
// HELPER: QUALITY SCORE BERECHNUNG
// ══════════════════════════════════════════════════════════════

/**
 * Berechnet den Quality Score für einen Staging-Eintrag
 */
export function calculateQualityScore(data: {
  publisherInfo?: { website?: string | null; socialMedia?: any[] | null };
  publications: Array<{ website?: string | null; circulation?: number | null; monthlyPageViews?: number | null }>;
  contacts: Array<{ email?: string | null }>;
  functionalContact?: { email?: string | null };
}): QualityScore {
  const scores = {
    website: 0,
    email: 0,
    journalists: 0,
    reach: 0,
    social: 0,
    pubWebsites: 0,
  };

  // Publisher hat Website (20 Punkte)
  const hasWebsite = !!data.publisherInfo?.website;
  if (hasWebsite) scores.website = 20;

  // Mindestens eine Email (25 Punkte)
  const hasEmail = data.contacts.some(c => c.email) || !!data.functionalContact?.email;
  if (hasEmail) scores.email = 25;

  // Journalisten mit persönlicher Email (15 Punkte)
  const hasJournalistsWithEmail = data.contacts.some(c => c.email);
  if (hasJournalistsWithEmail) scores.journalists = 15;

  // Auflage oder PageViews (15 Punkte)
  const hasReachData = data.publications.some(p => p.circulation || p.monthlyPageViews);
  if (hasReachData) scores.reach = 15;

  // Social Media (10 Punkte)
  const hasSocialMedia = (data.publisherInfo?.socialMedia?.length || 0) > 0;
  if (hasSocialMedia) scores.social = 10;

  // Publications haben Website (15 Punkte)
  const pubsWithWebsite = data.publications.filter(p => p.website);
  const publicationsHaveWebsite = pubsWithWebsite.length > 0 &&
    pubsWithWebsite.length >= data.publications.length * 0.5; // Mind. 50% haben Website
  if (publicationsHaveWebsite) scores.pubWebsites = 15;

  const total = scores.website + scores.email + scores.journalists +
                scores.reach + scores.social + scores.pubWebsites;

  return {
    hasWebsite,
    hasEmail,
    hasJournalistsWithEmail,
    hasReachData,
    hasSocialMedia,
    publicationsHaveWebsite,
    total,
    breakdown: scores,
  };
}
