/**
 * API Route: Auto-Import von Matching-Kandidaten
 *
 * Importiert automatisch alle Kandidaten die den Score-Threshold erreichen
 * - Wird von Vercel Cron Job getriggert (täglich um 04:00)
 * - Nutzt Firebase Admin SDK (Server-Side)
 * - Lädt Settings aus Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoImportCandidates } from '@/lib/firebase-admin/matching-service';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';
import { adminAuth } from '@/lib/firebase/admin-init';

/**
 * GET /api/matching/auto-import
 *
 * Führt automatischen Import durch basierend auf Settings
 *
 * Query Parameters:
 * - secret: CRON_SECRET (erforderlich)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

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

    // Secret erforderlich
    if (secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🤖 Starting auto-import job', {
      triggeredBy: 'cron',
      timestamp: new Date().toISOString()
    });

    // Admin SDK ist bereits authentifiziert (kein Login nötig!)
    console.log('✅ Using Firebase Admin SDK');

    // Lade Settings
    const settings = await matchingSettingsService.getSettings();

    // Prüfe ob Auto-Import aktiviert ist
    if (!settings.autoImport.enabled) {
      console.log('⏸️ Auto-import is disabled in settings');
      return NextResponse.json({
        success: true,
        message: 'Auto-import is disabled',
        stats: {
          candidatesProcessed: 0,
          candidatesImported: 0,
          candidatesFailed: 0,
          errors: []
        }
      });
    }

    console.log('📊 Auto-import settings:', {
      enabled: settings.autoImport.enabled,
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge
    });

    // Führe Auto-Import aus mit Admin SDK
    // WICHTIG: Für Cron Jobs verwenden wir SuperAdmin-Credentials
    const SUPER_ADMIN_USER_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3'; // Deine User ID
    const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';
    const SUPER_ADMIN_ORG_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3'; // Gleich wie User ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await autoImportCandidates({
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge,
      userId: SUPER_ADMIN_USER_ID,
      userEmail: SUPER_ADMIN_EMAIL,
      organizationId: SUPER_ADMIN_ORG_ID,
      baseUrl
    });

    console.log('✅ Auto-import completed', result.stats);

    // Aktualisiere lastRun in Settings
    await matchingSettingsService.saveSettings({
      autoImport: {
        ...settings.autoImport,
        lastRun: new Date(),
        nextRun: calculateNextRun()
      }
    }, SUPER_ADMIN_USER_ID);

    return NextResponse.json({
      success: true,
      stats: result.stats,
      settings: {
        minScore: settings.autoImport.minScore,
        useAiMerge: settings.useAiMerge
      }
    });

  } catch (error) {
    console.error('❌ Auto-import failed', error);

    return NextResponse.json(
      {
        error: 'Auto-import failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/auto-import
 *
 * Alternative für manuelle Tests (mit Body statt Query Params)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

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

    if (secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🤖 Starting auto-import job (POST)', {
      triggeredBy: 'manual',
      timestamp: new Date().toISOString()
    });

    // Admin SDK ist bereits authentifiziert
    console.log('✅ Using Firebase Admin SDK (POST)');

    // Lade Settings
    const settings = await matchingSettingsService.getSettings();

    // Prüfe ob Auto-Import aktiviert ist
    if (!settings.autoImport.enabled) {
      console.log('⏸️ Auto-import is disabled in settings');
      return NextResponse.json({
        success: true,
        message: 'Auto-import is disabled',
        stats: {
          candidatesProcessed: 0,
          candidatesImported: 0,
          candidatesFailed: 0,
          errors: []
        }
      });
    }

    console.log('📊 Auto-import settings:', {
      enabled: settings.autoImport.enabled,
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge
    });

    // Führe Auto-Import aus mit Admin SDK
    const SUPER_ADMIN_USER_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3'; // Deine User ID
    const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';
    const SUPER_ADMIN_ORG_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3'; // Gleich wie User ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await autoImportCandidates({
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge,
      userId: SUPER_ADMIN_USER_ID,
      userEmail: SUPER_ADMIN_EMAIL,
      organizationId: SUPER_ADMIN_ORG_ID,
      baseUrl
    });

    console.log('✅ Auto-import completed (POST)', result.stats);

    // Aktualisiere lastRun in Settings
    await matchingSettingsService.saveSettings({
      autoImport: {
        ...settings.autoImport,
        lastRun: new Date(),
        nextRun: calculateNextRun()
      }
    }, SUPER_ADMIN_USER_ID);

    return NextResponse.json({
      success: true,
      stats: result.stats,
      settings: {
        minScore: settings.autoImport.minScore,
        useAiMerge: settings.useAiMerge
      }
    });

  } catch (error) {
    console.error('❌ Auto-import failed (POST)', error);

    return NextResponse.json(
      {
        error: 'Auto-import failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Berechnet den nächsten Auto-Import Zeitpunkt (täglich um 04:00)
 */
function calculateNextRun(): Date {
  const now = new Date();
  const nextRun = new Date(now);

  // Nächster Tag um 04:00 Uhr
  nextRun.setDate(now.getDate() + 1);
  nextRun.setHours(4, 0, 0, 0);

  return nextRun;
}
