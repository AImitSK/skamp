// src/app/api/v1/auth/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { withAuth } from '@/lib/api/auth-middleware';

/**
 * API-Key Management Endpoints für Admin-UI
 * TEMPORÄR: Mock-Implementierung ohne Firebase Admin SDK
 * TODO: Später auf echte Firestore-Implementierung umstellen
 */

// In-memory Mock-Daten (in Production: Firestore)
const mockApiKeys = new Map<string, any[]>();

function getMockAPIKeys(organizationId: string) {
  if (!mockApiKeys.has(organizationId)) {
    // Initialisiere mit 5 Mock-API-Keys (passend zu "Aktive API Keys: 5")
    mockApiKeys.set(organizationId, [
      {
        id: 'key_production_1',
        name: 'Production CRM Integration',
        keyPreview: 'cp_live_abc123...',
        permissions: ['contacts:read', 'contacts:write', 'companies:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60
        },
        usage: {
          totalRequests: 15420,
          requestsThisHour: 45,
          requestsToday: 520
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'key_salesforce_1',
        name: 'Salesforce Sync',
        keyPreview: 'cp_live_def456...',
        permissions: ['contacts:read', 'companies:read', 'companies:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 500,
          requestsPerMinute: 30
        },
        usage: {
          totalRequests: 8934,
          requestsThisHour: 12,
          requestsToday: 234
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'key_hubspot_1',
        name: 'HubSpot Integration',
        keyPreview: 'cp_live_ghi789...',
        permissions: ['contacts:read', 'publications:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 300,
          requestsPerMinute: 20
        },
        usage: {
          totalRequests: 3421,
          requestsThisHour: 8,
          requestsToday: 89
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'key_webhook_1',
        name: 'Webhook Processor',
        keyPreview: 'cp_live_jkl012...',
        permissions: ['webhooks:read', 'webhooks:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 2000,
          requestsPerMinute: 100
        },
        usage: {
          totalRequests: 25678,
          requestsThisHour: 67,
          requestsToday: 890
        },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'key_test_1',
        name: 'Development Testing',
        keyPreview: 'cp_test_mno345...',
        permissions: ['contacts:read'],
        isActive: false,
        rateLimit: {
          requestsPerHour: 100,
          requestsPerMinute: 10
        },
        usage: {
          totalRequests: 156,
          requestsThisHour: 0,
          requestsToday: 0
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
  }
  
  return mockApiKeys.get(organizationId) || [];
}

/**
 * GET /api/v1/auth/keys
 * Hole alle API-Keys der Organisation
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEYS GET - MOCK VERSION ===');
    console.log('Organization ID:', context.organizationId);
    
    try {
      const apiKeys = getMockAPIKeys(context.organizationId);
      console.log('Mock API Keys count:', apiKeys.length);
      
      return APIMiddleware.successResponse(apiKeys);
    } catch (error) {
      console.error('Error getting API keys:', error);
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to load API keys'
      });
    }
  });
}

/**
 * POST /api/v1/auth/keys  
 * Erstelle neuen API-Key (Mock-Implementierung)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEYS POST - MOCK VERSION ===');
    
    try {
      const body = await request.json();
      console.log('Create request:', body);
      
      // Mock neuen API Key erstellen
      const newKey = {
        id: `key_${Date.now()}`,
        name: body.name || 'New API Key',
        key: `cp_live_${Math.random().toString(36).substring(2, 15)}${Date.now()}mock1234`, // Vollständiger Key nur bei Creation
        keyPreview: `cp_live_${Math.random().toString(36).substring(2, 8)}...`,
        permissions: body.permissions || ['contacts:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: body.rateLimit?.requestsPerHour || 1000,
          requestsPerMinute: body.rateLimit?.requestsPerMinute || 60
        },
        usage: {
          totalRequests: 0,
          requestsThisHour: 0,
          requestsToday: 0
        },
        createdAt: new Date().toISOString()
      };
      
      // Zu Mock-Daten hinzufügen
      const orgKeys = getMockAPIKeys(context.organizationId);
      const keyWithoutFullKey = { ...newKey };
      delete keyWithoutFullKey.key; // Entferne full key für storage
      orgKeys.push(keyWithoutFullKey);
      mockApiKeys.set(context.organizationId, orgKeys);
      
      console.log('Mock API Key created:', newKey.id);
      return APIMiddleware.successResponse(newKey, 201);
      
    } catch (error) {
      console.error('Error creating API key:', error);
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to create API key'
      });
    }
  });
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}