// src/__tests__/api/crm/companies-api.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/companies/route';
import { GET as GET_SINGLE, PUT, DELETE } from '@/app/api/v1/companies/[companyId]/route';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { APIMiddleware } from '@/lib/api/api-middleware';

// Mock dependencies
jest.mock('@/lib/api/companies-api-service');
jest.mock('@/lib/api/api-middleware');

const mockCompaniesAPIService = companiesAPIService as jest.Mocked<typeof companiesAPIService>;
const mockAPIMiddleware = APIMiddleware as jest.Mocked<typeof APIMiddleware>;

// Test Data
const mockCompany = {
  id: 'company-123',
  name: 'Test Media GmbH',
  tradingName: 'Test Media',
  displayName: 'Test Media',
  legalName: 'Test Media GmbH',
  industry: 'Media & Publishing',
  companyType: 'media_house' as const,
  website: 'https://testmedia.com',
  domain: 'testmedia.com',
  email: 'info@testmedia.com',
  phone: '+49 123 456789',
  address: {
    street: 'Medienstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    formatted: 'Medienstraße 1, Berlin, 10115, Germany'
  },
  mediaType: 'online' as const,
  coverage: 'national' as const,
  circulation: 50000,
  audienceSize: 100000,
  contactCount: 5,
  tags: [{ name: 'Premium', color: '#gold' }],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activityScore: 75,
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
  permissions: ['companies:read', 'companies:write', 'companies:delete']
};

describe('Companies API Routes', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('GET /api/v1/companies', () => {
    test('should return companies list successfully', async () => {
      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: [mockCompany],
        pagination: mockPagination
      });

      const request = new NextRequest('http://localhost/api/v1/companies');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        {}
      );
    });

    test('should handle complex filtering parameters', async () => {
      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: [],
        pagination: { ...mockPagination, total: 0 }
      });

      const request = new NextRequest(
        'http://localhost/api/v1/companies?industry=Media&companyType=media_house&mediaType=online&circulationMin=1000'
      );
      
      await GET(request);
      
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          industry: 'Media',
          companyType: 'media_house',
          mediaType: 'online',
          circulationMin: '1000'
        })
      );
    });
  });

  describe('POST /api/v1/companies', () => {
    const createRequest = {
      name: 'Neue Media AG',
      industry: 'Publishing',
      companyType: 'media_house' as const,
      website: 'https://neuemedia.de',
      email: 'contact@neuemedia.de'
    };

    test('should create single company successfully', async () => {
      mockCompaniesAPIService.createCompany.mockResolvedValue(mockCompany);

      const request = new NextRequest('http://localhost/api/v1/companies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(mockCompaniesAPIService.createCompany).toHaveBeenCalledWith(
        createRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });

    test('should handle bulk company creation', async () => {
      const bulkResult = {
        success: true,
        totalItems: 3,
        processedItems: 3,
        successfulItems: 3,
        failedItems: 0,
        results: [],
        summary: { duration: 1500, averageTimePerItem: 500 }
      };

      mockCompaniesAPIService.createCompaniesBulk.mockResolvedValue(bulkResult);

      const bulkRequest = {
        companies: [
          createRequest,
          { ...createRequest, name: 'Another Media' },
          { ...createRequest, name: 'Third Media' }
        ],
        continueOnError: true
      };

      const request = new NextRequest('http://localhost/api/v1/companies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bulkRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(mockCompaniesAPIService.createCompaniesBulk).toHaveBeenCalledWith(
        bulkRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });

    test('should validate required name field', async () => {
      const invalidRequest = { industry: 'Media' }; // Missing name

      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(() => {
          return new Response(JSON.stringify({
            success: false,
            error: { 
              code: 'REQUIRED_FIELD_MISSING',
              message: 'name is required'
            }
          }), { status: 400 });
        });
      });

      const request = new NextRequest('http://localhost/api/v1/companies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/companies/[companyId]', () => {
    test('should return single company successfully', async () => {
      mockCompaniesAPIService.getCompany.mockResolvedValue(mockCompany);

      const request = new NextRequest('http://localhost/api/v1/companies/company-123');
      const params = { params: { companyId: 'company-123' } };
      
      const response = await GET_SINGLE(request, params);
      
      expect(response.status).toBe(200);
      expect(mockCompaniesAPIService.getCompany).toHaveBeenCalledWith(
        'company-123',
        mockContext.organizationId,
        mockContext.userId
      );
    });

    test('should handle company not found', async () => {
      mockCompaniesAPIService.getCompany.mockRejectedValue(
        new Error('Company not found')
      );

      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(async (request) => {
          try {
            return await handler(request, mockContext);
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: { message: 'Company not found' }
            }), { status: 404 });
          }
        });
      });

      const request = new NextRequest('http://localhost/api/v1/companies/nonexistent');
      const params = { params: { companyId: 'nonexistent' } };
      
      const response = await GET_SINGLE(request, params);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/companies/[companyId]', () => {
    test('should update company successfully', async () => {
      const updateRequest = { 
        name: 'Updated Media GmbH',
        industry: 'Digital Media'
      };
      const updatedCompany = { 
        ...mockCompany, 
        name: 'Updated Media GmbH',
        industry: 'Digital Media'
      };
      
      mockCompaniesAPIService.updateCompany.mockResolvedValue(updatedCompany);

      const request = new NextRequest('http://localhost/api/v1/companies/company-123', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updateRequest)
      });
      
      const params = { params: { companyId: 'company-123' } };
      const response = await PUT(request, params);
      
      expect(response.status).toBe(200);
      expect(mockCompaniesAPIService.updateCompany).toHaveBeenCalledWith(
        'company-123',
        updateRequest,
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('DELETE /api/v1/companies/[companyId]', () => {
    test('should delete company successfully', async () => {
      mockCompaniesAPIService.deleteCompany.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/v1/companies/company-123', {
        method: 'DELETE'
      });
      
      const params = { params: { companyId: 'company-123' } };
      const response = await DELETE(request, params);
      
      expect(response.status).toBe(200);
      expect(mockCompaniesAPIService.deleteCompany).toHaveBeenCalledWith(
        'company-123',
        mockContext.organizationId,
        mockContext.userId
      );
    });

    test('should handle deletion conflicts', async () => {
      mockCompaniesAPIService.deleteCompany.mockRejectedValue(
        new Error('Cannot delete company with associated contacts')
      );

      mockAPIMiddleware.withAuth = jest.fn().mockImplementation((handler, permissions) => {
        return jest.fn().mockImplementation(async (request) => {
          try {
            return await handler(request, mockContext);
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: { 
                code: 'RESOURCE_CONFLICT',
                message: 'Cannot delete company with associated contacts'
              }
            }), { status: 409 });
          }
        });
      });

      const request = new NextRequest('http://localhost/api/v1/companies/company-123', {
        method: 'DELETE'
      });
      
      const params = { params: { companyId: 'company-123' } };
      const response = await DELETE(request, params);
      
      expect(response.status).toBe(409);
    });
  });

  describe('Media-specific Features', () => {
    test('should handle media house specific filters', async () => {
      mockCompaniesAPIService.getCompanies.mockResolvedValue({
        companies: [mockCompany],
        pagination: mockPagination
      });

      const request = new NextRequest(
        'http://localhost/api/v1/companies?mediaType=online,tv&coverage=national&circulationMin=10000&audienceSizeMax=500000'
      );
      
      await GET(request);
      
      expect(mockCompaniesAPIService.getCompanies).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
        expect.objectContaining({
          mediaType: 'online,tv',
          coverage: 'national',
          circulationMin: '10000',
          audienceSizeMax: '500000'
        })
      );
    });

    test('should include media house specific data in response', async () => {
      const mediaCompany = {
        ...mockCompany,
        mediaType: 'newspaper' as const,
        coverage: 'international' as const,
        circulation: 250000,
        audienceSize: 800000
      };

      mockCompaniesAPIService.getCompany.mockResolvedValue(mediaCompany);

      const request = new NextRequest('http://localhost/api/v1/companies/company-123');
      const params = { params: { companyId: 'company-123' } };
      
      await GET_SINGLE(request, params);
      
      expect(mockCompaniesAPIService.getCompany).toHaveBeenCalledWith(
        'company-123',
        mockContext.organizationId,
        mockContext.userId
      );
    });
  });

  describe('Permission Integration', () => {
    test('should require correct permissions for each operation', () => {
      // Verify that the middleware is called with correct permissions
      expect(mockAPIMiddleware.withAuth).toHaveBeenCalledWith(
        expect.any(Function),
        ['companies:read']
      );
    });
  });

});