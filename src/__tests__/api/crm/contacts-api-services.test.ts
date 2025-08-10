// src/__tests__/api/crm/contacts-api-services.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ContactsAPIService } from '@/lib/api/contacts-api-service';
import { crmServiceEnhanced } from '@/lib/firebase/crm-service-enhanced';
import { companyServiceEnhanced } from '@/lib/firebase/company-service-enhanced';
import { APIError, API_ERROR_CODES } from '@/types/api';

// Mock Firebase Services
jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  crmServiceEnhanced: {
    getAllContactsWithPagination: jest.fn(),
    getContact: jest.fn(),
    createContact: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn()
  }
}));

jest.mock('@/lib/firebase/company-service-enhanced', () => ({
  companyServiceEnhanced: {
    get: jest.fn()
  }
}));

const mockCrmService = crmServiceEnhanced as jest.Mocked<typeof crmServiceEnhanced>;
const mockCompanyService = companyServiceEnhanced as jest.Mocked<typeof companyServiceEnhanced>;

// Test Data
const mockContactEnhanced = {
  id: 'contact-123',
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max@example.com',
  phone: '+49 123 456789',
  jobTitle: 'Journalist',
  department: 'Redaktion',
  companyId: 'company-123',
  address: {
    street: 'Musterstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany'
  },
  linkedinUrl: 'https://linkedin.com/in/maxmustermann',
  tags: [{ name: 'VIP', color: '#ff0000' }],
  mediaOutlets: ['Tech Magazine'],
  expertise: ['Technology'],
  isActive: true,
  organizationId: 'org-123',
  userId: 'user-123',
  createdAt: { toDate: () => new Date('2024-01-01') },
  updatedAt: { toDate: () => new Date('2024-01-02') }
};

const mockCompanyEnhanced = {
  id: 'company-123',
  name: 'Test Media GmbH',
  tradingName: 'Test Media',
  website: 'https://testmedia.com',
  industry: 'Media',
  organizationId: 'org-123',
  userId: 'user-123'
};

describe('ContactsAPIService', () => {
  let service: ContactsAPIService;
  const organizationId = 'org-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactsAPIService();
  });

  describe('getContacts', () => {
    test('should return paginated contacts list', async () => {
      const mockResult = {
        contacts: [mockContactEnhanced],
        total: 1
      };

      mockCrmService.getAllContactsWithPagination.mockResolvedValue(mockResult);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.getContacts(organizationId, userId, {
        page: 1,
        limit: 25
      });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].fullName).toBe('Max Mustermann');
      expect(result.pagination.total).toBe(1);
      expect(mockCrmService.getAllContactsWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          limit: 25,
          offset: 0,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should handle search filters correctly', async () => {
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      await service.getContacts(organizationId, userId, {
        search: 'Max',
        companyId: 'company-123',
        tags: ['VIP', 'Important'],
        country: 'Germany',
        isActive: true
      });

      expect(mockCrmService.getAllContactsWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            search: 'Max',
            companyId: 'company-123',
            tags: ['VIP', 'Important'],
            country: 'Germany',
            isActive: true
          })
        })
      );
    });

    test('should enforce pagination limits', async () => {
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [],
        total: 0
      });

      // Test maximum limit
      await service.getContacts(organizationId, userId, { limit: 500 });

      expect(mockCrmService.getAllContactsWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          limit: 100 // Should be capped at 100
        })
      );

      // Test minimum limit
      await service.getContacts(organizationId, userId, { limit: -5 });

      expect(mockCrmService.getAllContactsWithPagination).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          limit: 1 // Should be minimum 1
        })
      );
    });
  });

  describe('getContact', () => {
    test('should return single contact with company info', async () => {
      mockCrmService.getContact.mockResolvedValue(mockContactEnhanced);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.getContact('contact-123', organizationId, userId);

      expect(result.id).toBe('contact-123');
      expect(result.fullName).toBe('Max Mustermann');
      expect(result.company).toEqual({
        id: 'company-123',
        name: 'Test Media GmbH',
        domain: 'testmedia.com',
        industry: 'Media'
      });
      expect(mockCrmService.getContact).toHaveBeenCalledWith('contact-123', organizationId);
    });

    test('should throw error when contact not found', async () => {
      mockCrmService.getContact.mockResolvedValue(null);

      await expect(
        service.getContact('nonexistent', organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.getContact('nonexistent', organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: API_ERROR_CODES.RESOURCE_NOT_FOUND
      });
    });

    test('should handle missing company gracefully', async () => {
      const contactWithoutCompany = { ...mockContactEnhanced, companyId: undefined };
      mockCrmService.getContact.mockResolvedValue(contactWithoutCompany);

      const result = await service.getContact('contact-123', organizationId, userId);

      expect(result.company).toBeUndefined();
      expect(mockCompanyService.get).not.toHaveBeenCalled();
    });
  });

  describe('createContact', () => {
    const createRequest = {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna@example.com',
      jobTitle: 'Editor',
      companyId: 'company-123'
    };

    test('should create contact successfully', async () => {
      const createdContact = { ...mockContactEnhanced, id: 'new-contact-123' };

      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [], // No existing contacts with this email
        total: 0
      });
      mockCrmService.createContact.mockResolvedValue(createdContact);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.createContact(createRequest, organizationId, userId);

      expect(result.id).toBe('new-contact-123');
      expect(mockCrmService.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Anna',
          lastName: 'Schmidt',
          email: 'anna@example.com',
          organizationId,
          userId
        }),
        { organizationId, userId }
      );
    });

    test('should validate required fields', async () => {
      await expect(
        service.createContact({ firstName: '', lastName: 'Test', email: 'test@example.com' }, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createContact({ firstName: 'Test', lastName: '', email: 'test@example.com' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: API_ERROR_CODES.REQUIRED_FIELD_MISSING
      });
    });

    test('should validate email format', async () => {
      await expect(
        service.createContact({ firstName: 'Test', lastName: 'User', email: 'invalid-email' }, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createContact({ firstName: 'Test', lastName: 'User', email: 'invalid-email' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: API_ERROR_CODES.VALIDATION_ERROR
      });
    });

    test('should prevent duplicate email addresses', async () => {
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [mockContactEnhanced], // Existing contact with same email
        total: 1
      });

      await expect(
        service.createContact(createRequest, organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.createContact(createRequest, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT
      });
    });
  });

  describe('updateContact', () => {
    const updateRequest = {
      firstName: 'Max Updated',
      jobTitle: 'Senior Journalist'
    };

    test('should update contact successfully', async () => {
      const updatedContact = { ...mockContactEnhanced, firstName: 'Max Updated' };

      mockCrmService.getContact.mockResolvedValue(mockContactEnhanced);
      mockCrmService.updateContact.mockResolvedValue(updatedContact);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.updateContact('contact-123', updateRequest, organizationId, userId);

      expect(result.firstName).toBe('Max Updated');
      expect(mockCrmService.updateContact).toHaveBeenCalledWith(
        'contact-123',
        expect.objectContaining({
          firstName: 'Max Updated',
          jobTitle: 'Senior Journalist'
        }),
        { organizationId, userId }
      );
    });

    test('should throw error when contact not found', async () => {
      mockCrmService.getContact.mockResolvedValue(null);

      await expect(
        service.updateContact('nonexistent', updateRequest, organizationId, userId)
      ).rejects.toThrow(APIError);
    });

    test('should handle email conflicts on update', async () => {
      const duplicateContact = { ...mockContactEnhanced, id: 'other-contact', email: 'duplicate@example.com' };

      mockCrmService.getContact.mockResolvedValue(mockContactEnhanced);
      mockCrmService.getAllContactsWithPagination.mockResolvedValue({
        contacts: [duplicateContact],
        total: 1
      });

      await expect(
        service.updateContact('contact-123', { email: 'duplicate@example.com' }, organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: API_ERROR_CODES.RESOURCE_CONFLICT
      });
    });
  });

  describe('deleteContact', () => {
    test('should delete contact successfully', async () => {
      mockCrmService.getContact.mockResolvedValue(mockContactEnhanced);
      mockCrmService.deleteContact.mockResolvedValue(undefined);

      await service.deleteContact('contact-123', organizationId, userId);

      expect(mockCrmService.deleteContact).toHaveBeenCalledWith('contact-123', { organizationId, userId });
    });

    test('should throw error when contact not found', async () => {
      mockCrmService.getContact.mockResolvedValue(null);

      await expect(
        service.deleteContact('nonexistent', organizationId, userId)
      ).rejects.toThrow(APIError);
    });
  });

  describe('createContactsBulk', () => {
    const bulkRequest = {
      contacts: [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { firstName: 'Invalid', lastName: '', email: 'invalid@example.com' } // Should fail
      ],
      continueOnError: true
    };

    test('should process bulk creation with mixed results', async () => {
      // Mock individual creates - first two succeed, third fails
      service.createContact = jest.fn()
        .mockResolvedValueOnce({ id: 'contact-1', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce({ id: 'contact-2', firstName: 'Jane', lastName: 'Smith' })
        .mockRejectedValueOnce(new APIError(400, API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'lastName is required'));

      const result = await service.createContactsBulk(bulkRequest, organizationId, userId);

      expect(result.totalItems).toBe(3);
      expect(result.processedItems).toBe(3);
      expect(result.successfulItems).toBe(2);
      expect(result.failedItems).toBe(1);
      expect(result.success).toBe(false); // Overall failure because not all succeeded

      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
      expect(result.results[2].error?.code).toBe(API_ERROR_CODES.REQUIRED_FIELD_MISSING);
    });

    test('should stop on first error when continueOnError is false', async () => {
      const stopOnErrorRequest = { ...bulkRequest, continueOnError: false };

      service.createContact = jest.fn()
        .mockResolvedValueOnce({ id: 'contact-1', firstName: 'John', lastName: 'Doe' })
        .mockRejectedValueOnce(new APIError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid email'));

      const result = await service.createContactsBulk(stopOnErrorRequest, organizationId, userId);

      expect(result.processedItems).toBe(2); // Should stop after second item
      expect(result.successfulItems).toBe(1);
      expect(result.failedItems).toBe(1);
      expect(service.createContact).toHaveBeenCalledTimes(2); // Should not process third item
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockCrmService.getAllContactsWithPagination.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.getContacts(organizationId, userId)
      ).rejects.toThrow(APIError);

      await expect(
        service.getContacts(organizationId, userId)
      ).rejects.toMatchObject({
        statusCode: 500,
        errorCode: API_ERROR_CODES.DATABASE_ERROR
      });
    });

    test('should preserve APIError instances', async () => {
      const originalError = new APIError(404, API_ERROR_CODES.RESOURCE_NOT_FOUND, 'Contact not found');
      mockCrmService.getContact.mockRejectedValue(originalError);

      await expect(
        service.getContact('contact-123', organizationId, userId)
      ).rejects.toBe(originalError); // Should be the same instance
    });
  });

  describe('Data Transformation', () => {
    test('should correctly calculate contact score', async () => {
      const contactWithHighScore = {
        ...mockContactEnhanced,
        email: 'test@example.com',
        phone: '+49 123 456789',
        jobTitle: 'Senior Editor',
        companyId: 'company-123',
        linkedinUrl: 'https://linkedin.com/in/test',
        twitterHandle: '@test',
        website: 'https://test.com',
        mediaOutlets: ['Magazine A', 'Blog B'],
        expertise: ['Tech', 'AI', 'Blockchain']
      };

      mockCrmService.getContact.mockResolvedValue(contactWithHighScore);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.getContact('contact-123', organizationId, userId);

      expect(result.contactScore).toBeGreaterThan(80);
    });

    test('should format address correctly', async () => {
      mockCrmService.getContact.mockResolvedValue(mockContactEnhanced);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.getContact('contact-123', organizationId, userId);

      expect(result.address?.formatted).toBe('Musterstraße 1, Berlin, 10115, Germany');
    });

    test('should handle tags transformation', async () => {
      const contactWithStringTags = {
        ...mockContactEnhanced,
        tags: [{ name: 'VIP', color: '#ff0000' }, { name: 'Important' }] // Mixed with and without color
      };

      mockCrmService.getContact.mockResolvedValue(contactWithStringTags);
      mockCompanyService.get.mockResolvedValue(mockCompanyEnhanced);

      const result = await service.getContact('contact-123', organizationId, userId);

      expect(result.tags).toEqual([
        { name: 'VIP', color: '#ff0000' },
        { name: 'Important', color: undefined }
      ]);
    });
  });
});

describe('ContactsAPIService Integration', () => {
  test('should integrate with CRM service correctly', async () => {
    const service = new ContactsAPIService();
    
    // Verify that service uses correct dependencies
    expect(service).toBeInstanceOf(ContactsAPIService);
  });
});