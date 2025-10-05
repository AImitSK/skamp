/**
 * Admin API: Setzt Custom Claims für Service User
 *
 * Einmalig aufrufen um Service User SuperAdmin-Rechte zu geben
 *
 * GET /api/admin/set-service-user-claims?secret=<ADMIN_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';
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
    const servicePassword = process.env.CRON_SERVICE_PASSWORD;

    if (!serviceEmail || !servicePassword) {
      return NextResponse.json(
        { error: 'Service credentials not configured' },
        { status: 500 }
      );
    }

    // Login als Service User
    const userCredential = await signInWithEmailAndPassword(
      auth,
      serviceEmail,
      servicePassword
    );

    const uid = userCredential.user.uid;

    // Custom Claims können wir nicht direkt setzen (braucht Admin SDK)
    // WORKAROUND: Speichere organizationId in users/{uid} Document
    await setDoc(doc(db, 'users', uid), {
      email: serviceEmail,
      organizationId: 'superadmin-org',
      role: 'service',
      displayName: 'Cron Service User',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await signOut(auth);

    return NextResponse.json({
      success: true,
      message: 'Service user configured successfully',
      userId: uid,
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
