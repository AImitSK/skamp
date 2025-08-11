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
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    // Mock API Keys für die UI - in Production würden diese aus Firestore kommen
    const apiKeys = [
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
    ];
    
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
    const newAPIKey = {
      id: `key_${Date.now()}`,
      name: createRequest.name,
      keyPreview: 'cp_test_xy...',
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