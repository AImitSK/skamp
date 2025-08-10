// src/__tests__/api/crm/companies-api-services.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CompaniesAPIService } from '@/lib/api/companies-api-service';
import { companyServiceEnhanced } from '@/lib/firebase/company-service-enhanced';
import { crmServiceEnhanced } from '@/lib/firebase/crm-service-enhanced';
import { APIError, API_ERROR_CODES } from '@/types/api';

// Mock Firebase Services
jest.mock('@/lib/firebase/company-service-enhanced', () => ({
  companyServiceEnhanced: {
    getAllWithPagination: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  crmServiceEnhanced: {
    getAllContactsWithPagination: jest.fn()
  }
}));

const mockCompanyService = companyServiceEnhanced as jest.Mocked<typeof companyServiceEnhanced>;
const mockCrmService = crmServiceEnhanced as jest.Mocked<typeof crmServiceEnhanced>;

// Test Data
const mockCompanyEnhanced = {
  id: 'company-123',
  name: 'Test Media GmbH',
  tradingName: 'Test Media',
  legalName: 'Test Media GmbH',
  industry: 'Media & Publishing',
  companySize: '50-100',
  companyType: 'media_house',
  founded: 2010,
  website: 'https://testmedia.com',
  phone: '+49 123 456789',
  email: 'info@testmedia.com',
  address: {
    street: 'Medienstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany'
  },
  mediaType: 'online',
  coverage: 'national',
  circulation: 50000,
  audienceSize: 100000,
  linkedinUrl: 'https://linkedin.com/company/testmedia',
  twitterHandle: '@testmedia',
  facebookUrl: 'https://facebook.com/testmedia',
  vatNumber: 'DE123456789',
  registrationNumber: 'HRB 12345',
  tags: [{ name: 'Premium', color: '#gold' }],
  notes: 'Important media partner',
  isActive: true,
  organizationId: 'org-123',
  userId: 'user-123',
  createdAt: { toDate: () => new Date('2024-01-01') },
  updatedAt: { toDate: () => new Date('2024-01-02') }
};

describe('CompaniesAPIService', () => {
  let service: CompaniesAPIService;
  const organizationId = 'org-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompaniesAPIService();
  });

  describe('getCompanies', () => {
    test('should return paginated companies list', async () => {
      const mockResult = {
        companies: [mockCompanyEnhanced],
        total: 1
      };

      mockCompanyService.getAllWithPagination.mockResolvedValue(mockResult);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 3 // Company has 3 contacts
      });

      const result = await service.getCompanies(organizationId, userId, {
        page: 1,
        limit: 25
      });

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].displayName).toBe('Test Media'); // tradingName
      expect(result.companies[0].contactCount).toBe(3);
      expect(result.pagination.total).toBe(1);
      expect(mockCompanyService.getAllWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          limit: 25,
          offset: 0,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should handle complex filtering parameters', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [],
        total: 0
      });

      await service.getCompanies(organizationId, userId, {
        search: 'Media',
        industry: ['Publishing', 'Broadcasting'],
        companyType: 'media_house',
        mediaType: ['online', 'tv'],
        coverage: 'national',
        circulationMin: 10000,
        circulationMax: 100000,
        audienceSizeMin: 50000,
        country: 'Germany',
        city: 'Berlin',
        tags: ['Premium', 'Partner'],
        isActive: true
      });

      expect(mockCompanyService.getAllWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            search: 'Media',
            industry: ['Publishing', 'Broadcasting'],
            companyType: 'media_house',
            mediaType: ['online', 'tv'],
            coverage: 'national',
            circulationMin: 10000,
            circulationMax: 100000,
            audienceSizeMin: 50000,
            country: 'Germany',
            city: 'Berlin',
            tags: ['Premium', 'Partner'],
            isActive: true
          })
        })
      );
    });

    test('should enforce pagination limits', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [],
        total: 0
      });

      // Test maximum limit
      await service.getCompanies(organizationId, userId, { limit: 500 });

      expect(mockCompanyService.getAllWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          limit: 100 // Should be capped at 100
        })
      );
    });

    test('should handle string and array filters correctly', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [],
        total: 0
      });

      // Test single string values converted to arrays
      await service.getCompanies(organizationId, userId, {
        industry: 'Media',
        mediaType: 'online',
        tags: 'Premium'
      });

      expect(mockCompanyService.getAllWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            industry: ['Media'],
            mediaType: ['online'],
            tags: ['Premium']
          })
        })
      );
    });
  });

  describe('getCompany', () => {
    test('should return single company with contact count', async () => {
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 5 // Company has 5 contacts
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.id).toBe('company-123');
      expect(result.name).toBe('Test Media GmbH');
      expect(result.displayName).toBe('Test Media');
      expect(result.domain).toBe('testmedia.com');
      expect(result.contactCount).toBe(5);
      expect(mockCompanyService.get).toHaveBeenCalledWith('company-123', organizationId);
    });

    test('should throw error when company not found', async () => {
      mockCompanyService.get.mockResolvedValue(null);

      await expect(
        service.getCompany('nonexistent', organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.getCompany('nonexistent', organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: API_ERROR_CODES.RESOURCE_NOT_FOUND
      });
    });
  });

  describe('createCompany', () => {
    const createRequest = {
      name: 'Neue Media AG',
      industry: 'Publishing',
      companyType: 'media_house' as const,
      website: 'https://neuemedia.de',
      email: 'contact@neuemedia.de',
      mediaType: 'magazine' as const,
      coverage: 'international' as const,
      circulation: 75000
    };

    test('should create company successfully', async () => {
      const createdCompany = { ...mockCompanyEnhanced, id: 'new-company-123', name: 'Neue Media AG' };

      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [], // No existing company with this name
        total: 0
      });
      mockCompanyService.create.mockResolvedValue('new-company-123');
      mockCompanyService.get.mockResolvedValue(createdCompany);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.createCompany(createRequest, organizationId, userId);

      expect(result.id).toBe('new-company-123');
      expect(result.name).toBe('Neue Media AG');
      expect(mockCompanyService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Neue Media AG',
          industry: 'Publishing',
          companyType: 'media_house',
          organizationId,
          userId
        }),
        { organizationId, userId }
      );
    });

    test('should validate required name field', async () => {
      await expect(
        service.createCompany({ name: '', industry: 'Media' }, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createCompany({ name: '   ', industry: 'Media' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: API_ERROR_CODES.REQUIRED_FIELD_MISSING
      });
    });

    test('should validate URL formats', async () => {
      await expect(
        service.createCompany({ name: 'Test', website: 'invalid-url' }, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createCompany({ name: 'Test', website: 'invalid-url' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: API_ERROR_CODES.VALIDATION_ERROR
      });
    });

    test('should validate email format', async () => {
      await expect(
        service.createCompany({ name: 'Test', email: 'invalid-email' }, organizationId, userId)
      ).rejects.toThrow(APIError);
    });

    test('should prevent duplicate company names', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [mockCompanyEnhanced], // Existing company
        total: 1
      });

      await expect(
        service.createCompany({ name: 'Test Media GmbH' }, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createCompany({ name: 'Test Media GmbH' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT
      });
    });

    test('should prevent duplicate domains', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [mockCompanyEnhanced],
        total: 1
      });

      await expect(
        service.createCompany({ name: 'Different Name', website: 'https://testmedia.com' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT
      });
    });
  });

  describe('updateCompany', () => {
    const updateRequest = {
      name: 'Updated Media GmbH',
      industry: 'Digital Media',
      circulation: 60000
    };

    test('should update company successfully', async () => {
      const updatedCompany = { ...mockCompanyEnhanced, name: 'Updated Media GmbH' };

      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [], // No duplicates
        total: 0
      });
      mockCompanyService.update.mockResolvedValue(undefined);
      mockCompanyService.get.mockResolvedValueOnce(mockCompanyEnhanced); // First call for existence check
      mockCompanyService.get.mockResolvedValueOnce(updatedCompany); // Second call after update
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.updateCompany('company-123', updateRequest, organizationId, userId);

      expect(result.name).toBe('Updated Media GmbH');
      expect(mockCompanyService.update).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          name: 'Updated Media GmbH',
          industry: 'Digital Media',
          circulation: 60000
        }),
        { organizationId, userId }
      );
    });

    test('should throw error when company not found', async () => {
      mockCompanyService.get.mockResolvedValue(null);

      await expect(
        service.updateCompany('nonexistent', updateRequest, organizationId, userId)
      ).rejects.toThrow(APIError);
    });

    test('should handle duplicate conflicts on update', async () => {
      const duplicateCompany = { ...mockCompanyEnhanced, id: 'other-company', name: 'Duplicate Media' };

      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [duplicateCompany],
        total: 1
      });

      await expect(
        service.updateCompany('company-123', { name: 'Duplicate Media' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT
      });
    });
  });

  describe('deleteCompany', () => {
    test('should delete company successfully when no contacts', async () => {
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [], // No associated contacts
        total: 0
      });
      mockCompanyService.delete.mockResolvedValue(undefined);

      await service.deleteCompany('company-123', organizationId, userId);

      expect(mockCompanyService.delete).toHaveBeenCalledWith('company-123', { organizationId, userId });
    });

    test('should throw error when company not found', async () => {
      mockCompanyService.get.mockResolvedValue(null);

      await expect(
        service.deleteCompany('nonexistent', organizationId, userId)
      ).rejects.toThrow(APIError);
    });

    test('should prevent deletion when company has contacts', async () => {
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [{ id: 'contact-1' }], // Has associated contacts
        total: 1
      });

      await expect(
        service.deleteCompany('company-123', organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT,
        message: 'Cannot delete company with associated contacts. Remove contacts first.'
      });

      expect(mockCompanyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('createCompaniesBulk', () => {
    const bulkRequest = {
      companies: [
        { name: 'Company A', industry: 'Tech' },
        { name: 'Company B', industry: 'Media' },
        { name: '', industry: 'Invalid' } // Should fail - empty name
      ],
      continueOnError: true
    };

    test('should process bulk creation with mixed results', async () => {
      // Mock individual creates
      service.createCompany = jest.fn()
        .mockResolvedValueOnce({ id: 'company-1', name: 'Company A' })
        .mockResolvedValueOnce({ id: 'company-2', name: 'Company B' })
        .mockRejectedValueOnce(new APIError(400, API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'name is required'));

      const result = await service.createCompaniesBulk(bulkRequest, organizationId, userId);

      expect(result.totalItems).toBe(3);
      expect(result.processedItems).toBe(3);
      expect(result.successfulItems).toBe(2);
      expect(result.failedItems).toBe(1);
      expect(result.success).toBe(false);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
    });

    test('should stop on first error when continueOnError is false', async () => {
      const stopOnErrorRequest = { ...bulkRequest, continueOnError: false };

      service.createCompany = jest.fn()
        .mockResolvedValueOnce({ id: 'company-1', name: 'Company A' })
        .mockRejectedValueOnce(new APIError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid data'));

      const result = await service.createCompaniesBulk(stopOnErrorRequest, organizationId, userId);

      expect(result.processedItems).toBe(2);
      expect(result.successfulItems).toBe(1);
      expect(result.failedItems).toBe(1);
      expect(service.createCompany).toHaveBeenCalledTimes(2);
    });
  });

  describe('Media House Features', () => {
    test('should handle media-specific filters', async () => {
      mockCompanyService.getAllWithPagination.mockResolvedValue({
        companies: [],
        total: 0
      });

      await service.getCompanies(organizationId, userId, {
        mediaType: ['newspaper', 'magazine'],
        coverage: ['national', 'international'],
        circulationMin: 25000,
        circulationMax: 100000,
        audienceSizeMin: 50000,
        audienceSizeMax: 500000
      });

      expect(mockCompanyService.getAllWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            mediaType: ['newspaper', 'magazine'],
            coverage: ['national', 'international'],
            circulationMin: 25000,
            circulationMax: 100000,
            audienceSizeMin: 50000,
            audienceSizeMax: 500000
          })
        })
      );
    });

    test('should calculate activity score correctly', async () => {
      const highScoreCompany = {
        ...mockCompanyEnhanced,
        website: 'https://example.com',
        email: 'contact@example.com',
        phone: '+49 123 456789',
        industry: 'Media',
        linkedinUrl: 'https://linkedin.com/company/example',
        twitterHandle: '@example',
        facebookUrl: 'https://facebook.com/example',
        address: { street: 'Test St', city: 'Berlin', postalCode: '10115', country: 'Germany' },
        founded: 2010
      };

      mockCompanyService.get.mockResolvedValue(highScoreCompany);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 8 // Multiple contacts
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.activityScore).toBeGreaterThan(90);
    });
  });

  describe('Data Transformation', () => {
    test('should format address correctly', async () => {
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.address?.formatted).toBe('Medienstraße 1, Berlin, 10115, Germany');
    });

    test('should extract domain from website', async () => {
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.domain).toBe('testmedia.com');
    });

    test('should handle invalid website gracefully', async () => {
      const companyWithInvalidWebsite = {
        ...mockCompanyEnhanced,
        website: 'invalid-url'
      };

      mockCompanyService.get.mockResolvedValue(companyWithInvalidWebsite);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.domain).toBeUndefined();
    });

    test('should transform tags correctly', async () => {
      const companyWithTags = {
        ...mockCompanyEnhanced,
        tags: [{ name: 'Premium', color: '#gold' }, { name: 'Partner' }]
      };

      mockCompanyService.get.mockResolvedValue(companyWithTags);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      const result = await service.getCompany('company-123', organizationId, userId);

      expect(result.tags).toEqual([
        { name: 'Premium', color: '#gold' },
        { name: 'Partner', color: undefined }
      ]);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockCompanyService.getAllWithPagination.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.getCompanies(organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.getCompanies(organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 500,
        errorCode: API_ERROR_CODES.DATABASE_ERROR
      });
    });

    test('should preserve APIError instances', async () => {
      const originalError = new APIError(404, API_ERROR_CODES.RESOURCE_NOT_FOUND, 'Company not found');
      mockCompanyService.get.mockRejectedValue(originalError);

      await expect(
        service.getCompany('company-123', organizationId, userId)
      ).rejects.toBe(originalError);
    });
  });
});

describe('CompaniesAPIService Integration', () => {
  test('should integrate with company service correctly', async () => {
    const service = new CompaniesAPIService();
    
    expect(service).toBeInstanceOf(CompaniesAPIService);
  });
});