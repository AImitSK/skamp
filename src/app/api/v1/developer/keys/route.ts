// src/app/api/v1/developer/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { withAuth } from '@/lib/api/auth-middleware';

/**
 * Developer Portal Keys Endpoint
 * TEMPORÄR: Mock-Implementierung ohne Firebase Admin SDK
 * TODO: Später auf echte Firestore-Implementierung umstellen
 */

// Mock API Keys für Developer Portal
function getDeveloperMockKeys(organizationId: string, userId: string) {
  return [
    {
      id: 'dev_key_1',
      name: 'Developer Test Key',
      keyPreview: 'cp_live_abc123...',
      permissions: ['contacts:read', 'companies:read'],
      status: 'active',
      usage: {
        today: Math.floor(Math.random() * 50) + 10,
        month: Math.floor(Math.random() * 1000) + 300,
        total: Math.floor(Math.random() * 5000) + 2000
      },
      rateLimit: {
        limit: 1000,
        remaining: Math.floor(Math.random() * 800) + 100
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dev_key_2', 
      name: 'Production Integration',
      keyPreview: 'cp_live_def456...',
      permissions: ['contacts:read', 'contacts:write', 'companies:read'],
      status: 'active',
      usage: {
        today: Math.floor(Math.random() * 100) + 50,
        month: Math.floor(Math.random() * 2000) + 800,
        total: Math.floor(Math.random() * 10000) + 5000
      },
      rateLimit: {
        limit: 1000,
        remaining: Math.floor(Math.random() * 600) + 200
      },
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString()
    }
  ];
}

/**
 * GET /api/v1/developer/keys
 * Hole API Keys für Developer Portal
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== DEVELOPER KEYS GET - MOCK VERSION ===');
    console.log('Organization ID:', context.organizationId);
    console.log('User ID:', context.userId);
    
    try {
      const apiKeys = getDeveloperMockKeys(context.organizationId, context.userId);
      console.log('Mock Developer Keys count:', apiKeys.length);
      
      return APIMiddleware.successResponse(apiKeys);
      
    } catch (error) {
      console.error('Error getting developer keys:', error);
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
 * POST /api/v1/developer/keys
 * Erstelle neuen API Key für Developer Portal
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== DEVELOPER KEYS POST - MOCK VERSION ===');
    
    try {
      const body = await request.json();
      console.log('Create request:', body);
      
      // Mock neuen Developer API Key erstellen
      const newKey = {
        id: `dev_key_${Date.now()}`,
        name: body.name || 'New Developer Key',
        key: `cp_live_${Math.random().toString(36).substring(2, 15)}${Date.now()}dev1234`, // Vollständiger Key nur bei Creation
        keyPreview: `cp_live_${Math.random().toString(36).substring(2, 8)}...`,
        permissions: body.permissions || ['contacts:read'],
        status: 'active',
        usage: {
          today: 0,
          month: 0,
          total: 0
        },
        rateLimit: {
          limit: body.rateLimit || 1000,
          remaining: body.rateLimit || 1000
        },
        createdAt: new Date().toISOString(),
        lastUsed: null
      };
      
      console.log('Mock Developer API Key created:', newKey.id);
      return APIMiddleware.successResponse(newKey, 201);
      
    } catch (error) {
      console.error('Error creating developer key:', error);
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