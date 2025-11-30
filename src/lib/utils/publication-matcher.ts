// src/lib/utils/publication-matcher.ts
import { Contact, Company, Publication as CRMPublication } from '@/types/crm';
import { Publication as LibraryPublication } from '@/types/library';
import { contactsService, companiesService } from '@/lib/firebase/crm-service';
import { publicationService } from '@/lib/firebase/library-service';

export interface MatchedPublication {
  name: string;
  id?: string;
  type: 'print' | 'online' | 'broadcast' | 'audio';
  reach?: number;
  circulation?: number;
  format?: 'print' | 'online' | 'both' | 'broadcast' | 'audio';
  source: 'library' | 'company' | 'crm' | 'manual';
  focusAreas?: string[];
}

export interface PublicationLookupResult {
  contact: Contact | null;
  company: Company | null;
  publications: MatchedPublication[];
}

/**
 * Extrahiert die Reichweite aus einer Library-Publication
 *
 * Prioritäten:
 * 1. Print: circulation (Auflage)
 * 2. Online: monthlyPageViews (von Verlagen kommuniziert)
 * 3. Online Fallback: monthlyUniqueVisitors
 * 4. Broadcast: viewership
 * 5. Audio: monthlyDownloads (primär) oder monthlyListeners (Fallback)
 */
export function getReachFromLibraryPublication(pub: LibraryPublication): number | undefined {
  // Print: Auflage als Reichweite
  if (pub.metrics?.print?.circulation) {
    return pub.metrics.print.circulation;
  }

  // Online: Page Views als Reichweite (Standard, da von Verlagen kommuniziert)
  if (pub.metrics?.online?.monthlyPageViews) {
    return pub.metrics.online.monthlyPageViews;
  }

  // Online Fallback: Unique Visitors falls Page Views nicht verfügbar
  if (pub.metrics?.online?.monthlyUniqueVisitors) {
    return pub.metrics.online.monthlyUniqueVisitors;
  }

  // Broadcast: Viewership/Listeners
  if (pub.metrics?.broadcast?.viewership) {
    return pub.metrics.broadcast.viewership;
  }

  // Audio: Downloads (primär) oder Listeners (Fallback)
  if (pub.metrics?.audio?.monthlyDownloads) {
    return pub.metrics.audio.monthlyDownloads;
  }

  if (pub.metrics?.audio?.monthlyListeners) {
    return pub.metrics.audio.monthlyListeners;
  }

  return undefined;
}

/**
 * Intelligente Publication Lookup basierend auf Email-Adresse
 *
 * Lädt Publications aus der Library (nicht mehr aus CRM Company.mediaInfo.publications)
 */
export async function handleRecipientLookup(
  recipientEmail: string,
  organizationId: string
): Promise<PublicationLookupResult> {
  try {
    // 1. Kontakt via Email suchen
    const contact = await contactsService.findByEmail(recipientEmail, organizationId);

    if (!contact) {
      return {
        contact: null,
        company: null,
        publications: []
      };
    }

    // 2. Medienhaus/Verlag des Kontakts laden
    const company = contact.companyId
      ? await companiesService.getById(contact.companyId)
      : null;

    // 3. Publikationen sammeln
    const matchedPublications: MatchedPublication[] = [];

    // 3a. Wenn Company ein Publisher/Medienhaus ist: Library-Publications laden
    if (company?.id) {
      try {
        const libraryPubs = await publicationService.getByPublisherId(company.id, organizationId);

        for (const libPub of libraryPubs) {
          const reach = getReachFromLibraryPublication(libPub);
          const circulation = libPub.metrics?.print?.circulation;

          matchedPublications.push({
            name: libPub.title,
            id: libPub.id,
            type: mapPublicationTypeToMonitoring(libPub.type, libPub.format),
            reach,
            circulation,
            format: libPub.format,
            source: 'library',
            focusAreas: libPub.focusAreas
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Library-Publications:', error);
      }
    }

    // 3b. FALLBACK: Legacy CRM Company.mediaInfo.publications (deprecated)
    if (matchedPublications.length === 0) {
      // Versuche aus Contact.mediaInfo.publications
      if (contact.mediaInfo?.publications && contact.mediaInfo.publications.length > 0) {
        for (const pubName of contact.mediaInfo.publications) {
          let matched = false;

          if (company?.mediaInfo?.publications) {
            const companyPub = company.mediaInfo.publications.find(p =>
              p.name.toLowerCase() === pubName.toLowerCase() ||
              p.name.toLowerCase().includes(pubName.toLowerCase()) ||
              pubName.toLowerCase().includes(p.name.toLowerCase())
            );

            if (companyPub) {
              matchedPublications.push({
                name: companyPub.name,
                id: companyPub.id,
                type: mapPublicationTypeToMonitoring(companyPub.type, companyPub.format),
                reach: companyPub.reach,
                circulation: companyPub.circulation,
                format: companyPub.format,
                source: 'company',
                focusAreas: companyPub.focusAreas
              });
              matched = true;
            }
          }

          // Nur Name aus CRM verwenden
          if (!matched) {
            matchedPublications.push({
              name: pubName,
              type: 'online', // Default
              source: 'crm'
            });
          }
        }
      }

      // Oder aus Company.mediaInfo.publications direkt
      if (matchedPublications.length === 0 && company?.mediaInfo?.publications) {
        for (const pub of company.mediaInfo.publications) {
          matchedPublications.push({
            name: pub.name,
            id: pub.id,
            type: mapPublicationTypeToMonitoring(pub.type, pub.format),
            reach: pub.reach,
            circulation: pub.circulation,
            format: pub.format,
            source: 'company',
            focusAreas: pub.focusAreas
          });
        }
      }
    }

    return {
      contact,
      company,
      publications: matchedPublications
    };

  } catch (error) {
    console.error('Fehler bei handleRecipientLookup:', error);
    return {
      contact: null,
      company: null,
      publications: []
    };
  }
}

/**
 * Konvertiert Publication-Typen zu Monitoring-Typen (outletType)
 *
 * WICHTIG: Blog ist ein Type, kein Format → nutzt 'online' als outletType
 * WICHTIG: Podcast → 'audio' (nicht broadcast)
 */
export function mapPublicationTypeToMonitoring(
  libType: string,
  format?: 'print' | 'online' | 'both' | 'audio'
): 'print' | 'online' | 'broadcast' | 'audio' {
  // Podcast → audio (NEU)
  if (libType === 'podcast') return 'audio';

  // TV, Radio → broadcast
  if (libType === 'tv' || libType === 'radio') {
    return 'broadcast';
  }

  // Blog, Website, Newsletter → online
  if (libType === 'blog' || libType === 'website' || libType === 'newsletter') {
    return 'online';
  }

  // Newspaper, Magazine, Trade_Journal: Abhängig vom Format
  if (libType === 'newspaper' || libType === 'magazine' || libType === 'trade_journal') {
    if (format === 'print') return 'print';
    if (format === 'online') return 'online';
    if (format === 'both') return 'print'; // Default bei hybrid
    if (format === 'audio') return 'audio'; // Falls Magazine auch Audio haben
  }

  // Fallback
  return 'online';
}

/**
 * Ermittelt die Reichweite aus einer Publication
 */
export function getReachFromPublication(pub: MatchedPublication): number | undefined {
  // Priorität: reach > circulation * 10
  if (pub.reach) {
    return pub.reach;
  }

  if (pub.circulation) {
    // Schätzung: Reichweite = 10x Auflage (Branchenstandard)
    return pub.circulation * 10;
  }

  return undefined;
}

/**
 * Berechnet den geschätzten AVE (Advertising Value Equivalent)
 *
 * WICHTIG: Diese Funktion verwendet NICHT die AVE-Settings aus der Datenbank!
 * Sie wird nur für die Live-Vorschau im MarkPublishedModal verwendet.
 *
 * Für die echte AVE-Berechnung nach dem Speichern wird
 * aveSettingsService.calculateAVE() verwendet, welche die Settings lädt.
 *
 * @deprecated Diese Funktion sollte durch aveSettingsService.calculateAVE() ersetzt werden
 */
export function calculateAVE(
  reach: number,
  sentiment: 'positive' | 'neutral' | 'negative',
  outletType: 'print' | 'online' | 'broadcast' | 'blog' | 'audio'
): number {
  // FALLBACK-Faktoren für Live-Vorschau (sollten mit DEFAULT_AVE_SETTINGS übereinstimmen)
  let factor = 0;
  switch (outletType) {
    case 'print':
      factor = 0.003; // 3€ pro 1000 Reichweite
      break;
    case 'broadcast':
      factor = 0.005; // 5€ pro 1000 Reichweite
      break;
    case 'online':
      factor = 0.001; // 1€ pro 1000 Reichweite
      break;
    case 'blog':
      // DEPRECATED: blog sollte nicht mehr verwendet werden
      factor = 0.001; // Fallback: wie online
      break;
    case 'audio':
      factor = 0.002; // 2€ pro 1000 Reichweite
      break;
  }

  // Sentiment-Multiplikator (DEFAULT_AVE_SETTINGS)
  let sentimentMultiplier = 1;
  switch (sentiment) {
    case 'positive':
      sentimentMultiplier = 1.0;
      break;
    case 'neutral':
      sentimentMultiplier = 0.8;
      break;
    case 'negative':
      sentimentMultiplier = 0.5;
      break;
  }

  // AVE = Reichweite × Faktor × Sentiment-Multiplikator
  const ave = reach * factor * sentimentMultiplier;

  return Math.round(ave);
}