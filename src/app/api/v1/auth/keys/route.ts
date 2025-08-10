// src/app/api/v1/auth/keys/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { apiAuthService } from '@/lib/api/api-auth-service';
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
  return APIMiddleware.withAuth(async (request, context) => {
    
    const apiKeys = await apiAuthService.getAPIKeys(
      context.organizationId, 
      context.userId
    );
    
    return APIMiddleware.successResponse(apiKeys);
    
  })(request);
}

/**
 * POST /api/v1/auth/keys  
 * Erstelle neuen API-Key
 */
export async function POST(request: NextRequest) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    // Parse Request Body
    const createRequest = await RequestParser.parseJSON<APIKeyCreateRequest>(request);
    
    // Validiere erforderliche Felder
    RequestParser.validateRequired(createRequest, ['name', 'permissions']);
    
    // Erstelle API-Key
    const newAPIKey = await apiAuthService.createAPIKey(
      createRequest,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(newAPIKey, 201);
    
  })(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}