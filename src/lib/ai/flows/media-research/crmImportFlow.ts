// src/lib/ai/flows/media-research/crmImportFlow.ts
// Genkit Flow für den CRM-Import von Medien-Recherche-Ergebnissen

import { ai } from '../../genkit-config';
import {
  CrmImportInputSchema,
  CrmImportOutputSchema,
  type CrmImportInput,
  type CrmImportOutput,
  type ExtractedPublisherInfo,
  type ExtractedPublication,
  type ExtractedContact,
} from '../../schemas/media-research-schemas';

// Firebase Admin Imports (für Server-Side)
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface PublisherData {
  publisherInfo: ExtractedPublisherInfo;
  publications: ExtractedPublication[];
  contacts: ExtractedContact[];
  sourceUrl?: string;
  placeId?: string;
}

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Objekt ein Firestore FieldValue ist (z.B. serverTimestamp())
 */
function isFieldValue(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  // FieldValue hat eine spezielle interne Struktur
  return obj.constructor?.name?.includes('FieldValue') ||
         obj._methodName !== undefined || // Firebase Admin SDK FieldValue
         (typeof obj.isEqual === 'function' && typeof obj.toDate !== 'function');
}

/**
 * Entfernt undefined und null Werte rekursiv aus einem Objekt
 * Firestore akzeptiert keine undefined Werte
 * WICHTIG: Behält FieldValue Objekte (z.B. serverTimestamp()) bei!
 */
function removeNullish(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  // FieldValue Objekte (serverTimestamp, etc.) beibehalten
  if (isFieldValue(obj)) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map(item => removeNullish(item))
      .filter(item => item !== undefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = removeNullish(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    // Leere Objekte auch entfernen
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
}

/**
 * Erstellt oder findet ein Tag
 */
async function getOrCreateTag(
  organizationId: string,
  tagName: string
): Promise<string> {
  const tagsRef = adminDb.collection('tags');

  // Suche nach existierendem Tag
  const existingQuery = await tagsRef
    .where('organizationId', '==', organizationId)
    .where('name', '==', tagName)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    return existingQuery.docs[0].id;
  }

  // Tag erstellen
  const newTagRef = await tagsRef.add({
    name: tagName,
    color: 'cyan', // Medien-Farbe
    organizationId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('[CRMImport] Tag erstellt:', tagName, newTagRef.id);
  return newTagRef.id;
}

/**
 * Sucht nach existierender Company basierend auf Name oder Website
 */
async function findExistingCompany(
  organizationId: string,
  name: string,
  website?: string
): Promise<string | null> {
  const companiesRef = adminDb.collection('companies_enhanced');

  // Suche nach Website (präzisester Match)
  if (website) {
    const websiteQuery = await companiesRef
      .where('organizationId', '==', organizationId)
      .where('website', '==', website)
      .limit(1)
      .get();

    if (!websiteQuery.empty) {
      return websiteQuery.docs[0].id;
    }
  }

  // Suche nach Namen
  const nameQuery = await companiesRef
    .where('organizationId', '==', organizationId)
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!nameQuery.empty) {
    return nameQuery.docs[0].id;
  }

  return null;
}

/**
 * Sucht nach existierendem Contact basierend auf E-Mail oder Name+Company
 */
async function findExistingContact(
  organizationId: string,
  email?: string,
  name?: string,
  companyId?: string
): Promise<string | null> {
  const contactsRef = adminDb.collection('contacts_enhanced');

  // Suche nach E-Mail (präzisester Match)
  if (email) {
    const allContacts = await contactsRef
      .where('organizationId', '==', organizationId)
      .get();

    for (const doc of allContacts.docs) {
      const data = doc.data();
      const emails = data.emails || [];
      if (emails.some((e: any) => e.email === email)) {
        return doc.id;
      }
    }
  }

  // Suche nach Name + Company
  if (name && companyId) {
    const nameQuery = await contactsRef
      .where('organizationId', '==', organizationId)
      .where('displayName', '==', name)
      .where('companyId', '==', companyId)
      .limit(1)
      .get();

    if (!nameQuery.empty) {
      return nameQuery.docs[0].id;
    }
  }

  return null;
}

/**
 * Erstellt Company aus Publisher-Info
 */
async function createCompany(
  organizationId: string,
  userId: string,
  tagId: string,
  publisherInfo: ExtractedPublisherInfo,
  publications: ExtractedPublication[],
  sourceUrl?: string,
  placeId?: string,
  fallbackName?: string,
  internalNotes?: string
): Promise<string> {
  const companiesRef = adminDb.collection('companies_enhanced');

  // Name mit Fallback
  const companyName = publisherInfo.name || fallbackName || 'Unbekannter Verlag';

  // MediaInfo für Publisher erstellen - nur Publications mit Namen
  const validPublications = publications.filter(pub => pub.name);
  const mediaInfo: Record<string, any> = {
    publications: validPublications.map(pub => ({
      name: pub.name,
      type: pub.type || 'other',
      frequency: pub.frequency,
      distribution: pub.distribution,
      topics: pub.topics,
      circulation: pub.circulation,
      website: pub.website,
    })),
  };

  // Social Media aus PublisherInfo
  const socialMedia = publisherInfo.socialMedia?.map(sm => ({
    platform: sm.platform,
    url: sm.url,
    handle: sm.handle,
  }));

  const companyData: Record<string, any> = {
    // Pflichtfelder
    name: companyName,
    officialName: publisherInfo.officialName || companyName,
    type: 'publisher', // Typ: Verlag
    organizationId,

    // Kontaktdaten
    website: publisherInfo.website,
    phones: publisherInfo.phone ? [{
      type: 'general',
      number: publisherInfo.phone,
      isPrimary: true,
    }] : [],
    emails: publisherInfo.email ? [{
      type: 'general',
      email: publisherInfo.email,
      isPrimary: true,
    }] : [],

    // Social Media
    socialMedia,

    // Adresse
    mainAddress: publisherInfo.address ? {
      street: publisherInfo.address.street,
      postalCode: publisherInfo.address.postalCode,
      city: publisherInfo.address.city,
      countryCode: publisherInfo.address.country || 'DE',
    } : undefined,

    // Zusätzliche Infos
    legalForm: publisherInfo.legalForm,
    description: publisherInfo.description,
    foundedDate: publisherInfo.foundedYear ? new Date(publisherInfo.foundedYear, 0, 1) : undefined,

    // Interne Notizen (für Import-Probleme/Hinweise)
    internalNotes,

    // Medien-Info mit Publikationen
    mediaInfo,

    // Tags und Meta
    tagIds: [tagId],
    status: 'active',
    lifecycleStage: 'lead',

    // Import-Meta
    importSource: 'media-research-pipeline',
    importedAt: FieldValue.serverTimestamp(),
    externalIds: placeId ? [{ system: 'google_places', id: placeId }] : [],

    // Audit
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
    deletedAt: null,
    deletedBy: null,
  };

  // Entferne undefined/null-Werte rekursiv (Firestore akzeptiert keine undefined)
  const cleanedCompanyData = removeNullish(companyData);

  const docRef = await companiesRef.add(cleanedCompanyData);
  console.log('[CRMImport] Company erstellt:', companyName, docRef.id);

  return docRef.id;
}

/**
 * Mappt extrahierte Publication-Types auf Library-Types
 */
function mapPublicationType(type: string | null | undefined): string {
  const typeMap: Record<string, string> = {
    'daily': 'newspaper',
    'weekly': 'newspaper',
    'monthly': 'magazine',
    'online': 'website',
    'magazine': 'magazine',
    'special': 'magazine',
    'other': 'magazine',
  };
  return typeMap[type || 'other'] || 'magazine';
}

/**
 * Mappt extrahierte Frequency auf Library-Frequency
 */
function mapPublicationFrequency(frequency: string | null | undefined, type: string | null | undefined): string {
  if (frequency) {
    const freqLower = frequency.toLowerCase();
    if (freqLower.includes('täglich') || freqLower.includes('daily')) return 'daily';
    if (freqLower.includes('wöchentlich') || freqLower.includes('weekly')) return 'weekly';
    if (freqLower.includes('monatlich') || freqLower.includes('monthly')) return 'monthly';
    if (freqLower.includes('quartalsweise') || freqLower.includes('quarterly')) return 'quarterly';
  }
  // Default basierend auf Type
  if (type === 'daily') return 'daily';
  if (type === 'weekly') return 'weekly';
  if (type === 'online') return 'continuous';
  return 'irregular';
}

/**
 * Erstellt Publication als eigenständiges Dokument in der publications Collection
 */
async function createPublication(
  organizationId: string,
  userId: string,
  tagId: string,
  publication: ExtractedPublication,
  companyId: string,
  companyName: string
): Promise<string | null> {
  // Skip publications ohne Namen
  if (!publication.name) {
    console.log('[CRMImport] Skip Publication ohne Namen');
    return null;
  }

  const publicationsRef = adminDb.collection('publications');

  // Prüfe ob Publication bereits existiert (nach Name + Publisher)
  const existingQuery = await publicationsRef
    .where('organizationId', '==', organizationId)
    .where('publisherId', '==', companyId)
    .where('title', '==', publication.name)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    console.log('[CRMImport] Publication existiert bereits:', publication.name);
    return existingQuery.docs[0].id;
  }

  const pubType = mapPublicationType(publication.type);
  const pubFrequency = mapPublicationFrequency(publication.frequency, publication.type);

  // Social Media für Publication
  const socialMedia = publication.socialMedia?.map(sm => ({
    platform: sm.platform,
    url: sm.url,
    handle: sm.handle,
  }));

  // Identifikatoren (ISSN, IVW)
  const identifiers: Record<string, string>[] = [];
  if (publication.issn) {
    identifiers.push({ type: 'issn', value: publication.issn });
  }
  if (publication.ivwId) {
    identifiers.push({ type: 'ivw', value: publication.ivwId });
  }

  // DEBUG: Website-Wert prüfen
  console.log('[CRMImport] Publication Website Debug:', {
    name: publication.name,
    websiteFromPublication: publication.website,
    hasWebsite: !!publication.website,
  });

  // Geographic Scope aus Distribution ableiten
  const distribution = publication.distribution?.toLowerCase() || '';
  let geographicScope: 'local' | 'regional' | 'national' | 'international' = 'regional';
  if (distribution.includes('national') || distribution.includes('deutschland') || distribution.includes('bundesweit')) {
    geographicScope = 'national';
  } else if (distribution.includes('lokal') || distribution.includes('stadt')) {
    geographicScope = 'local';
  }

  // Social Media URLs für CRM-UI Format
  const socialMediaUrls = socialMedia?.map((sm: { platform: string; url: string }) => ({
    platform: sm.platform,
    url: sm.url,
  }));

  const publicationData: Record<string, any> = {
    // Grunddaten
    title: publication.name,
    organizationId,

    // Verknüpfung zum Verlag
    publisherId: companyId,
    publisherName: companyName,

    // Website der Publikation - BEIDE Felder setzen für Kompatibilität
    website: publication.website || null,
    websiteUrl: publication.website || null, // UI erwartet websiteUrl

    // Social Media - BEIDE Formate für Kompatibilität
    socialMedia,
    socialMediaUrls, // CRM-UI erwartet dieses Format

    // Identifikatoren (ISSN, IVW)
    identifiers: identifiers.length > 0 ? identifiers : undefined,

    // Klassifizierung
    type: pubType,
    format: publication.type === 'online' ? 'online' : 'both',

    // Geographic Scope
    geographicScope,

    // Metriken
    metrics: {
      frequency: pubFrequency,
      targetAudience: publication.distribution || undefined,
      // Print-Metriken
      ...(publication.circulation && {
        print: {
          circulation: publication.circulation,
          circulationType: 'printed',
        },
      }),
      // Online-Metriken
      ...(publication.monthlyPageViews && {
        online: {
          monthlyPageViews: publication.monthlyPageViews,
          monthlyUniqueVisitors: publication.monthlyUniqueVisitors,
        },
      }),
    },

    // Sprachen und Länder (Defaults für DE)
    languages: ['de'],
    geographicTargets: ['DE'],

    // Themen als focusAreas
    focusAreas: publication.topics || [],

    // Tags und Meta
    tagIds: [tagId],
    status: 'active',

    // Import-Meta
    importSource: 'media-research-pipeline',
    importedAt: FieldValue.serverTimestamp(),

    // Audit
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
    deletedAt: null,
    deletedBy: null,
  };

  // Entferne undefined/null-Werte rekursiv
  const cleanedData = removeNullish(publicationData);

  const docRef = await publicationsRef.add(cleanedData);
  console.log('[CRMImport] Publication erstellt:', publication.name, docRef.id);

  return docRef.id;
}

/**
 * Erstellt Contact aus extrahierten Kontakt-Daten
 * Unterstützt sowohl Personen (Journalisten) als auch Funktionskontakte (Redaktion)
 */
async function createContact(
  organizationId: string,
  userId: string,
  tagId: string,
  contact: ExtractedContact,
  companyId: string,
  companyName: string,
  publications: string[],
  internalNotes?: string
): Promise<string | null> {
  // Skip contacts ohne Namen
  if (!contact.name && !contact.functionName) {
    console.log('[CRMImport] Skip Contact ohne Namen');
    return null;
  }

  const contactsRef = adminDb.collection('contacts_enhanced');

  // Bestimme Kontakttyp
  const contactType = contact.contactType || 'person';
  const isFunctional = contactType === 'function';

  // Name-Handling unterschiedlich für Person vs Funktion
  let displayName: string;
  let nameObj: Record<string, string>;

  if (isFunctional) {
    // Funktionskontakt: z.B. "Redaktion Die Harke"
    displayName = contact.name || contact.functionName || 'Redaktion';
    nameObj = {
      firstName: contact.functionName || 'Redaktion',
      lastName: companyName,
    };
  } else {
    // Person: Normales Name-Splitting
    const nameParts = (contact.name || '').split(' ');
    displayName = contact.name || 'Unbekannt';
    nameObj = {
      firstName: contact.firstName || nameParts[0] || 'Unbekannt',
      lastName: contact.lastName || nameParts.slice(1).join(' ') || 'Unbekannt',
    };
  }

  const contactData: Record<string, any> = {
    // Pflichtfelder
    contactType,
    name: nameObj,
    displayName,
    organizationId,

    // Funktionsname (nur bei Funktionskontakten)
    functionName: isFunctional ? (contact.functionName || 'Redaktion') : undefined,

    // Firmenverknüpfung
    companyId,
    companyName,

    // Position (nur bei Personen relevant)
    position: isFunctional ? undefined : contact.position,
    department: contact.department,

    // Kontaktdaten
    emails: contact.email ? [{
      type: 'business',
      email: contact.email,
      isPrimary: true,
      isVerified: false,
    }] : [],
    phones: contact.phone ? [{
      type: 'work',
      number: contact.phone,
      isPrimary: true,
    }] : [],

    // Medien-Profil
    mediaProfile: {
      isJournalist: contact.isJournalist !== false && !isFunctional,
      publicationIds: publications,
      beats: contact.beats || [],
      mediaTypes: ['print', 'online'],
    },

    // Interne Notizen
    internalNotes,

    // Tags und Meta
    tagIds: [tagId],
    status: 'active',

    // Import-Meta
    importSource: 'media-research-pipeline',
    importedAt: FieldValue.serverTimestamp(),

    // Audit
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
    deletedAt: null,
    deletedBy: null,
  };

  // Entferne undefined/null-Werte rekursiv (Firestore akzeptiert keine undefined)
  const cleanedContactData = removeNullish(contactData);

  const docRef = await contactsRef.add(cleanedContactData);
  console.log('[CRMImport] Contact erstellt:', displayName, `(${contactType})`, docRef.id);

  return docRef.id;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * crmImportFlow
 *
 * Importiert extrahierte Medien-Daten ins CRM.
 * Erstellt Companies als Publisher mit Publikationen,
 * und Contacts als Journalisten mit mediaProfile.
 */
export const crmImportFlow = ai.defineFlow(
  {
    name: 'crmImportFlow',
    inputSchema: CrmImportInputSchema,
    outputSchema: CrmImportOutputSchema,
  },
  async (input: CrmImportInput): Promise<CrmImportOutput> => {
    console.log('[CRMImport] Start für', input.publishers.length, 'Publisher');

    const result: CrmImportOutput = {
      tagId: '',
      companies: {
        created: 0,
        updated: 0,
        skipped: 0,
        ids: [],
      },
      publications: {
        created: 0,
        updated: 0,
        skipped: 0,
        ids: [],
      },
      contacts: {
        created: 0,
        updated: 0,
        skipped: 0,
        ids: [],
      },
      errors: [],
    };

    try {
      // 1. Tag erstellen oder finden
      result.tagId = await getOrCreateTag(input.organizationId, input.tagName);
      console.log('[CRMImport] Tag ID:', result.tagId);

      // 2. Publisher verarbeiten
      for (const publisher of input.publishers) {
        try {
          // Prüfe auf existierende Company
          const publisherName = publisher.publisherInfo.name || publisher.fallbackName || 'Unbekannter Verlag';
          const existingCompanyId = await findExistingCompany(
            input.organizationId,
            publisherName,
            publisher.publisherInfo.website || undefined
          );

          let companyId: string;

          if (existingCompanyId) {
            // Company existiert bereits - überspringen oder updaten
            console.log('[CRMImport] Company existiert bereits:', publisher.publisherInfo.name);
            companyId = existingCompanyId;
            result.companies.skipped++;
            result.companies.ids.push(companyId);
          } else {
            // Neue Company erstellen (mit internalNotes)
            companyId = await createCompany(
              input.organizationId,
              input.userId,
              result.tagId,
              publisher.publisherInfo,
              publisher.publications,
              publisher.sourceUrl,
              publisher.placeId,
              publisher.fallbackName,
              publisher.internalNotes // NEU: Interne Notizen
            );
            result.companies.created++;
            result.companies.ids.push(companyId);
          }

          // 3. Publications für diese Company erstellen
          const companyNameForPub = publisher.publisherInfo.name || publisher.fallbackName || 'Unbekannt';
          const publicationIds: string[] = [];

          for (const publication of publisher.publications) {
            try {
              const pubId = await createPublication(
                input.organizationId,
                input.userId,
                result.tagId,
                publication,
                companyId,
                companyNameForPub
              );
              if (pubId) {
                publicationIds.push(pubId);
                // Prüfe ob es eine neue oder existierende Publication ist
                if (!result.publications.ids.includes(pubId)) {
                  result.publications.created++;
                  result.publications.ids.push(pubId);
                } else {
                  result.publications.skipped++;
                }
              } else {
                result.publications.skipped++;
              }
            } catch (pubError: any) {
              console.error('[CRMImport] Publication Error:', publication.name, pubError);
              result.errors.push({
                type: 'publication',
                name: publication.name || 'Unbekannte Publication',
                error: pubError.message || String(pubError),
              });
            }
          }

          // 4. Kontakte für diese Company verarbeiten (nur Journalisten)
          const companyNameForContact = publisher.publisherInfo.name || publisher.fallbackName || 'Unbekannt';
          let hasJournalistWithEmail = false;

          for (const contact of publisher.contacts) {
            try {
              // VALIDIERUNG: Kontakte ohne Namen oder Email nicht importieren
              const isFunctionalContact = contact.contactType === 'function';
              const hasValidName = contact.name && contact.name.trim() !== '' && contact.name !== 'Unbekannt';
              const hasEmail = !!contact.email;

              if (!isFunctionalContact && (!hasValidName || !hasEmail)) {
                console.log('[CRMImport] Kontakt übersprungen (kein Name oder Email):', contact.name || 'Unbekannt');
                result.contacts.skipped++;
                continue;
              }

              if (isFunctionalContact && !hasEmail) {
                console.log('[CRMImport] Funktionskontakt übersprungen (keine Email):', contact.functionName || contact.name);
                result.contacts.skipped++;
                continue;
              }

              // Prüfe auf existierenden Contact
              const existingContactId = await findExistingContact(
                input.organizationId,
                contact.email || undefined,
                contact.name || undefined,
                companyId
              );

              if (existingContactId) {
                console.log('[CRMImport] Contact existiert bereits:', contact.name);
                result.contacts.skipped++;
                result.contacts.ids.push(existingContactId);
                if (contact.email) hasJournalistWithEmail = true;
              } else {
                // Neuen Contact erstellen
                const contactId = await createContact(
                  input.organizationId,
                  input.userId,
                  result.tagId,
                  contact,
                  companyId,
                  companyNameForContact,
                  publicationIds
                );
                if (contactId) {
                  result.contacts.created++;
                  result.contacts.ids.push(contactId);
                  if (contact.email) hasJournalistWithEmail = true;
                } else {
                  result.contacts.skipped++;
                }
              }
            } catch (contactError: any) {
              console.error('[CRMImport] Contact Error:', contact.name, contactError);
              result.errors.push({
                type: 'contact',
                name: contact.name || 'Unbekannter Kontakt',
                error: contactError.message || String(contactError),
              });
            }
          }

          // 5. Funktionskontakt als Fallback erstellen (wenn keine Journalisten mit Email)
          if (!hasJournalistWithEmail && publisher.functionalContact) {
            try {
              const funcContact = publisher.functionalContact;
              console.log('[CRMImport] Erstelle Funktionskontakt:', funcContact.functionName || funcContact.name);

              // Prüfe ob Funktionskontakt bereits existiert
              const existingFuncId = await findExistingContact(
                input.organizationId,
                funcContact.email || undefined,
                funcContact.name || undefined,
                companyId
              );

              if (!existingFuncId) {
                const funcContactId = await createContact(
                  input.organizationId,
                  input.userId,
                  result.tagId,
                  funcContact,
                  companyId,
                  companyNameForContact,
                  publicationIds,
                  'Funktionskontakt erstellt da keine Journalisten mit persönlicher E-Mail gefunden wurden'
                );
                if (funcContactId) {
                  result.contacts.created++;
                  result.contacts.ids.push(funcContactId);
                }
              } else {
                result.contacts.skipped++;
              }
            } catch (funcError: any) {
              console.error('[CRMImport] Funktionskontakt Error:', funcError);
              result.errors.push({
                type: 'contact',
                name: publisher.functionalContact.name || 'Funktionskontakt',
                error: funcError.message || String(funcError),
              });
            }
          }
        } catch (companyError: any) {
          const errorName = publisher.publisherInfo.name || publisher.fallbackName || 'Unbekannte Company';
          console.error('[CRMImport] Company Error:', errorName, companyError);
          result.errors.push({
            type: 'company',
            name: errorName,
            error: companyError.message || String(companyError),
          });
        }
      }
    } catch (error: any) {
      console.error('[CRMImport] General Error:', error);
      result.errors.push({
        type: 'tag',
        name: input.tagName,
        error: error.message || String(error),
      });
    }

    console.log('[CRMImport] Abgeschlossen:', {
      companiesCreated: result.companies.created,
      publicationsCreated: result.publications.created,
      contactsCreated: result.contacts.created,
      errors: result.errors.length,
    });

    return result;
  }
);
