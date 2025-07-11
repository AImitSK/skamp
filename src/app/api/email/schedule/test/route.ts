// src/app/api/email/schedule/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📧 Test Route - GET called');
    console.log('Environment check:', {
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });

    // Simuliere eine erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      emails: [],
      stats: {
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        processing: 0
      },
      count: 0,
      message: 'Test route working'
    });
  } catch (error: any) {
    console.error('❌ Test route error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Test route failed',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Test Route - POST called');
    const body = await request.json();
    console.log('Request body:', body);

    // Simuliere eine erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      jobId: `test_job_${Date.now()}`,
      scheduledFor: new Date(),
      message: 'Test route working'
    });
  } catch (error: any) {
    console.error('❌ Test route error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Test route failed',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}