// src/lib/ai/schemas/media-research-schemas.ts
// Zod-Schemas für die regionale Medien-Recherche-Pipeline

import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// GOOGLE PLACES SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Koordinaten für den Suchradius
 */
export const CoordinatesSchema = z.object({
  lat: z.number().describe('Breitengrad'),
  lng: z.number().describe('Längengrad'),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

/**
 * Input für Google Places Suche
 */
export const GooglePlacesSearchInputSchema = z.object({
  /** Regionaler Suchbegriff (z.B. "Rehburg-Loccum") */
  region: z.string().describe('Regionsname für die Suche'),
  /** Zentrum der Suche */
  center: CoordinatesSchema,
  /** Suchradius in Kilometern */
  radiusKm: z.number().min(1).max(100).describe('Suchradius in km'),
  /** Suchbegriffe für Medien */
  searchTerms: z.array(z.string()).optional().describe('Zusätzliche Suchbegriffe'),
});
export type GooglePlacesSearchInput = z.infer<typeof GooglePlacesSearchInputSchema>;

/**
 * Ein gefundener Medien-Ort aus Google Places
 */
export const MediaPlaceSchema = z.object({
  placeId: z.string().describe('Google Place ID'),
  name: z.string().describe('Name des Medienunternehmens'),
  address: z.string().optional().describe('Formatierte Adresse'),
  city: z.string().optional().describe('Stadt'),
  phone: z.string().optional().describe('Telefonnummer'),
  website: z.string().optional().describe('Website URL'),
  types: z.array(z.string()).optional().describe('Google Place Types'),
  rating: z.number().optional().describe('Google Bewertung'),
  searchTerm: z.string().describe('Suchbegriff der diesen Treffer fand'),
});
export type MediaPlace = z.infer<typeof MediaPlaceSchema>;

/**
 * Output der Google Places Suche
 */
export const GooglePlacesSearchOutputSchema = z.object({
  places: z.array(MediaPlaceSchema).describe('Gefundene Medien-Orte'),
  totalFound: z.number().describe('Gesamtzahl gefundener Orte'),
  searchTermsUsed: z.array(z.string()).describe('Verwendete Suchbegriffe'),
  region: z.string().describe('Durchsuchte Region'),
  cost: z.object({
    textSearchRequests: z.number(),
    placeDetailsRequests: z.number(),
    estimatedCostUSD: z.number(),
  }).describe('API-Kosten'),
});
export type GooglePlacesSearchOutput = z.infer<typeof GooglePlacesSearchOutputSchema>;

// ══════════════════════════════════════════════════════════════
// WEB SCRAPER SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Input für Web Scraper
 */
export const WebScraperInputSchema = z.object({
  /** Website URL zum Scrapen */
  websiteUrl: z.string().url().describe('URL der Website'),
  /** Name des Unternehmens (für Kontext) */
  companyName: z.string().describe('Name des Unternehmens'),
  /** Zusätzliche bekannte Informationen */
  knownInfo: z.object({
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }).optional().describe('Bereits bekannte Informationen'),
});
export type WebScraperInput = z.infer<typeof WebScraperInputSchema>;

/**
 * Eine extrahierte Publikation
 */
export const ExtractedPublicationSchema = z.object({
  name: z.string().nullish().describe('Name der Publikation'),
  type: z.enum(['daily', 'weekly', 'monthly', 'online', 'magazine', 'special', 'other']).nullish().describe('Publikationstyp'),
  frequency: z.string().nullish().describe('Erscheinungsweise'),
  distribution: z.string().nullish().describe('Verbreitungsgebiet'),
  topics: z.array(z.string()).nullish().describe('Themengebiete'),
  /** Print-Auflage (verkaufte/verbreitete Exemplare) */
  circulation: z.number().nullish().describe('Print-Auflage (Exemplare)'),
  /** Monatliche Page Views für Online-Publikationen */
  monthlyPageViews: z.number().nullish().describe('Monatliche Page Views (Online)'),
  /** Monatliche Unique Visitors */
  monthlyUniqueVisitors: z.number().nullish().describe('Monatliche Unique Visitors (Online)'),
  website: z.string().nullish().describe('Website URL der Publikation'),
});
export type ExtractedPublication = z.infer<typeof ExtractedPublicationSchema>;

/**
 * Ein extrahierter Redakteur/Kontakt
 */
export const ExtractedContactSchema = z.object({
  name: z.string().nullish().describe('Vollständiger Name'),
  firstName: z.string().nullish().describe('Vorname'),
  lastName: z.string().nullish().describe('Nachname'),
  position: z.string().nullish().describe('Position/Rolle'),
  department: z.string().nullish().describe('Abteilung/Ressort'),
  email: z.string().nullish().describe('E-Mail-Adresse'),
  phone: z.string().nullish().describe('Telefonnummer'),
  beats: z.array(z.string()).nullish().describe('Themengebiete'),
  publications: z.array(z.string()).nullish().describe('Zugehörige Publikationen'),
  isEditor: z.boolean().nullish().describe('Ist Chefredakteur/Leitung'),
});
export type ExtractedContact = z.infer<typeof ExtractedContactSchema>;

/**
 * Extrahierte Verlagsinformationen
 */
export const ExtractedPublisherInfoSchema = z.object({
  name: z.string().nullish().describe('Verlagsname'),
  officialName: z.string().nullish().describe('Offizieller Firmenname'),
  legalForm: z.string().nullish().describe('Rechtsform (GmbH, etc.)'),
  address: z.object({
    street: z.string().nullish(),
    postalCode: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
  }).nullish().describe('Adresse'),
  phone: z.string().nullish().describe('Telefon'),
  fax: z.string().nullish().describe('Fax'),
  email: z.string().nullish().describe('E-Mail'),
  website: z.string().nullish().describe('Website'),
  description: z.string().nullish().describe('Beschreibung des Verlags'),
  foundedYear: z.number().nullish().describe('Gründungsjahr'),
  parentCompany: z.string().nullish().describe('Muttergesellschaft'),
});
export type ExtractedPublisherInfo = z.infer<typeof ExtractedPublisherInfoSchema>;

/**
 * Output des Web Scrapers
 */
export const WebScraperOutputSchema = z.object({
  /** Ist dieses Unternehmen tatsächlich ein Medienunternehmen? */
  isMediaCompany: z.boolean().describe('Ist das Unternehmen ein echtes Medienunternehmen (Verlag, Zeitung, Radio, etc.)'),
  /** Konfidenz der Medien-Klassifizierung (0-100) */
  mediaConfidence: z.number().min(0).max(100).describe('Konfidenz dass es ein Medienunternehmen ist (0-100%)'),
  /** Begründung für die Klassifizierung */
  mediaClassificationReason: z.string().optional().describe('Begründung für isMediaCompany Entscheidung'),
  publisherInfo: ExtractedPublisherInfoSchema.optional().describe('Verlagsinformationen'),
  publications: z.array(ExtractedPublicationSchema).describe('Gefundene Publikationen'),
  contacts: z.array(ExtractedContactSchema).describe('Gefundene Kontakte'),
  scrapedUrls: z.array(z.string()).describe('Durchsuchte URLs'),
  success: z.boolean().describe('War das Scraping erfolgreich'),
  errors: z.array(z.string()).optional().describe('Aufgetretene Fehler'),
  cost: z.object({
    jinaRequests: z.number(),
    llmTokensUsed: z.number(),
    estimatedCostUSD: z.number(),
  }).describe('Kosten'),
});
export type WebScraperOutput = z.infer<typeof WebScraperOutputSchema>;

// ══════════════════════════════════════════════════════════════
// CRM IMPORT SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Input für CRM Import
 */
export const CrmImportInputSchema = z.object({
  /** Organisation ID */
  organizationId: z.string().describe('Firebase Organization ID'),
  /** User ID für createdBy */
  userId: z.string().describe('User ID für Audit'),
  /** Tag Name der erstellt/verwendet wird */
  tagName: z.string().describe('Tag für alle Einträge (z.B. "GCRL")'),
  /** Zu importierende Publisher-Daten */
  publishers: z.array(z.object({
    publisherInfo: ExtractedPublisherInfoSchema,
    publications: z.array(ExtractedPublicationSchema),
    contacts: z.array(ExtractedContactSchema),
    sourceUrl: z.string().optional(),
    placeId: z.string().optional(),
    /** Fallback-Name falls publisherInfo.name null ist (z.B. aus Google Places) */
    fallbackName: z.string().optional(),
  })).describe('Publisher mit Publikationen und Kontakten'),
});
export type CrmImportInput = z.infer<typeof CrmImportInputSchema>;

/**
 * Output des CRM Imports
 */
export const CrmImportOutputSchema = z.object({
  tagId: z.string().describe('ID des verwendeten Tags'),
  companies: z.object({
    created: z.number(),
    updated: z.number(),
    skipped: z.number(),
    ids: z.array(z.string()),
  }).describe('Importierte Companies'),
  publications: z.object({
    created: z.number(),
    updated: z.number(),
    skipped: z.number(),
    ids: z.array(z.string()),
  }).describe('Importierte Publications'),
  contacts: z.object({
    created: z.number(),
    updated: z.number(),
    skipped: z.number(),
    ids: z.array(z.string()),
  }).describe('Importierte Kontakte'),
  errors: z.array(z.object({
    type: z.enum(['company', 'contact', 'tag', 'publication']),
    name: z.string(),
    error: z.string(),
  })).describe('Aufgetretene Fehler'),
});
export type CrmImportOutput = z.infer<typeof CrmImportOutputSchema>;

// ══════════════════════════════════════════════════════════════
// HAUPT-FLOW SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Input für den Haupt-Medien-Recherche-Flow
 */
export const MediaResearchInputSchema = z.object({
  /** Regionsname */
  region: z.string().describe('Name der Region (z.B. "Rehburg-Loccum")'),
  /** Zentrum der Suche */
  center: CoordinatesSchema,
  /** Suchradius in Kilometern */
  radiusKm: z.number().min(1).max(100).default(50).describe('Suchradius in km'),
  /** Zusätzliche Suchzentren (z.B. Hannover für größere Medien) */
  additionalCenters: z.array(z.object({
    name: z.string().describe('Name des Zentrums'),
    center: CoordinatesSchema,
    radiusKm: z.number().min(1).max(100).describe('Suchradius'),
  })).optional().describe('Zusätzliche Suchzentren'),
  /** Firebase Organization ID */
  organizationId: z.string().describe('Firebase Organization ID'),
  /** User ID für createdBy */
  userId: z.string().describe('User ID für Audit'),
  /** Tag Name für alle Ergebnisse */
  tagName: z.string().describe('Tag für alle Einträge (z.B. "GCRL")'),
  /** Optionale zusätzliche Suchbegriffe */
  additionalSearchTerms: z.array(z.string()).optional().describe('Zusätzliche Suchbegriffe'),
  /** Ob CRM-Import durchgeführt werden soll */
  importToCrm: z.boolean().default(true).describe('In CRM importieren'),
  /** Ob bestehende aktualisiert werden sollen */
  updateExisting: z.boolean().default(false).describe('Bestehende Einträge aktualisieren'),
});
export type MediaResearchInput = z.infer<typeof MediaResearchInputSchema>;

/**
 * Output des Haupt-Flows
 */
export const MediaResearchOutputSchema = z.object({
  /** Zusammenfassung */
  summary: z.object({
    region: z.string(),
    publishersFound: z.number(),
    publicationsFound: z.number(),
    contactsFound: z.number(),
    companiesCreated: z.number(),
    contactsCreated: z.number(),
  }).describe('Zusammenfassung'),
  /** Detaillierte Ergebnisse */
  results: z.array(z.object({
    publisherName: z.string(),
    website: z.string().optional(),
    publicationsCount: z.number(),
    contactsCount: z.number(),
    status: z.enum(['success', 'partial', 'failed']),
    errors: z.array(z.string()).optional(),
  })).describe('Ergebnisse pro Publisher'),
  /** CRM Import Ergebnis (falls durchgeführt) */
  crmImport: CrmImportOutputSchema.optional().describe('CRM Import Ergebnis'),
  /** Kosten */
  costs: z.object({
    googlePlaces: z.number(),
    jina: z.number(),
    gemini: z.number(),
    total: z.number(),
  }).describe('Geschätzte Kosten in USD'),
  /** Dauer in Sekunden */
  durationSeconds: z.number().describe('Gesamtdauer'),
  /** Fehler die auftraten aber nicht zum Abbruch führten */
  warnings: z.array(z.string()).describe('Warnungen'),
});
export type MediaResearchOutput = z.infer<typeof MediaResearchOutputSchema>;
