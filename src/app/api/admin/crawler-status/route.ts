import { NextRequest, NextResponse } from 'next/server';
import { crawlerControlService } from '@/lib/firebase-admin/crawler-control-service';

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
