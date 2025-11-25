import { NextRequest, NextResponse } from 'next/server';
import { crawlerControlService } from '@/lib/firebase-admin/crawler-control-service';
import { monitoringStatsService } from '@/lib/firebase-admin/monitoring-stats-service';
import { verifyAdminRequest } from '@/lib/firebase-admin/super-admin-service';

export async function POST(request: NextRequest) {
  try {
    // Auth-Prüfung
    const authResult = await verifyAdminRequest(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'pause':
        await crawlerControlService.pauseCronJob(authResult.userId!, payload.reason);
        return NextResponse.json({ success: true });

      case 'resume':
        await crawlerControlService.resumeCronJob(authResult.userId!);
        // Cache leeren nach Resume
        monitoringStatsService.clearCache();
        return NextResponse.json({ success: true });

      case 'trigger_all':
        const result = await crawlerControlService.triggerManualCrawl();
        // Cache leeren nach Manual Trigger
        monitoringStatsService.clearCache();
        return NextResponse.json(result);

      case 'trigger_org':
        const orgResult = await crawlerControlService.triggerOrgCrawl(payload.organizationId);
        monitoringStatsService.clearCache();
        return NextResponse.json(orgResult);

      case 'trigger_campaign':
        const campaignResult = await crawlerControlService.triggerCampaignCrawl(payload.campaignId);
        monitoringStatsService.clearCache();
        return NextResponse.json(campaignResult);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Crawler control error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
