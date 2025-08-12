// src/lib/api/publications-api-service.ts
import { 
  publicationService, 
  advertisementService,
  mediaKitService 
} from '@/lib/firebase/library-service';
import { companyServiceEnhanced } from '@/lib/firebase/company-service-enhanced';
import {
  APIPublication,
  APIPublicationListResponse,
  APIPublicationCreateRequest,
  APIPublicationUpdateRequest,
  APIPublicationBulkCreateRequest,
  APIPublicationBulkCreateResponse,
  APIPublicationSearchParams,
  APIPublicationsStatistics,
  APIMediaAsset,
  APIMediaAssetListResponse,
  APIMediaAssetCreateRequest,
  APIMediaAssetSearchParams,
  APIMediaKit,
  APIMediaKitGenerateRequest,
  APIMediaKitShareRequest
} from '@/types/api-publications';
import { 
  Publication, 
  Advertisement,
  MediaKit,
  PublicationType,
  PublicationFormat,
  PublicationFrequency
} from '@/types/library';
import { APIError } from '@/lib/api/api-errors';
import { eventManager } from '@/lib/api/event-manager';

/**
 * Publications API Service
 * Handles all publication-related API operations
 */
export class PublicationsAPIService {
  
  /**
   * Holt alle Publikationen mit Filtern und Pagination
   */
  async getPublications(
    organizationId: string,
    userId: string,
    params: APIPublicationSearchParams
  ): Promise<APIPublicationListResponse> {
    try {
      // Basis-Suche mit Service
      const searchFilters = {
        search: params.search,
        publisherIds: params.publisherIds,
        types: params.types,
        formats: params.formats,
        languages: params.languages,
        countries: params.countries,
        focusAreas: params.focusAreas,
        minCirculation: params.minCirculation,
        minUniqueVisitors: params.minMonthlyVisitors,
        status: params.status
      };

      const publications = await publicationService.searchPublications(
        organizationId,
        searchFilters,
        {
          limit: params.limit || 50,
          orderBy: params.sortBy ? {
            field: params.sortBy,
            direction: params.sortOrder || 'asc'
          } : undefined
        }
      );

      // Filter für verified
      let filteredPublications = publications;
      if (params.onlyVerified) {
        filteredPublications = publications.filter(p => p.verified);
      }

      // Pagination
      const page = params.page || 1;
      const limit = params.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPublications = filteredPublications.slice(startIndex, endIndex);

      // Transform zu API-Format
      const apiPublications = await Promise.all(
        paginatedPublications.map(pub => this.transformToAPIPublication(pub, params.expand))
      );

      return {
        publications: apiPublications,
        total: filteredPublications.length,
        page,
        limit,
        hasNext: endIndex < filteredPublications.length,
        filters: {
          types: params.types,
          languages: params.languages,
          countries: params.countries,
          publisherIds: params.publisherIds
        }
      };
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Publikationen',
        error
      );
    }
  }

  /**
   * Holt eine einzelne Publikation
   */
  async getPublicationById(
    publicationId: string,
    organizationId: string,
    userId: string,
    expand?: string[]
  ): Promise<APIPublication> {
    try {
      const publication = await publicationService.getById(publicationId, organizationId);
      
      if (!publication) {
        throw new APIError('NOT_FOUND', 'Publikation nicht gefunden');
      }

      return this.transformToAPIPublication(publication, expand);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Publikation',
        error
      );
    }
  }

  /**
   * Erstellt eine neue Publikation
   */
  async createPublication(
    data: APIPublicationCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIPublication> {
    try {
      // Validierung
      if (!data.title?.trim()) {
        throw new APIError('VALIDATION_ERROR', 'Titel ist erforderlich');
      }

      if (!data.publisherId) {
        throw new APIError('VALIDATION_ERROR', 'Verlag ist erforderlich');
      }

      // Prüfe ob Verlag existiert
      const publisher = await companyServiceEnhanced.getById(data.publisherId, organizationId);
      if (!publisher) {
        throw new APIError('VALIDATION_ERROR', 'Verlag nicht gefunden');
      }

      // Erstelle Publikation
      const publicationData: Omit<Publication, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'> = {
        title: data.title,
        subtitle: data.subtitle,
        publisherId: data.publisherId,
        publisherName: publisher.name,
        type: data.type,
        format: data.format,
        languages: data.languages,
        geographicTargets: data.countries,
        geographicScope: data.geographicScope || 'national',
        focusAreas: data.focusAreas || [],
        targetIndustries: data.targetIndustries || [],
        status: data.status || 'active',
        verified: false,
        metrics: {
          frequency: data.frequency,
          targetAudience: data.metrics?.targetAudience,
          print: data.metrics?.circulation ? {
            circulation: data.metrics.circulation,
            circulationType: data.metrics.circulationType as any || 'printed'
          } : undefined,
          online: data.metrics?.monthlyUniqueVisitors ? {
            monthlyUniqueVisitors: data.metrics.monthlyUniqueVisitors,
            monthlyPageViews: data.metrics.monthlyPageViews
          } : undefined
        },
        organizationId
      };

      const publicationId = await publicationService.create(
        publicationData,
        { organizationId, userId }
      );

      // Hole die erstellte Publikation
      const created = await publicationService.getById(publicationId, organizationId);
      if (!created) {
        throw new APIError('INTERNAL_SERVER_ERROR', 'Publikation konnte nicht erstellt werden');
      }

      // Triggere Webhook-Event
      await eventManager.triggerPublicationEvent(
        'created',
        created,
        organizationId,
        { userId, source: 'api' }
      );

      return this.transformToAPIPublication(created);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Erstellen der Publikation',
        error
      );
    }
  }

  /**
   * Bulk-Import von Publikationen
   */
  async bulkCreatePublications(
    data: APIPublicationBulkCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIPublicationBulkCreateResponse> {
    try {
      const results: APIPublicationBulkCreateResponse = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        publicationIds: []
      };

      // Verarbeite jede Publikation
      for (let i = 0; i < data.publications.length; i++) {
        try {
          const publication = data.publications[i];
          
          // Wenn Default Publisher gesetzt, verwende diesen
          if (data.options?.defaultPublisherId && !publication.publisherId) {
            publication.publisherId = data.options.defaultPublisherId;
          }

          // Duplikatsprüfung wenn aktiviert
          if (data.options?.duplicateCheck) {
            const existing = await this.findDuplicatePublication(
              publication,
              organizationId
            );

            if (existing) {
              if (data.options.updateExisting) {
                await this.updatePublication(
                  existing.id!,
                  publication,
                  organizationId,
                  userId
                );
                results.updated++;
                results.publicationIds.push(existing.id!);
              } else {
                results.skipped++;
              }
              continue;
            }
          }

          // Erstelle neue Publikation
          const created = await this.createPublication(
            publication,
            organizationId,
            userId
          );
          results.created++;
          results.publicationIds.push(created.id);
        } catch (error) {
          results.errors.push({
            index: i,
            title: data.publications[i].title,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      }

      return results;
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Bulk-Import',
        error
      );
    }
  }

  /**
   * Aktualisiert eine Publikation
   */
  async updatePublication(
    publicationId: string,
    data: APIPublicationUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIPublication> {
    try {
      // Hole bestehende Publikation
      const existing = await publicationService.getById(publicationId, organizationId);
      if (!existing) {
        throw new APIError('NOT_FOUND', 'Publikation nicht gefunden');
      }

      // Prepare update data
      const updateData: Partial<Publication> = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.format !== undefined) updateData.format = data.format;
      if (data.languages !== undefined) updateData.languages = data.languages;
      if (data.countries !== undefined) updateData.geographicTargets = data.countries;
      if (data.focusAreas !== undefined) updateData.focusAreas = data.focusAreas;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.verified !== undefined) updateData.verified = data.verified;

      // Update metrics if provided
      if (data.metrics) {
        updateData.metrics = {
          ...existing.metrics,
          frequency: data.frequency || existing.metrics.frequency,
          targetAudience: data.metrics.targetAudience || existing.metrics.targetAudience,
          print: data.metrics.circulation ? {
            ...existing.metrics.print,
            circulation: data.metrics.circulation,
            circulationType: data.metrics.circulationType as any || existing.metrics.print?.circulationType || 'printed'
          } : existing.metrics.print,
          online: data.metrics.monthlyUniqueVisitors ? {
            ...existing.metrics.online,
            monthlyUniqueVisitors: data.metrics.monthlyUniqueVisitors,
            monthlyPageViews: data.metrics.monthlyPageViews
          } : existing.metrics.online
        };
      }

      // Update publication
      await publicationService.update(
        publicationId,
        updateData,
        { organizationId, userId }
      );

      // Return updated publication
      const updated = await publicationService.getById(publicationId, organizationId);
      if (!updated) {
        throw new APIError('INTERNAL_SERVER_ERROR', 'Publikation konnte nicht aktualisiert werden');
      }

      // Triggere Webhook-Event
      await eventManager.triggerPublicationEvent(
        'updated',
        updated,
        organizationId,
        { userId, source: 'api' }
      );

      // Wenn verified status geändert wurde, triggere auch verified event
      if (data.verified === true && existing.verified !== true) {
        await eventManager.triggerPublicationEvent(
          'verified',
          updated,
          organizationId,
          { userId, source: 'api' }
        );
      }

      return this.transformToAPIPublication(updated);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Aktualisieren der Publikation',
        error
      );
    }
  }

  /**
   * Löscht eine Publikation
   */
  async deletePublication(
    publicationId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Prüfe ob Publikation existiert
      const publication = await publicationService.getById(publicationId, organizationId);
      if (!publication) {
        throw new APIError('NOT_FOUND', 'Publikation nicht gefunden');
      }

      // Prüfe ob Werbemittel verknüpft sind
      const linkedAds = await advertisementService.getByPublicationId(
        publicationId,
        organizationId
      );

      if (linkedAds.length > 0) {
        throw new APIError(
          'CONFLICT',
          `Publikation kann nicht gelöscht werden. ${linkedAds.length} Werbemittel sind verknüpft.`
        );
      }

      // Soft delete
      await publicationService.delete(
        publicationId,
        { organizationId, userId }
      );

      // Triggere Webhook-Event
      await eventManager.triggerPublicationEvent(
        'deleted',
        publication,
        organizationId,
        { userId, source: 'api' }
      );
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Löschen der Publikation',
        error
      );
    }
  }

  /**
   * Holt Statistiken für Publikationen
   */
  async getPublicationsStatistics(
    organizationId: string,
    userId: string
  ): Promise<APIPublicationsStatistics> {
    try {
      const stats = await publicationService.getStatistics(organizationId);
      
      // Hole Top-Publisher
      const companies = await companyServiceEnhanced.getAll(organizationId);
      const publisherStats = new Map<string, { name: string; count: number }>();
      
      const publications = await publicationService.getAll(organizationId);
      publications.forEach(pub => {
        const current = publisherStats.get(pub.publisherId) || {
          name: pub.publisherName || 'Unbekannt',
          count: 0
        };
        current.count++;
        publisherStats.set(pub.publisherId, current);
      });

      const topPublishers = Array.from(publisherStats.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top Focus Areas
      const focusAreaCounts = new Map<string, number>();
      publications.forEach(pub => {
        pub.focusAreas.forEach(area => {
          focusAreaCounts.set(area, (focusAreaCounts.get(area) || 0) + 1);
        });
      });

      const topFocusAreas = Array.from(focusAreaCounts.entries())
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Format counts
      const byFormat: Record<PublicationFormat, number> = {
        print: 0,
        online: 0,
        both: 0,
        broadcast: 0
      };
      
      publications.forEach(pub => {
        byFormat[pub.format] = (byFormat[pub.format] || 0) + 1;
      });

      return {
        totalPublications: stats.totalPublications,
        byType: stats.byType,
        byCountry: stats.byCountry,
        byLanguage: stats.byLanguage,
        byFormat,
        totalCirculation: stats.totalCirculation,
        totalOnlineReach: stats.totalOnlineReach,
        verifiedCount: publications.filter(p => p.verified).length,
        activeCount: publications.filter(p => p.status === 'active').length,
        topPublishers,
        topFocusAreas
      };
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Statistiken',
        error
      );
    }
  }

  // ========================================
  // Media Assets Methods
  // ========================================

  /**
   * Holt alle Media Assets mit Filtern
   */
  async getMediaAssets(
    organizationId: string,
    userId: string,
    params: APIMediaAssetSearchParams
  ): Promise<APIMediaAssetListResponse> {
    try {
      const searchFilters = {
        search: params.search,
        publicationIds: params.publicationIds,
        types: params.types,
        priceModels: params.priceModels,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        currency: params.currency,
        status: params.status,
        tags: params.tags
      };

      const assets = await advertisementService.searchAdvertisements(
        organizationId,
        searchFilters,
        {
          limit: params.limit || 50,
          orderBy: params.sortBy ? {
            field: params.sortBy === 'bookings' ? 'performance.totalBookings' : params.sortBy,
            direction: params.sortOrder || 'asc'
          } : undefined
        }
      );

      // Pagination
      const page = params.page || 1;
      const limit = params.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAssets = assets.slice(startIndex, endIndex);

      // Transform zu API-Format
      const apiAssets = await Promise.all(
        paginatedAssets.map(asset => this.transformToAPIMediaAsset(asset, organizationId))
      );

      return {
        assets: apiAssets,
        total: assets.length,
        page,
        limit,
        hasNext: endIndex < assets.length
      };
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Media Assets',
        error
      );
    }
  }

  /**
   * Erstellt ein neues Media Asset
   */
  async createMediaAsset(
    data: APIMediaAssetCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIMediaAsset> {
    try {
      // Validierung
      if (!data.name?.trim()) {
        throw new APIError('VALIDATION_ERROR', 'Name ist erforderlich');
      }

      if (!data.publicationIds || data.publicationIds.length === 0) {
        throw new APIError('VALIDATION_ERROR', 'Mindestens eine Publikation muss zugeordnet werden');
      }

      // Prüfe ob Publikationen existieren
      for (const pubId of data.publicationIds) {
        const pub = await publicationService.getById(pubId, organizationId);
        if (!pub) {
          throw new APIError('VALIDATION_ERROR', `Publikation ${pubId} nicht gefunden`);
        }
      }

      // Erstelle Advertisement
      const assetData: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'> = {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        publicationIds: data.publicationIds,
        type: data.type,
        category: data.category,
        tags: data.tags,
        pricing: data.pricing,
        specifications: data.specifications,
        availability: data.availability as any,
        status: data.status || 'draft',
        organizationId
      };

      const assetId = await advertisementService.create(
        assetData,
        { organizationId, userId }
      );

      // Hole das erstellte Asset
      const created = await advertisementService.getById(assetId, organizationId);
      if (!created) {
        throw new APIError('INTERNAL_SERVER_ERROR', 'Media Asset konnte nicht erstellt werden');
      }

      // Triggere Webhook-Event
      await eventManager.triggerMediaAssetEvent(
        'created',
        created,
        organizationId,
        { userId, source: 'api' }
      );

      return this.transformToAPIMediaAsset(created, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Erstellen des Media Assets',
        error
      );
    }
  }

  // ========================================
  // Media Kit Methods
  // ========================================

  /**
   * Generiert ein Media Kit
   */
  async generateMediaKit(
    data: APIMediaKitGenerateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIMediaKit> {
    try {
      const mediaKitId = await mediaKitService.generateForCompany(
        data.companyId,
        { organizationId, userId },
        {
          name: data.name,
          includedPublicationIds: data.includedPublicationIds,
          includedAdvertisementIds: data.includedAdvertisementIds,
          language: data.language,
          template: data.template
        }
      );

      const mediaKit = await mediaKitService.getById(mediaKitId, organizationId);
      if (!mediaKit) {
        throw new APIError('INTERNAL_SERVER_ERROR', 'Media Kit konnte nicht generiert werden');
      }

      // Triggere Webhook-Event
      await eventManager.triggerMediaKitEvent(
        'created',
        mediaKit,
        organizationId,
        { userId, source: 'api' }
      );

      return this.transformToAPIMediaKit(mediaKit);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Generieren des Media Kits',
        error
      );
    }
  }

  /**
   * Teilt ein Media Kit
   */
  async shareMediaKit(
    mediaKitId: string,
    data: APIMediaKitShareRequest,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      await mediaKitService.share(
        mediaKitId,
        data.emails,
        { organizationId, userId },
        {
          password: data.password,
          message: data.message
        }
      );

      // Triggere Webhook-Event
      const mediaKit = await mediaKitService.getById(mediaKitId, organizationId);
      if (mediaKit) {
        await eventManager.triggerMediaKitEvent(
          'shared',
          mediaKit,
          organizationId,
          { userId, source: 'api', recipients: data.emails }
        );
      }
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Teilen des Media Kits',
        error
      );
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Transformiert eine Publication zu API-Format
   */
  private async transformToAPIPublication(
    publication: Publication,
    expand?: string[]
  ): Promise<APIPublication> {
    // Lade Publisher-Daten wenn vorhanden
    let publisher = {
      id: publication.publisherId,
      name: publication.publisherName || 'Unbekannt',
      logoUrl: undefined as string | undefined
    };

    if (expand?.includes('publisher')) {
      try {
        // Use safe companies service
        const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
        const company = await safeCompaniesService.getCompanyById(
          publication.publisherId,
          publication.organizationId!
        );
        if (company) {
          publisher = {
            id: company.id!,
            name: company.name,
            logoUrl: company.logoUrl
          };
        }
      } catch (error) {
        // Publisher nicht gefunden, verwende Fallback
      }
    }

    const apiPublication: APIPublication = {
      id: publication.id!,
      title: publication.title,
      subtitle: publication.subtitle,
      publisher,
      type: publication.type,
      format: publication.format,
      frequency: publication.metrics.frequency,
      metrics: {
        circulation: publication.metrics.print?.circulation,
        circulationType: publication.metrics.print?.circulationType,
        monthlyUniqueVisitors: publication.metrics.online?.monthlyUniqueVisitors,
        monthlyPageViews: publication.metrics.online?.monthlyPageViews,
        targetAudience: publication.metrics.targetAudience
      },
      languages: publication.languages,
      countries: publication.geographicTargets,
      geographicScope: publication.geographicScope,
      focusAreas: publication.focusAreas,
      targetIndustries: publication.targetIndustries,
      status: publication.status || 'active',
      verified: publication.verified || false,
      verifiedAt: publication.verifiedAt?.toDate?.()?.toISOString() || publication.verifiedAt?.toISOString?.() || undefined,
      createdAt: publication.createdAt?.toDate?.()?.toISOString() || publication.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: publication.updatedAt?.toDate?.()?.toISOString() || publication.updatedAt?.toISOString?.() || new Date().toISOString(),
      website: publication.website,
      mediaKitUrl: publication.mediaKitUrl
    };

    // Erweiterte Details wenn angefordert
    if (expand?.length) {
      apiPublication._expanded = {};
      
      if (expand.includes('editions')) {
        apiPublication._expanded.editions = publication.editions;
      }
      
      if (expand.includes('contacts')) {
        apiPublication._expanded.editorialContacts = publication.editorialContacts;
      }
      
      if (expand.includes('guidelines')) {
        apiPublication._expanded.submissionGuidelines = publication.submissionGuidelines;
      }
    }

    return apiPublication;
  }

  /**
   * Transformiert ein Advertisement zu API Media Asset
   */
  private async transformToAPIMediaAsset(
    asset: Advertisement,
    organizationId: string
  ): Promise<APIMediaAsset> {
    // Lade Publikations-Informationen
    const publications = await Promise.all(
      asset.publicationIds.map(async (pubId) => {
        try {
          const pub = await publicationService.getById(pubId, organizationId);
          return pub ? { id: pubId, title: pub.title } : { id: pubId, title: 'Unbekannt' };
        } catch {
          return { id: pubId, title: 'Unbekannt' };
        }
      })
    );

    return {
      id: asset.id!,
      name: asset.name,
      displayName: asset.displayName,
      description: asset.description,
      publications,
      type: asset.type,
      category: asset.category,
      tags: asset.tags,
      pricing: asset.pricing,
      specifications: asset.specifications,
      availability: asset.availability ? {
        startDate: asset.availability.startDate?.toDate?.()?.toISOString() || asset.availability.startDate?.toISOString?.() || undefined,
        endDate: asset.availability.endDate?.toDate?.()?.toISOString() || asset.availability.endDate?.toISOString?.() || undefined,
        leadTime: asset.availability.leadTime,
        bookingDeadline: asset.availability.bookingDeadline
      } : undefined,
      performance: asset.performance,
      status: asset.status,
      createdAt: asset.createdAt?.toDate?.()?.toISOString() || asset.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: asset.updatedAt?.toDate?.()?.toISOString() || asset.updatedAt?.toISOString?.() || new Date().toISOString()
    };
  }

  /**
   * Transformiert ein MediaKit zu API-Format
   */
  private transformToAPIMediaKit(mediaKit: MediaKit): APIMediaKit {
    return {
      id: mediaKit.id!,
      name: mediaKit.name,
      version: mediaKit.version,
      company: {
        id: mediaKit.companyId,
        name: mediaKit.companyName || 'Unbekannt',
        logoUrl: mediaKit.settings?.customBranding?.logoUrl
      },
      validFrom: mediaKit.validFrom?.toDate?.()?.toISOString() || mediaKit.validFrom?.toISOString?.() || new Date().toISOString(),
      validUntil: mediaKit.validUntil?.toDate?.()?.toISOString() || mediaKit.validUntil?.toISOString?.() || undefined,
      publications: mediaKit.publications.map(p => ({
        id: p.publicationId,
        title: 'Publication', // Would need to load actual title
        type: 'magazine' as PublicationType, // Default
        included: p.included
      })),
      advertisements: mediaKit.advertisements.map(a => ({
        id: a.advertisementId,
        name: 'Advertisement', // Would need to load actual name
        type: 'display' as any,
        included: a.included
      })),
      documents: mediaKit.documents.map(d => ({
        ...d,
        generatedAt: d.generatedAt?.toDate?.()?.toISOString() || d.generatedAt?.toISOString?.() || undefined
      })),
      distribution: mediaKit.distribution ? {
        isPublic: mediaKit.distribution.isPublic,
        shareUrl: mediaKit.distribution.shareUrl,
        password: !!mediaKit.distribution.password,
        sharedWith: mediaKit.distribution.sharedWith?.map(s => ({
          email: s.email,
          sharedAt: s.sharedAt?.toDate?.()?.toISOString() || s.sharedAt?.toISOString?.() || new Date().toISOString(),
          viewedAt: s.viewedAt?.toDate?.()?.toISOString() || s.viewedAt?.toISOString?.() || undefined
        }))
      } : undefined,
      settings: mediaKit.settings,
      createdAt: mediaKit.createdAt?.toDate?.()?.toISOString() || mediaKit.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: mediaKit.updatedAt?.toDate?.()?.toISOString() || mediaKit.updatedAt?.toISOString?.() || new Date().toISOString()
    };
  }

  /**
   * Sucht nach duplizierten Publikationen
   */
  private async findDuplicatePublication(
    data: APIPublicationCreateRequest,
    organizationId: string
  ): Promise<Publication | null> {
    // Suche nach gleichem Titel beim gleichen Verlag
    const publications = await publicationService.searchPublications(
      organizationId,
      {
        publisherIds: [data.publisherId]
      }
    );

    return publications.find(p => 
      p.title.toLowerCase() === data.title.toLowerCase()
    ) || null;
  }
}

// Singleton Export
export const publicationsAPIService = new PublicationsAPIService();