// src/lib/firebase/crm-service-enhanced.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService, QueryOptions, FilterOptions, PaginationResult } from './service-base';
import { 
  CompanyEnhanced, 
  ContactEnhanced,
  CompanyEnhancedListView,
  ContactEnhancedListView
} from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';
import { BaseEntity, GdprConsent, BusinessIdentifier, InternationalAddress } from '@/types/international';

// ========================================
// Enhanced Company Service
// ========================================

class CompanyEnhancedService extends BaseService<CompanyEnhanced> {
  constructor() {
    super('companies_enhanced'); // CHANGED: Using companies_enhanced collection
  }

  /**
   * Erstellt eine Firma mit erweiterten Feldern
   */
  async create(
    data: Omit<CompanyEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Validierung
    if (!data.officialName?.trim()) {
      throw new Error('Offizieller Firmenname ist erforderlich');
    }

    // Setze Display-Name falls nicht vorhanden
    if (!data.name) {
      data.name = data.tradingName || data.officialName;
    }

    return super.create(data, context);
  }

  /**
   * Sucht Firmen mit erweiterten Filtern
   */
  async searchEnhanced(
    organizationId: string,
    filters: {
      search?: string;
      types?: string[];
      industries?: string[];
      countries?: string[];
      parentCompanyId?: string;
      hasPublications?: boolean;
      status?: string[];
      tagIds?: string[];
    },
    options: QueryOptions = {}
  ): Promise<CompanyEnhancedListView[]> {
    try {
      // Basis-Suche
      let companies = await this.getAll(organizationId, options);

      // Client-seitige Filterung für komplexe Suchen
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        companies = companies.filter(company => 
          company.name.toLowerCase().includes(searchLower) ||
          company.officialName?.toLowerCase().includes(searchLower) ||
          company.tradingName?.toLowerCase().includes(searchLower) ||
          company.mainAddress?.city?.toLowerCase().includes(searchLower) ||
          company.identifiers?.some(id => 
            id.value.toLowerCase().includes(searchLower)
          )
        );
      }

      if (filters.types?.length) {
        companies = companies.filter(c => filters.types!.includes(c.type));
      }

      if (filters.industries?.length) {
        companies = companies.filter(c => 
          c.industryClassification?.primary && 
          filters.industries!.includes(c.industryClassification.primary)
        );
      }

      if (filters.countries?.length) {
        companies = companies.filter(c => 
          c.mainAddress?.countryCode && 
          filters.countries!.includes(c.mainAddress.countryCode)
        );
      }

      if (filters.parentCompanyId !== undefined) {
        companies = companies.filter(c => c.parentCompanyId === filters.parentCompanyId);
      }

      if (filters.status?.length) {
        companies = companies.filter(c => 
          c.status && filters.status!.includes(c.status)
        );
      }

      if (filters.tagIds?.length) {
        companies = companies.filter(c => 
          c.tagIds?.some(tagId => filters.tagIds!.includes(tagId))
        );
      }

      // Erweitere mit berechneten Feldern
      const enhancedCompanies = await this.enhanceCompaniesWithMetrics(
        companies,
        organizationId
      );

      return enhancedCompanies;
    } catch (error) {
      console.error('Error in enhanced company search:', error);
      return [];
    }
  }

  /**
   * Lädt alle Tochtergesellschaften
   */
  async getSubsidiaries(
    parentCompanyId: string,
    organizationId: string,
    recursive = false
  ): Promise<CompanyEnhanced[]> {
    try {
      const subsidiaries = await this.search(organizationId, {
        parentCompanyId
      });

      if (recursive && subsidiaries.length > 0) {
        // Rekursiv alle Unter-Töchter laden
        const allSubsidiaries = [...subsidiaries];
        
        for (const subsidiary of subsidiaries) {
          if (subsidiary.id) {
            const subSubsidiaries = await this.getSubsidiaries(
              subsidiary.id,
              organizationId,
              true
            );
            allSubsidiaries.push(...subSubsidiaries);
          }
        }

        return allSubsidiaries;
      }

      return subsidiaries;
    } catch (error) {
      console.error('Error loading subsidiaries:', error);
      return [];
    }
  }

  /**
   * Validiert Geschäfts-Identifikatoren
   */
  async validateIdentifier(
    identifier: BusinessIdentifier
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Hier würden echte Validierungen stattfinden
      // z.B. USt-ID Prüfung, Handelsregister-Abfrage etc.
      
      switch (identifier.type) {
        case 'VAT_EU':
          // EU VIES Validation
          return { valid: true }; // Placeholder
          
        case 'EIN_US':
          // US EIN Format Check
          const einRegex = /^\d{2}-\d{7}$/;
          return { 
            valid: einRegex.test(identifier.value),
            error: 'EIN muss Format XX-XXXXXXX haben'
          };
          
        default:
          return { valid: true };
      }
    } catch (error) {
      return { valid: false, error: 'Validierung fehlgeschlagen' };
    }
  }

  /**
   * Fügt berechnete Metriken hinzu
   */
  private async enhanceCompaniesWithMetrics(
    companies: CompanyEnhanced[],
    organizationId: string
  ): Promise<CompanyEnhancedListView[]> {
    try {
      // Lade alle Kontakte für Zählung
      const contactsQuery = query(
        collection(db, 'contacts_enhanced'), // CHANGED: Using contacts_enhanced
        where('organizationId', '==', organizationId),
        where('deletedAt', '==', null)
      );
      const contactsSnapshot = await getDocs(contactsQuery);
      
      // Zähle Kontakte pro Firma
      const contactCountMap = new Map<string, number>();
      contactsSnapshot.docs.forEach(doc => {
        const contact = doc.data();
        if (contact.companyId) {
          const count = contactCountMap.get(contact.companyId) || 0;
          contactCountMap.set(contact.companyId, count + 1);
        }
      });

      // Erweitere Firmen mit Metriken
      return companies.map(company => ({
        ...company,
        contactCount: company.id ? (contactCountMap.get(company.id) || 0) : 0,
        // Weitere Metriken können hier hinzugefügt werden
      }));
    } catch (error) {
      console.error('Error enhancing companies:', error);
      return companies;
    }
  }

  /**
   * Importiert Firmen mit Duplikat-Prüfung
   */
  async import(
    companies: Partial<CompanyEnhanced>[],
    context: { organizationId: string; userId: string },
    options: {
      duplicateCheck?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
    warnings: { row: number; warning: string }[];
  }> {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; error: string }[],
      warnings: [] as { row: number; warning: string }[]
    };

    for (let i = 0; i < companies.length; i++) {
      try {
        const company = companies[i];
        
        if (!company.officialName && !company.name) {
          results.errors.push({
            row: i + 1,
            error: 'Firmenname fehlt'
          });
          continue;
        }

        // Warnung für fehlende empfohlene Felder
        if (!company.type) {
          results.warnings.push({
            row: i + 1,
            warning: 'Firmentyp fehlt, Standard "other" wird verwendet'
          });
        }

        // Duplikat-Prüfung
        if (options.duplicateCheck) {
          // Inline duplicate check
          let existing = null;
          
          // Suche nach gleichen Identifikatoren
          if (company.identifiers?.length) {
            for (const identifier of company.identifiers) {
              const matches = await this.searchByIdentifier(
                identifier,
                context.organizationId
              );
              if (matches.length > 0) {
                existing = matches[0];
                break;
              }
            }
          }

          // Suche nach gleichem Namen
          if (!existing) {
            const name = company.officialName || company.name;
            if (name) {
              const matches = await this.search(context.organizationId, {
                name
              });
              if (matches.length > 0) {
                existing = matches[0];
              }
            }
          }

          if (existing) {
            if (options.updateExisting && existing.id) {
              await this.update(existing.id, company, context);
              results.updated++;
            } else {
              results.skipped++;
              results.warnings.push({
                row: i + 1,
                warning: `Firma "${company.name || company.officialName}" existiert bereits und wurde übersprungen`
              });
            }
            continue;
          }
        }

        // Neue Firma erstellen
        await this.create(company as any, context);
        results.created++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    return results;
  }

  /**
   * Sucht nach Identifier
   */
  private async searchByIdentifier(
    identifier: BusinessIdentifier,
    organizationId: string
  ): Promise<CompanyEnhanced[]> {
    // Da Firestore keine Suche in Arrays von Objekten unterstützt,
    // müssen wir alle laden und filtern
    const all = await this.getAll(organizationId);
    return all.filter(company => 
      company.identifiers?.some(id => 
        id.type === identifier.type && id.value === identifier.value
      )
    );
  }
}

// ========================================
// Enhanced Contact Service
// ========================================

class ContactEnhancedService extends BaseService<ContactEnhanced> {
  constructor() {
    super('contacts_enhanced'); // CHANGED: Using contacts_enhanced collection
  }

  /**
   * Erstellt einen Kontakt mit erweiterten Feldern
   */
  async create(
    data: Omit<ContactEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Validierung
    if (!data.name?.firstName || !data.name?.lastName) {
      throw new Error('Vor- und Nachname sind erforderlich');
    }

    // Generiere Display Name falls nicht vorhanden
    if (!data.displayName) {
      data.displayName = this.formatDisplayName(data.name);
    }
    
    // Clean personalInfo to remove any undefined values
    if (data.personalInfo) {
      const cleanedPersonalInfo: any = {};
      for (const [key, value] of Object.entries(data.personalInfo)) {
        if (value !== undefined && value !== null) {
          cleanedPersonalInfo[key] = value;
        }
      }
      if (Object.keys(cleanedPersonalInfo).length > 0) {
        data.personalInfo = cleanedPersonalInfo;
      } else {
        delete data.personalInfo;
      }
    }

    return super.create(data, context);
  }

  /**
   * Formatiert den Anzeigenamen
   */
  private formatDisplayName(name: ContactEnhanced['name']): string {
    const parts = [];
    
    if (name.title) parts.push(name.title);
    if (name.firstName) parts.push(name.firstName);
    if (name.middleName) parts.push(name.middleName);
    if (name.lastName) parts.push(name.lastName);
    if (name.suffix) parts.push(name.suffix);
    
    return parts.join(' ');
  }

  /**
   * Sucht Kontakte mit erweiterten Filtern
   */
  async searchEnhanced(
    organizationId: string,
    filters: {
      search?: string;
      companyIds?: string[];
      isJournalist?: boolean;
      publicationIds?: string[];
      beats?: string[];
      hasGdprConsent?: boolean;
      status?: string[];
      tagIds?: string[];
    },
    options: QueryOptions = {}
  ): Promise<ContactEnhancedListView[]> {
    try {
      // Basis-Suche
      let contacts = await this.getAll(organizationId, options);

      // Client-seitige Filterung
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        contacts = contacts.filter(contact => 
          contact.displayName.toLowerCase().includes(searchLower) ||
          contact.emails?.some(e => 
            e.email.toLowerCase().includes(searchLower)
          ) ||
          contact.companyName?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.companyIds?.length) {
        contacts = contacts.filter(c => 
          c.companyId && filters.companyIds!.includes(c.companyId)
        );
      }

      if (filters.isJournalist !== undefined) {
        contacts = contacts.filter(c => 
          c.mediaProfile?.isJournalist === filters.isJournalist
        );
      }

      if (filters.publicationIds?.length) {
        contacts = contacts.filter(c => 
          c.mediaProfile?.publicationIds?.some(id => 
            filters.publicationIds!.includes(id)
          )
        );
      }

      if (filters.beats?.length) {
        contacts = contacts.filter(c => 
          c.mediaProfile?.beats?.some(beat => 
            filters.beats!.includes(beat)
          )
        );
      }

      if (filters.hasGdprConsent !== undefined) {
        contacts = contacts.filter(c => {
          const hasActiveConsent = c.gdprConsents?.some(
            consent => consent.status === 'granted'
          );
          return hasActiveConsent === filters.hasGdprConsent;
        });
      }

      if (filters.status?.length) {
        contacts = contacts.filter(c => 
          c.status && filters.status!.includes(c.status)
        );
      }

      if (filters.tagIds?.length) {
        contacts = contacts.filter(c => 
          c.tagIds?.some(tagId => filters.tagIds!.includes(tagId))
        );
      }

      // Erweitere mit Firmen-Details
      const enhancedContacts = await this.enhanceContactsWithCompanyDetails(
        contacts,
        organizationId
      );

      return enhancedContacts;
    } catch (error) {
      console.error('Error in enhanced contact search:', error);
      return [];
    }
  }

  /**
   * Lädt alle Journalisten
   */
  async getJournalists(
    organizationId: string,
    options?: {
      publicationIds?: string[];
      beats?: string[];
    }
  ): Promise<ContactEnhanced[]> {
    let journalists = await this.searchEnhanced(
      organizationId,
      { isJournalist: true }
    );

    if (options?.publicationIds?.length) {
      journalists = journalists.filter(j => 
        j.mediaProfile?.publicationIds?.some(id => 
          options.publicationIds!.includes(id)
        )
      );
    }

    if (options?.beats?.length) {
      journalists = journalists.filter(j => 
        j.mediaProfile?.beats?.some(beat => 
          options.beats!.includes(beat)
        )
      );
    }

    return journalists;
  }

  /**
   * Fügt GDPR-Einwilligung hinzu
   */
  async addGdprConsent(
    contactId: string,
    consent: Omit<GdprConsent, 'id'>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const contact = await this.getById(contactId, context.organizationId);
    if (!contact) {
      throw new Error('Kontakt nicht gefunden');
    }

    const newConsent: GdprConsent = {
      ...consent,
      id: this.generateConsentId(),
      grantedAt: consent.status === 'granted' ? serverTimestamp() as Timestamp : undefined
    };

    const existingConsents = contact.gdprConsents || [];
    
    // Prüfe ob gleiche Purpose bereits existiert
    const existingIndex = existingConsents.findIndex(
      c => c.purpose === consent.purpose
    );

    if (existingIndex >= 0) {
      // Update existing
      existingConsents[existingIndex] = newConsent;
    } else {
      // Add new
      existingConsents.push(newConsent);
    }

    await this.update(
      contactId,
      { gdprConsents: existingConsents },
      context
    );
  }

  /**
   * Widerruft GDPR-Einwilligung
   */
  async revokeGdprConsent(
    contactId: string,
    consentId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const contact = await this.getById(contactId, context.organizationId);
    if (!contact) {
      throw new Error('Kontakt nicht gefunden');
    }

    const consents = contact.gdprConsents || [];
    const consentIndex = consents.findIndex(c => c.id === consentId);
    
    if (consentIndex < 0) {
      throw new Error('Einwilligung nicht gefunden');
    }

    consents[consentIndex] = {
      ...consents[consentIndex],
      status: 'revoked',
      revokedAt: serverTimestamp() as Timestamp
    };

    await this.update(
      contactId,
      { gdprConsents: consents },
      context
    );
  }

  /**
   * Generiert Consent ID
   */
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Erweitert Kontakte mit Firmen-Details
   */
  private async enhanceContactsWithCompanyDetails(
    contacts: ContactEnhanced[],
    organizationId: string
  ): Promise<ContactEnhancedListView[]> {
    try {
      // Lade alle relevanten Firmen
      const companyIds = Array.from(new Set(
        contacts
          .map(c => c.companyId)
          .filter(Boolean) as string[]
      ));

      if (companyIds.length === 0) {
        return contacts;
      }

      const companiesQuery = query(
        collection(db, 'companies_enhanced'), // CHANGED: Using companies_enhanced
        where('organizationId', '==', organizationId),
        where('__name__', 'in', companyIds.slice(0, 10)) // Firestore Limit
      );
      
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesMap = new Map<string, any>();
      
      companiesSnapshot.docs.forEach(doc => {
        const company = doc.data();
        companiesMap.set(doc.id, {
          id: doc.id,
          name: company.name || company.officialName,
          type: company.type,
          logoUrl: company.logoUrl
        });
      });

      // Erweitere Kontakte
      return contacts.map(contact => ({
        ...contact,
        companyDetails: contact.companyId 
          ? companiesMap.get(contact.companyId)
          : undefined
      }));
    } catch (error) {
      console.error('Error enhancing contacts:', error);
      return contacts;
    }
  }

  /**
   * Importiert Kontakte mit Duplikat-Prüfung
   */
  async import(
    contacts: Partial<ContactEnhanced>[],
    context: { organizationId: string; userId: string },
    options: {
      duplicateCheck?: boolean;
      updateExisting?: boolean;
      defaultCompanyId?: string;
    } = {}
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
    warnings: { row: number; warning: string }[];
  }> {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; error: string }[],
      warnings: [] as { row: number; warning: string }[]
    };

    for (let i = 0; i < contacts.length; i++) {
      try {
        const contact = contacts[i];
        
        // Basis-Validierung
        if (!contact.name?.firstName || !contact.name?.lastName) {
          results.errors.push({
            row: i + 1,
            error: 'Vor- und Nachname erforderlich'
          });
          continue;
        }

        // Warnung für fehlende E-Mail
        if (!contact.emails || contact.emails.length === 0) {
          results.warnings.push({
            row: i + 1,
            warning: 'Keine E-Mail-Adresse angegeben'
          });
        }

        // Default Company zuweisen falls gewünscht
        if (options.defaultCompanyId && !contact.companyId) {
          contact.companyId = options.defaultCompanyId;
        }

        // Duplikat-Prüfung
        if (options.duplicateCheck) {
          // Inline duplicate check
          let existing = null;
          
          // Suche nach gleicher E-Mail
          if (contact.emails?.length) {
            const primaryEmail = contact.emails.find(e => e.isPrimary) || contact.emails[0];
            if (primaryEmail) {
              const matches = await this.searchByEmail(
                primaryEmail.email,
                context.organizationId
              );
              if (matches.length > 0) {
                existing = matches[0];
              }
            }
          }

          // Suche nach gleichem Namen in gleicher Firma
          if (!existing && contact.name && contact.companyId) {
            const all = await this.search(context.organizationId, {
              companyId: contact.companyId
            });
            
            existing = all.find(c => 
              c.name.firstName === contact.name!.firstName &&
              c.name.lastName === contact.name!.lastName
            );
          }

          if (existing) {
            if (options.updateExisting && existing.id) {
              await this.update(existing.id, contact, context);
              results.updated++;
            } else {
              results.skipped++;
              results.warnings.push({
                row: i + 1,
                warning: `Kontakt "${contact.displayName || `${contact.name.firstName} ${contact.name.lastName}`}" existiert bereits und wurde übersprungen`
              });
            }
            continue;
          }
        }

        // Neuen Kontakt erstellen
        await this.create(contact as any, context);
        results.created++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    return results;
  }

  /**
   * Sucht nach E-Mail
   */
  private async searchByEmail(
    email: string,
    organizationId: string
  ): Promise<ContactEnhanced[]> {
    // Da Firestore keine Suche in Arrays von Objekten unterstützt,
    // müssen wir alle laden und filtern
    const all = await this.getAll(organizationId);
    return all.filter(contact => 
      contact.emails?.some(e => e.email === email)
    );
  }
}

// ========================================
// Tag Service (erweitert für Mandanten)
// ========================================

// Erweiterte Tag-Type mit BaseEntity
interface TagEnhanced extends BaseEntity {
  name: string;
  color: Tag['color'];
  description?: string;
  
  // Verwendungs-Statistiken
  contactCount?: number;
  companyCount?: number;
  
  // Für Kompatibilität mit altem Tag Type
  userId?: string; // Optional für Rückwärtskompatibilität
}

class TagEnhancedService extends BaseService<TagEnhanced> {
  constructor() {
    super('tags');
  }
  
  /**
   * Get all tags as enhanced format
   */
  async getAll(organizationId: string, options?: QueryOptions): Promise<TagEnhanced[]> {
    return super.getAll(organizationId, options);
  }
  
  /**
   * Get all tags converted to legacy Tag format for compatibility
   */
  async getAllAsLegacyTags(organizationId: string, options?: QueryOptions): Promise<Tag[]> {
    const enhancedTags = await this.getAll(organizationId, options);
    
    // Convert TagEnhanced to Tag for compatibility
    return enhancedTags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      userId: tag.createdBy || organizationId, // Map createdBy to userId for compatibility
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      contactCount: tag.contactCount,
      companyCount: tag.companyCount
    })) as Tag[];
  }

  /**
   * Lädt Tags mit Verwendungs-Zählung (Legacy Format)
   */
  async getWithUsageCount(
    organizationId: string
  ): Promise<Tag[]> {
    try {
      const tags = await this.getAll(organizationId);
      
      // Zähle Verwendungen
      const [companies, contacts] = await Promise.all([
        getDocs(query(
          collection(db, 'companies_enhanced'), // CHANGED: Using companies_enhanced
          where('organizationId', '==', organizationId),
          where('deletedAt', '==', null)
        )),
        getDocs(query(
          collection(db, 'contacts_enhanced'), // CHANGED: Using contacts_enhanced
          where('organizationId', '==', organizationId),
          where('deletedAt', '==', null)
        ))
      ]);

      // Zähle Tag-Verwendungen
      const tagUsage = new Map<string, { companies: number; contacts: number }>();
      
      companies.docs.forEach(doc => {
        const tagIds = doc.data().tagIds || [];
        tagIds.forEach((tagId: string) => {
          const current = tagUsage.get(tagId) || { companies: 0, contacts: 0 };
          tagUsage.set(tagId, { ...current, companies: current.companies + 1 });
        });
      });

      contacts.docs.forEach(doc => {
        const tagIds = doc.data().tagIds || [];
        tagIds.forEach((tagId: string) => {
          const current = tagUsage.get(tagId) || { companies: 0, contacts: 0 };
          tagUsage.set(tagId, { ...current, contacts: current.contacts + 1 });
        });
      });

      // Erweitere Tags mit Zählungen und konvertiere zu Tag type
      return tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        userId: tag.createdBy || organizationId, // Map for compatibility
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
        companyCount: tag.id ? (tagUsage.get(tag.id)?.companies || 0) : 0,
        contactCount: tag.id ? (tagUsage.get(tag.id)?.contacts || 0) : 0
      })) as Tag[];
    } catch (error) {
      console.error('Error loading tags with usage:', error);
      return [];
    }
  }

  /**
   * Merged Tags
   */
  async mergeTags(
    sourceTagId: string,
    targetTagId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Validiere beide Tags
      const [sourceTag, targetTag] = await Promise.all([
        this.getById(sourceTagId, context.organizationId),
        this.getById(targetTagId, context.organizationId)
      ]);

      if (!sourceTag || !targetTag) {
        throw new Error('Ein oder beide Tags wurden nicht gefunden');
      }

      // Update alle Firmen und Kontakte
      const batch = writeBatch(db);
      
      // Update Companies
      const companiesQuery = query(
        collection(db, 'companies_enhanced'), // CHANGED: Using companies_enhanced
        where('organizationId', '==', context.organizationId),
        where('tagIds', 'array-contains', sourceTagId)
      );
      
      const companies = await getDocs(companiesQuery);
      companies.docs.forEach(doc => {
        const tagIds = doc.data().tagIds as string[];
        const newTagIds = Array.from(new Set(
          tagIds.map(id => id === sourceTagId ? targetTagId : id)
        ));
        batch.update(doc.ref, { 
          tagIds: newTagIds,
          updatedBy: context.userId,
          updatedAt: serverTimestamp()
        });
      });

      // Update Contacts
      const contactsQuery = query(
        collection(db, 'contacts_enhanced'), // CHANGED: Using contacts_enhanced
        where('organizationId', '==', context.organizationId),
        where('tagIds', 'array-contains', sourceTagId)
      );
      
      const contacts = await getDocs(contactsQuery);
      contacts.docs.forEach(doc => {
        const tagIds = doc.data().tagIds as string[];
        const newTagIds = Array.from(new Set(
          tagIds.map(id => id === sourceTagId ? targetTagId : id)
        ));
        batch.update(doc.ref, { 
          tagIds: newTagIds,
          updatedBy: context.userId,
          updatedAt: serverTimestamp()
        });
      });

      // Lösche Source Tag
      batch.delete(doc(db, 'tags', sourceTagId));

      await batch.commit();
    } catch (error) {
      console.error('Error merging tags:', error);
      throw error;
    }
  }
}

// ========================================
// Export Service Instanzen
// ========================================

export const companiesEnhancedService = new CompanyEnhancedService();
export const contactsEnhancedService = new ContactEnhancedService();
export const tagsEnhancedService = new TagEnhancedService();