// src/app/api/v1/auth/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { withAuth } from '@/lib/api/auth-middleware';
import { APIKeyCreateRequest } from '@/types/api';
import { apiAuthService } from '@/lib/api/api-auth-service';

/**
 * API-Key Management Endpoints
 * Diese Endpoints werden von der Admin-UI verwendet, nicht als öffentliche API
 */

/**
 * GET /api/v1/auth/keys
 * Hole alle API-Keys der Organisation
 */
// In-memory storage für Mock-Daten (in Production: Firestore)
const mockApiKeys = new Map<string, any[]>();
export const deletedKeys = new Set<string>();

function getOrganizationKeys(organizationId: string): any[] {
  if (!mockApiKeys.has(organizationId)) {
    // Initialisiere mit leerer Liste - KEIN Beispiel-Key mehr
    mockApiKeys.set(organizationId, []);
  }
  
  // Filtere gelöschte Keys aus
  const keys = mockApiKeys.get(organizationId) || [];
  return keys.filter(key => !deletedKeys.has(key.id));
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEYS ROUTE GET DEBUG ===');
    console.log('Request URL:', request.url);
    console.log('=== AUTH CONTEXT DEBUG (FIREBASE) ===');
    console.log('Organization ID:', context.organizationId);
    console.log('User ID:', context.userId);
    
    try {
      console.log('=== CALLING API AUTH SERVICE ===');
      // Lade echte API Keys aus Firestore
      const apiKeys = await apiAuthService.getAPIKeys(context.organizationId, context.userId);
      console.log('=== API KEYS LOADED ===');
      
      // Entferne sensible Daten für UI
      const safeKeys = apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPreview: key.keyPreview,
        permissions: key.permissions,
        isActive: key.isActive,
        rateLimit: key.rateLimit,
        usage: key.usage || {
          totalRequests: 0,
          requestsThisHour: 0,
          requestsToday: 0
        },
        createdAt: key.createdAt?.toISOString?.() || key.createdAt
      }));
      
      console.log('=== SAFE KEYS PREPARED ===');
      console.log('Safe keys count:', safeKeys.length);
      return APIMiddleware.successResponse(safeKeys);
    } catch (error) {
      console.error('=== API KEYS ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error:', error);
      
      // Für Live-System: Kein Fallback zu Mock-Daten - returne leere Liste
      if (process.env.VERCEL_ENV === 'production' || process.env.API_ENV === 'production') {
        console.log('=== PRODUCTION: No fallback to mock data ===');
        return APIMiddleware.successResponse([]);
      }
      
      console.log('=== DEVELOPMENT: FALLBACK TO MOCK SYSTEM ===');
      // Fallback zu Mock-Daten nur in Development
      const apiKeys = getOrganizationKeys(context.organizationId);
      console.log('Mock keys count:', apiKeys.length);
      return APIMiddleware.successResponse(apiKeys);
    }
  });
}

/**
 * POST /api/v1/auth/keys  
 * Erstelle neuen API-Key
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEYS ROUTE POST DEBUG ===');
    console.log('Request URL:', request.url);
    console.log('=== AUTH CONTEXT DEBUG (FIREBASE) ===');
    console.log('Organization ID:', context.organizationId);
    console.log('User ID:', context.userId);
    
    try {
      console.log('=== PARSING REQUEST BODY ===');
      // Parse Request Body
      const createRequest = await RequestParser.parseJSON<APIKeyCreateRequest>(request);
      console.log('Create request:', createRequest);
      
      // Validiere erforderliche Felder
      RequestParser.validateRequired(createRequest, ['name', 'permissions']);
      
      if (!createRequest.permissions || createRequest.permissions.length === 0) {
        return APIMiddleware.handleError({
          name: 'APIError',
          statusCode: 400,
          errorCode: 'INVALID_REQUEST_DATA',
          message: 'Permissions array cannot be empty'
        });
      }
      
      try {
        console.log('=== CALLING FIRESTORE API KEY SERVICE ===');
        // Versuche echten API-Key in Firestore zu erstellen
        const newAPIKey = await apiAuthService.createAPIKey({
          organizationId: context.organizationId,
          createdBy: context.userId,
          name: createRequest.name,
          permissions: createRequest.permissions,
          expiresInDays: createRequest.expiresInDays,
          rateLimit: {
            requestsPerHour: createRequest.rateLimit?.requestsPerHour || 1000,
            requestsPerMinute: createRequest.rateLimit?.requestsPerMinute || 60,
            burstLimit: 10
          },
          allowedIPs: createRequest.allowedIPs
        });
        
        console.log('=== FIRESTORE API KEY CREATED ===');
        console.log('New API Key ID:', newAPIKey.id);
        return APIMiddleware.successResponse(newAPIKey, 201);
        
      } catch (firestoreError) {
        console.warn('Firestore API key creation failed:', firestoreError);
        
        // Für Live-System: Kein Fallback zu Mock-System - Fehler weiterwerfen
        if (process.env.VERCEL_ENV === 'production' || process.env.API_ENV === 'production') {
          console.log('=== PRODUCTION: No fallback to mock system ===');
          throw firestoreError;
        }
        
        console.log('=== DEVELOPMENT: FALLBACK TO MOCK SYSTEM ===');
        // Fallback zu Mock-System nur in Development
        const fullKey = `cp_test_${Math.random().toString(36).substring(2)}${Date.now()}abcd1234efgh5678ijkl9012mnop`;
        const newAPIKey = {
          id: `key_${Date.now()}`,
          name: createRequest.name,
          key: fullKey, // Vollständiger Key - nur bei Creation zurückgegeben
          keyPreview: `${fullKey.substring(0, 10)}...`,
          permissions: createRequest.permissions,
          isActive: true,
          rateLimit: {
            requestsPerHour: createRequest.rateLimit?.requestsPerHour || 1000,
            requestsPerMinute: createRequest.rateLimit?.requestsPerMinute || 60,
            burstLimit: 10
          },
          usage: {
            totalRequests: 0,
            requestsThisHour: 0,
            requestsToday: 0
          },
          createdAt: new Date().toISOString()
        };
        
        // Speichere den neuen Key im Mock-System
        const orgKeys = getOrganizationKeys(context.organizationId);
        const keyWithoutFullKey = { ...newAPIKey };
        delete keyWithoutFullKey.key; // Entferne full key für storage
        orgKeys.push(keyWithoutFullKey);
        mockApiKeys.set(context.organizationId, orgKeys);
        
        return APIMiddleware.successResponse(newAPIKey, 201);
      }
      
    } catch (error) {
      console.error('=== API KEY CREATION ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error:', error);
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