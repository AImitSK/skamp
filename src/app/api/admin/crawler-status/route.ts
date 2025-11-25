import { NextRequest, NextResponse } from 'next/server';
import { crawlerControlService } from '@/lib/firebase-admin/crawler-control-service';
import { verifyAdminRequest } from '@/lib/firebase-admin/super-admin-service';

export async function GET(request: NextRequest) {
  try {
    // Auth-Prüfung
    const authResult = await verifyAdminRequest(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    const status = await crawlerControlService.getCronJobStatus();

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('❌ Crawler status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
