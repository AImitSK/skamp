/**
 * API Route: Matching Scan
 *
 * Führt einen Matching-Scan durch (findet Kandidaten)
 * - Kann manuell vom SuperAdmin getriggert werden
 * - Kann von Vercel Cron Jobs getriggert werden
 *
 * WICHTIG: Nur Client SDK, KEIN Admin SDK!
 */

import { NextRequest, NextResponse } from 'next/server';
import { matchingService } from '@/lib/firebase/matching-service';
import { MATCHING_DEFAULTS } from '@/types/matching';

/**
 * GET /api/matching/scan
 *
 * Startet einen Matching-Scan
 *
 * Query Parameters:
 * - secret: CRON_SECRET (erforderlich für automatische Scans)
 * - devMode: boolean (optional, für Development-Modus)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const devMode = searchParams.get('devMode') === 'true';

    // Prüfe CRON_SECRET für automatische Scans
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: 'CRON_SECRET not configured',
          message: 'Set CRON_SECRET environment variable'
        },
        { status: 500 }
      );
    }

    // Wenn secret mitgegeben wurde, muss es korrekt sein
    if (secret && secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Führe Scan aus
    console.log('🔍 Starting matching scan', {
      devMode,
      triggeredBy: secret ? 'cron' : 'manual',
      timestamp: new Date().toISOString()
    });

    const job = await matchingService.scanForCandidates({
      developmentMode: devMode,
      minScore: devMode
        ? MATCHING_DEFAULTS.DEV_MIN_SCORE
        : MATCHING_DEFAULTS.MIN_SCORE,
      minOrganizations: devMode
        ? MATCHING_DEFAULTS.DEV_MIN_ORGANIZATIONS
        : MATCHING_DEFAULTS.MIN_ORGANIZATIONS
    });

    console.log('✅ Matching scan completed', {
      jobId: job.id,
      status: job.status,
      candidatesCreated: job.stats?.candidatesCreated || 0,
      candidatesUpdated: job.stats?.candidatesUpdated || 0,
      duration: job.duration
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        stats: job.stats,
        duration: job.duration,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });

  } catch (error) {
    console.error('❌ Matching scan failed', error);

    return NextResponse.json(
      {
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/scan
 *
 * Alternative für manuelle Scans (mit Body statt Query Params)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, devMode } = body;

    // Prüfe CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: 'CRON_SECRET not configured',
          message: 'Set CRON_SECRET environment variable'
        },
        { status: 500 }
      );
    }

    if (secret && secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Führe Scan aus
    console.log('🔍 Starting matching scan (POST)', {
      devMode,
      triggeredBy: secret ? 'cron' : 'manual',
      timestamp: new Date().toISOString()
    });

    const job = await matchingService.scanForCandidates({
      developmentMode: devMode,
      minScore: devMode
        ? MATCHING_DEFAULTS.DEV_MIN_SCORE
        : MATCHING_DEFAULTS.MIN_SCORE,
      minOrganizations: devMode
        ? MATCHING_DEFAULTS.DEV_MIN_ORGANIZATIONS
        : MATCHING_DEFAULTS.MIN_ORGANIZATIONS
    });

    console.log('✅ Matching scan completed (POST)', {
      jobId: job.id,
      status: job.status,
      candidatesCreated: job.stats?.candidatesCreated || 0,
      candidatesUpdated: job.stats?.candidatesUpdated || 0,
      duration: job.duration
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        stats: job.stats,
        duration: job.duration,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });

  } catch (error) {
    console.error('❌ Matching scan failed (POST)', error);

    return NextResponse.json(
      {
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
