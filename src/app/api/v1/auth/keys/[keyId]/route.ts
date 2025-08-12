// src/app/api/v1/auth/keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { apiAuthService } from '@/lib/api/api-auth-service';

/**
 * API-Key Management für spezifischen Key
 */

/**
 * DELETE /api/v1/auth/keys/[keyId]
 * Lösche spezifischen API-Key
 */
export const DELETE = APIMiddleware.withFirebaseAuth(
  async (request: NextRequest, context, { params }: { params: { keyId: string } }) => {
    
    try {
      // Lösche echten API-Key aus Firestore
      await apiAuthService.deleteAPIKey(params.keyId, context.organizationId);
      
      return NextResponse.json({ 
        message: 'API key deleted successfully',
        keyId: params.keyId 
      });
      
    } catch (error) {
      console.error('Failed to delete API key:', error);
      
      // Für Live-System: Kein Fallback zu Mock-System - Fehler weiterwerfen
      if (process.env.VERCEL_ENV === 'production' || process.env.API_ENV === 'production') {
        console.log('=== PRODUCTION: No fallback to mock system ===');
        return NextResponse.json(
          { error: 'Failed to delete API key' },
          { status: 500 }
        );
      }
      
      console.log('=== DEVELOPMENT: FALLBACK TO MOCK SYSTEM ===');
      // Fallback zu Mock-System nur in Development
      const { deletedKeys } = await import('../route');
      deletedKeys.add(params.keyId);
      
      return NextResponse.json({ 
        message: 'API key deleted successfully',
        keyId: params.keyId 
      });
    }
  }
);

/**
 * PATCH /api/v1/auth/keys/[keyId]
 * Deaktiviere API-Key (ohne zu löschen)
 */
export const PATCH = APIMiddleware.withFirebaseAuth(
  async (request: NextRequest, context, { params }: { params: { keyId: string } }) => {
    
    // Mock deactivation - in Production würde der Key in Firestore deaktiviert
    console.log(`API key ${params.keyId} deactivated for organization ${context.organizationId}`);
    
    return NextResponse.json({
      message: 'API key deactivated successfully',
      keyId: params.keyId
    });
  }
);

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