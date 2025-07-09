// src/lib/api/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export interface AuthContext {
  userId: string;
  organizationId: string; // Für jetzt gleich userId, später echte Org
  email?: string;
  role?: 'admin' | 'member'; // Vorbereitung für später
}

/**
 * Verify Firebase ID Token ohne Admin SDK
 */
async function verifyFirebaseToken(token: string): Promise<AuthContext | null> {
  try {
    // Firebase REST API für Token-Verifikation
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      }
    );
    
    if (!response.ok) {
      console.error('Token verification failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const user = data.users?.[0];
    
    if (!user) return null;
    
    // Return auth context
    return {
      userId: user.localId,
      organizationId: user.localId, // Für jetzt gleich userId
      email: user.email,
      role: 'admin' // Alle User sind erstmal Admin ihrer eigenen Org
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

/**
 * Auth Middleware für API Routes - mit flexiblen Response Types
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    const authContext = await verifyFirebaseToken(token);
    
    if (!authContext) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Call handler with auth context
    return handler(request, authContext);
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Extract auth context from request (für Routes die optional auth brauchen)
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  return verifyFirebaseToken(token);
}