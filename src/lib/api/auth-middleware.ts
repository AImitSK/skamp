// src/lib/api/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export interface AuthContext {
  userId: string;
  organizationId: string; // Für jetzt gleich userId, später echte Org
  email?: string;
  role?: 'admin' | 'member'; // Vorbereitung für später
}

/**
 * Get user's organization from Firestore
 */
async function getUserOrganizationId(userId: string, token: string): Promise<string | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Query team_members für den User
    const queryUrl = `${baseUrl}:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'team_members' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: userId }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'active' }
                }
              }
            ]
          }
        },
        limit: 1
      }
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const firestoreResponse = await fetch(queryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody)
    });

    if (!firestoreResponse.ok) {
      console.error('Firestore query failed:', firestoreResponse.status);
      return null;
    }

    const firestoreData = await firestoreResponse.json();
    
    if (firestoreData && firestoreData.length > 0 && firestoreData[0].document) {
      const doc = firestoreData[0].document;
      const organizationId = doc.fields?.organizationId?.stringValue;
      console.log('✅ Found organization ID:', organizationId);
      return organizationId || null;
    }
    
    console.log('⚠️ No team member found for user:', userId);
    return null;
  } catch (error) {
    console.error('Error getting organization ID:', error);
    return null;
  }
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
    
    // Get real organization ID
    const organizationId = await getUserOrganizationId(user.localId, token) || user.localId;
    
    // Return auth context
    return {
      userId: user.localId,
      organizationId: organizationId,
      email: user.email,
      role: 'admin' // TODO: Get real role from team_members
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