// src/lib/api/graphql-resolvers.ts
import { GraphQLResponse } from '@/types/api-advanced';
import { APIError } from '@/lib/api/api-errors';

// Build-safe imports
let contactsService: any;
let companyService: any;
let publicationsService: any;
let bulkExportService: any;
let bulkImportService: any;
let eventManager: any;

try {
  const contactsModule = require('@/lib/api/contacts-api-service');
  const companyModule = require('@/lib/firebase/company-service-enhanced');
  const publicationsModule = require('@/lib/api/publications-api-service');
  const bulkExportModule = require('@/lib/api/bulk-export-service');
  const bulkImportModule = require('@/lib/api/bulk-import-service');
  const eventModule = require('@/lib/api/event-manager');
  
  contactsService = contactsModule.contactsAPIService;
  companyService = companyModule.companyServiceEnhanced;
  publicationsService = publicationsModule.publicationsAPIService;
  bulkExportService = bulkExportModule.bulkExportService;
  bulkImportService = bulkImportModule.bulkImportService;
  eventManager = eventModule.eventManager;
} catch (error) {
  // Mock services für Build-Zeit
  const { 
    mockContactsService, 
    mockCompanyService, 
    mockPublicationsService, 
    mockEventManager 
  } = require('@/lib/api/mock-services');
  
  contactsService = mockContactsService;
  companyService = mockCompanyService;
  publicationsService = mockPublicationsService;
  eventManager = mockEventManager;
  
  // Mock bulk services
  bulkExportService = {
    getJobById: async () => null,
    getJobs: async () => ({ jobs: [], total: 0 }),
    startExport: async () => ({ id: 'mock-export-job' }),
    cancelJob: async () => undefined
  };
  bulkImportService = {
    getJobById: async () => null,
    getJobs: async () => ({ jobs: [], total: 0 }),
    startImport: async () => ({ id: 'mock-import-job' }),
    cancelJob: async () => undefined
  };
}

/**
 * GraphQL Resolver Context
 */
export interface GraphQLContext {
  organizationId: string;
  userId: string;
  apiKeyId: string;
}

/**
 * GraphQL Resolver Arguments
 */
interface ResolverArgs {
  [key: string]: any;
}

/**
 * GraphQL Resolvers
 * Implementiert alle Query, Mutation und Subscription Resolvers
 */
export class GraphQLResolvers {
  
  // ===================
  // QUERY RESOLVERS
  // ===================

  /**
   * Contact Queries
   */
  async getContact(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    try {
      const contact = await contactsService.getContact(args.id, context.organizationId, context.userId);
      return this.transformContact(contact);
    } catch (error) {
      if (error instanceof APIError && error.code === 'CONTACT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async getContacts(
    args: {
      first?: number;
      after?: string;
      last?: number;
      before?: string;
      filter?: any;
      sort?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const limit = args.first || args.last || 20;
    const page = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) + 1 : 1;
    
    const params: any = {
      limit: Math.min(limit, 100),
      page
    };

    if (args.filter) {
      params.filters = args.filter;
    }

    if (args.sort) {
      params.sortBy = args.sort.field;
      params.sortOrder = args.sort.order || 'asc';
    }

    const response = await contactsService.getContacts(context.organizationId, context.userId, params);
    
    return this.transformConnectionResponse(
      response.contacts?.map(c => this.transformContact(c)) || [],
      response.total || 0,
      page,
      limit
    );
  }

  /**
   * Company Queries
   */
  async getCompany(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    try {
      const company = await companyService.get(args.id, context.organizationId);
      return this.transformCompany(company);
    } catch (error) {
      if (error instanceof APIError && error.code === 'COMPANY_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async getCompanies(
    args: {
      first?: number;
      after?: string;
      filter?: any;
      sort?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const limit = args.first || 20;
    const page = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) + 1 : 1;
    
    const params: any = {
      limit: Math.min(limit, 100),
      page
    };

    if (args.filter) {
      params.filters = args.filter;
    }

    const response = await companyService.getCompanies(context.organizationId, params);
    
    return this.transformConnectionResponse(
      response.companies?.map(c => this.transformCompany(c)) || [],
      response.total || 0,
      page,
      limit
    );
  }

  /**
   * Publication Queries
   */
  async getPublication(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    try {
      const publication = await publicationsService.getPublication(args.id, context.organizationId, context.userId);
      return this.transformPublication(publication);
    } catch (error) {
      if (error instanceof APIError && error.code === 'PUBLICATION_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async getPublications(
    args: {
      first?: number;
      after?: string;
      filter?: any;
      sort?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const limit = args.first || 20;
    const page = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) + 1 : 1;
    
    const params: any = {
      limit: Math.min(limit, 100),
      page
    };

    if (args.filter) {
      params.filters = args.filter;
    }

    const response = await publicationsService.getPublications(context.organizationId, params);
    
    return this.transformConnectionResponse(
      response.publications?.map(p => this.transformPublication(p)) || [],
      response.total || 0,
      page,
      limit
    );
  }

  /**
   * Bulk Job Queries
   */
  async getBulkJob(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    try {
      // Versuche zuerst Export-Job
      const exportJob = await bulkExportService.getJobById(args.id, context.organizationId);
      return this.transformBulkJob(exportJob);
    } catch (exportError) {
      try {
        // Dann Import-Job
        const importJob = await bulkImportService.getJobById(args.id, context.organizationId);
        return this.transformBulkJob(importJob);
      } catch (importError) {
        return null;
      }
    }
  }

  async getBulkJobs(
    args: {
      type?: string;
      status?: string;
      pagination?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const page = args.pagination?.page || 1;
    const limit = args.pagination?.limit || 20;
    
    const params = {
      page,
      limit,
      status: args.status,
      type: args.type as 'export' | 'import'
    };

    // Hole beide Job-Typen falls nicht spezifiziert
    const jobs: any[] = [];
    
    if (!args.type || args.type === 'export') {
      const exportResponse = await bulkExportService.getJobs(context.organizationId, {
        ...params,
        type: 'export'
      });
      jobs.push(...exportResponse.jobs.map(j => this.transformBulkJob(j)));
    }
    
    if (!args.type || args.type === 'import') {
      const importResponse = await bulkImportService.getJobs(context.organizationId, {
        ...params,
        type: 'import'
      });
      jobs.push(...importResponse.jobs.map(j => this.transformBulkJob(j)));
    }

    // Sortiere nach Erstellungsdatum
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Client-side Pagination
    const startIndex = (page - 1) * limit;
    const paginatedJobs = jobs.slice(startIndex, startIndex + limit);

    return paginatedJobs;
  }

  /**
   * Global Search
   */
  async globalSearch(
    args: {
      query: string;
      entities?: string[];
      limit?: number;
    },
    context: GraphQLContext
  ): Promise<any> {
    const searchLimit = args.limit || 10;
    const entities = args.entities || ['contacts', 'companies', 'publications'];
    const results: any = {};

    // Suche in allen angegebenen Entitäten
    for (const entity of entities) {
      try {
        switch (entity) {
          case 'contacts':
            const contactResponse = await contactsService.getContacts(context.organizationId, 'system', {
              filters: { search: args.query },
              limit: searchLimit
            });
            results.contacts = contactResponse.contacts?.map(c => this.transformContact(c)) || [];
            break;

          case 'companies':
            const companyResponse = await companyService.getCompanies(context.organizationId, {
              filters: { search: args.query },
              limit: searchLimit
            });
            results.companies = companyResponse.companies?.map(c => this.transformCompany(c)) || [];
            break;

          case 'publications':
            const pubResponse = await publicationsService.getPublications(context.organizationId, {
              filters: { search: args.query },
              limit: searchLimit
            });
            results.publications = pubResponse.publications?.map(p => this.transformPublication(p)) || [];
            break;
        }
      } catch (error) {
        console.error(`Search error for ${entity}:`, error);
        results[entity] = [];
      }
    }

    return results;
  }

  // ===================
  // MUTATION RESOLVERS
  // ===================

  /**
   * Contact Mutations
   */
  async createContact(
    args: { input: any },
    context: GraphQLContext
  ): Promise<any> {
    const contact = await contactsService.createContact(args.input, context.organizationId, context.userId);
    
    // Trigger Event
    await eventManager.triggerContactEvent(
      'created',
      contact,
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return this.transformContact(contact);
  }

  async updateContact(
    args: { id: string; input: any },
    context: GraphQLContext
  ): Promise<any> {
    const contact = await contactsService.updateContact(args.id, args.input, context.organizationId, context.userId);
    
    // Trigger Event
    await eventManager.triggerContactEvent(
      'updated',
      contact,
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return this.transformContact(contact);
  }

  async deleteContact(
    args: { id: string },
    context: GraphQLContext
  ): Promise<boolean> {
    await contactsService.deleteContact(args.id, context.organizationId, context.userId);
    
    // Trigger Event
    await eventManager.triggerContactEvent(
      'deleted',
      { id: args.id },
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return true;
  }

  /**
   * Company Mutations
   */
  async createCompany(
    args: { input: any },
    context: GraphQLContext
  ): Promise<any> {
    const company = await companyService.create(args.input, { organizationId: context.organizationId, userId: context.userId });
    
    // Trigger Event
    await eventManager.triggerCompanyEvent(
      'created',
      company,
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return this.transformCompany(company);
  }

  async updateCompany(
    args: { id: string; input: any },
    context: GraphQLContext
  ): Promise<any> {
    const company = await companyService.update(args.id, args.input, { organizationId: context.organizationId, userId: context.userId });
    
    // Trigger Event
    await eventManager.triggerCompanyEvent(
      'updated',
      company,
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return this.transformCompany(company);
  }

  async deleteCompany(
    args: { id: string },
    context: GraphQLContext
  ): Promise<boolean> {
    await companyService.delete(args.id, { organizationId: context.organizationId, userId: context.userId });
    
    // Trigger Event
    await eventManager.triggerCompanyEvent(
      'deleted',
      { id: args.id },
      context.organizationId,
      { userId: context.userId, source: 'graphql' }
    );
    
    return true;
  }

  /**
   * Publication Mutations
   */
  async createPublication(
    args: { input: any },
    context: GraphQLContext
  ): Promise<any> {
    const publicationData = {
      title: args.input.title,
      type: args.input.type,
      publisher: {
        id: `publisher-${Date.now()}`,
        name: args.input.publisherName,
        logoUrl: args.input.publisherLogoUrl
      },
      description: args.input.description,
      website: args.input.website,
      tags: args.input.tags || [],
      verified: args.input.verified || false
    };

    const publication = await publicationsService.createPublication(
      publicationData,
      context.organizationId,
      context.userId
    );
    
    return this.transformPublication(publication);
  }

  async updatePublication(
    args: { id: string; input: any },
    context: GraphQLContext
  ): Promise<any> {
    const updateData = {
      title: args.input.title,
      type: args.input.type,
      description: args.input.description,
      website: args.input.website,
      tags: args.input.tags,
      verified: args.input.verified
    };

    if (args.input.publisherName) {
      updateData['publisher.name'] = args.input.publisherName;
    }
    if (args.input.publisherLogoUrl) {
      updateData['publisher.logoUrl'] = args.input.publisherLogoUrl;
    }

    const publication = await publicationsService.updatePublication(
      args.id,
      updateData,
      context.organizationId,
      context.userId
    );
    
    return this.transformPublication(publication);
  }

  async deletePublication(
    args: { id: string },
    context: GraphQLContext
  ): Promise<boolean> {
    await publicationsService.deletePublication(args.id, context.organizationId, context.userId);
    return true;
  }

  async verifyPublication(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    const publication = await publicationsService.updatePublication(
      args.id,
      { verified: true },
      context.organizationId,
      context.userId
    );
    
    return this.transformPublication(publication);
  }

  /**
   * Bulk Operation Mutations
   */
  async startBulkExport(
    args: {
      entities: string[];
      format: string;
      options?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const exportRequest = {
      entities: args.entities as any[],
      format: args.format as any,
      options: args.options
    };

    const job = await bulkExportService.startExport(
      exportRequest,
      context.organizationId,
      context.userId
    );
    
    return this.transformBulkJob(job);
  }

  async startBulkImport(
    args: {
      entity: string;
      format: string;
      fileUrl?: string;
      fileContent?: string;
      options?: any;
    },
    context: GraphQLContext
  ): Promise<any> {
    const importRequest = {
      entity: args.entity as any,
      format: args.format as any,
      fileUrl: args.fileUrl,
      fileContent: args.fileContent,
      options: args.options
    };

    const job = await bulkImportService.startImport(
      importRequest,
      context.organizationId,
      context.userId
    );
    
    return this.transformBulkJob(job);
  }

  async cancelBulkJob(
    args: { id: string },
    context: GraphQLContext
  ): Promise<boolean> {
    try {
      await bulkExportService.cancelJob(args.id, context.organizationId);
      return true;
    } catch (error) {
      // Try import service if export fails
      try {
        await bulkImportService.cancelJob(args.id, context.organizationId);
        return true;
      } catch (importError) {
        throw new APIError('JOB_NOT_FOUND', 'Bulk job not found');
      }
    }
  }

  // ===================
  // SUBSCRIPTION RESOLVERS
  // ===================

  /**
   * Contact Subscriptions
   */
  async subscribeContactUpdates(
    args: { id?: string },
    context: GraphQLContext
  ): Promise<any> {
    // WebSocket-Implementierung würde hier die Subscription registrieren
    // Vereinfacht für jetzt
    return {
      subscribe: () => {
        // Register WebSocket subscription
        return `contact_updates_${context.organizationId}_${args.id || 'all'}`;
      }
    };
  }

  async subscribeCompanyUpdates(
    args: { id?: string },
    context: GraphQLContext
  ): Promise<any> {
    return {
      subscribe: () => {
        return `company_updates_${context.organizationId}_${args.id || 'all'}`;
      }
    };
  }

  async subscribePublicationUpdates(
    args: { id?: string },
    context: GraphQLContext
  ): Promise<any> {
    return {
      subscribe: () => {
        return `publication_updates_${context.organizationId}_${args.id || 'all'}`;
      }
    };
  }

  async subscribeBulkJobUpdates(
    args: { id: string },
    context: GraphQLContext
  ): Promise<any> {
    return {
      subscribe: () => {
        return `bulk_job_updates_${context.organizationId}_${args.id}`;
      }
    };
  }

  // ===================
  // TRANSFORMATION HELPERS
  // ===================

  private transformContact(contact: any): any {
    return {
      id: contact.id,
      firstName: contact.firstName || null,
      lastName: contact.lastName || null,
      fullName: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null,
      email: contact.email,
      company: contact.company || null,
      position: contact.position || null,
      phone: contact.phone || null,
      website: contact.website || null,
      tags: contact.tags || [],
      status: contact.status || 'active',
      notes: contact.notes || null,
      createdAt: contact.createdAt || new Date().toISOString(),
      updatedAt: contact.updatedAt || new Date().toISOString(),
      companyDetails: contact.companyDetails || null
    };
  }

  private transformCompany(company: any): any {
    return {
      id: company.id,
      name: company.name,
      website: company.website || null,
      description: company.description || null,
      industry: company.industry || null,
      employees: company.employees || null,
      tags: company.tags || [],
      location: company.location || null,
      createdAt: company.createdAt || new Date().toISOString(),
      updatedAt: company.updatedAt || new Date().toISOString(),
      contacts: [] // Würde bei Bedarf geladen
    };
  }

  private transformPublication(publication: any): any {
    return {
      id: publication.id,
      title: publication.title,
      type: publication.type,
      publisher: {
        id: publication.publisher?.id || 'unknown',
        name: publication.publisher?.name || '',
        logoUrl: publication.publisher?.logoUrl || null
      },
      description: publication.description || null,
      website: publication.website || null,
      tags: publication.tags || [],
      verified: publication.verified || false,
      metrics: publication.metrics || {},
      createdAt: publication.createdAt || new Date().toISOString(),
      updatedAt: publication.updatedAt || new Date().toISOString()
    };
  }

  private transformBulkJob(job: any): any {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt || null
    };
  }

  private transformConnectionResponse(
    items: any[],
    totalCount: number,
    page: number,
    limit: number
  ): any {
    const hasNextPage = page * limit < totalCount;
    const hasPreviousPage = page > 1;
    
    return {
      edges: items.map((item, index) => ({
        node: item,
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: items.length > 0 ? Buffer.from(`${page}_0`).toString('base64') : null,
        endCursor: items.length > 0 ? Buffer.from(`${page}_${items.length - 1}`).toString('base64') : null
      },
      totalCount
    };
  }
}

// Singleton Export
export const graphqlResolvers = new GraphQLResolvers();