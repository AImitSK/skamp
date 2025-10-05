/**
 * Admin API: Setzt Custom Claims für Service User
 *
 * Einmalig aufrufen um Service User SuperAdmin-Rechte zu geben
 *
 * GET /api/admin/set-service-user-claims?secret=<ADMIN_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Prüfe Admin Secret
    const adminSecret = process.env.SUPERADMIN_PASSWORD;

    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceEmail = process.env.CRON_SERVICE_EMAIL;
    const serviceUid = process.env.CRON_SERVICE_UID;

    if (!serviceEmail) {
      return NextResponse.json(
        { error: 'CRON_SERVICE_EMAIL not configured' },
        { status: 500 }
      );
    }

    if (!serviceUid) {
      return NextResponse.json(
        {
          error: 'CRON_SERVICE_UID not configured',
          message: 'Gehe zu Firebase Console → Authentication → Users, finde cron-service@celeropress.com und kopiere die User UID. Dann setze CRON_SERVICE_UID Environment Variable.'
        },
        { status: 500 }
      );
    }

    // Speichere organizationId in users/{uid} Document
    await setDoc(doc(db, 'users', serviceUid), {
      email: serviceEmail,
      organizationId: 'superadmin-org',
      role: 'service',
      displayName: 'Cron Service User',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Service user configured successfully',
      userId: serviceUid,
      organizationId: 'superadmin-org'
    });

  } catch (error) {
    console.error('Failed to set service user claims:', error);
    return NextResponse.json(
      {
        error: 'Failed to set claims',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
