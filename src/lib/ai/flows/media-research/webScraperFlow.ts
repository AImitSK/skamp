// src/lib/ai/flows/media-research/webScraperFlow.ts
// Genkit Flow für Website-Scraping mit Jina AI Reader und LLM-Extraktion

import { ai, gemini25FlashModel } from '../../genkit-config';
import {
  WebScraperInputSchema,
  WebScraperOutputSchema,
  type WebScraperInput,
  type WebScraperOutput,
  type ExtractedPublisherInfo,
  type ExtractedPublication,
  type ExtractedContact,
  type SocialMediaLink,
} from '../../schemas/media-research-schemas';

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

AUCH KEINE PR-RELEVANTEN MEDIEN (ausschließen!):
✗ Fachverlage ohne Nachrichtenwert (Steuerrecht, Formulare, Schulbücher, Fachbücher)
✗ Marketing-Agenturen, SEO-Agenturen, Werbeagenturen
✗ Content-Marketing-Blogs, Unternehmensblogs
✗ Buchverlage ohne journalistische Inhalte (Kinderbücher, Romane, Fachliteratur)
✗ Newsletter-Services ohne eigene Redaktion
✗ Performance-Marketing, Growth-Hacking Blogs
✗ Religiöse Verlage (Bibeln, Predigten, religiöse Literatur)

NUR RELEVANT FÜR PR sind Medien mit:
✓ Aktuelle Nachrichten/Berichterstattung
✓ Journalistische Redaktion
✓ Regionale oder überregionale Reichweite
✓ Leserschaft die für PR-Meldungen relevant ist

SCHRITT 2 - EXTRAKTION (nur wenn isMediaCompany = true):
- Extrahiere NUR Informationen die explizit im Text vorhanden sind
- Erfinde KEINE Informationen
- Bei Unsicherheit: lieber weglassen als raten
- E-Mail-Adressen und Telefonnummern müssen exakt übernommen werden

SCHRITT 3 - NUR JOURNALISTEN EXTRAHIEREN (KRITISCH):
Bei Kontakten: Extrahiere NUR echte Journalisten/Redakteure!
✓ Chefredakteur, Redaktionsleiter
✓ Redakteur (auch: Lokalredakteur, Sportredakteur, etc.)
✓ Reporter, Journalist, Korrespondent
✓ Ressortleiter
✓ CvD (Chef vom Dienst)
✓ Volontär

KEINE Journalisten (NICHT extrahieren):
✗ Geschäftsführer, CEO, Vorstand (außer gleichzeitig Chefredakteur)
✗ Marketing, Vertrieb, Sales
✗ IT, Technik, Webmaster
✗ Buchhaltung, Personal, HR
✗ Anzeigenverkauf, Mediaberater
✗ Sekretariat, Empfang
✗ Fahrer, Zusteller

Wenn KEINE Journalisten gefunden werden: Erstelle einen Funktionskontakt mit redaktion@, presse@ oder info@ E-Mail.

Antworte IMMER mit validem JSON im angegebenen Format.`;

const EXTRACTION_USER_PROMPT = (companyName: string, content: string, baseUrl: string) => `
Analysiere den folgenden Website-Content von "${companyName}".

SCHRITT 1: Ist dies ein echtes MEDIENUNTERNEHMEN?
Prüfe anhand des Contents ob es ein Verlag, Zeitung, Radiosender, Online-Nachrichtenportal ist.
Setze "isMediaCompany": false wenn es sich um Bäckerei, Supermarkt, Restaurant, Landwirtschaft, Versicherung, Sportverein, Kirche, Behörde, etc. handelt.

SCHRITT 2: Nur wenn isMediaCompany=true, extrahiere:
1. PUBLISHER INFO: Verlagsinformationen inkl. Social Media
2. PUBLICATIONS: Publikationen mit Website, Social Media, ISSN, Auflage, Page Views
3. CONTACTS: NUR echte Journalisten/Redakteure (siehe Regeln unten)!

═══════════════════════════════════════════════════════════════
KONTAKTE - NUR JOURNALISTEN MIT KONTAKTDATEN!
═══════════════════════════════════════════════════════════════
WICHTIG: Füge einen Kontakt NUR zur contacts-Liste hinzu, wenn du:
- Einen vollständigen Namen (Vor- UND Nachname) UND
- Eine E-Mail-Adresse ODER Telefonnummer findest!

Kontakte OHNE Email und OHNE Telefon werden NICHT importiert - ignoriere sie!

Extrahiere NUR Personen mit diesen Positionen:
✓ Chefredakteur, Redaktionsleiter, Stellv. Chefredakteur
✓ Redakteur (Sport-, Lokal-, Politik-, Kultur-, Wirtschaftsredakteur)
✓ Reporter, Journalist, Korrespondent
✓ Ressortleiter, CvD (Chef vom Dienst)
✓ Volontär, Freier Mitarbeiter (redaktionell)

NICHT extrahieren (IGNORIEREN):
✗ Geschäftsführer, Vorstand, CEO (außer = Chefredakteur)
✗ Marketing, Vertrieb, Anzeigenverkauf
✗ IT, Webmaster, Technik
✗ HR, Buchhaltung, Verwaltung
✗ Personen OHNE E-Mail UND OHNE Telefonnummer!

Für jeden Journalisten:
- Suche die persönliche E-Mail: vorname.nachname@domain.de
- Suche Durchwahl-Telefonnummern

═══════════════════════════════════════════════════════════════
FUNKTIONSKONTAKT (FALLBACK)
═══════════════════════════════════════════════════════════════
Wenn du KEINE Journalisten mit persönlicher E-Mail findest:
Erstelle einen "functionalContact" mit:
- contactType: "function"
- functionName: "Redaktion" oder "Newsdesk" oder "Pressestelle"
- email: redaktion@..., newsdesk@..., presse@..., oder info@...
- phone: Redaktions-Telefonnummer

═══════════════════════════════════════════════════════════════
PUBLIKATIONEN - VOLLSTÄNDIGE DATEN
═══════════════════════════════════════════════════════════════
Für jede Publikation extrahiere:
- website: URL der Publikation (PFLICHT! z.B. ${baseUrl})
- socialMedia: Facebook, Instagram, Twitter, YouTube Profile
- issn: ISSN-Nummer falls vorhanden
- circulation: Print-Auflage (Zahl, z.B. 25000)
- monthlyPageViews: Online Page Views (Zahl, z.B. 500000)
- monthlyUniqueVisitors: Unique Visitors (Zahl)

Suche nach: "Auflage", "IVW", "verkaufte Auflage", "Page Views", "Visits", "Reichweite"

═══════════════════════════════════════════════════════════════
SOCIAL MEDIA
═══════════════════════════════════════════════════════════════
Suche nach Social Media Links für Publisher UND Publikationen:
- Facebook: facebook.com/...
- Instagram: instagram.com/...
- Twitter/X: twitter.com/... oder x.com/...
- LinkedIn: linkedin.com/company/...
- YouTube: youtube.com/...
- TikTok: tiktok.com/@...

═══════════════════════════════════════════════════════════════
MEDIADATEN-PDF LINKS
═══════════════════════════════════════════════════════════════
Suche nach PDF-Links zu Mediadaten:
- Links mit "mediadaten", "media-daten", "mediadata" im URL
- Links zu .pdf Dateien auf /mediadaten, /media, /werbung Seiten

WEBSITE CONTENT:
${content}

Antworte mit diesem JSON-Format:
{
  "isMediaCompany": true/false,
  "mediaConfidence": 0-100,
  "mediaClassificationReason": "Kurze Begründung",
  "mediadataPdfUrls": ["https://...mediadaten.pdf"],
  "publisherInfo": {
    "name": "...",
    "officialName": "...",
    "legalForm": "GmbH/AG/etc.",
    "address": { "street": "...", "postalCode": "...", "city": "...", "country": "DE" },
    "phone": "...",
    "email": "...",
    "website": "${baseUrl}",
    "description": "...",
    "socialMedia": [
      { "platform": "facebook", "url": "https://facebook.com/...", "handle": "..." },
      { "platform": "instagram", "url": "https://instagram.com/...", "handle": "..." }
    ]
  },
  "publications": [
    {
      "name": "Name der Zeitung",
      "type": "daily|weekly|monthly|online|magazine|special|other",
      "frequency": "täglich/wöchentlich/etc.",
      "distribution": "Region/Verbreitungsgebiet",
      "topics": ["Politik", "Sport", "Lokales"],
      "website": "https://www.zeitung-url.de",
      "circulation": 25000,
      "monthlyPageViews": 500000,
      "monthlyUniqueVisitors": 150000,
      "issn": "1234-5678",
      "socialMedia": [
        { "platform": "facebook", "url": "...", "handle": "..." }
      ]
    }
  ],
  "contacts": [
    {
      "contactType": "person",
      "name": "Max Müller",
      "firstName": "Max",
      "lastName": "Müller",
      "position": "Sportredakteur",
      "department": "Sport",
      "email": "max.mueller@zeitung.de",
      "phone": "+49 5021 966-123",
      "beats": ["Sport", "Lokalsport"],
      "isEditor": false,
      "isJournalist": true
    }
  ],
  "functionalContact": {
    "contactType": "function",
    "functionName": "Redaktion",
    "name": "Redaktion Zeitung XY",
    "email": "redaktion@zeitung.de",
    "phone": "+49 5021 966-0",
    "isJournalist": false
  }
}

WICHTIG:
- Bei isMediaCompany=false: publisherInfo, publications, contacts leer lassen
- functionalContact NUR wenn keine Journalisten mit persönlicher E-Mail gefunden
- Jede Publication MUSS eine website haben!`;

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
        isMediaCompany: false,
        mediaConfidence: 0,
        mediaClassificationReason: 'Website konnte nicht geladen werden',
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

    for (const subUrl of subpageUrls.slice(0, 5)) { // Max 5 Subpages für mehr Kontaktdaten
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

      // Rate Limiting - 1.5 Sekunden zwischen Requests um 429 Errors zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 1500));
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
    let functionalContact: ExtractedContact | undefined;
    let mediadataPdfUrls: string[] = [];
    const internalNotesItems: string[] = [];

    // Base URL für Prompt extrahieren
    const baseUrlObj = new URL(input.websiteUrl);
    const baseUrl = baseUrlObj.origin;

    try {
      const response = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: EXTRACTION_SYSTEM_PROMPT },
          { text: EXTRACTION_USER_PROMPT(input.companyName, truncatedContent, baseUrl) },
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

          // 1. Medien-Klassifizierung extrahieren (KRITISCH!)
          isMediaCompany = extracted.isMediaCompany === true;
          mediaConfidence = typeof extracted.mediaConfidence === 'number' ? extracted.mediaConfidence : 0;
          mediaClassificationReason = extracted.mediaClassificationReason;

          console.log('[WebScraper] Medien-Klassifizierung:', {
            company: input.companyName,
            isMediaCompany,
            mediaConfidence,
            reason: mediaClassificationReason,
          });

          // 2. Mediadaten-PDF URLs extrahieren
          if (Array.isArray(extracted.mediadataPdfUrls)) {
            mediadataPdfUrls = extracted.mediadataPdfUrls.filter((url: string) => url && url.includes('.pdf'));
          }

          // 3. Nur bei echten Medienunternehmen weitere Daten extrahieren
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

          // 4. Publikationen mit Website-Fallback
          if (isMediaCompany && Array.isArray(extracted.publications)) {
            // Valide Publication-Types
            const validTypes = ['daily', 'weekly', 'monthly', 'online', 'magazine', 'special', 'other'] as const;

            publications = extracted.publications
              .filter((p: any) => p.name)
              .map((p: any) => {
                // Sanitize type: LLM gibt manchmal "daily|online" zurück
                let sanitizedType: typeof validTypes[number] | undefined = undefined;
                if (p.type) {
                  const typeStr = String(p.type).toLowerCase().split('|')[0].trim();
                  if (validTypes.includes(typeStr as any)) {
                    sanitizedType = typeStr as typeof validTypes[number];
                  }
                }

                // Website robust extrahieren (Fallback zu baseUrl)
                const pubWebsite = (p.website && p.website.trim() !== '') ? p.website.trim() : baseUrl;

                console.log('[WebScraper] Publication Website:', {
                  name: p.name,
                  originalWebsite: p.website,
                  finalWebsite: pubWebsite,
                });

                // Firestore-sicheres Objekt bauen (keine undefined Werte!)
                const publication: Record<string, unknown> = {
                  name: p.name,
                  website: pubWebsite,
                };
                // Nur definierte Werte hinzufügen
                if (sanitizedType) publication.type = sanitizedType;
                if (p.frequency) publication.frequency = p.frequency;
                if (p.distribution) publication.distribution = p.distribution;
                if (Array.isArray(p.topics) && p.topics.length > 0) publication.topics = p.topics;
                if (p.circulation) publication.circulation = p.circulation;
                if (p.monthlyPageViews) publication.monthlyPageViews = p.monthlyPageViews;
                if (p.monthlyUniqueVisitors) publication.monthlyUniqueVisitors = p.monthlyUniqueVisitors;
                if (Array.isArray(p.socialMedia) && p.socialMedia.length > 0) publication.socialMedia = p.socialMedia;
                if (p.issn) publication.issn = p.issn;
                if (p.ivwId) publication.ivwId = p.ivwId;
                return publication;
              });

            // Note wenn keine Publikation eine eigene Website hat
            const pubsWithoutWebsite = publications.filter(p => p.website === baseUrl);
            if (pubsWithoutWebsite.length > 0) {
              internalNotesItems.push(`${pubsWithoutWebsite.length} Publikation(en) ohne eigene Website - Basis-URL verwendet`);
            }
          }

          // 5. Kontakte - NUR Journalisten!
          if (isMediaCompany && Array.isArray(extracted.contacts)) {
            contacts = extracted.contacts
              .filter((c: any) => c.name && c.isJournalist !== false)
              .map((c: any) => ({
                ...c,
                contactType: 'person' as const,
                isJournalist: true,
                // Vor- und Nachname splitten wenn nicht vorhanden
                firstName: c.firstName || c.name?.split(' ')[0],
                lastName: c.lastName || c.name?.split(' ').slice(1).join(' '),
              }));

            // Statistik: Journalisten mit/ohne Email
            const journalistsWithEmail = contacts.filter(c => c.email);
            const journalistsWithPhone = contacts.filter(c => c.phone);

            if (contacts.length > 0 && journalistsWithEmail.length === 0) {
              internalNotesItems.push(`${contacts.length} Journalist(en) gefunden, aber keine mit persönlicher E-Mail`);
            }

            console.log('[WebScraper] Journalisten:', {
              total: contacts.length,
              withEmail: journalistsWithEmail.length,
              withPhone: journalistsWithPhone.length,
            });
          }

          // 6. Funktionskontakt als Fallback
          if (isMediaCompany && extracted.functionalContact) {
            const fc = extracted.functionalContact;
            if (fc.email || fc.phone) {
              functionalContact = {
                contactType: 'function',
                name: fc.name || fc.functionName || 'Redaktion',
                functionName: fc.functionName || 'Redaktion',
                email: fc.email,
                phone: fc.phone,
                isJournalist: false,
              };
              console.log('[WebScraper] Funktionskontakt:', functionalContact.name, functionalContact.email);
            }
          }

          // 7. Automatisch Funktionskontakt erstellen wenn keine Journalisten mit Email
          if (isMediaCompany && contacts.filter(c => c.email).length === 0 && !functionalContact) {
            // Suche nach redaktion@, presse@, info@ im Content
            const emailPatterns = [
              /redaktion@[\w.-]+\.\w+/gi,
              /newsdesk@[\w.-]+\.\w+/gi,
              /presse@[\w.-]+\.\w+/gi,
              /news@[\w.-]+\.\w+/gi,
              /info@[\w.-]+\.\w+/gi,
            ];

            for (const pattern of emailPatterns) {
              const match = truncatedContent.match(pattern);
              if (match) {
                functionalContact = {
                  contactType: 'function',
                  name: `Redaktion ${input.companyName}`,
                  functionName: 'Redaktion',
                  email: match[0].toLowerCase(),
                  isJournalist: false,
                };
                internalNotesItems.push(`Keine Journalisten-Emails gefunden - Funktionskontakt erstellt: ${match[0]}`);
                console.log('[WebScraper] Auto-Funktionskontakt:', match[0]);
                break;
              }
            }

            if (!functionalContact) {
              internalNotesItems.push('Keine Redakteurs-Emails und keine allgemeine Redaktions-Email gefunden');
            }
          }

          console.log('[WebScraper] Extrahiert:', {
            isMediaCompany,
            hasPublisher: !!publisherInfo,
            publications: publications.length,
            journalists: contacts.length,
            journalistsWithEmail: contacts.filter(c => c.email).length,
            hasFunctionalContact: !!functionalContact,
            mediadataPdfs: mediadataPdfUrls.length,
          });
        } catch (parseError) {
          errors.push(`JSON Parse Error: ${parseError}`);
          console.error('[WebScraper] JSON Parse Error:', parseError);
          internalNotesItems.push('LLM-Antwort konnte nicht geparst werden');
        }
      } else {
        errors.push('Kein JSON in LLM-Antwort gefunden');
        internalNotesItems.push('LLM hat kein valides JSON zurückgegeben');
      }
    } catch (llmError) {
      errors.push(`LLM Error: ${llmError}`);
      console.error('[WebScraper] LLM Error:', llmError);
      internalNotesItems.push(`LLM-Fehler: ${llmError}`);
    }

    // 8. Fallback: NUR bei Medienunternehmen Basis-Info erstellen
    if (isMediaCompany && !publisherInfo) {
      publisherInfo = {
        name: input.companyName,
        website: input.websiteUrl,
        phone: input.knownInfo?.phone,
        address: input.knownInfo?.city ? { city: input.knownInfo.city } : undefined,
      };
      internalNotesItems.push('Nur Basis-Verlagsinfo erstellt - keine detaillierten Daten auf Website gefunden');
    }

    // 9. Interne Notizen zusammenfassen
    const internalNotes = internalNotesItems.length > 0
      ? internalNotesItems.join('\n• ')
      : undefined;

    // Kosten berechnen (Gemini 2.5 Flash: $0.075/1M input, $0.30/1M output)
    const estimatedCostUSD = (llmTokensUsed / 1_000_000) * 0.15; // Durchschnitt

    return {
      isMediaCompany,
      mediaConfidence,
      mediaClassificationReason,
      publisherInfo,
      publications,
      contacts,
      functionalContact,
      scrapedUrls,
      mediadataPdfUrls: mediadataPdfUrls.length > 0 ? mediadataPdfUrls : undefined,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      internalNotes,
      cost: {
        jinaRequests,
        llmTokensUsed,
        estimatedCostUSD,
      },
    };
  }
);
