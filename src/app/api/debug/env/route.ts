import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Einfacher Schutz
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    hasAdminServiceAccount: !!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT,
    hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasCronSecret: !!process.env.CRON_SECRET,
    serviceAccountLength: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT?.length || 0,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}
