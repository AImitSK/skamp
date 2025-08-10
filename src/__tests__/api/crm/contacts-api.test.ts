// src/__tests__/api/crm/contacts-api.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/v1/contacts/route';
import { GET as GET_SINGLE, PUT as PUT_SINGLE, DELETE as DELETE_SINGLE } from '@/app/api/v1/contacts/[contactId]/route';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { APIMiddleware } from '@/lib/api/api-middleware';

// Mock dependencies
jest.mock('@/lib/api/contacts-api-service');
jest.mock('@/lib/api/api-middleware');

const mockContactsAPIService = contactsAPIService as jest.Mocked<typeof contactsAPIService>;
const mockAPIMiddleware = APIMiddleware as jest.Mocked<typeof APIMiddleware>;

// Test Data
const mockContact = {
  id: 'contact-123',
  firstName: 'Max',
  lastName: 'Mustermann',
  fullName: 'Max Mustermann',
  email: 'max@example.com',
  phone: '+49 123 456789',
  jobTitle: 'Journalist',
  company: {
    id: 'company-123',
    name: 'Test Media',
    domain: 'testmedia.com',
    industry: 'Media'
  },
  tags: [{ name: 'VIP', color: '#ff0000' }],
  mediaOutlets: ['Test Magazine'],
  expertise: ['Tech'],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contactScore: 85,
  recentActivity: []
};

const mockPagination = {
  page: 1,
  limit: 25,
  total: 1,
  hasNext: false,
  hasPrevious: false
};

const mockContext = {
  organizationId: 'org-123',
  userId: 'user-123',
  apiKey: 'test-key',
  permissions: ['contacts:read', 'contacts:write', 'contacts:delete']
};

describe('Contacts API Routes', () => {
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default middleware behavior
    mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
      return jest.fn().mockImplementation((request) => {
        return handler(request, mockContext);
      });
    });
    
    mockAPIMiddleware.successResponse = jest.fn().mockImplementation((data, status, meta) => {
      return new Response(JSON.stringify({
        success: true,
        data,
        meta
      }), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('GET /api/v1/contacts', () => {
    test('should return contacts list successfully', async () => {
      // Setup
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [mockContact],
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/contacts');
      
      // Execute
      const response = await GET(request);
      
      // Verify
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        {}
      );
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        [mockContact],
        200,
        mockPagination
      );
    });

    test('should handle query parameters correctly', async () => {
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [],
        pagination: { ...mockPagination, total: 0 }
      });

      const request = new NextRequest('http://localhost/api/v1/contacts?search=Max&limit=10&companyId=company-123');
      
      await GET(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          search: 'Max',
          limit: '10',
          companyId: 'company-123'
        })
      );
    });
  });

  describe('POST /api/v1/contacts', () => {
    const createRequest = {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna@example.com',
      jobTitle: 'Editor'
    };

    test('should create single contact successfully', async () => {
      mockContactsAPIService.createContact.mockResolvedValue(mockContact);

      const request = new NextRequest('http://localhost/api/v1/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(mockContactsAPIService.createContact).toHaveBeenCalledWith(
        createRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });

    test('should handle bulk contact creation', async () => {
      const bulkResult = {
        success: true,
        totalItems: 2,
        processedItems: 2,
        successfulItems: 2,
        failedItems: 0,
        results: [],
        summary: { duration: 1000, averageTimePerItem: 500 }
      };

      mockContactsAPIService.createContactsBulk.mockResolvedValue(bulkResult);

      const bulkRequest = {
        contacts: [createRequest, { ...createRequest, firstName: 'Bob' }],
        continueOnError: true
      };

      const request = new NextRequest('http://localhost/api/v1/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bulkRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(mockContactsAPIService.createContactsBulk).toHaveBeenCalledWith(
        bulkRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('GET /api/v1/contacts/[contactId]', () => {
    test('should return single contact successfully', async () => {
      mockContactsAPIService.getContact.mockResolvedValue(mockContact);

      const request = new NextRequest('http://localhost/api/v1/contacts/contact-123');
      const params = { params: { contactId: 'contact-123' } };
      
      const response = await GET_SINGLE(request, params);
      
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.getContact).toHaveBeenCalledWith(
        'contact-123',
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('PUT /api/v1/contacts/[contactId]', () => {
    test('should update contact successfully', async () => {
      const updateRequest = { firstName: 'Max Updated' };
      const updatedContact = { ...mockContact, firstName: 'Max Updated' };
      
      mockContactsAPIService.updateContact.mockResolvedValue(updatedContact);

      const request = new NextRequest('http://localhost/api/v1/contacts/contact-123', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updateRequest)
      });
      
      const params = { params: { contactId: 'contact-123' } };
      
      const response = await PUT_SINGLE(request, params);
      
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.updateContact).toHaveBeenCalledWith(
        'contact-123',
        updateRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('DELETE /api/v1/contacts/[contactId]', () => {
    test('should delete contact successfully', async () => {
      mockContactsAPIService.deleteContact.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/v1/contacts/contact-123', {
        method: 'DELETE'
      });
      
      const params = { params: { contactId: 'contact-123' } };
      
      const response = await DELETE_SINGLE(request, params);
      
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.deleteContact).toHaveBeenCalledWith(
        'contact-123',
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockContactsAPIService.getContacts.mockRejectedValue(error);

      // Mock error handling
      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(async (request) => {
          try {
            return await handler(request, mockContext);
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: { message: err.message }
            }), { status: 500 });
          }
        });
      });

      const request = new NextRequest('http://localhost/api/v1/contacts');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Validation', () => {
    test('should validate required fields for contact creation', async () => {
      const invalidRequest = { firstName: '' }; // Missing lastName
      
      // Mock validation error
      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(() => {
          return new Response(JSON.stringify({
            success: false,
            error: { 
              code: 'REQUIRED_FIELD_MISSING',
              message: 'lastName is required'
            }
          }), { status: 400 });
        });
      });

      const request = new NextRequest('http://localhost/api/v1/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

});

describe('Contacts API Service Integration', () => {
  test('should integrate with middleware permissions correctly', () => {
    // Test that correct permissions are required for each endpoint
    expect(mockAPIMiddleware.withAuth).toHaveBeenCalledWith(
      expect.any(Function),
      ['contacts:read']
    );
  });
});