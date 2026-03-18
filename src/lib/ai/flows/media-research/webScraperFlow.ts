// src/lib/ai/flows/media-research/webScraperFlow.ts
// Genkit Flow für Website-Scraping mit Jina AI Reader und LLM-Extraktion

import { ai, gemini25FlashModel } from '../../genkit-config';
import {
  WebScraperInputSchema,
  WebScraperOutputSchema,
  ExtractedPublisherInfoSchema,
  ExtractedPublicationSchema,
  ExtractedContactSchema,
  type WebScraperInput,
  type WebScraperOutput,
  type ExtractedPublisherInfo,
  type ExtractedPublication,
  type ExtractedContact,
} from '../../schemas/media-research-schemas';
import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// KONSTANTEN
// ══════════════════════════════════════════════════════════════

/**
 * Jina AI Reader Base URL (kostenlos, kein API-Key nötig)
 */
const JINA_READER_BASE = 'https://r.jina.ai/';

/**
 * Subpages die nach Kontaktdaten und Mediadaten durchsucht werden
 */
const CONTACT_SUBPAGES = [
  '/impressum',
  '/kontakt',
  '/contact',
  '/ueber-uns',
  '/about',
  '/redaktion',
  '/team',
  '/ansprechpartner',
  // Mediadaten-Seiten für Auflage/PageViews
  '/mediadaten',
  '/media',
  '/werbung',
  '/werben',
  '/anzeigen',
  '/advertise',
];

/**
 * Max Tokens pro Seite für LLM
 */
const MAX_CONTENT_CHARS = 50000;

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Scrapt eine Seite mit Jina AI Reader (kostenlos)
 */
async function scrapeWithJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = `${JINA_READER_BASE}${url}`;
    console.log('[WebScraper] Jina Request:', jinaUrl);

    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
      },
    });

    if (!response.ok) {
      console.warn('[WebScraper] Jina Error:', response.status, url);
      return null;
    }

    const content = await response.text();

    // Länge begrenzen
    if (content.length > MAX_CONTENT_CHARS) {
      return content.substring(0, MAX_CONTENT_CHARS) + '\n\n[... Content gekürzt ...]';
    }

    return content;
  } catch (error) {
    console.error('[WebScraper] Jina Fetch Error:', error);
    return null;
  }
}

/**
 * Findet mögliche Subpage-URLs auf einer Website
 */
function findSubpageUrls(baseUrl: string, content: string): string[] {
  const urls: string[] = [];
  const baseUrlObj = new URL(baseUrl);
  const baseDomain = baseUrlObj.origin;

  for (const subpage of CONTACT_SUBPAGES) {
    const fullUrl = `${baseDomain}${subpage}`;
    // Prüfe ob Link im Content erwähnt wird (vereinfacht)
    if (content.toLowerCase().includes(subpage.replace('/', ''))) {
      urls.push(fullUrl);
    } else {
      // Füge trotzdem hinzu, wird dann beim Fetch geprüft
      urls.push(fullUrl);
    }
  }

  return urls;
}

// ══════════════════════════════════════════════════════════════
// LLM EXTRACTION PROMPTS
// ══════════════════════════════════════════════════════════════

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein Experte für die Extraktion strukturierter Daten aus Websiten-Inhalten.
Deine Aufgabe ist es, ZUERST zu prüfen ob es ein echtes Medienunternehmen ist, und DANN Informationen zu extrahieren.

SCHRITT 1 - MEDIEN-KLASSIFIZIERUNG (KRITISCH):
Bestimme ZUERST ob das Unternehmen ein echtes Medienunternehmen ist.

ECHTE MEDIENUNTERNEHMEN sind:
✓ Zeitungsverlage, Zeitschriftenverlage
✓ Radiosender, TV-Sender
✓ Online-Nachrichtenportale
✓ Medienhäuser, Redaktionen
✓ Buchverlage mit Nachrichtenbereich
✓ Presseagenturen

KEINE MEDIENUNTERNEHMEN sind:
✗ Bäckereien, Metzgereien, Fleischereien
✗ Supermärkte, Einzelhandel (REWE, Edeka, etc.)
✗ Restaurants, Dönerläden, Grillhäuser
✗ Landwirtschaft, Agrar, Milchwirtschaft
✗ Versicherungen, Banken
✗ Sportvereine, Golfclubs
✗ Kirchen, Klöster, religiöse Einrichtungen
✗ Schulen, Kinderheime, Pflegeeinrichtungen
✗ Behörden, Stadtverwaltungen, Polizei
✗ Zoos, Tierparks, Freizeiteinrichtungen
✗ Werbetechnik, Druckereien (außer Zeitungsdruckereien)
✗ IT-Unternehmen, Softwarefirmen
✗ Post, Logistik, Kurierdienste
✗ Immobilien, Makler

SCHRITT 2 - EXTRAKTION (nur wenn isMediaCompany = true):
- Extrahiere NUR Informationen die explizit im Text vorhanden sind
- Erfinde KEINE Informationen
- Bei Unsicherheit: lieber weglassen als raten
- E-Mail-Adressen und Telefonnummern müssen exakt übernommen werden

Antworte IMMER mit validem JSON im angegebenen Format.`;

const EXTRACTION_USER_PROMPT = (companyName: string, content: string) => `
Analysiere den folgenden Website-Content von "${companyName}".

SCHRITT 1: Ist dies ein echtes MEDIENUNTERNEHMEN?
Prüfe anhand des Contents ob es ein Verlag, Zeitung, Radiosender, Online-Nachrichtenportal ist.
Setze "isMediaCompany": false wenn es sich um Bäckerei, Supermarkt, Restaurant, Landwirtschaft, Versicherung, Sportverein, Kirche, Behörde, etc. handelt.

SCHRITT 2: Nur wenn isMediaCompany=true, extrahiere:
1. PUBLISHER INFO: Verlagsinformationen
2. PUBLICATIONS: Publikationen/Zeitungen/Magazine
3. CONTACTS: Redakteure und Ansprechpartner

WICHTIG FÜR KONTAKTE:
- Suche AKTIV nach E-Mail-Adressen im GESAMTEN Content!
- E-Mail-Formate: vorname.nachname@domain.de, v.nachname@domain.de, redaktion@domain.de
- Suche nach Telefon-Durchwahlen (oft mit -Nummern wie 05021 966-123)
- Prüfe BESONDERS: Impressum, Kontaktseite, Team-Seite, Redaktionsseite
- Wenn du eine E-Mail wie "m.mueller@zeitung.de" findest, ordne sie "Max Müller" zu
- Auch allgemeine Redaktions-E-Mails (redaktion@, info@) sind wertvoll als Fallback

WICHTIG FÜR PUBLIKATIONEN:
- Jede Publikation braucht eine Website-URL (meist die Hauptdomain oder Subdomain)
- PRINT-Metriken: Suche nach "Auflage", "verkaufte Auflage", "IVW", "verbreitete Auflage"
- ONLINE-Metriken: Suche nach "Page Views", "Visits", "Unique Visitors", "Reichweite"
- Diese Zahlen stehen oft in: Media-Daten, Über uns, Werbung/Anzeigen-Seiten

WEBSITE CONTENT:
${content}

Antworte mit diesem JSON-Format:
{
  "isMediaCompany": true/false,
  "mediaConfidence": 0-100,
  "mediaClassificationReason": "Kurze Begründung warum Medienunternehmen oder nicht",
  "publisherInfo": {
    "name": "...",
    "officialName": "...",
    "legalForm": "...",
    "address": { "street": "...", "postalCode": "...", "city": "...", "country": "DE" },
    "phone": "...",
    "email": "...",
    "website": "...",
    "description": "..."
  },
  "publications": [
    {
      "name": "Name der Zeitung/Zeitschrift",
      "type": "daily|weekly|monthly|online|magazine|special|other",
      "frequency": "täglich/wöchentlich/monatlich/etc.",
      "distribution": "Verbreitungsgebiet (z.B. Region Schaumburg)",
      "topics": ["Politik", "Sport", "Lokales"],
      "website": "https://www.publikation-url.de (WICHTIG: URL der Publikation!)",
      "circulation": 25000,
      "monthlyPageViews": 500000,
      "monthlyUniqueVisitors": 150000
    }
  ],
  "contacts": [
    {
      "name": "Vollständiger Name",
      "firstName": "...",
      "lastName": "...",
      "position": "...",
      "department": "...",
      "email": "vorname.nachname@domain.de (WICHTIG: Echte E-Mail aus Content!)",
      "phone": "+49 xxx yyy (WICHTIG: Echte Nummer aus Content!)",
      "beats": ["Themengebiet1", "Themengebiet2"],
      "isEditor": true/false
    }
  ]
}

WICHTIG: Bei isMediaCompany=false können publisherInfo, publications und contacts leer sein.`;

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * webScraperFlow
 *
 * Scrapt eine Verlagswebsite und extrahiert strukturierte Daten
 * über Jina AI Reader (kostenlos) und Gemini Flash für die Analyse.
 */
export const webScraperFlow = ai.defineFlow(
  {
    name: 'webScraperFlow',
    inputSchema: WebScraperInputSchema,
    outputSchema: WebScraperOutputSchema,
  },
  async (input: WebScraperInput): Promise<WebScraperOutput> => {
    console.log('[WebScraper] Start für:', input.companyName, '-', input.websiteUrl);

    const scrapedUrls: string[] = [];
    const errors: string[] = [];
    let jinaRequests = 0;
    let llmTokensUsed = 0;

    // 1. Hauptseite scrapen
    const mainContent = await scrapeWithJina(input.websiteUrl);
    jinaRequests++;

    if (!mainContent) {
      return {
        publisherInfo: undefined,
        publications: [],
        contacts: [],
        scrapedUrls: [],
        success: false,
        errors: [`Konnte ${input.websiteUrl} nicht laden`],
        cost: {
          jinaRequests,
          llmTokensUsed: 0,
          estimatedCostUSD: 0,
        },
      };
    }

    scrapedUrls.push(input.websiteUrl);

    // 2. Subpages für Kontaktdaten suchen und scrapen
    const subpageUrls = findSubpageUrls(input.websiteUrl, mainContent);
    const allContent: string[] = [mainContent];

    for (const subUrl of subpageUrls.slice(0, 3)) { // Max 3 Subpages
      try {
        const subContent = await scrapeWithJina(subUrl);
        jinaRequests++;

        if (subContent && subContent.length > 500) { // Mindestinhalt
          allContent.push(`\n\n--- PAGE: ${subUrl} ---\n\n${subContent}`);
          scrapedUrls.push(subUrl);
        }
      } catch (error) {
        // Subpage nicht verfügbar - OK
      }

      // Rate Limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 3. Kombinierter Content für LLM
    const combinedContent = allContent.join('\n\n');
    const truncatedContent = combinedContent.length > MAX_CONTENT_CHARS
      ? combinedContent.substring(0, MAX_CONTENT_CHARS) + '\n\n[... Content gekürzt ...]'
      : combinedContent;

    console.log('[WebScraper] Content-Länge:', truncatedContent.length, 'Zeichen');

    // 4. LLM-Extraktion mit Gemini Flash
    let isMediaCompany = false;
    let mediaConfidence = 0;
    let mediaClassificationReason: string | undefined;
    let publisherInfo: ExtractedPublisherInfo | undefined;
    let publications: ExtractedPublication[] = [];
    let contacts: ExtractedContact[] = [];

    try {
      const response = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: EXTRACTION_SYSTEM_PROMPT },
          { text: EXTRACTION_USER_PROMPT(input.companyName, truncatedContent) },
        ],
        config: {
          temperature: 0.1, // Niedrig für konsistente Extraktion
          maxOutputTokens: 8192,
        },
      });

      const responseText = response.message?.content?.[0]?.text || response.text || '';
      llmTokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

      console.log('[WebScraper] LLM Response Länge:', responseText.length);

      // JSON aus Response extrahieren
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);

          // 1. Medien-Klassifizierung extrahieren (WICHTIG!)
          isMediaCompany = extracted.isMediaCompany === true;
          mediaConfidence = typeof extracted.mediaConfidence === 'number' ? extracted.mediaConfidence : 0;
          mediaClassificationReason = extracted.mediaClassificationReason;

          console.log('[WebScraper] Medien-Klassifizierung:', {
            company: input.companyName,
            isMediaCompany,
            mediaConfidence,
            reason: mediaClassificationReason,
          });

          // 2. Nur bei echten Medienunternehmen weitere Daten extrahieren
          if (isMediaCompany && extracted.publisherInfo) {
            const extractedPublisher = extracted.publisherInfo as ExtractedPublisherInfo;

            // Website von Input übernehmen falls nicht extrahiert
            if (!extractedPublisher.website) {
              extractedPublisher.website = input.websiteUrl;
            }

            // Bekannte Infos ergänzen
            if (input.knownInfo?.phone && !extractedPublisher.phone) {
              extractedPublisher.phone = input.knownInfo.phone;
            }
            if (input.knownInfo?.city && !extractedPublisher.address?.city) {
              extractedPublisher.address = {
                ...extractedPublisher.address,
                city: input.knownInfo.city,
              };
            }

            publisherInfo = extractedPublisher;
          }

          if (isMediaCompany && Array.isArray(extracted.publications)) {
            publications = extracted.publications.filter((p: any) => p.name);
          }

          if (isMediaCompany && Array.isArray(extracted.contacts)) {
            contacts = extracted.contacts
              .filter((c: any) => c.name)
              .map((c: any) => ({
                ...c,
                // Vor- und Nachname splitten wenn nicht vorhanden
                firstName: c.firstName || c.name?.split(' ')[0],
                lastName: c.lastName || c.name?.split(' ').slice(1).join(' '),
              }));
          }

          console.log('[WebScraper] Extrahiert:', {
            isMediaCompany,
            hasPublisher: !!publisherInfo,
            publications: publications.length,
            contacts: contacts.length,
            contactsWithEmail: contacts.filter(c => c.email).length,
            contactsWithPhone: contacts.filter(c => c.phone).length,
          });
        } catch (parseError) {
          errors.push(`JSON Parse Error: ${parseError}`);
          console.error('[WebScraper] JSON Parse Error:', parseError);
        }
      } else {
        errors.push('Kein JSON in LLM-Antwort gefunden');
      }
    } catch (llmError) {
      errors.push(`LLM Error: ${llmError}`);
      console.error('[WebScraper] LLM Error:', llmError);
    }

    // 5. Fallback: NUR bei Medienunternehmen Basis-Info erstellen
    // Bei Nicht-Medien: publisherInfo bleibt undefined!
    if (isMediaCompany && !publisherInfo) {
      publisherInfo = {
        name: input.companyName,
        website: input.websiteUrl,
        phone: input.knownInfo?.phone,
        address: input.knownInfo?.city ? { city: input.knownInfo.city } : undefined,
      };
    }

    // Kosten berechnen (Gemini 2.5 Flash: $0.075/1M input, $0.30/1M output)
    const estimatedCostUSD = (llmTokensUsed / 1_000_000) * 0.15; // Durchschnitt

    return {
      isMediaCompany,
      mediaConfidence,
      mediaClassificationReason,
      publisherInfo,
      publications,
      contacts,
      scrapedUrls,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      cost: {
        jinaRequests,
        llmTokensUsed,
        estimatedCostUSD,
      },
    };
  }
);
