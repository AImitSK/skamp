// src/app/api/cron/check-notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { checkOverdueItems } from '@/lib/cron/check-overdue-notifications';

// Sicherheitstoken für Cron-Job (sollte in Umgebungsvariable gespeichert werden)
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-token';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the check
    const result = await checkOverdueItems();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for manual testing
export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication or development environment
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Only available in development' },
        { status: 403 }
      );
    }

    console.log('Starting manual cron job test...');
    const result = await checkOverdueItems();
    console.log('Cron job completed:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error details:', error);
    
    // Mehr Details für Debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}