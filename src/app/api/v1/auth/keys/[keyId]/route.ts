// src/app/api/v1/auth/keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

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
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    // Mock deletion - in Production würde der Key aus Firestore gelöscht
    console.log(`API key ${params.keyId} deleted for organization ${context.organizationId}`);
    
    return NextResponse.json({ 
      message: 'API key deleted successfully',
      keyId: params.keyId 
    });
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
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
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