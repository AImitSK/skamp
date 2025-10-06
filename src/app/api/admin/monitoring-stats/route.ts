import { NextRequest, NextResponse } from 'next/server';
import { monitoringStatsService } from '@/lib/firebase-admin/monitoring-stats-service';
import { crawlerErrorLogService } from '@/lib/firebase-admin/crawler-error-log-service';

// TODO: Implement proper auth check
function isSuperAdmin(userId: string): boolean {
  // Temporär: Alle erlaubt
  // TODO: Checke gegen Super Admin Liste
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Auth Check implementieren
    // const user = await verifyAuth(request);
    // if (!isSuperAdmin(user.uid)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // Parallel laden für bessere Performance
    const [systemStats, organizationStats, channelHealth, errorLogs] = await Promise.all([
      monitoringStatsService.getSystemStats(),
      monitoringStatsService.getOrganizationStats(),
      monitoringStatsService.getChannelHealth(),
      crawlerErrorLogService.getErrorLogs({ limit: 50 })
    ]);

    return NextResponse.json({
      system: systemStats,
      organizations: organizationStats,
      channelHealth,
      errorLogs
    });
  } catch (error: any) {
    console.error('❌ Monitoring stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
