// src/app/api/v1/auth/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { APIKeyCreateRequest } from '@/types/api';

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
    
    // Mock API Keys für die UI - in Production würden diese aus Firestore kommen
    const apiKeys = getOrganizationKeys(context.organizationId);
    
    return NextResponse.json(apiKeys);
  });
}

/**
 * POST /api/v1/auth/keys  
 * Erstelle neuen API-Key
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    // Parse Request Body
    const createRequest = await req.json() as APIKeyCreateRequest;
    
    // Validiere erforderliche Felder
    if (!createRequest.name || !createRequest.permissions || createRequest.permissions.length === 0) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      );
    }
    
    // Mock neuer API-Key - in Production würde dieser in Firestore gespeichert
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
    
    // Speichere den neuen Key
    const orgKeys = getOrganizationKeys(context.organizationId);
    const keyWithoutFullKey = { ...newAPIKey };
    delete keyWithoutFullKey.key; // Entferne full key für storage
    orgKeys.push(keyWithoutFullKey);
    mockApiKeys.set(context.organizationId, orgKeys);
    
    return NextResponse.json(newAPIKey, { status: 201 });
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