// src/lib/api/__tests__/api-auth-service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { APIAuthService } from '../api-auth-service';
import { APIKeyCreateRequest, APIError, API_ERROR_CODES } from '@/types/api';

// Mock Firebase
jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

// Mock Firestore functions
const mockAddDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ seconds: 1641024000, nanoseconds: 0 }));
const mockIncrement = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  serverTimestamp: mockServerTimestamp,
  increment: mockIncrement,
  Timestamp: {
    fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }))
  }
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test1234567890')
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'hashed_api_key_value')
    }))
  })),
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'random_hex_string')
  }))
}));

describe('APIAuthService', () => {
  let apiAuthService: APIAuthService;
  const testOrganizationId = 'org_123';
  const testUserId = 'user_456';

  beforeEach(() => {
    apiAuthService = new APIAuthService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createAPIKey', () => {
    it('should create API key with proper permissions and default settings', async () => {
      const request: APIKeyCreateRequest = {
        name: 'Test API Key',
        permissions: ['contacts:read', 'contacts:write']
      };

      // Mock successful document creation
      mockAddDoc.mockResolvedValue({ id: 'api_key_123' });

      const result = await apiAuthService.createAPIKey(request, testOrganizationId, testUserId);

      expect(result).toEqual({
        id: 'api_key_123',
        name: 'Test API Key',
        key: expect.stringMatching(/^cp_test_/), // Should start with test prefix in non-prod
        keyPreview: expect.stringMatching(/^cp_test_\w{8}\.\.\./),
        permissions: ['contacts:read', 'contacts:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        usage: {
          totalRequests: 0,
          requestsThisHour: 0,
          requestsToday: 0
        },
        createdAt: expect.any(String)
      });

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        expect.objectContaining({
          name: 'Test API Key',
          organizationId: testOrganizationId,
          userId: testUserId,
          permissions: ['contacts:read', 'contacts:write'],
          isActive: true
        })
      );
    });

    it('should create API key with custom rate limits and expiry', async () => {
      const request: APIKeyCreateRequest = {
        name: 'Limited API Key',
        permissions: ['contacts:read'],
        rateLimit: {
          requestsPerHour: 500,
          requestsPerMinute: 30
        },
        expiresInDays: 30,
        allowedIPs: ['192.168.1.1', '10.0.0.1']
      };

      mockAddDoc.mockResolvedValue({ id: 'api_key_456' });

      const result = await apiAuthService.createAPIKey(request, testOrganizationId, testUserId);

      expect(result.rateLimit).toEqual({
        requestsPerHour: 500,
        requestsPerMinute: 30,
        burstLimit: 10
      });

      expect(result.expiresAt).toBeDefined();
      
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rateLimit: {
            requestsPerHour: 500,
            requestsPerMinute: 30,
            burstLimit: 10
          },
          allowedIPs: ['192.168.1.1', '10.0.0.1'],
          expiresAt: expect.anything()
        })
      );
    });

    it('should generate unique API keys with proper format', async () => {
      mockAddDoc.mockResolvedValue({ id: 'api_key_789' });

      const request: APIKeyCreateRequest = {
        name: 'Test Key',
        permissions: ['contacts:read']
      };

      const result = await apiAuthService.createAPIKey(request, testOrganizationId, testUserId);

      expect(result.key).toMatch(/^cp_(test|live)_[a-f0-9]{32}$/);
      expect(result.keyPreview).toMatch(/^cp_(test|live)_\w{8}\.\.\.$/);
    });
  });

  describe('validateAPIKey', () => {
    it('should validate API key and return organization context', async () => {
      const testAPIKey = 'cp_test_abcd1234efgh5678ijkl9012mnop3456qrst7890';
      const mockApiKeyData = {
        id: 'api_key_123',
        organizationId: testOrganizationId,
        userId: testUserId,
        permissions: ['contacts:read', 'contacts:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        usage: {
          totalRequests: 50,
          requestsThisHour: 5,
          requestsToday: 25
        },
        expiresAt: null,
        allowedIPs: []
      };

      // Mock successful API key lookup
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'api_key_123',
          data: () => mockApiKeyData
        }]
      });

      // Mock usage update
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await apiAuthService.validateAPIKey(
        testAPIKey,
        '192.168.1.100',
        'test-user-agent'
      );

      expect(result).toEqual({
        organizationId: testOrganizationId,
        userId: testUserId,
        apiKeyId: 'api_key_123',
        permissions: ['contacts:read', 'contacts:write'],
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        clientIP: '192.168.1.100',
        userAgent: 'test-user-agent'
      });

      expect(mockUpdateDoc).toHaveBeenCalled(); // Usage stats should be updated
    });

    it('should throw error for invalid API key', async () => {
      const invalidAPIKey = 'invalid_key';

      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      await expect(
        apiAuthService.validateAPIKey(invalidAPIKey, '192.168.1.100', 'test-agent')
      ).rejects.toThrow(APIError);

      await expect(
        apiAuthService.validateAPIKey(invalidAPIKey, '192.168.1.100', 'test-agent')
      ).rejects.toMatchObject({
        statusCode: 401,
        errorCode: API_ERROR_CODES.INVALID_API_KEY
      });
    });

    it('should throw error for expired API key', async () => {
      const expiredAPIKey = 'cp_test_expired123';
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'api_key_expired',
          data: () => ({
            organizationId: testOrganizationId,
            userId: testUserId,
            isActive: true,
            expiresAt: {
              toDate: () => pastDate
            }
          })
        }]
      });

      await expect(
        apiAuthService.validateAPIKey(expiredAPIKey, '192.168.1.100', 'test-agent')
      ).rejects.toMatchObject({
        statusCode: 401,
        errorCode: API_ERROR_CODES.EXPIRED_API_KEY
      });
    });

    it('should enforce IP whitelist when configured', async () => {
      const testAPIKey = 'cp_test_restricted123';
      
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'api_key_restricted',
          data: () => ({
            organizationId: testOrganizationId,
            userId: testUserId,
            isActive: true,
            allowedIPs: ['192.168.1.1', '10.0.0.1'],
            expiresAt: null
          })
        }]
      });

      // Should reject IP not in whitelist
      await expect(
        apiAuthService.validateAPIKey(testAPIKey, '192.168.1.100', 'test-agent')
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: API_ERROR_CODES.IP_NOT_ALLOWED
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limits', async () => {
      const context = {
        organizationId: testOrganizationId,
        userId: testUserId,
        apiKeyId: 'api_key_123',
        permissions: ['contacts:read'],
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        clientIP: '192.168.1.100',
        userAgent: 'test-agent'
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          usage: {
            requestsThisHour: 500 // Under limit
          }
        })
      });

      // Should not throw
      await expect(
        apiAuthService.checkRateLimit(context, '/api/v1/contacts')
      ).resolves.toBeUndefined();
    });

    it('should throw error when rate limit exceeded', async () => {
      const context = {
        organizationId: testOrganizationId,
        userId: testUserId,
        apiKeyId: 'api_key_123',
        permissions: ['contacts:read'],
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        clientIP: '192.168.1.100',
        userAgent: 'test-agent'
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          usage: {
            requestsThisHour: 1000 // At limit
          }
        })
      });

      await expect(
        apiAuthService.checkRateLimit(context, '/api/v1/contacts')
      ).rejects.toMatchObject({
        statusCode: 429,
        errorCode: API_ERROR_CODES.RATE_LIMIT_EXCEEDED
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has all required permissions', () => {
      const context = {
        organizationId: testOrganizationId,
        userId: testUserId,
        apiKeyId: 'api_key_123',
        permissions: ['contacts:read', 'contacts:write', 'companies:read'],
        rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
        clientIP: '192.168.1.100',
        userAgent: 'test-agent'
      };

      expect(
        apiAuthService.hasPermission(context, ['contacts:read'])
      ).toBe(true);

      expect(
        apiAuthService.hasPermission(context, ['contacts:read', 'contacts:write'])
      ).toBe(true);
    });

    it('should return false when user lacks required permissions', () => {
      const context = {
        organizationId: testOrganizationId,
        userId: testUserId,
        apiKeyId: 'api_key_123',
        permissions: ['contacts:read'],
        rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
        clientIP: '192.168.1.100',
        userAgent: 'test-agent'
      };

      expect(
        apiAuthService.hasPermission(context, ['contacts:write'])
      ).toBe(false);

      expect(
        apiAuthService.hasPermission(context, ['contacts:read', 'contacts:delete'])
      ).toBe(false);
    });
  });

  describe('getAPIKeys', () => {
    it('should return list of API keys for organization', async () => {
      const mockApiKeys = [
        {
          id: 'key1',
          data: () => ({
            name: 'Key 1',
            keyPreview: 'cp_test_abc...',
            permissions: ['contacts:read'],
            isActive: true,
            rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
            usage: { totalRequests: 100, requestsThisHour: 5, requestsToday: 25 },
            createdAt: { toDate: () => new Date('2025-01-01') },
            expiresAt: null
          })
        },
        {
          id: 'key2',
          data: () => ({
            name: 'Key 2',
            keyPreview: 'cp_test_def...',
            permissions: ['publications:read'],
            isActive: false,
            rateLimit: { requestsPerHour: 500, requestsPerMinute: 30, burstLimit: 5 },
            usage: { totalRequests: 0, requestsThisHour: 0, requestsToday: 0 },
            createdAt: { toDate: () => new Date('2025-01-02') },
            expiresAt: { toDate: () => new Date('2025-02-01') }
          })
        }
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockApiKeys.forEach(callback)
      });

      const result = await apiAuthService.getAPIKeys(testOrganizationId, testUserId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'key1',
        name: 'Key 1',
        keyPreview: 'cp_test_abc...',
        permissions: ['contacts:read'],
        isActive: true,
        rateLimit: { requestsPerHour: 1000, requestsPerMinute: 60, burstLimit: 10 },
        usage: { totalRequests: 100, requestsThisHour: 5, requestsToday: 25 },
        createdAt: '2025-01-01T00:00:00.000Z'
      });
    });
  });

  describe('deleteAPIKey', () => {
    it('should delete API key when user has permission', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          organizationId: testOrganizationId,
          userId: testUserId
        })
      });

      mockDeleteDoc.mockResolvedValue(undefined);

      await expect(
        apiAuthService.deleteAPIKey('api_key_123', testOrganizationId)
      ).resolves.toBeUndefined();

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should throw error when API key not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      await expect(
        apiAuthService.deleteAPIKey('nonexistent_key', testOrganizationId)
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: API_ERROR_CODES.RESOURCE_NOT_FOUND
      });
    });

    it('should throw error when user lacks permission to delete', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          organizationId: 'different_org',
          userId: 'different_user'
        })
      });

      await expect(
        apiAuthService.deleteAPIKey('api_key_123', testOrganizationId)
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: API_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      });
    });
  });
});