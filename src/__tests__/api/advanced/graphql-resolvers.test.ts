// src/__tests__/api/advanced/graphql-resolvers.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GraphQLResolvers, GraphQLContext } from '@/lib/api/graphql-resolvers';

// Mock Services
const mockContactService = {
  getContactById: jest.fn(),
  getContacts: jest.fn(),
  createContact: jest.fn(),
  updateContact: jest.fn(),
  deleteContact: jest.fn()
};

const mockCompanyService = {
  getCompanyById: jest.fn(),
  getCompanies: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};

const mockPublicationsService = {
  getPublicationById: jest.fn(),
  getPublications: jest.fn(),
  createPublication: jest.fn(),
  updatePublication: jest.fn(),
  deletePublication: jest.fn()
};

const mockBulkExportService = {
  getJobById: jest.fn(),
  getJobs: jest.fn(),
  startExport: jest.fn(),
  cancelJob: jest.fn()
};

const mockBulkImportService = {
  getJobById: jest.fn(),
  getJobs: jest.fn(),
  startImport: jest.fn(),
  cancelJob: jest.fn()
};

const mockEventManager = {
  triggerEvent: jest.fn(),
  triggerContactEvent: jest.fn(),
  triggerCompanyEvent: jest.fn(),
  triggerPublicationEvent: jest.fn()
};

jest.mock('@/lib/firebase/contact-service', () => ({
  contactService: mockContactService
}));

jest.mock('@/lib/firebase/company-service-enhanced', () => ({
  companyService: mockCompanyService
}));

jest.mock('@/lib/api/publications-api-service', () => ({
  publicationsService: mockPublicationsService
}));

jest.mock('@/lib/api/bulk-export-service', () => ({
  bulkExportService: mockBulkExportService
}));

jest.mock('@/lib/api/bulk-import-service', () => ({
  bulkImportService: mockBulkImportService
}));

jest.mock('@/lib/api/event-manager', () => ({
  eventManager: mockEventManager
}));

describe('GraphQLResolvers', () => {
  let resolvers: GraphQLResolvers;
  let context: GraphQLContext;

  beforeEach(() => {
    resolvers = new GraphQLResolvers();
    context = {
      organizationId: 'test-org-123',
      userId: 'test-user-456',
      apiKeyId: 'test-api-key-789'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Contact Queries', () => {
    describe('getContact', () => {
      it('sollte einen Contact erfolgreich zurückgeben', async () => {
        const mockContact = {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Test Corp',
          tags: ['vip', 'customer']
        };

        mockContactService.getContactById.mockResolvedValue(mockContact);

        const result = await resolvers.getContact(
          { id: 'contact-1' },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('contact-1');
        expect(result.firstName).toBe('John');
        expect(result.fullName).toBe('John Doe');
        expect(result.tags).toEqual(['vip', 'customer']);
        expect(mockContactService.getContactById).toHaveBeenCalledWith('contact-1', context.organizationId);
      });

      it('sollte null zurückgeben wenn Contact nicht gefunden', async () => {
        const mockError = new Error('Contact not found');
        (mockError as any).code = 'CONTACT_NOT_FOUND';
        mockContactService.getContactById.mockRejectedValue(mockError);

        const result = await resolvers.getContact(
          { id: 'nonexistent' },
          context
        );

        expect(result).toBeNull();
      });

      it('sollte Fehler weiterwerfen bei anderen Fehlern', async () => {
        const mockError = new Error('Database error');
        mockContactService.getContactById.mockRejectedValue(mockError);

        await expect(
          resolvers.getContact({ id: 'contact-1' }, context)
        ).rejects.toThrow('Database error');
      });
    });

    describe('getContacts', () => {
      it('sollte paginierte Contacts zurückgeben', async () => {
        const mockContacts = [
          { id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          { id: 'contact-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
        ];

        mockContactService.getContacts.mockResolvedValue({
          contacts: mockContacts,
          total: 2
        });

        const result = await resolvers.getContacts(
          {
            first: 10,
            filter: { search: 'test' },
            sort: { field: 'firstName', order: 'asc' }
          },
          context
        );

        expect(result).toBeDefined();
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        expect(result.pageInfo.hasNextPage).toBe(false);
        expect(result.edges[0].node.firstName).toBe('John');
        
        expect(mockContactService.getContacts).toHaveBeenCalledWith(
          context.organizationId,
          expect.objectContaining({
            limit: 10,
            page: 1,
            filters: { search: 'test' },
            sortBy: 'firstName',
            sortOrder: 'asc'
          })
        );
      });

      it('sollte Cursor-basierte Pagination unterstützen', async () => {
        const mockContacts = [
          { id: 'contact-3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' }
        ];

        mockContactService.getContacts.mockResolvedValue({
          contacts: mockContacts,
          total: 3
        });

        // Simuliere "after" cursor (page 2)
        const afterCursor = Buffer.from('1_0').toString('base64');
        
        const result = await resolvers.getContacts(
          { first: 10, after: afterCursor },
          context
        );

        expect(result.edges).toHaveLength(1);
        expect(mockContactService.getContacts).toHaveBeenCalledWith(
          context.organizationId,
          expect.objectContaining({
            page: 2
          })
        );
      });
    });
  });

  describe('Contact Mutations', () => {
    describe('createContact', () => {
      it('sollte einen neuen Contact erfolgreich erstellen', async () => {
        const inputData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Test Corp',
          tags: ['prospect']
        };

        const mockCreatedContact = {
          id: 'contact-1',
          ...inputData
        };

        mockContactService.createContact.mockResolvedValue(mockCreatedContact);
        mockEventManager.triggerContactEvent.mockResolvedValue({});

        const result = await resolvers.createContact(
          { input: inputData },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('contact-1');
        expect(result.firstName).toBe('John');
        expect(result.fullName).toBe('John Doe');
        
        expect(mockContactService.createContact).toHaveBeenCalledWith(
          inputData,
          context.organizationId
        );
        
        expect(mockEventManager.triggerContactEvent).toHaveBeenCalledWith(
          'created',
          mockCreatedContact,
          context.organizationId,
          { userId: context.userId, source: 'graphql' }
        );
      });
    });

    describe('updateContact', () => {
      it('sollte einen Contact erfolgreich aktualisieren', async () => {
        const updateData = {
          firstName: 'Johnny',
          company: 'Updated Corp'
        };

        const mockUpdatedContact = {
          id: 'contact-1',
          firstName: 'Johnny',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Updated Corp'
        };

        mockContactService.updateContact.mockResolvedValue(mockUpdatedContact);
        mockEventManager.triggerContactEvent.mockResolvedValue({});

        const result = await resolvers.updateContact(
          { id: 'contact-1', input: updateData },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('contact-1');
        expect(result.firstName).toBe('Johnny');
        expect(result.company).toBe('Updated Corp');
        
        expect(mockContactService.updateContact).toHaveBeenCalledWith(
          'contact-1',
          updateData,
          context.organizationId
        );
        
        expect(mockEventManager.triggerContactEvent).toHaveBeenCalledWith(
          'updated',
          mockUpdatedContact,
          context.organizationId,
          { userId: context.userId, source: 'graphql' }
        );
      });
    });

    describe('deleteContact', () => {
      it('sollte einen Contact erfolgreich löschen', async () => {
        mockContactService.deleteContact.mockResolvedValue({});
        mockEventManager.triggerContactEvent.mockResolvedValue({});

        const result = await resolvers.deleteContact(
          { id: 'contact-1' },
          context
        );

        expect(result).toBe(true);
        
        expect(mockContactService.deleteContact).toHaveBeenCalledWith(
          'contact-1',
          context.organizationId
        );
        
        expect(mockEventManager.triggerContactEvent).toHaveBeenCalledWith(
          'deleted',
          { id: 'contact-1' },
          context.organizationId,
          { userId: context.userId, source: 'graphql' }
        );
      });
    });
  });

  describe('Company Resolvers', () => {
    describe('getCompany', () => {
      it('sollte eine Company erfolgreich zurückgeben', async () => {
        const mockCompany = {
          id: 'company-1',
          name: 'Test Company',
          website: 'https://test.com',
          industry: 'Technology',
          employees: 50,
          tags: ['client', 'tech']
        };

        mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

        const result = await resolvers.getCompany(
          { id: 'company-1' },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('company-1');
        expect(result.name).toBe('Test Company');
        expect(result.website).toBe('https://test.com');
        expect(result.tags).toEqual(['client', 'tech']);
        expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('company-1', context.organizationId);
      });
    });

    describe('createCompany', () => {
      it('sollte eine neue Company erfolgreich erstellen', async () => {
        const inputData = {
          name: 'New Company',
          website: 'https://newco.com',
          industry: 'Finance',
          employees: 100
        };

        const mockCreatedCompany = {
          id: 'company-2',
          ...inputData
        };

        mockCompanyService.createCompany.mockResolvedValue(mockCreatedCompany);
        mockEventManager.triggerCompanyEvent.mockResolvedValue({});

        const result = await resolvers.createCompany(
          { input: inputData },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('company-2');
        expect(result.name).toBe('New Company');
        expect(result.employees).toBe(100);
        
        expect(mockCompanyService.createCompany).toHaveBeenCalledWith(
          inputData,
          context.organizationId
        );
        
        expect(mockEventManager.triggerCompanyEvent).toHaveBeenCalledWith(
          'created',
          mockCreatedCompany,
          context.organizationId,
          { userId: context.userId, source: 'graphql' }
        );
      });
    });
  });

  describe('Publication Resolvers', () => {
    describe('createPublication', () => {
      it('sollte eine neue Publication erfolgreich erstellen', async () => {
        const inputData = {
          title: 'Test Magazine',
          type: 'magazine',
          publisherName: 'Test Publisher',
          publisherLogoUrl: 'https://test.com/logo.png',
          description: 'A test publication',
          website: 'https://testmag.com',
          tags: ['business', 'tech'],
          verified: false
        };

        const mockCreatedPublication = {
          id: 'pub-1',
          title: inputData.title,
          type: inputData.type,
          publisher: {
            id: 'publisher-123',
            name: inputData.publisherName,
            logoUrl: inputData.publisherLogoUrl
          },
          description: inputData.description,
          website: inputData.website,
          tags: inputData.tags,
          verified: inputData.verified
        };

        mockPublicationsService.createPublication.mockResolvedValue(mockCreatedPublication);

        const result = await resolvers.createPublication(
          { input: inputData },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('pub-1');
        expect(result.title).toBe('Test Magazine');
        expect(result.publisher.name).toBe('Test Publisher');
        
        expect(mockPublicationsService.createPublication).toHaveBeenCalledWith(
          expect.objectContaining({
            title: inputData.title,
            type: inputData.type,
            publisher: expect.objectContaining({
              name: inputData.publisherName,
              logoUrl: inputData.publisherLogoUrl
            })
          }),
          context.organizationId,
          context.userId
        );
      });
    });

    describe('verifyPublication', () => {
      it('sollte eine Publication erfolgreich verifizieren', async () => {
        const mockVerifiedPublication = {
          id: 'pub-1',
          title: 'Test Publication',
          verified: true
        };

        mockPublicationsService.updatePublication.mockResolvedValue(mockVerifiedPublication);

        const result = await resolvers.verifyPublication(
          { id: 'pub-1' },
          context
        );

        expect(result).toBeDefined();
        expect(result.verified).toBe(true);
        
        expect(mockPublicationsService.updatePublication).toHaveBeenCalledWith(
          'pub-1',
          { verified: true },
          context.organizationId,
          context.userId
        );
      });
    });
  });

  describe('Bulk Operation Resolvers', () => {
    describe('getBulkJob', () => {
      it('sollte einen Export-Job erfolgreich zurückgeben', async () => {
        const mockJob = {
          id: 'job-1',
          type: 'export',
          status: 'completed',
          progress: { current: 100, total: 100, percentage: 100 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        mockBulkExportService.getJobById.mockResolvedValue(mockJob);

        const result = await resolvers.getBulkJob(
          { id: 'job-1' },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('job-1');
        expect(result.type).toBe('export');
        expect(result.status).toBe('completed');
        expect(mockBulkExportService.getJobById).toHaveBeenCalledWith('job-1', context.organizationId);
      });

      it('sollte zu Import-Service fallback wenn Export nicht gefunden', async () => {
        const mockError = new Error('Job not found');
        mockBulkExportService.getJobById.mockRejectedValue(mockError);

        const mockImportJob = {
          id: 'job-1',
          type: 'import',
          status: 'processing',
          progress: { current: 50, total: 100, percentage: 50 }
        };

        mockBulkImportService.getJobById.mockResolvedValue(mockImportJob);

        const result = await resolvers.getBulkJob(
          { id: 'job-1' },
          context
        );

        expect(result).toBeDefined();
        expect(result.type).toBe('import');
        expect(mockBulkImportService.getJobById).toHaveBeenCalledWith('job-1', context.organizationId);
      });

      it('sollte null zurückgeben wenn Job nicht in beiden Services gefunden', async () => {
        const mockError = new Error('Job not found');
        mockBulkExportService.getJobById.mockRejectedValue(mockError);
        mockBulkImportService.getJobById.mockRejectedValue(mockError);

        const result = await resolvers.getBulkJob(
          { id: 'nonexistent' },
          context
        );

        expect(result).toBeNull();
      });
    });

    describe('startBulkExport', () => {
      it('sollte einen Bulk-Export erfolgreich starten', async () => {
        const mockJob = {
          id: 'job-2',
          type: 'export',
          status: 'pending',
          progress: { current: 0, total: 0, percentage: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        mockBulkExportService.startExport.mockResolvedValue(mockJob);

        const result = await resolvers.startBulkExport(
          {
            entities: ['contacts', 'companies'],
            format: 'csv',
            options: { includeDeleted: false }
          },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('job-2');
        expect(result.type).toBe('export');
        expect(result.status).toBe('pending');
        
        expect(mockBulkExportService.startExport).toHaveBeenCalledWith(
          expect.objectContaining({
            entities: ['contacts', 'companies'],
            format: 'csv',
            options: { includeDeleted: false }
          }),
          context.organizationId,
          context.userId
        );
      });
    });

    describe('startBulkImport', () => {
      it('sollte einen Bulk-Import erfolgreich starten', async () => {
        const mockJob = {
          id: 'job-3',
          type: 'import',
          status: 'pending',
          progress: { current: 0, total: 0, percentage: 0 }
        };

        mockBulkImportService.startImport.mockResolvedValue(mockJob);

        const result = await resolvers.startBulkImport(
          {
            entity: 'contacts',
            format: 'csv',
            fileContent: 'firstName,lastName,email\nJohn,Doe,john@example.com',
            options: { mode: 'create' }
          },
          context
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('job-3');
        expect(result.type).toBe('import');
        
        expect(mockBulkImportService.startImport).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: 'contacts',
            format: 'csv',
            fileContent: 'firstName,lastName,email\nJohn,Doe,john@example.com',
            options: { mode: 'create' }
          }),
          context.organizationId,
          context.userId
        );
      });
    });
  });

  describe('Global Search', () => {
    it('sollte Global Search über alle Entitäten ausführen', async () => {
      mockContactService.getContacts.mockResolvedValue({
        contacts: [
          { id: 'contact-1', firstName: 'John', email: 'john@example.com' }
        ]
      });

      mockCompanyService.getCompanies.mockResolvedValue({
        companies: [
          { id: 'company-1', name: 'Test Company' }
        ]
      });

      mockPublicationsService.getPublications.mockResolvedValue({
        publications: [
          { id: 'pub-1', title: 'Test Publication' }
        ]
      });

      const result = await resolvers.globalSearch(
        {
          query: 'test',
          entities: ['contacts', 'companies', 'publications'],
          limit: 5
        },
        context
      );

      expect(result).toBeDefined();
      expect(result.contacts).toHaveLength(1);
      expect(result.companies).toHaveLength(1);
      expect(result.publications).toHaveLength(1);
      
      expect(mockContactService.getContacts).toHaveBeenCalledWith(
        context.organizationId,
        expect.objectContaining({
          filters: { search: 'test' },
          limit: 5
        })
      );
    });

    it('sollte nur spezifizierte Entitäten durchsuchen', async () => {
      mockContactService.getContacts.mockResolvedValue({
        contacts: [
          { id: 'contact-1', firstName: 'John' }
        ]
      });

      const result = await resolvers.globalSearch(
        {
          query: 'john',
          entities: ['contacts'],
          limit: 10
        },
        context
      );

      expect(result.contacts).toHaveLength(1);
      expect(result.companies).toBeUndefined();
      expect(result.publications).toBeUndefined();
      
      expect(mockContactService.getContacts).toHaveBeenCalled();
      expect(mockCompanyService.getCompanies).not.toHaveBeenCalled();
      expect(mockPublicationsService.getPublications).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Resolvers', () => {
    it('sollte Contact-Subscriptions korrekt konfigurieren', async () => {
      const result = await resolvers.subscribeContactUpdates(
        { id: 'contact-1' },
        context
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
      
      const subscriptionKey = result.subscribe();
      expect(subscriptionKey).toBe(`contact_updates_${context.organizationId}_contact-1`);
    });

    it('sollte Bulk-Job-Subscriptions korrekt konfigurieren', async () => {
      const result = await resolvers.subscribeBulkJobUpdates(
        { id: 'job-123' },
        context
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
      
      const subscriptionKey = result.subscribe();
      expect(subscriptionKey).toBe(`bulk_job_updates_${context.organizationId}_job-123`);
    });
  });
});