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
    // Generiere organization-spezifische Mock-Keys
    const orgPrefix = organizationId.substring(0, 8);
    const orgHash = organizationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Jede Organization bekommt unterschiedliche Mock-Daten
    mockApiKeys.set(organizationId, [
      {
        id: `key_${orgPrefix}_prod`,
        name: `CRM Integration (Org: ${orgPrefix})`,
        keyPreview: `cp_live_${orgPrefix}...`,
        permissions: ['contacts:read', 'contacts:write', 'companies:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60
        },
        usage: {
          totalRequests: 10000 + (orgHash % 10000),
          requestsThisHour: 20 + (orgHash % 50),
          requestsToday: 300 + (orgHash % 500)
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `key_${orgPrefix}_sf`,
        name: `Salesforce Sync (Org: ${orgPrefix})`,
        keyPreview: `cp_live_${orgPrefix}_sf...`,
        permissions: ['contacts:read', 'companies:read', 'companies:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 500,
          requestsPerMinute: 30
        },
        usage: {
          totalRequests: 8000 + (orgHash % 5000),
          requestsThisHour: 10 + (orgHash % 20),
          requestsToday: 200 + (orgHash % 300)
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `key_${orgPrefix}_hub`,
        name: `HubSpot Integration (Org: ${orgPrefix})`,
        keyPreview: `cp_live_${orgPrefix}_hub...`,
        permissions: ['contacts:read', 'publications:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 300,
          requestsPerMinute: 20
        },
        usage: {
          totalRequests: 3000 + (orgHash % 3000),
          requestsThisHour: 5 + (orgHash % 15),
          requestsToday: 80 + (orgHash % 100)
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `key_${orgPrefix}_webhook`,
        name: `Webhook Processor (Org: ${orgPrefix})`,
        keyPreview: `cp_live_${orgPrefix}_wh...`,
        permissions: ['webhooks:read', 'webhooks:write'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 2000,
          requestsPerMinute: 100
        },
        usage: {
          totalRequests: 20000 + (orgHash % 15000),
          requestsThisHour: 50 + (orgHash % 70),
          requestsToday: 700 + (orgHash % 500)
        },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `key_${orgPrefix}_test`,
        name: `Development Testing (Org: ${orgPrefix})`,
        keyPreview: `cp_test_${orgPrefix}...`,
        permissions: ['contacts:read'],
        isActive: false,
        rateLimit: {
          requestsPerHour: 100,
          requestsPerMinute: 10
        },
        usage: {
          totalRequests: 100 + (orgHash % 200),
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
      delete (keyWithoutFullKey as any).key; // Entferne full key für storage
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