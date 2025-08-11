// src/app/api/cron/process-webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/lib/api/webhook-service';

/**
 * POST /api/cron/process-webhooks
 * Cron-Job zum Verarbeiten ausstehender Webhook-Deliveries
 * Wird von Vercel Cron oder externem Service aufgerufen
 */
export async function POST(request: NextRequest) {
  try {
    // Sicherheits-Check: Nur von localhost oder mit korrektem Token
    const authHeader = request.headers.get('authorization');
    const cronToken = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Processing webhook deliveries...');
    
    // Verarbeite ausstehende Deliveries
    await webhookService.processDeliveries();
    
    console.log('Webhook deliveries processed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Webhook deliveries processed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing webhook deliveries:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}