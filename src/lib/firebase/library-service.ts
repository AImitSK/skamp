// src/lib/firebase/library-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService, QueryOptions, FilterOptions } from './service-base';
import { 
  Publication, 
  Advertisement, 
  MediaKit,
  PublicationType,
  PublicationFrequency,
  AdvertisementType,
  PriceModel,
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_FREQUENCY_LABELS
} from '@/types/library';
import { BaseEntity, CountryCode, LanguageCode, CurrencyCode } from '@/types/international';

// ========================================
// Publication Service
// ========================================

class PublicationService extends BaseService<Publication> {
  constructor() {
    super('publications');
  }

  /**
   * Override: Hole alle Publikationen mit Fallback für Legacy-Daten
   */
  async getAll(
    organizationId: string, 
    options: QueryOptions = {}
  ): Promise<Publication[]> {
    try {
      // Zuerst versuchen mit organizationId (neues Schema)
      const newResults = await super.getAll(organizationId, options);
      
      if (newResults.length > 0) {
        console.log(`✅ Found ${newResults.length} publications with organizationId`);
        return newResults;
      }
      
      // Fallback: Legacy-Daten mit organizationId als userId
      console.log('🔄 No publications found with organizationId, trying legacy userId...');
      
      const constraints: QueryConstraint[] = [];
      
      // Sortierung
      if (options.orderBy) {
        constraints.push(
          orderBy(options.orderBy.field, options.orderBy.direction || 'asc')
        );
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      // Legacy Query mit userId = organizationId
      const legacyQuery = query(
        this.collectionRef,
        where('userId', '==', organizationId),
        ...constraints
      );
      
      const legacySnapshot = await getDocs(legacyQuery);
      
      if (!legacySnapshot.empty) {
        console.log(`✅ Found ${legacySnapshot.size} legacy publications with userId = ${organizationId}`);
        const legacyDocs = legacySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Publication));
        
        // Soft-delete Filter
        if (!options.includeDeleted) {
          return legacyDocs.filter(doc => !doc.deletedAt);
        }
        
        return legacyDocs;
      }
      
      console.log(`❌ No publications found with either organizationId or userId = ${organizationId}`);
      return [];
      
    } catch (error) {
      console.error('Error in PublicationService.getAll:', error);
      return [];
    }
  }

  /**
   * Erstellt eine neue Publikation
   */
  async create(
    data: Omit<Publication, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Validierung
    if (!data.title?.trim()) {
      throw new Error('Titel ist erforderlich');
    }

    if (!data.publisherId) {
      throw new Error('Verlag ist erforderlich');
    }

    if (!data.languages || data.languages.length === 0) {
      throw new Error('Mindestens eine Sprache ist erforderlich');
    }

    if (!data.geographicTargets || data.geographicTargets.length === 0) {
      throw new Error('Mindestens ein Zielland ist erforderlich');
    }

    // Setze Standard-Status
    if (!data.status) {
      data.status = 'active';
    }

    return super.create(data, context);
  }

  /**
   * Sucht Publikationen mit erweiterten Filtern
   */
  async searchPublications(
    organizationId: string,
    filters: {
      search?: string;
      publisherIds?: string[];
      types?: PublicationType[];
      formats?: string[];
      languages?: LanguageCode[];
      countries?: CountryCode[];
      focusAreas?: string[];
      minCirculation?: number;
      minUniqueVisitors?: number;
      status?: string[];
    },
    options: QueryOptions = {}
  ): Promise<Publication[]> {
    try {
      // Basis-Suche
      let publications = await this.getAll(organizationId, options);

      // Client-seitige Filterung
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        publications = publications.filter(pub => 
          pub.title.toLowerCase().includes(searchLower) ||
          pub.subtitle?.toLowerCase().includes(searchLower) ||
          pub.publisherName?.toLowerCase().includes(searchLower) ||
          pub.focusAreas.some(area => 
            area.toLowerCase().includes(searchLower)
          )
        );
      }

      if (filters.publisherIds?.length) {
        publications = publications.filter(p => 
          filters.publisherIds!.includes(p.publisherId)
        );
      }

      if (filters.types?.length) {
        publications = publications.filter(p => 
          filters.types!.includes(p.type)
        );
      }

      if (filters.formats?.length) {
        publications = publications.filter(p => 
          filters.formats!.includes(p.format)
        );
      }

      if (filters.languages?.length) {
        publications = publications.filter(p => 
          p.languages.some(lang => filters.languages!.includes(lang))
        );
      }

      if (filters.countries?.length) {
        publications = publications.filter(p => 
          p.geographicTargets.some(country => filters.countries!.includes(country))
        );
      }

      if (filters.focusAreas?.length) {
        publications = publications.filter(p => 
          p.focusAreas.some(area => filters.focusAreas!.includes(area))
        );
      }

      if (filters.minCirculation) {
        publications = publications.filter(p => 
          (p.metrics.print?.circulation || 0) >= filters.minCirculation!
        );
      }

      if (filters.minUniqueVisitors) {
        publications = publications.filter(p => 
          (p.metrics.online?.monthlyUniqueVisitors || 0) >= filters.minUniqueVisitors!
        );
      }

      if (filters.status?.length) {
        publications = publications.filter(p => 
          filters.status!.includes(p.status)
        );
      }

      return publications;
    } catch (error) {
      console.error('Error searching publications:', error);
      return [];
    }
  }

  /**
   * Lädt alle Publikationen eines Verlags
   */
  async getByPublisherId(
    publisherId: string,
    organizationId: string
  ): Promise<Publication[]> {
    return this.search(organizationId, { publisherId });
  }

  /**
   * Aktualisiert Metriken einer Publikation
   */
  async updateMetrics(
    publicationId: string,
    metrics: Partial<Publication['metrics']>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const publication = await this.getById(publicationId, context.organizationId);
    if (!publication) {
      throw new Error('Publikation nicht gefunden');
    }

    await this.update(
      publicationId,
      {
        metrics: {
          ...publication.metrics,
          ...metrics
        },
        lastVerificationAt: new Date()
      },
      context
    );
  }

  /**
   * Verifiziert eine Publikation
   */
  async verify(
    publicationId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    await this.update(
      publicationId,
      {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: context.userId,
        lastVerificationAt: new Date()
      },
      context
    );
  }

  /**
   * Lädt Publikationen nach Themenschwerpunkten
   */
  async getByFocusAreas(
    focusAreas: string[],
    organizationId: string,
    options?: {
      minRelevanceScore?: number;
      onlyVerified?: boolean;
    }
  ): Promise<Publication[]> {
    let publications = await this.searchPublications(
      organizationId,
      { focusAreas }
    );

    if (options?.onlyVerified) {
      publications = publications.filter(p => p.verified);
    }

    // Sortiere nach Relevanz (wie viele Focus Areas übereinstimmen)
    publications.sort((a, b) => {
      const aMatches = a.focusAreas.filter(area => 
        focusAreas.includes(area)
      ).length;
      const bMatches = b.focusAreas.filter(area => 
        focusAreas.includes(area)
      ).length;
      return bMatches - aMatches;
    });

    return publications;
  }

  /**
   * Importiert Publikationen mit Duplikat-Prüfung
   */
  async import(
    publications: Partial<Publication>[],
    context: { organizationId: string; userId: string },
    options: {
      duplicateCheck?: boolean;
      updateExisting?: boolean;
      defaultPublisherId?: string;
    } = {}
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
  }> {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; error: string }[]
    };

    for (let i = 0; i < publications.length; i++) {
      try {
        const publication = publications[i];
        
        // Basis-Validierung
        if (!publication.title?.trim()) {
          results.errors.push({
            row: i + 1,
            error: 'Titel fehlt'
          });
          continue;
        }

        // Default Publisher zuweisen
        if (options.defaultPublisherId && !publication.publisherId) {
          publication.publisherId = options.defaultPublisherId;
        }

        if (!publication.publisherId) {
          results.errors.push({
            row: i + 1,
            error: 'Verlag fehlt'
          });
          continue;
        }

        // Setze Defaults
        if (!publication.languages) {
          publication.languages = ['de'];
        }
        if (!publication.geographicTargets) {
          publication.geographicTargets = ['DE'];
        }
        if (!publication.focusAreas) {
          publication.focusAreas = [];
        }

        // Duplikat-Prüfung
        if (options.duplicateCheck) {
          const existing = await this.findDuplicate(
            publication,
            context.organizationId
          );

          if (existing) {
            if (options.updateExisting && existing.id) {
              await this.update(existing.id, publication, context);
              results.updated++;
            } else {
              results.skipped++;
            }
            continue;
          }
        }

        // Neue Publikation erstellen
        await this.create(publication as any, context);
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
   * Findet mögliche Duplikate
   */
  private async findDuplicate(
    publication: Partial<Publication>,
    organizationId: string
  ): Promise<Publication | null> {
    // Suche nach gleichem Titel beim gleichen Verlag
    if (publication.title && publication.publisherId) {
      const matches = await this.search(organizationId, {
        publisherId: publication.publisherId
      });
      
      const match = matches.find(p => 
        p.title.toLowerCase() === publication.title!.toLowerCase()
      );
      
      if (match) {
        return match;
      }
    }

    // Suche nach gleichen Identifikatoren
    if (publication.identifiers?.length) {
      for (const identifier of publication.identifiers) {
        const all = await this.getAll(organizationId);
        const match = all.find(p => 
          p.identifiers?.some(id => 
            id.type === identifier.type && 
            id.value === identifier.value
          )
        );
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  /**
   * Generiert Statistiken für Publikationen
   */
  async getStatistics(
    organizationId: string
  ): Promise<{
    totalPublications: number;
    byType: Record<PublicationType, number>;
    byCountry: Record<CountryCode, number>;
    byLanguage: Record<LanguageCode, number>;
    totalCirculation: number;
    totalOnlineReach: number;
  }> {
    const publications = await this.getAll(organizationId);
    
    const stats = {
      totalPublications: publications.length,
      byType: {} as Record<PublicationType, number>,
      byCountry: {} as Record<CountryCode, number>,
      byLanguage: {} as Record<LanguageCode, number>,
      totalCirculation: 0,
      totalOnlineReach: 0
    };

    publications.forEach(pub => {
      // Nach Typ
      stats.byType[pub.type] = (stats.byType[pub.type] || 0) + 1;
      
      // Nach Land
      pub.geographicTargets.forEach(country => {
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
      });
      
      // Nach Sprache
      pub.languages.forEach(lang => {
        stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      });
      
      // Gesamtreichweite
      if (pub.metrics.print?.circulation) {
        stats.totalCirculation += pub.metrics.print.circulation;
      }
      if (pub.metrics.online?.monthlyUniqueVisitors) {
        stats.totalOnlineReach += pub.metrics.online.monthlyUniqueVisitors;
      }
    });

    return stats;
  }
}

// ========================================
// Advertisement Service
// ========================================

class AdvertisementService extends BaseService<Advertisement> {
  constructor() {
    super('advertisements');
  }

  /**
   * Override: Hole alle Werbemittel mit Fallback für Legacy-Daten
   */
  async getAll(
    organizationId: string, 
    options: QueryOptions = {}
  ): Promise<Advertisement[]> {
    try {
      // Zuerst versuchen mit organizationId (neues Schema)
      const newResults = await super.getAll(organizationId, options);
      
      if (newResults.length > 0) {
        console.log(`✅ Found ${newResults.length} advertisements with organizationId`);
        return newResults;
      }
      
      // Fallback: Legacy-Daten mit organizationId = userId
      console.log('🔄 No advertisements found with organizationId, trying legacy userId...');
      return [];
      
    } catch (error) {
      console.error('Error in AdvertisementService.getAll:', error);
      return [];
    }
  }

  /**
   * Erstellt ein neues Werbemittel
   */
  async create(
    data: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Validierung
    if (!data.name?.trim()) {
      throw new Error('Name ist erforderlich');
    }

    if (!data.publicationIds || data.publicationIds.length === 0) {
      throw new Error('Mindestens eine Publikation muss zugeordnet werden');
    }

    if (!data.pricing?.listPrice) {
      throw new Error('Preis ist erforderlich');
    }

    // Setze Defaults
    if (!data.status) {
      data.status = 'draft';
    }

    if (!data.specifications) {
      data.specifications = {};
    }

    if (!data.availability) {
      data.availability = {};
    }

    if (!data.materials) {
      data.materials = {};
    }

    return super.create(data, context);
  }

  /**
   * Sucht Werbemittel mit Filtern
   */
  async searchAdvertisements(
    organizationId: string,
    filters: {
      search?: string;
      publicationIds?: string[];
      types?: AdvertisementType[];
      priceModels?: PriceModel[];
      minPrice?: number;
      maxPrice?: number;
      currency?: CurrencyCode;
      status?: string[];
      tags?: string[];
    },
    options: QueryOptions = {}
  ): Promise<Advertisement[]> {
    try {
      // Basis-Suche
      let advertisements = await this.getAll(organizationId, options);

      // Client-seitige Filterung
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        advertisements = advertisements.filter(ad => 
          ad.name.toLowerCase().includes(searchLower) ||
          ad.displayName?.toLowerCase().includes(searchLower) ||
          ad.description?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.publicationIds?.length) {
        advertisements = advertisements.filter(ad => 
          ad.publicationIds.some(id => 
            filters.publicationIds!.includes(id)
          )
        );
      }

      if (filters.types?.length) {
        advertisements = advertisements.filter(ad => 
          filters.types!.includes(ad.type)
        );
      }

      if (filters.priceModels?.length) {
        advertisements = advertisements.filter(ad => 
          filters.priceModels!.includes(ad.pricing.priceModel)
        );
      }

      if (filters.currency) {
        advertisements = advertisements.filter(ad => 
          ad.pricing.listPrice.currency === filters.currency
        );
      }

      if (filters.minPrice !== undefined) {
        advertisements = advertisements.filter(ad => 
          ad.pricing.listPrice.amount >= filters.minPrice!
        );
      }

      if (filters.maxPrice !== undefined) {
        advertisements = advertisements.filter(ad => 
          ad.pricing.listPrice.amount <= filters.maxPrice!
        );
      }

      if (filters.status?.length) {
        advertisements = advertisements.filter(ad => 
          filters.status!.includes(ad.status)
        );
      }

      if (filters.tags?.length) {
        advertisements = advertisements.filter(ad => 
          ad.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      return advertisements;
    } catch (error) {
      console.error('Error searching advertisements:', error);
      return [];
    }
  }

  /**
   * Lädt alle Werbemittel einer Publikation
   */
  async getByPublicationId(
    publicationId: string,
    organizationId: string
  ): Promise<Advertisement[]> {
    return this.searchAdvertisements(organizationId, {
      publicationIds: [publicationId]
    });
  }

  /**
   * Dupliziert ein Werbemittel
   */
  async duplicate(
    advertisementId: string,
    context: { organizationId: string; userId: string },
    options?: {
      newName?: string;
      targetPublicationIds?: string[];
    }
  ): Promise<string> {
    const original = await this.getById(advertisementId, context.organizationId);
    if (!original) {
      throw new Error('Werbemittel nicht gefunden');
    }

    // Entferne ID und System-Felder
    const { id, createdAt, updatedAt, createdBy, updatedBy, performance, ...data } = original;

    // Überschreibe mit Optionen
    const newData = {
      ...data,
      name: options?.newName || `${data.name} (Kopie)`,
      publicationIds: options?.targetPublicationIds || data.publicationIds,
      status: 'draft' as const,
      approval: undefined
    };

    return this.create(newData, context);
  }

  /**
   * Berechnet Preis mit Rabatten
   */
  calculatePrice(
    advertisement: Advertisement,
    options: {
      quantity?: number;
      bookingsPerYear?: number;
      daysInAdvance?: number;
      isAgency?: boolean;
      bundleWith?: AdvertisementType[];
    }
  ): {
    basePrice: number;
    discounts: { type: string; amount: number; percent: number }[];
    surcharges: { type: string; amount: number }[];
    totalPrice: number;
    currency: CurrencyCode;
  } {
    const result = {
      basePrice: advertisement.pricing.listPrice.amount,
      discounts: [] as { type: string; amount: number; percent: number }[],
      surcharges: [] as { type: string; amount: number }[],
      totalPrice: 0,
      currency: advertisement.pricing.listPrice.currency
    };

    let totalDiscount = 0;

    // Mengenrabatt
    if (options.quantity && advertisement.pricing.discounts?.volume) {
      const volumeDiscount = advertisement.pricing.discounts.volume
        .filter(v => options.quantity! >= v.threshold)
        .sort((a, b) => b.threshold - a.threshold)[0];
      
      if (volumeDiscount) {
        const discount = result.basePrice * (volumeDiscount.discountPercent / 100);
        totalDiscount += discount;
        result.discounts.push({
          type: 'Mengenrabatt',
          amount: discount,
          percent: volumeDiscount.discountPercent
        });
      }
    }

    // Frequenzrabatt
    if (options.bookingsPerYear && advertisement.pricing.discounts?.frequency) {
      const freqDiscount = advertisement.pricing.discounts.frequency
        .filter(f => options.bookingsPerYear! >= f.bookingsPerYear)
        .sort((a, b) => b.bookingsPerYear - a.bookingsPerYear)[0];
      
      if (freqDiscount) {
        const discount = result.basePrice * (freqDiscount.discountPercent / 100);
        totalDiscount += discount;
        result.discounts.push({
          type: 'Frequenzrabatt',
          amount: discount,
          percent: freqDiscount.discountPercent
        });
      }
    }

    // Agenturprovision
    if (options.isAgency && advertisement.pricing.discounts?.agency) {
      const discount = result.basePrice * (advertisement.pricing.discounts.agency / 100);
      totalDiscount += discount;
      result.discounts.push({
        type: 'Agenturprovision',
        amount: discount,
        percent: advertisement.pricing.discounts.agency
      });
    }

    // Frühbucherrabatt
    if (options.daysInAdvance && advertisement.pricing.discounts?.earlyBooking) {
      if (options.daysInAdvance >= advertisement.pricing.discounts.earlyBooking.daysInAdvance) {
        const discount = result.basePrice * (advertisement.pricing.discounts.earlyBooking.discountPercent / 100);
        totalDiscount += discount;
        result.discounts.push({
          type: 'Frühbucherrabatt',
          amount: discount,
          percent: advertisement.pricing.discounts.earlyBooking.discountPercent
        });
      }
    }

    // Aufpreise
    advertisement.pricing.surcharges?.forEach(surcharge => {
      let amount: number;
      if (typeof surcharge.amount === 'number') {
        // Prozent-Aufpreis
        amount = result.basePrice * (surcharge.amount / 100);
      } else {
        // Fester Betrag (gleiche Währung angenommen)
        amount = surcharge.amount.amount;
      }
      
      result.surcharges.push({
        type: surcharge.type,
        amount
      });
    });

    // Gesamtpreis berechnen
    const totalSurcharge = result.surcharges.reduce((sum, s) => sum + s.amount, 0);
    result.totalPrice = result.basePrice - totalDiscount + totalSurcharge;

    // Mit Menge multiplizieren
    if (options.quantity) {
      result.totalPrice *= options.quantity;
    }

    return result;
  }

  /**
   * Prüft Verfügbarkeit
   */
  isAvailable(
    advertisement: Advertisement,
    date: Date
  ): {
    available: boolean;
    reason?: string;
  } {
    const availability = advertisement.availability;

    // Prüfe Start/End Datum
    if (availability.startDate && date < availability.startDate) {
      return {
        available: false,
        reason: `Verfügbar ab ${availability.startDate.toLocaleDateString('de-DE')}`
      };
    }

    if (availability.endDate && date > availability.endDate) {
      return {
        available: false,
        reason: `Nur verfügbar bis ${availability.endDate.toLocaleDateString('de-DE')}`
      };
    }

    // Prüfe Blackout-Dates
    if (availability.blackoutDates) {
      for (const blackout of availability.blackoutDates) {
        if (date >= blackout.start && date <= blackout.end) {
          return {
            available: false,
            reason: blackout.reason || 'Nicht verfügbar in diesem Zeitraum'
          };
        }
      }
    }

    return { available: true };
  }

  /**
   * Aktualisiert Performance-Metriken
   */
  async updatePerformance(
    advertisementId: string,
    booking: {
      revenue: number;
      currency: CurrencyCode;
      impressions?: number;
      clicks?: number;
      date: Date;
    },
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const ad = await this.getById(advertisementId, context.organizationId);
    if (!ad) {
      throw new Error('Werbemittel nicht gefunden');
    }

    const performance = ad.performance || {
      totalBookings: 0,
      totalRevenue: { amount: 0, currency: booking.currency }
    };

    // Update aggregierte Metriken
    performance.totalBookings = (performance.totalBookings || 0) + 1;
    
    // Währungsumrechnung würde hier stattfinden
    if (performance.totalRevenue?.currency === booking.currency) {
      performance.totalRevenue.amount += booking.revenue;
    }

    if (booking.impressions && booking.clicks) {
      const ctr = (booking.clicks / booking.impressions) * 100;
      performance.avgCtr = performance.avgCtr 
        ? (performance.avgCtr + ctr) / 2 
        : ctr;
    }

    performance.lastBookingDate = booking.date;

    await this.update(
      advertisementId,
      { performance },
      context
    );
  }
}

// ========================================
// Media Kit Service
// ========================================

class MediaKitService extends BaseService<MediaKit> {
  constructor() {
    super('media_kits');
  }

  /**
   * Erstellt ein neues Media Kit
   */
  async create(
    data: Omit<MediaKit, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Validierung
    if (!data.name?.trim()) {
      throw new Error('Name ist erforderlich');
    }

    if (!data.companyId) {
      throw new Error('Verlag/Medienhaus ist erforderlich');
    }

    // Setze Defaults
    if (!data.settings) {
      data.settings = {
        showPricing: true,
        showDemographics: true,
        showExamples: true
      };
    }

    return super.create(data, context);
  }

  /**
   * Generiert Media Kit für ein Unternehmen
   */
  async generateForCompany(
    companyId: string,
    context: { organizationId: string; userId: string },
    options: {
      name?: string;
      includedPublicationIds?: string[];
      includedAdvertisementIds?: string[];
      language?: LanguageCode;
      template?: string;
    } = {}
  ): Promise<string> {
    // Lade Firma
    const company = await getDoc(doc(db, 'companies', companyId));
    if (!company.exists() || company.data().organizationId !== context.organizationId) {
      throw new Error('Firma nicht gefunden');
    }

    const companyData = company.data();

    // Lade alle Publikationen und Werbemittel der Firma
    const publicationService = new PublicationService();
    const advertisementService = new AdvertisementService();

    const [publications, advertisements] = await Promise.all([
      publicationService.getByPublisherId(companyId, context.organizationId),
      advertisementService.getAll(context.organizationId)
    ]);

    // Filtere Werbemittel für diese Publikationen
    const relevantAds = advertisements.filter(ad => 
      ad.publicationIds.some(pubId => 
        publications.some(pub => pub.id === pubId)
      )
    );

    // Erstelle Media Kit
    const mediaKitData: Omit<MediaKit, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'> = {
      name: options.name || `Media Kit ${companyData.name} ${new Date().getFullYear()}`,
      companyId,
      companyName: companyData.name,
      version: `${new Date().getFullYear()}.1`,
      validFrom: new Date(),
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      
      publications: publications
        .filter(pub => !options.includedPublicationIds || options.includedPublicationIds.includes(pub.id!))
        .map(pub => ({
          publicationId: pub.id!,
          included: true
        })),
      
      advertisements: relevantAds
        .filter(ad => !options.includedAdvertisementIds || options.includedAdvertisementIds.includes(ad.id!))
        .map(ad => ({
          advertisementId: ad.id!,
          included: true
        })),
      
      documents: [{
        type: 'full',
        language: options.language || 'de',
        format: 'pdf',
        template: options.template
      }],
      
      settings: {
        showPricing: true,
        showDemographics: true,
        showExamples: true,
        customBranding: {
          logoUrl: companyData.logoUrl
        }
      },
      
      organizationId: context.organizationId
    };

    const mediaKitId = await this.create(mediaKitData, context);

    // TODO: Trigger PDF-Generierung
    // await this.generatePDF(mediaKitId, context);

    return mediaKitId;
  }

  /**
   * Teilt Media Kit
   */
  async share(
    mediaKitId: string,
    emails: string[],
    context: { organizationId: string; userId: string },
    options?: {
      password?: string;
      message?: string;
    }
  ): Promise<void> {
    const mediaKit = await this.getById(mediaKitId, context.organizationId);
    if (!mediaKit) {
      throw new Error('Media Kit nicht gefunden');
    }

    // Generiere Share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/media-kit/${mediaKitId}`;

    // Update Distribution Info
    const distribution = mediaKit.distribution || {
      isPublic: false,
      sharedWith: []
    };

    distribution.shareUrl = shareUrl;
    if (options?.password) {
      distribution.password = options.password; // In Produktion: Hash!
    }

    // Füge neue Empfänger hinzu
    emails.forEach(email => {
      if (!distribution.sharedWith?.some(s => s.email === email)) {
        distribution.sharedWith = distribution.sharedWith || [];
        distribution.sharedWith.push({
          email,
          sharedAt: new Date()
        });
      }
    });

    await this.update(
      mediaKitId,
      { distribution },
      context
    );

    // TODO: E-Mails versenden
  }

  /**
   * Lädt Media Kits für ein Unternehmen
   */
  async getByCompanyId(
    companyId: string,
    organizationId: string
  ): Promise<MediaKit[]> {
    return this.search(organizationId, { companyId });
  }
}

// ========================================
// Extended Publication Service mit References
// ========================================

/**
 * ✨ Extended Publication Service mit Multi-Entity References
 *
 * Inkludiert Publication-References transparent in getAll()
 */
class PublicationServiceExtended extends PublicationService {
  /**
   * ✨ ENHANCED: getAll() erweitert um Publication-References
   */
  async getAll(organizationId: string, options?: any): Promise<Publication[]> {
    try {
      // 1. Lade echte Publications (wie bisher)
      const realPublications = await super.getAll(organizationId, options);

      // 2. Lade Publication-References
      const pubRefsQuery = query(
        collection(db, 'organizations', organizationId, 'publication_references'),
        where('isActive', '==', true)
      );
      const pubRefsSnapshot = await getDocs(pubRefsQuery);

      // 3. Konvertiere References zu Publication-Format
      const publicationReferences: Publication[] = [];
      for (const refDoc of pubRefsSnapshot.docs) {
        const ref = refDoc.data();

        // Lade globale Publication-Daten
        const globalPubDoc = await getDoc(doc(db, 'publications', ref.globalPublicationId));
        if (!globalPubDoc.exists()) continue;

        const globalPub = globalPubDoc.data();
        console.log('🔍 Debug: Globale Publication Rohdaten:', {
          title: globalPub.title,
          frequency: globalPub.frequency,
          circulation: globalPub.circulation,
          readership: globalPub.readership,
          monthlyUniqueVisitors: globalPub.monthlyUniqueVisitors,
          monthlyPageViews: globalPub.monthlyPageViews,
          metricsObject: globalPub.metrics,
          allFields: Object.keys(globalPub)
        });

        // Lade Publisher-Name (Company-Daten) direkt aus Firestore
        let publisherName = globalPub.publisherName || '';
        if (globalPub.publisherId && !publisherName) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', globalPub.publisherId));
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();
              publisherName = companyData?.companyName || companyData?.name || '';
            }
          } catch (error) {
            console.warn('⚠️ Publisher-Name konnte nicht geladen werden:', error);
          }
        }

        // Erstelle Publication aus Reference + globalen Daten (mit korrektem Schema)
        const publicationReference = {
          id: refDoc.id, // Document ID für Navigation verwenden
          title: globalPub.title || 'Unbekannte Publikation',
          subtitle: globalPub.subtitle || '',
          type: globalPub.type || 'magazine',
          format: globalPub.format || 'online',
          website: globalPub.website || '',
          websiteUrl: globalPub.websiteUrl || globalPub.website || '',
          description: globalPub.description || '',
          publisherName, // Publisher-Name hinzufügen

          // Geografische und sprachliche Daten
          geographicTargets: globalPub.geographicTargets || [],
          geographicScope: globalPub.geographicScope || 'national',
          languages: globalPub.languages || [],

          // Content-Kategorien
          focusAreas: globalPub.focusAreas || [],

          // Status und Verifikation
          verified: globalPub.verified || false,
          status: globalPub.status || 'active',

          // Metrics-Schema (von globalPub.metrics lesen)
          metrics: {
            frequency: globalPub.metrics?.frequency || globalPub.frequency || 'monthly',
            targetAudience: globalPub.metrics?.targetAudience || globalPub.targetAudience || '',
            targetAgeGroup: globalPub.metrics?.targetAgeGroup || globalPub.targetAgeGroup || '',
            targetGender: globalPub.metrics?.targetGender || globalPub.targetGender || 'all',
            print: {
              circulation: globalPub.metrics?.print?.circulation || globalPub.circulation || 0,
              circulationType: globalPub.metrics?.print?.circulationType || globalPub.circulationType || ''
            },
            online: {
              monthlyUniqueVisitors: globalPub.metrics?.online?.monthlyUniqueVisitors || globalPub.readership || globalPub.monthlyUniqueVisitors || 0,
              monthlyPageViews: globalPub.metrics?.online?.monthlyPageViews || globalPub.monthlyPageViews || 0
            }
          },

          // Company-Zuordnung
          companyId: ref.parentCompanyReferenceId,
          publisherId: ref.parentCompanyReferenceId,

          // Reference-Marker
          _isReference: true,
          _globalPublicationId: ref.globalPublicationId,

          // Meta-Felder
          organizationId: organizationId,
          createdAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
          createdBy: ref.addedBy,
          updatedAt: ref.addedAt instanceof Timestamp ? ref.addedAt : Timestamp.now(),
          updatedBy: ref.addedBy
        } as Publication & { _isReference: boolean; _globalPublicationId: string };

        console.log('📊 Debug: Erstellte Publication-Reference:', {
          title: publicationReference.title,
          metrics: publicationReference.metrics,
          geographicTargets: publicationReference.geographicTargets,
          hasMetrics: !!publicationReference.metrics,
          hasOnlineMetrics: !!publicationReference.metrics?.online,
          monthlyUniqueVisitors: publicationReference.metrics?.online?.monthlyUniqueVisitors
        });

        publicationReferences.push(publicationReference);
      }

      // 4. Kombiniere echte Publications und References
      const allPublications = [...realPublications, ...publicationReferences];

      console.log('📊 ENHANCED PUBLICATIONS SERVICE:', {
        realPublications: realPublications.length,
        referencedPublications: publicationReferences.length,
        totalPublications: allPublications.length,
        organizationId
      });

      return allPublications;
    } catch (error) {
      console.error('Fehler in PublicationServiceExtended.getAll:', error);
      // Fallback zu normaler getAll() wenn Fehler
      return super.getAll(organizationId, options);
    }
  }

  /**
   * ✨ ENHANCED: getById() erweitert um Publication-References
   */
  async getById(publicationId: string, organizationId: string): Promise<Publication | null> {
    try {
      console.log('🔍 Enhanced getById für Publication:', { publicationId, organizationId });

      // 1. Versuche zuerst echte Publication zu laden
      const realPublication = await super.getById(publicationId, organizationId);
      if (realPublication) {
        console.log('✅ Echte Publication gefunden:', realPublication.title);
        return realPublication;
      }

      // 2. Suche in Publication-References
      const { multiEntityService } = await import('./multi-entity-reference-service');
      const referenceData = await multiEntityService.loadPublicationReference(publicationId, organizationId);

      if (referenceData) {
        console.log('✅ Publication-Reference gefunden:', referenceData.title);
        return referenceData;
      }

      console.log('❌ Keine Publication oder Reference gefunden für ID:', publicationId);
      return null;
    } catch (error) {
      console.error('Fehler in PublicationServiceExtended.getById:', error);
      // Fallback zu normaler getById() wenn Fehler
      return super.getById(publicationId, organizationId);
    }
  }
}

// ========================================
// Export Service Instanzen
// ========================================

export const publicationService = new PublicationServiceExtended();
export const advertisementService = new AdvertisementService();
export const mediaKitService = new MediaKitService();

// Convenience Exports
export const libraryService = {
  publications: publicationService,
  advertisements: advertisementService,
  mediaKits: mediaKitService
};