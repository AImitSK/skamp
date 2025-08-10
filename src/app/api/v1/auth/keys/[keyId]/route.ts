// src/app/api/v1/auth/keys/[keyId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { apiAuthService } from '@/lib/api/api-auth-service';

/**
 * API-Key Management für spezifischen Key
 */

/**
 * DELETE /api/v1/auth/keys/[keyId]
 * Lösche spezifischen API-Key
 */
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { keyId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    await apiAuthService.deleteAPIKey(
      params.keyId,
      context.organizationId
    );
    
    return APIMiddleware.successResponse({ 
      message: 'API key deleted successfully',
      keyId: params.keyId 
    });
    
  })(request);
}

/**
 * PATCH /api/v1/auth/keys/[keyId]
 * Deaktiviere API-Key (ohne zu löschen)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    await apiAuthService.deactivateAPIKey(
      params.keyId,
      context.organizationId
    );
    
    return APIMiddleware.successResponse({
      message: 'API key deactivated successfully',
      keyId: params.keyId
    });
    
  })(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}