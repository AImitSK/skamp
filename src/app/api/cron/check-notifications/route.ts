// src/app/api/cron/check-notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { checkOverdueItems } from '@/lib/cron/check-overdue-notifications';

// Sicherheitstoken für Cron-Job
const CRON_SECRET = process.env.CRON_SECRET;

// Helper für konsistentes Logging
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[CRON ${timestamp}]`;
  
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization');
    
    // Sicherheitscheck: CRON_SECRET muss gesetzt sein
    if (!CRON_SECRET || CRON_SECRET === 'your-secret-token') {
      log('error', 'CRON_SECRET is not properly configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      log('warn', 'Unauthorized cron attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    log('info', 'Starting scheduled notification check');
    
    // Run the check
    const result = await checkOverdueItems();
    
    const duration = Date.now() - startTime;
    log('info', `Notification check completed in ${duration}ms`, result);
    
    // Erweiterte Response mit Metadaten - FIXED: result nach success
    return NextResponse.json({
      ...result,
      success: true,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', `Cron job failed after ${duration}ms`, error);
    
    // Detailliertes Error Logging
    if (error instanceof Error) {
      log('error', 'Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration,
          timestamp: new Date().toISOString()
        },
        // Stack trace nur in development
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {})
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check for development environment
    if (process.env.NODE_ENV !== 'development') {
      // In production, prüfe ob ein Admin-Token vorhanden ist
      const adminToken = request.nextUrl.searchParams.get('token');
      const ADMIN_TOKEN = process.env.CRON_ADMIN_TOKEN;
      
      if (!ADMIN_TOKEN || adminToken !== ADMIN_TOKEN) {
        log('warn', 'Unauthorized GET access attempt', {
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        return NextResponse.json(
          { error: 'Only available in development or with admin token' },
          { status: 403 }
        );
      }
    }

    log('info', 'Starting manual cron job test');
    
    const result = await checkOverdueItems();
    
    const duration = Date.now() - startTime;
    log('info', `Manual test completed in ${duration}ms`, result);
    
    // FIXED: result nach success
    return NextResponse.json({
      ...result,
      success: true,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mode: 'manual'
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', `Manual cron test failed after ${duration}ms`);
    
    // Mehr Details für Debugging
    if (error instanceof Error) {
      log('error', 'Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          mode: 'manual'
        },
        // Stack trace nur in development
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {})
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}