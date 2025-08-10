// src/__tests__/api/search/search-api.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as SEARCH_POST } from '@/app/api/v1/search/route';
import { GET as SUGGESTIONS_GET } from '@/app/api/v1/search/suggestions/route';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { APIMiddleware } from '@/lib/api/api-middleware';

// Mock dependencies
jest.mock('@/lib/api/contacts-api-service');
jest.mock('@/lib/api/companies-api-service');
jest.mock('@/lib/api/api-middleware');

const mockContactsAPIService = contactsAPIService as jest.Mocked<typeof contactsAPIService>;
const mockCompaniesAPIService = companiesAPIService as jest.Mocked<typeof companiesAPIService>;
const mockAPIMiddleware = APIMiddleware as jest.Mocked<typeof APIMiddleware>;

// Test Data
const mockContacts = [
  {
    id: 'contact-1',
    firstName: 'Max',
    lastName: 'Mustermann',
    fullName: 'Max Mustermann',
    email: 'max@example.com',
    jobTitle: 'Journalist',
    company: { id: 'company-1', name: 'Test Media', domain: 'test.com', industry: 'Media' },
    tags: [],
    mediaOutlets: [],
    expertise: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contactScore: 80,
    recentActivity: []
  }
];

const mockCompanies = [
  {
    id: 'company-1',
    name: 'Test Media GmbH',
    displayName: 'Test Media',
    industry: 'Media',
    companyType: 'media_house' as const,
    domain: 'testmedia.com',
    contactCount: 5,
    tags: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activityScore: 75,
    recentActivity: []
  }
];

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
  permissions: ['contacts:read', 'companies:read']
};

describe('Search API Routes', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
      return jest.fn().mockImplementation((request) => {
        return handler(request, mockContext);
      });
    });
    
    mockAPIMiddleware.successResponse = jest.fn().mockImplementation((data, status) => {
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('POST /api/v1/search', () => {
    test('should search contacts successfully', async () => {
      const searchRequest = {
        query: 'Max',
        type: 'contacts' as const,
        limit: 10
      };

      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: mockContacts,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await SEARCH_POST(request);
      
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          search: 'Max',
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should search companies successfully', async () => {
      const searchRequest = {
        query: 'Media',
        type: 'companies' as const,
        filters: {
          industry: 'Media'
        }
      };

      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: mockCompanies,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await SEARCH_POST(request);
      
      expect(response.status).toBe(200);
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          search: 'Media',
          industry: 'Media',
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should search both contacts and companies for "all" type', async () => {
      const searchRequest = {
        query: 'test query',
        type: 'all' as const
      };

      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: mockContacts,
        pagination: mockPagination
      });

      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: mockCompanies,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await SEARCH_POST(request);
      
      expect(response.status).toBe(200);
      expect(mockContactsAPIService.getContacts).toHaveBeenCalled();
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalled();
      
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          type: 'all',
          results: expect.objectContaining({
            contacts: expect.any(Object),
            companies: expect.any(Object)
          }),
          metadata: expect.objectContaining({
            totalResults: 2,
            fuzzyMatch: false
          })
        })
      );
    });

    test('should handle empty search results', async () => {
      const searchRequest = {
        query: 'nonexistent',
        type: 'contacts' as const
      };

      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [],
        pagination: { ...mockPagination, total: 0 }
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await SEARCH_POST(request);
      
      expect(response.status).toBe(200);
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            contacts: expect.objectContaining({
              items: [],
              total: 0
            })
          })
        })
      );
    });

    test('should validate required search parameters', async () => {
      const invalidRequest = { query: '', type: 'contacts' as const }; // Empty query

      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(() => {
          return new Response(JSON.stringify({
            success: false,
            error: { 
              code: 'REQUIRED_FIELD_MISSING',
              message: 'query is required'
            }
          }), { status: 400 });
        });
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await SEARCH_POST(request);
      expect(response.status).toBe(400);
    });

    test('should apply search limit correctly', async () => {
      const searchRequest = {
        query: 'test',
        type: 'all' as const,
        limit: 25
      };

      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: mockContacts,
        pagination: mockPagination
      });

      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: mockCompanies,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      await SEARCH_POST(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ limit: 25 })
      );
    });

    test('should enforce maximum search limit', async () => {
      const searchRequest = {
        query: 'test',
        type: 'contacts' as const,
        limit: 100 // Should be capped at 50
      };

      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [],
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      await SEARCH_POST(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ limit: 50 }) // Should be capped
      );
    });
  });

  describe('GET /api/v1/search/suggestions', () => {
    test('should return search suggestions successfully', async () => {
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: mockContacts,
        pagination: mockPagination
      });

      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: mockCompanies,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=Max&type=all&limit=5');
      
      const response = await SUGGESTIONS_GET(request);
      
      expect(response.status).toBe(200);
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestions: expect.any(Array),
          query: 'Max',
          hasMore: expect.any(Boolean)
        })
      );
    });

    test('should return empty suggestions for short queries', async () => {
      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=M'); // Only 1 character
      
      const response = await SUGGESTIONS_GET(request);
      
      expect(response.status).toBe(200);
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestions: [],
          query: 'M'
        })
      );
      
      // Should not call services for short queries
      expect(mockContactsAPIService.getContacts).not.toHaveBeenCalled();
      expect(mockCompaniesAPIService.getCompanies).not.toHaveBeenCalled();
    });

    test('should format contact suggestions correctly', async () => {
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: mockContacts,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=Max&type=contacts');
      
      await SUGGESTIONS_GET(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          search: 'Max',
          limit: 3, // Half of default limit 5 for contacts only
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should format company suggestions correctly', async () => {
      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: mockCompanies,
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=Media&type=companies');
      
      await SUGGESTIONS_GET(request);
      
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          search: 'Media',
          limit: 3, // Half of default limit 5 for companies only
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    test('should handle service errors gracefully in suggestions', async () => {
      mockContactsAPIService.getContacts.mockRejectedValue(new Error('Service unavailable'));
      mockCompaniesAPIService.getCompanies.mockRejectedValue(new Error('Service unavailable'));

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=test');
      
      const response = await SUGGESTIONS_GET(request);
      
      expect(response.status).toBe(200);
      expect(mockAPIMiddleware.successResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestions: [],
          query: 'test',
          error: 'Search temporarily unavailable'
        })
      );
    });

    test('should respect custom limit parameter', async () => {
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [],
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=test&limit=8');
      
      await SUGGESTIONS_GET(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 4 // Half of requested limit 8
        })
      );
    });

    test('should enforce maximum suggestion limit', async () => {
      mockContactsAPIService.getContacts.mockResolvedValue({
        contacts: [],
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/search/suggestions?q=test&limit=20'); // Should be capped at 10
      
      await SUGGESTIONS_GET(request);
      
      expect(mockContactsAPIService.getContacts).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 5 // Half of max 10
        })
      );
    });
  });

  describe('Permission Integration', () => {
    test('should require both contacts and companies read permissions for search', () => {
      expect(mockAPIMiddleware.withAuth).toHaveBeenCalledWith(
        expect.any(Function),
        ['contacts:read', 'companies:read']
      );
    });
  });

});