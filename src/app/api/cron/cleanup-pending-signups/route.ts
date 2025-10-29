/**
 * Cleanup Expired Pending Signups (Cron Job)
 *
 * Löscht pending_signups die älter als 24h sind (expiresAt < now)
 *
 * SETUP (Vercel Cron):
 * 1. vercel.json erstellen:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/cleanup-pending-signups",
 *        "schedule": "0 * * * *"
 *      }]
 *    }
 * 2. CRON_SECRET in Vercel Environment Variables setzen
 * 3. Authorization: Bearer {CRON_SECRET} Header mitschicken
 *
 * MANUELLER AUFRUF:
 * curl -X POST https://yourdomain.com/api/cron/cleanup-pending-signups \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung (Cron Secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.warn('[Cleanup Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cleanup Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup Cron] Starting cleanup of expired pending signups...');

    // 2. Query expired pending_signups (expiresAt < now, status = pending)
    const now = new Date();
    const expiredQuery = await adminDb
      .collection('pending_signups')
      .where('expiresAt', '<', now)
      .where('status', '==', 'pending')
      .limit(100) // Batch size
      .get();

    if (expiredQuery.empty) {
      console.log('[Cleanup Cron] No expired pending signups found');
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No expired pending signups'
      });
    }

    // 3. Delete in batch
    const batch = adminDb.batch();
    let deleteCount = 0;

    expiredQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
      console.log(`[Cleanup Cron] Marking for deletion: ${doc.id}`);
    });

    await batch.commit();

    console.log(`[Cleanup Cron] Successfully deleted ${deleteCount} expired pending signups`);

    return NextResponse.json({
      success: true,
      deleted: deleteCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Cleanup Cron] Error during cleanup:', error);
    return NextResponse.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
}

// Allow GET for health check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'healthy',
    endpoint: 'cleanup-pending-signups',
    configured: !!process.env.CRON_SECRET
  });
}
