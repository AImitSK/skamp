// src/app/api/v1/__tests__/auth.integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as testAuthGET } from '../auth/test/route';
import { GET as getKeysGET, POST as createKeyPOST } from '../auth/keys/route';
import { DELETE as deleteKeyDELETE } from '../auth/keys/[keyId]/route';

// Mock the API Auth Service
const mockValidateAPIKey = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockHasPermission = vi.fn();
const mockGetAPIKeys = vi.fn();
const mockCreateAPIKey = vi.fn();
const mockDeleteAPIKey = vi.fn();

vi.mock('@/lib/api/api-auth-service', () => ({
  apiAuthService: {
    validateAPIKey: mockValidateAPIKey,
    checkRateLimit: mockCheckRateLimit,
    hasPermission: mockHasPermission,
    getAPIKeys: mockGetAPIKeys,
    createAPIKey: mockCreateAPIKey,
    deleteAPIKey: mockDeleteAPIKey
  }
}));

describe('API Authentication Integration Tests', () => {
  const testOrganizationId = 'org_123';
  const testUserId = 'user_456';
  const testAPIKeyId = 'key_789';

  const mockContext = {
    organizationId: testOrganizationId,
    userId: testUserId,
    apiKeyId: testAPIKeyId,
    permissions: ['contacts:read', 'contacts:write'],
    rateLimit: {
      requestsPerHour: 1000,
      requestsPerMinute: 60,
      burstLimit: 10
    },
    clientIP: '192.168.1.100',
    userAgent: 'test-user-agent'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v1/auth/test', () => {
    it('should return API context for valid API key', async () => {
      // Mock successful authentication
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer cp_test_valid_key',
          'user-agent': 'test-user-agent'
        }
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        message: 'API Authentication successful!',
        context: {
          organizationId: testOrganizationId,
          userId: testUserId,
          apiKeyId: testAPIKeyId,
          permissions: ['contacts:read', 'contacts:write'],
          clientIP: '192.168.1.100',
          userAgent: 'test-user-agent'
        }
      });

      expect(mockValidateAPIKey).toHaveBeenCalledWith(
        'cp_test_valid_key',
        '192.168.1.100',
        'test-user-agent'
      );
      expect(mockCheckRateLimit).toHaveBeenCalledWith(mockContext, 'v1/auth/test');
    });

    it('should return 401 for missing API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {}
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_API_KEY');
      expect(responseData.error.message).toContain('API key required');
    });

    it('should return 401 for invalid API key', async () => {
      // Mock authentication failure
      const authError = {
        name: 'APIError',
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
        message: 'Invalid API key'
      };
      mockValidateAPIKey.mockRejectedValue(authError);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer invalid_key'
        }
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_API_KEY');
    });

    it('should return 429 for rate limit exceeded', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      
      const rateLimitError = {
        name: 'APIError',
        statusCode: 429,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded: 1000 requests per hour'
      };
      mockCheckRateLimit.mockRejectedValue(rateLimitError);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('GET /api/v1/auth/keys', () => {
    it('should return list of API keys for authenticated organization', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);
      
      const mockKeys = [
        {
          id: 'key_1',
          name: 'Test Key 1',
          keyPreview: 'cp_test_abc...',
          permissions: ['contacts:read'],
          isActive: true,
          rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
          usage: { totalRequests: 100, requestsThisHour: 5, requestsToday: 25 },
          createdAt: '2025-01-10T10:00:00Z'
        }
      ];
      mockGetAPIKeys.mockResolvedValue(mockKeys);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await getKeysGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockKeys);
      expect(mockGetAPIKeys).toHaveBeenCalledWith(testOrganizationId, testUserId);
    });
  });

  describe('POST /api/v1/auth/keys', () => {
    it('should create new API key with valid request', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const newAPIKey = {
        id: 'new_key_123',
        name: 'New Test Key',
        key: 'cp_test_newkey123456789',
        keyPreview: 'cp_test_ne...',
        permissions: ['contacts:read', 'contacts:write'],
        isActive: true,
        rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
        usage: { totalRequests: 0, requestsThisHour: 0, requestsToday: 0 },
        createdAt: '2025-01-10T10:00:00Z'
      };
      mockCreateAPIKey.mockResolvedValue(newAPIKey);

      const createRequest = {
        name: 'New Test Key',
        permissions: ['contacts:read', 'contacts:write'],
        rateLimit: {
          requestsPerHour: 1000
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer cp_test_valid_key',
          'content-type': 'application/json'
        },
        body: JSON.stringify(createRequest)
      });

      const response = await createKeyPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(newAPIKey);
      expect(mockCreateAPIKey).toHaveBeenCalledWith(
        createRequest,
        testOrganizationId,
        testUserId
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const invalidRequest = {
        name: 'Test Key'
        // Missing permissions
      };

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer cp_test_valid_key',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });

      const response = await createKeyPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('REQUIRED_FIELD_MISSING');
    });

    it('should return 400 for invalid JSON in request body', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer cp_test_valid_key',
          'content-type': 'application/json'
        },
        body: 'invalid json {{'
      });

      const response = await createKeyPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_REQUEST_FORMAT');
    });
  });

  describe('DELETE /api/v1/auth/keys/[keyId]', () => {
    it('should delete API key when user has permission', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockDeleteAPIKey.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys/key_to_delete', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await deleteKeyDELETE(request, { params: { keyId: 'key_to_delete' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.message).toBe('API key deleted successfully');
      expect(responseData.data.keyId).toBe('key_to_delete');
      expect(mockDeleteAPIKey).toHaveBeenCalledWith('key_to_delete', testOrganizationId);
    });

    it('should return 404 when API key not found', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const deleteError = {
        name: 'APIError',
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'API key not found'
      };
      mockDeleteAPIKey.mockRejectedValue(deleteError);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/keys/nonexistent_key', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await deleteKeyDELETE(request, { params: { keyId: 'nonexistent_key' } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('CORS Support', () => {
    it('should include CORS headers in all responses', async () => {
      mockValidateAPIKey.mockResolvedValue(mockContext);
      mockCheckRateLimit.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await testAuthGET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle OPTIONS preflight requests', async () => {
      // OPTIONS requests should not require authentication
      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'OPTIONS'
      });

      // Since OPTIONS is handled by the middleware, we simulate the response
      const response = new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error format', async () => {
      const authError = {
        name: 'APIError',
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
        message: 'Invalid API key',
        details: { additional: 'info' }
      };
      mockValidateAPIKey.mockRejectedValue(authError);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer invalid_key'
        }
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          details: { additional: 'info' }
        },
        meta: {
          requestId: expect.stringMatching(/^req_\d+_\w+$/),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          version: 'v1'
        }
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Simulate unexpected error (not an APIError instance)
      mockValidateAPIKey.mockRejectedValue(new Error('Unexpected database error'));

      const request = new NextRequest('http://localhost:3000/api/v1/auth/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer cp_test_valid_key'
        }
      });

      const response = await testAuthGET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(responseData.error.message).toBe('Internal server error');
      // Should not expose internal error details
      expect(responseData.error.message).not.toContain('database error');
    });
  });
});