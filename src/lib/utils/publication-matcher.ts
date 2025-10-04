// src/lib/utils/publication-matcher.ts
import { Contact, Company, Publication } from '@/types/crm';
import { contactsService, companiesService } from '@/lib/firebase/crm-service';

export interface MatchedPublication {
  name: string;
  id?: string;
  type: 'print' | 'online' | 'broadcast' | 'blog';
  reach?: number;
  circulation?: number;
  format?: 'print' | 'online' | 'both';
  source: 'library' | 'company' | 'crm' | 'manual';
  focusAreas?: string[];
}

export interface PublicationLookupResult {
  contact: Contact | null;
  company: Company | null;
  publications: MatchedPublication[];
}

/**
 * Intelligente Publication Lookup basierend auf Email-Adresse
 */
export async function handleRecipientLookup(
  recipientEmail: string,
  organizationId: string
): Promise<PublicationLookupResult> {
  try {
    console.log('🔍 [publication-matcher] Suche Kontakt für Email:', recipientEmail);

    // 1. Kontakt via Email suchen
    const contact = await contactsService.findByEmail(recipientEmail, organizationId);
    console.log('👤 [publication-matcher] Kontakt gefunden:', contact ? `${contact.firstName} ${contact.lastName}` : 'NEIN');

    if (!contact) {
      console.log('⚠️ [publication-matcher] Kein Kontakt gefunden - return empty');
      return {
        contact: null,
        company: null,
        publications: []
      };
    }

    // 2. Medienhaus/Verlag des Kontakts laden
    console.log('🏢 [publication-matcher] Lade Company für companyId:', contact.companyId);
    const company = contact.companyId
      ? await companiesService.getById(contact.companyId)
      : null;
    console.log('🏢 [publication-matcher] Company gefunden:', company?.name || 'NEIN');

    // 3. Publikationen sammeln
    const matchedPublications: MatchedPublication[] = [];
    console.log('📚 [publication-matcher] Contact.mediaInfo.publications:', contact.mediaInfo?.publications);

    // 3a. Publikationen aus Contact.mediaInfo.publications (string[])
    if (contact.mediaInfo?.publications && contact.mediaInfo.publications.length > 0) {
      console.log('📖 [publication-matcher] Verarbeite', contact.mediaInfo.publications.length, 'Publikationen vom Kontakt');
      for (const pubName of contact.mediaInfo.publications) {
        console.log('  🔎 [publication-matcher] Suche Match für:', pubName);
        // Versuche, die Publikation in den Company-Publications zu finden
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

        // Fallback: Nur Name aus CRM verwenden
        if (!matched) {
          matchedPublications.push({
            name: pubName,
            type: 'online', // Default
            source: 'crm'
          });
        }
      }
    }

    // 3b. Falls keine Publikationen beim Kontakt: Alle Publikationen des Medienhauses anbieten
    if (matchedPublications.length === 0 && company?.mediaInfo?.publications) {
      console.log('📰 [publication-matcher] Keine Kontakt-Publikationen, nutze Company-Publikationen:', company.mediaInfo.publications.length);
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

    console.log('✅ [publication-matcher] Final result:', {
      contact: contact.firstName + ' ' + contact.lastName,
      company: company?.name,
      publicationsCount: matchedPublications.length,
      publications: matchedPublications
    });

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
 * Konvertiert Publication-Typen zu Monitoring-Typen
 */
export function mapPublicationTypeToMonitoring(
  libType: string,
  format?: 'print' | 'online' | 'both'
): 'print' | 'online' | 'broadcast' | 'blog' {
  // Blog bleibt Blog
  if (libType === 'blog') return 'blog';

  // TV, Radio, Podcast sind Broadcast
  if (libType === 'tv' || libType === 'radio' || libType === 'podcast') {
    return 'broadcast';
  }

  // Website und Newsletter sind Online
  if (libType === 'website' || libType === 'newsletter' || libType === 'online') {
    return 'online';
  }

  // Newspaper, Magazine, Trade_Journal: Abhängig vom Format
  if (libType === 'newspaper' || libType === 'magazine' || libType === 'trade_journal') {
    if (format === 'print') return 'print';
    if (format === 'online') return 'online';
    if (format === 'both') return 'print'; // Default bei hybrid
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
 */
export function calculateAVE(
  reach: number,
  sentiment: 'positive' | 'neutral' | 'negative',
  outletType: 'print' | 'online' | 'broadcast' | 'blog'
): number {
  // Basis-CPM (Cost per Mille) nach Medientyp
  let baseCPM = 0;
  switch (outletType) {
    case 'print':
      baseCPM = 35; // 35€ pro 1000 Leser
      break;
    case 'broadcast':
      baseCPM = 25; // 25€ pro 1000 Zuschauer/Hörer
      break;
    case 'online':
      baseCPM = 15; // 15€ pro 1000 Besucher
      break;
    case 'blog':
      baseCPM = 10; // 10€ pro 1000 Leser
      break;
  }

  // Sentiment-Multiplikator
  let sentimentMultiplier = 1;
  switch (sentiment) {
    case 'positive':
      sentimentMultiplier = 3; // 3x für positive Berichterstattung
      break;
    case 'neutral':
      sentimentMultiplier = 1.5; // 1.5x für neutrale Berichterstattung
      break;
    case 'negative':
      sentimentMultiplier = 0.5; // 0.5x für negative Berichterstattung
      break;
  }

  // AVE = (Reichweite / 1000) * CPM * Sentiment-Multiplikator
  const ave = (reach / 1000) * baseCPM * sentimentMultiplier;

  return Math.round(ave);
}