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
import { multiEntityService, CombinedContactReference } from './multi-entity-reference-service';

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
    context: { organizationId: string; userId: string; autoGlobalMode?: boolean }
  ): Promise<string> {
    // Validierung
    if (!data.officialName?.trim()) {
      throw new Error('Offizieller Firmenname ist erforderlich');
    }

    // Setze Display-Name falls nicht vorhanden
    if (!data.name) {
      data.name = data.tradingName || data.officialName;
    }

    // Global-Interceptor anwenden wenn SuperAdmin/autoGlobalMode
    if (context.autoGlobalMode) {
      const { interceptSave } = await import('@/lib/utils/global-interceptor');
      const globalizedData = interceptSave(data, 'company', { email: context.userId }, {
        autoGlobalMode: context.autoGlobalMode
      });

      console.log('🌟 Company wird als global erstellt:', {
        name: data.name,
        isGlobal: globalizedData.isGlobal,
        autoGlobalMode: context.autoGlobalMode
      });

      return super.create(globalizedData, context);
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
    context: { organizationId: string; userId: string; autoGlobalMode?: boolean },
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
    context: { organizationId: string; userId: string; autoGlobalMode?: boolean }
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

    // Global-Interceptor anwenden wenn SuperAdmin/autoGlobalMode
    if (context.autoGlobalMode) {
      const { interceptSave } = await import('@/lib/utils/global-interceptor');
      const globalizedData = interceptSave(data, 'contact', { email: context.userId }, {
        autoGlobalMode: context.autoGlobalMode
      });

      console.log('🌟 Contact wird als global erstellt:', {
        name: data.displayName,
        isGlobal: globalizedData.isGlobal,
        autoGlobalMode: context.autoGlobalMode
      });

      return super.create(globalizedData, context);
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
    context: { organizationId: string; userId: string; autoGlobalMode?: boolean },
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

// ========================================
// PLAN 5/9: MONITORING-IMPLEMENTIERUNG
// ========================================

// Erweiterte ContactEnhancedService für Journalist-Tracking + Multi-Entity References
class ContactEnhancedServiceExtended extends ContactEnhancedService {

  /**
   * ✨ ENHANCED: getAll() erweitert um Multi-Entity References
   *
   * Diese Methode kombiniert echte Kontakte mit References transparent.
   * ALLE bestehenden Services funktionieren dadurch automatisch!
   */
  async getAll(organizationId: string): Promise<ContactEnhanced[]> {
    try {
      // 1. Lade echte Kontakte (wie bisher)
      const realContacts = await super.getAll(organizationId);

      // 2. Lade Contact-References und konvertiere zu ContactEnhanced-Format
      const referencedContacts = await this.getReferencedContacts(organizationId);

      // 3. Kombiniere transparent - für andere Services unsichtbar!
      const allContacts = [...realContacts, ...referencedContacts];

      console.log('📊 ENHANCED CONTACTS SERVICE:', {
        realContacts: realContacts.length,
        referencedContacts: referencedContacts.length,
        totalContacts: allContacts.length,
        organizationId
      });

      return allContacts;

    } catch (error) {
      console.error('Fehler beim Laden der erweiterten Kontakte:', error);
      // Fallback: Nur echte Kontakte zurückgeben
      return await super.getAll(organizationId);
    }
  }

  /**
   * ✨ ENHANCED: getById() erweitert um Reference-Support
   *
   * Unterstützt sowohl echte Contact-IDs als auch Reference-IDs
   */
  async getById(id: string, organizationId: string): Promise<ContactEnhanced | null> {
    try {
      // 1. Versuche zuerst echten Kontakt zu laden
      const realContact = await super.getById(id, organizationId);
      if (realContact) {
        return realContact;
      }

      // 2. Versuche Reference-ID zu laden
      const referencedContact = await this.getReferencedContactById(id, organizationId);
      if (referencedContact) {
        return referencedContact;
      }

      return null;

    } catch (error) {
      console.error('Fehler beim Laden des Kontakts (Enhanced):', error);
      return null;
    }
  }

  /**
   * Lädt Contact-References und konvertiert sie zu ContactEnhanced-Format
   */
  private async getReferencedContacts(organizationId: string): Promise<ContactEnhanced[]> {
    try {
      // 1. Lade kombinierte Contact-References
      const combinedRefs = await multiEntityService.getAllContactReferences(organizationId);

      // 2. Sicherheitsprüfung für undefined/null
      if (!combinedRefs || !Array.isArray(combinedRefs)) {
        console.warn('getAllContactReferences returned invalid data:', combinedRefs);
        return [];
      }

      // 3. Konvertiere zu ContactEnhanced-Format
      return combinedRefs.map(this.convertReferenceToContact.bind(this));

    } catch (error) {
      console.error('Fehler beim Laden der Reference-Kontakte:', error);
      return [];
    }
  }

  /**
   * Lädt einen einzelnen Reference-Kontakt nach ID
   */
  private async getReferencedContactById(
    localJournalistId: string,
    organizationId: string
  ): Promise<ContactEnhanced | null> {
    try {
      // Lade alle References und finde die passende
      const combinedRefs = await multiEntityService.getAllContactReferences(organizationId);
      const targetRef = combinedRefs.find(ref => ref.id === localJournalistId);

      if (!targetRef) {
        return null;
      }

      return this.convertReferenceToContact(targetRef);

    } catch (error) {
      console.error('Fehler beim Laden der einzelnen Reference:', error);
      return null;
    }
  }

  /**
   * Konvertiert CombinedContactReference zu ContactEnhanced für Service-Kompatibilität
   */
  private convertReferenceToContact(reference: CombinedContactReference): ContactEnhanced {
    return {
      // Verwende lokale Reference-ID als Contact-ID
      id: reference.id,
      organizationId: '', // Wird von Service nicht für Anzeige benötigt

      // Globale Journalist-Daten (read-only)
      displayName: reference.displayName,
      position: reference.position,

      // Fehlende Pflichtfelder für Detail-Seite
      academicTitle: '', // Leer, da nicht von Reference unterstützt
      name: {
        // Verwende firstName/lastName wenn vorhanden, sonst splitten
        firstName: reference.firstName || reference.displayName?.split(' ')[0] || '',
        lastName: reference.lastName || reference.displayName?.split(' ').slice(1).join(' ') || 'Reference'
      },
      emails: reference.email ? [{
        email: reference.email,
        type: 'work',
        isPrimary: true,
        isVerified: false
      }] : [],
      phones: reference.phone ? [{
        number: reference.phone,
        type: 'mobile',
        isPrimary: true
      }] : [],
      addresses: [],
      socialMedia: [],
      tags: reference._localMeta?.tags || [],
      customFields: {},

      // Zusätzliche Felder für vollständige ContactEnhanced-Kompatibilität
      identifiers: [], // Contact-References haben keine Identifiers
      socialProfiles: [], // Contact-References haben keine Social Media Profile
      gdprConsents: [], // Contact-References haben keine GDPR-Einwilligungen
      tagIds: reference._localMeta?.tags || [], // Tag-IDs für Kompatibilität
      communicationPreferences: undefined, // Keine Kommunikationspräferenzen
      personalInfo: undefined, // Keine persönlichen Informationen
      professionalInfo: undefined, // Keine beruflichen Informationen
      internalNotes: reference._localMeta?.notes || '', // Lokale Notizen
      status: 'active', // Standard-Status

      // ✅ KRITISCH: Lokale Relations für Listen/Projekte/etc!
      companyId: reference.companyId, // Lokale Company-Reference-ID!
      companyName: reference.companyName,

      // Media-Profil mit lokalen Publication-IDs
      mediaProfile: {
        isJournalist: true,
        publicationIds: reference.publicationIds, // Lokale Publication-Reference-IDs!
        beats: reference.beats || [],
        mediaTypes: reference.mediaTypes || [],
        preferredTopics: reference.beats || []
      },

      // Reference-spezifische Marker für UI
      _isReference: true,
      _globalJournalistId: reference._globalJournalistId,
      _localNotes: reference._localMeta.notes,
      _localTags: reference._localMeta.tags || [],

      // Pflichtfelder für Service-Kompatibilität
      createdAt: reference._localMeta.addedAt,
      updatedAt: reference._localMeta.addedAt,
      createdBy: 'reference-import',
      updatedBy: 'reference-import'
    } as any; // Type assertion da wir Reference-Felder hinzufügen
  }
  /**
   * Aktualisiert Journalist-Metriken basierend auf einem neuen Clipping
   */
  async updateJournalistMetrics(
    contactId: string,
    clipping: any, // MediaClipping from types/media
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const contact = await this.getById(contactId, context.organizationId);
      if (!contact || !contact.mediaProfile?.isJournalist) {
        throw new Error('Journalist-Kontakt nicht gefunden');
      }

      // Aktuelle Performance-Metriken holen oder initialisieren
      const currentMetrics = (contact as any).performanceMetrics || {
        totalArticles: 0,
        totalReach: 0,
        averageReachPerArticle: 0,
        totalMediaValue: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        monthlyArticleCount: [],
        topTopics: [],
        engagementRate: 0,
        averageResponseTime: 0
      };

      // Clipping-History erweitern
      const clippingEntry = {
        clippingId: clipping.id,
        title: clipping.title,
        outlet: clipping.outlet,
        publishDate: clipping.publishDate,
        reachValue: clipping.reachValue,
        sentimentScore: clipping.sentimentScore,
        mediaValue: clipping.mediaValue,
        url: clipping.url
      };

      const clippingHistory = (contact as any).clippingHistory || [];
      clippingHistory.push(clippingEntry);

      // Metriken aktualisieren
      currentMetrics.totalArticles += 1;
      currentMetrics.totalReach += clipping.reachValue || 0;
      currentMetrics.averageReachPerArticle = currentMetrics.totalReach / currentMetrics.totalArticles;
      currentMetrics.totalMediaValue += clipping.mediaValue || 0;

      // Sentiment-Verteilung aktualisieren
      if (clipping.sentimentScore > 0.1) {
        currentMetrics.sentimentDistribution.positive += 1;
      } else if (clipping.sentimentScore < -0.1) {
        currentMetrics.sentimentDistribution.negative += 1;
      } else {
        currentMetrics.sentimentDistribution.neutral += 1;
      }

      // Monatliche Statistiken aktualisieren
      const month = new Date(clipping.publishDate.seconds * 1000).toISOString().substring(0, 7); // YYYY-MM
      const monthlyIndex = currentMetrics.monthlyArticleCount.findIndex((m: any) => m.month === month);
      if (monthlyIndex >= 0) {
        currentMetrics.monthlyArticleCount[monthlyIndex].count += 1;
        currentMetrics.monthlyArticleCount[monthlyIndex].reach += clipping.reachValue || 0;
      } else {
        currentMetrics.monthlyArticleCount.push({
          month,
          count: 1,
          reach: clipping.reachValue || 0
        });
      }

      // Projekt-Beiträge aktualisieren
      let projectContributions = (contact as any).projectContributions || [];
      const projectIndex = projectContributions.findIndex((p: any) => p.projectId === clipping.projectId);
      
      if (projectIndex >= 0) {
        projectContributions[projectIndex].clippingCount += 1;
        projectContributions[projectIndex].totalReach += clipping.reachValue || 0;
        projectContributions[projectIndex].mediaValue += clipping.mediaValue || 0;
        projectContributions[projectIndex].lastContribution = clipping.publishDate;
        
        // Durchschnitts-Sentiment neu berechnen
        const totalSentiment = (projectContributions[projectIndex].averageSentiment * (projectContributions[projectIndex].clippingCount - 1)) + clipping.sentimentScore;
        projectContributions[projectIndex].averageSentiment = totalSentiment / projectContributions[projectIndex].clippingCount;
      } else if (clipping.projectId) {
        // Lade Projekt-Details für Namen
        const { projectService } = await import('./project-service');
        const project = await projectService.getById(clipping.projectId, { organizationId: context.organizationId });
        
        projectContributions.push({
          projectId: clipping.projectId,
          projectTitle: project?.title || 'Unbekanntes Projekt',
          clippingCount: 1,
          totalReach: clipping.reachValue || 0,
          averageSentiment: clipping.sentimentScore || 0,
          mediaValue: clipping.mediaValue || 0,
          lastContribution: clipping.publishDate
        });
      }

      // Kontakt-Updates
      const updates: any = {
        clippingHistory,
        performanceMetrics: currentMetrics,
        projectContributions,
        totalClippings: (contact as any).totalClippings ? (contact as any).totalClippings + 1 : 1,
        averageReach: currentMetrics.averageReachPerArticle,
        lastClippingDate: clipping.publishDate,
        averageSentiment: this.calculateAverageSentiment(clippingHistory)
      };

      await this.update(contactId, updates, context);
    } catch (error) {
      console.error('Fehler beim Update der Journalist-Metriken:', error);
      throw error;
    }
  }

  /**
   * Holt Performance-Daten für einen Journalisten
   */
  async getJournalistPerformance(
    contactId: string,
    organizationId: string
  ): Promise<any> { // JournalistMetrics
    try {
      const contact = await this.getById(contactId, organizationId);
      if (!contact || !contact.mediaProfile?.isJournalist) {
        throw new Error('Journalist-Kontakt nicht gefunden');
      }

      const performanceMetrics = (contact as any).performanceMetrics;
      const clippingHistory = (contact as any).clippingHistory || [];
      
      return {
        contactId,
        totalArticles: performanceMetrics?.totalArticles || 0,
        totalReach: performanceMetrics?.totalReach || 0,
        averageReachPerArticle: performanceMetrics?.averageReachPerArticle || 0,
        totalMediaValue: performanceMetrics?.totalMediaValue || 0,
        sentimentDistribution: performanceMetrics?.sentimentDistribution || { positive: 0, neutral: 0, negative: 0 },
        monthlyPerformance: performanceMetrics?.monthlyArticleCount || [],
        topTopics: performanceMetrics?.topTopics || [],
        recentClippings: clippingHistory.slice(-5), // Letzte 5 Clippings
        responseRate: (contact as any).responseRate || 0,
        averageResponseTime: performanceMetrics?.averageResponseTime || 0,
        projectContributions: (contact as any).projectContributions || []
      };
    } catch (error) {
      console.error('Fehler beim Laden der Journalist-Performance:', error);
      throw error;
    }
  }

  /**
   * Holt Top-Performing Journalisten
   */
  async getTopPerformingJournalists(
    organizationId: string,
    timeframe = 365,
    limit = 10
  ): Promise<any[]> { // JournalistContact[]
    try {
      // Lade alle Journalisten
      const journalists = await this.searchEnhanced(organizationId, {
        isJournalist: true
      });

      // Filtere nach Timeframe und sortiere nach Performance
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframe);

      const performingJournalists = journalists
        .filter(j => {
          const lastClippingDate = (j as any).lastClippingDate;
          return lastClippingDate && new Date(lastClippingDate.seconds * 1000) >= cutoffDate;
        })
        .map(j => ({
          ...j,
          performanceScore: this.calculatePerformanceScore(j as any)
        }))
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, limit);

      return performingJournalists;
    } catch (error) {
      console.error('Fehler beim Laden der Top-Journalisten:', error);
      return [];
    }
  }

  /**
   * Berechnet durchschnittliches Sentiment aus Clipping-History
   */
  private calculateAverageSentiment(clippingHistory: any[]): number {
    if (clippingHistory.length === 0) return 0;
    
    const totalSentiment = clippingHistory.reduce((sum, c) => sum + (c.sentimentScore || 0), 0);
    return totalSentiment / clippingHistory.length;
  }

  /**
   * Berechnet Performance-Score für Ranking
   */
  private calculatePerformanceScore(journalist: any): number {
    const metrics = journalist.performanceMetrics || {};
    const reachWeight = 0.4;
    const sentimentWeight = 0.3;
    const frequencyWeight = 0.2;
    const engagementWeight = 0.1;

    // Normalisierte Werte (0-100)
    const normalizedReach = Math.min((metrics.averageReachPerArticle || 0) / 10000, 1) * 100;
    const normalizedSentiment = ((journalist.averageSentiment || 0) + 1) * 50; // -1 bis 1 -> 0 bis 100
    const normalizedFrequency = Math.min((metrics.totalArticles || 0) / 50, 1) * 100;
    const normalizedEngagement = Math.min((metrics.engagementRate || 0), 1) * 100;

    return (
      normalizedReach * reachWeight +
      normalizedSentiment * sentimentWeight +
      normalizedFrequency * frequencyWeight +
      normalizedEngagement * engagementWeight
    );
  }

  /**
   * Sucht Journalisten mit spezifischen Kriterien
   */
  async searchJournalistsForProject(
    organizationId: string,
    criteria: {
      topics?: string[];
      minReach?: number;
      sentimentThreshold?: number;
      outlets?: string[];
      responseRateMin?: number;
    }
  ): Promise<any[]> { // JournalistContact[]
    try {
      let journalists = await this.searchEnhanced(organizationId, {
        isJournalist: true
      });

      // Filter nach Kriterien
      if (criteria.topics?.length) {
        journalists = journalists.filter(j => 
          j.mediaProfile?.beats?.some(beat => criteria.topics!.includes(beat)) ||
          (j as any).preferredTopics?.some((topic: string) => criteria.topics!.includes(topic))
        );
      }

      if (criteria.minReach) {
        journalists = journalists.filter(j => (j as any).averageReach >= criteria.minReach!);
      }

      if (criteria.sentimentThreshold !== undefined) {
        journalists = journalists.filter(j => (j as any).averageSentiment >= criteria.sentimentThreshold!);
      }

      if (criteria.outlets?.length) {
        journalists = journalists.filter(j => 
          j.mediaProfile?.publicationIds?.length // Placeholder - würde mit Publication-Service gemappt
        );
      }

      if (criteria.responseRateMin) {
        journalists = journalists.filter(j => (j as any).responseRate >= criteria.responseRateMin!);
      }

      // Sortiere nach Performance-Score
      return journalists
        .map(j => ({
          ...j,
          performanceScore: this.calculatePerformanceScore(j as any)
        }))
        .sort((a, b) => b.performanceScore - a.performanceScore);
    } catch (error) {
      console.error('Fehler bei Journalist-Suche:', error);
      return [];
    }
  }
}

/**
 * ✨ Extended Company Service mit Multi-Entity References
 *
 * Inkludiert Company-References transparent in getAll()
 */
class CompanyEnhancedServiceExtended extends CompanyEnhancedService {
  /**
   * ✨ ENHANCED: getById() erweitert um Company-Reference-Support
   */
  async getById(id: string, organizationId: string): Promise<CompanyEnhanced | null> {
    try {
      // 1. Versuche zuerst echte Company zu laden
      const realCompany = await super.getById(id, organizationId);
      if (realCompany) {
        return realCompany;
      }

      // 2. Versuche Company-Reference zu laden (für local-ref-* IDs)
      if (id.startsWith('local-ref-company-')) {
        const companyRefsQuery = query(
          collection(db, 'organizations', organizationId, 'company_references'),
          where('localCompanyId', '==', id),
          where('isActive', '==', true)
        );
        const companyRefsSnapshot = await getDocs(companyRefsQuery);

        if (!companyRefsSnapshot.empty) {
          const ref = companyRefsSnapshot.docs[0].data();

          // Validiere globalCompanyId
          if (!ref.globalCompanyId || typeof ref.globalCompanyId !== 'string') {
            console.warn('Invalid globalCompanyId in company_reference:', ref);
            return null;
          }

          // Lade globale Company-Daten
          const globalCompanyDoc = await getDoc(doc(db, 'companies_enhanced', ref.globalCompanyId));
          if (globalCompanyDoc.exists()) {
            const globalCompany = globalCompanyDoc.data();

            // Erstelle CompanyEnhanced aus Reference + globalen Daten (wie in getAll)
            return {
              id: ref.localCompanyId,
              name: globalCompany.name || globalCompany.officialName,
              officialName: globalCompany.officialName,
              tradingName: globalCompany.tradingName,
              type: globalCompany.type || 'other',
              legalForm: globalCompany.legalForm,
              industryClassification: globalCompany.industryClassification,
              website: globalCompany.website,
              description: globalCompany.description,
              foundedDate: globalCompany.foundedDate,
              emails: globalCompany.emails || [],
              phones: globalCompany.phones || [],
              mainAddress: globalCompany.mainAddress,
              identifiers: globalCompany.identifiers || [],
              financial: globalCompany.financial,
              socialMedia: globalCompany.socialMedia || [],
              status: globalCompany.status || 'active',
              lifecycleStage: globalCompany.lifecycleStage,
              parentCompanyId: globalCompany.parentCompanyId,
              subsidiaryIds: globalCompany.subsidiaryIds || [],
              _isReference: true,
              _globalCompanyId: ref.globalCompanyId,
              organizationId: organizationId,
              createdAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
              createdBy: ref.addedBy,
              updatedAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
              updatedBy: ref.addedBy
            } as CompanyEnhanced & { _isReference: boolean; _globalCompanyId: string };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Company (Enhanced):', error);
      return null;
    }
  }

  /**
   * ✨ ENHANCED: getAll() erweitert um Company-References
   */
  async getAll(organizationId: string): Promise<CompanyEnhanced[]> {
    try {
      // 1. Lade echte Companies (wie bisher)
      const realCompanies = await super.getAll(organizationId);

      // 2. Lade Company-References
      const companyRefsQuery = query(
        collection(db, 'organizations', organizationId, 'company_references'),
        where('isActive', '==', true)
      );
      const companyRefsSnapshot = await getDocs(companyRefsQuery);

      // 3. Konvertiere References zu CompanyEnhanced-Format
      const companyReferences: CompanyEnhanced[] = [];
      for (const refDoc of companyRefsSnapshot.docs) {
        const ref = refDoc.data();

        // Validiere globalCompanyId
        if (!ref.globalCompanyId || typeof ref.globalCompanyId !== 'string') {
          console.warn('Invalid globalCompanyId in company_reference:', ref);
          continue;
        }

        // Lade globale Company-Daten
        const globalCompanyDoc = await getDoc(doc(db, 'companies_enhanced', ref.globalCompanyId));
        if (!globalCompanyDoc.exists()) continue;

        const globalCompany = globalCompanyDoc.data();

        // Debug: Log globale Company-Daten (detailliert)
        console.log('🔍 Global Company Data (detailliert):', {
          id: ref.globalCompanyId,
          name: globalCompany.name,
          type: globalCompany.type,
          industryClassificationFull: globalCompany.industryClassification,
          industryPrimary: globalCompany.industryClassification?.primary,
          mainAddressFull: globalCompany.mainAddress,
          addressCity: globalCompany.mainAddress?.city,
          addressCountry: globalCompany.mainAddress?.countryCode,
          website: globalCompany.website
        });

        // Erstelle CompanyEnhanced aus Reference + globalen Daten
        companyReferences.push({
          id: ref.localCompanyId,
          name: globalCompany.name || globalCompany.officialName,
          officialName: globalCompany.officialName,
          tradingName: globalCompany.tradingName,
          type: globalCompany.type || 'other',

          // Vollständige Company-Daten übertragen
          legalForm: globalCompany.legalForm,
          industryClassification: globalCompany.industryClassification,
          website: globalCompany.website,
          description: globalCompany.description,
          foundedDate: globalCompany.foundedDate,

          // Kontaktdaten
          emails: globalCompany.emails || [],
          phones: globalCompany.phones || [],
          mainAddress: globalCompany.mainAddress,

          // Business-Identifikatoren
          identifiers: globalCompany.identifiers || [],

          // Finanzinformationen
          financial: globalCompany.financial,

          // Social Media
          socialMedia: globalCompany.socialMedia || [],

          // Status-Felder
          status: globalCompany.status || 'active',
          lifecycleStage: globalCompany.lifecycleStage,

          // Konzernstruktur
          parentCompanyId: globalCompany.parentCompanyId,
          subsidiaryIds: globalCompany.subsidiaryIds || [],

          // Reference-Marker
          _isReference: true,
          _globalCompanyId: ref.globalCompanyId,

          // Meta-Felder (leer für References)
          organizationId: organizationId,
          createdAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
          createdBy: ref.addedBy,
          updatedAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
          updatedBy: ref.addedBy
        } as CompanyEnhanced & { _isReference: boolean; _globalCompanyId: string });
      }

      // 4. Kombiniere echte Companies und References
      const allCompanies = [...realCompanies, ...companyReferences];

      console.log('📊 ENHANCED COMPANIES SERVICE:', {
        realCompanies: realCompanies.length,
        referencedCompanies: companyReferences.length,
        totalCompanies: allCompanies.length,
        organizationId
      });

      return allCompanies;
    } catch (error) {
      console.error('Fehler in CompanyEnhancedServiceExtended.getAll:', error);
      // Fallback zu normaler getAll() wenn Fehler
      return super.getAll(organizationId);
    }
  }
}

export const companiesEnhancedService = new CompanyEnhancedServiceExtended();
export const contactsEnhancedService = new ContactEnhancedServiceExtended();
export const tagsEnhancedService = new TagEnhancedService();