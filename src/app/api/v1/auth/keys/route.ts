// src/app/api/v1/auth/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
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
    // Initialisiere mit Beispiel-Key
    mockApiKeys.set(organizationId, [
      {
        id: 'key_1',
        name: 'Salesforce Integration',
        keyPreview: 'cp_test_ab...',
        permissions: ['contacts:read', 'contacts:write', 'companies:read'],
        isActive: true,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        usage: {
          totalRequests: 1250,
          requestsThisHour: 45,
          requestsToday: 320,
          lastUsedAt: undefined
        },
        createdAt: '2025-01-10T10:00:00Z'
      }
    ]);
  }
  
  // Filtere gelöschte Keys aus
  const keys = mockApiKeys.get(organizationId) || [];
  return keys.filter(key => !deletedKeys.has(key.id));
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    try {
      // Lade echte API Keys aus Firestore
      const apiKeys = await apiAuthService.getAPIKeys(context.organizationId, context.userId);
      
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
      
      return NextResponse.json(safeKeys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      // Fallback zu Mock-Daten falls Firestore nicht verfügbar
      const apiKeys = getOrganizationKeys(context.organizationId);
      return NextResponse.json(apiKeys);
    }
  });
}

/**
 * POST /api/v1/auth/keys  
 * Erstelle neuen API-Key
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    try {
      // Parse Request Body
      const createRequest = await req.json() as APIKeyCreateRequest;
      
      // Validiere erforderliche Felder
      if (!createRequest.name || !createRequest.permissions || createRequest.permissions.length === 0) {
        return NextResponse.json(
          { error: 'Name and permissions are required' },
          { status: 400 }
        );
      }
      
      // Erstelle echten API-Key in Firestore
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
      
      return NextResponse.json(newAPIKey, { status: 201 });
      
    } catch (error) {
      console.error('Failed to create API key:', error);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }
  });
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200, 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}