/**
 * API Route: Auto-Import von Matching-Kandidaten
 *
 * Importiert automatisch alle Kandidaten die den Score-Threshold erreichen
 * - Wird von Vercel Cron Job getriggert (täglich um 04:00)
 * - Nutzt Client SDK (kein Admin SDK)
 * - Lädt Settings aus Firestore
 *
 * WICHTIG: Nur Client SDK, KEIN Admin SDK!
 */

import { NextRequest, NextResponse } from 'next/server';
import { matchingService } from '@/lib/firebase/matching-service';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';

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

    // Authentifiziere als Service User für Firestore-Zugriff
    const serviceEmail = process.env.CRON_SERVICE_EMAIL;
    const servicePassword = process.env.CRON_SERVICE_PASSWORD;

    if (!serviceEmail || !servicePassword) {
      return NextResponse.json(
        {
          error: 'Service credentials not configured',
          message: 'Set CRON_SERVICE_EMAIL and CRON_SERVICE_PASSWORD environment variables'
        },
        { status: 500 }
      );
    }

    try {
      // Login als Service User
      await signInWithEmailAndPassword(auth, serviceEmail, servicePassword);
      console.log('✅ Service user authenticated');
    } catch (authError) {
      console.error('❌ Service user authentication failed:', authError);
      return NextResponse.json(
        {
          error: 'Service authentication failed',
          message: authError instanceof Error ? authError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Lade Settings (jetzt mit Auth)
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

    // Führe Auto-Import aus
    // WICHTIG: Für Cron Jobs verwenden wir SuperAdmin-Credentials
    const SUPER_ADMIN_USER_ID = 'cron-auto-import'; // System User für Attribution
    const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';
    const SUPER_ADMIN_ORG_ID = 'superadmin-org';

    const result = await matchingService.autoImportCandidates({
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge,
      userId: SUPER_ADMIN_USER_ID,
      userEmail: SUPER_ADMIN_EMAIL,
      organizationId: SUPER_ADMIN_ORG_ID
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

    // Logout Service User
    await signOut(auth);
    console.log('✅ Service user logged out');

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

    // Logout auch bei Fehler
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error('⚠️ Service user logout failed:', logoutError);
    }

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

    // Authentifiziere als Service User
    const serviceEmail = process.env.CRON_SERVICE_EMAIL;
    const servicePassword = process.env.CRON_SERVICE_PASSWORD;

    if (!serviceEmail || !servicePassword) {
      return NextResponse.json(
        {
          error: 'Service credentials not configured',
          message: 'Set CRON_SERVICE_EMAIL and CRON_SERVICE_PASSWORD'
        },
        { status: 500 }
      );
    }

    try {
      await signInWithEmailAndPassword(auth, serviceEmail, servicePassword);
      console.log('✅ Service user authenticated (POST)');
    } catch (authError) {
      console.error('❌ Service user authentication failed (POST):', authError);
      return NextResponse.json(
        {
          error: 'Service authentication failed',
          message: authError instanceof Error ? authError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

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

    // Führe Auto-Import aus
    const SUPER_ADMIN_USER_ID = 'cron-auto-import';
    const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';
    const SUPER_ADMIN_ORG_ID = 'superadmin-org';

    const result = await matchingService.autoImportCandidates({
      minScore: settings.autoImport.minScore,
      useAiMerge: settings.useAiMerge,
      userId: SUPER_ADMIN_USER_ID,
      userEmail: SUPER_ADMIN_EMAIL,
      organizationId: SUPER_ADMIN_ORG_ID
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

    // Logout Service User
    await signOut(auth);
    console.log('✅ Service user logged out (POST)');

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

    // Logout auch bei Fehler
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error('⚠️ Service user logout failed (POST):', logoutError);
    }

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
