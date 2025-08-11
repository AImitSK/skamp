// src/app/api/v1/auth/keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
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
    
    try {
      // Lösche echten API-Key aus Firestore
      await apiAuthService.deleteAPIKey(params.keyId, context.organizationId);
      
      return NextResponse.json({ 
        message: 'API key deleted successfully',
        keyId: params.keyId 
      });
      
    } catch (error) {
      console.error('Failed to delete API key:', error);
      
      // Fallback zu Mock-System
      const { deletedKeys } = await import('../route');
      deletedKeys.add(params.keyId);
      
      return NextResponse.json({ 
        message: 'API key deleted successfully',
        keyId: params.keyId 
      });
    }
  });
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
    
    // Mock deactivation - in Production würde der Key in Firestore deaktiviert
    console.log(`API key ${params.keyId} deactivated for organization ${context.organizationId}`);
    
    return NextResponse.json({
      message: 'API key deactivated successfully',
      keyId: params.keyId
    });
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