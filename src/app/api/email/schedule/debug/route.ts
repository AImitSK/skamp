// src/app/api/email/schedule/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Temporäre Debug-Route ohne Auth-Middleware
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Schedule Route GET called');
    console.log('🔍 Headers:', Object.fromEntries(request.headers.entries()));
    
    // Firebase Config Check
    console.log('🔍 Firebase Config:', {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    });

    // Versuche Firestore REST API direkt
    const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    
    console.log('🔍 Trying Firestore REST API:', FIRESTORE_BASE_URL);
    
    // Teste einfachen Firestore-Zugriff
    const testUrl = `${FIRESTORE_BASE_URL}/scheduled_emails?pageSize=1`;
    console.log('🔍 Test URL:', testUrl);
    
    try {
      const firestoreResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('🔍 Firestore Response Status:', firestoreResponse.status);
      const responseText = await firestoreResponse.text();
      console.log('🔍 Firestore Response:', responseText.substring(0, 200) + '...');
      
      if (!firestoreResponse.ok) {
        throw new Error(`Firestore error: ${firestoreResponse.status} - ${responseText}`);
      }
      
    } catch (firestoreError: any) {
      console.error('❌ Firestore Error:', firestoreError);
      return NextResponse.json({
        success: false,
        error: 'Firestore connection failed',
        details: firestoreError.message,
        hint: 'Check if Firestore is properly configured and accessible'
      }, { status: 500 });
    }

    // Wenn wir hier ankommen, funktioniert Firestore
    return NextResponse.json({
      success: true,
      message: 'Debug route successful - Firestore is accessible',
      emails: [],
      stats: {
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        processing: 0
      }
    });

  } catch (error: any) {
    console.error('❌ Debug route error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Debug route failed',
      stack: error.stack,
      type: error.constructor.name
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Schedule Route POST called');
    
    const body = await request.json();
    console.log('🔍 Request body keys:', Object.keys(body));
    console.log('🔍 Campaign ID:', body.campaignId);
    console.log('🔍 Scheduled Date:', body.scheduledDate);
    
    // Simuliere erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      jobId: `debug_job_${Date.now()}`,
      scheduledFor: new Date(),
      message: 'Debug POST successful'
    });
    
  } catch (error: any) {
    console.error('❌ Debug POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Debug POST failed'
    }, { status: 500 });
  }
}