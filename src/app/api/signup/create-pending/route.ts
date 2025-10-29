/**
 * Create Pending Signup API Route
 *
 * Erstellt einen pending_signup Eintrag und gibt Token zurück.
 * User wird NICHT in Firebase Auth erstellt - das passiert erst nach Zahlung.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { CreatePendingSignupInput, PendingSignup } from '@/types/pending-signup';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body: CreatePendingSignupInput = await request.json();

    // Validierung
    if (!body.email || !body.companyName || !body.tier || !body.billingInterval || !body.provider) {
      return NextResponse.json(
        { error: 'Email, companyName, tier, billingInterval und provider sind erforderlich' },
        { status: 400 }
      );
    }

    if (body.provider === 'email' && !body.password) {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich für Email-Registrierung' },
        { status: 400 }
      );
    }

    // Generiere Token
    const token = randomUUID();

    // Expiry: 24 Stunden ab jetzt
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Erstelle pending_signup
    const pendingSignup: Omit<PendingSignup, 'id'> = {
      email: body.email.toLowerCase(),
      password: body.password,
      companyName: body.companyName,
      tier: body.tier,
      billingInterval: body.billingInterval,
      provider: body.provider,
      googleIdToken: body.googleIdToken,
      googleUserInfo: body.googleUserInfo,
      createdAt: FieldValue.serverTimestamp() as any,
      expiresAt: expiresAt,
      status: 'pending'
    };

    await adminDb
      .collection('pending_signups')
      .doc(token)
      .set(pendingSignup);

    console.log(`[Pending Signup] Created pending signup with token: ${token}`);

    return NextResponse.json({
      success: true,
      token,
      message: 'Pending signup created successfully'
    });

  } catch (error: any) {
    console.error('[Pending Signup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pending signup' },
      { status: 500 }
    );
  }
}
