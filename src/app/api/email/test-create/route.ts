// src/app/api/email/test-create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('🔍 Test Create - Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId,
        hasToken: !!req.headers.get('authorization')
      });

      // Get user token
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];
      
      if (!token) {
        return NextResponse.json({ error: 'No token' }, { status: 401 });
      }

      // Test-Dokument
      const testDoc = {
        fields: {
          testField: { stringValue: 'test' },
          userId: { stringValue: auth.userId },
          organizationId: { stringValue: auth.organizationId || auth.userId },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      };

      const docId = `test_${Date.now()}`;
      const url = `${FIRESTORE_BASE_URL}/scheduled_emails?documentId=${docId}`;

      console.log('🔍 Creating document:', {
        url,
        docId,
        data: testDoc
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testDoc)
      });

      const responseText = await response.text();
      console.log('🔍 Response:', {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        return NextResponse.json({
          error: 'Create failed',
          status: response.status,
          details: responseText
        }, { status: response.status });
      }

      return NextResponse.json({
        success: true,
        docId,
        response: JSON.parse(responseText)
      });

    } catch (error: any) {
      console.error('❌ Test create error:', error);
      return NextResponse.json({
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    }
  });
}