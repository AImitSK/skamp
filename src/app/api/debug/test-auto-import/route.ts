/**
 * DEBUG API: Testet Auto-Import OHNE Secret
 *
 * GET /api/debug/test-auto-import
 *
 * WICHTIG: NUR FÜR DEVELOPMENT!
 */

import { NextResponse } from 'next/server';
import { matchingService } from '@/lib/firebase/matching-service';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';

export async function GET() {
  try {
    console.log('🧪 [DEBUG] Test Auto-Import gestartet');

    // Lade Settings
    const settings = await matchingSettingsService.getSettings();
    console.log('📊 [DEBUG] Settings:', settings);

    // Prüfe ob Auto-Import aktiviert ist
    if (!settings.autoImport.enabled) {
      return NextResponse.json({
        success: false,
        message: 'Auto-import is disabled in settings',
        settings: {
          enabled: settings.autoImport.enabled,
          minScore: settings.autoImport.minScore,
          lastRun: settings.autoImport.lastRun?.toISOString(),
          nextRun: settings.autoImport.nextRun?.toISOString()
        }
      });
    }

    console.log('✅ [DEBUG] Auto-Import ist aktiviert');
    console.log('📊 [DEBUG] minScore:', settings.autoImport.minScore);
    console.log('📊 [DEBUG] useAiMerge:', settings.useAiMerge);

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

    console.log('✅ [DEBUG] Auto-import completed', result.stats);

    // Versuche Settings zu updaten
    console.log('🔄 [DEBUG] Versuche Settings zu updaten...');

    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(4, 0, 0, 0);

    await matchingSettingsService.saveSettings({
      autoImport: {
        ...settings.autoImport,
        lastRun: new Date(),
        nextRun: nextRun
      }
    }, SUPER_ADMIN_USER_ID);

    console.log('✅ [DEBUG] Settings erfolgreich geupdatet');

    // Lade aktualisierte Settings
    const updatedSettings = await matchingSettingsService.getSettings();

    return NextResponse.json({
      success: true,
      message: 'Auto-import test completed successfully',
      stats: result.stats,
      settings: {
        before: {
          lastRun: settings.autoImport.lastRun?.toISOString(),
          nextRun: settings.autoImport.nextRun?.toISOString()
        },
        after: {
          lastRun: updatedSettings.autoImport.lastRun?.toISOString(),
          nextRun: updatedSettings.autoImport.nextRun?.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Auto-import test failed', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Auto-import test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
