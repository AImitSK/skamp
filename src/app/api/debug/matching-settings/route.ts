/**
 * DEBUG API: Zeigt aktuelle Matching Settings
 *
 * GET /api/debug/matching-settings
 */

import { NextResponse } from 'next/server';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';

export async function GET() {
  try {
    const settings = await matchingSettingsService.getSettings();

    return NextResponse.json({
      success: true,
      settings: {
        useAiMerge: settings.useAiMerge,
        autoScan: {
          enabled: settings.autoScan.enabled,
          interval: settings.autoScan.interval,
          lastRun: settings.autoScan.lastRun?.toISOString(),
          nextRun: settings.autoScan.nextRun?.toISOString()
        },
        autoImport: {
          enabled: settings.autoImport.enabled,
          minScore: settings.autoImport.minScore,
          lastRun: settings.autoImport.lastRun?.toISOString(),
          nextRun: settings.autoImport.nextRun?.toISOString()
        },
        updatedAt: settings.updatedAt?.toISOString(),
        updatedBy: settings.updatedBy
      },
      cronJobConfig: {
        schedule: '0 4 * * *',
        expectedTime: '04:00 UTC täglich',
        endpoint: '/api/matching/auto-import?secret=$CRON_SECRET'
      },
      vercelCronNotes: {
        hobbyPlan: 'Cron Jobs nur eingeschränkt verfügbar',
        proPlan: 'Volle Cron Job Unterstützung',
        checkLogs: 'Prüfe Vercel Dashboard → Deployments → Functions → Logs'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
